type TaskEditEvent = {
  id: string;
  type: string;
  entityId: string;
  description: string;
  createdAt: string;
  metadata: unknown;
};

function snapshot(value: unknown) {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  return {
    title: typeof record.title === "string" ? record.title : "",
    description:
      typeof record.description === "string" ? record.description : "",
    priority: typeof record.priority === "string" ? record.priority : "",
    assigneeId:
      typeof record.assigneeId === "string" ? record.assigneeId : null,
    assigneeRole:
      typeof record.assigneeRole === "string" ? record.assigneeRole : "",
    dueAt: typeof record.dueAt === "string" ? record.dueAt : null,
  };
}

const formatted = (value: string) =>
  new Date(value).toLocaleString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
    timeStyle: "short",
  });

export function TaskEditHistory({
  events,
  employees,
}: {
  events: TaskEditEvent[];
  employees: { id: string; name: string }[];
}) {
  const edits = events
    .filter((event) => event.type === "task_edited")
    .sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  if (!edits.length) return null;

  const employeeName = (id: string | null, role: string) =>
    (id && employees.find((employee) => employee.id === id)?.name) ||
    role ||
    "Unassigned";

  return (
    <details className="task-edit-history">
      <summary>
        Task edit history <span>{edits.length}</span>
      </summary>
      <ol>
        {edits.map((event) => {
          const metadata =
            event.metadata && typeof event.metadata === "object"
              ? (event.metadata as Record<string, unknown>)
              : {};
          const before = snapshot(metadata.before);
          const after = snapshot(metadata.after);
          return (
            <li key={event.id}>
              <time dateTime={event.createdAt}>
                {formatted(event.createdAt)}
              </time>
              {before && after ? (
                <div className="task-edit-diff">
                  {before.title !== after.title && (
                    <p>
                      <strong>Title</strong>
                      <span>
                        Changed from “{before.title}” to “{after.title}”
                      </span>
                    </p>
                  )}
                  {before.description !== after.description && (
                    <p>
                      <strong>Task brief</strong>
                      <span>
                        Changed from “{before.description}” to “
                        {after.description}”
                      </span>
                    </p>
                  )}
                  {before.priority !== after.priority && (
                    <p>
                      <strong>Priority</strong>
                      <span>
                        Changed from {before.priority} to {after.priority}
                      </span>
                    </p>
                  )}
                  {(before.assigneeId !== after.assigneeId ||
                    before.assigneeRole !== after.assigneeRole) && (
                    <p>
                      <strong>Assigned to</strong>
                      <span>
                        Changed from{" "}
                        {employeeName(before.assigneeId, before.assigneeRole)}{" "}
                        to {employeeName(after.assigneeId, after.assigneeRole)}
                      </span>
                    </p>
                  )}
                  {before.dueAt !== after.dueAt && (
                    <p>
                      <strong>Due date</strong>
                      <span>
                        Changed from{" "}
                        {before.dueAt ? formatted(before.dueAt) : "Not set"} to{" "}
                        {after.dueAt ? formatted(after.dueAt) : "Not set"}
                      </span>
                    </p>
                  )}
                </div>
              ) : (
                <p>{event.description}</p>
              )}
            </li>
          );
        })}
      </ol>
    </details>
  );
}
