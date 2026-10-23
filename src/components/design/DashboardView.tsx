/** Dashboard presentation. Counts and issue evidence are passed in from Workspace.tsx. */
type MetricItem = { title: string; value: number };
type Spotlight = {
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
    <section className="dashboard">
      <div className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">{businessName}</p>
          <h2>Needs attention</h2>
          <div className="hero-actions">
            <button onClick={onNewReview}>Add a review</button>
          </div>
        </div>
        <div className="card feature">
          {spotlight ? (
            <>
              <div className="feature-title">
                <h3>{spotlight.title}</h3>
                <span className="priority-tag">{spotlight.priority}</span>
              </div>
              {spotlight.evidenceQuote && (
                <blockquote>“{spotlight.evidenceQuote}”</blockquote>
              )}
              <div className="feature-bottom">
                <span>
                  <b>{spotlight.support}</b> reviews · {spotlight.branchId}
                </span>
                <button onClick={() => onInspect(spotlight.id)}>
                  View issue
                </button>
              </div>
            </>
          ) : (
            <p>No issues need attention.</p>
          )}
        </div>
      </div>

      <div className="section-heading">
        <div>
          <h3>Overview</h3>
        </div>
      </div>
      <div className="metrics">
        {metrics.map((metric) => (
          <Metric key={metric.title} {...metric} />
        ))}
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
