import { PageHeading } from "./PageHeading";

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
        index="01"
        eyebrow="The workspace brief"
        title="Your workspace, at a glance."
        description="Guest feedback, the evidence behind it, and the work that follows."
      >
        <button onClick={onNewReview}>Add a review</button>
      </PageHeading>
      <div className="dashboard-context">
        <span>Across all properties</span>
      </div>
      <div className="metrics">
        {primary.map((metric, index) => (
          <button
            className={`metric metric-${index}`}
            key={metric.title}
            onClick={() => onNavigate(metric.destination, metric.title)}
          >
            <span className="metric-top">
              <span>{metric.title}</span>
              <span aria-hidden="true">↗</span>
            </span>
            <strong>{metric.value.toLocaleString()}</strong>
            <span className="metric-hint">{metric.hint}</span>
          </button>
        ))}
      </div>
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
              <span aria-hidden="true">↗</span>
            </button>
          ))}
        </div>
      </div>
      <div className="dashboard-grid">
        <section className="priority-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">02 / Guest signals</p>
              <h3>Priority issues</h3>
            </div>
            <button className="link" onClick={() => onNavigate("issues")}>
              All issues <span aria-hidden="true">↗</span>
            </button>
          </div>
          {featured ? (
            <>
              <article className="featured-issue">
                <div className="issue-pills">
                  <span
                    className={`priority-chip priority-chip-${featured.priority.toLowerCase()}`}
                  >
                    {featured.priority} priority
                  </span>
                  <span className="neutral-chip">{featured.branchName}</span>
                </div>
                <h4>{featured.title}</h4>
                <p>
                  {featured.support} distinct{" "}
                  {featured.support === 1
                    ? "review mentions"
                    : "reviews mention"}{" "}
                  this issue.
                </p>
                {featured.evidenceQuote && (
                  <blockquote>“{featured.evidenceQuote}”</blockquote>
                )}
                <button
                  className="secondary"
                  onClick={() => onInspect(featured.id)}
                >
                  Inspect the evidence <span aria-hidden="true">↗</span>
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
                    <span aria-hidden="true">↗</span>
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
                Explore reviews →
              </button>
            </div>
          )}
        </section>
        <section className="activity-panel">
          <div className="panel-heading">
            <div>
              <p className="eyebrow">03 / Workspace history</p>
              <h3>Recent activity</h3>
            </div>
            <button
              className="link"
              onClick={() => onNavigate("activity")}
              aria-label="View all activity"
            >
              View all <span aria-hidden="true">↗</span>
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
              <p className="eyebrow">04 / Follow through</p>
              <h3>Work in focus</h3>
            </div>
            <button
              className="link"
              onClick={() => onNavigate("tasks")}
              aria-label="View all work tasks"
            >
              All work <span aria-hidden="true">↗</span>
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
                  <span className="work-arrow" aria-hidden="true">
                    ↗
                  </span>
                </button>
              ))}
            </div>
          ) : (
            <div className="dashboard-empty">
              <h4>No open work.</h4>
              <p>Confirm an issue to create and assign a work task.</p>
              <button className="link" onClick={() => onNavigate("tasks")}>
                View work history →
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
