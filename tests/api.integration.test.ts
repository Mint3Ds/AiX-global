import { describe, expect, it } from "vitest";
const base = process.env.TEST_BASE_URL;
async function action(payload: Record<string, unknown>) {
  const response = await fetch(`${base}/api/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { status: response.status, body: await response.json() };
}
const integration = base ? describe : describe.skip;
integration("persisted demo route handlers", () => {
  it("does not let a staff request approve a task through the server", async () => {
    const result = await action({
      type: "decide_task",
      taskId: "task-sunway-seating",
      decision: "approve",
      role: "staff",
    });
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/Owner approval required/);
  });
  it("does not duplicate observations or handoffs on reprocessing", async () => {
    const before = await (await fetch(`${base}/api/state`)).json();
    const review = before.reviews.find(
      (r: { sourceReviewId: string }) =>
        r.sourceReviewId === "synthetic-demo-source-001",
    );
    expect(review).toBeTruthy();
    const result = await action({
      type: "analyze",
      reviewId: review.id,
      role: "owner",
    });
    expect(result.body.result.alreadyProcessed).toBe(true);
    const after = await (await fetch(`${base}/api/state`)).json();
    expect(
      after.observations.filter(
        (o: { reviewId: string }) => o.reviewId === review.id,
      ),
    ).toHaveLength(2);
    expect(
      after.handoffs.filter(
        (h: { approvedTaskId: string }) =>
          h.approvedTaskId === "task-sunway-seating",
      ),
    ).toHaveLength(1);
  });
  it("keeps the approved reply after refresh and rejects an invalid task transition", async () => {
    const state = await (await fetch(`${base}/api/state`)).json();
    expect(
      state.replies.some(
        (r: { status: string }) => r.status === "approved_ready",
      ),
    ).toBe(true);
    const result = await action({
      type: "resolve_task",
      taskId: "task-sunway-seating",
      note: "again again again",
      role: "owner",
    });
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/Cannot move resolved/);
  });
});
