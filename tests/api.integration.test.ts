import { describe, expect, it } from "vitest";
const base = process.env.TEST_BASE_URL;
const businessId = "harbour-house";
async function action(payload: Record<string, unknown>) {
  const response = await fetch(`${base}/api/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, ...payload }),
  });
  return { status: response.status, body: await response.json() };
}
async function state(id = businessId) {
  return (await fetch(`${base}/api/state?businessId=${id}`)).json();
}
const integration = base ? describe : describe.skip;
integration("business-scoped persisted route handlers", () => {
  it("returns distinct workspaces without mixing reviews", async () => {
    const hotel = await state();
    const salon = await state("luma-salon");
    expect(hotel.reviews.length).toBeGreaterThanOrEqual(200);
    expect(
      hotel.reviews.every(
        (review: { businessId: string }) => review.businessId === businessId,
      ),
    ).toBe(true);
    expect(
      salon.reviews.every(
        (review: { businessId: string }) => review.businessId === "luma-salon",
      ),
    ).toBe(true);
    expect(
      hotel.employees.every(
        (employee: { businessId: string }) =>
          employee.businessId === businessId,
      ),
    ).toBe(true);
  });
  it("makes feed events idempotent and protects changed evidence", async () => {
    const data = {
      businessId,
      branchId: "hotel-central",
      source: "Simulated Integration Feed",
      sourceReviewId: "integration-idempotency-001",
      rating: 3,
      reviewedAt: "2026-10-23T10:00:00+08:00",
      text: "The room was warm and the front desk was helpful.",
      isSynthetic: true,
    };
    const first = await action({ type: "intake", role: "staff", data });
    const second = await action({ type: "intake", role: "staff", data });
    expect(first.status).toBe(200);
    expect(second.body.result).toMatchObject({
      reviewId: first.body.result.reviewId,
      duplicate: true,
    });
    const conflict = await action({
      type: "intake",
      role: "staff",
      data: {
        ...data,
        text: "Changed source evidence that must not replace the original.",
      },
    });
    expect(conflict.status).toBe(400);
    expect(conflict.body.error).toMatch(/preserved/);
    const changedDate = await action({
      type: "intake",
      role: "staff",
      data: {
        ...data,
        reviewedAt: "2026-10-22T10:00:00+08:00",
      },
    });
    expect(changedDate.status).toBe(400);
    expect(changedDate.body.error).toMatch(/preserved/);
    const hotel = await state();
    expect(
      hotel.reviews.filter(
        (review: { sourceReviewId: string }) =>
          review.sourceReviewId === data.sourceReviewId,
      ),
    ).toHaveLength(1);
  });
  it("rejects cross-business actions and employee self-verification", async () => {
    const hotel = await state();
    const cross = await action({
      type: "analyze",
      role: "owner",
      reviewId: (await state("luma-salon")).reviews[0].id,
    });
    expect(cross.status).toBe(400);
    expect(cross.body.error).toMatch(/another business/);
    const task = hotel.tasks[0];
    if (task) {
      const verify = await action({
        type: "verify_task",
        role: "staff",
        taskId: task.id,
        note: "I verified my own work.",
      });
      expect(verify.status).toBe(400);
      expect(verify.body.error).toMatch(/Owner approval/);
    }
  });
});
