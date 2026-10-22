export function distinctReviewCount(
  observations: { id: string; reviewId: string }[],
  memberships: { themeId: string; observationId: string }[],
  themeId: string,
) {
  const relevant = new Set(
    memberships
      .filter((item) => item.themeId === themeId)
      .map((item) => item.observationId),
  );
  return new Set(
    observations
      .filter((item) => relevant.has(item.id))
      .map((item) => item.reviewId),
  ).size;
}
export function candidateThemes<
  T extends { id: string; branchId: string; type: string; title: string },
>(items: T[], branchId: string, kind: string, description: string) {
  const type =
    kind === "operational_complaint"
      ? "operational_issue"
      : kind === "suggestion"
        ? "suggestion"
        : "positive_pattern";
  const words = new Set(
    description
      .toLowerCase()
      .split(/\W+/)
      .filter((word) => word.length > 3),
  );
  return items
    .filter((item) => item.branchId === branchId && item.type === type)
    .map((item) => ({
      item,
      score: item.title
        .toLowerCase()
        .split(/\W+/)
        .filter((word) => words.has(word)).length,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map((entry) => entry.item);
}
