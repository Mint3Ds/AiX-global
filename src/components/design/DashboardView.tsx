/** Dashboard presentation with Apple aesthetic cards, top text labels, prominent metric numbers, and sleek monotone styling. Counts and issue evidence are passed in from Workspace.tsx. */
import React from "react";

export type MetricItem = { title: string; value: number };
export type Spotlight = {
  id: string;
  title: string;
  priority: string;
  branchId: string;
  support: number;
  evidenceQuote?: string;
};

export function DashboardView({
  businessName,
  metrics,
  spotlight,
  onNewReview,
  onInspect,
}: {
  businessName: string;
  metrics: MetricItem[];
  spotlight: Spotlight | null;
  onNewReview: () => void;
  onInspect: (id: string) => void;
}) {
  return (
    <section className="dashboard w-full py-4 space-y-8 font-sans">
      {/* Overview Section - Monotone Apple Cards on Top */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900">
            Overview
          </h3>
        </div>

        {/* Responsive Grid of Text-Top, Big-Number Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
          {metrics.map((metric) => (
            <MetricCard key={metric.title} {...metric} />
          ))}
        </div>
      </div>

      {/* "Needs attention" Section - Monotone Styling */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-gray-100 shadow-[0_2px_16px_rgba(0,0,0,0.03)] hover:shadow-[0_4px_24px_rgba(0,0,0,0.05)] transition-all duration-300">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Left Hero Callout */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-6">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                {businessName}
              </p>
              <h2 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 leading-tight">
                Needs attention
              </h2>
            </div>
            <div>
              <button
                onClick={onNewReview}
                className="inline-flex items-center gap-2 bg-[#1d1d1f] hover:bg-black text-white text-sm font-semibold px-6 py-3 rounded-full shadow-sm hover:shadow active:scale-[0.98] transition-all duration-150 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add a review
              </button>
            </div>
          </div>

          {/* Right Spotlight Detail Card */}
          <div className="lg:col-span-8 bg-gray-50/80 rounded-2xl p-6 border border-gray-100/90 transition-all hover:bg-gray-50 flex flex-col justify-between space-y-4">
            {spotlight ? (
              <>
                <div className="flex items-start justify-between gap-4">
                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                    {spotlight.title}
                  </h3>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-[11px] font-semibold uppercase tracking-wider bg-gray-200/80 text-gray-800 border border-gray-300/60 shrink-0">
                    {spotlight.priority}
                  </span>
                </div>

                {spotlight.evidenceQuote && (
                  <blockquote className="bg-white rounded-xl p-4 text-sm text-gray-700 leading-relaxed border border-gray-100 shadow-[0_1px_3px_rgba(0,0,0,0.02)] italic font-normal">
                    “{spotlight.evidenceQuote}”
                  </blockquote>
                )}

                <div className="flex items-center justify-between gap-4 pt-2">
                  <span className="text-sm font-medium text-gray-500">
                    <b className="text-gray-900 font-semibold">{spotlight.support}</b> reviews · {spotlight.branchId}
                  </span>
                  <button
                    onClick={() => onInspect(spotlight.id)}
                    className="inline-flex items-center gap-2 bg-[#1d1d1f] hover:bg-black text-white text-sm font-semibold px-5 py-2.5 rounded-full shadow-sm hover:shadow active:scale-[0.98] transition-all duration-150 cursor-pointer"
                  >
                    View issue
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                    </svg>
                  </button>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No issues need attention.</p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function MetricCard({ title, value }: MetricItem) {
  return (
    <div className="bg-white rounded-2xl p-5 sm:p-6 border border-gray-100 shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:shadow-[0_6px_20px_rgba(0,0,0,0.06)] hover:border-gray-200 transition-all duration-200 flex flex-col justify-between min-h-[120px] group">
      <div>
        <span className="block text-xs sm:text-[13px] font-medium text-gray-500 leading-snug">
          {title}
        </span>
      </div>
      <div className="mt-4">
        <strong className="block text-3xl sm:text-4xl lg:text-[42px] font-bold tracking-tight text-gray-900 leading-none">
          {value}
        </strong>
      </div>
    </div>
  );
}
