/** Dashboard presentation with enriched Apple aesthetic cards, responsive metrics grid, filled needs-attention panel, and bottom bento section. */
import React from "react";

export type MetricItem = {
  title: string;
  value: number;
  caption: string;
  color: "blue" | "green" | "purple" | "amber" | "indigo" | "teal";
  onClick: () => void;
};

export type Spotlight = {
  id: string;
  title: string;
  priority: string;
  priorityReason?: string;
  category?: string;
  branchId: string;
  support: number;
  evidenceQuote?: string;
  severity?: number;
};

export type OtherIssue = {
  id: string;
  title: string;
  priority: string;
  branchName: string;
  support: number;
  severity: number;
};

export type ActivityItem = {
  id: string;
  type: string;
  description: string;
  actor: string;
  timeAgo: string;
};

function getMetricIcon(color: MetricItem["color"]) {
  switch (color) {
    case "blue":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
        </svg>
      );
    case "green":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case "purple":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 0 1 .865-.501 48.172 48.172 0 0 0 3.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z" />
        </svg>
      );
    case "amber":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
        </svg>
      );
    case "indigo":
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
        </svg>
      );
    case "teal":
    default:
      return (
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.75}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 15 3 9m0 0 6-6M3 9h12a6 6 0 0 1 0 12h-3" />
        </svg>
      );
  }
}

function getBadgeStyle(color: MetricItem["color"]) {
  switch (color) {
    case "blue":
      return "bg-blue-50 text-blue-600 border border-blue-200/70";
    case "green":
      return "bg-emerald-50 text-emerald-600 border border-emerald-200/70";
    case "purple":
      return "bg-purple-50 text-purple-600 border border-purple-200/70";
    case "amber":
      return "bg-amber-50 text-amber-600 border border-amber-200/70";
    case "indigo":
      return "bg-indigo-50 text-indigo-600 border border-indigo-200/70";
    case "teal":
    default:
      return "bg-teal-50 text-teal-600 border border-teal-200/70";
  }
}

export function DashboardView({
  businessName,
  metrics,
  spotlight,
  simulatedSources,
  hasPreparedDemo,
  otherIssues,
  recentActivities,
  onNewReview,
  onLoadPreparedDemo,
  onInspect,
  onProposeTask,
  onNavigate,
}: {
  businessName: string;
  metrics: MetricItem[];
  spotlight: Spotlight | null;
  simulatedSources: string[];
  hasPreparedDemo: boolean;
  otherIssues: OtherIssue[];
  recentActivities: ActivityItem[];
  onNewReview: () => void;
  onLoadPreparedDemo?: () => void;
  onInspect: (id: string) => void;
  onProposeTask?: (themeId: string) => void;
  onNavigate: (
    tab:
      | "dashboard"
      | "reviews"
      | "issues"
      | "new"
      | "tasks"
      | "replies"
      | "activity",
  ) => void;
}) {
  return (
    <section className="dashboard w-full py-2 space-y-6 font-sans">
      {/* 1. Overview Section: Clickable Cards with Colored Circular Badges and Footers */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
            Overview
          </h3>
          <span className="text-xs font-medium text-gray-400">
            Click any metric to drill down
          </span>
        </div>

        {/* Responsive Grid of 6 Distinct Apple Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {metrics.map((metric) => (
            <button
              key={metric.title}
              type="button"
              onClick={metric.onClick}
              className="metric-card bg-white rounded-xl p-4 sm:p-5 border border-gray-200/70 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-[0_6px_16px_rgba(0,0,0,0.06)] hover:border-gray-300 transition-all duration-200 flex flex-col justify-between text-left group cursor-pointer min-h-[148px]"
            >
              {/* Top Row: Title + Soft Tinted Circular Icon Badge */}
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs sm:text-[13px] font-semibold text-gray-700 leading-snug">
                  {metric.title}
                </span>
                <div
                  className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shrink-0 ${getBadgeStyle(
                    metric.color,
                  )} transition-transform group-hover:scale-105 duration-200`}
                >
                  {getMetricIcon(metric.color)}
                </div>
              </div>

              {/* Middle: Prominent Number */}
              <div className="my-1.5">
                <strong className="block text-2xl sm:text-3xl lg:text-[38px] font-bold tracking-tight text-gray-900 leading-none">
                  {metric.value}
                </strong>
              </div>

              {/* Footer: Subtle 1-line muted caption */}
              <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                <span className="text-[11px] font-medium text-gray-400 truncate">
                  {metric.caption}
                </span>
                <svg
                  className="w-3.5 h-3.5 text-gray-300 group-hover:text-gray-700 transition-colors shrink-0 ml-1"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
                </svg>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2 & 3. "Needs attention" Section - Filled Left Column & Contextual Right Column */}
      <div className="bg-white rounded-xl p-6 sm:p-7 border border-gray-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)]">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-stretch">
          {/* Left Hero Callout - Space Filled */}
          <div className="lg:col-span-4 flex flex-col justify-between space-y-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">
                {businessName}
              </p>
              <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-gray-900 leading-tight">
                Needs attention
              </h2>
              <p className="text-xs sm:text-[13px] text-gray-500 mt-1.5 leading-relaxed">
                Ranked by severity, recurrence, and recentness across distinct source reviews.
              </p>
            </div>

            {/* Simulated Pipeline Status Block */}
            <div className="bg-gray-50/90 rounded-lg p-3.5 border border-gray-200/60 space-y-2">
              <div className="flex items-center justify-between text-[11px] font-semibold text-gray-600">
                <span className="uppercase tracking-wider">Simulated Pipeline Status</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  Active
                </span>
              </div>

              {/* Source Badges */}
              <div className="flex flex-wrap gap-1.5">
                {simulatedSources.map((src) => (
                  <span
                    key={src}
                    className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white text-gray-700 border border-gray-200/80 shadow-2xs"
                  >
                    {src}
                  </span>
                ))}
              </div>

              {/* Screening & Extraction Label */}
              <div className="pt-0.5 text-[11px] text-gray-500 flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5 text-purple-600 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456ZM16.894 20.567 16.5 21.75l-.394-1.183a2.25 2.25 0 0 0-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 0 0 1.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 0 0 1.423 1.423l1.183.394-1.183.394a2.25 2.25 0 0 0-1.423 1.423Z" />
                </svg>
                <span>Jev Screening + OpenAI Extraction</span>
              </div>
            </div>

            {/* Action Bar with Primary & Secondary Quick Buttons */}
            <div className="flex items-center gap-2.5 flex-wrap pt-0.5">
              <button
                type="button"
                onClick={onNewReview}
                className="inline-flex items-center gap-2 bg-[#1d1d1f] hover:bg-black text-white text-xs sm:text-sm font-semibold px-4 sm:px-5 py-2.5 rounded-lg shadow-xs hover:shadow active:scale-[0.98] transition-all duration-150 cursor-pointer"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                </svg>
                Add a review
              </button>
              {hasPreparedDemo && onLoadPreparedDemo && (
                <button
                  type="button"
                  onClick={onLoadPreparedDemo}
                  className="secondary inline-flex items-center gap-1.5 text-xs sm:text-sm font-medium px-4 py-2 sm:px-5 sm:py-2.5 rounded-full cursor-pointer transition-all duration-150"
                >
                  <svg className="w-3.5 h-3.5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 13.5l10.5-11.25L12 10.5h8.25L9.75 21.75 12 13.5H3.75z" />
                  </svg>
                  Inject demo review
                </button>
              )}
            </div>
          </div>

          {/* Right Spotlight Detail Card */}
          <div className="lg:col-span-8 bg-gray-50/80 rounded-lg p-5 sm:p-6 border border-gray-200/60 transition-all hover:bg-gray-50 flex flex-col justify-between space-y-4">
            {spotlight ? (
              <>
                <div className="space-y-1.5">
                  {/* Category, Property, and Priority Tag Row */}
                  <div className="flex items-center justify-between gap-2 flex-wrap mb-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase tracking-wider bg-white text-gray-700 border border-gray-200 shadow-2xs">
                        {spotlight.category || "Accessibility"}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium bg-white text-gray-600 border border-gray-200 shadow-2xs">
                        {spotlight.branchId}
                      </span>
                    </div>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-semibold uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200/80 shrink-0">
                      {spotlight.priority}
                    </span>
                  </div>

                  <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-gray-900">
                    {spotlight.title}
                  </h3>

                  {/* Priority reasoning */}
                  <p className="text-xs text-gray-500 leading-relaxed">
                    {spotlight.priorityReason ||
                      `${spotlight.support} distinct source reviews mention this issue at this property; verified severity score of 3/3 requires priority owner action.`}
                  </p>
                </div>

                {/* Exact supporting quote callout */}
                {spotlight.evidenceQuote && (
                  <blockquote className="bg-white rounded-lg p-3.5 text-sm text-gray-700 leading-relaxed border border-gray-200/60 shadow-2xs italic font-normal">
                    “{spotlight.evidenceQuote}”
                  </blockquote>
                )}

                {/* Bottom Bar: Distinct review count + primary/secondary actions */}
                <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                  <span className="text-sm font-medium text-gray-500">
                    <b className="text-gray-900 font-semibold">{spotlight.support}</b> distinct source reviews · {spotlight.branchId}
                  </span>
                  <div className="flex items-center gap-2">
                    {onProposeTask && (
                      <button
                        type="button"
                        onClick={() => onProposeTask(spotlight.id)}
                        className="secondary inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold px-4 py-2 rounded-full cursor-pointer transition-all"
                      >
                        <svg className="w-3.5 h-3.5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
                        </svg>
                        Create task
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => onInspect(spotlight.id)}
                      className="inline-flex items-center gap-2 bg-[#1d1d1f] hover:bg-black text-white text-xs sm:text-sm font-semibold px-4 py-2 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all duration-150 cursor-pointer"
                    >
                      View issue
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5 21 12m0 0-7.5 7.5M21 12H3" />
                      </svg>
                    </button>
                  </div>
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No issues need attention.</p>
            )}
          </div>
        </div>
      </div>

      {/* 4. Bottom Bento Section: 2 Columns (Other Priority Issues + Recent Activity & Simulated Handoffs) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1">
        {/* Left Column (8 of 12 = 2/3 width on desktop): Other Priority Issues */}
        <div className="lg:col-span-8 bg-white rounded-xl p-5 sm:p-6 border border-gray-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h4 className="text-base sm:text-lg font-bold tracking-tight text-gray-900">
                Other Priority Issues
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Next triage candidates for {businessName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("issues")}
              className="link text-xs font-semibold text-[#0071e3] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              View all issues
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Issues List */}
          <div className="space-y-2.5">
            {otherIssues.length > 0 ? (
              otherIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-gray-50/80 hover:bg-gray-100/70 border border-gray-200/60 transition-all duration-150 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider ${
                          issue.priority === "urgent"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : issue.priority === "high"
                              ? "bg-orange-50 text-orange-700 border border-orange-200"
                              : "bg-gray-200 text-gray-700"
                        }`}
                      >
                        {issue.priority}
                      </span>
                      <h5 className="text-sm font-semibold text-gray-900 truncate">
                        {issue.title}
                      </h5>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">
                      {issue.support} distinct source reviews · {issue.branchName} · Severity {issue.severity}/3
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onInspect(issue.id)}
                    className="secondary text-xs font-semibold px-3.5 py-1.5 rounded-full cursor-pointer hover:bg-gray-50"
                  >
                    Inspect
                  </button>
                </div>
              ))
            ) : (
              <p className="text-xs text-gray-400 py-4 text-center">
                No additional priority issues currently flagged.
              </p>
            )}
          </div>
        </div>

        {/* Right Column (4 of 12 = 1/3 width on desktop): Recent Activity & Simulated Handoffs */}
        <div className="lg:col-span-4 bg-white rounded-xl p-5 sm:p-6 border border-gray-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-gray-100">
            <div>
              <h4 className="text-base sm:text-lg font-bold tracking-tight text-gray-900">
                Recent Activity & Simulated Handoffs
              </h4>
              <p className="text-xs text-gray-400 mt-0.5">
                Simulated events & pipeline handoffs
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("activity")}
              className="link text-xs font-semibold text-[#0071e3] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              View all activity
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>

          {/* Activity Entries */}
          <div className="space-y-3">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                className="text-xs space-y-1 pb-2.5 border-b border-gray-100 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between text-gray-400 text-[11px]">
                  <span className="font-semibold text-gray-700 capitalize">
                    {act.type.replace(/_/g, " ")}
                  </span>
                  <span>{act.timeAgo}</span>
                </div>
                <p className="text-gray-600 leading-snug font-normal line-clamp-2">
                  {act.description}
                </p>
                <div className="text-[10px] text-gray-400 font-medium">
                  By {act.actor}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
