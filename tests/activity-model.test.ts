import { describe, expect, it } from "vitest";
import {
  activityKind,
  groupActivity,
  type ActivityEvent,
  type ActivityTask,
} from "../src/components/design/activity-model";

const tasks: ActivityTask[] = [
  { id: "task-a", title: "Repair AC", status: "reported", themeId: "ac" },
  { id: "task-b", title: "Check lift", status: "resolved", themeId: "lift" },
];
const event = (
  id: string,
  entityType: string,
  entityId: string,
  createdAt: string,
): ActivityEvent => ({
  id,
  entityType,
  entityId,
  createdAt,
  actor: "demo owner",
  type: id,
  description: id,
});

describe("activity threads", () => {
  it("keeps business setup events out of the reply category", () => {
    expect(
      activityKind(
        event(
          "dataset_seeded",
          "business",
          "harbour-house",
          "2026-10-31T09:00:00Z",
        ),
      ),
    ).toBe("all");
    expect(
      activityKind(
        event("reply_drafted", "reply", "reply-1", "2026-10-31T09:00:00Z"),
      ),
    ).toBe("replies");
  });
  it("connects task, handoff, and linked reply events without losing audit entries", () => {
    const events = [
      event("intake", "review", "review-1", "2026-10-30T09:00:00Z"),
      event("proposed", "task", "task-a", "2026-10-30T09:01:00Z"),
      event("handoff", "task", "task-a", "2026-10-30T09:02:00Z"),
      event("reply", "reply", "reply-1", "2026-10-30T09:03:00Z"),
      event("other-reply", "reply", "missing", "2026-10-30T09:04:00Z"),
      event("lift", "task", "task-b", "2026-10-29T09:00:00Z"),
    ];
    const grouped = groupActivity(events, tasks, [
      { id: "reply-1", reviewId: "review-1", taskId: "task-a" },
    ]);
    expect(grouped.threads.map((thread) => thread.task.id)).toEqual([
      "task-a",
      "task-b",
    ]);
    expect(grouped.threads[0].events.map((item) => item.id)).toEqual([
      "reply",
      "handoff",
      "proposed",
    ]);
    expect(grouped.other.map((item) => item.id)).toEqual([
      "other-reply",
      "intake",
    ]);
    expect(
      grouped.threads.reduce(
        (count, thread) => count + thread.events.length,
        0,
      ) + grouped.other.length,
    ).toBe(events.length);
  });
});

describe("activity triage time tracking", () => {
  it("extracts triage dwell duration from metadata, description, and review state", async () => {
    const {
      getEventTriageSeconds,
      formatTriageDuration,
      formatBaselineSavings,
    } = await import("../src/components/design/ActivityView");

    const reviewMap = new Map([
      [
        "rev-1",
        {
          id: "rev-1",
          originalText: "AC broke in room 204",
          triageDurationSeconds: 12.4,
          triagedAt: "2026-10-30T10:00:00Z",
        },
      ],
    ]);

    // From metadata dwellSeconds
    const metaEvent: ActivityEvent = {
      id: "evt-meta",
      actor: "demo owner",
      type: "review_triaged",
      entityType: "review",
      entityId: "rev-x",
      description: "Review triaged",
      createdAt: "2026-10-30T10:00:00Z",
      metadata: { dwellSeconds: 8.5 },
    };
    expect(getEventTriageSeconds(metaEvent, reviewMap)).toBe(8.5);

    // From description regex
    const textEvent: ActivityEvent = {
      id: "evt-desc",
      actor: "demo owner",
      type: "review_triaged",
      entityType: "review",
      entityId: "rev-y",
      description: "Review triaged; active inspection took 15 seconds.",
      createdAt: "2026-10-30T10:00:00Z",
    };
    expect(getEventTriageSeconds(textEvent, reviewMap)).toBe(15);

    // From associated review
    const reviewEvent: ActivityEvent = {
      id: "evt-rev",
      actor: "demo owner",
      type: "review_triaged",
      entityType: "review",
      entityId: "rev-1",
      description: "Review triaged",
      createdAt: "2026-10-30T10:00:00Z",
    };
    expect(getEventTriageSeconds(reviewEvent, reviewMap)).toBe(12.4);

    // Formatting durations
    expect(formatTriageDuration(0)).toBe("0.0s");
    expect(formatTriageDuration(4.5)).toBe("4.5s");
    expect(formatTriageDuration(12)).toBe("12s");
    expect(formatTriageDuration(75)).toBe("1m 15s");
    expect(formatTriageDuration(120)).toBe("2m");

    // Baseline savings vs 600s
    expect(formatBaselineSavings(12)).toBe("98% faster than manual baseline");
    expect(formatBaselineSavings(4.5)).toBe("99.3% faster than manual baseline");
  });
});
