/** Rules shared by individual and batch reply approval. */
export function partialReplyWarning(unresolved: string[]) {
  return unresolved.length
    ? `Other complaint${unresolved.length === 1 ? "" : "s"} in this review remain unresolved: ${unresolved.join("; ")}`
    : null;
}
export function assertReplyApproval(
  text: string,
  unresolved: string[],
  partialApproved: boolean,
) {
  if (unresolved.length && !partialApproved)
    throw new Error(
      "This review has unresolved complaints. Explicitly approve a truthful partial reply after reading the full source review.",
    );
  if (
    unresolved.length &&
    /all (issues|concerns)|everything (is|has been) (fixed|resolved)|fully resolved|all (fixed|resolved)/i.test(
      text,
    )
  )
    throw new Error(
      "Reply implies all concerns are resolved, but another complaint remains open.",
    );
}
export function canBatchApproveReply(
  status: string,
  warning: string | null,
  severity: number,
) {
  return status === "draft" && !warning && severity < 3;
}
export function isPossibleRecurrence(
  reviewCreatedAt: Date,
  resolvedAt: Date | null,
) {
  return Boolean(resolvedAt && reviewCreatedAt > resolvedAt);
}
