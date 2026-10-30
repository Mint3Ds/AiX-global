import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const base = process.env.TEST_BASE_URL;
const integration = base ? describe : describe.skip;
const businessId = "harbour-house";
type TestTask = { id: string; status: string; reportVersion: number };
type TestReply = { id: string; status: string };
type TestEvent = {
  entityId: string;
  type: string;
  metadata: { reason?: string } | null;
};
type TestState = {
  tasks: TestTask[];
  replies: TestReply[];
  events: TestEvent[];
};

async function action(
  type: string,
  values: Record<string, unknown> = {},
  role = "owner",
) {
  const response = await fetch(`${base}/api/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type, businessId, role, ...values }),
  });
  return { status: response.status, body: await response.json() };
}
async function state() {
  const response = await fetch(`${base}/api/state?businessId=${businessId}`);
  expect(response.status).toBe(200);
  return response.json() as Promise<TestState>;
}
function taskFrom(snapshot: TestState, id: string) {
  return snapshot.tasks.find((item) => item.id === id)!;
}
function replyFrom(snapshot: TestState, id: string) {
  return snapshot.replies.find((item) => item.id === id)!;
}

integration("persisted rejection and rework gates", () => {
  it("blocks rejected work and replies, then accepts corrected versions with full history", async () => {
    const intake = await action(
      "intake",
      {
        data: {
          businessId,
          branchId: "hotel-central",
          source: "Rejection integration test",
          sourceReviewId: `rejection-${randomUUID()}`,
          rating: 2,
          reviewedAt: new Date().toISOString(),
          text: "The AC in room 226 blew warm air all night. We also saw a small insect near the bathroom sink. The front desk was patient and helpful.",
          isSynthetic: true,
        },
      },
      "staff",
    );
    expect(intake.status).toBe(200);
    const reviewId = intake.body.result.reviewId as string;
    expect((await action("analyze", { reviewId })).body.result.status).toBe(
      "complete",
    );

    const proposed = await action("propose_task", {
      themeId: "hotel-central-ac",
    });
    expect(proposed.status).toBe(200);
    const taskId = proposed.body.result.id as string;
    const edited = await action("edit_task", {
      taskId,
      data: {
        title: "Inspect and repair room 226 AC",
        description: "Check the AC and document the actual repair.",
        assigneeRole: "Maintenance technician",
        assigneeId: "hotel-employee-1",
        dueAt: new Date(Date.now() + 86400000).toISOString(),
      },
    });
    expect(edited.status).toBe(200);
    expect(
      (await action("decide_task", { taskId, decision: "approve" })).body.result
        .status,
    ).toBe("approved_open");
    expect(
      (
        await action(
          "report_task",
          {
            taskId,
            employeeId: "hotel-employee-1",
            note: "I adjusted the AC controls but did not test cooling.",
          },
          "staff",
        )
      ).status,
    ).toBe(200);
    const version1 = taskFrom(await state(), taskId).reportVersion;

    const blank = await action("reject_task_report", {
      taskId,
      reportVersion: version1,
      reason: "   ",
    });
    expect(blank.status).toBe(400);
    expect(blank.body.code).toBe("INVALID_WORKFLOW_STATE");
    const staffRejection = await action(
      "reject_task_report",
      { taskId, reportVersion: version1, reason: "Cooling was not tested." },
      "staff",
    );
    expect(staffRejection.status).toBe(400);
    const rejected = await action("reject_task_report", {
      taskId,
      reportVersion: version1,
      reason: "Cooling was not tested. Please repair and verify the unit.",
    });
    expect(rejected.body.result.status).toBe("needs_rework");
    expect(rejected.body.result.rejectionReason).toMatch(
      /Cooling was not tested/,
    );
    expect(
      (
        await action("reject_task_report", {
          taskId,
          reportVersion: version1,
          reason: "Repeat rejection should fail.",
        })
      ).status,
    ).toBe(400);
    expect(
      (await action("verify_task", { taskId, reportVersion: version1 })).status,
    ).toBe(400);
    expect((await action("draft_reply", { reviewId, taskId })).status).toBe(
      400,
    );

    const corrected = await action(
      "report_task",
      {
        taskId,
        employeeId: "hotel-employee-1",
        note: "I repaired the AC fan and confirmed cool air for thirty minutes.",
      },
      "staff",
    );
    expect(corrected.body.result.status).toBe("reported");
    const version2 = corrected.body.result.reportVersion as number;
    expect(version2).toBe(version1 + 1);
    expect(
      (await action("verify_task", { taskId, reportVersion: version1 })).status,
    ).toBe(400);
    const verified = await action("verify_task", {
      taskId,
      reportVersion: version2,
      note: "I checked the repair and confirmed sustained cooling.",
    });
    expect(verified.body.result.status).toBe("resolved");
    expect(
      (await action("verify_task", { taskId, reportVersion: version2 })).status,
    ).toBe(400);

    const drafted = await action("draft_reply", { reviewId, taskId });
    expect(drafted.status).toBe(200);
    const replyId = drafted.body.result.id as string;
    const draftVersion1 = drafted.body.result.draftVersion as number;
    const noReason = await action("reject_reply", {
      replyId,
      draftVersion: draftVersion1,
      reason: " ",
    });
    expect(noReason.status).toBe(400);
    expect(
      (
        await action(
          "reject_reply",
          {
            replyId,
            draftVersion: draftVersion1,
            reason: "This reply promises an unauthorized refund.",
          },
          "staff",
        )
      ).status,
    ).toBe(400);
    const replyRejected = await action("reject_reply", {
      replyId,
      draftVersion: draftVersion1,
      reason: "This reply promises an unauthorized refund.",
    });
    expect(replyRejected.body.result.status).toBe("needs_revision");
    expect(replyRejected.body.result.approvedVersion).toBeNull();
    expect(
      (
        await action("reject_reply", {
          replyId,
          draftVersion: draftVersion1,
          reason: "Duplicate rejection should fail.",
        })
      ).status,
    ).toBe(400);
    expect(
      (
        await action("approve_reply", {
          replyId,
          draftVersion: draftVersion1,
          partialApproved: true,
        })
      ).status,
    ).toBe(400);
    const denied = await action("simulate_publish", { replyId });
    expect(denied.status).toBe(400);
    expect(denied.body.code).toBe("INVALID_WORKFLOW_STATE");

    const revision = await action("edit_reply", {
      replyId,
      draftVersion: draftVersion1,
      text: "Thank you for letting us know. We repaired and tested the room AC. We are still reviewing the insect concern and cannot claim it has been resolved.",
    });
    expect(revision.body.result.status).toBe("draft");
    const draftVersion2 = revision.body.result.draftVersion as number;
    expect(draftVersion2).toBe(draftVersion1 + 1);
    expect((await action("simulate_publish", { replyId })).status).toBe(400);
    expect(
      (
        await action("approve_reply", {
          replyId,
          draftVersion: draftVersion1,
          partialApproved: true,
        })
      ).status,
    ).toBe(400);
    const approved = await action("approve_reply", {
      replyId,
      draftVersion: draftVersion2,
      partialApproved: true,
    });
    expect(approved.body.result.status).toBe("approved_ready");
    expect(approved.body.result.approvedVersion).toBe(draftVersion2);
    expect(
      (await action("simulate_publish", { replyId })).body.result.status,
    ).toBe("simulated_published");
    expect(
      (await action("simulate_publish", { replyId })).body.result.status,
    ).toBe("simulated_published");

    const final = await state();
    const history = final.events.filter((item) =>
      [taskId, replyId].includes(item.entityId),
    );
    expect(
      history.filter((item) => item.type === "task_report_rejected"),
    ).toHaveLength(1);
    expect(
      history.filter((item) => item.type === "reply_rejected"),
    ).toHaveLength(1);
    expect(
      history.filter((item) => item.type === "reply_publish_denied"),
    ).toHaveLength(2);
    expect(
      history.filter((item) => item.type === "reply_simulated_published"),
    ).toHaveLength(1);
    expect(
      history.filter((item) => item.type === "task_reported"),
    ).toHaveLength(2);
    expect(
      history.find((item) => item.type === "task_report_rejected")?.metadata
        ?.reason,
    ).toMatch(/Cooling was not tested/);
    expect(
      history.find((item) => item.type === "reply_rejected")?.metadata?.reason,
    ).toMatch(/unauthorized refund/);
    expect(taskFrom(final, taskId).status).toBe("resolved");
    expect(replyFrom(final, replyId).status).toBe("simulated_published");
  });

  it("allows only one decision when approval and rejection race", async () => {
    const snapshot = await state();
    const resolvedAcTask = snapshot.tasks.find(
      (item) => item.status === "resolved",
    );
    expect(resolvedAcTask).toBeDefined();
    const drafted = await action("draft_reply", {
      reviewId: "hotel-001",
      taskId: resolvedAcTask!.id,
    });
    expect(drafted.status).toBe(200);
    const replyId = drafted.body.result.id as string;
    const draftVersion = drafted.body.result.draftVersion as number;
    const [approval, rejection] = await Promise.all([
      action("approve_reply", { replyId, draftVersion, partialApproved: true }),
      action("reject_reply", {
        replyId,
        draftVersion,
        reason: "The draft needs another review before posting.",
      }),
    ]);
    expect([approval.status, rejection.status].sort()).toEqual([200, 400]);
    const after = await state();
    expect(["approved_ready", "needs_revision"]).toContain(
      replyFrom(after, replyId).status,
    );
    expect(
      after.events.filter(
        (item) =>
          item.entityId === replyId &&
          ["reply_approved", "reply_rejected"].includes(item.type),
      ),
    ).toHaveLength(1);

    const proposed = await action("propose_task", {
      themeId: "hotel-central-insects",
    });
    expect(proposed.status).toBe(200);
    const taskId = proposed.body.result.id as string;
    expect(
      (
        await action("edit_task", {
          taskId,
          data: {
            title: "Inspect the reported insect sighting",
            description: "Inspect the bathroom and document what was found.",
            assigneeRole: "Maintenance technician",
            assigneeId: "hotel-employee-1",
            dueAt: new Date(Date.now() + 86400000).toISOString(),
          },
        })
      ).status,
    ).toBe(200);
    expect(
      (await action("decide_task", { taskId, decision: "approve" })).status,
    ).toBe(200);
    const report = await action(
      "report_task",
      {
        taskId,
        employeeId: "hotel-employee-1",
        note: "I inspected the bathroom and sealed the entry point.",
      },
      "staff",
    );
    expect(report.status).toBe(200);
    const reportVersion = report.body.result.reportVersion as number;
    const [verified, returned] = await Promise.all([
      action("verify_task", { taskId, reportVersion }),
      action("reject_task_report", {
        taskId,
        reportVersion,
        reason: "The bathroom still needs a second inspection.",
      }),
    ]);
    expect([verified.status, returned.status].sort()).toEqual([200, 400]);
    const final = await state();
    expect(["resolved", "needs_rework"]).toContain(
      taskFrom(final, taskId).status,
    );
    expect(
      final.events.filter(
        (item) =>
          item.entityId === taskId &&
          ["task_verified", "task_report_rejected"].includes(item.type),
      ),
    ).toHaveLength(1);
  });
});
