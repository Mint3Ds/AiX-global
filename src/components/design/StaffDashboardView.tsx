import { ChoiceMenu } from "./ChoiceMenu";
import { PageHeading } from "./PageHeading";

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

const dueLabel = (value: string | null) =>
  value
    ? "Due " +
      new Date(value).toLocaleDateString("en-MY", {
        timeZone: "Asia/Kuala_Lumpur",
        day: "numeric",
        month: "short",
      })
    : "No due date";

const workState = (status: string) =>
  status === "needs_rework"
    ? "Needs rework"
    : status === "approved_open"
      ? "Assigned"
      : "In progress";

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
  // Keep each task in one place. A submitted report is waiting, not work to redo.
  const rework = tasks.filter((task) => task.status === "needs_rework");
  const assigned = tasks.filter((task) =>
    ["approved_open", "in_progress"].includes(task.status),
  );
  const toDo = [...rework, ...assigned];
  const waiting = tasks.filter((task) => task.status === "reported");
  const completed = tasks.filter((task) => task.status === "resolved");
  const focusTask = toDo[0];
  const otherTasks = toDo.slice(1);

  return (
    <section className="staff-dashboard">
      <PageHeading
        eyebrow="Your work"
        title="Your work"
        description="A clear place for the next job, your submitted reports, and finished work."
      >
        <ChoiceMenu
          className="staff-dashboard-profile"
          label="Working as"
          value={employeeId}
          options={employees.map((employee) => ({
            value: employee.id,
            label: employee.name,
            description: employee.jobTitle,
          }))}
          onChange={onEmployeeChange}
        />
      </PageHeading>

      <div className="staff-dashboard-columns">
        <section
          className="staff-dashboard-focus"
          aria-labelledby="staff-focus-title"
        >
          <header className="staff-focus-heading">
            <div>
              <p className="eyebrow">In hand</p>
              <h2 id="staff-focus-title">Next assignment</h2>
            </div>
            <span>{toDo.length} to work on</span>
          </header>
          {focusTask ? (
            <button
              className={
                focusTask.status === "needs_rework"
                  ? "staff-focus-task needs-rework"
                  : "staff-focus-task"
              }
              type="button"
              onClick={() => onOpenTask(focusTask.id)}
            >
              <span className="staff-focus-topline">
                <span>
                  {workState(focusTask.status)} · {focusTask.priority} priority
                </span>
                <span>{dueLabel(focusTask.dueAt)}</span>
              </span>
              <strong className="staff-focus-title">{focusTask.title}</strong>
              <span className="staff-focus-description">
                {focusTask.description}
              </span>
              {focusTask.status === "needs_rework" &&
                (focusTask.rejectionReason || focusTask.reworkInstructions) && (
                  <span className="staff-focus-feedback">
                    <strong>Owner feedback</strong>
                    {focusTask.rejectionReason && (
                      <span>{focusTask.rejectionReason}</span>
                    )}
                    {focusTask.reworkInstructions && (
                      <span>
                        <strong>What to fix</strong>{" "}
                        {focusTask.reworkInstructions}
                      </span>
                    )}
                  </span>
                )}
              <span className="staff-focus-bottomline">
                <span>
                  {focusTask.relatedIssue} · {focusTask.sourceReviewCount}{" "}
                  source{" "}
                  {focusTask.sourceReviewCount === 1 ? "review" : "reviews"}
                </span>
                <span>Open task</span>
              </span>
            </button>
          ) : (
            <div className="staff-focus-empty">
              <strong>All caught up.</strong>
              <p>There is no assigned work needing action right now.</p>
            </div>
          )}

          {otherTasks.length > 0 && (
            <div className="staff-dashboard-queue staff-other-tasks">
              <h3>Also in your queue</h3>
              <ul>
                {otherTasks.map((task) => (
                  <li
                    key={task.id}
                    className={
                      task.status === "needs_rework" ? "needs-rework" : ""
                    }
                  >
                    <button type="button" onClick={() => onOpenTask(task.id)}>
                      <span className="staff-queue-main">
                        <span className="staff-queue-state">
                          {workState(task.status)} · {task.priority} priority
                        </span>
                        <strong className="staff-queue-title">
                          {task.title}
                        </strong>
                        <span className="staff-queue-description">
                          {task.description}
                        </span>
                        {task.status === "needs_rework" &&
                          (task.rejectionReason || task.reworkInstructions) && (
                            <span className="staff-queue-feedback">
                              <strong>Owner feedback</strong>
                              {task.rejectionReason && (
                                <span>{task.rejectionReason}</span>
                              )}
                              {task.reworkInstructions && (
                                <span>
                                  <strong>What to fix</strong>{" "}
                                  {task.reworkInstructions}
                                </span>
                              )}
                            </span>
                          )}
                      </span>
                      <span className="staff-queue-meta">
                        <small>{dueLabel(task.dueAt)}</small>
                        <span className="staff-queue-open">Open task</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <aside className="staff-dashboard-rail" aria-label="Work status">
          <div className="staff-dashboard-summary" aria-label="Task summary">
            <div>
              <span>Assigned to you</span>
              <strong>{toDo.length}</strong>
            </div>
            <div className={rework.length ? "has-rework" : ""}>
              <span>Returned for rework</span>
              <strong>{rework.length}</strong>
            </div>
            <div>
              <span>With the owner</span>
              <strong>{waiting.length}</strong>
            </div>
          </div>
          <section
            className="staff-dashboard-waiting"
            aria-labelledby="staff-waiting-title"
          >
            <h2 id="staff-waiting-title">Awaiting a decision</h2>
            {waiting.length ? (
              <ul>
                {waiting.map((task) => (
                  <li key={task.id}>
                    <button type="button" onClick={() => onOpenTask(task.id)}>
                      <strong>{task.title}</strong>
                      <span>Report submitted · View report</span>
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No reports with the owner.</p>
            )}
          </section>
          <button
            className="staff-all-tasks"
            type="button"
            onClick={onOpenTasks}
          >
            View all tasks
          </button>
        </aside>
      </div>

      {completed.length > 0 && (
        <section
          className="staff-dashboard-completed"
          aria-label="Completed work"
        >
          <details>
            <summary>
              <span>Completed work</span>
              <small>
                {completed.length} verified by the owner
                <span className="staff-completed-closed">Show history</span>
                <span className="staff-completed-open">Hide history</span>
              </small>
            </summary>
            <ul>
              {completed.map((task) => (
                <li key={task.id}>
                  <button type="button" onClick={() => onOpenTask(task.id)}>
                    <span>{task.title}</span>
                    <small>{dueLabel(task.dueAt)}</small>
                  </button>
                </li>
              ))}
            </ul>
          </details>
        </section>
      )}
    </section>
  );
}
