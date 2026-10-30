/** Evidence is grouped by source review so quotes do not lose their context. */
type EvidenceReview = {
  id: string;
  source: string;
  rating: number;
  reviewedAt: string;
  quotes: string[];
};

type SourceReview = Omit<EvidenceReview, "quotes">;
type EvidencePoint = { id: string; reviewId: string; evidenceQuote: string };
type Membership = { themeId: string; observationId: string };

export function groupTaskEvidence(
  themeId: string,
  reviews: SourceReview[],
  observations: EvidencePoint[],
  memberships: Membership[],
): EvidenceReview[] {
  const memberIds = new Set(
    memberships
      .filter((membership) => membership.themeId === themeId)
      .map((membership) => membership.observationId),
  );
  const byReview = new Map<string, EvidenceReview>();
  for (const review of reviews)
    byReview.set(review.id, { ...review, quotes: [] });
  for (const point of observations) {
    if (!memberIds.has(point.id)) continue;
    const review = byReview.get(point.reviewId);
    if (review && !review.quotes.includes(point.evidenceQuote))
      review.quotes.push(point.evidenceQuote);
  }
  return [...byReview.values()]
    .filter((review) => review.quotes.length > 0)
    .sort((a, b) => b.reviewedAt.localeCompare(a.reviewedAt));
}

const reviewDate = (value: string) =>
  new Date(value).toLocaleDateString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

export function TaskEvidencePanel({
  taskId,
  themeId,
  themeTitle,
  reviews,
  observations,
  memberships,
  onOpenTheme,
  onOpenReview,
}: {
  taskId: string;
  themeId: string;
  themeTitle: string;
  reviews: SourceReview[];
  observations: EvidencePoint[];
  memberships: Membership[];
  onOpenTheme: (id: string) => void;
  onOpenReview: (id: string) => void;
}) {
  const evidence = groupTaskEvidence(
    themeId,
    reviews,
    observations,
    memberships,
  );
  const excerptCount = evidence.reduce(
    (count, review) => count + review.quotes.length,
    0,
  );
  const previewCount = 2;
  const reviewItem = (review: EvidenceReview, index: number) => (
    <li className="task-source-review" key={review.id}>
      <div className="task-source-heading">
        <span>Review {String(index + 1).padStart(2, "0")}</span>
        <span>
          {review.rating}/5 · {review.source} · {reviewDate(review.reviewedAt)}
        </span>
      </div>
      <div className="task-source-quotes">
        {review.quotes.map((quote) => (
          <blockquote key={quote}>“{quote}”</blockquote>
        ))}
      </div>
      <button
        type="button"
        className="link"
        onClick={() => onOpenReview(review.id)}
      >
        Open source review <span aria-hidden="true">↗</span>
      </button>
    </li>
  );

  return (
    <section
      className="task-evidence"
      aria-labelledby={`task-evidence-${taskId}`}
    >
      <header className="task-evidence-heading">
        <div>
          <p className="eyebrow">02 / Source evidence</p>
          <h3 id={`task-evidence-${taskId}`}>What guests reported</h3>
          <p>
            {evidence.length} source reviews · {excerptCount} exact excerpts
          </p>
        </div>
        <button
          type="button"
          className="link"
          onClick={() => onOpenTheme(themeId)}
        >
          View issue <span aria-hidden="true">↗</span>
        </button>
      </header>
      <p className="task-evidence-topic">Related issue · {themeTitle}</p>
      {evidence.length ? (
        <>
          <ol className="task-source-list">
            {evidence.slice(0, previewCount).map(reviewItem)}
          </ol>
          {evidence.length > previewCount && (
            <details className="task-evidence-more">
              <summary>
                Show {evidence.length - previewCount} more source reviews
              </summary>
              <ol className="task-source-list" start={previewCount + 1}>
                {evidence
                  .slice(previewCount)
                  .map((review, index) =>
                    reviewItem(review, index + previewCount),
                  )}
              </ol>
            </details>
          )}
        </>
      ) : (
        <p className="task-evidence-empty">No linked evidence is available.</p>
      )}
    </section>
  );
}
