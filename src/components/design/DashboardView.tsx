/** Clean, human-crafted typography-driven DashboardView */
import React from "react";

export type MetricItem = {
  title: string;
  value: number;
  caption: string;
  color?: "blue" | "green" | "purple" | "amber" | "indigo" | "teal";
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

function formatSentenceCase(str?: string): string {
  if (!str) return "";
  return str
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
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
  const cleanSources = simulatedSources
    .map((s) => s.replace(/\[Simulated\]/gi, "").replace(/^Simulated\s+/i, "").trim())
    .filter(Boolean)
    .join(", ");

  return (
    <section className="dashboard w-full py-2 space-y-6 font-sans">
      {/* 1. Overview Section: Header with Actions & 6 Typography-driven Cards */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-baseline gap-3">
            <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
              Overview
            </h3>
            <span className="text-xs font-normal text-neutral-400 hidden sm:inline">
              Click any card to drill down
            </span>
          </div>

          {/* Action pill buttons moved from Needs Attention (Zero decorative icons) */}
          <div className="flex items-center gap-2.5">
            {hasPreparedDemo && onLoadPreparedDemo && (
              <button
                type="button"
                onClick={onLoadPreparedDemo}
                className="secondary text-xs font-medium px-4 py-2 rounded-full cursor-pointer transition-all active:scale-[0.98]"
              >
                Inject demo review
              </button>
            )}
            <button
              type="button"
              onClick={onNewReview}
              className="bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold px-4 sm:px-5 py-2 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
            >
              + Add a review
            </button>
          </div>
        </div>

        {/* Responsive Grid of 6 Pure-Typography Cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5">
          {metrics.map((metric) => (
            <button
              key={metric.title}
              type="button"
              onClick={metric.onClick}
              className="metric-card bg-white rounded-xl p-4 sm:p-5 border border-neutral-200/70 shadow-[0_1px_3px_rgba(0,0,0,0.02)] hover:shadow-[0_4px_12px_rgba(0,0,0,0.05)] hover:border-neutral-300 transition-all duration-200 flex flex-col justify-between text-left group cursor-pointer min-h-[136px]"
            >
              {/* Top Row: Muted Top Label */}
              <div>
                <span className="text-xs sm:text-[13px] font-medium text-neutral-500 leading-snug block">
                  {metric.title}
                </span>
              </div>

              {/* Middle: Prominent Bold Number */}
              <div className="my-2">
                <strong className="block text-2xl sm:text-3xl lg:text-[34px] font-semibold tracking-tight text-neutral-900 leading-none">
                  {metric.value}
                </strong>
              </div>

              {/* Footer: Subtle 1-line Muted Caption */}
              <div className="pt-2 border-t border-neutral-100 flex items-center justify-between text-[11px] font-medium text-neutral-400">
                <span className="truncate">{metric.caption}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* 2. 2-Column Bento Section: Priority Issues (with #1 Issue on top) + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 pt-1 items-start">
        {/* Left Column (8 of 12 = 2/3 width on desktop): Priority Issues */}
        <div className="lg:col-span-8 bg-white rounded-xl p-5 sm:p-6 border border-neutral-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <div>
              <h4 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900">
                Priority Issues
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Ranked by severity, recurrence, and recentness for {businessName}
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("issues")}
              className="link text-xs font-semibold text-[#0071e3] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              View all issues →
            </button>
          </div>

          {/* Featured Top-Priority Issue (#1 Ranked) */}
          {spotlight ? (
            <div className="p-4 sm:p-5 rounded-xl bg-neutral-50/70 border border-neutral-200/80 space-y-3">
              {/* Badges Row */}
              <div className="flex items-center justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-amber-50 text-amber-900 border border-amber-200/80">
                    {formatSentenceCase(spotlight.priority)}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-neutral-700 border border-neutral-200 shadow-2xs">
                    {formatSentenceCase(spotlight.category || "Guest experience")}
                  </span>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-white text-neutral-600 border border-neutral-200 shadow-2xs">
                    {spotlight.branchId}
                  </span>
                </div>
              </div>

              {/* Title & Priority Reasoning */}
              <div>
                <h5 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900">
                  {spotlight.title}
                </h5>
                <p className="text-xs text-neutral-500 mt-1 leading-relaxed">
                  {spotlight.priorityReason ||
                    `${spotlight.support} distinct source reviews mention this issue at this property; verified severity score of 3/3 requires priority owner action.`}
                </p>
              </div>

              {/* Supporting Quote Preview Callout */}
              {spotlight.evidenceQuote && (
                <blockquote className="bg-white rounded-lg p-3 sm:p-3.5 text-xs sm:text-[13px] text-neutral-700 leading-relaxed border border-neutral-200/70 italic font-normal">
                  “{spotlight.evidenceQuote}”
                </blockquote>
              )}

              {/* Meta & Actions Bar */}
              <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                <span className="text-xs font-normal text-neutral-500">
                  <b className="font-semibold text-neutral-900">{spotlight.support}</b> distinct source reviews · {spotlight.branchId} · Severity {spotlight.severity || 3}/3
                </span>
                <div className="flex items-center gap-2">
                  {onProposeTask && (
                    <button
                      type="button"
                      onClick={() => onProposeTask(spotlight.id)}
                      className="secondary text-xs font-semibold px-4 py-1.5 rounded-full cursor-pointer transition-all active:scale-[0.98]"
                    >
                      Create task
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onInspect(spotlight.id)}
                    className="bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold px-4 py-1.5 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                  >
                    View issue →
                  </button>
                </div>
              </div>
            </div>
          ) : null}

          {/* Subsequent Priority Issues List */}
          <div className="space-y-2.5">
            {otherIssues.length > 0 ? (
              otherIssues.map((issue) => (
                <div
                  key={issue.id}
                  className="flex items-center justify-between gap-3 p-3.5 rounded-lg bg-neutral-50/50 hover:bg-neutral-100/60 border border-neutral-200/60 transition-all duration-150 group"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          issue.priority === "urgent"
                            ? "bg-amber-50 text-amber-900 border border-amber-200/80"
                            : issue.priority === "high"
                              ? "bg-orange-50 text-orange-800 border border-orange-200/80"
                              : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                        }`}
                      >
                        {formatSentenceCase(issue.priority)}
                      </span>
                      <h5 className="text-sm font-semibold text-neutral-900 truncate">
                        {issue.title}
                      </h5>
                    </div>
                    <p className="text-xs text-neutral-500 mt-1">
                      {issue.support} distinct source reviews · {issue.branchName} · Severity {issue.severity}/3
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onInspect(issue.id)}
                    className="secondary text-xs font-semibold px-3.5 py-1.5 rounded-full cursor-pointer hover:bg-neutral-50"
                  >
                    Inspect
                  </button>
                </div>
              ))
            ) : !spotlight ? (
              <p className="text-xs text-neutral-400 py-4 text-center">
                No priority issues currently flagged.
              </p>
            ) : null}
          </div>
        </div>

        {/* Right Column (4 of 12 = 1/3 width on desktop): Recent Activity & Simulated Handoffs */}
        <div className="lg:col-span-4 bg-white rounded-xl p-5 sm:p-6 border border-neutral-200/70 shadow-[0_2px_12px_rgba(0,0,0,0.02)] flex flex-col justify-between space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100">
            <div>
              <h4 className="text-base sm:text-lg font-bold tracking-tight text-neutral-900">
                Recent Activity
              </h4>
              <p className="text-xs text-neutral-400 mt-0.5">
                Simulated events & pipeline handoffs
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate("activity")}
              className="link text-xs font-semibold text-[#0071e3] hover:underline inline-flex items-center gap-1 cursor-pointer"
            >
              View all activity →
            </button>
          </div>

          {/* Activity Entries */}
          <div className="space-y-3">
            {recentActivities.map((act) => (
              <div
                key={act.id}
                className="text-xs space-y-1 pb-2.5 border-b border-neutral-100 last:border-b-0 last:pb-0"
              >
                <div className="flex items-center justify-between text-neutral-400 text-[11px]">
                  <span className="font-semibold text-neutral-700 capitalize">
                    {formatSentenceCase(act.type)}
                  </span>
                  <span>{act.timeAgo}</span>
                </div>
                <p className="text-neutral-600 leading-snug font-normal line-clamp-2">
                  {act.description}
                </p>
                <div className="text-[10px] text-neutral-400 font-medium">
                  By {act.actor}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 3. Quiet Muted Footer Caption for Simulated Status */}
      <div className="pt-2 text-center text-xs text-neutral-400 font-normal">
        Simulated sources: {cleanSources || "Map Reviews, Stay Portal, Guest Form"} · Screened by Jev & OpenAI
      </div>
    </section>
  );
}
