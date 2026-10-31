import { PageHeading } from "./PageHeading";
import { CustomDropdown } from "./CustomDropdown";

type StaffTask = {
  id: string;
  title: string;
  description: string;
  priority: string;
  relatedIssue: string;
  sourceReviewCount: number;
  status: string;
  dueAt: string | null;
  rejectionReason: string | null;
  reworkInstructions: string | null;
  rejections: number;
};

export function StaffDashboardView({
  employeeId,
  employees,
  tasks,
  onEmployeeChange,
  onOpenTask,
  onOpenTasks,
}: {
  employeeId: string;
  employees: { id: string; name: string; jobTitle: string }[];
  tasks: StaffTask[];
  onEmployeeChange: (id: string) => void;
  onOpenTask: (id: string) => void;
  onOpenTasks: () => void;
}) {
  const inProgress = tasks.filter((task) =>
    ["approved_open", "in_progress"].includes(task.status),
  );
  const awaitingReview = tasks.filter((task) => task.status === "reported");
  const rework = tasks.filter((task) => task.status === "needs_rework");
  const completed = tasks.filter((task) => task.status === "resolved");
  const statusLabel = (status: string) =>
    status === "needs_rework"
      ? "Assigned · Needs rework"
      : status === "reported"
        ? "Pending Owner Approval"
        : status === "approved_open"
          ? "Assigned"
          : status === "resolved"
            ? "Completed · Verified by Owner"
            : "In progress";
  const dueLabel = (value: string | null) =>
    value
      ? new Date(value).toLocaleDateString("en-MY", {
          timeZone: "Asia/Kuala_Lumpur",
          day: "numeric",
          month: "short",
        })
      : "No due date";

  return (
    <section className="staff-dashboard">
      <PageHeading
        index="01"
        eyebrow="Your work"
        title="Know what needs doing."
        description="See your assignments, owner feedback, and submitted reports in one place."
      >
        <div className="staff-dashboard-profile">
          <span>Working as</span>
          <CustomDropdown
            ariaLabel="Working as"
            sectionLabel="Staff Profile"
            value={employeeId}
            options={employees.map((employee) => ({
              value: employee.id,
              label: `${employee.name} · ${employee.jobTitle}`,
            }))}
            onChange={onEmployeeChange}
            align="right"
          />
        </div>
      </PageHeading>

      <div className="staff-dashboard-summary" aria-label="Task summary">
        <div>
          <strong>{inProgress.length}</strong>
          <span>Assigned or in progress</span>
        </div>
        <div>
          <strong>{rework.length}</strong>
          <span>Returned for rework</span>
        </div>
        <div>
          <strong>{awaitingReview.length}</strong>
          <span>Awaiting owner review</span>
        </div>
      </div>

      <section className="staff-dashboard-queue" aria-labelledby="staff-queue-title">
        <header className="panel-heading">
          <div>
            <p className="eyebrow">02&nbsp;&nbsp;Assigned to you</p>
            <h2 id="staff-queue-title">Work queue</h2>
          </div>
          <button className="link" type="button" onClick={onOpenTasks}>
            Open tasks
          </button>
        </header>
        {tasks.length ? (
          <ul>
            {tasks.map((task) => (
              <li
                key={task.id}
                className={task.status === "needs_rework" ? "needs-rework" : ""}
              >
                <button type="button" onClick={() => onOpenTask(task.id)}>
                  <span className="staff-queue-main">
                    <strong>{task.title}</strong>
                    <span className="staff-queue-description">{task.description}</span>
                    <span className="staff-queue-context">
                      {task.relatedIssue} · {task.sourceReviewCount} source {task.sourceReviewCount === 1 ? "review" : "reviews"}
                    </span>
                    {task.status === "needs_rework" && task.rejectionReason && (
                      <span className="staff-queue-reason">
                        <strong>Owner feedback</strong> {task.rejectionReason}
                      </span>
                    )}
                    {task.status === "needs_rework" && task.reworkInstructions && (
                      <span className="staff-queue-reason">
                        <strong>What to fix</strong> {task.reworkInstructions}
                      </span>
                    )}
                  </span>
                  <span className="staff-queue-meta">
                    <span
                      className={
                        "task-detail-state task-detail-state-" + task.status
                      }
                    >
                      {statusLabel(task.status)}
                      {task.rejections > 0
                        ? " · " + task.rejections + " returns"
                        : ""}
                    </span>
                    <span className={`priority-chip priority-chip-${task.priority}`}>
                      {task.priority}
                    </span>
                    <small>{dueLabel(task.dueAt)}</small>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="staff-dashboard-empty">
            No active tasks assigned to this staff profile.
          </p>
        )}
      </section>
      {completed.length > 0 && (
        <section className="staff-dashboard-queue staff-dashboard-completed" aria-labelledby="staff-completed-title">
          <header className="panel-heading">
            <div>
              <p className="eyebrow">03&nbsp;&nbsp;Verified work</p>
              <h2 id="staff-completed-title">Completed</h2>
            </div>
          </header>
          <ul>
            {completed.map((task) => (
              <li key={task.id}>
                <button type="button" onClick={() => onOpenTask(task.id)}>
                  <span className="staff-queue-main">
                    <strong>{task.title}</strong>
                    <span className="staff-queue-context">{statusLabel(task.status)}</span>
                  </span>
                  <small>{dueLabel(task.dueAt)}</small>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </section>
  );
}
