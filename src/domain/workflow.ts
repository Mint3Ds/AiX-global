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

/** Suggestions become optional trials only after the owner confirms them. */
export function taskProposalForTheme(theme: {
  type: string;
  status: string;
  title: string;
  priority: string;
}) {
  const title = theme.title.trim();
  if (theme.type === "suggestion") {
    if (theme.status !== "owner_confirmed")
      throw new WorkflowError(
        "Confirm this suggestion before creating a work task.",
      );
    return {
      title: `Try: ${title}`,
      description: `Try this guest suggestion where practical: ${title}. Record what was tried, what happened, and whether it should continue.`,
      priority: "low",
    };
  }
  if (theme.type === "operational_issue" && theme.status !== "dismissed")
    return {
      title: `Inspect ${title.toLowerCase()}`,
      description: `Inspect the evidence for ${title.toLowerCase()} and record what was actually done.`,
      priority: theme.priority,
    };
  throw new WorkflowError(
    "Only an active issue or confirmed suggestion can have a work task.",
  );
}

export function decisionReason(value: string) {
  const reason = value.trim();
  if (reason.length < 10 || reason.length > 500)
    throw new WorkflowError(
      "Give a reason of 10–500 characters so the next person knows what to change.",
    );
  return reason;
}
