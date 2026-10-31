import { useMemo, useState } from "react";
import { getSimulatedAttendance } from "@/integrations/orbyte/attendance";
import { CustomDropdown } from "./CustomDropdown";
import { PageHeading } from "./PageHeading";

type Destination = "reviews" | "issues" | "tasks" | "replies" | "activity";
type MetricVisual = {
  type: "ratings" | "distribution";
  segments: { label: string; value: number; tone: string }[];
};
type MetricItem = {
  title: string;
  value: number;
  hint: string;
  destination: Destination;
  visual?: MetricVisual;
};
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
  const primary = [metrics[0], metrics[3], metrics[4], metrics[5]].filter(
    (metric): metric is MetricItem => !!metric,
  );
  const attention = metrics[3]?.value || 0;

  return (
    <section className="dashboard">
      <PageHeading
        title="Your workspace"
        description="Guest feedback, the evidence behind it, and the work that follows."
      >
        <button onClick={onNewReview}>Add a review</button>
      </PageHeading>
      <div className="dashboard-context">
        <span>Across all properties</span>
      </div>
      <nav className="metrics" aria-label="Workspace totals">
        {primary.map((metric, index) => (
          <button
            className={`metric metric-${index}`}
            key={metric.title}
            onClick={() => onNavigate(metric.destination, metric.title)}
          >
            <span className="metric-top">{metric.title}</span>
            <strong>{metric.value.toLocaleString()}</strong>
            <span className="metric-hint">{metric.hint}</span>
            {metric.visual && (
              <span
                className={`metric-visual metric-visual-${metric.visual.type}`}
                role="img"
                aria-label={metric.visual.segments
                  .map((segment) => `${segment.label}: ${segment.value}`)
                  .join(", ")}
              >
                {metric.visual.type === "ratings" ? (
                  metric.visual.segments.map((segment) => {
                    const maximum = Math.max(
                      1,
                      ...metric.visual!.segments.map((item) => item.value),
                    );
                    return (
                      <span
                        className="metric-rating-bar"
                        key={segment.label}
                        title={`${segment.label}: ${segment.value}`}
                      >
                        <i
                          style={{
                            height: `${Math.max(8, (segment.value / maximum) * 100)}%`,
                          }}
                        />
                      </span>
                    );
                  })
                ) : (
                  <span className="metric-distribution-track">
                    {metric.visual.segments.map((segment) => (
                      <i
                        className={`metric-segment metric-segment-${segment.tone}`}
                        key={segment.label}
                        title={`${segment.label}: ${segment.value}`}
                        style={{
                          flexGrow: segment.value,
                          flexBasis: 0,
                          minWidth: segment.value ? 2 : 0,
                        }}
                      />
                    ))}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="dashboard-summary">
        <p>
          <span className="summary-dot" aria-hidden="true" />
          {attention ? (
            <>
              <strong>
                {attention} {attention === 1 ? "issue needs" : "issues need"}{" "}
                attention.
              </strong>{" "}
              Review the original evidence before deciding.
            </>
          ) : (
            <>
              <strong>Your issue queue is clear.</strong> New feedback will
              appear here.
            </>
          )}
        </p>
        <div>
          {[metrics[1], metrics[2]]
            .filter((metric): metric is MetricItem => !!metric)
            .map((metric) => (
              <button
                className="summary-metric"
                key={metric.title}
                onClick={() => onNavigate(metric.destination, metric.title)}
              >
                <strong>{metric.value}</strong> {metric.title}
              </button>
            ))}
        </div>
      </div>

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
            <label className="dashboard-due-field">
              Assign to
              <CustomDropdown
                ariaLabel="Assign to"
                sectionLabel="Assign Employee"
                value={assigneeId}
                options={task.employees.map((item) => ({
                  value: item.id,
                  label: `${item.name} · ${item.jobTitle}`,
                }))}
                onChange={setAssigneeId}
                disabled={!task.employees.length || !!busy}
                align="left"
                fullWidth
              />
            </label>
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
