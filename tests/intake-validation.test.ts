import { describe, expect, it } from "vitest";
import { intakeSchema } from "../src/domain/analysis";
import { publicActionError } from "../src/domain/public-errors";

const review = {
  businessId: "nusa-table",
  branchId: "sunway",
  source: "Synthetic audit feed",
  sourceReviewId: "validation-case-1",
  rating: 3,
  reviewedAt: "2026-10-24T12:00:00+08:00",
  text: "  The chair rocked when I sat down.  ",
  isSynthetic: true,
};

describe("source review validation", () => {
  it("preserves the complete source wording while validating useful length", () => {
    expect(intakeSchema.parse(review).text).toBe(review.text);
    const invalid = intakeSchema.safeParse({ ...review, text: "   " });
    expect(invalid.success).toBe(false);
    if (!invalid.success)
      expect(publicActionError(invalid.error)).toBe(
        "Write at least 5 characters of review text.",
      );
  });

  it("returns a readable rating error", () => {
    const invalid = intakeSchema.safeParse({ ...review, rating: 6 });
    expect(invalid.success).toBe(false);
    if (!invalid.success)
      expect(publicActionError(invalid.error)).toBe(
        "Choose a rating from 1 to 5 stars.",
      );
  });

  it("does not expose database query details", () => {
    expect(
      publicActionError(new Error('Failed query: select "id" from businesses')),
    ).toBe(
      "The database rejected this action. Refresh before retrying; the server log records the database error code.",
    );
  });

  it("identifies an outdated database schema without exposing SQL", () => {
    expect(
      publicActionError(
        Object.assign(new Error('Failed query: select "id" from reviews'), {
          cause: Object.assign(new Error('relation "reviews" does not exist'), {
            code: "42P01",
          }),
        }),
      ),
    ).toBe(
      "The database schema is out of date. Run the database migrations, then refresh the workspace.",
    );
  });
});
