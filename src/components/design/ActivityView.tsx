"use client";

import { useState } from "react";
import { PageHeading } from "./PageHeading";
import {
  activityKind,
  groupActivity,
  type ActivityEvent,
  type ActivityKind,
  type ActivityReply,
  type ActivityTask,
} from "./activity-model";

const kinds: { id: ActivityKind; label: string }[] = [
  { id: "all", label: "All" },
  { id: "reviews", label: "Reviews" },
  { id: "issues", label: "Issues" },
  { id: "tasks", label: "Tasks" },
  { id: "replies", label: "Replies" },
];

const toSentenceCase = (text: string) => {
  if (!text) return "";
  const cleaned = text.replaceAll("_", " ").toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

function formatEventDescription(desc: string): string {
  if (!desc) return "";
  if (
    desc.includes("No exact analysis fixture exists") ||
    desc.includes("No fixture exists")
  ) {
    return "Review requires owner assessment.";
  }
  if (desc.includes("Analysis started in fixture mode")) {
    return "Automated review analysis started.";
  }
  if (desc.includes("Simulated Orbyte integration handoff saved locally")) {
    return "Simulated handoff recorded.";
  }
  return desc;
}

// Edit these labels to change how stored event types read in the Activity tab.
const titles: Record<string, string> = {
  review_intake: "Review added",
  review_viewed: "Review opened",
  review_triaged: "Review triaged",
  review_dwell_recorded: "Dwell time recorded",
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
  handoff_simulated: "Simulated handoff recorded",
  reply_simulated_published: "Simulated published",
};

const taskStatuses: Record<string, string> = {
  proposed: "Awaiting approval",
  deferred: "Saved for later",
  approved_open: "Assigned",
  in_progress: "In progress",
  reported: "Awaiting verification",
  needs_rework: "Needs rework",
  resolved: "Verified",
  rejected: "Proposal rejected",
};

const date = (value: string) =>
  new Date(value).toLocaleDateString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
const time = (value: string) =>
  new Date(value).toLocaleTimeString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    hour: "numeric",
    minute: "2-digit",
  });

type EventRowProps = {
  event: ActivityEvent;
  actor: string;
  subject?: string;
};

function EventRow({ event, actor, subject }: EventRowProps) {
  const metadata =
    event.metadata && typeof event.metadata === "object"
      ? (event.metadata as Record<string, unknown>)
      : {};
  return (
    <article className={`activity-event activity-${activityKind(event)}`}>
      <span className="activity-event-marker" aria-hidden="true" />
      <div className="activity-event-content">
        <div className="activity-event-topline">
          <strong>
            {titles[event.type] || toSentenceCase(event.type)}
          </strong>
          <time dateTime={event.createdAt}>
            {date(event.createdAt)} · {time(event.createdAt)}
          </time>
        </div>
        {subject && <p className="activity-event-subject">{subject}</p>}
        <p className="activity-event-description">
          {formatEventDescription(event.description)}
        </p>
        <p className="activity-event-actor">By {actor}</p>
        {typeof metadata.reason === "string" && (
          <p className="activity-event-decision">
            <strong>Reason</strong> {metadata.reason}
          </p>
        )}
        {typeof metadata.note === "string" &&
          event.type === "task_reported" && (
            <p className="activity-event-decision">
              <strong>Report</strong> {metadata.note}
            </p>
          )}
        {typeof metadata.outcome === "string" && (
          <p className="activity-event-outcome">
            Result: {toSentenceCase(metadata.outcome)}
          </p>
        )}
      </div>
    </article>
  );
}

export function ActivityView({
  events,
  employees,
  tasks,
  themes,
  reviews,
  replies,
  onOpenTask,
}: {
  events: ActivityEvent[];
  employees: { id: string; name: string }[];
  tasks: ActivityTask[];
  themes: { id: string; title: string }[];
  reviews: { id: string; originalText: string }[];
  replies: ActivityReply[];
  onOpenTask: (id: string) => void;
}) {
  const [selectedKind, setSelectedKind] = useState<ActivityKind>("all");
  const [visibleThreads, setVisibleThreads] = useState(6);
  const [visibleOther, setVisibleOther] = useState(30);
  const replyReviews = new Map(
    replies.map((reply) => [reply.id, reply.reviewId]),
  );
  const employeeNames = new Map(
    employees.map((employee) => [employee.id, employee.name]),
  );
  const taskNames = new Map(tasks.map((task) => [task.id, task.title]));
  const issueNames = new Map(themes.map((theme) => [theme.id, theme.title]));
  const reviewNames = new Map(
    reviews.map((review) => [
      review.id,
      review.originalText.length > 72
        ? `${review.originalText.slice(0, 72).trimEnd()}…`
        : review.originalText,
    ]),
  );
  const filtered = events.filter(
    (event) => selectedKind === "all" || activityKind(event) === selectedKind,
  );
  const { threads, other } = groupActivity(filtered, tasks, replies);
  const counts = Object.fromEntries(
    kinds.map(({ id }) => [
      id,
      id === "all"
        ? events.length
        : events.filter((event) => activityKind(event) === id).length,
    ]),
  ) as Record<ActivityKind, number>;

  const actorName = (event: ActivityEvent) =>
    event.actor === "demo owner"
      ? "Owner"
      : event.actor === "demo user"
        ? "Team member"
        : event.actor === "system"
          ? "Clarity"
          : event.actor === "local adapter"
            ? "Orbyte simulation"
            : employeeNames.get(event.actor) || event.actor;
  const subject = (event: ActivityEvent) => {
    if (event.entityType === "task") return taskNames.get(event.entityId);
    if (event.entityType === "theme") return issueNames.get(event.entityId);
    if (event.entityType === "review") return reviewNames.get(event.entityId);
    if (event.entityType === "reply")
      return reviewNames.get(replyReviews.get(event.entityId) || "");
    return undefined;
  };

  return (
    <section className="activity-page">
      <PageHeading
        index="06"
        eyebrow="Workspace history"
        title="Work, with its history."
        description="Task decisions and linked replies stay together. Review and issue updates remain visible below."
      >
        <span className="page-count">
          <strong>{events.length}</strong> updates
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
              setVisibleThreads(6);
              setVisibleOther(30);
            }}
          >
            {label} <span>{counts[id]}</span>
          </button>
        ))}
      </div>
      {threads.length > 0 && (
        <section
          className="activity-work-section"
          aria-labelledby="activity-work-title"
        >
          <div className="activity-section-heading">
            <div>
              <p className="eyebrow">Connected by task</p>
              <h2 id="activity-work-title">Work threads</h2>
            </div>
            <span>
              {threads.length} {threads.length === 1 ? "task" : "tasks"}
            </span>
          </div>
          <div className="activity-thread-list">
            {threads
              .slice(0, visibleThreads)
              .map(({ task, events: threadEvents }) => (
                <section
                  className="activity-thread"
                  key={task.id}
                  aria-labelledby={`thread-${task.id}`}
                >
                  <header className="activity-thread-heading">
                    <div>
                      <p className="activity-thread-kicker">
                        Work task · {issueNames.get(task.themeId) || "Issue"}
                      </p>
                      <h3 id={`thread-${task.id}`}>{task.title}</h3>
                      <span className="activity-thread-status">
                        {taskStatuses[task.status] ||
                          task.status.replaceAll("_", " ")}
                      </span>
                      <span className="activity-thread-count">
                        {threadEvents.length}{" "}
                        {threadEvents.length === 1 ? "update" : "updates"}
                      </span>
                    </div>
                    <button
                      type="button"
                      className="secondary"
                      onClick={() => onOpenTask(task.id)}
                    >
                      View task
                    </button>
                  </header>
                  <ol
                    className="activity-thread-events"
                    aria-label={`History for ${task.title}`}
                  >
                    {threadEvents.map((event) => (
                      <li key={event.id}>
                        <EventRow
                          event={event}
                          actor={actorName(event)}
                          subject={
                            event.entityType === "reply"
                              ? subject(event)
                              : undefined
                          }
                        />
                      </li>
                    ))}
                  </ol>
                </section>
              ))}
          </div>
          {visibleThreads < threads.length && (
            <button
              className="secondary activity-more"
              onClick={() => setVisibleThreads((count) => count + 6)}
            >
              Show more work threads
            </button>
          )}
        </section>
      )}
      {other.length > 0 && (
        <section
          className="activity-other-section"
          aria-labelledby="activity-other-title"
        >
          <div className="activity-section-heading">
            <div>
              <p className="eyebrow">Review and issue trail</p>
              <h2 id="activity-other-title">Other updates</h2>
            </div>
            <span>
              {other.length} {other.length === 1 ? "update" : "updates"}
            </span>
          </div>
          <div className="activity-other-list">
            {other.slice(0, visibleOther).map((event) => (
              <EventRow
                key={event.id}
                event={event}
                actor={actorName(event)}
                subject={subject(event)}
              />
            ))}
          </div>
          {visibleOther < other.length && (
            <button
              className="secondary activity-more"
              onClick={() => setVisibleOther((count) => count + 30)}
            >
              Show more updates
            </button>
          )}
        </section>
      )}
      {!filtered.length && (
        <p className="activity-empty">No activity in this category yet.</p>
      )}
    </section>
  );
}
