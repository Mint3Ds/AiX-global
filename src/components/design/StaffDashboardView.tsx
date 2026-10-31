import { PageHeading } from "./PageHeading";

type StaffTask = {
  id: string;
  title: string;
  status: string;
  dueAt: string | null;
  rejectionReason: string | null;
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
  const statusLabel = (status: string) =>
    status === "needs_rework"
      ? "Returned for rework"
      : status === "reported"
        ? "Awaiting owner review"
        : status === "approved_open"
          ? "Assigned"
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
        <label className="staff-dashboard-profile">
          Working as
          <select
            value={employeeId}
            onChange={(event) => onEmployeeChange(event.target.value)}
          >
            {employees.map((employee) => (
              <option key={employee.id} value={employee.id}>
                {employee.name} · {employee.jobTitle}
              </option>
            ))}
          </select>
        </label>
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

      <section
        className="staff-dashboard-queue"
        aria-labelledby="staff-queue-title"
      >
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
                    {task.status === "needs_rework" && task.rejectionReason && (
                      <span className="staff-queue-reason">
                        Owner feedback: {task.rejectionReason}
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
    </section>
  );
}
