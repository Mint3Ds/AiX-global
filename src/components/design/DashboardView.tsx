import { useMemo, useState } from "react";
import { getSimulatedAttendance } from "@/integrations/orbyte/attendance";
import { ChoiceMenu } from "./ChoiceMenu";
import { PageHeading } from "./PageHeading";

type Destination = "reviews" | "issues" | "tasks" | "replies" | "activity";
type MetricItem = {
  title: string;
  value: number;
  hint: string;
  destination: Destination;
  visual?: unknown;
};
type MetricSegment = { label: string; value: number; tone: string };
type MetricGraphic =
  | { type: "review_mix"; segments: MetricSegment[] }
  | { type: "daily_meter"; days: { label: string; value: number }[] }
  | { type: "priority_meter" | "task_flow"; segments: MetricSegment[] };
type IssueItem = {
  id: string;
  title: string;
  priority: string;
  branchName: string;
  support: number;
  evidenceQuote?: string;
  status?: string;
};
type EmployeeItem = {
  id: string;
  name: string;
  jobTitle: string;
  orbyteStaffId: string;
};
type WorkItem = {
  id: string;
  title: string;
  description: string;
  priority: string;
  relatedIssue: string;
  assignee: string;
  assigneeId: string | null;
  dueAt: string | null;
  due: string;
  status: string;
  reportVersion: number;
  employees: EmployeeItem[];
  timezone: string;
};

export function DashboardView({
  metrics,
  issues,
  work,
  onNewReview,
  onInspect,
  onOpenTask,
  onNavigate,
  onVerifyTask,
  onRejectTask,
  onApproveTask,
  busy,
}: {
  metrics: MetricItem[];
  activity?: unknown[];
  properties?: unknown[];
  replyStatus?: unknown;
  onSelectBranch?: (branchId: string) => void;
  issues: IssueItem[];
  work: WorkItem[];
  onNewReview: () => void;
  onInspect: (id: string) => void;
  onOpenTask: (id: string) => void;
  onNavigate: (destination: Destination, metricTitle?: string) => void;
  onVerifyTask: (id: string, reportVersion: number) => void;
  onRejectTask: (id: string, reportVersion: number) => void;
  onApproveTask: (task: WorkItem, assigneeId: string, dueAt: string) => void;
  busy: string;
}) {
  const headlineMetrics = ["Total reviews", "New today", "Issues needing attention", "Open approved tasks"]
    .map((title) => metrics.find((metric) => metric.title === title))
    .filter((metric): metric is MetricItem => !!metric);

  return (
    <section className="dashboard dashboard-focused">
      <PageHeading title="Dashboard" description="Urgent feedback and work awaiting your decision.">
        <button onClick={onNewReview}>Add a review</button>
      </PageHeading>

      <nav className="dashboard-overview" aria-label="Workspace overview">
        {headlineMetrics.map((metric) => {
          const visual = metric.visual as MetricGraphic | undefined;
          return (
            <button
              className="dashboard-overview-item"
              key={metric.title}
              onClick={() => onNavigate(metric.destination, metric.title)}
            >
              <span>{metric.title}</span>
              <strong>{metric.value.toLocaleString()}</strong>
              <small>{metric.hint}</small>
              {visual && <DashboardMetricGraphic visual={visual} title={metric.title} />}
            </button>
          );
        })}
      </nav>

      <div className="dashboard-grid">
        <section className="priority-panel" aria-labelledby="urgent-review-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Needs attention</p>
              <h3 id="urgent-review-heading">Priority issues</h3>
            </div>
            <button className="link" onClick={() => onNavigate("issues")}>
              All issues
            </button>
          </div>
          {issues.length ? (
            <div className="dashboard-issue-list">
              {issues.map((issue, index) => (
                <article className={`dashboard-issue-row ${index === 0 ? "featured" : ""}`} key={issue.id}>
                  <div className="dashboard-issue-meta">
                    <span className={`priority-chip priority-chip-${issue.priority.toLowerCase()}`}>
                      {issue.priority === "urgent" ? "Urgent" : issue.priority}
                    </span>
                    <span>{issue.branchName}</span>
                    {issue.status && <span>{issue.status}</span>}
                  </div>
                  <h4>{issue.title}</h4>
                  <p>{issue.support} distinct source {issue.support === 1 ? "review" : "reviews"}</p>
                  {index === 0 && issue.evidenceQuote && <blockquote>“{issue.evidenceQuote}”</blockquote>}
                  <button className="link" onClick={() => onInspect(issue.id)}>
                    Review evidence
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <h4>No urgent reviews</h4>
              <p>New urgent feedback will appear here for review.</p>
            </div>
          )}
        </section>

        <section className="work-panel" aria-labelledby="active-work-heading">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">Owner queue</p>
              <h3 id="active-work-heading">Ongoing work</h3>
            </div>
            <button className="link" onClick={() => onNavigate("tasks")}>
              All tasks
            </button>
          </div>
          {work.length ? (
            <div className="dashboard-task-list">
              {work.map((task) => (
                <DashboardTask
                  key={task.id}
                  task={task}
                  busy={busy}
                  onOpen={() => onOpenTask(task.id)}
                  onVerify={() => onVerifyTask(task.id, task.reportVersion)}
                  onReject={() => onRejectTask(task.id, task.reportVersion)}
                  onApprove={(assigneeId, dueAt) => onApproveTask(task, assigneeId, dueAt)}
                />
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <h4>No active work tasks</h4>
              <p>Approved assignments and tasks awaiting your decision will appear here.</p>
            </div>
          )}
        </section>
      </div>
    </section>
  );
}

function DashboardMetricGraphic({
  visual,
  title,
}: {
  visual: MetricGraphic;
  title: string;
}) {
  if (visual.type === "review_mix") {
    const maximum = Math.max(1, ...visual.segments.map((segment) => segment.value));
    return (
      <div
        className="dashboard-graphic review-mix-graphic"
        role="img"
        aria-label={`Review mix for ${title}. Categories can overlap. ${visual.segments
          .map((segment) => `${segment.label}: ${segment.value}`)
          .join(", ")}`}
      >
        {visual.segments.map((segment) => (
          <div className="review-mix-column" key={segment.label}>
            <span className="review-mix-value">{segment.value.toLocaleString()}</span>
            <span className="review-mix-bar">
              <i
                className={`mix-${segment.tone}`}
                style={{ height: segment.value ? `${Math.max(5, (segment.value / maximum) * 100)}%` : "0%" }}
              />
            </span>
            <small>{segment.label}</small>
          </div>
        ))}
      </div>
    );
  }

  if (visual.type === "daily_meter") {
    const maximum = Math.max(1, ...visual.days.map((day) => day.value));
    return (
      <div
        className="dashboard-graphic daily-meter-graphic"
        role="img"
        aria-label={`New reviews over the last seven days: ${visual.days
          .map((day) => `${day.label}: ${day.value}`)
          .join(", ")}`}
      >
        {visual.days.map((day) => (
          <div className={`daily-meter-day ${day.label === "Today" ? "today" : ""}`} key={day.label}>
            <span className="daily-meter-bar">
              <i style={{ height: `${Math.max(4, (day.value / maximum) * 100)}%` }} />
            </span>
            <small>{day.label === "Today" ? "Today" : day.label.slice(0, 1)}</small>
          </div>
        ))}
      </div>
    );
  }

  if (visual.type === "priority_meter") {
    const total = visual.segments.reduce((sum, segment) => sum + segment.value, 0);
    return (
      <div className="dashboard-graphic priority-meter-graphic">
        <div className="priority-meter-track" role="img" aria-label={`Issue priority distribution: ${visual.segments.map((segment) => `${segment.label} ${segment.value}`).join(", ")}`}>
          {visual.segments.map((segment) => (
            <i
              className={`priority-meter-segment tone-${segment.tone}`}
              key={segment.label}
              style={{ flexGrow: segment.value, flexBasis: 0, opacity: segment.value ? 1 : 0.25 }}
            />
          ))}
        </div>
        <div className="dashboard-graphic-legend">
          {visual.segments.map((segment) => (
            <span key={segment.label}>
              <i className={`legend-${segment.tone}`} />
              <b>{segment.value}</b> {segment.label}
            </span>
          ))}
          {!total && <span className="graphic-quiet-label">No issues in queue</span>}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-graphic task-flow-graphic" role="img" aria-label={`Task stages: ${visual.segments.map((segment) => `${segment.label} ${segment.value}`).join(", ")}`}>
      {visual.segments.map((segment, index) => (
        <div className={`task-flow-stage stage-${segment.tone}`} key={segment.label}>
          <span className="task-flow-node-wrap">
            {index > 0 && <i className="task-flow-connector" />}
            <i className="task-flow-node" />
          </span>
          <b>{segment.value}</b>
          <small>{segment.label}</small>
        </div>
      ))}
    </div>
  );
}

function DashboardTask({
  task,
  busy,
  onOpen,
  onVerify,
  onReject,
  onApprove,
}: {
  task: WorkItem;
  busy: string;
  onOpen: () => void;
  onVerify: () => void;
  onReject: () => void;
  onApprove: (assigneeId: string, dueAt: string) => void;
}) {
  const defaultDue = useMemo(() => {
    if (!task.dueAt) return "";
    const date = new Date(task.dueAt);
    return new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
      .toISOString()
      .slice(0, 16);
  }, [task.dueAt]);
  const [assigneeId, setAssigneeId] = useState(
    task.assigneeId || task.employees[0]?.id || "",
  );
  const [dueAt, setDueAt] = useState(defaultDue);
  const employee = task.employees.find((item) => item.id === assigneeId);
  const attendance = getSimulatedAttendance({
    employeeId: employee?.id || "",
    orbyteStaffId: employee?.orbyteStaffId,
    dueAt,
    timezone: task.timezone,
  });
  const needsApproval = ["proposed", "deferred"].includes(task.status);
  const needsVerification = task.status === "reported";
  const statusText: Record<string, string> = {
    proposed: "Saved",
    deferred: "Saved for later",
    approved_open: "Pending",
    in_progress: "Pending · In progress",
    reported: "Pending Verification",
    needs_rework: "Pending · Needs rework",
  };

  return (
    <article className="dashboard-task-row">
      <div className="dashboard-task-heading">
        <span className={`work-state ${needsVerification ? "reported" : ""}`}>
          {statusText[task.status] || "Active"}
        </span>
        <span className={`priority-badge priority-${task.priority}`}>{task.priority} priority</span>
        <span className="dashboard-task-due">{task.due}</span>
      </div>
      <h4>{task.title}</h4>
      {task.description && <p className="dashboard-task-description">{task.description}</p>}
      {task.relatedIssue && <p className="dashboard-task-related">Issue · {task.relatedIssue}</p>}
      {!needsApproval && <p className="dashboard-task-assignee">{task.assignee}</p>}

      {needsApproval ? (
        <div className="dashboard-assign-form">
          <div className="dashboard-assign-fields">
            <ChoiceMenu
              label="Assign to"
              value={assigneeId}
              options={task.employees.map((item) => ({
                value: item.id,
                label: item.name,
                description: item.jobTitle,
              }))}
              onChange={setAssigneeId}
              disabled={!task.employees.length || !!busy}
              className="dashboard-assignee-choice"
            />
            <label className="dashboard-due-field">
              Due date
              <input
                type="datetime-local"
                value={dueAt}
                onChange={(event) => setDueAt(event.target.value)}
                disabled={!!busy}
              />
            </label>
          </div>
          <div className={`dashboard-attendance attendance-${attendance.state}`} role="status">
            <span>{employee?.name || "No employee selected"} · {attendance.label}</span>
            <small>Simulated Orbyte Attendance{attendance.detail ? ` · ${attendance.detail}` : ""}</small>
          </div>
          {attendance.state !== "on_shift" && attendance.state !== "unknown" && (
            <p className="dashboard-availability-warning">This employee is not scheduled for the selected date.</p>
          )}
          <div className="dashboard-task-actions">
            <button
              disabled={!!busy || !assigneeId || !dueAt}
              onClick={() => onApprove(assigneeId, new Date(dueAt).toISOString())}
            >
              {busy === "decide_task" ? "Approving…" : "Approve & assign"}
            </button>
            <button className="secondary" onClick={onOpen}>Review task</button>
          </div>
        </div>
      ) : needsVerification ? (
        <div className="dashboard-task-actions">
          <button disabled={!!busy} onClick={onVerify}>
            {busy === "verify_task" ? "Verifying…" : "Verify work"}
          </button>
          <button className="secondary" disabled={!!busy} onClick={onReject}>
            Reject for rework
          </button>
          <button className="link" onClick={onOpen}>Review report</button>
        </div>
      ) : (
        <button className="link dashboard-task-open" onClick={onOpen}>
          Open task
        </button>
      )}
    </article>
  );
}
