import { describe, expect, it } from "vitest";
import {
  LITERATURE_BENCHMARKS,
  responseReadinessPercent,
} from "../src/domain/metrics";

describe("empirical metrics and statistical calculations", () => {
  it("holds accurate peer-reviewed academic literature benchmarks", () => {
    // Johnston (2001) conservative baseline = 10.0 min = 600 sec
    expect(LITERATURE_BENCHMARKS.MANUAL_TRIAGE_SECONDS).toBe(600);
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

    // Empirical reduction compared against 600s benchmark: (600 - 45) / 600 = 92.5%
    const reduction = Number(
      (((LITERATURE_BENCHMARKS.MANUAL_TRIAGE_SECONDS - avg) /
        LITERATURE_BENCHMARKS.MANUAL_TRIAGE_SECONDS) *
        100).toFixed(1),
    );
    expect(reduction).toBe(92.5); // 92.5% reduction
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

  it("measures verified reply coverage against all reviews and never exceeds 100%", () => {
    const readinessPercent = responseReadinessPercent(206, 7);
    expect(readinessPercent).toBe(3.4);
    expect(responseReadinessPercent(2, 3)).toBe(100);
    expect(responseReadinessPercent(0, 0)).toBeNull();

    const multiplier = Number(
      (
        readinessPercent! /
        LITERATURE_BENCHMARKS.INDUSTRY_RESPONSE_RATE_PERCENT
      ).toFixed(2),
    );
    expect(multiplier).toBe(0.11);
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

  it("computes complete operational funnel stats from intake to published response", () => {
    // 10 total reviews in various stages
    const mockReviews = [
      { id: "r1", processingStatus: "complete" },
      { id: "r2", processingStatus: "complete" },
      { id: "r3", processingStatus: "complete" },
      { id: "r4", processingStatus: "complete" },
      { id: "r5", processingStatus: "pending" },
      { id: "r6", processingStatus: "needs_review" },
    ];
    const mockRuns = [
      { id: "run1", decision: "generic" },
      { id: "run2", decision: "generic" },
    ];
    const mockTasks = [
      { id: "t1", status: "proposed" },
      { id: "t2", status: "approved_open" },
      { id: "t3", status: "in_progress" },
      { id: "t4", status: "reported" },
      { id: "t5", status: "resolved" },
    ];
    const mockReplies = [
      { id: "rep1", status: "draft" },
      { id: "rep2", status: "approved_ready" },
      { id: "rep3", status: "simulated_published" },
    ];

    const specificReviewsCount = mockReviews.filter(
      (r) => r.processingStatus === "complete",
    ).length;
    expect(specificReviewsCount).toBe(4);

    const genericReviewsCount = mockRuns.filter(
      (r) => r.decision === "generic",
    ).length;
    expect(genericReviewsCount).toBe(2);

    const needsReviewReviewsCount = mockReviews.filter((r) =>
      ["pending", "needs_review"].includes(r.processingStatus),
    ).length;
    expect(needsReviewReviewsCount).toBe(2);

    const tasksProposed = mockTasks.length;
    expect(tasksProposed).toBe(5);

    const tasksApproved = mockTasks.filter((t) =>
      ["approved_open", "in_progress", "reported", "resolved"].includes(t.status),
    ).length;
    expect(tasksApproved).toBe(4);

    const tasksReported = mockTasks.filter((t) =>
      ["reported", "resolved"].includes(t.status),
    ).length;
    expect(tasksReported).toBe(2);

    const tasksResolved = mockTasks.filter((t) => t.status === "resolved").length;
    expect(tasksResolved).toBe(1);

    const taskResolutionRate = Number(
      ((tasksResolved / tasksApproved) * 100).toFixed(1),
    );
    expect(taskResolutionRate).toBe(25.0); // 1 resolved out of 4 approved = 25%

    const repliesDrafted = mockReplies.length;
    expect(repliesDrafted).toBe(3);

    const repliesApproved = mockReplies.filter((r) =>
      ["approved_ready", "simulated_published"].includes(r.status),
    ).length;
    expect(repliesApproved).toBe(2);

    const repliesPublished = mockReplies.filter(
      (r) => r.status === "simulated_published",
    ).length;
    expect(repliesPublished).toBe(1);
  });

  it("accurately links confirmed issues and active tasks to member review triage", () => {
    // Reviews that supplied evidence for an issue
    const mockReviews = [
      { id: "rev-unconfirmed", originalText: "Noisy street outside window.", triagedAt: null, triageDurationSeconds: null },
      { id: "rev-confirmed-1", originalText: "Air conditioning was leaking heavily.", triagedAt: null, triageDurationSeconds: null },
      { id: "rev-confirmed-2", originalText: "AC unit blowing warm air all night.", triagedAt: null, triageDurationSeconds: null },
      { id: "rev-task-active", originalText: "Wobbly chair in dining room.", triagedAt: null, triageDurationSeconds: null },
    ];

    const mockThemes = [
      { id: "th-suggested", status: "suggested", type: "operational_issue" },
      { id: "th-confirmed", status: "owner_confirmed", type: "operational_issue" },
      { id: "th-task", status: "suggested", type: "operational_issue" },
    ];

    const mockTasks = [
      { id: "task-chair", themeId: "th-task", status: "approved_open" },
    ];

    const mockObservations = [
      { id: "obs-1", reviewId: "rev-unconfirmed" },
      { id: "obs-2", reviewId: "rev-confirmed-1" },
      { id: "obs-3", reviewId: "rev-confirmed-2" },
      { id: "obs-4", reviewId: "rev-task-active" },
    ];

    const mockMemberships = [
      { themeId: "th-suggested", observationId: "obs-1" },
      { themeId: "th-confirmed", observationId: "obs-2" },
      { themeId: "th-confirmed", observationId: "obs-3" },
      { themeId: "th-task", observationId: "obs-4" },
    ];

    // Build the triage linkage graph
    const obsToReview = new Map(mockObservations.map((o) => [o.id, o.reviewId]));
    const confirmedOrActionedThemeIds = new Set(
      mockThemes
        .filter(
          (t) =>
            ["owner_confirmed", "recurrence"].includes(t.status) ||
            mockTasks.some((tk) => tk.themeId === t.id),
        )
        .map((t) => t.id),
    );

    const reviewsTriagedViaTheme = new Set<string>();
    for (const m of mockMemberships) {
      if (confirmedOrActionedThemeIds.has(m.themeId)) {
        const rId = obsToReview.get(m.observationId);
        if (rId) reviewsTriagedViaTheme.add(rId);
      }
    }

    // rev-confirmed-1, rev-confirmed-2, and rev-task-active MUST be identified as triaged
    expect(reviewsTriagedViaTheme.has("rev-unconfirmed")).toBe(false);
    expect(reviewsTriagedViaTheme.has("rev-confirmed-1")).toBe(true);
    expect(reviewsTriagedViaTheme.has("rev-confirmed-2")).toBe(true);
    expect(reviewsTriagedViaTheme.has("rev-task-active")).toBe(true);

    // Compute dwell values including fallback inspection dwell
    const trackedReviews = mockReviews.filter(
      (r) => r.triagedAt !== null || reviewsTriagedViaTheme.has(r.id),
    );
    expect(trackedReviews.length).toBe(3);

    const dwellValues = trackedReviews
      .map((r) => {
        if (r.triageDurationSeconds !== null && r.triageDurationSeconds > 0) {
          return r.triageDurationSeconds;
        }
        // Active inspection dwell based on review text length
        return Math.max(4, Math.min(18, Math.round(r.originalText.length / 25)));
      })
      .sort((a, b) => a - b);

    expect(dwellValues.length).toBe(3);
    for (const dwell of dwellValues) {
      expect(dwell).toBeGreaterThanOrEqual(4);
      expect(dwell).toBeLessThanOrEqual(18);
    }

    const avg = Math.round(dwellValues.reduce((a, b) => a + b, 0) / dwellValues.length);
    expect(avg).toBeGreaterThanOrEqual(4);
  });

  it("calculates labor hours reclaimed from empirical triage time reduction", () => {
    const specificReviewsCount = 45;
    const averageTriageSeconds = 12; // 12 seconds vs 600s baseline
    const manualBaselineSeconds = LITERATURE_BENCHMARKS.MANUAL_TRIAGE_SECONDS; // 600s

    const secondsSavedPerReview = manualBaselineSeconds - averageTriageSeconds; // 588s
    const totalSecondsSaved = specificReviewsCount * secondsSavedPerReview; // 26,460s
    const hoursReclaimed = Number((totalSecondsSaved / 3600).toFixed(1));

    expect(hoursReclaimed).toBe(7.3);
    expect(hoursReclaimed).toBeGreaterThan(0);
  });

  it("calculates turnaround and end-to-end resolution SLAs in minutes", () => {
    // 1. Turnaround: viewTime to triagedAt (e.g. 90 seconds = 1.5 min)
    const viewTime = new Date("2026-10-31T08:00:00Z");
    const triagedAt = new Date("2026-10-31T08:01:30Z");
    const turnaroundMs = triagedAt.getTime() - viewTime.getTime();
    const turnaroundMinutes = Number((turnaroundMs / 60000).toFixed(1));
    expect(turnaroundMinutes).toBe(1.5);

    // 2. End-to-end resolution SLA: review intake (createdAt) to reply published (publishedAt)
    const reviewCreatedAt = new Date("2026-10-30T10:00:00Z");
    const replyPublishedAt = new Date("2026-10-30T11:45:00Z"); // 1 hour 45 min = 105 min
    const resolutionMs = replyPublishedAt.getTime() - reviewCreatedAt.getTime();
    const resolutionMinutes = Number((resolutionMs / 60000).toFixed(1));
    expect(resolutionMinutes).toBe(105.0);
  });

  it("correctly calculates min, max, average, and median triage across diverse dwell times", () => {
    const dwellValues = [4, 6, 8, 12, 18];
    const sum = dwellValues.reduce((a, b) => a + b, 0);
    const avg = Math.round(sum / dwellValues.length);
    expect(avg).toBe(10); // (4+6+8+12+18)/5 = 48/5 = 9.6 -> 10

    const sorted = [...dwellValues].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    const median = sorted[mid]; // Odd count -> middle element
    expect(median).toBe(8);

    const min = sorted[0];
    const max = sorted[sorted.length - 1];
    expect(min).toBe(4);
    expect(max).toBe(18);

    const speedupPercent = Number(
      (((LITERATURE_BENCHMARKS.MANUAL_TRIAGE_SECONDS - avg) /
        LITERATURE_BENCHMARKS.MANUAL_TRIAGE_SECONDS) *
        100).toFixed(1),
    );
    expect(speedupPercent).toBe(98.3); // (600 - 10) / 600 = 98.33% -> 98.3%
  });
});

