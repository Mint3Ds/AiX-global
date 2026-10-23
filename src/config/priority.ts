export const priorityRules = {
  highReviewCount: 5,
  mediumReviewCount: 2,
  recentDays: 180,
};
export function priorityFor(
  type: string,
  distinctReviews: number,
  severity: number,
  recentReviews = distinctReviews,
  recurrence = false,
) {
  if (type !== "operational_issue")
    return {
      priority: "insight",
      reason: `${distinctReviews} distinct reviews; this is an insight for the owner, not a repair task.`,
    };
  const priority =
    severity >= 3
      ? "urgent"
      : recurrence ||
          (severity >= 2 &&
            distinctReviews >= priorityRules.highReviewCount &&
            recentReviews > 0) ||
          (distinctReviews >= 10 && recentReviews > 0)
        ? "high"
        : distinctReviews >= priorityRules.mediumReviewCount || severity >= 2
          ? "medium"
          : "low";
  const reason = `${distinctReviews} distinct source review${distinctReviews === 1 ? "" : "s"} mention this issue at this property; ${recentReviews} are within ${priorityRules.recentDays} days. Severity ${severity}/3${recurrence ? "; possible recurrence after a verified resolution" : ""}. This is a triage suggestion for owner review.`;
  return { priority, reason };
}
