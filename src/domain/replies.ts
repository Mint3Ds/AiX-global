/** Rules shared by individual and batch reply approval. */
export function partialReplyWarning(unresolved: string[]) {
  return unresolved.length
    ? `Other complaint${unresolved.length === 1 ? "" : "s"} in this review ${unresolved.length === 1 ? "remains" : "remain"} unresolved: ${unresolved.join("; ")}`
    : null;
}

function impliesAllConcernsResolved(text: string) {
  const universalClaims = [
    /\b(?:all|every|each)\s+(?:(?:of\s+)?(?:the|your|these)\s+)?(?:issues?|concerns?|complaints?|problems?)\s+(?:(?:have|has|had|were|was|are|is|been|now)\s+){0,4}(?:fully\s+|completely\s+)?(?:fixed|resolved|addressed|handled|rectified)\b/i,
    /\b(?:everything|it all)\s+(?:(?:is|has been|was|now)\s+){0,3}(?:fixed|resolved|addressed|handled)\b/i,
    /\b(?:fully|completely|entirely)\s+(?:fixed|resolved|addressed|handled)\b/i,
    /\ball\s+(?:fixed|resolved|addressed|handled)\b/i,
    /\b(?:nothing|no\s+(?:issues?|concerns?|complaints?|problems?))\s+(?:(?:is|are|was)\s+)?(?:left|outstanding|remaining)\b/i,
  ];
  return text.split(/[.!?;\n]+/).some((sentence) =>
    universalClaims.some((pattern) => {
      const match = pattern.exec(sentence);
      if (!match) return false;
      const lead = sentence.slice(Math.max(0, match.index - 12), match.index);
      return (
        !/\b(?:not|never)\s*$|n't\s*$/i.test(lead) &&
        !/\b(?:not|never|still|yet)\b|n't\b/i.test(match[0])
      );
    }),
  );
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
  if (unresolved.length && impliesAllConcernsResolved(text))
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
