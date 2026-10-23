/** Dashboard presentation. Counts and issue evidence are passed in from Workspace.tsx. */
type MetricItem = { title: string; value: number };
type Spotlight = {
  id: string;
  title: string;
  priority: string;
  priorityReason: string;
  branchId: string;
  status: string;
  support: number;
  evidenceQuote?: string;
};

export function DashboardView({
  businessName,
  businessType,
  metrics,
  spotlight,
  onNewReview,
  onIssues,
  onInspect,
  onGuidedDemo,
}: {
  businessName: string;
  businessType: string;
  metrics: MetricItem[];
  spotlight: Spotlight | null;
  onNewReview: () => void;
  onIssues: () => void;
  onInspect: (id: string) => void;
  onGuidedDemo: () => void;
}) {
  return (
    <section className="dashboard">
      <div className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">
            THE OWNER&apos;S CONTROL ROOM · {businessName.toUpperCase()}
          </p>
          <h2>
            Turn customer words into <em>work that gets done.</em>
          </h2>
          <p>
            Reviews reveal what guests actually experience. Visit2Value finds
            specific signals, connects the evidence, and keeps every owner
            decision traceable.
          </p>
          <div className="hero-actions">
            <button onClick={onNewReview}>
              Run the review demo <span aria-hidden="true">↗</span>
            </button>
            <button className="secondary" onClick={onIssues}>
              See live issues
            </button>
          </div>
          <p className="hero-footnote">
            Fictional {businessType} · synthetic reviews · simulated sources ·
            no review platforms connected
          </p>
        </div>

        {/* A static illustration of the synthetic demo. Actual analysis happens in the review flow. */}
        <div
          className="signal-machine"
          aria-label="Review to action workflow diagram"
        >
          <div className="machine-head">
            <span>VISIT2VALUE / SIGNAL 001</span>
            <span className="machine-lights">● ● ●</span>
          </div>
          <div className="machine-body">
            <div className="machine-review">
              <small>INCOMING REVIEW</small>
              <p>
                {businessType === "hotel"
                  ? "“The AC blew warm air, but the front desk was helpful.”"
                  : businessType === "salon"
                    ? "“My appointment started late, but the stylist explained the cut.”"
                    : "“The booth rocked when I leaned back, but the fried rice was beautifully smoky.”"}
              </p>
              <span>SYNTHETIC REVIEW · SIMULATED SOURCE</span>
            </div>
            <div className="machine-path" aria-hidden="true">
              ↓
            </div>
            <div className="machine-points">
              <div>
                <b>!</b>
                <span>
                  {businessType === "hotel"
                    ? "AC complaint"
                    : businessType === "salon"
                      ? "Appointment delay"
                      : "Unsteady seating"}
                </span>
              </div>
              <div>
                <b>♥</b>
                <span>
                  {businessType === "hotel"
                    ? "Front desk praise"
                    : businessType === "salon"
                      ? "Stylist praise"
                      : "Fried rice praise"}
                </span>
              </div>
            </div>
            <div className="machine-path" aria-hidden="true">
              ↓
            </div>
            <div className="machine-output">EVIDENCE → OWNER → ACTION</div>
          </div>
          <div className="machine-foot">
            SOURCE WORDING PRESERVED <span>● SYSTEM READY</span>
          </div>
        </div>
      </div>

      <div className="section-heading">
        <div>
          <p className="eyebrow">01 / TODAY&apos;S SIGNAL</p>
          <h3>Your review desk, at a glance.</h3>
        </div>
        <span>LIVE COUNTS FROM THE WORKSPACE</span>
      </div>
      <div className="metrics">
        {metrics.map((metric) => (
          <Metric key={metric.title} {...metric} />
        ))}
      </div>

      <div className="dashboard-grid">
        <div className="card feature">
          <p className="eyebrow">02 / NEXT OWNER DECISION</p>
          {spotlight ? (
            <>
              <div className="feature-title">
                <h3>{spotlight.title}</h3>
                <span className="priority-tag">
                  {spotlight.priority} PRIORITY
                </span>
              </div>
              <p>{spotlight.priorityReason}</p>
              {spotlight.evidenceQuote && (
                <blockquote>“{spotlight.evidenceQuote}”</blockquote>
              )}
              <div className="feature-bottom">
                <span>
                  <b>{spotlight.support}</b> distinct reviews ·{" "}
                  {spotlight.branchId} · {spotlight.status.replaceAll("_", " ")}
                </span>
                <button onClick={() => onInspect(spotlight.id)}>
                  Inspect evidence ↗
                </button>
              </div>
            </>
          ) : (
            <p>No suggested operational issues need a decision right now.</p>
          )}
        </div>

        <div className="card demo-card">
          <p className="eyebrow">03 / ONE-MINUTE WALKTHROUGH</p>
          <h3>Follow a review from arrival to action.</h3>
          <p>
            Use the separate synthetic demo review to see distinct observations,
            a recurring issue, a task, and a reply grounded in verified work.
          </p>
          <button className="secondary" onClick={onGuidedDemo}>
            Start guided demo →
          </button>
          <small>
            Every step uses the working app. Orbyte handoff is simulated.
          </small>
        </div>
      </div>
    </section>
  );
}

function Metric({ title, value }: MetricItem) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{title}</span>
    </div>
  );
}
