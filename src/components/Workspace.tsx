"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardView } from "@/components/design/DashboardView";
import { ActivityView } from "@/components/design/ActivityView";
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
      <span className="rating-stars-empty">{"☆".repeat(5 - value)}</span>
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
  const [replyIndex, setReplyIndex] = useState(0);
  const [replyTaskId, setReplyTaskId] = useState<string | null>(null);
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
  const [newRating, setNewRating] = useState(2);
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
  const theme = state?.themes.find((item) => item.id === selectedTheme);
  const openTasks = useMemo(() => {
    const rank: Record<string, number> = {
      reported: 4,
      in_progress: 3,
      approved_open: 2,
      proposed: 1,
      deferred: 1,
    };
    const byIssue = new Map<string, Task>();
    for (const item of state?.tasks || []) {
      if (!(item.status in rank)) continue;
      const previous = byIssue.get(item.themeId);
      if (!previous || rank[item.status] > rank[previous.status])
        byIssue.set(item.themeId, item);
    }
    return [...byIssue.values()];
  }, [state]);
  const selectedTaskRow = state?.tasks.find((item) => item.id === selectedTask);
  const task =
    openTasks.find((item) => item.id === selectedTask) ||
    (selectedTaskRow?.status === "resolved"
      ? selectedTaskRow
      : openTasks.find((item) => item.themeId === selectedTaskRow?.themeId)) ||
    openTasks[0] ||
    state?.tasks.find((item) => item.status === "resolved");
  const replyTask = state?.tasks.find((item) => item.id === replyTaskId);
  const scopedReplyReviewIds = new Set(
    replyTask && state
      ? state.observations
          .filter((point) =>
            state.memberships.some(
              (membership) =>
                membership.themeId === replyTask.themeId &&
                membership.observationId === point.id,
            ),
          )
          .map((point) => point.reviewId)
      : [],
  );
  const currentReplies = (state?.replies || [])
    .filter((reply) => !replyTask || scopedReplyReviewIds.has(reply.reviewId))
    .sort((a, b) => {
      const aDate =
        state?.reviews.find((review) => review.id === a.reviewId)?.reviewedAt ||
        "";
      const bDate =
        state?.reviews.find((review) => review.id === b.reviewId)?.reviewedAt ||
        "";
      return bDate.localeCompare(aDate);
    });
  const currentReplyIndex = Math.min(
    replyIndex,
    Math.max(0, currentReplies.length - 1),
  );
  const batchReplyIds = currentReplies
    .filter((reply) => {
      const themeId = state?.tasks.find(
        (item) => item.id === reply.taskId,
      )?.themeId;
      const severity =
        state?.themes.find((item) => item.id === themeId)?.severity ?? 3;
      return reply.status === "draft" && !reply.partialWarning && severity < 3;
    })
    .map((reply) => reply.id);
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
  const selected =
    filtered.find((review) => review.id === selectedReview) || filtered[0];
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
  const priorityIssues =
    state?.themes
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
      })
      .slice(0, 4) || [];
  const spotlight = priorityIssues[0];
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
  const recentActivity: Event[] = [];
  const seenActivity = new Set<string>();
  for (const item of [...(state?.events || [])].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  )) {
    if (item.type === "handoff_simulated") continue;
    const signature = `${item.type}:${item.description}`;
    if (seenActivity.has(signature)) continue;
    seenActivity.add(signature);
    recentActivity.push(item);
    if (recentActivity.length === 3) break;
  }

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
          setReplyTaskId(null);
          setReplyIndex(0);
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
              metrics={[
                {
                  title: "Total reviews",
                  value: state.reviews.length,
                  hint: "All saved reviews",
                  destination: "reviews",
                },
                {
                  title: "New today",
                  value: state.reviews.filter(
                    (review) =>
                      new Date(review.reviewedAt).toDateString() ===
                      new Date().toDateString(),
                  ).length,
                  hint: "Received today",
                  destination: "reviews",
                },
                {
                  title: "Specific feedback",
                  value: state.reviews.filter(
                    (review) => review.processingStatus === "complete",
                  ).length,
                  hint: "Analysis complete",
                  destination: "reviews",
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
                  hint: "Ready for your review",
                  destination: "issues",
                },
                {
                  title: "Open approved tasks",
                  value: state.tasks.filter(
                    (task) => task.status === "approved_open",
                  ).length,
                  hint: "Work in progress",
                  destination: "tasks",
                },
                {
                  title: "Replies to approve",
                  value: state.replies.filter(
                    (reply) => reply.status === "draft",
                  ).length,
                  hint: "Awaiting sign-off",
                  destination: "replies",
                },
              ]}
              issues={priorityIssues.map((item) => ({
                id: item.id,
                title: item.title,
                priority: item.priority,
                branchName: branchName(item.branchId),
                support: state.themeSupport[item.id] || 0,
                evidenceQuote:
                  item.id === spotlight?.id
                    ? spotlightEvidence?.evidenceQuote
                    : undefined,
              }))}
              activity={recentActivity.map((item) => ({
                id: item.id,
                title: label(item.type),
                description: item.description,
                date: date(item.createdAt),
              }))}
              onNewReview={() => setTab("new")}
              onInspect={openTheme}
              onNavigate={setTab}
            />
          )}
          {tab === "new" && (
            <section className="new-review-page">
              <h2>New review</h2>
              <div className="new-review-layout">
                <form
                  className="card form new-review-form"
                  onSubmit={submitNew}
                >
                  <div className="new-review-form-heading">
                    <h3>Add guest feedback</h3>
                    <p>Save the original wording for analysis.</p>
                  </div>
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
                          {"★".repeat(value)}
                          {"☆".repeat(5 - value)}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="wide">
                    Original review text
                    <textarea
                      rows={8}
                      value={newText}
                      onChange={(event) => {
                        setNewText(event.target.value);
                        setPreparedReviewId(null);
                      }}
                      required
                      placeholder="Paste the guest's review here…"
                    />
                  </label>
                  <div className="new-review-form-footer">
                    <button disabled={!!busy}>
                      {busy ? "Working…" : "Save review"}
                    </button>
                    <span>Analysis starts after saving.</span>
                  </div>
                </form>
                <aside
                  className="card new-review-aside"
                  aria-label={
                    preparedReviews.length
                      ? "Example reviews"
                      : "Recent reviews"
                  }
                >
                  <div className="new-review-aside-heading">
                    <h3>
                      {preparedReviews.length
                        ? "Example reviews"
                        : "Recent reviews"}
                    </h3>
                    <span>
                      {preparedReviews.length
                        ? "Select to fill the form"
                        : "Already in this workspace"}
                    </span>
                  </div>
                  {preparedReviews.length
                    ? preparedReviews.slice(0, 5).map((review) => (
                        <button
                          key={review.id}
                          className={`review-row new-review-sample ${preparedReviewId === review.id ? "chosen" : ""}`}
                          type="button"
                          onClick={() => {
                            setNewBranch(review.branchId);
                            setNewRating(review.rating);
                            setNewText(review.text);
                            setPreparedReviewId(review.id);
                          }}
                        >
                          <b>
                            <RatingStars rating={review.rating} /> ·{" "}
                            {branchName(review.branchId)}
                          </b>
                          <span>{review.text}</span>
                        </button>
                      ))
                    : state.reviews.slice(0, 4).map((review) => (
                        <button
                          key={review.id}
                          className="review-row new-review-sample"
                          type="button"
                          onClick={() => {
                            setSearch("");
                            setBranch("all");
                            setRating("all");
                            setCategory("all");
                            setStatus("all");
                            openReview(review.id);
                          }}
                        >
                          <b>
                            <RatingStars rating={review.rating} /> ·{" "}
                            {branchName(review.branchId)}
                          </b>
                          <small>{date(review.reviewedAt)}</small>
                          <span>{review.originalText}</span>
                        </button>
                      ))}
                  {!preparedReviews.length && (
                    <button
                      type="button"
                      className="link new-review-all-link"
                      onClick={() => setTab("reviews")}
                    >
                      View all reviews →
                    </button>
                  )}
                </aside>
              </div>
            </section>
          )}
          {tab === "reviews" && (
            <section className="reviews-page">
              <h2>Source reviews</h2>
              <p className="muted">
                Search and inspect feedback from every property.
              </p>
              <div className="filters">
                <label>
                  Search text
                  <input
                    placeholder="Search original words or quotes..."
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                  />
                </label>
                <label>
                  Property
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
                  Screening status
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
              <p className="reviews-result-count">
                Showing {filtered.length} of {state.reviews.length} reviews
              </p>
              <div className="split">
                <div className="review-list">
                  {filtered.length ? (
                    filtered.map((review) => (
                      <button
                        key={review.id}
                        className={`review-row ${selected?.id === review.id ? "chosen" : ""}`}
                        onClick={() => setSelectedReview(review.id)}
                      >
                        <span className="review-list-head">
                          <span>
                            <RatingStars rating={review.rating} /> ·{" "}
                            {branchName(review.branchId)}
                          </span>
                          <small className="review-list-status">
                            {label(review.processingStatus)}
                          </small>
                        </span>
                        <span className="review-list-meta">
                          <small>{date(review.reviewedAt)}</small>
                        </span>
                        <span className="review-list-excerpt">
                          {review.originalText}
                        </span>
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
            <section className="issues-page">
              <h2>Issues and insights</h2>
              <p className="muted">
                Recurring issues appear after four reviews. Urgent and confirmed
                issues appear sooner; individual feedback stays in Reviews.
              </p>
              <div
                className="issue-category-tabs"
                role="group"
                aria-label="Issue category"
              >
                {(["operational_issue", "suggestion"] as const).map((type) => {
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
                      {type === "operational_issue" ? "Issues" : "Suggestions"}
                      <span>{count}</span>
                    </button>
                  );
                })}
              </div>
              <div className="split">
                <div className="issue-list-panel">
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
                          <span className="issue-row-top">
                            <span
                              className={`priority-chip priority-chip-${item.priority.toLowerCase()}`}
                            >
                              {item.priority}
                            </span>
                            <span className="neutral-chip">
                              {branchName(item.branchId)}
                            </span>
                            <small>{label(item.status)}</small>
                          </span>
                          <b className="issue-row-title">{item.title}</b>
                          <span className="issue-row-bottom">
                            <span>
                              {state.themeSupport[item.id] || 0} reviews
                            </span>
                            <small>Severity {item.severity}/3</small>
                          </span>
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
                                className="issue-confirm-button"
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
                      {theme.type === "operational_issue" &&
                        owner &&
                        theme.status !== "suggested" && (
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
            <section className="tasks-page">
              <h2>Work tasks</h2>
              <div className="split">
                <div className="task-lists">
                  <h3>Draft work tasks</h3>
                  {openTasks
                    .filter((item) =>
                      ["proposed", "deferred"].includes(item.status),
                    )
                    .map((item) => (
                      <button
                        key={item.id}
                        className={`review-row ${task?.id === item.id ? "chosen" : ""}`}
                        onClick={() => setSelectedTask(item.id)}
                      >
                        <b>{item.title}</b>
                        <span>
                          {item.status === "deferred"
                            ? "Saved for later"
                            : "Needs approval"}
                        </span>
                      </button>
                    ))}
                  {!openTasks.some((item) =>
                    ["proposed", "deferred"].includes(item.status),
                  ) && (
                    <p className="task-list-empty">
                      No drafts awaiting approval
                    </p>
                  )}
                  <h3>Assigned work</h3>
                  {openTasks
                    .filter((item) =>
                      ["approved_open", "in_progress", "reported"].includes(
                        item.status,
                      ),
                    )
                    .map((item) => (
                      <button
                        key={item.id}
                        className={`review-row ${task?.id === item.id ? "chosen" : ""}`}
                        onClick={() => setSelectedTask(item.id)}
                      >
                        <b>{item.title}</b>
                        <span>
                          {state.employees.find(
                            (employee) => employee.id === item.assigneeId,
                          )?.name || "Assigned employee"}{" "}
                          ·{" "}
                          {item.status === "reported"
                            ? "Awaiting owner verification"
                            : "Awaiting employee confirmation"}
                        </span>
                      </button>
                    ))}
                  {!openTasks.some((item) =>
                    ["approved_open", "in_progress", "reported"].includes(
                      item.status,
                    ),
                  ) && <p className="task-list-empty">No assigned work yet</p>}
                  <div className="completed-tasks">
                    <h3>Completed work tasks</h3>
                    {state.tasks
                      .filter((item) => item.status === "resolved")
                      .map((item) => (
                        <button
                          key={item.id}
                          className={`review-row ${task?.id === item.id ? "chosen" : ""}`}
                          onClick={() => setSelectedTask(item.id)}
                        >
                          <b>{item.title}</b>
                          <span>
                            {
                              state.employees.find(
                                (employee) => employee.id === item.assigneeId,
                              )?.name
                            }{" "}
                            · Verified {date(item.verifiedAt)}
                          </span>
                        </button>
                      ))}
                    {!state.tasks.some(
                      (item) => item.status === "resolved",
                    ) && (
                      <p className="task-list-empty">No completed work yet</p>
                    )}
                  </div>
                </div>
                <div className="card detail task-detail">
                  {task ? (
                    <>
                      <p className="eyebrow">
                        {task.status === "resolved"
                          ? "Completed"
                          : ["approved_open", "in_progress"].includes(
                                task.status,
                              )
                            ? "Assigned"
                            : label(task.status)}{" "}
                        ·{" "}
                        {branchName(
                          state.themes.find(
                            (theme) => theme.id === task.themeId,
                          )?.branchId || "",
                        )}
                      </p>
                      <h3>{task.title}</h3>
                      <details className="task-instructions">
                        <summary>Task instructions</summary>
                        <p>{task.description}</p>
                      </details>
                      {!["proposed", "deferred"].includes(task.status) && (
                        <div className="task-meta">
                          <span>
                            <b>Assigned to</b>{" "}
                            {state.employees.find(
                              (employee) => employee.id === task.assigneeId,
                            )?.name || task.assigneeRole}
                          </span>
                          <span>
                            <b>Due</b> {date(task.dueAt)}
                          </span>
                          {task.verifiedAt && (
                            <span>
                              <b>Verified</b> {date(task.verifiedAt)}
                            </span>
                          )}
                        </div>
                      )}
                      <details className="task-related-issue">
                        <summary>
                          Related issue{" "}
                          <span>
                            {state.themeSupport[task.themeId] || 0}{" "}
                            {state.themeSupport[task.themeId] === 1
                              ? "review"
                              : "reviews"}
                          </span>
                        </summary>
                        <div
                          className="task-evidence-list"
                          tabIndex={0}
                          aria-label="Supporting review quotes"
                        >
                          {state.observations
                            .filter((point) =>
                              state.memberships.some(
                                (membership) =>
                                  membership.themeId === task.themeId &&
                                  membership.observationId === point.id,
                              ),
                            )
                            .map((point) => (
                              <blockquote key={point.id}>
                                {point.evidenceQuote}
                              </blockquote>
                            ))}
                        </div>
                      </details>
                      {["proposed", "deferred"].includes(task.status) &&
                        owner && (
                          <>
                            <p className="muted">
                              Choose an employee and due date. Approval saves
                              the task and assigns it.
                            </p>
                            <TaskEditor
                              key={`${task.id}:${task.title}:${task.description}:${task.assigneeId}`}
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
                              approve={async (data) => {
                                const saved = await act("edit_task", {
                                  taskId: task.id,
                                  data,
                                });
                                if (!saved) return;
                                await act("decide_task", {
                                  taskId: task.id,
                                  decision: "approve",
                                });
                              }}
                              defer={async (data) => {
                                const saved = await act("edit_task", {
                                  taskId: task.id,
                                  data,
                                });
                                if (!saved) return;
                                if (task.status === "proposed")
                                  await act("decide_task", {
                                    taskId: task.id,
                                    decision: "defer",
                                  });
                              }}
                            />
                          </>
                        )}
                      {["approved_open", "in_progress"].includes(task.status) &&
                        owner && (
                          <div className="task-status-note">
                            Waiting for employee report
                          </div>
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
                      {["approved_open", "in_progress"].includes(task.status) &&
                        role === "staff" &&
                        task.assigneeId === employeeId && (
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
                        <div className="task-report">
                          <strong>Employee report</strong>
                          <p>{task.employeeReport}</p>
                        </div>
                      )}
                      {task.status === "reported" && owner && (
                        <button
                          disabled={!!busy}
                          onClick={() =>
                            void act("verify_task", { taskId: task.id })
                          }
                        >
                          Verify completed work
                        </button>
                      )}
                      {task.status === "resolved" && (
                        <>
                          <div className="task-report">
                            <strong>Employee report</strong>
                            <p>{task.employeeReport}</p>
                          </div>
                          <div className="task-actions">
                            {owner && (
                              <button
                                disabled={!!busy}
                                onClick={async () => {
                                  const result = await act("prepare_replies", {
                                    taskId: task.id,
                                  });
                                  if (result) {
                                    setMessage(
                                      `${(result as { count: number }).count} linked replies available.`,
                                    );
                                    setReplyTaskId(task.id);
                                    setReplyIndex(0);
                                    setTab("replies");
                                  }
                                }}
                              >
                                Prepare replies for {affectedReviews.length}{" "}
                                reviews
                              </button>
                            )}
                            <button
                              className="secondary"
                              onClick={() => {
                                setReplyTaskId(task.id);
                                setReplyIndex(0);
                                setTab("replies");
                              }}
                            >
                              Manage replies
                            </button>
                          </div>
                        </>
                      )}
                    </>
                  ) : (
                    <p className="muted">No work tasks yet.</p>
                  )}
                </div>
              </div>
            </section>
          )}
          {tab === "replies" && (
            <section className="replies-page">
              <div className="reply-page-heading">
                <h2>Manage replies</h2>
                {replyTask && (
                  <button
                    className="link"
                    onClick={() => {
                      setReplyTaskId(null);
                      setReplyIndex(0);
                    }}
                  >
                    Show all replies
                  </button>
                )}
              </div>
              {replyTask && (
                <p className="muted reply-scope">
                  {
                    state.themes.find((item) => item.id === replyTask.themeId)
                      ?.title
                  }{" "}
                  · {scopedReplyReviewIds.size} linked reviews
                </p>
              )}
              {owner && (
                <div className="reply-batch-actions">
                  <button
                    className="secondary"
                    disabled={!!busy || !batchReplyIds.length}
                    onClick={() =>
                      void act("approve_reply_batch", {
                        replyIds: batchReplyIds,
                      })
                    }
                  >
                    Approve all eligible ({batchReplyIds.length})
                  </button>
                  <p className="muted">
                    Partial or safety-related replies need individual review.
                  </p>
                </div>
              )}
              {replyTask &&
                currentReplies.length < scopedReplyReviewIds.size && (
                  <div className="notice error" role="alert">
                    {currentReplies.length} of {scopedReplyReviewIds.size}{" "}
                    replies are ready. Select Prepare replies from the completed
                    task to finish the rest.
                  </div>
                )}
              {currentReplies.length ? (
                <>
                  <p className="reply-progress">
                    Review {currentReplyIndex + 1} of {currentReplies.length}
                  </p>
                  {currentReplies
                    .slice(currentReplyIndex, currentReplyIndex + 1)
                    .map((reply) => (
                      <ReplyCard
                        key={`${reply.id}:${reply.text}:${reply.status}`}
                        reply={reply}
                        review={state.reviews.find(
                          (review) => review.id === reply.reviewId,
                        )}
                        owner={owner}
                        save={(text) =>
                          void act("edit_reply", { replyId: reply.id, text })
                        }
                        approve={async (text, partialApproved) => {
                          if (text !== reply.text) {
                            const saved = await act("edit_reply", {
                              replyId: reply.id,
                              text,
                            });
                            if (!saved) return;
                          }
                          const approved = await act("approve_reply", {
                            replyId: reply.id,
                            partialApproved,
                          });
                          if (approved)
                            await act("simulate_publish", {
                              replyId: reply.id,
                            });
                        }}
                        publish={() =>
                          void act("simulate_publish", { replyId: reply.id })
                        }
                      />
                    ))}
                  <nav
                    className="reply-navigation"
                    aria-label="Reply navigation"
                  >
                    <button
                      className="secondary"
                      disabled={currentReplyIndex === 0}
                      onClick={() => setReplyIndex(currentReplyIndex - 1)}
                    >
                      Previous review
                    </button>
                    <button
                      className="secondary"
                      disabled={currentReplyIndex >= currentReplies.length - 1}
                      onClick={() => setReplyIndex(currentReplyIndex + 1)}
                    >
                      Next review
                    </button>
                  </nav>
                </>
              ) : (
                <div className="card">
                  No drafts yet. Open a completed work task and prepare replies.
                </div>
              )}
            </section>
          )}
          {tab === "activity" && (
            <ActivityView
              events={state.events}
              employees={state.employees}
              tasks={state.tasks}
              themes={state.themes}
              reviews={state.reviews}
              replies={state.replies}
            />
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
  approve,
  defer,
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
  approve: (data: {
    title: string;
    description: string;
    assigneeRole: string;
    assigneeId: string;
    dueAt: string;
  }) => void;
  defer: (data: {
    title: string;
    description: string;
    assigneeRole: string;
    assigneeId: string;
    dueAt: string;
  }) => void;
}) {
  const [title, setTitle] = useState(task.title),
    [description, setDescription] = useState(task.description),
    [assigneeId, setAssigneeId] = useState(
      task.assigneeId ||
        employees.find((employee) => employee.name === "Daniel Lim")?.id ||
        employees[0]?.id ||
        "",
    ),
    [dueAt, setDueAt] = useState(() => {
      if (!task.dueAt) return "";
      const value = new Date(task.dueAt);
      return new Date(value.getTime() - value.getTimezoneOffset() * 60_000)
        .toISOString()
        .slice(0, 16);
    });
  const data = () => ({
    title,
    description,
    assigneeId,
    assigneeRole:
      employees.find((employee) => employee.id === assigneeId)?.jobTitle ||
      "Employee",
    dueAt,
  });
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
        Assign to employee
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
      <div className="controls">
        <button className="secondary" onClick={() => save(data())}>
          Save edits
        </button>
        <button className="secondary" onClick={() => defer(data())}>
          Keep for later
        </button>
        <button onClick={() => approve(data())}>Approve and assign</button>
      </div>
    </div>
  );
}
function ReplyCard({
  reply,
  review,
  owner,
  save,
  approve,
  publish,
}: {
  reply: Reply;
  review?: Review;
  owner: boolean;
  save: (text: string) => void;
  approve: (text: string, partialApproved: boolean) => void;
  publish: () => void;
}) {
  const [text, setText] = useState(reply.text);
  const unresolvedConcerns = reply.partialWarning
    ?.replace(/^Other complaints? in this review remain unresolved:\s*/i, "")
    .split(/;\s*/)
    .map((concern) => concern.trim().replace(/[.;]+$/, ""))
    .filter(Boolean);
  return (
    <div className="card reply">
      <div className="reply-source">
        <div className="reply-card-heading">
          <h3>Original review</h3>
          <span>{label(reply.status)}</span>
        </div>
        <p className="reply-review-meta">
          {review && <RatingStars rating={review.rating} />} ·{" "}
          {date(review?.reviewedAt || null)}
        </p>
        <blockquote>{review?.originalText}</blockquote>
        {!!unresolvedConcerns?.length && (
          <div
            className="reply-warning"
            role="note"
            aria-label="Unresolved concerns"
          >
            <div className="reply-warning-heading">
              <span className="reply-warning-icon" aria-hidden="true">
                !
              </span>
              <strong>Still unresolved</strong>
              <span className="reply-warning-count">
                {unresolvedConcerns.length}
              </span>
            </div>
            <ul>
              {unresolvedConcerns.map((concern, index) => (
                <li key={`${index}-${concern}`}>{concern}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
      <div className="reply-compose">
        <label>
          {reply.status === "simulated_published"
            ? "Posted reply"
            : "Reply draft"}
          <textarea
            rows={9}
            value={text}
            onChange={(event) => setText(event.target.value)}
            disabled={!owner || reply.status === "simulated_published"}
          />
        </label>
        {owner && (
          <div className="controls">
            {reply.status !== "simulated_published" && (
              <button className="secondary" onClick={() => save(text)}>
                Save edits
              </button>
            )}
            {reply.status === "draft" && (
              <button
                onClick={() => approve(text, Boolean(reply.partialWarning))}
              >
                {reply.partialWarning
                  ? "Approve partial & post (demo)"
                  : "Approve & post (demo)"}
              </button>
            )}
            {reply.status === "approved_ready" && (
              <button onClick={publish}>Simulate posting</button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
