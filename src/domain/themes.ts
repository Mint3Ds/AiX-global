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
  T extends {
    id: string;
    branchId: string;
    type: string;
    title: string;
    activeTask?: string | null;
  },
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
  return (
    items
      .filter((item) => item.branchId === branchId && item.type === type)
      .map((item) => ({
        item,
        overlap: item.title
          .toLowerCase()
          .split(/\W+/)
          .filter((word) => words.has(word)).length,
      }))
      // Keep unrelated same-branch issues out of the model's candidate set.
      // Active work is prioritized only after there is a meaningful topic overlap.
      .filter((entry) => entry.overlap > 0)
      .sort(
        (a, b) =>
          b.overlap +
          (b.item.activeTask ? 2 : 0) -
          (a.overlap + (a.item.activeTask ? 2 : 0)),
      )
      .slice(0, 100)
      .map((entry) => entry.item)
  );
}

/**
 * Resolve only a unique exact title match. Ambiguous titles stay with the
 * semantic matcher so this fast path cannot silently choose between issues.
 */
export function exactThemeMatch<T extends { id: string; title: string }>(
  observation: { aspect: string; normalizedDescription: string },
  candidates: T[],
) {
  const normalize = (value: string) =>
    value.replaceAll("_", " ").trim().toLowerCase().replace(/\s+/g, " ");
  const labels = new Set(
    [observation.aspect, observation.normalizedDescription]
      .map(normalize)
      .filter(Boolean),
  );
  const matches = candidates.filter((candidate) =>
    labels.has(normalize(candidate.title)),
  );
  return matches.length === 1 ? matches[0].id : null;
}
