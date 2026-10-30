import { describe, expect, it } from "vitest";
import { groupTaskEvidence } from "../src/components/design/TaskEvidencePanel";

describe("task source evidence", () => {
  it("keeps only linked, distinct quotes under each source review, newest first", () => {
    const grouped = groupTaskEvidence(
      "room-cleanliness",
      [
        { id: "older", source: "Form", rating: 2, reviewedAt: "2026-08-01" },
        { id: "newer", source: "Form", rating: 3, reviewedAt: "2026-10-01" },
        { id: "unlinked", source: "Form", rating: 5, reviewedAt: "2026-10-02" },
      ],
      [
        { id: "a", reviewId: "older", evidenceQuote: "Dust on the shelf." },
        { id: "b", reviewId: "newer", evidenceQuote: "Bathroom was stale." },
        { id: "c", reviewId: "newer", evidenceQuote: "Bathroom was stale." },
        {
          id: "d",
          reviewId: "newer",
          evidenceQuote: "Air conditioning failed.",
        },
      ],
      [
        { themeId: "room-cleanliness", observationId: "a" },
        { themeId: "room-cleanliness", observationId: "b" },
        { themeId: "room-cleanliness", observationId: "c" },
        { themeId: "air-conditioning", observationId: "d" },
      ],
    );

    expect(grouped.map((review) => review.id)).toEqual(["newer", "older"]);
    expect(grouped[0].quotes).toEqual(["Bathroom was stale."]);
    expect(grouped[1].quotes).toEqual(["Dust on the shelf."]);
  });
});
