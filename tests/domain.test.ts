import { describe, expect, it } from "vitest";
import { verifyEvidence } from "../src/domain/analysis";
import { priorityFor } from "../src/config/priority";
import {
  requireOwner,
  requireTransition,
  canDraftReply,
  decisionReason,
} from "../src/domain/workflow";
import { candidateThemes, distinctReviewCount } from "../src/domain/themes";
import { detectReviewLanguage } from "../src/domain/language";

describe("review and workflow rules", () => {
  it("keeps distinct observations and exact source-language quotes", () => {
    const text =
      "The booth rocked when I leaned back, but the fried rice was beautifully smoky.";
    const points = [
      {
        evidenceQuote: "The booth rocked when I leaned back",
        kind: "operational_complaint",
      },
      {
        evidenceQuote: "the fried rice was beautifully smoky.",
        kind: "specific_praise",
      },
    ];
    expect(verifyEvidence(text, points as never)).toHaveLength(2);
    expect(() =>
      verifyEvidence(text, [
        { evidenceQuote: "The chair was repaired" },
      ] as never),
    ).toThrow("exact substring");
  });
  it("does not treat generic sentiment as evidence", () => {
    expect(() => verifyEvidence("Amazing!", [])).not.toThrow();
    expect(() => verifyEvidence("Terrible, won't be back.", [])).not.toThrow();
  });
  it("keeps branches and feedback kinds separate when proposing themes", () => {
    const items = [
      {
        id: "sunway-seat",
        title: "Unsteady seating",
        branchId: "sunway",
        type: "operational_issue",
      },
      {
        id: "bangsar-seat",
        title: "Unsteady seating",
        branchId: "bangsar",
        type: "operational_issue",
      },
      {
        id: "sunway-praise",
        title: "Seating praise",
        branchId: "sunway",
        type: "positive_pattern",
      },
    ];
    expect(
      candidateThemes(
        items,
        "sunway",
        "operational_complaint",
        "wobbly chair seating",
      ).map((x) => x.id),
    ).toEqual(["sunway-seat"]);
    expect(
      candidateThemes(
        items,
        "bangsar",
        "operational_complaint",
        "chair seating",
      ).map((x) => x.id),
    ).toEqual(["bangsar-seat"]);
    expect(
      candidateThemes(items, "sunway", "specific_praise", "chair seating").map(
        (x) => x.id,
      ),
    ).toEqual(["sunway-praise"]);
  });
  it("counts reviews once and recalculates after an owner correction", () => {
    const points = [
      { id: "a", reviewId: "r1" },
      { id: "b", reviewId: "r1" },
      { id: "c", reviewId: "r2" },
    ];
    const membership = [
      { themeId: "seat", observationId: "a" },
      { themeId: "seat", observationId: "b" },
      { themeId: "seat", observationId: "c" },
    ];
    expect(distinctReviewCount(points, membership, "seat")).toBe(2);
    expect(priorityFor("operational_issue", 2, 3).priority).toBe("urgent");
    const corrected = membership.filter((item) => item.observationId !== "c");
    expect(distinctReviewCount(points, corrected, "seat")).toBe(1);
    expect(priorityFor("operational_issue", 1, 3).priority).toBe("urgent");
  });
  it("enforces owner decisions and resolution before reply", () => {
    expect(() => requireOwner("staff")).toThrow("Owner approval");
    expect(() =>
      requireTransition("approved_open", ["proposed"], "approved_open"),
    ).toThrow();
    expect(() => canDraftReply("approved_open", "Inspected seating")).toThrow();
    expect(() => canDraftReply("resolved", null)).toThrow();
    expect(() =>
      canDraftReply("resolved", "Inspected and removed damaged chair"),
    ).not.toThrow();
  });
  it("requires an actionable rejection reason", () => {
    expect(() => decisionReason("   ")).toThrow(/10–500/);
    expect(() => decisionReason("Too short")).toThrow(/10–500/);
    expect(decisionReason("  Repair and retest the chair.  ")).toBe(
      "Repair and retest the chair.",
    );
  });
  it("labels Malay and mixed language without excluding either", () => {
    expect(detectReviewLanguage("Kerusi saya senget dan asyik bergerak.")).toBe(
      "ms",
    );
    expect(
      detectReviewLanguage("The rice was sedap and the chair moved."),
    ).toBe("mixed");
  });
});
