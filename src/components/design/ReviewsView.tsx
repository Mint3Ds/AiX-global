/** Clean, human-crafted typography-driven ReviewsView */
import React, { useMemo, useState } from "react";

export type Review = {
  id: string;
  businessId: string;
  branchId: string;
  source: string;
  sourceReviewId: string;
  rating: number;
  reviewedAt: string;
  originalText: string;
  processingStatus: string;
  processingStage: string | null;
  language: string;
};

export type Observation = {
  id: string;
  reviewId: string;
  branchId: string;
  category: string;
  aspect: string;
  kind: string;
  sentiment: string;
  summary: string;
  normalizedDescription: string;
  evidenceQuote: string;
  provider: string;
  mode: string;
};

export type Theme = {
  id: string;
  businessId: string;
  branchId: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  priorityReason: string;
  severity: number;
};

export type Membership = {
  themeId: string;
  observationId: string;
  source: string;
  confirmation: string;
};

export type Reply = {
  id: string;
  reviewId: string;
  taskId: string;
  text: string;
  status: string;
  partialWarning: string | null;
};

function formatSentenceCase(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function ReviewsView({
  reviews,
  observations,
  themes,
  memberships,
  replies,
  branches,
  categories,
  selectedReviewId,
  onSelectReview,
  onRetryAnalysis,
  onJumpToIssue,
  dateFormatter,
  busy,
}: {
  reviews: Review[];
  observations: Observation[];
  themes: Theme[];
  memberships: Membership[];
  replies: Reply[];
  branches: { id: string; name: string }[];
  categories: string[];
  selectedReviewId: string | null;
  onSelectReview: (id: string | null) => void;
  onRetryAnalysis: (reviewId: string) => void;
  onJumpToIssue: (themeId: string) => void;
  dateFormatter: (d: string | null) => string;
  busy?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [branchFilter, setBranchFilter] = useState("all");
  const [ratingFilter, setRatingFilter] = useState("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");

  const branchName = (id: string) =>
    branches.find((b) => b.id === id)?.name || id;

  const filteredReviews = useMemo(() => {
    return reviews.filter((review) => {
      const reviewObs = observations.filter((o) => o.reviewId === review.id);
      const query = search.toLowerCase().trim();

      if (branchFilter !== "all" && review.branchId !== branchFilter) return false;
      if (ratingFilter !== "all" && review.rating !== Number(ratingFilter)) return false;
      if (statusFilter !== "all" && review.processingStatus !== statusFilter) return false;
      if (categoryFilter !== "all" && !reviewObs.some((o) => o.category === categoryFilter)) return false;

      if (query) {
        const textMatch = review.originalText.toLowerCase().includes(query);
        const obsMatch = reviewObs.some(
          (o) =>
            o.summary.toLowerCase().includes(query) ||
            o.evidenceQuote.toLowerCase().includes(query) ||
            o.normalizedDescription.toLowerCase().includes(query),
        );
        if (!textMatch && !obsMatch) return false;
      }

      return true;
    });
  }, [reviews, observations, search, branchFilter, ratingFilter, categoryFilter, statusFilter]);

  return (
    <div className="w-full space-y-6 font-sans">
      {/* View Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            Source Reviews
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Searchable review database across all active simulated sources.
          </p>
        </div>
        <div className="text-xs font-medium text-neutral-500">
          Showing <span className="font-semibold text-neutral-900">{filteredReviews.length}</span> of {reviews.length} reviews
        </div>
      </div>

      {/* Top Filter Bar (Clean horizontal white card) */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Search Input */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
              Search Text
            </label>
            <input
              type="text"
              placeholder="Search original words or quotes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 placeholder-neutral-400 focus:border-neutral-400 focus:outline-none transition-all"
            />
          </div>

          {/* Property Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
              Property
            </label>
            <select
              value={branchFilter}
              onChange={(e) => setBranchFilter(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none transition-all cursor-pointer"
            >
              <option value="all">All Properties</option>
              {branches.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Rating Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
              Rating
            </label>
            <select
              value={ratingFilter}
              onChange={(e) => setRatingFilter(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none transition-all cursor-pointer"
            >
              <option value="all">All Ratings</option>
              {[1, 2, 3, 4, 5].map((r) => (
                <option key={r} value={r}>
                  {r} Star{r > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
              Category
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none transition-all cursor-pointer"
            >
              <option value="all">All Categories</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {formatSentenceCase(c)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-[11px] font-semibold text-neutral-500 mb-1.5 uppercase tracking-wider">
              Screening Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none transition-all cursor-pointer"
            >
              <option value="all">All Statuses</option>
              {["pending", "processing", "complete", "generic", "needs_review", "failed"].map((s) => (
                <option key={s} value={s}>
                  {formatSentenceCase(s)}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Review Cards List */}
      <div className="space-y-4">
        {filteredReviews.length > 0 ? (
          filteredReviews.map((review) => {
            const reviewObs = observations.filter((o) => o.reviewId === review.id);
            const reviewReply = replies.find((r) => r.reviewId === review.id);

            return (
              <div
                key={review.id}
                className="bg-white rounded-2xl border border-neutral-200/80 p-5 sm:p-6 shadow-xs space-y-4 hover:border-neutral-300 transition-all"
              >
                {/* Top Row: Source, Property, Rating, Status, Date */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    {/* Simulated Source Pill */}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-neutral-100 text-neutral-700 border border-neutral-200">
                      {review.source.replace(/\s*\[Simulated\]/i, "")} (Simulated)
                    </span>

                    {/* Property Pill */}
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-white text-neutral-600 border border-neutral-200 shadow-2xs">
                      {branchName(review.branchId)}
                    </span>

                    {/* Star Rating as Clean Text */}
                    <span className="inline-flex items-center px-2 py-0.5 rounded-md text-xs font-semibold text-neutral-800 bg-neutral-50 border border-neutral-200/70">
                      Rating: {review.rating} / 5
                    </span>

                    {/* Processing Status Pill */}
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold ${
                        review.processingStatus === "complete"
                          ? "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                          : review.processingStatus === "generic"
                            ? "bg-neutral-100 text-neutral-600 border border-neutral-200"
                            : review.processingStatus === "needs_review"
                              ? "bg-amber-50 text-amber-900 border border-amber-200"
                              : "bg-neutral-50 text-neutral-600 border border-neutral-200"
                      }`}
                    >
                      {formatSentenceCase(review.processingStatus)}
                    </span>

                    {/* Reply status if exists */}
                    {reviewReply && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-50 text-purple-800 border border-purple-200/70">
                        Reply: {formatSentenceCase(reviewReply.status)}
                      </span>
                    )}
                  </div>

                  {/* Publication Date */}
                  <span className="text-xs text-neutral-400 font-normal">
                    {dateFormatter(review.reviewedAt)}
                  </span>
                </div>

                {/* Body: Full Original Review Text */}
                <div className="text-sm sm:text-[15px] text-neutral-800 leading-relaxed font-normal">
                  {review.originalText}
                </div>

                {/* Extracted Observations or Generic Note */}
                {reviewObs.length > 0 ? (
                  <div className="border-t border-neutral-100 pt-3.5 space-y-3">
                    <div className="flex items-center justify-between text-xs text-neutral-500 font-medium">
                      <span>Extracted observations ({reviewObs.length})</span>
                      <span className="text-[11px] text-neutral-400">Screened by Jev Pipeline</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {reviewObs.map((obs) => {
                        const linkedMembership = memberships.find((m) => m.observationId === obs.id);
                        const linkedTheme = linkedMembership
                          ? themes.find((t) => t.id === linkedMembership.themeId)
                          : null;

                        return (
                          <div
                            key={obs.id}
                            className="rounded-xl border border-neutral-200/70 bg-neutral-50/50 p-4 space-y-2.5 flex flex-col justify-between"
                          >
                            <div className="space-y-2">
                              {/* Sentiment & Category Pills */}
                              <div className="flex items-center justify-between gap-2 flex-wrap">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span
                                    className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold ${
                                      obs.kind === "operational_complaint"
                                        ? "bg-amber-50 text-amber-900 border border-amber-200/80"
                                        : obs.kind === "suggestion"
                                          ? "bg-blue-50 text-blue-800 border border-blue-200/80"
                                          : "bg-emerald-50 text-emerald-800 border border-emerald-200/80"
                                    }`}
                                  >
                                    {formatSentenceCase(obs.kind)}
                                  </span>
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-white text-neutral-700 border border-neutral-200">
                                    {formatSentenceCase(obs.category)}
                                  </span>
                                </div>
                                <span className="text-[10px] text-neutral-400">
                                  {obs.provider === "jev_pipeline" ? "Jev screened" : "Verified fixture"}
                                </span>
                              </div>

                              {/* Exact Supporting Quote Callout Box */}
                              <blockquote className="rounded-xl bg-white border border-neutral-200/70 px-3.5 py-2.5 italic text-neutral-700 text-xs sm:text-[13px] leading-relaxed">
                                “{obs.evidenceQuote}”
                              </blockquote>

                              {/* Summary */}
                              <p className="text-xs text-neutral-600 leading-snug">
                                {obs.summary}
                              </p>
                            </div>

                            {/* Linked Issue Pill */}
                            {linkedTheme && (
                              <div className="pt-2 border-t border-neutral-200/60 flex items-center justify-between gap-2">
                                <span className="text-[11px] text-neutral-500 truncate">
                                  Issue: <b className="font-medium text-neutral-800">{linkedTheme.title}</b>
                                </span>
                                <button
                                  type="button"
                                  onClick={() => onJumpToIssue(linkedTheme.id)}
                                  className="link text-xs font-semibold text-[#0071e3] hover:underline shrink-0 cursor-pointer"
                                >
                                  View issue →
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : review.processingStatus === "generic" ? (
                  <div className="border-t border-neutral-100 pt-3">
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-neutral-100 text-neutral-500 border border-neutral-200/60">
                      Generic — No operational issue created
                    </span>
                  </div>
                ) : ["pending", "failed", "needs_review"].includes(review.processingStatus) ? (
                  <div className="border-t border-neutral-100 pt-3 flex items-center justify-between gap-3">
                    <span className="text-xs text-neutral-500">
                      Analysis requires verification or retry.
                    </span>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => onRetryAnalysis(review.id)}
                      className="secondary text-xs font-semibold px-4 py-1.5 rounded-full cursor-pointer hover:bg-neutral-50"
                    >
                      {busy ? "Working…" : "Retry analysis"}
                    </button>
                  </div>
                ) : null}
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-10 text-center text-sm text-neutral-500 shadow-xs">
            No source reviews match the selected filter criteria.
          </div>
        )}
      </div>
    </div>
  );
}
