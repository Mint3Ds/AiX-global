export function requireOwner(role: string) {
  if (role !== "owner")
    throw new Error(
      "Owner approval required. The role switcher is only a demo simulation.",
    );
}
export function requireTransition(
  current: string,
  allowed: string[],
  next: string,
) {
  if (!allowed.includes(current))
    throw new WorkflowError(`Cannot move ${current} to ${next}.`);
}
export function canDraftReply(status: string, note: string | null) {
  if (status !== "resolved" || !note?.trim())
    throw new Error(
      "A truthful resolution note is required before drafting a reply.",
    );
}
export class WorkflowError extends Error {
  readonly code = "INVALID_WORKFLOW_STATE";
}

export function decisionReason(value: string) {
  const reason = value.trim();
  if (reason.length < 10 || reason.length > 500)
    throw new WorkflowError(
      "Give a reason of 10–500 characters so the next person knows what to change.",
    );
  return reason;
}
