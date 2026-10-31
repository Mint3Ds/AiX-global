import { describe, expect, it } from "vitest";

const base = process.env.TEST_BASE_URL;
const integration = base ? describe : describe.skip;
const businessId = "harbour-house";

async function action(payload: Record<string, unknown>) {
  const response = await fetch(`${base}/api/action`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ businessId, role: "staff", ...payload }),
  });
  return { status: response.status, body: await response.json() };
}

async function state() {
  const response = await fetch(`${base}/api/state?businessId=${businessId}`);
  expect(response.status).toBe(200);
  return response.json();
}

integration("privacy-screened intake", () => {
  it("scrubs before persistence, audits the pass, and keeps replay idempotent", async () => {
    const data = {
      businessId,
      branchId: "hotel-central",
      source: "Synthetic Privacy Test",
      sourceReviewId: "privacy-intake-001",
      rating: 2,
      reviewedAt: "2026-10-31T12:00:00+08:00",
      text: "Email guest@example.com, call +6012-3456789, IC 900101-14-1234, card 4111 1111 1111 1111. The air conditioning was warm.",
      isSynthetic: true,
    };

    const first = await action({ type: "intake", data });
    expect(first.status).toBe(200);
    expect(first.body.result.piiRedactions).toBe(4);

    const replay = await action({ type: "intake", data });
    expect(replay.status).toBe(200);
    expect(replay.body.result).toMatchObject({
      reviewId: first.body.result.reviewId,
      duplicate: true,
    });

    const workspace = await state();
    const review = workspace.reviews.find(
      (item: { id: string }) => item.id === first.body.result.reviewId,
    );
    expect(review.originalText).toBe(
      "Email [EMAIL REDACTED], call [PHONE REDACTED], IC [IC REDACTED], card [CARD REDACTED]. The air conditioning was warm.",
    );
    expect(review.isSynthetic).toBe(true);

    const intakeEvents = workspace.events.filter(
      (item: { entityId: string; type: string }) =>
        item.entityId === review.id && item.type === "review_intake",
    );
    expect(intakeEvents).toHaveLength(1);
    expect(intakeEvents[0].metadata).toMatchObject({
      pii_sanitized: true,
      pii_redaction_count: 4,
    });

    const serialized = JSON.stringify({ review, events: intakeEvents });
    expect(serialized).not.toContain("guest@example.com");
    expect(serialized).not.toContain("+6012-3456789");
    expect(serialized).not.toContain("900101-14-1234");
    expect(serialized).not.toContain("4111 1111 1111 1111");
  });

  it("preserves conflict protection after sanitization", async () => {
    const data = {
      businessId,
      branchId: "hotel-central",
      source: "Synthetic Privacy Test",
      sourceReviewId: "privacy-intake-001",
      rating: 2,
      reviewedAt: "2026-10-31T12:00:00+08:00",
      text: "Email guest@example.com, call +6012-3456789, IC 900101-14-1234, card 4111 1111 1111 1111. The air conditioning was cold.",
      isSynthetic: true,
    };
    const result = await action({ type: "intake", data });
    expect(result.status).toBe(400);
    expect(result.body.error).toMatch(/preserved/i);
  });

  it("does not expose a real-import path in the synthetic demo", async () => {
    const result = await action({
      type: "intake",
      data: {
        businessId,
        branchId: "hotel-central",
        source: "google",
        sourceReviewId: "real-google-review-001",
        rating: 5,
        reviewedAt: "2026-10-31T12:00:00+08:00",
        text: "A review that must not enter through the synthetic demo route.",
        isSynthetic: false,
      },
    });
    expect(result.status).toBe(400);
  });
});
