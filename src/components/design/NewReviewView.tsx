/** Clean, human-crafted typography-driven NewReviewView */
import React, { useState } from "react";

export type PreparedReview = {
  id: string;
  businessId: string;
  branchId: string;
  source: string;
  sourceReviewId: string;
  rating: number;
  text: string;
};

export function NewReviewView({
  branches,
  preparedReviews,
  onSubmitReview,
  busy,
}: {
  branches: { id: string; name: string }[];
  preparedReviews: PreparedReview[];
  onSubmitReview: (data: {
    branchId: string;
    source: string;
    rating: number;
    text: string;
    preparedId?: string;
  }) => Promise<void>;
  busy?: boolean;
}) {
  const [selectedBranch, setSelectedBranch] = useState(branches[0]?.id || "");
  const [selectedSource, setSelectedSource] = useState("Map Reviews (Simulated)");
  const [selectedRating, setSelectedRating] = useState(2);
  const [reviewText, setReviewText] = useState("");
  const [preparedReviewId, setPreparedReviewId] = useState<string | null>(null);
  const [showExamples, setShowExamples] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewText.trim()) return;
    await onSubmitReview({
      branchId: selectedBranch,
      source: selectedSource,
      rating: selectedRating,
      text: reviewText,
      preparedId: preparedReviewId || undefined,
    });
  };

  const handleSelectPrepared = (p: PreparedReview) => {
    setSelectedBranch(p.branchId);
    setSelectedSource(`${p.source} (Simulated)`);
    setSelectedRating(p.rating);
    setReviewText(p.text);
    setPreparedReviewId(p.id);
  };

  return (
    <div className="w-full space-y-6 font-sans">
      {/* View Header */}
      <div>
        <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
          New Review Intake
        </h2>
        <p className="text-xs text-neutral-500 mt-1">
          Ingest guest feedback into the simulated AI extraction and screening pipeline.
        </p>
      </div>

      {/* Two-Column Editorial Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (7 of 12 cols): Submit or Inject Synthetic Review */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs space-y-5">
          <div className="flex items-center justify-between pb-3 border-b border-neutral-100">
            <div>
              <h3 className="text-base font-semibold text-neutral-900">
                Submit or Inject Review
              </h3>
              <p className="text-xs text-neutral-500 mt-0.5">
                Inputs are safely simulated and isolated to this workspace.
              </p>
            </div>
            {preparedReviews.length > 0 && (
              <button
                type="button"
                onClick={() => setShowExamples((s) => !s)}
                className="link text-xs font-semibold text-[#0071e3] hover:underline cursor-pointer"
              >
                {showExamples ? "Hide demo examples" : "Choose demo example →"}
              </button>
            )}
          </div>

          {/* Demo Reviews Picker (if expanded) */}
          {showExamples && preparedReviews.length > 0 && (
            <div className="rounded-xl border border-neutral-200/70 bg-neutral-50/70 p-3.5 space-y-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500 block">
                Prepared Benchmark Reviews:
              </span>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {preparedReviews.map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleSelectPrepared(item)}
                    className={`w-full text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                      preparedReviewId === item.id
                        ? "bg-white border-neutral-900 font-medium text-neutral-900 shadow-2xs"
                        : "bg-white/80 border-neutral-200/80 text-neutral-700 hover:bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between text-[11px] text-neutral-500 mb-1">
                      <span>Rating: {item.rating} / 5 · {item.source}</span>
                      <span>Branch: {item.branchId}</span>
                    </div>
                    <p className="line-clamp-2 leading-relaxed text-neutral-800">
                      {item.text}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Property & Source Row */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                  Property or Branch
                </label>
                <select
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none cursor-pointer"
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                  Simulated Review Source
                </label>
                <select
                  value={selectedSource}
                  onChange={(e) => setSelectedSource(e.target.value)}
                  className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none cursor-pointer"
                >
                  <option value="Map Reviews (Simulated)">Google Map Reviews (Simulated)</option>
                  <option value="Stay Portal (Simulated)">Booking.com / Stay Portal (Simulated)</option>
                  <option value="Tripadvisor (Simulated)">Tripadvisor (Simulated)</option>
                  <option value="Guest Form (Simulated)">Internal Guest Form (Simulated)</option>
                </select>
              </div>
            </div>

            {/* Rating Selector */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                Guest Star Rating
              </label>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setSelectedRating(star)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
                      selectedRating === star
                        ? "bg-[#1d1d1f] text-white border-[#1d1d1f] shadow-xs"
                        : "bg-white text-neutral-700 border-neutral-200 hover:bg-neutral-50"
                    }`}
                  >
                    {star} {star === 1 ? "Star" : "Stars"}
                  </button>
                ))}
              </div>
            </div>

            {/* Original Review Text */}
            <div>
              <label className="block text-xs font-semibold text-neutral-600 mb-1.5">
                Original Review Text
              </label>
              <textarea
                rows={5}
                required
                value={reviewText}
                onChange={(e) => {
                  setReviewText(e.target.value);
                  setPreparedReviewId(null);
                }}
                placeholder="Type or paste synthetic guest feedback to test Jev screening and OpenAI extraction…"
                className="w-full rounded-xl border border-neutral-200 bg-white p-3.5 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none leading-relaxed"
              />
            </div>

            {/* Actions Bar */}
            <div className="pt-2 flex items-center justify-between gap-3 flex-wrap">
              {preparedReviews.length > 0 && !showExamples ? (
                <button
                  type="button"
                  onClick={() => {
                    handleSelectPrepared(preparedReviews[0]);
                  }}
                  className="secondary text-xs font-medium px-4 py-2 rounded-full cursor-pointer hover:bg-neutral-50"
                >
                  Load prepared demo review
                </button>
              ) : (
                <div />
              )}

              <button
                type="submit"
                disabled={busy}
                className="bg-[#1d1d1f] hover:bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
              >
                {busy ? "Running pipeline…" : "Run intake pipeline"}
              </button>
            </div>
          </form>
        </div>

        {/* Right Column (5 of 12 cols): Pipeline Execution & Extraction */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs space-y-5">
          <div>
            <h3 className="text-base font-semibold text-neutral-900">
              Pipeline Execution & Extraction
            </h3>
            <p className="text-xs text-neutral-500 mt-0.5">
              Live automated steps executed upon review submission.
            </p>
          </div>

          {/* Typographic Steps Tracker */}
          <div className="space-y-4">
            {/* Step 1 */}
            <div className="rounded-xl border border-neutral-200/70 p-4 space-y-1.5 bg-neutral-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-900">
                  1. Saved to Database
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                  Ready
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                Review is recorded in PostgreSQL with synthetic provenance markers and raw text preservation.
              </p>
            </div>

            {/* Step 2 */}
            <div className="rounded-xl border border-neutral-200/70 p-4 space-y-1.5 bg-neutral-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-900">
                  2. Jev Screening Decision
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-800 border border-purple-200">
                  Active
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                Jev classification screens for operational complaints vs generic feedback before costly token processing.
              </p>
            </div>

            {/* Step 3 */}
            <div className="rounded-xl border border-neutral-200/70 p-4 space-y-1.5 bg-neutral-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-900">
                  3. Exact-Quote Extraction
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200">
                  OpenAI
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                OpenAI extracts discrete operational complaints, strictly verifying exact character substring match against the review.
              </p>
            </div>

            {/* Step 4 */}
            <div className="rounded-xl border border-neutral-200/70 p-4 space-y-1.5 bg-neutral-50/40">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-900">
                  4. Deterministic Issue Matching
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-900 border border-amber-200">
                  Clustering
                </span>
              </div>
              <p className="text-xs text-neutral-600 leading-relaxed font-normal">
                Observations cluster into existing operational issues or propose a new triage candidate based on semantic embedding match.
              </p>
            </div>
          </div>

          {/* Muted Pipeline Caption */}
          <div className="pt-2 border-t border-neutral-100 text-[11px] text-neutral-400 font-normal">
            Safe sandbox execution · OpenAI structured outputs with exact substring quotation validation.
          </div>
        </div>
      </div>
    </div>
  );
}
