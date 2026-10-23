export const priorityRules = {
  highReviewCount: 5,
  mediumReviewCount: 2,
  recentDays: 180,
};
export function priorityFor(
  type: string,
  distinctReviews: number,
  severity: number,
) {
  if (type !== "operational_issue")
    return {
      priority: "insight",
      reason: `${distinctReviews} distinct reviews; this is an insight for the owner, not a repair task.`,
    };
  const priority =
    (severity >= 3 && distinctReviews >= 2) ||
    distinctReviews >= priorityRules.highReviewCount
      ? "high"
      : distinctReviews >= priorityRules.mediumReviewCount
        ? "medium"
        : "low";
  const reason = `${distinctReviews} distinct review${distinctReviews === 1 ? "" : "s"} mention this issue at this branch${severity >= 3 ? "; seating or safety may warrant prompt inspection" : ""}. This is a suggestion for owner review.`;
  return { priority, reason };
}
