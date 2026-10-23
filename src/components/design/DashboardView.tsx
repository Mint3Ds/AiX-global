/** Dashboard presentation. All counts, issues, and activity come from Workspace.tsx. */
type Destination = "reviews" | "issues" | "tasks" | "replies" | "activity";
type MetricItem = {
  title: string;
  value: number;
  hint: string;
  destination: Destination;
};
type IssueItem = {
  id: string;
  title: string;
  priority: string;
  branchName: string;
  support: number;
  evidenceQuote?: string;
};
type ActivityItem = {
  id: string;
  title: string;
  description: string;
  date: string;
};

export function DashboardView({
  metrics,
  issues,
  activity,
  onNewReview,
  onInspect,
  onNavigate,
}: {
  metrics: MetricItem[];
  issues: IssueItem[];
  activity: ActivityItem[];
  onNewReview: () => void;
  onInspect: (id: string) => void;
  onNavigate: (destination: Destination) => void;
}) {
  const [featured, ...rest] = issues;
  return (
    <section className="dashboard">
      <div className="dashboard-heading">
        <div>
          <h2>Overview</h2>
          <p>Click a card to see the details</p>
        </div>
        <button className="dashboard-add" onClick={onNewReview}>
          + Add a review
        </button>
      </div>
      <div className="metrics">
        {metrics.map((metric) => (
          <button
            className="metric"
            key={metric.title}
            onClick={() => onNavigate(metric.destination)}
          >
            <span className="metric-title">{metric.title}</span>
            <strong>{metric.value}</strong>
            <span className="metric-hint">{metric.hint}</span>
          </button>
        ))}
      </div>
      <div className="dashboard-grid">
        <section className="card priority-panel">
          <div className="panel-heading">
            <div>
              <h3>Priority issues</h3>
              <p>Issues needing attention</p>
            </div>
            <button
              className="text-action"
              onClick={() => onNavigate("issues")}
            >
              View all issues →
            </button>
          </div>
          {featured ? (
            <>
              <article className="featured-issue">
                <div className="issue-pills">
                  <span
                    className={`priority-chip priority-chip-${featured.priority.toLowerCase()}`}
                  >
                    {featured.priority}
                  </span>
                  <span className="neutral-chip">{featured.branchName}</span>
                </div>
                <h4>{featured.title}</h4>
                <p>{featured.support} reviews mention this issue.</p>
                {featured.evidenceQuote && (
                  <blockquote>“{featured.evidenceQuote}”</blockquote>
                )}
                <div className="featured-issue-bottom">
                  <span>
                    {featured.support} reviews · {featured.branchName}
                  </span>
                  <button onClick={() => onInspect(featured.id)}>
                    View issue →
                  </button>
                </div>
              </article>
              <div className="compact-issues">
                {rest.map((issue) => (
                  <button key={issue.id} onClick={() => onInspect(issue.id)}>
                    <div>
                      <span
                        className={`priority-chip priority-chip-${issue.priority.toLowerCase()}`}
                      >
                        {issue.priority}
                      </span>
                      <strong>{issue.title}</strong>
                      <small>
                        {issue.support} reviews · {issue.branchName}
                      </small>
                    </div>
                    <span className="compact-inspect">Inspect →</span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <p className="dashboard-empty">No issues need attention.</p>
          )}
        </section>
        <section className="card activity-panel">
          <div className="panel-heading">
            <div>
              <h3>Recent activity</h3>
              <p>Latest updates in your workspace</p>
            </div>
            <button
              className="text-action"
              onClick={() => onNavigate("activity")}
            >
              View all activity →
            </button>
          </div>
          {activity.length ? (
            activity.map((item) => (
              <div className="activity-preview" key={item.id}>
                <div>
                  <strong>{item.title}</strong>
                  <time>{item.date}</time>
                </div>
                <p>{item.description}</p>
              </div>
            ))
          ) : (
            <p className="dashboard-empty">No activity yet.</p>
          )}
        </section>
      </div>
    </section>
  );
}
