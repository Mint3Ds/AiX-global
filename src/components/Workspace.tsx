"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { DashboardView } from "@/components/design/DashboardView";
import {
  WorkspaceHeader,
  type WorkspaceTab as Tab,
} from "@/components/design/WorkspaceHeader";
import { ReviewsView } from "@/components/design/ReviewsView";
import { IssuesView } from "@/components/design/IssuesView";
import { NewReviewView } from "@/components/design/NewReviewView";
import { TasksView } from "@/components/design/TasksView";
import { RepliesView } from "@/components/design/RepliesView";
import { ActivityView } from "@/components/design/ActivityView";

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
const priorityRank = (priority: string) =>
  ({ urgent: 4, high: 3, medium: 2, low: 1 })[
    priority.toLowerCase() as "urgent" | "high" | "medium" | "low"
  ] || 0;

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
  const branchName = (id: string) =>
    state?.branches.find((item) => item.id === id)?.name || id;
  const spotlight = state?.themes
    .filter(
      (item) =>
        item.type === "operational_issue" &&
        ["suggested", "recurrence"].includes(item.status) &&
        (branch === "all" || item.branchId === branch),
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
        branches={state?.branches || []}
        selectedBranch={branch}
        onBranchChange={setBranch}
        tab={tab}
        role={role}
        onTabChange={setTab}
        onRoleChange={setRole}
      />
      {error && (
        <div role="alert" className="my-3 rounded-2xl bg-rose-50 border border-rose-200/80 px-4 py-3 text-xs text-rose-900 font-medium flex items-center justify-between shadow-2xs">
          <span>{error}</span>
          <button type="button" onClick={() => void refresh()} className="secondary text-xs px-3 py-1 rounded-full cursor-pointer hover:bg-white">
            Retry load
          </button>
        </div>
      )}
      {message && (
        <div role="status" className="my-3 rounded-2xl bg-white border border-neutral-200/80 px-4 py-3 text-xs text-neutral-800 font-medium shadow-2xs flex items-center justify-between">
          <span>{message}</span>
          <button type="button" onClick={() => setMessage("")} className="link text-xs text-neutral-400 hover:text-neutral-700 cursor-pointer">
            Dismiss
          </button>
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
                {
                  title: "Total reviews",
                  value: state.reviews.filter(
                    (review) => branch === "all" || review.branchId === branch,
                  ).length,
                  caption: "Across simulated sources",
                  color: "blue",
                  onClick: () => setTab("reviews"),
                },
                {
                  title: "New today",
                  value: state.reviews.filter(
                    (review) =>
                      (branch === "all" || review.branchId === branch) &&
                      new Date(review.reviewedAt).toDateString() ===
                        new Date().toDateString(),
                  ).length,
                  caption: "Synced last 24 hours",
                  color: "green",
                  onClick: () => setTab("reviews"),
                },
                {
                  title: "Specific feedback",
                  value: state.reviews.filter(
                    (review) =>
                      (branch === "all" || review.branchId === branch) &&
                      review.processingStatus === "complete",
                  ).length,
                  caption: "Screened by Jev & AI",
                  color: "purple",
                  onClick: () => setTab("reviews"),
                },
                {
                  title: "Issues needing attention",
                  value: state.themes.filter(
                    (theme) =>
                      (branch === "all" || theme.branchId === branch) &&
                      theme.type === "operational_issue" &&
                      ["suggested", "recurrence"].includes(theme.status),
                  ).length,
                  caption: "Urgent & recurring prioritized",
                  color: "amber",
                  onClick: () => setTab("issues"),
                },
                {
                  title: "Open approved tasks",
                  value: state.tasks.filter(
                    (task) =>
                      (branch === "all" ||
                        state.themes.find((t) => t.id === task.themeId)?.branchId === branch) &&
                      task.status === "approved_open",
                  ).length,
                  caption: "Orbyte handoff ready",
                  color: "indigo",
                  onClick: () => setTab("tasks"),
                },
                {
                  title: "Replies to approve",
                  value: state.replies.filter(
                    (reply) =>
                      (branch === "all" ||
                        state.reviews.find((r) => r.id === reply.reviewId)
                          ?.branchId === branch) &&
                      reply.status === "draft",
                  ).length,
                  caption: "Drafted & awaiting signoff",
                  color: "teal",
                  onClick: () => setTab("replies"),
                },
              ]}
              spotlight={
                spotlight
                  ? {
                      id: spotlight.id,
                      title: spotlight.title,
                      priority: spotlight.priority,
                      priorityReason: spotlight.priorityReason,
                      category: spotlightEvidence?.category || "Accessibility",
                      branchId: branchName(spotlight.branchId),
                      support: state.themeSupport[spotlight.id] || 0,
                      evidenceQuote: spotlightEvidence?.evidenceQuote,
                      severity: spotlight.severity,
                    }
                  : null
              }
              simulatedSources={[
                ...new Set(
                  state.reviews
                    .filter((r) => branch === "all" || r.branchId === branch)
                    .map((r) => r.source),
                ),
              ]
                .slice(0, 3)
                .map((s) => `${s} [Simulated]`)}
              hasPreparedDemo={preparedReviews.length > 0}
              onLoadPreparedDemo={() => {
                if (preparedReviews.length > 0) {
                  const rev = preparedReviews[0];
                  setNewBranch(rev.branchId);
                  setNewRating(rev.rating);
                  setNewText(rev.text);
                  setPreparedReviewId(rev.id);
                }
                setTab("new");
              }}
              otherIssues={state.themes
                .filter(
                  (item) =>
                    item.type === "operational_issue" &&
                    ["suggested", "recurrence"].includes(item.status) &&
                    (!spotlight || item.id !== spotlight.id) &&
                    (branch === "all" || item.branchId === branch),
                )
                .sort((a, b) => {
                  return (
                    priorityRank(b.priority) - priorityRank(a.priority) ||
                    b.severity - a.severity ||
                    (state.themeSupport[b.id] || 0) -
                      (state.themeSupport[a.id] || 0)
                  );
                })
                .slice(0, 3)
                .map((item) => ({
                  id: item.id,
                  title: item.title,
                  priority: item.priority,
                  branchName: branchName(item.branchId),
                  support: state.themeSupport[item.id] || 0,
                  severity: item.severity,
                }))}
              recentActivities={(() => {
                const mappedEvents = [...state.events]
                  .sort(
                    (a, b) =>
                      new Date(b.createdAt || 0).getTime() -
                      new Date(a.createdAt || 0).getTime(),
                  )
                  .map((evt) => ({
                    id: evt.id,
                    type: evt.type,
                    description: evt.description,
                    actor:
                      evt.actor === "demo owner"
                        ? "Owner"
                        : state.employees.find((e) => e.id === evt.actor)
                            ?.name || evt.actor,
                    timeAgo: evt.createdAt
                      ? date(evt.createdAt)
                      : "Recently",
                  }));

                const simulatedFallbacks = [
                  {
                    id: "act-jev",
                    type: "jev_screening",
                    description:
                      "Screened source reviews for operational feedback signals",
                    actor: "Jev Screening Pipeline",
                    timeAgo: "Today",
                  },
                  {
                    id: "act-orbyte",
                    type: "orbyte_simulation",
                    description:
                      "Local Orbyte work order handoff channel ready for approved tasks",
                    actor: "Orbyte Simulator",
                    timeAgo: "Ready",
                  },
                  {
                    id: "act-intake",
                    type: "system_intake",
                    description:
                      "Synthetic review streams initialized across 3 platforms",
                    actor: "Visit2Value Engine",
                    timeAgo: "Live",
                  },
                ];

                return [...mappedEvents, ...simulatedFallbacks].slice(0, 3);
              })()}
              onNewReview={() => setTab("new")}
              onInspect={openTheme}
              onProposeTask={async (themeId) => {
                const result = (await act("propose_task", {
                  themeId,
                })) as Task | null;
                if (result) openTask(result.id);
              }}
              onNavigate={(destTab) => setTab(destTab)}
            />
          )}

          {tab === "new" && (
            <NewReviewView
              branches={state.branches}
              preparedReviews={preparedReviews}
              busy={!!busy}
              onSubmitReview={async ({ branchId, source, rating, text, preparedId }) => {
                const sourceId = `guest-${Date.now()}`;
                const result = (await act("intake", {
                  data: {
                    businessId,
                    branchId,
                    source,
                    sourceReviewId: sourceId,
                    rating: Number(rating),
                    reviewedAt: new Date().toISOString(),
                    text,
                    isSynthetic: true,
                  },
                })) as { reviewId?: string } | null;
                if (!result?.reviewId) return;

                if (preparedId) {
                  const existing = state?.reviews.find((r) => r.id === preparedId);
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
              }}
            />
          )}

          {tab === "reviews" && (
            <ReviewsView
              reviews={state.reviews}
              observations={state.observations}
              themes={state.themes}
              memberships={state.memberships}
              replies={state.replies}
              branches={state.branches}
              categories={categories}
              selectedReviewId={selectedReview}
              onSelectReview={setSelectedReview}
              onRetryAnalysis={(reviewId) => void act("analyze", { reviewId })}
              onJumpToIssue={(themeId) => openTheme(themeId)}
              dateFormatter={date}
              busy={!!busy}
            />
          )}

          {tab === "issues" && (
            <IssuesView
              themes={state.themes}
              themeSupport={state.themeSupport}
              observations={state.observations}
              memberships={state.memberships}
              reviews={state.reviews}
              employees={state.employees}
              branches={state.branches}
              selectedThemeId={selectedTheme}
              onSelectTheme={setSelectedTheme}
              owner={owner}
              onSetSeverity={async (themeId, severity) => {
                await act("severity", { themeId, severity });
              }}
              onSetStatus={async (themeId, status) => {
                await act("theme_status", { themeId, status });
              }}
              onProposeTask={async (themeId, taskData) => {
                const result = (await act("propose_task", { themeId })) as Task | null;
                if (result) {
                  if (taskData) {
                    await act("edit_task", { taskId: result.id, data: taskData });
                  }
                  openTask(result.id);
                }
              }}
              onCorrectMembership={async (observationId, themeId) => {
                await act("membership", { observationId, themeId });
              }}
              onJumpToReview={openReview}
              dateFormatter={date}
              busy={busy}
            />
          )}

          {tab === "tasks" && (
            <TasksView
              tasks={state.tasks.filter((t) => t.status !== "proposed" || owner)}
              themes={state.themes}
              employees={state.employees}
              branches={state.branches}
              observations={state.observations}
              memberships={state.memberships}
              reviews={state.reviews}
              selectedTaskId={selectedTask}
              onSelectTask={setSelectedTask}
              role={role}
              activeEmployeeId={employeeId}
              onSetEmployeeId={setEmployeeId}
              onStartTask={async (taskId, empId) => {
                await act("start_task", { taskId, employeeId: empId });
              }}
              onReportTask={async (taskId, empId, note) => {
                await act("report_task", { taskId, employeeId: empId, note });
              }}
              onVerifyTask={async (taskId, note) => {
                await act("verify_task", { taskId, note });
              }}
              onDecideTask={async (taskId, decision) => {
                await act("decide_task", { taskId, decision });
              }}
              onEditTask={async (taskId, data) => {
                await act("edit_task", { taskId, data });
              }}
              onDraftReply={async (reviewId, taskId) => {
                await act("draft_reply", { reviewId, taskId });
                setTab("replies");
              }}
              onOpenTheme={openTheme}
              onOpenReview={openReview}
              dateFormatter={date}
              busy={busy}
            />
          )}

          {tab === "replies" && (
            <RepliesView
              replies={state.replies}
              reviews={state.reviews}
              tasks={state.tasks}
              branches={state.branches}
              owner={owner}
              onSaveReply={async (replyId, text) => {
                await act("edit_reply", { replyId, text });
              }}
              onApproveReply={async (replyId, partialApproved) => {
                await act("approve_reply", { replyId, partialApproved });
              }}
              onApproveBatch={async (replyIds) => {
                await act("approve_reply_batch", { replyIds });
              }}
              onPublishReply={async (replyId) => {
                await act("simulate_publish", { replyId });
              }}
              dateFormatter={date}
              busy={busy}
            />
          )}

          {tab === "activity" && (
            <ActivityView
              events={state.events.filter((item) => item.type !== "handoff_simulated")}
              employees={state.employees}
              dateFormatter={date}
            />
          )}
        </main>
      )}
    </div>
  );
}
