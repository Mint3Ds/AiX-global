/** Compact five-star rating used consistently in reviews and task evidence. */
export function RatingStars({
  rating,
  className = "",
}: {
  rating: number;
  className?: string;
}) {
  const value = Math.max(0, Math.min(5, Math.round(rating)));
  return (
    <span
      className={`rating-stars ${className}`.trim()}
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      <span className="rating-stars-filled">{"★".repeat(value)}</span>
      <span className="rating-stars-empty">{"☆".repeat(5 - value)}</span>
    </span>
  );
}
