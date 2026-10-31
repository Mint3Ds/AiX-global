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
