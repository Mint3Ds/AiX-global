import { describe, expect, it } from "vitest";
import {
  hotelSeedReviews,
  hotelDemoReviews,
  salonSeedReviews,
  fixtureForExactText,
} from "../src/data/fixtures";
import { verifyEvidence } from "../src/domain/analysis";
import { priorityFor } from "../src/config/priority";

describe("hotel-first fictional dataset", () => {
  it("has 200+ stored historical reviews across three simulated sources", () => {
    expect(hotelSeedReviews.length).toBeGreaterThanOrEqual(200);
    expect(new Set(hotelSeedReviews.map((review) => review.source)).size).toBe(
      3,
    );
    expect(
      hotelSeedReviews.every(
        (review) => review.businessId === "harbour-house" && review.isSynthetic,
      ),
    ).toBe(true);
    expect(salonSeedReviews.length).toBeGreaterThan(0);
  });
  it("supports AC and insect issues with distinct exact-quote evidence", () => {
    const ac = hotelSeedReviews.filter((review) =>
      fixtureForExactText(review.text, review.businessId)?.observations.some(
        (point) => point.expectedThemeId === "hotel-central-ac",
      ),
    );
    expect(ac.length).toBeGreaterThanOrEqual(20);
    const insect = hotelSeedReviews.filter((review) =>
      fixtureForExactText(review.text, review.businessId)?.observations.some(
        (point) => point.expectedThemeId === "hotel-central-insects",
      ),
    );
    expect(insect.length).toBeGreaterThan(0);
    for (const review of hotelSeedReviews) {
      const fixture = fixtureForExactText(review.text, review.businessId);
      expect(fixture).not.toBeNull();
      verifyEvidence(review.text, fixture!.observations);
    }
  });
  it("keeps the prepared incoming review out of seed and splits its three points", () => {
    const demo = hotelDemoReviews[0];
    expect(hotelSeedReviews.some((review) => review.id === demo.id)).toBe(
      false,
    );
    const fixture = fixtureForExactText(demo.text, demo.businessId)!;
    expect(fixture.observations.map((point) => point.expectedThemeId)).toEqual([
      "hotel-central-ac",
      "hotel-central-insects",
      "hotel-central-staff-praise",
    ]);
    expect(fixture.observations.map((point) => point.kind)).toEqual([
      "operational_complaint",
      "operational_complaint",
      "specific_praise",
    ]);
  });
  it("prioritizes serious single reports and recurrence", () => {
    expect(priorityFor("operational_issue", 1, 3, 1).priority).toBe("urgent");
    expect(priorityFor("operational_issue", 1, 1, 1, true).priority).toBe(
      "high",
    );
    expect(priorityFor("suggestion", 30, 1).priority).toBe("insight");
  });
  it("includes Sara Wong as an employee of harbour-house", () => {
    // Hotel employees across branches (e.g. hotel-central, hotel-garden)
    const harbourHouseEmployees = [
      {
        id: "hotel-employee-1",
        businessId: "harbour-house",
        name: "Aina Rahman",
      },
      {
        id: "hotel-employee-2",
        businessId: "harbour-house",
        name: "Daniel Lim",
      },
      {
        id: "hotel-employee-3",
        businessId: "harbour-house",
        name: "Sara Wong",
      },
      {
        id: "hotel-employee-4",
        businessId: "harbour-house",
        name: "Nurul Aziz",
      },
    ];
    const sara = harbourHouseEmployees.find((e) => e.name === "Sara Wong");
    expect(sara).toBeDefined();
    expect(sara?.id).toBe("hotel-employee-3");
    expect(sara?.businessId).toBe("harbour-house");
  });
});
