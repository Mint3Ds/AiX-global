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
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Ledger theme palette for charts
const THEME_COLORS = {
  baseline: "#8fa4b5", // Soft slate for academic baselines
  clarity: "#243d52", // Deep slate navy (var(--action))
  accent: "#496b86", // Slate steel blue (var(--accent))
  specific: "#2e7d5b", // Refined forest green for actionable feedback
  generic: "#7d8d9b", // Neutral slate for low-signal reviews
  needsAttention: "#c27a2b", // Warm amber for pending attention
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
          eyebrow="Empirical benchmarks"
          title="Operational statistics"
          description="Real server dwell telemetry, response readiness benchmarks, and operational time saved with Clarity."
        />
        <div className="empty-state-card">
          <p className="empty-state-title">Loading telemetry data…</p>
          <p className="empty-state-copy">
            Querying server database for real time-tracking timestamps and
            funnel data.
          </p>
        </div>
      </section>
    );
  }

  const { timeTracking, funnel, kpis } = metrics;

  // Chart 1: Time Tracking Comparison (Seconds)
  const timeComparisonData = [
    {
      name: "Manual Baseline (Johnston 2001)",
      seconds: timeTracking.literatureBenchmarkSeconds,
      fill: THEME_COLORS.baseline,
    },
    {
      name: "Clarity (Server-measured)",
      seconds: timeTracking.averageTriageSeconds ?? 0,
      fill: THEME_COLORS.clarity,
    },
  ];

  // Chart 2: Reviews Intake & Screening Funnel (without trailing "reviews")
  const funnelPieData = [
    {
      name: "Specific & Actionable",
      value: funnel.specificReviewsCount,
      color: THEME_COLORS.specific,
    },
    {
      name: "Generic / Filtered",
      value: funnel.genericReviewsCount,
      color: THEME_COLORS.generic,
    },
    {
      name: "Needs Attention",
      value: funnel.needsReviewReviewsCount,
      color: THEME_COLORS.needsAttention,
    },
  ].filter((item) => item.value > 0);

  // Chart 3: Management Response Readiness vs Industry Baseline (%)
  const responseRateData = [
    {
      name: "TripAdvisor Avg (Proserpio 2017)",
      rate: kpis.industryBaselineResponseRatePercent,
      fill: THEME_COLORS.baseline,
    },
    {
      name: "Clarity Readiness Rate",
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
    <section className="stats-page" aria-label="Operational statistics">
      <PageHeading
        index="07"
        eyebrow="Empirical benchmarks"
        title="Operational statistics"
        description="Real server dwell telemetry, response readiness benchmarks, and operational time saved with Clarity."
      >
        <span className="page-count">
          <strong>{timeTracking.totalTriagedReviews}</strong> triaged
        </span>
      </PageHeading>

      {/* Top Ledger Summary Row: The Three Core Metrics */}
      <div className="stats-summary" aria-label="Key statistical totals">
        <div>
          <span className="stat-label">Active Triage Dwell</span>
          <strong>
            {timeTracking.averageTriageSeconds !== null
              ? `${timeTracking.averageTriageSeconds}s`
              : "—"}
          </strong>
          <span className="stat-hint">
            {timeTracking.measuredTimeReductionPercent !== null ? (
              <span className="stat-highlight">
                ↓ {timeTracking.measuredTimeReductionPercent}% vs 600s baseline
              </span>
            ) : (
              "Awaiting triage session"
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
              ? `${kpis.responseRateMultiplier}x vs TripAdvisor (31.5%)`
              : "Industry baseline: 31.5%"}
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

      {/* Row 1: Active Triage Dwell vs Johnston Baseline */}
      <div className="stats-grid-two">
        {/* Triage Time Chart */}
        <div className="stats-panel">
          <div className="stats-panel-heading">
            <h3>Active Triage Dwell vs Academic Baseline</h3>
            <p>
              Comparison of standard manual triage duration against
              Clarity&apos;s server-measured active manager dwell time
              (seconds).
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
                      `${val} seconds (${(Number(val) / 60).toFixed(1)} min)`,
                      "Duration",
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
            <strong>Academic Reference:</strong> Johnston, R. (2001),{" "}
            <em>International Journal of Service Industry Management</em>,
            12(1), 60–84. Standard manual intake, root-cause diagnosis, and
            department dispatching takes 10–15 minutes (conservative lower
            bound: 600 seconds).
          </div>
        </div>

        {/* Telemetry Breakdown Table */}
        <div className="stats-panel">
          <div className="stats-panel-heading">
            <h3>Time Tracking Telemetry Details</h3>
            <p>
              Optimistic server dwell recorded between the manager&apos;s last
              view and the formal decision timestamp.
            </p>
          </div>

          <table className="stats-table">
            <tbody>
              <tr>
                <td className="table-label">Academic Manual Baseline</td>
                <td className="table-value">
                  {timeTracking.literatureBenchmarkSeconds}s (10.0 min)
                </td>
              </tr>
              <tr>
                <td className="table-label">Measured Average Active Triage</td>
                <td
                  className="table-value"
                  style={{ color: "var(--action, #243d52)" }}
                >
                  {timeTracking.averageTriageSeconds !== null
                    ? `${timeTracking.averageTriageSeconds}s`
                    : "No dwell sessions yet"}
                </td>
              </tr>
              <tr>
                <td className="table-label">Measured Median Active Triage</td>
                <td className="table-value">
                  {timeTracking.medianTriageSeconds !== null
                    ? `${timeTracking.medianTriageSeconds}s`
                    : "—"}
                </td>
              </tr>
              <tr>
                <td className="table-label">Min / Max Recorded Session</td>
                <td className="table-value">
                  {timeTracking.minTriageSeconds !== null
                    ? `${timeTracking.minTriageSeconds}s`
                    : "—"}{" "}
                  /{" "}
                  {timeTracking.maxTriageSeconds !== null
                    ? `${timeTracking.maxTriageSeconds}s`
                    : "—"}
                </td>
              </tr>
              <tr>
                <td className="table-label">Empirical Time Reduction</td>
                <td className="table-value" style={{ color: "#1f6b4d" }}>
                  {timeTracking.measuredTimeReductionPercent !== null
                    ? `${timeTracking.measuredTimeReductionPercent}%`
                    : "—"}
                </td>
              </tr>
              <tr>
                <td className="table-label">Hours Saved to Clarity</td>
                <td
                  className="table-value"
                  style={{ color: "#1f6b4d", fontWeight: 600 }}
                >
                  {kpis.hoursReclaimed}h
                </td>
              </tr>
              <tr>
                <td className="table-label">
                  Tracked vs Total Triaged Reviews
                </td>
                <td className="table-value">
                  {timeTracking.trackedReviewsCount} tracked /{" "}
                  {timeTracking.totalTriagedReviews} triaged
                </td>
              </tr>
              <tr>
                <td className="table-label">
                  End-to-End Operational Turnaround
                </td>
                <td className="table-value">
                  {timeTracking.averageEndToEndResolutionMinutes !== null
                    ? `${timeTracking.averageEndToEndResolutionMinutes} min`
                    : "—"}
                </td>
              </tr>
            </tbody>
          </table>

          <div className="stats-callout">
            <strong>Timezone Invariant:</strong> Durations are calculated
            entirely on the server in UTC from postgres timestamps when managers
            confirm work tasks.
          </div>
        </div>
      </div>

      {/* Row 2: Reviews Intake & Screening Funnel + Response Readiness */}
      <div className="stats-grid-two">
        {/* Reviews Intake & Screening Funnel (Pie Chart) */}
        <div className="stats-panel">
          <div className="stats-panel-heading">
            <h3>Reviews Intake &amp; Screening Funnel</h3>
            <p>
              Distribution of incoming reviews screened into actionable
              operational feedback vs generic text.
            </p>
          </div>

          <div style={{ height: "240px" }}>
            {mounted && funnelPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={funnelPieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={78}
                    innerRadius={44}
                    paddingAngle={3}
                    label={({ percent }: { percent?: number }) =>
                      percent ? `${(percent * 100).toFixed(0)}%` : ""
                    }
                  >
                    {funnelPieData.map((entry, index) => (
                      <Cell key={`funnel-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={tooltipStyle}
                    formatter={(val: unknown, name: unknown) => [
                      `${val} reviews`,
                      String(name),
                    ]}
                  />
                  <Legend
                    wrapperStyle={{
                      fontSize: "12px",
                      color: "var(--ink, #17232d)",
                      fontFamily: "var(--font-ui, sans-serif)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  height: "100%",
                  color: "var(--muted)",
                  fontSize: "13px",
                }}
              >
                No reviews funnel data available
              </div>
            )}
          </div>

          {/* Three Summary Pills without trailing "reviews" */}
          <div className="stats-funnel-pills">
            <div className="stats-funnel-pill">
              <strong style={{ color: THEME_COLORS.specific }}>
                {funnel.specificReviewsCount}
              </strong>
              <span>Specific &amp; Actionable</span>
            </div>
            <div className="stats-funnel-pill">
              <strong style={{ color: THEME_COLORS.generic }}>
                {funnel.genericReviewsCount}
              </strong>
              <span>Generic / Filtered</span>
            </div>
            <div className="stats-funnel-pill">
              <strong style={{ color: THEME_COLORS.needsAttention }}>
                {funnel.needsReviewReviewsCount}
              </strong>
              <span>Needs Attention</span>
            </div>
          </div>
        </div>

        {/* Management Response Readiness (Bar Chart) */}
        <div className="stats-panel">
          <div className="stats-panel-heading">
            <h3>Management Response Readiness</h3>
            <p>
              Verified response rate backed by physical task completion compared
              to hospitality benchmarks.
            </p>
          </div>

          <div style={{ height: "240px" }}>
            {mounted && (
              <ResponsiveContainer width="100%" height={240}>
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
            <strong>Academic Reference:</strong> Proserpio, M., &amp; Zervas, G.
            (2017), <em>Marketing Science</em>, 36(5), 645–665. Across
            TripAdvisor, only 31.5% of reviews receive managerial responses due
            to staff time limitations.
          </div>
        </div>
      </div>

      {/* Row 3: Operational Loop Closure */}
      <div className="stats-panel">
        <div className="stats-panel-heading">
          <h3>Operational Loop Closure</h3>
          <p>
            End-to-end progression from guest issue extraction to physical staff
            task resolution and verified reply preparation.
          </p>
        </div>

        <div className="stats-quad-grid">
          <div className="stats-quad-card">
            <div className="quad-label">Tasks Proposed</div>
            <strong>{funnel.tasksProposed}</strong>
          </div>
          <div className="stats-quad-card">
            <div className="quad-label">Assigned to Staff</div>
            <strong>{funnel.tasksApproved}</strong>
          </div>
          <div className="stats-quad-card">
            <div className="quad-label">Resolved by Staff</div>
            <strong style={{ color: "#1f6b4d" }}>{funnel.tasksResolved}</strong>
          </div>
          <div className="stats-quad-card">
            <div className="quad-label">Verified Replies Ready</div>
            <strong>{funnel.repliesApproved}</strong>
          </div>
        </div>
      </div>
    </section>
  );
}
