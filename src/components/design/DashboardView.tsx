import { PageHeading } from "./PageHeading";

type Destination = "reviews" | "issues" | "tasks" | "replies" | "activity";
type MetricItem = {
  title: string;
  value: number;
  hint: string;
  destination: Destination;
  visual?: {
    type: "ratings" | "distribution";
    segments: { label: string; value: number; tone: string }[];
  };
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
type WorkItem = {
  id: string;
  title: string;
  assignee: string;
  due: string;
  status: string;
};

export function DashboardView({
  metrics,
  issues,
  activity,
  work,
  onNewReview,
  onInspect,
  onOpenTask,
  onNavigate,
}: {
  metrics: MetricItem[];
  issues: IssueItem[];
  activity: ActivityItem[];
  work: WorkItem[];
  onNewReview: () => void;
  onInspect: (id: string) => void;
  onOpenTask: (id: string) => void;
  onNavigate: (destination: Destination, metricTitle?: string) => void;
}) {
  // Layout and wording for the dashboard live here; values come from Workspace.
  const [featured, ...rest] = issues;
  const primary = [metrics[0], metrics[3], metrics[4], metrics[5]];
  const attention = metrics[3]?.value || 0;
  return (
    <section className="dashboard">
      <PageHeading
        title="Your workspace"
        description="Guest feedback, the evidence behind it, and the work that follows."
      >
        <button onClick={onNewReview}>Add a review</button>
      </PageHeading>
      <div className="dashboard-context">
        <span>Across all properties</span>
      </div>
      <nav className="metrics" aria-label="Workspace totals">
        {primary.map((metric, index) => (
          <button
            className={`metric metric-${index}`}
            key={metric.title}
            onClick={() => onNavigate(metric.destination, metric.title)}
          >
            <span className="metric-top">{metric.title}</span>
            <strong>{metric.value.toLocaleString()}</strong>
            <span className="metric-hint">{metric.hint}</span>
            {metric.visual && (
              <span
                className={`metric-visual metric-visual-${metric.visual.type}`}
                role="img"
                aria-label={metric.visual.segments
                  .map((segment) => `${segment.label}: ${segment.value}`)
                  .join(", ")}
              >
                {metric.visual.type === "ratings" ? (
                  metric.visual.segments.map((segment) => {
                    const maximum = Math.max(
                      1,
                      ...metric.visual!.segments.map((item) => item.value),
                    );
                    return (
                      <span
                        className="metric-rating-bar"
                        key={segment.label}
                        title={`${segment.label}: ${segment.value}`}
                      >
                        <i
                          style={{ height: `${Math.max(8, (segment.value / maximum) * 100)}%` }}
                        />
                      </span>
                    );
                  })
                ) : (
                  <span className="metric-distribution-track">
                    {metric.visual.segments.map((segment) => (
                      <i
                        className={`metric-segment metric-segment-${segment.tone}`}
                        key={segment.label}
                        title={`${segment.label}: ${segment.value}`}
                        style={{
                          flexGrow: segment.value,
                          flexBasis: 0,
                          minWidth: segment.value ? 2 : 0,
                        }}
                      />
                    ))}
                  </span>
                )}
              </span>
            )}
          </button>
        ))}
      </nav>
      <div className="dashboard-summary">
        <p>
          <span className="summary-dot" aria-hidden="true" />
          {attention ? (
            <>
              <strong>
                {attention} {attention === 1 ? "issue needs" : "issues need"}{" "}
                attention.
              </strong>{" "}
              Review the original evidence before deciding.
            </>
          ) : (
            <>
              <strong>Your issue queue is clear.</strong> New feedback will
              appear here.
            </>
          )}
        </p>
        <div>
          {[metrics[1], metrics[2]].map((metric) => (
            <button
              className="summary-metric"
              key={metric.title}
              onClick={() => onNavigate(metric.destination, metric.title)}
            >
              <strong>{metric.value}</strong> {metric.title}
            </button>
          ))}
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="priority-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">02&nbsp;&nbsp;Guest signals</p>
              <h3>Priority issues</h3>
            </div>
            <button className="link" onClick={() => onNavigate("issues")}>
              All issues
            </button>
          </div>
          {featured ? (
            <>
              <article className="featured-issue">
                <div className="issue-pills">
                  <span
                    className={`priority-chip priority-chip-${featured.priority.toLowerCase()}`}
                  >
                    {featured.priority === "urgent"
                      ? "Immediate"
                      : `${featured.priority} priority`}
                  </span>
                  <span className="neutral-chip">{featured.branchName}</span>
                </div>
                <h4>{featured.title}</h4>
                <p>
                  {featured.support} guest{" "}
                  {featured.support === 1 ? "mention" : "mentions"}
                </p>
                {featured.evidenceQuote && (
                  <blockquote>“{featured.evidenceQuote}”</blockquote>
                )}
                <button
                  className="secondary"
                  onClick={() => onInspect(featured.id)}
                >
                  Inspect the evidence
                </button>
              </article>
              <div className="compact-issues">
                {rest.map((issue, index) => (
                  <button key={issue.id} onClick={() => onInspect(issue.id)}>
                    <span className="issue-number">0{index + 2}</span>
                    <span className="compact-issue-copy">
                      <strong>{issue.title}</strong>
                      <small>
                        {issue.branchName} · {issue.support} reviews
                      </small>
                    </span>
                    <span
                      className={`priority-chip priority-chip-${issue.priority.toLowerCase()}`}
                    >
                      {issue.priority}
                    </span>
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div className="dashboard-empty">
              <h4>No issues need attention.</h4>
              <p>
                Review your guest feedback to explore individual observations.
              </p>
              <button className="link" onClick={() => onNavigate("reviews")}>
                Explore reviews
              </button>
            </div>
          )}
        </section>
        <section className="activity-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">03&nbsp;&nbsp;Workspace history</p>
              <h3>Recent activity</h3>
            </div>
            <button
              className="link"
              onClick={() => onNavigate("activity")}
              aria-label="View all activity"
            >
              View all
            </button>
          </div>
          <ol className="activity-preview-list">
            {activity.map((item) => (
              <li className="activity-preview" key={item.id}>
                <span className="timeline-marker" aria-hidden="true" />
                <div>
                  <time>{item.date}</time>
                  <strong>{item.title}</strong>
                  <p>{item.description}</p>
                </div>
              </li>
            ))}
          </ol>
          {!activity.length && (
            <p className="dashboard-empty">
              No activity yet. Add a review to begin.
            </p>
          )}
        </section>
        <section className="work-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">04&nbsp;&nbsp;Follow through</p>
              <h3>Work in focus</h3>
            </div>
            <button
              className="link"
              onClick={() => onNavigate("tasks")}
              aria-label="View all work tasks"
            >
              All work
            </button>
          </div>
          {work.length ? (
            <div className="work-preview-list">
              {work.map((item) => (
                <button
                  className="work-preview"
                  key={item.id}
                  onClick={() => onOpenTask(item.id)}
                >
                  <span
                    className={`work-state ${item.status === "reported" ? "reported" : ""}`}
                  >
                    {item.status === "reported"
                      ? "Ready to verify"
                      : ["proposed", "deferred"].includes(item.status)
                        ? "Awaiting approval"
                        : "Assigned"}
                  </span>
                  <strong>{item.title}</strong>
                  <span>{item.assignee}</span>
                  <small>{item.due}</small>
                </button>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <h4>No open work.</h4>
              <p>Confirm an issue to create and assign a work task.</p>
              <button className="link" onClick={() => onNavigate("tasks")}>
                View work history
              </button>
            </div>
          )}
        </section>
      </div>
      <div className="dashboard-footnote">
        <span>Original words. Traceable decisions.</span>
        <span>Clarity / Review workspace</span>
      </div>
    </section>
  );
}
