"use client";

import { useMemo, useState } from "react";
import type { WorkspaceMetrics } from "@/domain/metrics";
import { PageHeading } from "./PageHeading";
import { OrbyteHandoffDetails } from "./OrbyteHandoffDetails";
import {
  activityKind,
  groupActivity,
  type ActivityBranch,
  type ActivityEvent,
  type ActivityKind,
  type ActivityReply,
  type ActivityReview,
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
  dataset_seeded: "Demo dataset ready",
  review_intake: "Review added",
  review_viewed: "Review opened",
  review_triaged: "Review actioned",
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
  task_rejected: "Task proposal rejected",
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

export function formatTriageDuration(seconds: number): string {
  if (seconds <= 0) return "0.0s";
  if (seconds < 1) return "< 1s";
  if (seconds < 60) {
    return `${seconds % 1 === 0 ? seconds : seconds.toFixed(1)}s`;
  }
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
}

export function formatBaselineSavings(seconds: number): string {
  const baseline = 600; // Johnston (2001) 10-minute baseline
  const savings = Math.max(
    0,
    Math.min(99.9, ((baseline - seconds) / baseline) * 100),
  );
  return `${savings.toFixed(savings >= 99 ? 1 : 0)}% faster than manual baseline`;
}

export function getEventTriageSeconds(
  event: ActivityEvent,
  reviewMap: Map<string, ActivityReview>,
): number | null {
  const meta =
    event.metadata && typeof event.metadata === "object"
      ? (event.metadata as Record<string, unknown>)
      : null;

  // 1. Direct dwellSeconds, triageDurationSeconds, or activeSeconds in metadata
  if (typeof meta?.dwellSeconds === "number" && meta.dwellSeconds > 0) {
    return meta.dwellSeconds;
  }
  if (
    typeof meta?.triageDurationSeconds === "number" &&
    meta.triageDurationSeconds > 0
  ) {
    return meta.triageDurationSeconds;
  }
  if (typeof meta?.activeSeconds === "number" && meta.activeSeconds > 0) {
    return meta.activeSeconds;
  }

  // 2. Parse from event description (e.g., "active inspection took 12 seconds")
  const descMatch = event.description.match(
    /(?:took|recorded:?|inspection:?)\s*(\d+(?:\.\d+)?)\s*(?:seconds|s\b)/i,
  );
  if (descMatch && descMatch[1]) {
    const parsed = parseFloat(descMatch[1]);
    if (!isNaN(parsed) && parsed > 0) return parsed;
  }

  // 3. Review's stored triage duration
  if (event.entityType === "review") {
    const rev = reviewMap.get(event.entityId);
    if (
      rev?.triageDurationSeconds != null &&
      rev.triageDurationSeconds > 0 &&
      (event.type === "review_triaged" ||
        event.type === "review_dwell_recorded" ||
        event.type === "manual_classification" ||
        rev.triagedAt != null)
    ) {
      return rev.triageDurationSeconds;
    }
  }

  return null;
}

type EventRowProps = {
  event: ActivityEvent;
  actor: string;
  roleBadge: { label: string; className: string };
  subject?: string;
  review?: ActivityReview;
  task?: ActivityTask;
  handoff?: { payload: Record<string, unknown>; simulatedStatus: string; createdAt: string };
  branchName?: string;
  triageSeconds: number | null;
  onOpenTask?: (id: string) => void;
  onOpenReview?: (id: string) => void;
};

function EventRow({
  event,
  actor,
  roleBadge,
  subject,
  review,
  task,
  handoff,
  branchName,
  triageSeconds,
  onOpenTask,
  onOpenReview,
}: EventRowProps) {
  const metadata =
    event.metadata && typeof event.metadata === "object"
      ? (event.metadata as Record<string, unknown>)
      : {};

  const verificationNote =
    typeof metadata.verification === "string"
      ? metadata.verification
      : typeof metadata.feedback === "string"
        ? metadata.feedback
        : null;

  return (
    <article className={`activity-event activity-${activityKind(event)}`}>
      <span className="activity-event-marker" aria-hidden="true" />
      <div className="activity-event-content">
        <div className="activity-event-topline">
          <div className="activity-event-title-group">
            <strong>{titles[event.type] || toSentenceCase(event.type)}</strong>
            <span
              className="activity-badge badge-id"
              title={`Audit event ID: ${event.id}`}
            >
              #{event.id.slice(0, 8)}
            </span>
          </div>
          <time dateTime={event.createdAt}>
            {date(event.createdAt)} · {time(event.createdAt)}
          </time>
        </div>

        {/* Audit Badges: Role, Branch, Rating/Source, Status */}
        <div className="activity-event-badges">
          <span className={`activity-badge ${roleBadge.className}`}>
            {roleBadge.label}
          </span>
          {branchName && (
            <span className="activity-badge badge-branch">📍 {branchName}</span>
          )}
          {review?.rating != null && (
            <span
              className="activity-badge badge-rating"
              title={`Rating: ${review.rating} / 5 stars`}
            >
              {"★".repeat(Math.min(5, Math.max(1, review.rating)))}
              {"☆".repeat(
                Math.max(0, 5 - Math.min(5, Math.max(1, review.rating))),
              )}
              <span className="rating-numeric"> {review.rating}/5</span>
            </span>
          )}
          {review?.source && (
            <span className="activity-badge badge-source">
              {review.source === "google"
                ? "Google Reviews"
                : toSentenceCase(review.source)}
            </span>
          )}
          {task && (
            <span
              className={`activity-badge badge-status status-${task.status}`}
            >
              {taskStatuses[task.status] || task.status.replaceAll("_", " ")}
            </span>
          )}
        </div>

        {/* Standout Triage Telemetry Callout */}
        {triageSeconds != null && (
          <div className="activity-triage-callout">
            <div className="triage-callout-primary">
              <span className="triage-callout-icon" aria-hidden="true">
                ⏱
              </span>
              <span className="triage-callout-label">
                {event.type === "review_triaged"
                  ? "Actioned in"
                  : event.type === "review_dwell_recorded"
                    ? "Review Handling Time:"
                    : "Review-to-Action Time:"}
              </span>
              <strong className="triage-callout-duration">
                {formatTriageDuration(triageSeconds)}
              </strong>
            </div>
            <div className="triage-callout-comparison">
              <span className="comparison-pct">
                {formatBaselineSavings(triageSeconds)}
              </span>
              <span className="comparison-note">(vs 10 min manual review)</span>
            </div>
          </div>
        )}

        {subject && (
          <div className="activity-event-subject-row">
            <p className="activity-event-subject">{subject}</p>
            {review && onOpenReview && (
              <button
                type="button"
                className="activity-action-btn"
                onClick={() => onOpenReview(review.id)}
                title="Inspect review in the review drawer"
              >
                Inspect review →
              </button>
            )}
            {task && onOpenTask && event.entityType === "task" && (
              <button
                type="button"
                className="activity-action-btn"
                onClick={() => onOpenTask(task.id)}
                title="Open and view task details"
              >
                View task →
              </button>
            )}
          </div>
        )}

        <p className="activity-event-description">
          {formatEventDescription(event.description)}
        </p>

        {event.type === "handoff_simulated" && handoff && (
          <OrbyteHandoffDetails
            payload={handoff.payload}
            recordStatus={handoff.simulatedStatus}
            createdAt={handoff.createdAt}
          />
        )}

        <p className="activity-event-actor">Logged by {actor}</p>

        {/* Managerial Decision Details & Callouts */}
        {typeof metadata.reason === "string" && metadata.reason.trim() && (
          <div className="activity-event-decision decision-reason">
            <strong>Decision Reason:</strong> {metadata.reason}
          </div>
        )}

        {verificationNote && verificationNote.trim() && (
          <div className="activity-event-decision decision-verification">
            <strong>Verification Check:</strong> {verificationNote}
          </div>
        )}

        {typeof metadata.note === "string" &&
          metadata.note.trim() &&
          (event.type === "task_reported" || event.entityType === "task") && (
            <div className="activity-event-decision decision-report">
              <strong>Staff Completion Report:</strong> {metadata.note}
            </div>
          )}

        {typeof metadata.evidenceCount === "number" && (
          <p className="activity-event-meta-stat">
            Linked Evidence: <strong>{metadata.evidenceCount}</strong> customer
            observations verified
          </p>
        )}

        {typeof metadata.linkedReviewsCount === "number" && (
          <p className="activity-event-meta-stat">
            Actioned Reviews: <strong>{metadata.linkedReviewsCount}</strong>{" "}
            source review(s) turned into action
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
  branches = [],
  replies,
  handoffs = [],
  metrics,
  onOpenTask,
  onOpenReview,
}: {
  events: ActivityEvent[];
  employees: { id: string; name: string }[];
  tasks: ActivityTask[];
  themes: { id: string; title: string; branchId?: string }[];
  reviews: ActivityReview[];
  branches?: ActivityBranch[];
  replies: ActivityReply[];
  handoffs?: { id: string; approvedTaskId: string; approvedTaskVersion: number; payload: Record<string, unknown>; simulatedStatus: string; createdAt: string }[];
  metrics?: WorkspaceMetrics;
  onOpenTask: (id: string) => void;
  onOpenReview?: (id: string) => void;
}) {
  const [selectedKind, setSelectedKind] = useState<ActivityKind>("all");
  const [selectedRole, setSelectedRole] = useState<string>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [triageOnly, setTriageOnly] = useState(false);
  const [visibleThreads, setVisibleThreads] = useState(6);
  const [visibleOther, setVisibleOther] = useState(30);

  // Fast entity maps
  const replyReviews = useMemo(
    () => new Map(replies.map((reply) => [reply.id, reply.reviewId])),
    [replies],
  );
  const employeeNames = useMemo(
    () => new Map(employees.map((employee) => [employee.id, employee.name])),
    [employees],
  );
  const taskMap = useMemo(
    () => new Map(tasks.map((task) => [task.id, task])),
    [tasks],
  );
  const themeMap = useMemo(
    () => new Map(themes.map((theme) => [theme.id, theme])),
    [themes],
  );
  const reviewMap = useMemo(
    () => new Map(reviews.map((review) => [review.id, review])),
    [reviews],
  );
  const branchNames = useMemo(
    () => new Map(branches.map((branch) => [branch.id, branch.name])),
    [branches],
  );

  const handoffForEvent = (event: ActivityEvent, task?: ActivityTask) => {
    const metadata =
      event.metadata && typeof event.metadata === "object"
        ? (event.metadata as Record<string, unknown>)
        : {};
    const handoffId = typeof metadata.handoffId === "string" ? metadata.handoffId : null;
    const taskVersion = typeof metadata.taskVersion === "number" ? metadata.taskVersion : null;
    return (
      handoffs.find((record) => record.id === handoffId) ||
      handoffs.find(
        (record) =>
          record.approvedTaskId === task?.id &&
          (taskVersion === null || record.approvedTaskVersion === taskVersion),
      )
    );
  };

  const reviewNames = useMemo(
    () =>
      new Map(
        reviews.map((review) => [
          review.id,
          review.originalText.length > 72
            ? `${review.originalText.slice(0, 72).trimEnd()}…`
            : review.originalText,
        ]),
      ),
    [reviews],
  );

  // High-level operational summary KPI calculations
  const triagedReviewsList = useMemo(
    () =>
      reviews.filter(
        (r) =>
          r.triagedAt != null ||
          (r.triageDurationSeconds != null && r.triageDurationSeconds > 0),
      ),
    [reviews],
  );

  const calculatedAvgTriage = useMemo(() => {
    const dwellValues = triagedReviewsList
      .map((r) => r.triageDurationSeconds)
      .filter((sec): sec is number => typeof sec === "number" && sec > 0);
    return dwellValues.length > 0
      ? Math.round(
          (dwellValues.reduce((a, b) => a + b, 0) / dwellValues.length) * 10,
        ) / 10
      : null;
  }, [triagedReviewsList]);

  const avgTriageSeconds =
    metrics?.timeTracking?.averageTriageSeconds ?? calculatedAvgTriage;
  const totalTriaged =
    metrics?.timeTracking?.totalTriagedReviews ?? triagedReviewsList.length;
  const resolvedTasksCount = useMemo(
    () => tasks.filter((t) => t.status === "resolved").length,
    [tasks],
  );

  // Role attribution & styling
  const actorName = (event: ActivityEvent) =>
    event.actor === "demo owner"
      ? "Owner"
      : event.actor === "demo user"
        ? "Team member"
        : event.actor === "system"
          ? "Clarity"
          : event.actor === "local adapter"
            ? "Orbyte simulation"
            : event.actor === "seed process"
              ? "System setup"
              : employeeNames.get(event.actor) || event.actor;

  const actorRoleBadge = (event: ActivityEvent) => {
    if (event.role === "owner" || event.actor === "demo owner") {
      return { label: "Owner", className: "badge-role-owner" };
    }
    if (event.role === "staff" || employeeNames.has(event.actor)) {
      return { label: "Staff", className: "badge-role-staff" };
    }
    if (event.actor === "local adapter") {
      return { label: "Orbyte", className: "badge-role-adapter" };
    }
    return { label: "Clarity AI", className: "badge-role-system" };
  };

  const subject = (event: ActivityEvent) => {
    if (event.entityType === "task") return taskMap.get(event.entityId)?.title;
    if (event.entityType === "theme")
      return themeMap.get(event.entityId)?.title;
    if (event.entityType === "review") return reviewNames.get(event.entityId);
    if (event.entityType === "reply")
      return reviewNames.get(replyReviews.get(event.entityId) || "");
    return undefined;
  };

  const getBranchForEvent = (event: ActivityEvent): string | undefined => {
    if (event.entityType === "review") {
      const rev = reviewMap.get(event.entityId);
      if (rev?.branchId) return branchNames.get(rev.branchId);
    }
    if (event.entityType === "task") {
      const t = taskMap.get(event.entityId);
      if (t?.branchId) return branchNames.get(t.branchId);
      if (t?.themeId) {
        const th = themeMap.get(t.themeId);
        if (th?.branchId) return branchNames.get(th.branchId);
      }
    }
    if (event.entityType === "theme") {
      const th = themeMap.get(event.entityId);
      if (th?.branchId) return branchNames.get(th.branchId);
    }
    return undefined;
  };

  // Filter pipeline
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return events.filter((event) => {
      // 1. Kind filter
      if (selectedKind !== "all" && activityKind(event) !== selectedKind) {
        return false;
      }

      // 2. Role filter
      if (selectedRole !== "all") {
        if (
          selectedRole === "owner" &&
          !(event.role === "owner" || event.actor === "demo owner")
        ) {
          return false;
        }
        if (
          selectedRole === "staff" &&
          !(event.role === "staff" || employeeNames.has(event.actor))
        ) {
          return false;
        }
        if (
          selectedRole === "system" &&
          !(
            event.actor === "system" ||
            event.role === "system" ||
            event.actor === "seed process"
          )
        ) {
          return false;
        }
        if (selectedRole === "adapter" && event.actor !== "local adapter") {
          return false;
        }
      }

      // 3. Triage only filter
      if (triageOnly) {
        const triageSecs = getEventTriageSeconds(event, reviewMap);
        if (
          triageSecs === null &&
          event.type !== "review_triaged" &&
          event.type !== "review_dwell_recorded"
        ) {
          return false;
        }
      }

      // 4. Keyword search
      if (q) {
        const titleStr = titles[event.type] || event.type;
        const subjStr = subject(event) || "";
        const descStr = event.description || "";
        const actorStr = actorName(event) || "";
        const idStr = event.id;
        const branchStr = getBranchForEvent(event) || "";
        const metaStr =
          event.metadata && typeof event.metadata === "object"
            ? JSON.stringify(event.metadata)
            : "";
        const hay =
          `${titleStr} ${subjStr} ${descStr} ${actorStr} ${idStr} ${branchStr} ${metaStr}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }

      return true;
    });
  }, [
    events,
    selectedKind,
    selectedRole,
    triageOnly,
    searchQuery,
    reviewMap,
    employeeNames,
  ]);

  const { threads, other } = useMemo(
    () => groupActivity(filtered, tasks, replies),
    [filtered, tasks, replies],
  );

  const counts = useMemo(
    () =>
      Object.fromEntries(
        kinds.map(({ id }) => [
          id,
          id === "all"
            ? events.length
            : events.filter((event) => activityKind(event) === id).length,
        ]),
      ) as Record<ActivityKind, number>,
    [events],
  );

  const handleResetFilters = () => {
    setSelectedKind("all");
    setSelectedRole("all");
    setSearchQuery("");
    setTriageOnly(false);
    setVisibleThreads(6);
    setVisibleOther(30);
  };

  return (
    <section className="activity-page">
      <PageHeading
        index="06"
        eyebrow="Workspace history"
        title="Work, with its history."
        description="Persistent audit log of review-to-action handling times, managerial decisions, staff work verification, and simulated handoffs."
      >
        <span className="page-count">
          <strong>{events.length}</strong> updates
        </span>
      </PageHeading>

      {/* Operational KPI Summary Banner */}
      <div className="activity-summary-banner">
        <div className="activity-summary-item">
          <span className="summary-eyebrow">Audit Entries</span>
          <p className="summary-metric">{events.length}</p>
          <span className="summary-caption">Total recorded operations</span>
        </div>
        <div className="activity-summary-item highlight-dwell">
          <span className="summary-eyebrow">Review-to-Action Time</span>
          <p className="summary-metric">
            {avgTriageSeconds != null ? `${avgTriageSeconds}s` : "0.0s"}
          </p>
          <span className="summary-caption">
            {avgTriageSeconds != null
              ? `${Math.max(0, Math.round(((600 - avgTriageSeconds) / 600) * 100))}% faster than manual (10 min)`
              : "Awaiting review handling"}
          </span>
        </div>
        <div className="activity-summary-item">
          <span className="summary-eyebrow">Actioned Reviews</span>
          <p className="summary-metric">{totalTriaged}</p>
          <span className="summary-caption">Customer feedback decisions</span>
        </div>
        <div className="activity-summary-item">
          <span className="summary-eyebrow">Resolved Tasks</span>
          <p className="summary-metric">{resolvedTasksCount}</p>
          <span className="summary-caption">Verified work completions</span>
        </div>
      </div>

      {/* Interactive Activity Log Controls */}
      <div className="activity-controls-bar">
        <div className="activity-search-row">
          <input
            type="search"
            className="activity-search-input"
            placeholder="Search activity log by keyword, action, actor, property, or reason…"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleThreads(6);
              setVisibleOther(30);
            }}
            aria-label="Search activity log"
          />

          <select
            className="activity-role-select"
            value={selectedRole}
            onChange={(e) => {
              setSelectedRole(e.target.value);
              setVisibleThreads(6);
              setVisibleOther(30);
            }}
            aria-label="Filter by actor role"
          >
            <option value="all">All actors</option>
            <option value="owner">Owner decisions</option>
            <option value="staff">Staff actions</option>
            <option value="system">Clarity AI (automated)</option>
            <option value="adapter">Orbyte handoffs</option>
          </select>

          <button
            type="button"
            className={`activity-triage-toggle ${triageOnly ? "active" : ""}`}
            onClick={() => {
              setTriageOnly((v) => !v);
              setVisibleThreads(6);
              setVisibleOther(30);
            }}
            title="Show only updates with review-to-action time recorded"
            aria-pressed={triageOnly}
          >
            ⏱ Review-to-action only
          </button>
        </div>

        {/* Category Tabs */}
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
      </div>

      {/* Work Threads: Task-Connected Histories */}
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
              .map(({ task, events: threadEvents }) => {
                const threadBranch = task.branchId
                  ? branchNames.get(task.branchId)
                  : undefined;
                return (
                  <section
                    className="activity-thread"
                    key={task.id}
                    aria-labelledby={`thread-${task.id}`}
                  >
                    <header className="activity-thread-heading">
                      <div>
                        <p className="activity-thread-kicker">
                          Work task ·{" "}
                          {themeMap.get(task.themeId)?.title || "Issue"}
                          {threadBranch ? ` · 📍 ${threadBranch}` : ""}
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
                      {threadEvents.map((event) => {
                        const linkedReviewId =
                          event.entityType === "reply"
                            ? replyReviews.get(event.entityId)
                            : event.entityType === "review"
                              ? event.entityId
                              : undefined;
                        const linkedReview = linkedReviewId
                          ? reviewMap.get(linkedReviewId)
                          : undefined;
                        const triageSecs = getEventTriageSeconds(
                          event,
                          reviewMap,
                        );

                        return (
                          <li key={event.id}>
                            <EventRow
                              event={event}
                              actor={actorName(event)}
                              roleBadge={actorRoleBadge(event)}
                              subject={
                                event.entityType === "reply"
                                  ? subject(event)
                                  : undefined
                              }
                              review={linkedReview}
                              task={task}
                              handoff={handoffForEvent(event, task)}
                              branchName={getBranchForEvent(event)}
                              triageSeconds={triageSecs}
                              onOpenTask={onOpenTask}
                              onOpenReview={onOpenReview}
                            />
                          </li>
                        );
                      })}
                    </ol>
                  </section>
                );
              })}
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

      {/* Other Updates: Review & Issue Audit Trail */}
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
            {other.slice(0, visibleOther).map((event) => {
              const rev =
                event.entityType === "review"
                  ? reviewMap.get(event.entityId)
                  : undefined;
              const tsk =
                event.entityType === "task"
                  ? taskMap.get(event.entityId)
                  : undefined;
              const triageSecs = getEventTriageSeconds(event, reviewMap);

              return (
                <EventRow
                  key={event.id}
                  event={event}
                  actor={actorName(event)}
                  roleBadge={actorRoleBadge(event)}
                  subject={subject(event)}
                  review={rev}
                  task={tsk}
                  handoff={handoffForEvent(event, tsk)}
                  branchName={getBranchForEvent(event)}
                  triageSeconds={triageSecs}
                  onOpenTask={onOpenTask}
                  onOpenReview={onOpenReview}
                />
              );
            })}
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
        <div className="activity-empty-state">
          <p className="activity-empty-title">No matching activity found</p>
          <p className="activity-empty-desc">
            No audit records match your current filter criteria.
          </p>
          <button
            type="button"
            className="secondary"
            onClick={handleResetFilters}
          >
            Clear all filters
          </button>
        </div>
      )}
    </section>
  );
}
