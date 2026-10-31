import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";

const base = process.env.TEST_BASE_URL;
const integration = base ? describe : describe.skip;
const businessId = "harbour-house";
const evidenceImage =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/0/8AAAAASUVORK5CYII=";
type TestTask = {
  id: string;
  status: string;
  themeId: string;
  reportVersion: number;
  rejectionReason: string | null;
  reworkInstructions?: string | null;
  originalTitle?: string | null;
  originalDescription?: string | null;
  priority?: string;
  assigneeId: string | null;
  approvalSnapshot?: { evidence?: { reviewId: string }[] } | null;
};
type TestReportAttempt = {
  taskId: string;
  version: number;
  note: string;
  decision: string;
  decisionReason: string | null;
  decisionInstructions: string | null;
  attachments: { id: string; name: string; url: string }[];
};
type TestReply = { id: string; status: string; reviewId: string };
type TestEvent = {
  entityId: string;
  type: string;
  metadata: { reason?: string } | null;
};
type TestState = {
  tasks: TestTask[];
  replies: TestReply[];
  themes: { id: string; type: string; status: string; branchId: string }[];
  themeSupport: Record<string, number>;
  observations: { id: string; reviewId: string; kind: string }[];
  memberships: { themeId: string; observationId: string }[];
  events: TestEvent[];
  taskReportAttempts: TestReportAttempt[];
  handoffs: {
    approvedTaskId: string;
    approvedTaskVersion: number;
    simulatedStatus: string;
  }[];
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
          text: "The in-room safe keypad froze and would not accept our code, so we could not secure our passports. The bedside lamp flickered repeatedly. Front desk agent Mei was patient and helpful.",
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

    const analyzedState = await state();
    const operationalObservationIds = new Set(
      analyzedState.observations
        .filter(
          (item) =>
            item.reviewId === reviewId && item.kind === "operational_complaint",
        )
        .map((item) => item.id),
    );
    const themeId = analyzedState.memberships.find((item) =>
      operationalObservationIds.has(item.observationId),
    )?.themeId;
    expect(themeId).toBeTruthy();
    const proposed = await action("propose_task", { themeId });
    expect(proposed.status).toBe(200);
    const taskId = proposed.body.result.id as string;
    const edited = await action("edit_task", {
      taskId,
      data: {
        title: "Inspect and repair the in-room safe",
        description: "Restore the safe keypad and document the actual repair.",
        priority: "urgent",
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
    const initialBrief = taskFrom(await state(), taskId).originalDescription;
    expect(initialBrief).toBe(
      "Restore the safe keypad and document the actual repair.",
    );
    expect(taskFrom(await state(), taskId).priority).toBe("urgent");
    const revisedAssignment = await action("edit_task", {
      taskId,
      data: {
        title: "Inspect and repair the in-room safe",
        description:
          "Replace the keypad battery, set a fresh code, and test the safe.",
        priority: "high",
        assigneeRole: "Maintenance technician",
        assigneeId: "hotel-employee-1",
        dueAt: new Date(Date.now() + 2 * 86400000).toISOString(),
      },
    });
    expect(revisedAssignment.body.result.status).toBe("proposed");
    expect(revisedAssignment.body.result.originalDescription).toBe(
      initialBrief,
    );
    const supersededHandoff = (await state()).handoffs.find(
      (handoff) =>
        handoff.approvedTaskId === taskId && handoff.approvedTaskVersion === 2,
    );
    expect(supersededHandoff?.simulatedStatus).toBe("superseded");
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
            note: "I reset the safe keypad but did not test it with a fresh code.",
            attachments: [
              {
                name: "initial-check.png",
                mediaType: "image/png",
                dataUrl: evidenceImage,
              },
            ],
          },
          "staff",
        )
      ).status,
    ).toBe(200);
    const version1 = taskFrom(await state(), taskId).reportVersion;
    expect(
      (
        await action("edit_task", {
          taskId,
          data: {
            title: "Attempt to change a task awaiting owner review",
            description: "This must not replace the pending report.",
            assigneeRole: "Maintenance technician",
            assigneeId: "hotel-employee-1",
            dueAt: new Date(Date.now() + 86400000).toISOString(),
          },
        })
      ).status,
    ).toBe(400);

    const blank = await action("reject_task_report", {
      taskId,
      reportVersion: version1,
      reason: "   ",
      instructions: "Replace the keypad battery and test it.",
    });
    expect(blank.status).toBe(400);
    expect(blank.body.code).toBe("INVALID_WORKFLOW_STATE");
    const staffRejection = await action(
      "reject_task_report",
      {
        taskId,
        reportVersion: version1,
        reason: "The safe was not tested.",
        instructions: "Set a new code and test both locking and unlocking.",
      },
      "staff",
    );
    expect(staffRejection.status).toBe(400);
    const rejected = await action("reject_task_report", {
      taskId,
      reportVersion: version1,
      reason: "The safe was not tested with a new code. Please retest it.",
      instructions: "Set a new code and test both locking and unlocking.",
    });
    expect(rejected.body.result.status).toBe("needs_rework");
    expect(rejected.body.result.rejectionReason).toMatch(/safe was not tested/);
    expect(rejected.body.result.reworkInstructions).toContain("Set a new code");
    expect(taskFrom(await state(), taskId).originalDescription).toBe(
      initialBrief,
    );
    expect(
      (
        await action("reject_task_report", {
          taskId,
          reportVersion: version1,
          reason: "Repeat rejection should fail.",
          instructions: "Retest the corrected safe with a new code.",
        })
      ).status,
    ).toBe(400);
    expect(
      (await action("verify_task", { taskId, reportVersion: version1 })).status,
    ).toBe(400);
    expect((await action("draft_reply", { reviewId, taskId })).status).toBe(
      400,
    );
    expect((await action("prepare_replies", { taskId })).status).toBe(400);

    const corrected = await action(
      "report_task",
      {
        taskId,
        employeeId: "hotel-employee-1",
        note: "I replaced the safe keypad battery and confirmed a new code locks and opens it.",
        attachments: [
          {
            name: "first-rework.png",
            mediaType: "image/png",
            dataUrl: evidenceImage,
          },
        ],
      },
      "staff",
    );
    expect(corrected.body.result.status).toBe("reported");
    const version2 = corrected.body.result.reportVersion as number;
    expect(version2).toBe(version1 + 1);
    expect(
      (await action("verify_task", { taskId, reportVersion: version1 })).status,
    ).toBe(400);
    const secondRejection = await action("reject_task_report", {
      taskId,
      reportVersion: version2,
      reason: "The lock still sticks. Retest it after the repair.",
      instructions: "Adjust the latch, then run five lock and unlock cycles.",
    });
    expect(secondRejection.body.result.status).toBe("needs_rework");
    expect((await action("draft_reply", { reviewId, taskId })).status).toBe(
      400,
    );
    expect((await action("prepare_replies", { taskId })).status).toBe(400);
    let version3 = version2;
    for (let cycle = 3; cycle <= 5; cycle += 1) {
      const nextReport = await action(
        "report_task",
        {
          taskId,
          employeeId: "hotel-employee-1",
          note: `Report ${cycle}: I adjusted the latch and documented five complete lock and unlock cycles.`,
          attachments: [
            {
              name: `rework-${cycle}.png`,
              mediaType: "image/png",
              dataUrl: evidenceImage,
            },
          ],
        },
        "staff",
      );
      expect(nextReport.body.result.status).toBe("reported");
      version3 = nextReport.body.result.reportVersion as number;
      expect(version3).toBe(version2 + cycle - 2);
      if (cycle < 5) {
        const returned = await action("reject_task_report", {
          taskId,
          reportVersion: version3,
          reason: `Report ${cycle} still needs a documented final check.`,
          instructions: `Complete and record the additional verification cycle ${cycle}.`,
        });
        expect(returned.body.result.status).toBe("needs_rework");
        expect(returned.body.result.reworkInstructions).toContain(
          `cycle ${cycle}`,
        );
      }
    }
    const verified = await action("verify_task", {
      taskId,
      reportVersion: version3,
      note: "I checked the safe and confirmed it locks and opens reliably.",
    });
    expect(verified.body.result.status).toBe("resolved");
    expect(
      (await action("verify_task", { taskId, reportVersion: version3 })).status,
    ).toBe(400);
    const finalState = await state();
    const attempts = finalState.taskReportAttempts.filter(
      (attempt) => attempt.taskId === taskId,
    );
    expect(taskFrom(finalState, taskId).status).toBe("resolved");
    const orderedAttempts = [...attempts].sort(
      (left, right) => left.version - right.version,
    );
    expect(orderedAttempts.map((attempt) => attempt.decision)).toEqual([
      "rejected",
      "rejected",
      "rejected",
      "rejected",
      "approved",
    ]);
    expect(
      orderedAttempts.map((attempt) => attempt.attachments.length),
    ).toEqual([1, 1, 1, 1, 1]);
    const evidenceResponse = await fetch(
      `${base}${orderedAttempts[0].attachments[0].url}`,
    );
    expect(evidenceResponse.status).toBe(200);
    expect(evidenceResponse.headers.get("content-type")).toBe("image/png");
    expect((await evidenceResponse.arrayBuffer()).byteLength).toBeGreaterThan(
      0,
    );
    expect(orderedAttempts[0].decisionReason).toMatch(/safe was not tested/);
    expect(orderedAttempts[1].decisionReason).toMatch(/sticks/);
    expect(orderedAttempts[0].decisionInstructions).toMatch(/new code/);
    expect(orderedAttempts[3].decisionInstructions).toMatch(/cycle 4/);

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
      text: "Thank you for letting us know. We repaired and tested the in-room safe. We are still reviewing the flickering lamp and cannot claim it has been resolved.",
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
    ).toHaveLength(4);
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
    ).toHaveLength(5);
    const rejectionReasons = history
      .filter((item) => item.type === "task_report_rejected")
      .map((item) => item.metadata?.reason);
    expect(rejectionReasons).toContain(
      "The safe was not tested with a new code. Please retest it.",
    );
    expect(rejectionReasons).toContain(
      "The lock still sticks. Retest it after the repair.",
    );
    expect(rejectionReasons).toContain(
      "Report 3 still needs a documented final check.",
    );
    expect(rejectionReasons).toContain(
      "Report 4 still needs a documented final check.",
    );
    expect(
      history.find((item) => item.type === "reply_rejected")?.metadata?.reason,
    ).toMatch(/unauthorized refund/);
    expect(taskFrom(final, taskId).status).toBe("resolved");
    expect(replyFrom(final, replyId).status).toBe("simulated_published");
  }, 60000);

  it("links a related hotel complaint to the existing active AC task", async () => {
    const before = await state();
    let existingTask = before.tasks.find(
      (task) =>
        task.themeId === "hotel-central-ac" &&
        ["approved_open", "in_progress", "reported", "needs_rework"].includes(
          task.status,
        ),
    );
    if (!existingTask) {
      const proposed = await action("propose_task", {
        themeId: "hotel-central-ac",
      });
      expect(proposed.status).toBe(200);
      const taskId = proposed.body.result.id as string;
      const assigned = await action("edit_task", {
        taskId,
        data: {
          title: "Inspect room air conditioning",
          description: "Inspect the AC and record the confirmed repair.",
          assigneeRole: "Maintenance technician",
          assigneeId: "hotel-employee-1",
          dueAt: new Date(Date.now() + 86400000).toISOString(),
        },
      });
      expect(assigned.status).toBe(200);
      expect(
        (await action("decide_task", { taskId, decision: "approve" })).status,
      ).toBe(200);
      existingTask = taskFrom(await state(), taskId);
    }
    if (existingTask!.status !== "in_progress") {
      const started = await action(
        "start_task",
        { taskId: existingTask!.id, employeeId: existingTask!.assigneeId },
        "staff",
      );
      expect(started.status).toBe(200);
    }
    const inProgress = await state();
    const taskBefore = taskFrom(inProgress, existingTask!.id);
    expect(taskBefore.status).toBe("in_progress");
    const supportBefore = inProgress.themeSupport["hotel-central-ac"];

    const intake = await action(
      "intake",
      {
        data: {
          businessId,
          branchId: "hotel-central",
          source: "Active issue consolidation test",
          sourceReviewId: `active-ac-${randomUUID()}`,
          rating: 2,
          reviewedAt: new Date().toISOString(),
          text: "The air conditioning barely worked in our room, and it stayed warm all night. The receptionist was kind and helped us with extra blankets.",
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

    const after = await state();
    const evidenceIds = new Set(
      after.observations
        .filter((observation) => observation.reviewId === reviewId)
        .map((observation) => observation.id),
    );
    expect(
      after.memberships.some(
        (membership) =>
          evidenceIds.has(membership.observationId) &&
          membership.themeId === "hotel-central-ac",
      ),
    ).toBe(true);
    expect(after.themeSupport["hotel-central-ac"]).toBeGreaterThan(
      supportBefore,
    );
    const taskAfter = taskFrom(after, existingTask!.id);
    expect(taskAfter.status).toBe("in_progress");
    expect(taskAfter.assigneeId).toBe(taskBefore.assigneeId);
    expect(
      after.tasks.filter((task) => task.themeId === "hotel-central-ac"),
    ).toHaveLength(
      inProgress.tasks.filter((task) => task.themeId === "hotel-central-ac")
        .length,
    );
  }, 60000);

  it("allows only one decision when approval and rejection race", async () => {
    const snapshot = await state();
    const resolvedAcTask = snapshot.tasks.find((item) => {
      return (
        item.status === "resolved" &&
        item.themeId === "hotel-central-cleanliness"
      );
    });
    expect(resolvedAcTask).toBeDefined();
    const intake = await action(
      "intake",
      {
        data: {
          businessId,
          branchId: "hotel-central",
          source: "Reply race integration test",
          sourceReviewId: `reply-race-${randomUUID()}`,
          rating: 2,
          reviewedAt: new Date().toISOString(),
          text: "Room cleanliness was poor. The bathroom bin was not emptied, and dust remained on the shelves. The reception team was kind.",
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
    let linkedState = await state();
    let reviewObservations = linkedState.observations.filter(
      (observation) => observation.reviewId === reviewId,
    );
    const hasTaskEvidence = () =>
      linkedState.memberships.some(
        (membership) =>
          membership.themeId === resolvedAcTask!.themeId &&
          reviewObservations.some(
            (observation) => observation.id === membership.observationId,
          ),
      );
    if (!hasTaskEvidence()) {
      const candidate = reviewObservations.find(
        (observation) => observation.kind === "operational_complaint",
      );
      expect(candidate).toBeDefined();
      expect(
        (
          await action("membership", {
            observationId: candidate!.id,
            themeId: resolvedAcTask!.themeId,
          })
        ).status,
      ).toBe(200);
      linkedState = await state();
      reviewObservations = linkedState.observations.filter(
        (observation) => observation.reviewId === reviewId,
      );
    }
    expect(hasTaskEvidence()).toBe(true);
    const drafted = await action("draft_reply", {
      reviewId,
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

    const taskState = await state();
    const unusedTheme = taskState.themes.find(
      (theme) =>
        theme.type === "operational_issue" &&
        theme.branchId === "hotel-central" &&
        theme.status !== "dismissed" &&
        (taskState.themeSupport[theme.id] || 0) > 0 &&
        !taskState.tasks.some((task) => task.themeId === theme.id),
    );
    expect(unusedTheme).toBeDefined();
    const proposed = await action("propose_task", {
      themeId: unusedTheme!.id,
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
        instructions: "Inspect the floor edges again and attach a clear photo.",
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
  }, 60000);
});
