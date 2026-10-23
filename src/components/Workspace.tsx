"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardView } from "@/components/design/DashboardView";
import {
  WorkspaceHeader,
  type WorkspaceTab as Tab,
} from "@/components/design/WorkspaceHeader";

type Review = {
  id: string;
  businessId: string;
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
  businessId: string;
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
type EvidenceGroup = {
  key: string;
  quote: string;
  reviews: Review[];
};
type Task = {
  id: string;
  themeId: string;
  title: string;
  description: string;
  assigneeRole: string;
  assigneeId: string | null;
  dueAt: string | null;
  employeeReport: string | null;
  reportedAt: string | null;
  reportedBy: string | null;
  verifiedAt: string | null;
  recurrenceOfTaskId: string | null;
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
  partialWarning: string | null;
  partialApproved: boolean;
  publishedAt: string | null;
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
  selectedBusinessId: string;
  businesses: { id: string; name: string; businessType: string }[];
  branches: { id: string; businessId: string; name: string }[];
  employees: {
    id: string;
    businessId: string;
    branchId: string;
    name: string;
    jobTitle: string;
  }[];
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
const date = (value: string | null) =>
  value
    ? new Date(value).toLocaleString("en-MY", {
        dateStyle: "medium",
        timeStyle: "short",
        timeZone: "Asia/Kuala_Lumpur",
      })
    : "—";
const label = (value: string) =>
  value === "simulated_published" || value === "reply_simulated_published"
    ? "posted"
    : value.replaceAll("_", " ");
function RatingStars({ rating }: { rating: number }) {
  const value = Math.max(0, Math.min(5, rating));
  return (
    <span
      className="rating-stars"
      role="img"
      aria-label={`${value} out of 5 stars`}
    >
      <span className="rating-stars-filled">{"★".repeat(value)}</span>
    </span>
  );
}
function PriorityBadge({ priority }: { priority: string }) {
  const tone = priority.toLowerCase();
  return (
    <span className={`priority-badge priority-${tone}`}>
      {priority} priority
    </span>
  );
}
function EvidenceReviewList({
  reviews,
  onOpenReview,
}: {
  reviews: Review[];
  onOpenReview: (review: Review) => void;
}) {
  return (
    <ul className="evidence-review-list">
      {reviews.map((review) => {
        return (
          <li key={review.id}>
            <details className="evidence-review-reply">
              <summary>
                <RatingStars rating={review.rating} />
                <time dateTime={review.reviewedAt}>
                  {date(review.reviewedAt)}
                </time>
                <span className="evidence-reply-hint">Review details</span>
              </summary>
              <div className="evidence-reply-content">
                <strong>Original review</strong>
                <p>{review.originalText}</p>
                <button
                  type="button"
                  className="link evidence-view-review"
                  onClick={() => onOpenReview(review)}
                >
                  View in Reviews
                </button>
              </div>
            </details>
          </li>
        );
      })}
    </ul>
  );
}
function PageControls({
  page,
  pageCount,
  onPageChange,
}: {
  page: number;
  pageCount: number;
  onPageChange: (page: number) => void;
}) {
  return (
    <nav className="page-controls" aria-label="List pages">
      <button
        className="secondary"
        type="button"
        disabled={pageCount <= 1 || page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <span>
        Page {page + 1} of {pageCount}
      </span>
      <button
        className="secondary"
        type="button"
        disabled={pageCount <= 1 || page + 1 >= pageCount}
        onClick={() => onPageChange(page + 1)}
      >
        Next
      </button>
    </nav>
  );
}
const priorityRank = (priority: string) =>
  ({ urgent: 4, high: 3, medium: 2, low: 1 })[
    priority.toLowerCase() as "urgent" | "high" | "medium" | "low"
  ] || 0;
const isOwnerVisibleTheme = (theme: Theme, support: number) =>
  theme.type === "operational_issue"
    ? support > 0 &&
      (support >= 4 ||
        theme.priority === "urgent" ||
        ["owner_confirmed", "recurrence"].includes(theme.status))
    : support > 0 || theme.status === "owner_confirmed";

export function Workspace() {
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [role, setRole] = useState<"owner" | "staff">("owner");
  const [businessId, setBusinessId] = useState("harbour-house");
  const [employeeId, setEmployeeId] = useState("hotel-employee-1");
  const [selectedReview, setSelectedReview] = useState<string | null>(null);
  const [selectedTheme, setSelectedTheme] =
    useState<string>("hotel-central-ac");
  const [selectedTask, setSelectedTask] = useState<string>("");
  const [issueType, setIssueType] = useState<
    "operational_issue" | "suggestion"
  >("operational_issue");
  const [issuePage, setIssuePage] = useState(0);
  const [evidencePage, setEvidencePage] = useState(0);
  const [search, setSearch] = useState("");
  const [branch, setBranch] = useState("all");
  const [rating, setRating] = useState("all");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState("all");
  const [newText, setNewText] = useState("");
  const [preparedReviewId, setPreparedReviewId] = useState<string | null>(null);
  const [newBranch, setNewBranch] = useState("hotel-central");
  const [preparedReviews, setPreparedReviews] = useState<
    {
      id: string;
      businessId: string;
      branchId: string;
      source: string;
      sourceReviewId: string;
      rating: number;
      text: string;
    }[]
  >([]);
  const [showReviewChoices, setShowReviewChoices] = useState(false);
  const [newRating, setNewRating] = useState(2);
  const [resolution, setResolution] = useState("");
  const [workReport, setWorkReport] = useState("");

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [tab]);
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/state?businessId=${encodeURIComponent(businessId)}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load data");
      setState(body);
      setError("");
    } catch (reason) {
      setError(
        reason instanceof Error ? reason.message : "Could not load data",
      );
    }
  }, [businessId]);
  useEffect(() => {
    void Promise.resolve().then(refresh);
  }, [refresh]);
  useEffect(() => {
    fetch(`/api/prepared-reviews?businessId=${encodeURIComponent(businessId)}`)
      .then((response) => response.json())
      .then((rows) => setPreparedReviews(Array.isArray(rows) ? rows : []))
      .catch(() => setPreparedReviews([]));
  }, [businessId]);
  const act = useCallback(
    async (type: string, values: Record<string, unknown> = {}) => {
      setBusy(type);
      setMessage("");
      setError("");
      try {
        const response = await fetch("/api/action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ type, role, businessId, ...values }),
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
    [refresh, role, businessId],
  );
  const submitNew = async (event: React.FormEvent) => {
    event.preventDefault();
    const prepared = preparedReviews.find(
      (review) => review.id === preparedReviewId && review.text === newText,
    );
    const sourceId = `guest-${Date.now()}`;
    const result = (await act("intake", {
      data: {
        businessId,
        branchId: newBranch,
        source: prepared?.source || "Guest review form",
        sourceReviewId: sourceId,
        rating: Number(newRating),
        reviewedAt: new Date().toISOString(),
        text: newText,
        isSynthetic: true,
      },
    })) as { reviewId?: string } | null;
    if (!result?.reviewId) return;
    if (prepared) {
      const existing = state?.reviews.find(
        (review) => review.id === prepared.id,
      );
      if (existing) {
        setSelectedReview(existing.id);
        setTab("reviews");
        setMessage(
          `This prepared review is already in the workspace (${label(existing.processingStatus)}).`,
        );
        return;
      }
    }
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
        outcome.status === "needs_review"
          ? "Review saved. Please check the highlighted feedback."
          : outcome.status === "generic"
            ? "Review saved. No specific feedback was found."
            : "Review saved and analyzed.",
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
  const evidenceGroups = useMemo<EvidenceGroup[]>(() => {
    if (!state) return [];
    const reviewsById = new Map(
      state.reviews.map((review) => [review.id, review]),
    );
    const groups = new Map<
      string,
      { quote: string; reviews: Map<string, Review> }
    >();

    for (const point of themeObservations) {
      const quote = point.evidenceQuote.trim().replace(/\s+/g, " ");
      const key = quote ? quote.toLocaleLowerCase() : `observation:${point.id}`;
      const review = reviewsById.get(point.reviewId);
      if (!review) continue;

      if (!groups.has(key)) groups.set(key, { quote, reviews: new Map() });
      groups.get(key)!.reviews.set(review.id, review);
    }

    return Array.from(groups, ([key, group]) => {
      const orderedReviews = Array.from(group.reviews.values()).sort(
        (a, b) =>
          new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime(),
      );
      return {
        key,
        quote: group.quote,
        reviews: orderedReviews,
      };
    }).sort((a, b) => b.reviews.length - a.reviews.length);
  }, [state, themeObservations]);
  const issueThemes = useMemo(() => {
    if (!state) return [];
    return state.themes
      .filter(
        (item) =>
          item.type === issueType &&
          isOwnerVisibleTheme(item, state.themeSupport[item.id] || 0),
      )
      .sort(
        (a, b) =>
          priorityRank(b.priority) - priorityRank(a.priority) ||
          (state.themeSupport[b.id] || 0) - (state.themeSupport[a.id] || 0),
      );
  }, [state, issueType]);
  const issuePageCount = Math.max(1, Math.ceil(issueThemes.length / 5));
  const currentIssuePage = Math.min(issuePage, issuePageCount - 1);
  const visibleIssues = issueThemes.slice(
    currentIssuePage * 5,
    currentIssuePage * 5 + 5,
  );
  const evidencePageCount = Math.max(1, Math.ceil(evidenceGroups.length / 5));
  const currentEvidencePage = Math.min(evidencePage, evidencePageCount - 1);
  const visibleEvidenceGroups = evidenceGroups.slice(
    currentEvidencePage * 5,
    currentEvidencePage * 5 + 5,
  );
  const affectedReviews = useMemo(() => {
    if (!state || !task) return [];
    const reviewIds = new Set(
      state.observations
        .filter((point) =>
          state.memberships.some(
            (membership) =>
              membership.themeId === task.themeId &&
              membership.observationId === point.id,
          ),
        )
        .map((point) => point.reviewId),
    );
    return state.reviews.filter((review) => reviewIds.has(review.id));
  }, [state, task]);
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
      ? state.observations.filter(
          (point) =>
            point.reviewId === selected.id &&
            point.kind === "operational_complaint",
        )
      : [];
  const categories = [
    ...new Set(
      state?.observations.map((observation) => observation.category) || [],
    ),
  ].sort();
  const openTheme = (id: string) => {
    setSelectedTheme(id);
    setEvidencePage(0);
    setTab("issues");
  };
  const changeIssueType = (type: "operational_issue" | "suggestion") => {
    setIssueType(type);
    setIssuePage(0);
    setEvidencePage(0);
    const support = state?.themeSupport || {};
    const firstTheme = (state?.themes || [])
      .filter(
        (item) =>
          item.type === type &&
          isOwnerVisibleTheme(item, support[item.id] || 0),
      )
      .sort(
        (a, b) =>
          priorityRank(b.priority) - priorityRank(a.priority) ||
          (support[b.id] || 0) - (support[a.id] || 0),
      )[0];
    setSelectedTheme(firstTheme?.id || "");
  };
  const changeIssuePage = (page: number) => {
    setIssuePage(page);
    setEvidencePage(0);
    const firstTheme = issueThemes.slice(page * 5, page * 5 + 5)[0];
    setSelectedTheme(firstTheme?.id || "");
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
  const branchName = (id: string) =>
    state?.branches.find((item) => item.id === id)?.name || id;
  const spotlight = state?.themes
    .filter(
      (item) =>
        item.type === "operational_issue" &&
        isOwnerVisibleTheme(item, state.themeSupport[item.id] || 0) &&
        ["suggested", "recurrence"].includes(item.status),
    )
    .sort((a, b) => {
      return (
        priorityRank(b.priority) - priorityRank(a.priority) ||
        b.severity - a.severity ||
        (state.themeSupport[b.id] || 0) - (state.themeSupport[a.id] || 0)
      );
    })[0];
  const spotlightEvidence =
    spotlight && state
      ? state.observations.find((point) =>
          state.memberships.some(
            (membership) =>
              membership.themeId === spotlight.id &&
              membership.observationId === point.id,
          ),
        )
      : null;

  return (
    <div className="shell">
      <WorkspaceHeader
        businesses={
          state?.businesses || [
            { id: "harbour-house", name: "Harbour House Hotel" },
          ]
        }
        businessId={businessId}
        onBusinessChange={(id) => {
          setBusinessId(id);
          setState(null);
          setSelectedReview(null);
          setIssueType("operational_issue");
          setIssuePage(0);
          setEvidencePage(0);
          setSelectedTheme(
            id === "harbour-house"
              ? "hotel-central-ac"
              : id === "nusa-table"
                ? "sunway-seating"
                : "salon-delay",
          );
          setSelectedTask(id === "nusa-table" ? "task-sunway-seating" : "");
          setNewBranch(
            id === "harbour-house"
              ? "hotel-central"
              : id === "nusa-table"
                ? "sunway"
                : "salon-main",
          );
          setNewText("");
          setPreparedReviewId(null);
          setEmployeeId(
            id === "harbour-house"
              ? "hotel-employee-1"
              : id === "nusa-table"
                ? "restaurant-employee-1"
                : "salon-employee-1",
          );
          setBranch("all");
          setSearch("");
          setTab("dashboard");
        }}
        tab={tab}
        role={role}
        onTabChange={(nextTab) => {
          if (
            nextTab === "issues" &&
            !issueThemes.some((item) => item.id === selectedTheme)
          )
            setSelectedTheme(issueThemes[0]?.id || "");
          setTab(nextTab);
        }}
        onRoleChange={setRole}
      />
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
            <DashboardView
              businessName={
                state.businesses.find((business) => business.id === businessId)
                  ?.name || "Business"
              }
              metrics={[
                { title: "Total reviews", value: state.reviews.length },
                {
                  title: "New today",
                  value: state.reviews.filter(
                    (review) =>
                      new Date(review.reviewedAt).toDateString() ===
                      new Date().toDateString(),
                  ).length,
                },
                {
                  title: "Specific feedback",
                  value: state.reviews.filter(
                    (review) => review.processingStatus === "complete",
                  ).length,
                },
                {
                  title: "Issues needing attention",
                  value: state.themes.filter(
                    (theme) =>
                      theme.type === "operational_issue" &&
                      isOwnerVisibleTheme(
                        theme,
                        state.themeSupport[theme.id] || 0,
                      ) &&
                      ["suggested", "recurrence"].includes(theme.status),
                  ).length,
                },
                {
                  title: "Open approved tasks",
                  value: state.tasks.filter(
                    (task) => task.status === "approved_open",
                  ).length,
                },
                {
                  title: "Replies to approve",
                  value: state.replies.filter(
                    (reply) => reply.status === "draft",
                  ).length,
                },
              ]}
              spotlight={
                spotlight
                  ? {
                      id: spotlight.id,
                      title: spotlight.title,
                      priority: spotlight.priority,
                      branchId: branchName(spotlight.branchId),
                      support: state.themeSupport[spotlight.id] || 0,
                      evidenceQuote: spotlightEvidence?.evidenceQuote,
                    }
                  : null
              }
              onNewReview={() => setTab("new")}
              onInspect={openTheme}
            />
          )}
          {tab === "new" && (
            <section>
              <h2>New review</h2>
              <form className="card form" onSubmit={submitNew}>
                <label>
                  Property or branch
                  <select
                    value={newBranch}
                    onChange={(event) => setNewBranch(event.target.value)}
                  >
                    {state.branches.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
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
                <label className="wide">
                  Original review text
                  <textarea
                    rows={4}
                    value={newText}
                    onChange={(event) => {
                      setNewText(event.target.value);
                      setPreparedReviewId(null);
                    }}
                    required
                  />
                </label>
                <button disabled={!!busy}>
                  {busy ? "Working…" : "Save review"}
                </button>
              </form>
              <button
                className="link"
                type="button"
                onClick={() => setShowReviewChoices((show) => !show)}
              >
                {showReviewChoices
                  ? "Hide examples"
                  : "Choose an example review"}
              </button>
              {showReviewChoices && (
                <div className="prepared-reviews">
                  {preparedReviews.map((review) => (
                    <button
                      key={review.id}
                      className={`review-row ${preparedReviewId === review.id ? "chosen" : ""}`}
                      type="button"
                      onClick={() => {
                        setNewBranch(review.branchId);
                        setNewRating(review.rating);
                        setNewText(review.text);
                        setPreparedReviewId(review.id);
                      }}
                    >
                      <b>
                        {review.rating}★ · {branchName(review.branchId)}
                      </b>
                      <span>{review.text}</span>
                    </button>
                  ))}
                </div>
              )}
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
                  Property or branch
                  <select
                    value={branch}
                    onChange={(event) => setBranch(event.target.value)}
                  >
                    <option value="all">All</option>
                    {state.branches.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
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
              <p>{filtered.length} reviews</p>
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
                          <b>{review.rating}★</b> ·{" "}
                          {branchName(review.branchId)} ·{" "}
                          {label(review.processingStatus)}
                        </span>
                        <small>{date(review.reviewedAt)}</small>
                        <span>{review.originalText}</span>
                      </button>
                    ))
                  ) : (
                    <div className="card">No reviews match these filters.</div>
                  )}
                </div>
                <div className="card detail review-detail">
                  {selected ? (
                    <>
                      <div className="review-meta">
                        <span>{branchName(selected.branchId)}</span>
                        <RatingStars rating={selected.rating} />
                        <time>{date(selected.reviewedAt)}</time>
                        <span className="status-pill">
                          {label(selected.processingStatus)}
                        </span>
                      </div>
                      <h3>Original review</h3>
                      <blockquote className="review-original">
                        {selected.originalText}
                      </blockquote>
                      {state.replies.find(
                        (reply) => reply.reviewId === selected.id,
                      ) && (
                        <p className="reply-status">
                          Reply:{" "}
                          {label(
                            state.replies.find(
                              (reply) => reply.reviewId === selected.id,
                            )!.status,
                          )}
                        </p>
                      )}
                      <h3>Operational complaints</h3>
                      {reviewPoints.length ? (
                        reviewPoints.map((point) => {
                          const membership = state.memberships.find(
                            (m) => m.observationId === point.id,
                          );
                          return (
                            <article className="complaint-card" key={point.id}>
                              <div className="complaint-card-heading">
                                <span>{label(point.category)}</span>
                                {membership && (
                                  <span className="complaint-issue">
                                    {
                                      state.themes.find(
                                        (theme) =>
                                          theme.id === membership.themeId,
                                      )?.title
                                    }
                                  </span>
                                )}
                              </div>
                              <blockquote>“{point.evidenceQuote}”</blockquote>
                              <p className="complaint-summary">
                                {point.summary}
                              </p>
                            </article>
                          );
                        })
                      ) : (
                        <div className="empty-complaints">
                          <b>No operational complaints</b>
                          <p>
                            This review has no reported service or facility
                            issue.
                          </p>
                        </div>
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
                Recurring issues appear after four reviews. Urgent and confirmed
                issues appear sooner; individual feedback stays in Reviews.
              </p>
              <div className="split">
                <div className="issue-list-panel">
                  <div
                    className="issue-category-tabs"
                    role="group"
                    aria-label="Issue category"
                  >
                    {(["operational_issue", "suggestion"] as const).map(
                      (type) => {
                        const count = state.themes.filter(
                          (item) =>
                            item.type === type &&
                            isOwnerVisibleTheme(
                              item,
                              state.themeSupport[item.id] || 0,
                            ),
                        ).length;
                        const active = issueType === type;
                        return (
                          <button
                            key={type}
                            type="button"
                            className={active ? "active" : ""}
                            aria-pressed={active}
                            onClick={() => changeIssueType(type)}
                          >
                            {type === "operational_issue"
                              ? "Issues"
                              : "Suggestions"}
                            <span>{count}</span>
                          </button>
                        );
                      },
                    )}
                  </div>
                  <div className="review-list issue-list-paginated">
                    {visibleIssues.length ? (
                      visibleIssues.map((item) => (
                        <button
                          key={item.id}
                          className={`review-row ${selectedTheme === item.id ? "chosen" : ""}`}
                          onClick={() => {
                            setSelectedTheme(item.id);
                            setEvidencePage(0);
                          }}
                        >
                          <span className="issue-row-heading">
                            <b>{item.title}</b>
                            <PriorityBadge priority={item.priority} />
                          </span>
                          <span className="issue-row-meta">
                            {branchName(item.branchId)} ·{" "}
                            {state.themeSupport[item.id] || 0} reviews
                          </span>
                          <small>{label(item.status)}</small>
                        </button>
                      ))
                    ) : (
                      <p className="muted issue-empty">
                        No{" "}
                        {issueType === "operational_issue"
                          ? "issues"
                          : "suggestions"}{" "}
                        yet.
                      </p>
                    )}
                  </div>
                  <div className="issue-list-footer">
                    <span>
                      {issueThemes.length
                        ? `${currentIssuePage * 5 + 1}–${Math.min(currentIssuePage * 5 + 5, issueThemes.length)} of ${issueThemes.length}`
                        : "0 issues"}
                    </span>
                    <PageControls
                      page={currentIssuePage}
                      pageCount={issuePageCount}
                      onPageChange={changeIssuePage}
                    />
                  </div>
                </div>
                <div className="card detail">
                  {theme ? (
                    <>
                      <div className="issue-detail-heading">
                        <p className="eyebrow">
                          {branchName(theme.branchId)} · {label(theme.status)}
                        </p>
                        <h3>{theme.title}</h3>
                        <div className="issue-title-meta">
                          <span>
                            {state.themeSupport[theme.id] || 0} reviews
                          </span>
                        </div>
                      </div>
                      {owner && (
                        <div className="issue-decision">
                          <div className="issue-decision-header">
                            <div>
                              <div className="issue-decision-label">
                                <strong>Owner decision</strong>
                                <PriorityBadge priority={theme.priority} />
                              </div>
                              <p className="muted">
                                {theme.status === "suggested"
                                  ? theme.type === "operational_issue"
                                    ? "Confirm this issue to make a work task available."
                                    : "Confirm to keep this suggestion for follow-up."
                                  : "Severity sets the issue priority."}
                              </p>
                            </div>
                            <label>
                              Severity
                              <select
                                value={theme.severity}
                                onChange={(event) =>
                                  void act("severity", {
                                    themeId: theme.id,
                                    severity: Number(event.target.value),
                                  })
                                }
                              >
                                <option value={1}>Low</option>
                                <option value={2}>Medium</option>
                                <option value={3}>Safety concern</option>
                              </select>
                            </label>
                          </div>
                          {theme.status === "suggested" && (
                            <div className="issue-decision-actions">
                              <button
                                onClick={() =>
                                  void act("theme_status", {
                                    themeId: theme.id,
                                    status: "owner_confirmed",
                                  })
                                }
                              >
                                Confirm issue
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
                            </div>
                          )}
                        </div>
                      )}
                      <h4>Original evidence</h4>
                      {evidenceGroups.length ? (
                        <div className="evidence-groups">
                          {visibleEvidenceGroups.map((group) => (
                            <section className="evidence-group" key={group.key}>
                              <div className="evidence-group-header">
                                <strong>
                                  {group.reviews.length}{" "}
                                  {group.reviews.length === 1
                                    ? "review"
                                    : "reviews"}
                                </strong>
                                {group.reviews.length > 1 && (
                                  <span>Same feedback</span>
                                )}
                              </div>
                              <blockquote className="evidence-quote">
                                “{group.quote}”
                              </blockquote>
                              <EvidenceReviewList
                                reviews={group.reviews.slice(0, 1)}
                                onOpenReview={(review) => openReview(review.id)}
                              />
                              {group.reviews.length > 1 && (
                                <details className="evidence-more">
                                  <summary>
                                    Show {group.reviews.length - 1} other
                                    reviews
                                  </summary>
                                  <EvidenceReviewList
                                    reviews={group.reviews.slice(1)}
                                    onOpenReview={(review) =>
                                      openReview(review.id)
                                    }
                                  />
                                </details>
                              )}
                            </section>
                          ))}
                          <div className="evidence-page-footer">
                            <span>
                              Showing {currentEvidencePage * 5 + 1}–
                              {Math.min(
                                currentEvidencePage * 5 + 5,
                                evidenceGroups.length,
                              )}{" "}
                              of {evidenceGroups.length} feedback groups
                            </span>
                            <PageControls
                              page={currentEvidencePage}
                              pageCount={evidencePageCount}
                              onPageChange={setEvidencePage}
                            />
                          </div>
                        </div>
                      ) : (
                        <p>No evidence linked yet.</p>
                      )}
                      {theme.type === "operational_issue" && owner && (
                        <button
                          className="create-task-button"
                          onClick={async () => {
                            const result = (await act("propose_task", {
                              themeId: theme.id,
                            })) as Task | null;
                            if (result) openTask(result.id);
                          }}
                        >
                          Create work task
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
              <h2>Work tasks</h2>
              <div className="split">
                <div className="review-list">
                  {state.tasks
                    .filter((item) => item.status !== "proposed")
                    .map((item) => (
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
                        {branchName(
                          state.themes.find(
                            (theme) => theme.id === task.themeId,
                          )?.branchId || "",
                        )}
                      </p>
                      <h3>{task.title}</h3>
                      <p>{task.description}</p>
                      <p>
                        <b>Assigned to:</b>{" "}
                        {state.employees.find(
                          (employee) => employee.id === task.assigneeId,
                        )?.name || task.assigneeRole}
                      </p>
                      <p>
                        <button
                          className="link"
                          onClick={() => openTheme(task.themeId)}
                        >
                          View related issue
                        </button>
                      </p>
                      {task.status === "proposed" && owner && (
                        <>
                          <p className="muted">
                            Choose an employee and due date, then save the
                            proposal before approval.
                          </p>
                          <TaskEditor
                            key={`${task.id}:${task.title}:${task.description}:${task.assigneeRole}`}
                            task={task}
                            employees={state.employees.filter(
                              (employee) =>
                                employee.branchId ===
                                state.themes.find(
                                  (item) => item.id === task.themeId,
                                )?.branchId,
                            )}
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
                              Approve task
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
                              Keep for later
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
                              Decline task
                            </button>
                          </div>
                        </>
                      )}
                      {task.approvedAt && (
                        <p>
                          <b>Approved:</b> {date(task.approvedAt)}
                        </p>
                      )}

                      {role === "staff" && (
                        <label>
                          Employee
                          <select
                            value={employeeId}
                            onChange={(event) =>
                              setEmployeeId(event.target.value)
                            }
                          >
                            {state.employees
                              .filter(
                                (employee) =>
                                  employee.branchId ===
                                  state.themes.find(
                                    (item) => item.id === task.themeId,
                                  )?.branchId,
                              )
                              .map((employee) => (
                                <option key={employee.id} value={employee.id}>
                                  {employee.name} · {employee.jobTitle}
                                </option>
                              ))}
                          </select>
                        </label>
                      )}
                      <p>
                        <b>Due:</b> {date(task.dueAt)}
                      </p>
                      {task.status === "approved_open" &&
                        (owner || task.assigneeId === employeeId) && (
                          <button
                            onClick={() =>
                              void act("start_task", {
                                taskId: task.id,
                                employeeId,
                              })
                            }
                          >
                            Start work
                          </button>
                        )}
                      {["approved_open", "in_progress"].includes(task.status) &&
                        (owner || task.assigneeId === employeeId) && (
                          <div className="form">
                            <label>
                              Employee work report
                              <textarea
                                rows={4}
                                value={workReport}
                                onChange={(event) =>
                                  setWorkReport(event.target.value)
                                }
                                placeholder="What did you actually inspect, repair, or replace?"
                              />
                            </label>
                            <button
                              onClick={() =>
                                void act("report_task", {
                                  taskId: task.id,
                                  employeeId,
                                  note: workReport,
                                })
                              }
                            >
                              Submit work update
                            </button>
                          </div>
                        )}
                      {task.status === "reported" && (
                        <p>
                          <b>Work update:</b> {task.employeeReport}
                        </p>
                      )}
                      {task.status === "reported" && owner && (
                        <div className="form">
                          <label>
                            What did you verify?
                            <textarea
                              rows={4}
                              value={resolution}
                              onChange={(event) =>
                                setResolution(event.target.value)
                              }
                              placeholder="What did you verify? Be specific and truthful."
                            />
                          </label>
                          <button
                            onClick={() =>
                              void act("verify_task", {
                                taskId: task.id,
                                note: resolution,
                              })
                            }
                          >
                            Verify completed work
                          </button>
                        </div>
                      )}
                      {task.status === "resolved" && (
                        <>
                          <p>
                            <b>Resolved:</b> {date(task.resolvedAt)}
                          </p>
                          <p>
                            <b>What was done:</b> {task.resolutionNote}
                          </p>
                          <details className="reply-actions">
                            <summary>
                              Prepare guest replies ({affectedReviews.length})
                            </summary>
                            <div className="reply-review-list">
                              {affectedReviews.map((review) => (
                                <div
                                  className="reply-review-option"
                                  key={review.id}
                                >
                                  <div className="reply-review-content">
                                    <div className="reply-review-meta">
                                      <RatingStars rating={review.rating} />
                                      <time>{date(review.reviewedAt)}</time>
                                    </div>
                                    <button
                                      className="reply-review-text"
                                      onClick={() => openReview(review.id)}
                                    >
                                      {review.originalText}
                                    </button>
                                  </div>
                                  <button
                                    disabled={!owner || !!busy}
                                    onClick={() =>
                                      void act("draft_reply", {
                                        reviewId: review.id,
                                        taskId: task.id,
                                      })
                                    }
                                  >
                                    Draft reply
                                  </button>
                                </div>
                              ))}
                            </div>
                          </details>
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
              <h2>Guest replies</h2>

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
                    selected={false}
                    toggleSelected={() => {}}
                    save={(text) =>
                      void act("edit_reply", { replyId: reply.id, text })
                    }
                    approve={(partialApproved) =>
                      void act("approve_reply", {
                        replyId: reply.id,
                        partialApproved,
                      })
                    }
                    publish={() =>
                      void act("simulate_publish", { replyId: reply.id })
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
                approvals, work updates, resolution, and replies.
              </p>
              <div className="card">
                {state.events
                  .filter((item) => item.type !== "handoff_simulated")
                  .map((item) => (
                    <div className="event" key={item.id}>
                      <time>{date(item.createdAt)}</time>
                      <div>
                        <b>{label(item.type)}</b> ·{" "}
                        {item.actor === "demo owner"
                          ? "Owner"
                          : state.employees.find(
                              (employee) => employee.id === item.actor,
                            )?.name || item.actor}{" "}
                        ({item.role})<p>{item.description}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </section>
          )}
        </main>
      )}
    </div>
  );
}
function TaskEditor({
  task,
  employees,
  save,
}: {
  task: Task;
  employees: State["employees"];
  save: (data: {
    title: string;
    description: string;
    assigneeRole: string;
    assigneeId: string;
    dueAt: string;
  }) => void;
}) {
  const [title, setTitle] = useState(task.title),
    [description, setDescription] = useState(task.description),
    [assigneeRole, setAssigneeRole] = useState(task.assigneeRole),
    [assigneeId, setAssigneeId] = useState(
      task.assigneeId || employees[0]?.id || "",
    ),
    [dueAt, setDueAt] = useState(task.dueAt?.slice(0, 16) || "");
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
      <label>
        Employee
        <select
          value={assigneeId}
          onChange={(event) => setAssigneeId(event.target.value)}
        >
          {employees.map((employee) => (
            <option key={employee.id} value={employee.id}>
              {employee.name} · {employee.jobTitle}
            </option>
          ))}
        </select>
      </label>
      <label>
        Due date
        <input
          type="datetime-local"
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
        />
      </label>
      <button
        className="secondary"
        onClick={() =>
          save({ title, description, assigneeRole, assigneeId, dueAt })
        }
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
  selected,
  toggleSelected,
  save,
  approve,
  publish,
}: {
  reply: Reply;
  review?: Review;
  task?: Task;
  owner: boolean;
  selected: boolean;
  toggleSelected: () => void;
  save: (text: string) => void;
  approve: (partialApproved: boolean) => void;
  publish: () => void;
}) {
  const [text, setText] = useState(reply.text);
  return (
    <div className="card reply">
      <p className="eyebrow">{label(reply.status)}</p>
      <h3>Source review</h3>
      <blockquote>{review?.originalText}</blockquote>
      <p>
        {review?.rating}★ · {date(review?.reviewedAt || null)}
      </p>
      {reply.partialWarning && (
        <div className="notice error" role="alert">
          <b>Partial reply warning:</b> {reply.partialWarning}
        </div>
      )}
      <p>
        <b>Resolution note:</b> {task?.resolutionNote}
      </p>
      <label>
        {reply.status === "simulated_published"
          ? "Posted reply"
          : "Reply draft"}
        <textarea
          rows={5}
          value={text}
          onChange={(event) => setText(event.target.value)}
          disabled={!owner || reply.status === "simulated_published"}
        />
      </label>
      {owner && (
        <div className="controls">
          {reply.status === "draft" && !reply.partialWarning && (
            <label>
              <input
                type="checkbox"
                checked={selected}
                onChange={toggleSelected}
              />{" "}
              Select for batch approval
            </label>
          )}
          {reply.status !== "simulated_published" && (
            <button className="secondary" onClick={() => save(text)}>
              Save edits
            </button>
          )}
          {reply.status === "draft" && (
            <button onClick={() => approve(Boolean(reply.partialWarning))}>
              Approve reply
            </button>
          )}
          {reply.status === "approved_ready" && (
            <button onClick={publish}>Mark as posted</button>
          )}
        </div>
      )}
    </div>
  );
}
