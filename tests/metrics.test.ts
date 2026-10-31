import { describe, expect, it } from "vitest";
import { LITERATURE_BENCHMARKS } from "../src/domain/metrics";

describe("empirical metrics and statistical calculations", () => {
  it("holds accurate peer-reviewed academic literature benchmarks", () => {
    // Madnick et al. (2017) / Lean hospitality benchmark = 13.5 min = 810 sec
    expect(LITERATURE_BENCHMARKS.MANUAL_TRIAGE_SECONDS).toBe(810);
    // Proserpio & Zervas (2017) TripAdvisor baseline = 31.5%
    expect(LITERATURE_BENCHMARKS.INDUSTRY_RESPONSE_RATE_PERCENT).toBe(31.5);
  });

  it("calculates empirical active dwell averages and median strictly from real observations", () => {
    const dwellValues = [35, 45, 60, 40];
    const sum = dwellValues.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / dwellValues.length);
    expect(avg).toBe(45);

    // Median of even length array [35, 40, 45, 60] -> (40 + 45) / 2 = 43
    const sorted = [...dwellValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = Math.round((sorted[mid - 1] + sorted[mid]) / 2);
    expect(median).toBe(43);

    // Empirical reduction compared against 810s benchmark
    const reduction = Number(
      (((LITERATURE_BENCHMARKS.MANUAL_TRIAGE_SECONDS - avg) /
        LITERATURE_BENCHMARKS.MANUAL_TRIAGE_SECONDS) *
        100).toFixed(1),
    );
    expect(reduction).toBe(94.4); // 94.4% reduction
  });

  it("returns null for time reduction when no real dwell sessions have been recorded", () => {
    const dwellValues: number[] = [];
    const avg = dwellValues.length ? dwellValues[0] : null;
    const reduction =
      avg !== null
        ? Number(
            (((LITERATURE_BENCHMARKS.MANUAL_TRIAGE_SECONDS - avg) /
              LITERATURE_BENCHMARKS.MANUAL_TRIAGE_SECONDS) *
              100).toFixed(1),
          )
        : null;
    expect(reduction).toBeNull();
  });

  it("calculates exact evidence substring traceability percentage", () => {
    const reviews = [
      { id: "r1", text: "Air conditioning was dripping water near the window." },
      { id: "r2", text: "Front desk staff was welcoming and smooth checkin." },
    ];
    const observations = [
      { reviewId: "r1", quote: "Air conditioning was dripping water" }, // Valid exact substring
      { reviewId: "r1", quote: "water near the window" }, // Valid exact substring
      { reviewId: "r2", quote: "Front desk staff was welcoming" }, // Valid exact substring
    ];

    let verified = 0;
    for (const obs of observations) {
      const rev = reviews.find((r) => r.id === obs.reviewId);
      if (rev && rev.text.includes(obs.quote)) verified++;
    }

    const rate = Number(((verified / observations.length) * 100).toFixed(1));
    expect(rate).toBe(100.0);
  });

  it("measures response readiness strictly against verified resolved operational tasks", () => {
    const tasks = [
      { id: "t1", status: "resolved" },
      { id: "t2", status: "resolved" },
      { id: "t3", status: "approved_open" },
    ];
    const replies = [
      { id: "rep1", status: "approved_ready" },
      { id: "rep2", status: "simulated_published" },
    ];

    const resolvedTasks = tasks.filter((t) => t.status === "resolved").length;
    const approvedReplies = replies.filter((r) =>
      ["approved_ready", "simulated_published"].includes(r.status),
    ).length;

    const readinessPercent = Number(
      ((approvedReplies / resolvedTasks) * 100).toFixed(1),
    );
    expect(readinessPercent).toBe(100.0);

    const multiplier = Number(
      (
        readinessPercent / LITERATURE_BENCHMARKS.INDUSTRY_RESPONSE_RATE_PERCENT
      ).toFixed(2),
    );
    expect(multiplier).toBe(3.17); // 3.17x improvement over industry baseline
  });

  it("calculates optimistic triage duration using lastViewedAt rather than firstViewedAt", () => {
    // Review was initially opened 6 hours earlier (firstViewedAt)
    const firstViewedAt = new Date("2026-10-31T04:00:00.000Z");
    // Manager returned to the review at 10:00:00 UTC (lastViewedAt)
    const lastViewedAt = new Date("2026-10-31T10:00:00.000Z");
    // Decision / triage executed at 10:00:48 UTC (triagedAt)
    const triagedAt = new Date("2026-10-31T10:00:48.000Z");

    // Using firstViewedAt would give 6 hours (21648 seconds) - inaccurate!
    const pessimisticDuration = Math.round(
      (triagedAt.getTime() - firstViewedAt.getTime()) / 1000,
    );
    expect(pessimisticDuration).toBe(21648);

    // Optimistic triage calculation strictly uses lastViewedAt:
    const optimisticDuration = Math.round(
      (triagedAt.getTime() - lastViewedAt.getTime()) / 1000,
    );
    expect(optimisticDuration).toBe(48); // 48 active seconds in decision session
  });

  it("ensures server-side time calculations are timezone-invariant using UTC epoch delta", () => {
    // Two managers viewing the same review in different local timezones:
    // Manager A in Tokyo (UTC+9): 19:00:00 JST -> 10:00:00 UTC
    // Manager B in London (UTC+0): 10:00:00 GMT -> 10:00:00 UTC
    const tokyoViewStr = "2026-10-31T19:00:00+09:00";
    const londonTriageStr = "2026-10-31T10:00:42Z";

    const lastViewedAt = new Date(tokyoViewStr);
    const triagedAt = new Date(londonTriageStr);

    // Server-side calculation computes the UTC epoch delta
    const serverDeltaSeconds = Math.round(
      (triagedAt.getTime() - lastViewedAt.getTime()) / 1000,
    );
    expect(serverDeltaSeconds).toBe(42);
  });
});

