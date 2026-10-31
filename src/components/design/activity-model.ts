/** Group only events with a real task or reply-to-task relationship. */
export type ActivityEvent = {
  id: string;
  actor: string;
  type: string;
  entityType: string;
  entityId: string;
  description: string;
  createdAt: string;
  metadata?: unknown;
};

export type ActivityKind = "all" | "reviews" | "issues" | "tasks" | "replies";
export type ActivityTask = {
  id: string;
  title: string;
  status: string;
  themeId: string;
};
export type ActivityReply = { id: string; reviewId: string; taskId: string };
export type TaskThread = { task: ActivityTask; events: ActivityEvent[] };

export function activityKind(event: ActivityEvent): ActivityKind {
  if (event.entityType === "review") return "reviews";
  if (["theme", "observation"].includes(event.entityType)) return "issues";
  if (event.entityType === "task") return "tasks";
  return "replies";
}

export function groupActivity(
  events: ActivityEvent[],
  tasks: ActivityTask[],
  replies: ActivityReply[],
) {
  const taskById = new Map(tasks.map((task) => [task.id, task]));
  const replyTask = new Map(replies.map((reply) => [reply.id, reply.taskId]));
  const threads = new Map<string, TaskThread>();
  const other: ActivityEvent[] = [];

  for (const event of events) {
    const taskId =
      event.entityType === "task"
        ? event.entityId
        : event.entityType === "reply"
          ? replyTask.get(event.entityId)
          : undefined;
    const task = taskId ? taskById.get(taskId) : undefined;
    if (!task) {
      other.push(event);
      continue;
    }
    if (!threads.has(task.id)) threads.set(task.id, { task, events: [] });
    threads.get(task.id)!.events.push(event);
  }

  const newestFirst = (a: ActivityEvent, b: ActivityEvent) =>
    b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id);
  for (const thread of threads.values()) thread.events.sort(newestFirst);
  other.sort(newestFirst);
  return {
    threads: [...threads.values()].sort((a, b) =>
      newestFirst(a.events[0], b.events[0]),
    ),
    other,
  };
}
