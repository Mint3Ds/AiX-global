"use client";
import { useCallback, useEffect, useMemo, useState } from "react";

type Review = {
  id: string;
  branchId: string;
  source: string;
  sourceReviewId: string;
  rating: number;
  reviewedAt: string;
  originalText: string;
  processingStatus: string;
  processingStage: string | null;
  language: string;
};
type Observation = {
  id: string;
  reviewId: string;
  branchId: string;
  category: string;
  aspect: string;
  kind: string;
  sentiment: string;
  summary: string;
  normalizedDescription: string;
  evidenceQuote: string;
  provider: string;
  mode: string;
};
type Theme = {
  id: string;
  branchId: string;
  title: string;
  type: string;
  status: string;
  priority: string;
  priorityReason: string;
  severity: number;
};
type Membership = {
  themeId: string;
  observationId: string;
  source: string;
  confirmation: string;
};
type Task = {
  id: string;
  themeId: string;
  title: string;
  description: string;
  assigneeRole: string;
  status: string;
  resolutionNote: string | null;
  approvedAt: string | null;
  resolvedAt: string | null;
};
type Reply = {
  id: string;
  reviewId: string;
  taskId: string;
  text: string;
  status: string;
  provider: string;
  mode: string;
};
type Run = {
  id: string;
  reviewId: string;
  decision: string;
  screeningProvider: string;
  screeningModel: string | null;
  extractionProvider: string | null;
  extractionModel: string | null;
  matchingProvider: string | null;
  mode: string;
  safeError: string | null;
  createdAt: string;
};
type Event = {
  id: string;
  actor: string;
  role: string;
  type: string;
  entityType: string;
  entityId: string;
  description: string;
  metadata: unknown;
  createdAt: string;
};
type State = {
  mode: string;
  synthetic: boolean;
  reviews: Review[];
  observations: Observation[];
  themes: Theme[];
  memberships: Membership[];
  tasks: Task[];
  replies: Reply[];
  runs: Run[];
  events: Event[];
  handoffs: {
    id: string;
    approvedTaskId: string;
    payload: Record<string, unknown>;
    simulatedStatus: string;
    createdAt: string;
  }[];
  themeSupport: Record<string, number>;
};
type Tab =
  "dashboard" | "reviews" | "issues" | "new" | "tasks" | "replies" | "activity";
const demoText =
  "The booth rocked when I leaned back, but the fried rice was beautifully smoky.";
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kuala_Lumpur",
      })
    : "—";
const label = (value: string) => value.replaceAll("_", " ");
const pointType = (kind: string) =>
  kind === "operational_complaint"
    ? "operational_issue"
    : kind === "suggestion"
      ? "suggestion"
      : "positive_pattern";

export function Workspace() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [role, setRole] = useState<"owner" | "staff">("owner");
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] = useState<string>("sunway-seating");
  const [selectedTask, setSelectedTask] = useState<string>(
    "task-sunway-seating",
  );
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [rating, setRating] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [newText, setNewText] = useState(demoText);
  const [newBranch, setNewBranch] = useState("sunway");
  const [newRating, setNewRating] = useState(4);
  const [newSourceId, setNewSourceId] = useState("synthetic-demo-source-001");
  const [resolution, setResolution] = useState("");
  const [manualQuote, setManualQuote] = useState("");
  const [manualSummary, setManualSummary] = useState("");

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load data");
      setState(body);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load data",
      );
    }
  }, []);
  useEffect(() => {
    void fetch("/api/state", { cache: "no-store" })
      .then(async (response) => {
        const body = await response.json();
        if (!response.ok) throw new Error(body.error || "Could not load data");
        setState(body);
      })
      .catch((reason) =>
        setError(
          reason instanceof Error ? reason.message : "Could not load data",
        ),
      );
  }, []);
  const act = useCallback(
    async (type: string, values: Record<string, unknown> = {}) => {
      setBusy(type);
      setMessage("");
      setError("");
      try {
        const response = await fetch("/api/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, role, ...values }),
        });
        const body = await response.json();
        if (!response.ok || !body.ok)
          throw new Error(body.error || "Action failed");
        await refresh();
        setMessage(`${label(type)} saved.`);
        return body.result;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Action failed");
        return null;
      } finally {
        setBusy("");
      }
    },
    [refresh, role],
  );
  const submitNew = async (event: React.FormEvent) => {
    event.preventDefault();
    const result = (await act("intake", {
      data: {
        branchId: newBranch,
        source: "Demo Feedback Form",
        sourceReviewId: newSourceId.trim(),
        rating: Number(newRating),
        reviewedAt: new Date().toISOString(),
        text: newText,
        isSynthetic: true,
      },
    })) as { reviewId?: string } | null;
    if (!result?.reviewId) return;
    setSelectedReview(result.reviewId);
    setTab("reviews");
    setMessage("Review saved. Screening is starting…");
    const poll = setInterval(() => void refresh(), 1000);
    const outcome = (await act("analyze", {
      reviewId: result.reviewId,
    }).finally(() => clearInterval(poll))) as {
      status?: string;
      provider?: string;
      changedThemes?: string[];
      error?: string;
    } | null;
    if (outcome) {
      setMessage(
        `Review ${outcome.status}. Screening: ${outcome.provider || (state?.mode === "fixture" ? "fixture" : "provider unavailable")}. ${outcome.changedThemes?.length ? "Theme updated." : ""}`,
      );
      setTab("reviews");
    }
  };
  const selected = state?.reviews.find(
    (review) => review.id === selectedReview,
  );
  const theme = state?.themes.find((item) => item.id === selectedTheme);
  const task = state?.tasks.find((item) => item.id === selectedTask);
  const themeObservations = useMemo(
    () =>
      state?.observations.filter((observation) =>
        state.memberships.some(
          (membership) =>
            membership.themeId === selectedTheme &&
            membership.observationId === observation.id,
        ),
      ) || [],
    [state, selectedTheme],
  );
  const filtered = useMemo(
    () =>
      state?.reviews.filter((review) => {
        const points = state.observations.filter(
          (observation) => observation.reviewId === review.id,
        );
        const query = search.toLowerCase();
        return (
          (branch === "all" || review.branchId === branch) &&
          (rating === "all" || review.rating === Number(rating)) &&
          (status === "all" || review.processingStatus === status) &&
          (category === "all" ||
            points.some((point) => point.category === category)) &&
          (!query ||
            review.originalText.toLowerCase().includes(query) ||
            points.some((point) =>
              `${point.summary} ${point.normalizedDescription}`
                .toLowerCase()
                .includes(query),
            ))
        );
      }) || [],
    [state, search, branch, rating, category, status],
  );
  const reviewPoints =
    selected && state
      ? state.observations.filter((point) => point.reviewId === selected.id)
      : [];
  const latestRun =
    selected && state
      ? state.runs.find((run) => run.reviewId === selected.id)
      : null;
  const categories = [
    ...new Set(
      state?.observations.map((observation) => observation.category) || [],
    ),
  ].sort();
  const openTheme = (id: string) => {
    setSelectedTheme(id);
    setTab("issues");
  };
  const openReview = (id: string) => {
    setSelectedReview(id);
    setTab("reviews");
  };
  const openTask = (id: string) => {
    setSelectedTask(id);
    setTab("tasks");
  };
  const owner = role === "owner";

  return (
    <div className="shell">
      <header className="top">
        <div>
          <h1>Visit2Value</h1>
          <p>Customer evidence → owner decision → visible action</p>
        </div>
        <div className="badges">
          <strong>Synthetic demo data</strong>
          <strong className={state?.mode === "live" ? "live" : "fixture"}>
            AI mode: {state?.mode || "loading"}
          </strong>
          <label>
            Demo role{" "}
            <select
              value={role}
              onChange={(event) =>
                setRole(event.target.value as "owner" | "staff")
              }
            >
              <option value="owner">Owner</option>
              <option value="staff">Staff</option>
            </select>
          </label>
        </div>
      </header>
      <nav aria-label="Main navigation">
        {(
          [
            "dashboard",
            "reviews",
            "issues",
            "new",
            "tasks",
            "replies",
            "activity",
          ] as Tab[]
        ).map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => setTab(item)}
          >
            {item === "new"
              ? "New review"
              : item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>
      {error && (
        <div role="alert" className="notice error">
          {error} <button onClick={() => void refresh()}>Retry load</button>
        </div>
      )}
      {message && (
        <div role="status" className="notice">
          {message}
        </div>
      )}
      {!state ? (
        <main>
          <p>
            {error
              ? "Database unavailable. Check DATABASE_URL, then run migration and seed."
              : "Loading workspace…"}
          </p>
        </main>
      ) : (
        <main>
          {tab === "dashboard" && (
            <section>
              <h2>Nusa Table overview</h2>
              <p className="muted">
                Fictional Malaysian casual restaurant · Sunway and Bangsar
                branches · no live review platforms connected
              </p>
              <div className="metrics">
                <Metric title="Reviews" value={state.reviews.length} />
                <Metric
                  title="Specific feedback"
                  value={
                    state.reviews.filter(
                      (review) => review.processingStatus === "complete",
                    ).length
                  }
                />
                <Metric
                  title="Issues needing attention"
                  value={
                    state.themes.filter(
                      (theme) =>
                        theme.type === "operational_issue" &&
                        theme.status === "suggested",
                    ).length
                  }
                />
                <Metric
                  title="Open approved tasks"
                  value={
                    state.tasks.filter(
                      (task) => task.status === "approved_open",
                    ).length
                  }
                />
                <Metric
                  title="Replies to approve"
                  value={
                    state.replies.filter((reply) => reply.status === "draft")
                      .length
                  }
                />
              </div>
              <div className="card feature">
                <p className="eyebrow">Suggested operational issue · Sunway</p>
                <h3>Unsteady seating</h3>
                <p>
                  {
                    state.themes.find((theme) => theme.id === "sunway-seating")
                      ?.priorityReason
                  }
                </p>
                <p>
                  <b>
                    {state.themeSupport["sunway-seating"] || 0} distinct source
                    reviews
                  </b>{" "}
                  currently support this theme. Each quote is available for
                  inspection.
                </p>
                <button onClick={() => openTheme("sunway-seating")}>
                  Inspect seating evidence
                </button>
              </div>
              <div className="two">
                <div className="card">
                  <h3>Try the complete journey</h3>
                  <p>
                    Enter the separate synthetic demo review, check its two
                    observations, inspect the seating theme, approve and resolve
                    the task, then prepare a reply.
                  </p>
                  <button onClick={() => setTab("new")}>
                    Enter demo review
                  </button>
                </div>
                <div className="card">
                  <h3>Processing boundaries</h3>
                  <p>
                    Fixture results are marked as fixtures. Live mode uses Jev
                    with OpenAI fallback for screening, then OpenAI for
                    extraction and matching. Tasks and replies need owner
                    approval.
                  </p>
                </div>
              </div>
            </section>
          )}
          {tab === "new" && (
            <section>
              <h2>Enter a synthetic review</h2>
              <p className="muted">
                The short demo review below is separate from the 80 seeded
                reviews. In fixture mode, exact text matching provides
                deterministic analysis; changed text can require manual review.
              </p>
              <form className="card form" onSubmit={submitNew}>
                <label>
                  Branch
                  <select
                    value={newBranch}
                    onChange={(event) => setNewBranch(event.target.value)}
                  >
                    <option value="sunway">Nusa Table Sunway</option>
                    <option value="bangsar">Nusa Table Bangsar</option>
                  </select>
                </label>
                <label>
                  Rating
                  <select
                    value={newRating}
                    onChange={(event) =>
                      setNewRating(Number(event.target.value))
                    }
                  >
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value} stars
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Synthetic source review ID
                  <input
                    value={newSourceId}
                    onChange={(event) => setNewSourceId(event.target.value)}
                    required
                  />
                </label>
                <label className="wide">
                  Original review text
                  <textarea
                    rows={4}
                    value={newText}
                    onChange={(event) => setNewText(event.target.value)}
                    required
                  />
                </label>
                <button disabled={!!busy}>
                  {busy ? "Working…" : "Save and analyse"}
                </button>
              </form>
            </section>
          )}
          {tab === "reviews" && (
            <section>
              <h2>Source reviews</h2>
              <p className="muted">
                All saved reviews remain searchable, including generic and
                pending ones.
              </p>
              <div className="filters">
                <label>
                  Search
                  <input
                    placeholder="Review text or observation"
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <label>
                  Branch
                  <select
                    value={branch}
                    onChange={(event) => setBranch(event.target.value)}
                  >
                    <option value="all">All</option>
                    <option value="sunway">Sunway</option>
                    <option value="bangsar">Bangsar</option>
                  </select>
                </label>
                <label>
                  Rating
                  <select
                    value={rating}
                    onChange={(event) => setRating(event.target.value)}
                  >
                    <option value="all">All</option>
                    {[1, 2, 3, 4, 5].map((value) => (
                      <option key={value} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Category
                  <select
                    value={category}
                    onChange={(event) => setCategory(event.target.value)}
                  >
                    <option value="all">All</option>
                    {categories.map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Status
                  <select
                    value={status}
                    onChange={(event) => setStatus(event.target.value)}
                  >
                    <option value="all">All</option>
                    {[
                      "pending",
                      "processing",
                      "complete",
                      "generic",
                      "needs_review",
                      "failed",
                    ].map((value) => (
                      <option key={value} value={value}>
                        {label(value)}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <p>
                {filtered.length} matching reviews ·{" "}
                <button
                  disabled={!!busy}
                  onClick={() => void act("analyze_batch", { limit: 5 })}
                >
                  Analyse up to 5 pending
                </button>
              </p>
              <div className="split">
                <div className="review-list">
                  {filtered.length ? (
                    filtered.map((review) => (
                      <button
                        key={review.id}
                        className={`review-row ${selectedReview === review.id ? "chosen" : ""}`}
                        onClick={() => setSelectedReview(review.id)}
                      >
                        <span>
                          <b>{review.rating}★</b> · {review.branchId} ·{" "}
                          {label(review.processingStatus)}
                        </span>
                        <small>
                          {review.source} · {date(review.reviewedAt)}
                        </small>
                        <span>
                          {review.originalText.slice(0, 135)}
                          {review.originalText.length > 135 ? "…" : ""}
                        </span>
                      </button>
                    ))
                  ) : (
                    <div className="card">No reviews match these filters.</div>
                  )}
                </div>
                <div className="card detail">
                  {selected ? (
                    <>
                      <p className="eyebrow">
                        {selected.id} · {selected.branchId} · {selected.source}{" "}
                        · {selected.rating} stars · {date(selected.reviewedAt)}
                      </p>
                      <h3>Original review</h3>
                      <blockquote>{selected.originalText}</blockquote>
                      <p>
                        <b>Status:</b> {label(selected.processingStatus)}
                        {selected.processingStage
                          ? ` · stage: ${label(selected.processingStage)}`
                          : ""}{" "}
                        · <b>Source ID:</b> {selected.sourceReviewId}
                      </p>
                      {latestRun && (
                        <div className="provider">
                          <b>Analysis:</b> {label(latestRun.decision)} ·{" "}
                          {latestRun.mode} mode
                          <br />
                          Screening: {label(latestRun.screeningProvider)}
                          {latestRun.screeningModel
                            ? ` (${latestRun.screeningModel})`
                            : ""}{" "}
                          · Extraction:{" "}
                          {latestRun.extractionProvider || "not needed"} · Theme
                          matching: {latestRun.matchingProvider || "not needed"}
                          {latestRun.safeError && <p>{latestRun.safeError}</p>}
                        </div>
                      )}
                      <h3>Separate observations</h3>
                      {reviewPoints.length ? (
                        reviewPoints.map((point) => {
                          const membership = state.memberships.find(
                            (m) => m.observationId === point.id,
                          );
                          return (
                            <div className="observation" key={point.id}>
                              <p>
                                <b>{label(point.kind)}</b> ·{" "}
                                {label(point.category)} / {label(point.aspect)}{" "}
                                · {point.provider} ({point.mode})
                              </p>
                              <blockquote>“{point.evidenceQuote}”</blockquote>
                              <p>{point.summary}</p>
                              <p>
                                Theme:{" "}
                                {membership ? (
                                  <button
                                    className="link"
                                    onClick={() =>
                                      openTheme(membership.themeId)
                                    }
                                  >
                                    {state.themes.find(
                                      (theme) =>
                                        theme.id === membership.themeId,
                                    )?.title || membership.themeId}
                                  </button>
                                ) : (
                                  "ungrouped"
                                )}
                              </p>
                              {owner && (
                                <label>
                                  Owner grouping{" "}
                                  <select
                                    value={membership?.themeId || ""}
                                    onChange={(event) =>
                                      void act("membership", {
                                        observationId: point.id,
                                        themeId: event.target.value || null,
                                      })
                                    }
                                  >
                                    <option value="">Leave ungrouped</option>
                                    {state.themes
                                      .filter(
                                        (theme) =>
                                          theme.branchId === point.branchId &&
                                          theme.type === pointType(point.kind),
                                      )
                                      .map((theme) => (
                                        <option key={theme.id} value={theme.id}>
                                          {theme.title}
                                        </option>
                                      ))}
                                  </select>
                                </label>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p className="muted">
                          No specific observations stored.
                        </p>
                      )}
                      {["pending", "failed", "needs_review"].includes(
                        selected.processingStatus,
                      ) && (
                        <div>
                          <button
                            disabled={!!busy}
                            onClick={() =>
                              void act("analyze", { reviewId: selected.id })
                            }
                          >
                            Retry analysis
                          </button>
                          {owner && (
                            <div className="manual">
                              <h4>Manual owner review</h4>
                              <button
                                onClick={() =>
                                  void act("manual_classify", {
                                    reviewId: selected.id,
                                    data: { useful: false },
                                  })
                                }
                              >
                                Mark generic
                              </button>
                              <label>
                                Exact evidence quote
                                <input
                                  value={manualQuote}
                                  onChange={(event) =>
                                    setManualQuote(event.target.value)
                                  }
                                />
                              </label>
                              <label>
                                Short summary
                                <input
                                  value={manualSummary}
                                  onChange={(event) =>
                                    setManualSummary(event.target.value)
                                  }
                                />
                              </label>
                              <button
                                onClick={() =>
                                  void act("manual_classify", {
                                    reviewId: selected.id,
                                    data: {
                                      useful: true,
                                      observation: {
                                        category: "other",
                                        aspect: "owner_observation",
                                        kind: "other_specific_feedback",
                                        sentiment: "neutral",
                                        evidenceQuote: manualQuote,
                                        summary: manualSummary,
                                        normalizedDescription: manualSummary,
                                      },
                                    },
                                  })
                                }
                              >
                                Save specific observation
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </>
                  ) : (
                    <p>
                      Choose a review to inspect its original wording and
                      analysis.
                    </p>
                  )}
                </div>
              </div>
            </section>
          )}
          {tab === "issues" && (
            <section>
              <h2>Issues and insights</h2>
              <p className="muted">
                Themes are suggestions. Counts use distinct source reviews at
                one branch. Owner corrections update them.
              </p>
              <div className="split">
                <div className="review-list">
                  {(
                    [
                      "operational_issue",
                      "suggestion",
                      "positive_pattern",
                    ] as const
                  ).map((type) => (
                    <div key={type}>
                      <h3>
                        {type === "operational_issue"
                          ? "Operational issues"
                          : type === "suggestion"
                            ? "Customer suggestions"
                            : "Positive patterns"}
                      </h3>
                      {state.themes
                        .filter((theme) => theme.type === type)
                        .map((item) => (
                          <button
                            key={item.id}
                            className={`review-row ${selectedTheme === item.id ? "chosen" : ""}`}
                            onClick={() => setSelectedTheme(item.id)}
                          >
                            <b>{item.title}</b>
                            <span>
                              {item.branchId} ·{" "}
                              {state.themeSupport[item.id] || 0} distinct
                              reviews · {item.priority}
                            </span>
                            <small>{label(item.status)}</small>
                          </button>
                        ))}
                    </div>
                  ))}
                </div>
                <div className="card detail">
                  {theme ? (
                    <>
                      <p className="eyebrow">
                        {theme.branchId} · {label(theme.type)} ·{" "}
                        {label(theme.status)}
                      </p>
                      <h3>{theme.title}</h3>
                      <p>
                        <b>
                          {state.themeSupport[theme.id] || 0} distinct reviews
                        </b>{" "}
                        · suggested priority: {theme.priority}
                      </p>
                      <p>{theme.priorityReason}</p>
                      {owner && (
                        <div className="controls">
                          <label>
                            Owner severity
                            <select
                              value={theme.severity}
                              onChange={(event) =>
                                void act("severity", {
                                  themeId: theme.id,
                                  severity: Number(event.target.value),
                                })
                              }
                            >
                              <option value={1}>1 · low</option>
                              <option value={2}>2 · medium</option>
                              <option value={3}>3 · safety concern</option>
                            </select>
                          </label>
                          {theme.status === "suggested" && (
                            <>
                              <button
                                onClick={() =>
                                  void act("theme_status", {
                                    themeId: theme.id,
                                    status: "owner_confirmed",
                                  })
                                }
                              >
                                Confirm theme
                              </button>
                              <button
                                className="secondary"
                                onClick={() =>
                                  void act("theme_status", {
                                    themeId: theme.id,
                                    status: "dismissed",
                                  })
                                }
                              >
                                Dismiss
                              </button>
                            </>
                          )}
                        </div>
                      )}
                      <h4>Original evidence</h4>
                      {themeObservations.length ? (
                        themeObservations.map((point) => {
                          const review = state.reviews.find(
                            (r) => r.id === point.reviewId,
                          );
                          const membership = state.memberships.find(
                            (m) => m.observationId === point.id,
                          );
                          return (
                            <div className="observation" key={point.id}>
                              <p>
                                <button
                                  className="link"
                                  onClick={() => openReview(point.reviewId)}
                                >
                                  {point.reviewId}
                                </button>{" "}
                                · {review?.rating}★ · {review?.source} ·{" "}
                                {date(review?.reviewedAt || null)} ·{" "}
                                {membership?.source}
                              </p>
                              <blockquote>“{point.evidenceQuote}”</blockquote>
                              <p>{point.summary}</p>
                              {owner && (
                                <label>
                                  Correct grouping
                                  <select
                                    value={theme.id}
                                    onChange={(event) =>
                                      void act("membership", {
                                        observationId: point.id,
                                        themeId: event.target.value || null,
                                      })
                                    }
                                  >
                                    <option value={theme.id}>
                                      Keep in this theme
                                    </option>
                                    <option value="">Leave ungrouped</option>
                                    {state.themes
                                      .filter(
                                        (other) =>
                                          other.id !== theme.id &&
                                          other.branchId === point.branchId &&
                                          other.type === theme.type,
                                      )
                                      .map((other) => (
                                        <option key={other.id} value={other.id}>
                                          Move to {other.title}
                                        </option>
                                      ))}
                                  </select>
                                </label>
                              )}
                            </div>
                          );
                        })
                      ) : (
                        <p>No evidence linked yet.</p>
                      )}
                      {theme.type === "operational_issue" && owner && (
                        <button
                          onClick={async () => {
                            const result = (await act("propose_task", {
                              themeId: theme.id,
                            })) as Task | null;
                            if (result) openTask(result.id);
                          }}
                        >
                          Open task proposal
                        </button>
                      )}
                    </>
                  ) : (
                    <p>Choose an issue or insight.</p>
                  )}
                </div>
              </div>
            </section>
          )}
          {tab === "tasks" && (
            <section>
              <h2>Owner-approved work</h2>
              <div className="split">
                <div className="review-list">
                  {state.tasks.map((item) => (
                    <button
                      key={item.id}
                      className={`review-row ${selectedTask === item.id ? "chosen" : ""}`}
                      onClick={() => setSelectedTask(item.id)}
                    >
                      <b>{item.title}</b>
                      <span>
                        {label(item.status)} · {item.assigneeRole}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="card detail">
                  {task ? (
                    <>
                      <p className="eyebrow">
                        {label(task.status)} ·{" "}
                        {
                          state.themes.find(
                            (theme) => theme.id === task.themeId,
                          )?.branchId
                        }
                      </p>
                      <h3>{task.title}</h3>
                      <p>{task.description}</p>
                      <p>
                        <b>Assignee:</b> {task.assigneeRole}
                      </p>
                      <p>
                        <button
                          className="link"
                          onClick={() => openTheme(task.themeId)}
                        >
                          Inspect source evidence before deciding
                        </button>
                      </p>
                      {task.status === "proposed" && owner && (
                        <>
                          <TaskEditor
                            key={`${task.id}:${task.title}:${task.description}:${task.assigneeRole}`}
                            task={task}
                            save={(data) =>
                              void act("edit_task", { taskId: task.id, data })
                            }
                          />
                          <div className="controls">
                            <button
                              onClick={() =>
                                void act("decide_task", {
                                  taskId: task.id,
                                  decision: "approve",
                                })
                              }
                            >
                              Approve task and simulate handoff
                            </button>
                            <button
                              className="secondary"
                              onClick={() =>
                                void act("decide_task", {
                                  taskId: task.id,
                                  decision: "defer",
                                })
                              }
                            >
                              Defer
                            </button>
                            <button
                              className="secondary"
                              onClick={() =>
                                void act("decide_task", {
                                  taskId: task.id,
                                  decision: "reject",
                                })
                              }
                            >
                              Reject
                            </button>
                          </div>
                        </>
                      )}
                      {task.approvedAt && (
                        <p>
                          <b>Approved:</b> {date(task.approvedAt)}
                        </p>
                      )}
                      {state.handoffs
                        .filter((handoff) => handoff.approvedTaskId === task.id)
                        .map((handoff) => (
                          <div className="provider" key={handoff.id}>
                            <b>Simulated Orbyte integration</b> ·{" "}
                            {handoff.simulatedStatus} ·{" "}
                            {date(handoff.createdAt)}
                            <details>
                              <summary>View approved handoff payload</summary>
                              <pre>
                                {JSON.stringify(handoff.payload, null, 2)}
                              </pre>
                            </details>
                          </div>
                        ))}
                      {task.status === "approved_open" && owner && (
                        <div className="form">
                          <label>
                            Truthful resolution note
                            <textarea
                              rows={4}
                              value={resolution}
                              onChange={(event) =>
                                setResolution(event.target.value)
                              }
                              placeholder="What did the team actually inspect, repair, or replace?"
                            />
                          </label>
                          <button
                            onClick={() =>
                              void act("resolve_task", {
                                taskId: task.id,
                                note: resolution,
                              })
                            }
                          >
                            Mark resolved with note
                          </button>
                        </div>
                      )}
                      {task.status === "resolved" && (
                        <>
                          <p>
                            <b>Resolved:</b> {date(task.resolvedAt)}
                          </p>
                          <div className="provider">
                            <b>Owner resolution note:</b> {task.resolutionNote}
                          </div>
                          <h4>Draft a reply for an affected review</h4>
                          {[
                            ...new Set(
                              state.observations
                                .filter((point) =>
                                  state.memberships.some(
                                    (m) =>
                                      m.themeId === task.themeId &&
                                      m.observationId === point.id,
                                  ),
                                )
                                .map((point) => point.reviewId),
                            ),
                          ].map((reviewId) => (
                            <div className="controls" key={reviewId}>
                              <button
                                className="link"
                                onClick={() => openReview(reviewId)}
                              >
                                {reviewId}
                              </button>
                              <button
                                disabled={!owner || !!busy}
                                onClick={() =>
                                  void act("draft_reply", {
                                    reviewId,
                                    taskId: task.id,
                                  })
                                }
                              >
                                Prepare reply
                              </button>
                            </div>
                          ))}
                        </>
                      )}
                    </>
                  ) : (
                    <p>Choose a task.</p>
                  )}
                </div>
              </div>
            </section>
          )}
          {tab === "replies" && (
            <section>
              <h2>Replies ready for owner review</h2>
              <p className="muted">
                Approved replies are ready to post manually. This application
                does not publish to a review platform.
              </p>
              {state.replies.length ? (
                state.replies.map((reply) => (
                  <ReplyCard
                    key={`${reply.id}:${reply.text}:${reply.status}`}
                    reply={reply}
                    review={state.reviews.find(
                      (review) => review.id === reply.reviewId,
                    )}
                    task={state.tasks.find((task) => task.id === reply.taskId)}
                    owner={owner}
                    save={(text) =>
                      void act("edit_reply", { replyId: reply.id, text })
                    }
                    approve={() =>
                      void act("approve_reply", { replyId: reply.id })
                    }
                  />
                ))
              ) : (
                <div className="card">
                  No drafts yet. Resolve an approved task, then choose a linked
                  review.
                </div>
              )}
            </section>
          )}
          {tab === "activity" && (
            <section>
              <h2>Activity record</h2>
              <p className="muted">
                Chronological record of intake, analysis, corrections,
                approvals, simulated handoffs, resolution, and replies.
              </p>
              <div className="card">
                {state.events.map((item) => (
                  <div className="event" key={item.id}>
                    <time>{date(item.createdAt)}</time>
                    <div>
                      <b>{label(item.type)}</b> · {item.actor} ({item.role})
                      <p>{item.description}</p>
                      <small>
                        {item.entityType}: {item.entityId}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </main>
      )}
      <footer>
        Visit2Value · synthetic hackathon prototype · Orbyte handoff is
        simulated · demo roles are not production authentication
      </footer>
    </div>
  );
}
function Metric({ title, value }: { title: string; value: number }) {
  return (
    <div className="metric">
      <strong>{value}</strong>
      <span>{title}</span>
    </div>
  );
}
function TaskEditor({
  task,
  save,
}: {
  task: Task;
  save: (data: {
    title: string;
    description: string;
    assigneeRole: string;
  }) => void;
}) {
  const [title, setTitle] = useState(task.title),
    [description, setDescription] = useState(task.description),
    [assigneeRole, setAssigneeRole] = useState(task.assigneeRole);
  return (
    <div className="form">
      <label>
        Task title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>
      <label>
        Description
        <textarea
          value={description}
          rows={3}
          onChange={(event) => setDescription(event.target.value)}
        />
      </label>
      <label>
        Assignee role
        <input
          value={assigneeRole}
          onChange={(event) => setAssigneeRole(event.target.value)}
        />
      </label>
      <button
        className="secondary"
        onClick={() => save({ title, description, assigneeRole })}
      >
        Save proposal edits
      </button>
    </div>
  );
}
function ReplyCard({
  reply,
  review,
  task,
  owner,
  save,
  approve,
}: {
  reply: Reply;
  review?: Review;
  task?: Task;
  owner: boolean;
  save: (text: string) => void;
  approve: () => void;
}) {
  const [text, setText] = useState(reply.text);
  return (
    <div className="card reply">
      <p className="eyebrow">
        {label(reply.status)} · {reply.provider} ({reply.mode}) ·{" "}
        {reply.reviewId}
      </p>
      <h3>Source review</h3>
      <blockquote>{review?.originalText}</blockquote>
      <p>
        <b>Resolution note:</b> {task?.resolutionNote}
      </p>
      <label>
        Editable draft
        <textarea
          rows={5}
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={!owner}
        />
      </label>
      {owner && (
        <div className="controls">
          <button className="secondary" onClick={() => save(text)}>
            Save edits
          </button>
          {reply.status === "draft" && (
            <button onClick={approve}>Approve · ready to post</button>
          )}
        </div>
      )}
    </div>
  );
}
