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
    throw new Error(`Cannot move ${current} to ${next}.`);
}
export function canDraftReply(status: string, note: string | null) {
  if (status !== "resolved" || !note?.trim())
    throw new Error(
      "A truthful resolution note is required before drafting a reply.",
    );
}
