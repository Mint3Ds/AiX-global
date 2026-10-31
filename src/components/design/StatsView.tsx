"use client";

import { useEffect, useState } from "react";
import { PageHeading } from "./PageHeading";
import type { WorkspaceMetrics } from "@/domain/metrics";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";

// Ledger theme palette for charts
const THEME_COLORS = {
  baseline: "#8fa4b5", // Soft slate for industry/traditional baselines
  clarity: "#243d52", // Deep slate navy (var(--action))
};

export function StatsView({ metrics }: { metrics?: WorkspaceMetrics }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  if (!metrics) {
    return (
      <section className="stats-page">
        <PageHeading
          index="07"
          eyebrow="Business impact"
          title="Executive statistics"
          description="Key performance indicators on review-to-action speed, response readiness, and operational time saved."
        />
        <div className="empty-state-card">
          <p className="empty-state-title">Loading statistics…</p>
          <p className="empty-state-copy">
            Gathering operational metrics and performance data.
          </p>
        </div>
      </section>
    );
  }

  const { timeTracking, funnel, kpis } = metrics;

  // Chart 1: Triage Time Comparison (Seconds)
  const timeComparisonData = [
    {
      name: "Manual Review",
      seconds: timeTracking.literatureBenchmarkSeconds,
      fill: THEME_COLORS.baseline,
    },
    {
      name: "With Clarity",
      seconds: timeTracking.averageTriageSeconds ?? 0,
      fill: THEME_COLORS.clarity,
    },
  ];

  // Chart 2: Management Response Rate (%)
  const responseRateData = [
    {
      name: "Industry Average",
      rate: kpis.industryBaselineResponseRatePercent,
      fill: THEME_COLORS.baseline,
    },
    {
      name: "With Clarity",
      rate: kpis.responseReadinessRatePercent ?? 0,
      fill: THEME_COLORS.clarity,
    },
  ];

  const tooltipStyle = {
    backgroundColor: "var(--paper-light, #fdfefe)",
    borderColor: "var(--line, #d4e0e8)",
    borderRadius: "var(--radius, 2px)",
    boxShadow: "0 6px 18px rgba(23, 35, 45, 0.08)",
    fontSize: "12px",
    color: "var(--ink, #17232d)",
    fontFamily: "var(--font-ui, sans-serif)",
    padding: "8px 12px",
  };

  return (
    <section className="stats-page" aria-label="Executive statistics">
      <PageHeading
        index="07"
        eyebrow="Business impact"
        title="Executive statistics"
        description="Key performance indicators on review-to-action speed, response readiness, and operational time saved."
      >
        <span className="page-count">
          <strong>{timeTracking.totalTriagedReviews}</strong> reviews actioned
        </span>
      </PageHeading>

      {/* Top Summary Row: The Three Core Metrics */}
      <div className="stats-summary" aria-label="Executive summary totals">
        <div>
          <span className="stat-label">Review-to-Action Time</span>
          <strong>
            {timeTracking.averageTriageSeconds !== null
              ? `${timeTracking.averageTriageSeconds}s`
              : "—"}
          </strong>
          <span className="stat-hint">
            {timeTracking.measuredTimeReductionPercent !== null ? (
              <span className="stat-highlight">
                ↓ {timeTracking.measuredTimeReductionPercent}% faster than
                manual (10 min)
              </span>
            ) : (
              "Awaiting review handling"
            )}
          </span>
        </div>

        <div>
          <span className="stat-label">Response Readiness</span>
          <strong>
            {kpis.responseReadinessRatePercent !== null
              ? `${kpis.responseReadinessRatePercent}%`
              : "—"}
          </strong>
          <span className="stat-hint">
            {kpis.responseRateMultiplier !== null
              ? `${kpis.responseRateMultiplier}x industry average (31.5%)`
              : "Industry average: 31.5%"}
          </span>
        </div>

        <div>
          <span className="stat-label">Hours Saved to Clarity</span>
          <strong>{kpis.hoursReclaimed}h</strong>
          <span className="stat-hint">
            Across {funnel.specificReviewsCount} actionable reviews
          </span>
        </div>
      </div>

      {/* Side-by-Side Value Showcase: Speed & Coverage */}
      <div className="stats-grid-two">
        {/* Panel 1: Review-to-Action Speed */}
        <div className="stats-panel">
          <div className="stats-panel-heading">
            <h3>Review-to-Action Speed: Seconds vs Minutes</h3>
            <p>
              Average time spent by managers to read, diagnose, and delegate a
              customer complaint.
            </p>
          </div>

          <div style={{ flex: 1, minHeight: "260px" }}>
            {mounted && (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={timeComparisonData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 12,
                      fill: "var(--muted, #586978)",
                      fontFamily: "var(--font-ui, sans-serif)",
                    }}
                  />
                  <YAxis
                    unit="s"
                    tick={{
                      fontSize: 12,
                      fill: "var(--muted, #586978)",
                      fontFamily: "var(--font-ui, sans-serif)",
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: unknown) => [
                      `${val}s (${(Number(val) / 60).toFixed(1)} min)`,
                      "Review-to-Action Time",
                    ]}
                  />
                  <Bar dataKey="seconds" radius={[2, 2, 0, 0]}>
                    {timeComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="stats-callout">
            <strong>Speed Advantage:</strong> Traditional review intake and task
            assignment takes 10–15 minutes per complaint. Clarity confirms root
            causes and dispatches staff in under 30 seconds.
          </div>
        </div>

        {/* Panel 2: Response Coverage */}
        <div className="stats-panel">
          <div className="stats-panel-heading">
            <h3>
              Response Coverage:{" "}
              {kpis.responseReadinessRatePercent !== null
                ? `${kpis.responseReadinessRatePercent}%`
                : "0%"}{" "}
              vs {kpis.industryBaselineResponseRatePercent}%
            </h3>
            <p>
              Percentage of guest feedback receiving a verified managerial
              response.
            </p>
          </div>

          <div style={{ flex: 1, minHeight: "260px" }}>
            {mounted && (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart
                  data={responseRateData}
                  margin={{ top: 20, right: 30, left: 10, bottom: 20 }}
                >
                  <XAxis
                    dataKey="name"
                    tick={{
                      fontSize: 12,
                      fill: "var(--muted, #586978)",
                      fontFamily: "var(--font-ui, sans-serif)",
                    }}
                  />
                  <YAxis
                    unit="%"
                    domain={[0, 100]}
                    tick={{
                      fontSize: 12,
                      fill: "var(--muted, #586978)",
                      fontFamily: "var(--font-ui, sans-serif)",
                    }}
                  />
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: unknown) => [`${val}%`, "Response Rate"]}
                  />
                  <Bar dataKey="rate" radius={[2, 2, 0, 0]}>
                    {responseRateData.map((entry, index) => (
                      <Cell key={`resp-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="stats-callout">
            <strong>Coverage Advantage:</strong> Over 68% of guest reviews go
            unanswered across the hospitality industry (31.5% average). With
            Clarity, verified response coverage is currently{" "}
            <strong>
              {kpis.responseReadinessRatePercent !== null
                ? `${kpis.responseReadinessRatePercent}%`
                : "0%"}
            </strong>
            {kpis.responseRateMultiplier !== null &&
            kpis.responseRateMultiplier > 1
              ? ` (${kpis.responseRateMultiplier}x higher)`
              : ""}
            , backed directly by completed staff tasks.
          </div>
        </div>
      </div>

      {/* Panel 3: Hours Saved & Operational Loop */}
      <div className="stats-panel">
        <div className="stats-panel-heading">
          <h3>Hours Saved &amp; Operational Loop</h3>
          <p>
            How guest feedback translates directly into staff action, resolved
            complaints, and reclaimed managerial hours.
          </p>
        </div>

        <div className="stats-quad-grid">
          <div className="stats-quad-card">
            <div className="quad-label">Hours Saved to Clarity</div>
            <strong style={{ color: "#1f6b4d" }}>{kpis.hoursReclaimed}h</strong>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Managerial time reclaimed
            </span>
          </div>
          <div className="stats-quad-card">
            <div className="quad-label">Actionable Issues Screened</div>
            <strong>{funnel.specificReviewsCount}</strong>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Noise filtered automatically
            </span>
          </div>
          <div className="stats-quad-card">
            <div className="quad-label">Tasks Assigned &amp; Resolved</div>
            <strong style={{ color: "var(--action)" }}>
              {funnel.tasksApproved} assigned · {funnel.tasksResolved} resolved
            </strong>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Fixed on-site by staff
            </span>
          </div>
          <div className="stats-quad-card">
            <div className="quad-label">Verified Replies Ready</div>
            <strong>{funnel.repliesApproved}</strong>
            <span style={{ fontSize: "12px", color: "var(--muted)" }}>
              Ready for guest response
            </span>
          </div>
        </div>

        <div className="stats-callout">
          <strong>Executive Summary:</strong> Clarity filters out low-signal
          noise, turns reviews into action in seconds, and ensures every
          verified complaint is physically resolved by staff before guest
          replies are dispatched.
        </div>
      </div>
    </section>
  );
}
