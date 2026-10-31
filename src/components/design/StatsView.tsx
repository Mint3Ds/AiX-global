"use client";

import { useEffect, useState } from "react";
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

const PIE_COLORS = {
  specific: "#10b981", // Emerald green
  generic: "#6b7280", // Slate gray
  needsReview: "#f59e0b", // Amber
  verified: "#2563eb", // Royal blue
  unverified: "#ef4444", // Crimson
};

export function StatsView({ metrics }: { metrics?: WorkspaceMetrics }) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(false);
    const timer = setTimeout(() => setMounted(true), 10);
    return () => clearTimeout(timer);
  }, []);

  if (!metrics) {
    return (
      <section className="stats-container" style={{ padding: "2rem", maxWidth: "1200px", margin: "0 auto" }}>
        <div style={{ padding: "2rem", background: "white", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
          <h2 style={{ fontSize: "1.25rem", fontWeight: 600, color: "#1f2937" }}>Loading Empirical Statistics...</h2>
          <p style={{ color: "#6b7280", marginTop: "0.5rem" }}>
            Querying server database for real time-tracking timestamps and funnel data.
          </p>
        </div>
      </section>
    );
  }

  const { timeTracking, funnel, evidenceIntegrity, kpis } = metrics;

  // Chart 1: Time Tracking Comparison (Seconds)
  const timeComparisonData = [
    {
      name: "Manual Baseline (Johnston 2001)",
      seconds: timeTracking.literatureBenchmarkSeconds,
      minutes: Number((timeTracking.literatureBenchmarkSeconds / 60).toFixed(1)),
      fill: "#6b7280",
    },
    {
      name: "Clarity (Server Measured)",
      seconds: timeTracking.averageTriageSeconds ?? 0,
      minutes: timeTracking.averageTriageSeconds
        ? Number((timeTracking.averageTriageSeconds / 60).toFixed(2))
        : 0,
      fill: "#10b981",
    },
  ];

  // Chart 2: Review Intake & Screening Funnel (Counts)
  const funnelPieData = [
    { name: "Specific & Actionable", value: funnel.specificReviewsCount, color: PIE_COLORS.specific },
    { name: "Generic / Filtered", value: funnel.genericReviewsCount, color: PIE_COLORS.generic },
    { name: "Needs Manual Review", value: funnel.needsReviewReviewsCount, color: PIE_COLORS.needsReview },
  ].filter((item) => item.value > 0);

  // Chart 3: Management Response Readiness vs Industry Baseline (%)
  const responseRateData = [
    {
      name: "TripAdvisor Avg (Proserpio 2017)",
      rate: kpis.industryBaselineResponseRatePercent,
      fill: "#6b7280",
    },
    {
      name: "Clarity Readiness Rate",
      rate: kpis.responseReadinessRatePercent ?? 0,
      fill: "#2563eb",
    },
  ];

  // Chart 4: Evidence Traceability
  const evidencePieData = [
    { name: "Verbatim Verified", value: evidenceIntegrity.exactSubstringVerifiedCount, color: PIE_COLORS.verified },
    { name: "Unverified / Freeform", value: evidenceIntegrity.unverifiedCount, color: PIE_COLORS.unverified },
  ].filter((item) => item.value > 0);

  return (
    <section
      className="stats-container"
      style={{
        padding: "1.5rem",
        maxWidth: "1280px",
        margin: "0 auto",
        display: "flex",
        flexDirection: "column",
        gap: "1.75rem",
        color: "#1d1d1f",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "#ffffff",
          padding: "1.5rem 2rem",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h2 style={{ fontSize: "1.5rem", fontWeight: 700, margin: 0, letterSpacing: "-0.02em" }}>
              Operational KPI & Empirical Benchmark Statistics
            </h2>
            <p style={{ color: "#6b7280", margin: "0.35rem 0 0 0", fontSize: "0.95rem" }}>
              Live telemetry calculated directly on the server from UTC timestamps and database audit trails.
            </p>
          </div>
          <span
            style={{
              fontSize: "0.8rem",
              background: "#ecfdf5",
              color: "#065f46",
              border: "1px solid #a7f3d0",
              borderRadius: "9999px",
              padding: "0.35rem 0.75rem",
              fontWeight: 600,
            }}
          >
            ● Empirical Server Data
          </span>
        </div>
      </div>

      {/* Metric High-Level Cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
          gap: "1rem",
        }}
      >
        <div
          style={{
            background: "#ffffff",
            padding: "1.25rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 500 }}>Active Triage Dwell Time</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "0.25rem", color: "#111827" }}>
            {timeTracking.averageTriageSeconds !== null ? `${timeTracking.averageTriageSeconds}s` : "—"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#10b981", marginTop: "0.25rem", fontWeight: 600 }}>
            {timeTracking.measuredTimeReductionPercent !== null
              ? `↓ ${timeTracking.measuredTimeReductionPercent}% vs 600s baseline`
              : "Awaiting triage session"}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "1.25rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 500 }}>Evidence Substring Traceability</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "0.25rem", color: "#111827" }}>
            {evidenceIntegrity.traceabilityRatePercent}%
          </div>
          <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>
            {evidenceIntegrity.exactSubstringVerifiedCount} / {evidenceIntegrity.totalObservations} quotes verbatim verified
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "1.25rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 500 }}>Response Readiness Rate</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "0.25rem", color: "#111827" }}>
            {kpis.responseReadinessRatePercent !== null ? `${kpis.responseReadinessRatePercent}%` : "—"}
          </div>
          <div style={{ fontSize: "0.8rem", color: "#2563eb", marginTop: "0.25rem", fontWeight: 600 }}>
            {kpis.responseRateMultiplier !== null
              ? `${kpis.responseRateMultiplier}x vs 31.5% TripAdvisor baseline`
              : "Baseline: 31.5%"}
          </div>
        </div>

        <div
          style={{
            background: "#ffffff",
            padding: "1.25rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <div style={{ fontSize: "0.85rem", color: "#6b7280", fontWeight: 500 }}>Cumulative Hours Reclaimed</div>
          <div style={{ fontSize: "1.85rem", fontWeight: 700, marginTop: "0.25rem", color: "#111827" }}>
            {kpis.hoursReclaimed}h
          </div>
          <div style={{ fontSize: "0.8rem", color: "#6b7280", marginTop: "0.25rem" }}>
            From automated screening & triage
          </div>
        </div>
      </div>

      {/* Row 1: Active Triage Time Tracking (Bar Chart & Details) */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* Triage Time Chart */}
        <div
          style={{
            background: "#ffffff",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 0.5rem 0" }}>
            Triage Time: Measured Active Dwell vs Academic Baseline
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0 0 1.25rem 0" }}>
            Comparison of manual complaint handling duration against Clarity server-measured review triage duration (seconds).
          </p>

          <div style={{ flex: 1, minHeight: "260px" }}>
            {mounted && (
              <ResponsiveContainer width="100%" height={260}>
                <BarChart data={timeComparisonData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis unit="s" />
                  <Tooltip
                    formatter={(val: unknown) => [
                      `${val} seconds (${(Number(val) / 60).toFixed(1)} min)`,
                      "Duration",
                    ]}
                  />
                  <Bar dataKey="seconds" radius={[6, 6, 0, 0]}>
                    {timeComparisonData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div
            style={{
              marginTop: "1rem",
              padding: "0.85rem 1rem",
              background: "#f9fafb",
              borderRadius: "8px",
              fontSize: "0.8rem",
              color: "#4b5563",
              lineHeight: 1.45,
            }}
          >
            <strong>Academic Reference:</strong> Johnston, R. (2001), <em>International Journal of Service Industry Management</em>, 12(1), 60–84.
            Empirical findings show manual triage, root cause classification, and department dispatching takes 10 to 15 minutes (conservative baseline: 600s).
          </div>
        </div>

        {/* Triage Time Statistics Breakdown */}
        <div
          style={{
            background: "#ffffff",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
          }}
        >
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 0.5rem 0" }}>
              Time Tracking Telemetry Details
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0 0 1.25rem 0" }}>
              Calculated using optimistic dwell (interval between last manager view and formal triage decision).
            </p>

            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.9rem" }}>
              <tbody>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.6rem 0", color: "#6b7280" }}>Academic Manual Baseline</td>
                  <td style={{ padding: "0.6rem 0", fontWeight: 600, textAlign: "right" }}>
                    {timeTracking.literatureBenchmarkSeconds}s (10.0 min)
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.6rem 0", color: "#6b7280" }}>Measured Average Active Triage</td>
                  <td style={{ padding: "0.6rem 0", fontWeight: 600, textAlign: "right", color: "#10b981" }}>
                    {timeTracking.averageTriageSeconds !== null ? `${timeTracking.averageTriageSeconds}s` : "No sessions yet"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.6rem 0", color: "#6b7280" }}>Measured Median Active Triage</td>
                  <td style={{ padding: "0.6rem 0", fontWeight: 600, textAlign: "right" }}>
                    {timeTracking.medianTriageSeconds !== null ? `${timeTracking.medianTriageSeconds}s` : "—"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.6rem 0", color: "#6b7280" }}>Min / Max Active Triage</td>
                  <td style={{ padding: "0.6rem 0", fontWeight: 600, textAlign: "right" }}>
                    {timeTracking.minTriageSeconds !== null ? `${timeTracking.minTriageSeconds}s` : "—"} /{" "}
                    {timeTracking.maxTriageSeconds !== null ? `${timeTracking.maxTriageSeconds}s` : "—"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.6rem 0", color: "#6b7280" }}>Triage Time Reduction</td>
                  <td style={{ padding: "0.6rem 0", fontWeight: 700, textAlign: "right", color: "#10b981" }}>
                    {timeTracking.measuredTimeReductionPercent !== null
                      ? `${timeTracking.measuredTimeReductionPercent}%`
                      : "—"}
                  </td>
                </tr>
                <tr style={{ borderBottom: "1px solid #f3f4f6" }}>
                  <td style={{ padding: "0.6rem 0", color: "#6b7280" }}>Tracked vs Total Triaged Reviews</td>
                  <td style={{ padding: "0.6rem 0", fontWeight: 600, textAlign: "right" }}>
                    {timeTracking.trackedReviewsCount} tracked / {timeTracking.totalTriagedReviews} triaged
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: "0.6rem 0", color: "#6b7280" }}>End-to-End Operational Turnaround</td>
                  <td style={{ padding: "0.6rem 0", fontWeight: 600, textAlign: "right" }}>
                    {timeTracking.averageEndToEndResolutionMinutes !== null
                      ? `${timeTracking.averageEndToEndResolutionMinutes} min`
                      : "—"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          <div
            style={{
              marginTop: "1.5rem",
              padding: "0.75rem 1rem",
              background: "#f0fdf4",
              border: "1px solid #bbf7d0",
              borderRadius: "8px",
              fontSize: "0.8rem",
              color: "#166534",
            }}
          >
            ✓ <strong>Zero Guesswork:</strong> Dwell duration is computed on the server in UTC using postgres timestamps recorded when managers actively open and decide tasks.
          </div>
        </div>
      </div>

      {/* Row 2: Review Screening Funnel & Response Readiness */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(480px, 1fr))",
          gap: "1.5rem",
        }}
      >
        {/* Review Screening Funnel (Pie Chart) */}
        <div
          style={{
            background: "#ffffff",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 0.5rem 0" }}>
            Review Intake & Screening Funnel
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0 0 1.25rem 0" }}>
            Distribution of intake reviews triaged into actionable operational feedback vs generic text.
          </p>

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
                    outerRadius={80}
                    innerRadius={45}
                    paddingAngle={3}
                    label={(entry) => `${entry.name} (${entry.value})`}
                  >
                    {funnelPieData.map((entry, index) => (
                      <Cell key={`funnel-cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%", color: "#9ca3af" }}>
                No review funnel data available
              </div>
            )}
          </div>

          <div style={{ display: "flex", justifyContent: "space-around", marginTop: "1rem", textAlign: "center" }}>
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: PIE_COLORS.specific }}>
                {funnel.specificReviewsCount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Actionable</div>
            </div>
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: PIE_COLORS.generic }}>
                {funnel.genericReviewsCount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Generic / Low Signal</div>
            </div>
            <div>
              <div style={{ fontSize: "1.25rem", fontWeight: 700, color: PIE_COLORS.needsReview }}>
                {funnel.needsReviewReviewsCount}
              </div>
              <div style={{ fontSize: "0.75rem", color: "#6b7280" }}>Needs Attention</div>
            </div>
          </div>
        </div>

        {/* Response Readiness vs Industry Baseline (Bar Chart) */}
        <div
          style={{
            background: "#ffffff",
            padding: "1.5rem",
            borderRadius: "12px",
            border: "1px solid #e5e7eb",
            boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
          }}
        >
          <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 0.5rem 0" }}>
            Management Response Readiness
          </h3>
          <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: "0 0 1.25rem 0" }}>
            Evidence-grounded response readiness compared to hospitality baseline.
          </p>

          <div style={{ height: "240px" }}>
            {mounted && (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={responseRateData} margin={{ top: 20, right: 30, left: 10, bottom: 20 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                  <YAxis unit="%" domain={[0, 100]} />
                  <Tooltip formatter={(val: unknown) => [`${val}%`, "Response Rate"]} />
                  <Bar dataKey="rate" radius={[6, 6, 0, 0]}>
                    {responseRateData.map((entry, index) => (
                      <Cell key={`resp-cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div
            style={{
              marginTop: "1rem",
              padding: "0.85rem 1rem",
              background: "#f9fafb",
              borderRadius: "8px",
              fontSize: "0.8rem",
              color: "#4b5563",
              lineHeight: 1.45,
            }}
          >
            <strong>Academic Reference:</strong> Proserpio, M., & Zervas, G. (2017), <em>Marketing Science</em>, 36(5), 645–665.
            Industry analysis shows only 31.5% of reviews receive managerial responses due to staff bandwidth limitations.
          </div>
        </div>
      </div>

      {/* Row 3: Evidence Grounding & Traceability Integrity */}
      <div
        style={{
          background: "#ffffff",
          padding: "1.5rem",
          borderRadius: "12px",
          border: "1px solid #e5e7eb",
          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: "1rem" }}>
          <div>
            <h3 style={{ fontSize: "1.1rem", fontWeight: 600, margin: "0 0 0.35rem 0" }}>
              Evidence Grounding & Hallucination Elimination
            </h3>
            <p style={{ fontSize: "0.85rem", color: "#6b7280", margin: 0 }}>
              Verifies that every extracted observation quote is an exact, verbatim substring of the customer review text.
            </p>
          </div>
          <div style={{ textAlign: "right" }}>
            <span style={{ fontSize: "1.5rem", fontWeight: 700, color: "#2563eb" }}>
              {evidenceIntegrity.traceabilityRatePercent}%
            </span>
            <span style={{ fontSize: "0.85rem", color: "#6b7280", marginLeft: "0.35rem" }}>Verbatim Grounded</span>
          </div>
        </div>

        <div style={{ marginTop: "1rem", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "1rem" }}>
          <div style={{ background: "#f9fafb", padding: "1rem", borderRadius: "8px" }}>
            <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Total Observations</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: "0.2rem" }}>
              {evidenceIntegrity.totalObservations}
            </div>
          </div>
          <div style={{ background: "#f0fdf4", padding: "1rem", borderRadius: "8px" }}>
            <div style={{ fontSize: "0.8rem", color: "#166534" }}>Exact Verbatim Quotes</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: "0.2rem", color: "#15803d" }}>
              {evidenceIntegrity.exactSubstringVerifiedCount}
            </div>
          </div>
          <div style={{ background: "#fef2f2", padding: "1rem", borderRadius: "8px" }}>
            <div style={{ fontSize: "0.8rem", color: "#991b1b" }}>Unverified / External</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: "0.2rem", color: "#b91c1c" }}>
              {evidenceIntegrity.unverifiedCount}
            </div>
          </div>
          <div style={{ background: "#f9fafb", padding: "1rem", borderRadius: "8px" }}>
            <div style={{ fontSize: "0.8rem", color: "#6b7280" }}>Tasks Resolved</div>
            <div style={{ fontSize: "1.3rem", fontWeight: 700, marginTop: "0.2rem" }}>
              {funnel.tasksResolved} / {funnel.tasksApproved} assigned
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
