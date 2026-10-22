import { describe, expect, it } from "vitest";
import {
  seedReviews,
  demoReviews,
  fixtureForExactText,
  seedFixture,
} from "../src/data/fixtures";
describe("synthetic fixture contract", () => {
  it("keeps the five demo reviews out of the 80-review seed", () => {
    expect(seedReviews).toHaveLength(80);
    expect(demoReviews).toHaveLength(5);
    expect(
      seedReviews.some((review) => review.text === demoReviews[0].text),
    ).toBe(false);
  });
  it("splits seating complaint and fried rice praise from the live demo text", () => {
    const analysis = fixtureForExactText(demoReviews[0].text);
    expect(analysis?.observations.map((point) => point.kind)).toEqual([
      "operational_complaint",
      "specific_praise",
    ]);
    expect(analysis?.observations[0].expectedThemeId).toBe("sunway-seating");
    expect(
      analysis?.observations.every((point) =>
        demoReviews[0].text.includes(point.evidenceQuote),
      ),
    ).toBe(true);
  });
  it("keeps generic praise and dislike searchable without observations", () => {
    expect(seedFixture("review-001")).toEqual({
      useful: false,
      observations: [],
    });
    expect(seedFixture("review-010")).toEqual({
      useful: false,
      observations: [],
    });
    expect(fixtureForExactText(demoReviews[1].text)).toEqual({
      useful: false,
      observations: [],
    });
  });
  it("retains useful praise and branch-specific evidence without a repair task", () => {
    expect(seedFixture("review-016")?.observations[0].kind).toBe(
      "specific_praise",
    );
    expect(seedFixture("review-033")?.observations[0].expectedThemeId).toBe(
      "bangsar-dumpling-temperature",
    );
    expect(seedFixture("review-036")?.observations[0].expectedThemeId).toBe(
      "sunway-dumpling-temperature",
    );
  });
  it("never creates a fixture result for unknown text", () => {
    expect(
      fixtureForExactText("An unfamiliar synthetic review with no fixture."),
    ).toBeNull();
  });
});
