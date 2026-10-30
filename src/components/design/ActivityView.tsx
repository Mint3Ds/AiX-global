"use client";

import { useState } from "react";
import { PageHeading } from "./PageHeading";

type ActivityEvent = {
  id: string;
  actor: string;
  type: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: string;
  metadata?: unknown;
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
  theme_reopened: "Issue reopened",
  priority_adjusted: "Priority changed",
  task_proposed: "Work task created",
  task_edited: "Work task edited",
  task_deferred: "Task saved for later",
  task_approved: "Task assigned",
  task_started: "Work started",
  task_reported: "Work update submitted",
  task_verified: "Work verified",
  task_report_rejected: "Work returned for rework",
  reply_drafted: "Reply drafted",
  reply_edited: "Reply edited",
  reply_approved: "Reply approved",
  reply_rejected: "Reply rejected",
  reply_publish_denied: "Posting blocked",
  handoff_simulated: "Orbyte handoff simulated",
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
  const available = [...events].sort((a, b) =>
    b.createdAt.localeCompare(a.createdAt),
  );
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
  const visible = filtered.slice(0, visibleCount);
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
      <PageHeading
        index="06"
        eyebrow="Workspace history"
        title="A record of every next step."
        description="Reviews, decisions, and work updates in one traceable timeline."
      >
        <span className="page-count">
          <strong>{available.length}</strong> updates
        </span>
      </PageHeading>
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
        {visible.map((event, index) => {
          const showDay =
            index === 0 ||
            day(visible[index - 1].createdAt) !== day(event.createdAt);
          const title = titles[event.type] || event.type.replaceAll("_", " ");
          const subject = context(event);
          const metadata =
            event.metadata && typeof event.metadata === "object"
              ? (event.metadata as Record<string, unknown>)
              : {};
          return (
            <div key={event.id}>
              {showDay && (
                <h3 className="activity-day">{day(event.createdAt)}</h3>
              )}
              <details className={`activity-entry activity-${category(event)}`}>
                <summary>
                  <span className="activity-marker" aria-hidden="true" />
                  <span className="activity-entry-main">
                    <strong>{title}</strong>
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
                {typeof metadata.reason === "string" && (
                  <p className="activity-decision-reason">
                    <strong>Reason:</strong> {metadata.reason}
                  </p>
                )}
                {typeof metadata.note === "string" &&
                  event.type === "task_reported" && (
                    <p className="activity-decision-reason">
                      <strong>Report:</strong> {metadata.note}
                    </p>
                  )}
                {typeof metadata.outcome === "string" && (
                  <p className="activity-outcome">
                    <strong>Result:</strong>{" "}
                    {metadata.outcome.replaceAll("_", " ")}
                  </p>
                )}
              </details>
            </div>
          );
        })}
        {!visible.length && (
          <p className="activity-empty">No activity in this category yet.</p>
        )}
      </div>
      {visibleCount < filtered.length && (
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
