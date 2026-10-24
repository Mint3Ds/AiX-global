"use client";

import { useState } from "react";

type ActivityEvent = {
  id: string;
  actor: string;
  type: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: string;
};

type ActivityKind = "all" | "reviews" | "issues" | "tasks" | "replies";

const kinds: { id: ActivityKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "reviews", label: "Reviews" },
  { id: "issues", label: "Issues" },
  { id: "tasks", label: "Tasks" },
  { id: "replies", label: "Replies" },
];

const titles: Record<string, string> = {
  review_intake: "Review added",
  analysis_started: "Analysis started",
  analysis_completed: "Review analysed",
  analysis_needs_review: "Review needs attention",
  analysis_failed: "Analysis failed",
  manual_classification: "Review classified",
  membership_corrected: "Evidence updated",
  possible_recurrence: "Possible recurrence",
  theme_confirmed: "Issue confirmed",
  theme_dismissed: "Issue dismissed",
  priority_adjusted: "Priority changed",
  task_proposed: "Work task created",
  task_edited: "Work task edited",
  task_deferred: "Task saved for later",
  task_approved: "Task assigned",
  task_started: "Work started",
  task_reported: "Work update submitted",
  task_verified: "Work verified",
  reply_drafted: "Reply drafted",
  reply_edited: "Reply edited",
  reply_approved: "Reply approved",
  reply_simulated_published: "Reply posted",
};

const category = (event: ActivityEvent): ActivityKind => {
  if (event.entityType === "review") return "reviews";
  if (["theme", "observation"].includes(event.entityType)) return "issues";
  if (event.entityType === "task") return "tasks";
  return "replies";
};

const day = (value: string) =>
  new Date(value).toLocaleDateString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

const time = (value: string) =>
  new Date(value).toLocaleTimeString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "numeric",
    minute: "2-digit",
  });

export function ActivityView({
  events,
  employees,
  tasks,
  themes,
  reviews,
  replies,
}: {
  events: ActivityEvent[];
  employees: { id: string; name: string }[];
  tasks: { id: string; title: string }[];
  themes: { id: string; title: string }[];
  reviews: { id: string; originalText: string }[];
  replies: { id: string; reviewId: string }[];
}) {
  const [selectedKind, setSelectedKind] = useState<ActivityKind>("all");
  const [visibleCount, setVisibleCount] = useState(30);
  const available = [...events]
    .filter((event) => event.type !== "handoff_simulated")
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const counts = Object.fromEntries(
    kinds.map(({ id }) => [
      id,
      id === "all"
        ? available.length
        : available.filter((event) => category(event) === id).length,
    ]),
  ) as Record<ActivityKind, number>;
  const filtered = available.filter(
    (event) => selectedKind === "all" || category(event) === selectedKind,
  );
  const grouped: { event: ActivityEvent; count: number }[] = [];
  for (const event of filtered) {
    const previous = grouped.at(-1);
    if (
      previous &&
      previous.event.type === event.type &&
      previous.event.description === event.description &&
      previous.event.actor === event.actor &&
      previous.event.createdAt.slice(0, 16) === event.createdAt.slice(0, 16)
    ) {
      previous.count += 1;
    } else {
      grouped.push({ event, count: 1 });
    }
  }
  const visible = grouped.slice(0, visibleCount);
  const taskNames = new Map(tasks.map((item) => [item.id, item.title]));
  const issueNames = new Map(themes.map((item) => [item.id, item.title]));
  const reviewNames = new Map(
    reviews.map((item) => [
      item.id,
      item.originalText.length > 72
        ? `${item.originalText.slice(0, 72).trimEnd()}…`
        : item.originalText,
    ]),
  );
  const replyReviews = new Map(replies.map((item) => [item.id, item.reviewId]));
  const employeeNames = new Map(employees.map((item) => [item.id, item.name]));
  const context = (event: ActivityEvent) => {
    if (event.entityType === "task") return taskNames.get(event.entityId);
    if (event.entityType === "theme") return issueNames.get(event.entityId);
    if (event.entityType === "review") return reviewNames.get(event.entityId);
    if (event.entityType === "reply")
      return reviewNames.get(replyReviews.get(event.entityId) || "");
    return undefined;
  };
  const actor = (event: ActivityEvent) =>
    event.actor === "demo owner"
      ? "Owner"
      : event.actor === "demo user"
        ? "Team member"
        : event.actor === "system"
          ? "Clarity"
          : employeeNames.get(event.actor) || event.actor;

  return (
    <section className="activity-page">
      <div className="activity-page-heading">
        <div>
          <h2>Activity</h2>
          <p>Workspace history</p>
        </div>
        <span>{available.length} updates</span>
      </div>
      <div
        className="activity-filters"
        role="group"
        aria-label="Filter activity"
      >
        {kinds.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            className={selectedKind === id ? "active" : ""}
            aria-pressed={selectedKind === id}
            onClick={() => {
              setSelectedKind(id);
              setVisibleCount(30);
            }}
          >
            {label} <span>{counts[id]}</span>
          </button>
        ))}
      </div>
      <div className="activity-feed">
        {visible.map(({ event, count }, index) => {
          const showDay =
            index === 0 ||
            day(visible[index - 1].event.createdAt) !== day(event.createdAt);
          const title = titles[event.type] || event.type.replaceAll("_", " ");
          const subject =
            count > 1 ? `${count} ${category(event)}` : context(event);
          return (
            <div key={event.id}>
              {showDay && (
                <h3 className="activity-day">{day(event.createdAt)}</h3>
              )}
              <details className={`activity-entry activity-${category(event)}`}>
                <summary>
                  <span className="activity-marker" aria-hidden="true" />
                  <span className="activity-entry-main">
                    <strong>
                      {count > 1 && event.type === "reply_drafted"
                        ? "Replies drafted"
                        : title}
                    </strong>
                    {subject && (
                      <span className="activity-subject">{subject}</span>
                    )}
                  </span>
                  <span className="activity-entry-meta">
                    <span>{actor(event)}</span>
                    <time dateTime={event.createdAt}>
                      {time(event.createdAt)}
                    </time>
                  </span>
                  <span className="activity-expand" aria-hidden="true">
                    ⌄
                  </span>
                </summary>
                <p>{event.description}</p>
              </details>
            </div>
          );
        })}
        {!visible.length && (
          <p className="activity-empty">No activity in this category yet.</p>
        )}
      </div>
      {visibleCount < grouped.length && (
        <button
          className="secondary activity-more"
          onClick={() => setVisibleCount((count) => count + 30)}
        >
          Show more activity
        </button>
      )}
    </section>
  );
}
