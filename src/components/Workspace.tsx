"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardView } from "@/components/design/DashboardView";
import { ActivityView } from "@/components/design/ActivityView";
import { TaskEvidencePanel } from "@/components/design/TaskEvidencePanel";
import { TaskReportHistory } from "@/components/design/TaskReportHistory";
import { StaffDashboardView } from "@/components/design/StaffDashboardView";
import { PageHeading, StatusBadge } from "@/components/design/PageHeading";
import { RatingStars } from "@/components/design/RatingStars";
import { BrandLoadingScreen } from "@/components/design/BrandLoadingScreen";
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
  createdAt: string;
  originalText: string;
  isHistoricalImport: boolean;
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
  reportVersion: number;
  rejectionReason: string | null;
  rejectedAt: string | null;
  reportedAt: string | null;
  reportedBy: string | null;
  verifiedAt: string | null;
  recurrenceOfTaskId: string | null;
  status: string;
  resolutionNote: string | null;
  approvedAt: string | null;
  resolvedAt: string | null;
};
type TaskReportAttempt = {
  id: string;
  taskId: string;
  version: number;
  note: string;
  reportedAt: string;
  decision: string;
  decisionReason: string | null;
  decidedAt: string | null;
  attachments: { id: string; name: string; url: string }[];
};
type Reply = {
  id: string;
  reviewId: string;
  taskId: string;
  text: string;
  status: string;
  draftVersion: number;
  approvedVersion: number | null;
  rejectionReason: string | null;
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
  stageTimings: Record<string, number> | null;
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
  taskReportAttempts: TaskReportAttempt[];
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
    ? `${new Date(value).toLocaleDateString("en-MY", {
        dateStyle: "medium",
        timeZone: "Asia/Kuala_Lumpur",
      })} · ${new Date(value).toLocaleTimeString("en-MY", {
        timeStyle: "short",
        timeZone: "Asia/Kuala_Lumpur",
      })}`
    : "—";
const localDay = (value: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kuala_Lumpur",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
const labelDictionary: Record<string, string> = {
  // Outcomes & statuses
  simulated_published: "Simulated published",
  reply_simulated_published: "Simulated published",
  posted: "Simulated published",
  complete: "Analysed",
  pending: "Pending analysis",
  processing: "Analysing",
  needs_review: "Needs review",
  generic: "General feedback",
  failed: "Analysis failed",
  suggested: "Suggested",
  owner_confirmed: "Owner confirmed",
  confirmed: "Owner confirmed",
  dismissed: "Dismissed",
  recurrence: "Possible recurrence",
  proposed: "Awaiting approval",
  deferred: "Saved for later",
  approved_open: "Assigned",
  in_progress: "In progress",
  reported: "Awaiting verification",
  needs_rework: "Needs rework",
  resolved: "Verified",
  rejected: "Rejected",
  draft: "Draft",
  approved_ready: "Approved",
  approved: "Approved",
  needs_revision: "Needs revision",

  // Observation kinds
  operational_complaint: "Operational complaint",
  suggestion: "Suggestion",
  specific_praise: "Specific praise",
  other_specific_feedback: "Specific feedback",
  praise: "Praise",

  // Categories
  guest_experience: "Guest experience",
  food_quality: "Food quality",
  cleanliness: "Cleanliness",
  amenities: "Amenities",
  service: "Service",
  noise: "Noise",
  billing: "Billing",
  maintenance: "Maintenance",
  facility: "Facility",
  staff: "Staff",
  operational_issue: "Operational issue",

  // Activity & event types
  review_intake: "Review added",
  analysis_started: "Analysis started",
  analysis_completed: "Review analysed",
  analysis_needs_review: "Review needs attention",
  analysis_failed: "Analysis failed",
  manual_classification: "Review classified",
  membership_corrected: "Evidence updated",
  possible_recurrence: "Possible recurrence",
  theme_confirmed: "Issue confirmed",
  theme_dismissed: "Issue dismissed",
  theme_reopened: "Issue reopened",
  priority_adjusted: "Priority changed",
  task_proposed: "Work task created",
  task_edited: "Work task edited",
  task_deferred: "Task saved for later",
  task_approved: "Task assigned",
  task_started: "Work started",
  task_reported: "Work update submitted",
  task_verified: "Work verified",
  task_report_rejected: "Work returned for rework",
  reply_drafted: "Reply drafted",
  reply_edited: "Reply edited",
  reply_approved: "Reply approved",
  reply_rejected: "Reply rejected",
  reply_publish_denied: "Posting blocked",
  handoff_simulated: "Simulated handoff recorded",

  // Providers & modes
  fixture: "Simulated",
  "fixture:jev": "Simulated screening",
  jev: "Jev",
  openai: "OpenAI",
  live: "Live",
};

const formatSentenceCase = (text: string) => {
  if (!text) return "";
  const cleaned = text.replaceAll("_", " ").toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

const label = (value: string) => {
  if (!value) return "";
  const lower = value.toLowerCase();
  if (labelDictionary[lower]) return labelDictionary[lower];
  if (labelDictionary[value]) return labelDictionary[value];
  return formatSentenceCase(value);
};

function formatEventDescription(desc: string): string {
  if (!desc) return "";
  if (
    desc.includes("No exact analysis fixture exists") ||
    desc.includes("No fixture exists")
  ) {
    return "Review requires owner assessment.";
  }
  if (desc.includes("Analysis started in fixture mode")) {
    return "Automated review analysis started.";
  }
  if (desc.includes("Simulated Orbyte integration handoff saved locally")) {
    return "Simulated handoff recorded.";
  }
  return desc;
}

const imageAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === "string"
        ? resolve(reader.result)
        : reject(new Error("Could not read the selected image."));
    reader.onerror = () =>
      reject(new Error("Could not read the selected image."));
    reader.readAsDataURL(file);
  });
const issueWorkLabels: Record<string, string> = {
  proposed: "Task awaiting approval",
  deferred: "Task saved for later",
  approved_open: "Assigned work",
  in_progress: "In progress",
  reported: "Awaiting verification",
  needs_rework: "Needs rework",
  resolved: "Work verified",
};
const issueWorkLabel = (status: string) =>
  issueWorkLabels[status] || "Work task";

/** Edit action confirmation copy here; state and API behavior live below. */
function actionSuccessMessage(
  type: string,
  values: Record<string, unknown>,
  result: { status?: string; count?: number } | null,
) {
  if (type === "analyze") {
    if (result?.status === "needs_review")
      return "Review saved. New wording requires owner review before analysis.";
    if (result?.status === "generic")
      return "Analysis complete. No specific feedback found.";
    return "Analysis complete.";
  }
  if (type === "theme_status") {
    if (values.status === "dismissed") return "Issue dismissed.";
    if (values.status === "suggested") return "Issue reopened for review.";
    return "Issue confirmed.";
  }
  if (type === "decide_task")
    return values.decision === "defer"
      ? "Task saved for later."
      : "Task assigned.";
  if (type === "prepare_replies")
    return `${result?.count ?? 0} linked replies ready for review.`;

  const messages: Record<string, string> = {
    intake: "Review saved. Analysis is starting…",
    severity: "Priority updated.",
    edit_task: "Work task saved.",
    report_task: "Work update submitted.",
    verify_task: "Work verified.",
    reject_task_report:
      "Report returned for rework. The employee can see your reason.",
    reject_reply: "Draft rejected. Revise it before approval or posting.",
    approve_reply_batch: "Eligible replies approved.",
    simulate_publish: "Reply marked as simulated published.",
    propose_task: "Work task created.",
    edit_reply: "Reply saved.",
    approve_reply: "Reply approved.",
    correct_membership: "Evidence updated.",
  };
  return messages[type] || "Changes saved.";
}
function revealDetailOnMobile(id: string, maxWidth = 640) {
  if (!window.matchMedia(`(max-width: ${maxWidth}px)`).matches) return;
  requestAnimationFrame(() => {
    const element = document.getElementById(id);
    element?.focus({ preventScroll: true });
    element?.scrollIntoView({
      block: "start",
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "instant"
        : "smooth",
    });
  });
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
    <nav className="page-controls" aria-label="Pagination">
      <button
        className="link page-navigation"
        type="button"
        aria-label="Previous page"
        disabled={pageCount <= 1 || page === 0}
        onClick={() => onPageChange(page - 1)}
      >
        Previous
      </button>
      <button
        className="link page-navigation"
        type="button"
        aria-label="Next page"
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

/**
 * Workspace owns the shared snapshot, filters, and navigation for all seven tabs.
 * For visual edits, start with tokens.css and the matching screen section below.
 */
export function Workspace() {
  // UI-only state. Server data is always refreshed from /api/state after actions.
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [errorSource, setErrorSource] = useState<"load" | "action" | null>(
    null,
  );
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<Tab>("dashboard");
  const [role, setRole] = useState<"owner" | "staff">("owner");
  const owner = role === "owner";
  const [businessId, setBusinessId] = useState("harbour-house");
  const activeBusinessId = useRef("harbour-house");
  const [cachedBusinesses, setCachedBusinesses] = useState<State["businesses"]>(
    [],
  );
  const [employeeId, setEmployeeId] = useState("hotel-employee-1");
  const [employeeManuallySelected, setEmployeeManuallySelected] =
    useState(false);
  const changeEmployee = useCallback((id: string) => {
    setEmployeeManuallySelected(true);
    setEmployeeId(id);
  }, []);
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
  const [received, setReceived] = useState("all");
  const [reviewSort, setReviewSort] = useState("newest");
  const [reviewPage, setReviewPage] = useState(0);
  const [showReviewFilters, setShowReviewFilters] = useState(false);
  const [newText, setNewText] = useState("");
  const [newTextError, setNewTextError] = useState("");
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
  const [workImages, setWorkImages] = useState<File[]>([]);
  const [workImageError, setWorkImageError] = useState("");
  const [decision, setDecision] = useState<{
    kind: "task" | "reply";
    id: string;
    version: number;
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionError, setDecisionError] = useState("");
  const [introComplete, setIntroComplete] = useState(false);
  const decisionInput = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (!decision) return;
    const previous = document.activeElement;
    decisionInput.current?.focus();
    return () => {
      if (previous instanceof HTMLElement && previous.isConnected)
        previous.focus();
    };
  }, [decision]);

  useEffect(() => {
    window.scrollTo(0, 0);
    document
      .querySelector<HTMLElement>("[data-page-title]")
      ?.focus({ preventScroll: true });
  }, [tab]);
  // Shared data loading and action feedback for every tab.
  const refresh = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/state?businessId=${encodeURIComponent(businessId)}`,
        { cache: "no-store" },
      );
      const body = await response.json();
      if (!response.ok) throw new Error(body.error || "Could not load data");
      if (activeBusinessId.current !== businessId) return;
      setCachedBusinesses(body.businesses || []);
      setState(body);
      setError("");
      setErrorSource(null);
    } catch (reason) {
      if (activeBusinessId.current !== businessId) return;
      setError(
        reason instanceof Error ? reason.message : "Could not load data",
      );
      setErrorSource("load");
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
      setErrorSource(null);
      const progressPoll =
        type === "analyze"
          ? window.setInterval(() => void refresh(), 900)
          : null;
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
        const result = body.result as {
          status?: string;
          error?: string;
          count?: number;
        } | null;
        if (type === "analyze" && result?.status === "failed") {
          setError(
            `Analysis failed. ${result.error || "Try again after checking the provider."}`,
          );
          setErrorSource("action");
        } else {
          setMessage(actionSuccessMessage(type, values, result));
        }
        return body.result;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : "Action failed");
        setErrorSource("action");
        return null;
      } finally {
        if (progressPoll) window.clearInterval(progressPoll);
        setBusy("");
      }
    },
    [refresh, role, businessId],
  );
  const submitNew = async (event: React.FormEvent) => {
    event.preventDefault();
    if (newText.trim().length < 5) {
      setNewTextError("Write at least 5 characters of review text.");
      document.getElementById("new-review-text")?.focus();
      return;
    }
    if (newText.length > 3000) {
      setNewTextError("Review text must be 3000 characters or fewer.");
      document.getElementById("new-review-text")?.focus();
      return;
    }
    setNewTextError("");
    const prepared = preparedReviews.find(
      (review) => review.id === preparedReviewId && review.text === newText,
    );
    const sourceId = `guest-${crypto.randomUUID?.() || new Date().getTime()}`;
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
        openReview(existing.id);
        setMessage(
          `This prepared review is already in the workspace (${label(existing.processingStatus)}).`,
        );
        return;
      }
    }
    openReview(result.reviewId);
    setMessage("Review saved. Screening is starting…");
    const outcome = (await act("analyze", {
      reviewId: result.reviewId,
    })) as {
      status?: string;
      provider?: string;
      changedThemes?: string[];
      error?: string;
    } | null;
    if (outcome) {
      if (outcome.status === "failed") {
        setMessage("");
        setError(
          `Review saved, but analysis failed. ${outcome.error || "Try again after checking the provider."}`,
        );
        setErrorSource("action");
      } else if (outcome.status === "needs_review")
        setMessage(
          "Review saved. New wording requires owner review before analysis.",
        );
      else if (outcome.status === "generic")
        setMessage("Review saved. No specific feedback was found.");
      else setMessage("Review saved and analyzed.");
      setTab("reviews");
    }
  };
  const theme = state?.themes.find((item) => item.id === selectedTheme);
  // Default staff view to the highest-priority active assignment while honoring manual picks.
  const effectiveEmployeeId = useMemo(() => {
    if (!state) return employeeId;
    const isCurrentEmployee = state.employees.some(
      (employee) => employee.id === employeeId,
    );
    if (employeeManuallySelected && isCurrentEmployee) return employeeId;
    const rank: Record<string, number> = {
      needs_rework: 4,
      reported: 3,
      in_progress: 2,
      approved_open: 1,
    };
    const activeTask = state.tasks
      .filter(
        (task) =>
          task.assigneeId &&
          task.status in rank &&
          state.employees.some((employee) => employee.id === task.assigneeId),
      )
      .sort((a, b) => rank[b.status] - rank[a.status])[0];
    return (
      activeTask?.assigneeId ||
      (isCurrentEmployee ? employeeId : state.employees[0]?.id || employeeId)
    );
  }, [state, employeeId, employeeManuallySelected]);
  // Derived collections used by Dashboard, Issues, Tasks, and Replies.
  const openTasks = useMemo(() => {
    const rank: Record<string, number> = {
      needs_rework: 5,
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
  const visibleTaskList = owner
    ? openTasks
    : (state?.tasks || []).filter(
        (item) =>
          item.assigneeId === effectiveEmployeeId &&
          [
            "approved_open",
            "in_progress",
            "reported",
            "needs_rework",
            "resolved",
          ].includes(item.status),
      );
  const issueTaskByTheme = useMemo(() => {
    const byTheme = new Map<string, Task>();
    for (const item of state?.tasks || []) {
      if (item.status !== "resolved") continue;
      const previous = byTheme.get(item.themeId);
      if (
        !previous ||
        new Date(item.resolvedAt || 0).getTime() >
          new Date(previous.resolvedAt || 0).getTime()
      )
        byTheme.set(item.themeId, item);
    }
    for (const item of openTasks) byTheme.set(item.themeId, item);
    return byTheme;
  }, [state, openTasks]);
  const issueTask = theme ? issueTaskByTheme.get(theme.id) : undefined;
  const selectedTaskRow = state?.tasks.find((item) => item.id === selectedTask);
  const task =
    visibleTaskList.find((item) => item.id === selectedTask) ||
    (selectedTaskRow?.status === "resolved" &&
    (owner || selectedTaskRow.assigneeId === effectiveEmployeeId)
      ? selectedTaskRow
      : visibleTaskList.find(
          (item) => item.themeId === selectedTaskRow?.themeId,
        )) ||
    visibleTaskList[0];
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
  const allReplies = [...(state?.replies || [])].sort((a, b) => {
    const aDate =
      state?.reviews.find((review) => review.id === a.reviewId)?.reviewedAt ||
      "";
    const bDate =
      state?.reviews.find((review) => review.id === b.reviewId)?.reviewedAt ||
      "";
    return bDate.localeCompare(aDate);
  });
  const currentReplies = allReplies.filter(
    (reply) => !replyTask || scopedReplyReviewIds.has(reply.reviewId),
  );
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
      state?.reviews
        .filter((review) => {
          const points = state.observations.filter(
            (observation) => observation.reviewId === review.id,
          );
          const query = search.trim().toLowerCase();
          return (
            (branch === "all" || review.branchId === branch) &&
            (rating === "all" || review.rating === Number(rating)) &&
            (status === "all" ||
              (status === "attention"
                ? ["pending", "failed", "needs_review"].includes(
                    review.processingStatus,
                  )
                : review.processingStatus === status)) &&
            (received === "all" ||
              (!review.isHistoricalImport &&
                localDay(review.createdAt) ===
                  localDay(new Date().toISOString()))) &&
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
        })
        .sort((a, b) => {
          const byDate =
            new Date(b.reviewedAt).getTime() - new Date(a.reviewedAt).getTime();
          if (reviewSort === "oldest") return -byDate;
          if (reviewSort === "lowest") return a.rating - b.rating || byDate;
          if (reviewSort === "highest") return b.rating - a.rating || byDate;
          return byDate;
        }) || [],
    [state, search, branch, rating, category, status, received, reviewSort],
  );
  const reviewPageCount = Math.max(1, Math.ceil(filtered.length / 8));
  const currentReviewPage = Math.min(reviewPage, reviewPageCount - 1);
  const visibleReviews = filtered.slice(
    currentReviewPage * 8,
    currentReviewPage * 8 + 8,
  );
  const selected =
    filtered.find((review) => review.id === selectedReview) ||
    visibleReviews[0];
  const changeReviewFilter = (update: () => void) => {
    update();
    setReviewPage(0);
    setSelectedReview(null);
  };
  const resetReviewFilters = () => {
    setSearch("");
    setBranch("all");
    setRating("all");
    setCategory("all");
    setStatus("all");
    setReceived("all");
    setReviewPage(0);
    setSelectedReview(null);
  };
  const hasReviewFilters =
    !!search ||
    [branch, rating, category, status, received].some(
      (value) => value !== "all",
    );
  const advancedFilterCount = [category, status, received].filter(
    (value) => value !== "all",
  ).length;
  const inspectReview = (id: string) => {
    setSelectedReview(id);
    revealDetailOnMobile("review-detail-title", 900);
  };
  const reviewPoints =
    selected && state
      ? state.observations.filter((point) => point.reviewId === selected.id)
      : [];
  const categories = [
    ...new Set(
      state?.observations.map((observation) => observation.category) || [],
    ),
  ].sort();
  const openTheme = (id: string) => {
    const target = state?.themes.find((item) => item.id === id);
    if (target) {
      const type =
        target.type === "suggestion" ? "suggestion" : "operational_issue";
      setIssueType(type);
      const items = (state?.themes || [])
        .filter(
          (item) =>
            item.type === type &&
            isOwnerVisibleTheme(item, state?.themeSupport[item.id] || 0),
        )
        .sort(
          (a, b) =>
            priorityRank(b.priority) - priorityRank(a.priority) ||
            (state?.themeSupport[b.id] || 0) - (state?.themeSupport[a.id] || 0),
        );
      setIssuePage(
        Math.max(0, Math.floor(items.findIndex((item) => item.id === id) / 5)),
      );
    }
    setSelectedTheme(id);
    setEvidencePage(0);
    setTab("issues");
    revealDetailOnMobile("issue-detail-title");
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
    resetReviewFilters();
    setReviewSort("newest");
    const ordered = [...(state?.reviews || [])].sort((a, b) =>
      b.reviewedAt.localeCompare(a.reviewedAt),
    );
    setReviewPage(
      Math.max(0, Math.floor(ordered.findIndex((item) => item.id === id) / 8)),
    );
    setSelectedReview(id);
    setTab("reviews");
    revealDetailOnMobile("review-detail-title", 900);
  };
  const openTask = (id: string) => {
    setWorkReport("");
    setWorkImages([]);
    setWorkImageError("");
    setSelectedTask(id);
    setTab("tasks");
    revealDetailOnMobile("task-detail-title");
  };
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
    if (recentActivity.length === 6) break;
  }
  const activeAnalysisStage = state?.reviews.find(
    (review) => review.processingStatus === "processing",
  )?.processingStage;

  const currentBranches = (state?.branches || []).filter(
    (branch) => branch.businessId === businessId,
  );
  const propertySummaries = currentBranches.map((branch) => {
    const branchReviews = (state?.reviews || []).filter(
      (r) => r.branchId === branch.id,
    );
    const avgRating = branchReviews.length
      ? (
          branchReviews.reduce((sum, r) => sum + r.rating, 0) /
          branchReviews.length
        ).toFixed(1)
      : "—";
    const branchIssues = (state?.themes || []).filter(
      (t) =>
        t.branchId === branch.id &&
        t.type === "operational_issue" &&
        ["suggested", "recurrence"].includes(t.status),
    ).length;
    return {
      id: branch.id,
      name: branch.name,
      rating: avgRating,
      reviewsCount: branchReviews.length,
      issuesCount: branchIssues,
    };
  });
  const replyStatus = {
    draftCount: (state?.replies || []).filter((r) => r.status === "draft").length,
    approvedCount: (state?.replies || []).filter((r) => r.status === "approved_ready").length,
    publishedCount: (state?.replies || []).filter((r) => r.status === "simulated_published").length,
  };

  return (
    <>
      {!introComplete && (
        <BrandLoadingScreen
          isDataReady={!!state}
          error={errorSource === "load" ? error : null}
          onRetry={() => void refresh()}
          onComplete={() => setIntroComplete(true)}
        />
      )}
      <div className="shell">
      <WorkspaceHeader
        businesses={
          state?.businesses ||
          (cachedBusinesses.length
            ? cachedBusinesses
            : [{ id: "harbour-house", name: "Harbour House Hotel" }])
        }
        businessId={businessId}
        onBusinessChange={(id) => {
          setEmployeeManuallySelected(false);
          activeBusinessId.current = id;
          setBusinessId(id);
          setState(null);
          setMessage("");
          setError("");
          setErrorSource(null);
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
          setRating("all");
          setCategory("all");
          setStatus("all");
          setReceived("all");
          setReviewPage(0);
          setReviewSort("newest");
          setShowReviewFilters(false);
          setNewTextError("");
          setTab("dashboard");
        }}
        tab={tab}
        role={role}
        busy={!!busy}
        onTabChange={(nextTab) => {
          setMessage("");
          if (
            nextTab === "issues" &&
            !issueThemes.some((item) => item.id === selectedTheme)
          )
            setSelectedTheme(issueThemes[0]?.id || "");
          setTab(nextTab);
        }}
        onRoleChange={(nextRole) => {
          setRole(nextRole);
          if (
            nextRole === "staff" &&
            ["reviews", "issues", "new", "replies"].includes(tab)
          )
            setTab("dashboard");
        }}
      />
      {error && (
        <div role="alert" className="notice error">
          <span>{error}</span>
          {errorSource === "load" && (
            <button onClick={() => void refresh()}>Retry load</button>
          )}
        </div>
      )}
      {message && (
        <div role="status" className="notice">
          <span>{message}</span>
          <button
            type="button"
            className="notice-dismiss"
            aria-label="Dismiss notification"
            onClick={() => setMessage("")}
          >
            ×
          </button>
        </div>
      )}
      {busy && (
        <div className="action-progress" role="status">
          {busy === "analyze"
            ? activeAnalysisStage === "extraction"
              ? "Extracting specific guest observations…"
              : activeAnalysisStage === "theme_matching"
                ? "Linking feedback to existing issues…"
                : "Screening review…"
            : busy === "prepare_replies"
              ? "Preparing guest replies…"
              : "Saving your changes…"}
        </div>
      )}
      {!state ? (
        <main
          id="workspace-main"
          tabIndex={-1}
          className="loading-workspace"
          aria-busy={!error}
        >
          {!error && <div className="loading-rule" aria-hidden="true" />}
          <p role="status">
            {error
              ? "Your workspace could not be loaded. Use Retry load to try again."
              : "Loading workspace…"}
          </p>
        </main>
      ) : (
        <main
          id="workspace-main"
          tabIndex={-1}
          key={tab}
          className="workspace-main"
          aria-busy={!!busy}
        >
          <fieldset
            className="workspace-content"
            disabled={!!busy}
            aria-label="Workspace"
          >
            {/* 01 Dashboard: summary metrics and links to each workflow. */}
            {tab === "dashboard" &&
              (role === "staff" ? (
                <StaffDashboardView
                  employeeId={effectiveEmployeeId}
                  employees={state.employees}
                  tasks={state.tasks
                    .filter(
                      (item) =>
                        item.assigneeId === effectiveEmployeeId &&
                        [
                          "approved_open",
                          "in_progress",
                          "reported",
                          "needs_rework",
                        ].includes(item.status),
                    )
                    .sort(
                      (a, b) =>
                        Number(b.status === "needs_rework") -
                          Number(a.status === "needs_rework") ||
                        Number(b.status === "reported") -
                          Number(a.status === "reported") ||
                        (a.dueAt || "9999").localeCompare(b.dueAt || "9999"),
                    )
                    .map((item) => ({
                      id: item.id,
                      title: item.title,
                      status: item.status,
                      dueAt: item.dueAt,
                      rejectionReason: item.rejectionReason,
                      rejections: state.taskReportAttempts.filter(
                        (attempt) =>
                          attempt.taskId === item.id &&
                          attempt.decision === "rejected",
                      ).length,
                    }))}
                  onEmployeeChange={changeEmployee}
                  onOpenTask={openTask}
                  onOpenTasks={() => setTab("tasks")}
                />
              ) : (
                <DashboardView
                  properties={propertySummaries}
                  replyStatus={replyStatus}
                  onSelectBranch={(branchId) => {
                    setBranch(branchId);
                    navigateTab('reviews');
                  }}
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
                          !review.isHistoricalImport &&
                          localDay(review.createdAt) ===
                            localDay(new Date().toISOString()),
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
                      value: state.tasks.filter((task) =>
                        [
                          "approved_open",
                          "in_progress",
                          "reported",
                          "needs_rework",
                        ].includes(task.status),
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
                  work={[...openTasks]
                    .sort(
                      (a, b) =>
                        Number(b.status === "reported") -
                          Number(a.status === "reported") ||
                        (a.dueAt || "9999").localeCompare(b.dueAt || "9999"),
                    )
                    .slice(0, 3)
                    .map((item) => ({
                      id: item.id,
                      title: item.title,
                      status: item.status,
                      assignee:
                        state.employees.find(
                          (employee) => employee.id === item.assigneeId,
                        )?.name || "Not yet assigned",
                      due: item.dueAt
                        ? `Due ${date(item.dueAt)}`
                        : "Due date not set",
                    }))}
                  onOpenTask={openTask}
                  activity={recentActivity.map((item) => ({
                    id: item.id,
                    title: label(item.type),
                    description: formatEventDescription(item.description),
                    date: date(item.createdAt),
                  }))}
                  onNewReview={() => setTab("new")}
                  onInspect={openTheme}
                  onNavigate={(destination, metricTitle) => {
                    if (destination === "reviews") {
                      resetReviewFilters();
                      setReviewSort("newest");
                      if (metricTitle === "New today") setReceived("today");
                      if (metricTitle === "Specific feedback")
                        setStatus("complete");
                    }
                    if (destination === "issues")
                      changeIssueType("operational_issue");
                    if (destination === "tasks") {
                      const nextTask =
                        metricTitle === "Open approved tasks"
                          ? openTasks.find((item) =>
                              [
                                "approved_open",
                                "in_progress",
                                "reported",
                                "needs_rework",
                              ].includes(item.status),
                            )
                          : openTasks[0];
                      setSelectedTask(nextTask?.id || "");
                    }
                    if (destination === "replies") {
                      setReplyTaskId(null);
                      setReplyIndex(
                        metricTitle === "Replies to approve"
                          ? Math.max(
                              0,
                              allReplies.findIndex(
                                (reply) => reply.status === "draft",
                              ),
                            )
                          : 0,
                      );
                    }
                    setTab(destination);
                  }}
                />
              ))}
            {/* 02 New review: intake form and analysis provenance. */}
            {tab === "new" && (
              <section className="new-review-page">
                <PageHeading
                  index="07"
                  eyebrow="Review intake"
                  title="Add guest feedback"
                  description="Save the original wording. Analysis follows automatically."
                />
                <div className="new-review-layout">
                  <form
                    className="card form new-review-form"
                    onSubmit={submitNew}
                  >
                    <div className="new-review-form-heading">
                      <h3>Review details</h3>
                      <p>Keep the guest’s words exactly as written.</p>
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
                    <label className="wide" htmlFor="new-review-text">
                      Original review text
                      <textarea
                        id="new-review-text"
                        aria-label="Original review text"
                        rows={8}
                        value={newText}
                        onChange={(event) => {
                          setNewText(event.target.value);
                          if (newTextError) setNewTextError("");
                          setPreparedReviewId(null);
                        }}
                        aria-invalid={!!newTextError}
                        aria-describedby={
                          newTextError ? "new-review-text-error" : undefined
                        }
                        required
                        placeholder="Paste the guest's review here…"
                      />
                      {newTextError && (
                        <span
                          id="new-review-text-error"
                          className="field-error"
                          role="alert"
                        >
                          {newTextError}
                        </span>
                      )}
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
                        View all reviews
                      </button>
                    )}
                  </aside>
                </div>
              </section>
            )}
            {/* 03 Reviews: filters, register, and source evidence. */}
            {tab === "reviews" && (
              <section className="reviews-page">
                <PageHeading
                  index="02"
                  eyebrow="Guest reviews"
                  title="Guest words, in full."
                  description="Explore the original feedback and the evidence behind every issue."
                >
                  <span className="page-count">
                    <strong>{state.reviews.length.toLocaleString()}</strong>{" "}
                    source reviews
                  </span>
                </PageHeading>
                <div className="review-filters">
                  <div className="review-primary-filters">
                    <label className="review-search">
                      Search reviews
                      <input
                        type="search"
                        placeholder="Search original words or evidence…"
                        value={search}
                        onChange={(event) =>
                          changeReviewFilter(() =>
                            setSearch(event.target.value),
                          )
                        }
                      />
                    </label>
                    <label>
                      Property
                      <select
                        value={branch}
                        onChange={(event) =>
                          changeReviewFilter(() =>
                            setBranch(event.target.value),
                          )
                        }
                      >
                        <option value="all">All properties</option>
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
                        onChange={(event) =>
                          changeReviewFilter(() =>
                            setRating(event.target.value),
                          )
                        }
                      >
                        <option value="all">All ratings</option>
                        {[1, 2, 3, 4, 5].map((value) => (
                          <option key={value} value={value}>
                            {value} {value === 1 ? "star" : "stars"}
                          </option>
                        ))}
                      </select>
                    </label>
                    <button
                      className="secondary filter-toggle"
                      aria-expanded={showReviewFilters}
                      aria-controls="advanced-review-filters"
                      onClick={() => setShowReviewFilters(!showReviewFilters)}
                    >
                      More filters
                      {advancedFilterCount
                        ? ` (${advancedFilterCount})`
                        : ""}{" "}
                      <span aria-hidden="true">
                        {showReviewFilters ? "−" : "+"}
                      </span>
                    </button>
                  </div>
                  <div
                    id="advanced-review-filters"
                    className="review-advanced-filters"
                    hidden={!showReviewFilters}
                  >
                    <label>
                      Category
                      <select
                        value={category}
                        onChange={(event) =>
                          changeReviewFilter(() =>
                            setCategory(event.target.value),
                          )
                        }
                      >
                        <option value="all">All categories</option>
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
                        onChange={(event) =>
                          changeReviewFilter(() =>
                            setStatus(event.target.value),
                          )
                        }
                      >
                        <option value="all">All statuses</option>
                        <option value="attention">Needs attention</option>
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
                    <label>
                      Received
                      <select
                        value={received}
                        onChange={(event) =>
                          changeReviewFilter(() =>
                            setReceived(event.target.value),
                          )
                        }
                      >
                        <option value="all">All dates</option>
                        <option value="today">Today</option>
                      </select>
                    </label>
                  </div>
                  <div className="review-view-controls">
                    <div
                      className="review-quick-filters"
                      role="group"
                      aria-label="Review views"
                    >
                      <button
                        className={
                          status === "all" && received === "all" ? "active" : ""
                        }
                        aria-pressed={status === "all" && received === "all"}
                        onClick={() =>
                          changeReviewFilter(() => {
                            setStatus("all");
                            setReceived("all");
                          })
                        }
                      >
                        All reviews
                      </button>
                      <button
                        className={status === "attention" ? "active" : ""}
                        aria-pressed={status === "attention"}
                        onClick={() =>
                          changeReviewFilter(() => {
                            setStatus("attention");
                            setReceived("all");
                          })
                        }
                      >
                        Needs attention{" "}
                        <span>
                          {
                            state.reviews.filter((item) =>
                              ["pending", "failed", "needs_review"].includes(
                                item.processingStatus,
                              ),
                            ).length
                          }
                        </span>
                      </button>
                      <button
                        className={received === "today" ? "active" : ""}
                        aria-pressed={received === "today"}
                        onClick={() =>
                          changeReviewFilter(() => {
                            setReceived("today");
                            setStatus("all");
                          })
                        }
                      >
                        New today
                      </button>
                    </div>
                    {hasReviewFilters && (
                      <button className="link" onClick={resetReviewFilters}>
                        Reset filters
                      </button>
                    )}
                  </div>
                </div>
                <div className="review-results">
                  <p role="status" aria-live="polite">
                    {filtered.length
                      ? `${currentReviewPage * 8 + 1}–${Math.min(currentReviewPage * 8 + 8, filtered.length)} of ${filtered.length}`
                      : "No matching"}{" "}
                    reviews
                    {hasReviewFilters && ` · ${state.reviews.length} total`}
                  </p>
                  <label>
                    <span className="sr-only">Sort reviews</span>
                    <select
                      value={reviewSort}
                      onChange={(event) =>
                        changeReviewFilter(() =>
                          setReviewSort(event.target.value),
                        )
                      }
                    >
                      <option value="newest">Newest first</option>
                      <option value="oldest">Oldest first</option>
                      <option value="lowest">Lowest rating</option>
                      <option value="highest">Highest rating</option>
                    </select>
                  </label>
                </div>
                <div className="review-workspace">
                  <div className="review-register-panel">
                    {filtered.length ? (
                      <>
                        <div className="review-table-wrap">
                          <table className="review-register">
                            <caption className="sr-only">
                              Source reviews. Select a review to inspect its
                              original wording and analysis.
                            </caption>
                            <thead>
                              <tr>
                                <th scope="col">Original feedback</th>
                                <th scope="col">Rating</th>
                                <th scope="col">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {visibleReviews.map((review) => (
                                <tr
                                  key={review.id}
                                  className={
                                    selected?.id === review.id ? "chosen" : ""
                                  }
                                >
                                  <td>
                                    <button
                                      className="register-review-button"
                                      aria-pressed={selected?.id === review.id}
                                      aria-controls="review-detail"
                                      onClick={() => inspectReview(review.id)}
                                    >
                                      <span className="register-date">
                                        {date(review.reviewedAt)}
                                      </span>
                                      <span className="register-excerpt">
                                        {review.originalText}
                                      </span>
                                      <span className="register-property">
                                        {branchName(review.branchId)}
                                      </span>
                                    </button>
                                  </td>
                                  <td>
                                    <span
                                      className="register-rating"
                                    >
                                      <RatingStars
                                        rating={review.rating}
                                        className="register-rating-stars"
                                      />
                                    </span>
                                  </td>
                                  <td>
                                    <StatusBadge
                                      status={review.processingStatus}
                                    />
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <PageControls
                          page={currentReviewPage}
                          pageCount={reviewPageCount}
                          onPageChange={(page) => {
                            setReviewPage(page);
                            setSelectedReview(filtered[page * 8]?.id || null);
                            requestAnimationFrame(() => {
                              document
                                .querySelector<HTMLButtonElement>(
                                  ".register-review-button",
                                )
                                ?.focus({ preventScroll: true });
                              document
                                .querySelector(".review-results")
                                ?.scrollIntoView({ block: "start" });
                            });
                          }}
                        />
                      </>
                    ) : (
                      <div className="empty-state">
                        <p className="eyebrow">No matches</p>
                        <h3>No reviews in this view.</h3>
                        <p>Try a broader search or reset the filters.</p>
                        <button
                          className="secondary"
                          onClick={resetReviewFilters}
                        >
                          Reset filters
                        </button>
                      </div>
                    )}
                  </div>
                  <article
                    id="review-detail"
                    className="review-detail"
                    aria-label="Selected review"
                  >
                    {selected ? (
                      <div key={selected.id} className="detail-transition">
                        <div className="review-detail-heading">
                          <p className="eyebrow">Original review</p>
                          <StatusBadge status={selected.processingStatus} />
                        </div>
                        <h3 id="review-detail-title" tabIndex={-1}>
                          {branchName(selected.branchId)}
                        </h3>
                        <div className="review-meta">
                          <RatingStars rating={selected.rating} />
                          <time dateTime={selected.reviewedAt}>
                            {date(selected.reviewedAt)}
                          </time>
                        </div>
                        <blockquote className="review-original">
                          {selected.originalText}
                        </blockquote>
                        {state.replies.find(
                          (reply) => reply.reviewId === selected.id,
                        ) && (
                          <button
                            className="link review-reply-link"
                            onClick={() => {
                              setReplyTaskId(null);
                              const index = allReplies.findIndex(
                                (reply) => reply.reviewId === selected.id,
                              );
                              setReplyIndex(Math.max(0, index));
                              setTab("replies");
                            }}
                          >
                            View guest reply
                          </button>
                        )}
                        <div className="findings-heading">
                          <h4>Extracted observations</h4>
                          <span>{reviewPoints.length} found</span>
                        </div>
                        {reviewPoints.length ? (
                          reviewPoints.map((point, index) => {
                            const membership = state.memberships.find(
                              (m) => m.observationId === point.id,
                            );
                            const linkedTheme = state.themes.find(
                              (item) => item.id === membership?.themeId,
                            );
                            return (
                              <article
                                className={`review-finding finding-${point.kind}`}
                                key={point.id}
                              >
                                <span className="finding-index">
                                  {String(index + 1).padStart(2, "0")}
                                </span>
                                <div>
                                  <p className="finding-category">
                                    {label(point.category)} ·{" "}
                                    {label(point.kind)}
                                  </p>
                                  <h4>{point.summary}</h4>
                                  <blockquote>
                                    “{point.evidenceQuote}”
                                  </blockquote>
                                  {linkedTheme &&
                                    [
                                      "operational_issue",
                                      "suggestion",
                                    ].includes(linkedTheme.type) && (
                                      <button
                                        className="link"
                                        onClick={() =>
                                          openTheme(linkedTheme.id)
                                        }
                                      >
                                        {linkedTheme.title}{" "}
                                      </button>
                                    )}
                                </div>
                              </article>
                            );
                          })
                        ) : (
                          <div className="empty-complaints">
                            <b>
                              {selected.processingStatus === "failed"
                                ? "Analysis failed"
                                : selected.processingStatus === "needs_review"
                                  ? "Needs review"
                                  : ["pending", "processing"].includes(
                                        selected.processingStatus,
                                      )
                                    ? "Analysis in progress"
                                    : "No specific feedback found"}
                            </b>
                            <p>
                              {selected.processingStatus === "failed"
                                ? state.runs.find(
                                    (run) =>
                                      run.reviewId === selected.id &&
                                      run.decision === "failed",
                                  )?.safeError ||
                                  "The review is saved. Try analysis again."
                                : selected.processingStatus === "needs_review"
                                  ? "The original review is saved. This wording needs further analysis."
                                  : ["pending", "processing"].includes(
                                        selected.processingStatus,
                                      )
                                    ? "The original review is saved. The result will appear here."
                                    : "This review contains general feedback without a specific observation."}
                            </p>
                          </div>
                        )}
                        {["pending", "failed", "needs_review"].includes(
                          selected.processingStatus,
                        ) && (
                          <button
                            className="retry-analysis"
                            onClick={() =>
                              void act("analyze", { reviewId: selected.id })
                            }
                          >
                            {busy === "analyze"
                              ? "Analysing…"
                              : selected.processingStatus === "pending"
                                ? "Analyse review"
                                : "Retry analysis"}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div className="empty-state">
                        <h3>Original wording, kept in context.</h3>
                        <p>
                          Select a review to inspect its feedback and
                          observations.
                        </p>
                      </div>
                    )}
                  </article>
                </div>
              </section>
            )}
            {/* 04 Issues: priorities, linked work, and grouped evidence. */}
            {tab === "issues" && (
              <section className="issues-page">
                <PageHeading
                  index="03"
                  eyebrow="From evidence to action"
                  title="Issues and insights"
                  description="Recurring issues appear after four reviews. Urgent and confirmed issues appear sooner."
                />
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
                <div className="split">
                  <div className="issue-list-panel">
                    <div className="review-list issue-list-paginated">
                      {visibleIssues.length ? (
                        visibleIssues.map((item) => (
                          <button
                            key={item.id}
                            className={`review-row ${selectedTheme === item.id ? "chosen" : ""}`}
                            onClick={() => openTheme(item.id)}
                          >
                            <span className="issue-row-heading">
                              <b className="issue-row-title">{item.title}</b>
                              <span
                                className={`priority-chip priority-chip-${item.priority.toLowerCase()}`}
                              >
                                {item.priority}
                              </span>
                            </span>
                            <span className="issue-row-bottom">
                              <span className="issue-row-meta">
                                {branchName(item.branchId)} ·{" "}
                                {state.themeSupport[item.id] || 0} reviews
                              </span>
                              {issueTaskByTheme.has(item.id) ? (
                                <span className="issue-row-work-status">
                                  {issueWorkLabel(
                                    issueTaskByTheme.get(item.id)!.status,
                                  )}
                                </span>
                              ) : (
                                <small className="issue-row-state">
                                  {label(item.status)}
                                </small>
                              )}
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
                          <h3 id="issue-detail-title" tabIndex={-1}>
                            {theme.title}
                          </h3>
                          <div className="issue-title-meta">
                            <span>
                              {state.themeSupport[theme.id] || 0} reviews
                            </span>
                          </div>
                        </div>
                        {issueTask && (
                          <div className="issue-work-strip">
                            <div>
                              <span className="eyebrow">Work task</span>
                              <strong>
                                {issueWorkLabel(issueTask.status)}
                              </strong>
                              <p>
                                {issueTask.title}
                                {issueTask.status === "resolved" &&
                                issueTask.verifiedAt
                                  ? ` · Verified ${date(issueTask.verifiedAt)}`
                                  : issueTask.dueAt
                                    ? ` · Due ${date(issueTask.dueAt)}`
                                    : ""}
                              </p>
                            </div>
                            <button
                              type="button"
                              className="secondary"
                              onClick={() => openTask(issueTask.id)}
                            >
                              View task
                            </button>
                          </div>
                        )}
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
                                    : theme.status === "dismissed"
                                      ? "Dismissed issues stay in the record. Reopen to review them again."
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
                            {theme.status === "dismissed" && (
                              <div className="issue-decision-actions">
                                <button
                                  className="secondary"
                                  onClick={() =>
                                    void act("theme_status", {
                                      themeId: theme.id,
                                      status: "suggested",
                                    })
                                  }
                                >
                                  Reopen issue
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                        <h4>Original evidence</h4>
                        {evidenceGroups.length ? (
                          <div className="evidence-groups">
                            {visibleEvidenceGroups.map((group) => (
                              <section
                                className="evidence-group"
                                key={group.key}
                              >
                                <div className="evidence-group-header">
                                  <strong>
                                    {group.reviews.length}{" "}
                                    {group.reviews.length === 1
                                      ? "guest mention"
                                      : "guest mentions"}
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
                                  onOpenReview={(review) =>
                                    openReview(review.id)
                                  }
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
                          ["owner_confirmed", "recurrence"].includes(
                            theme.status,
                          ) &&
                          (!issueTask ||
                            (issueTask.status === "resolved" &&
                              theme.status === "recurrence")) && (
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
            {/* 05 Tasks: assignment, staff reports, and owner decisions. */}
            {tab === "tasks" && (
              <section className="tasks-page">
                <PageHeading
                  index="04"
                  eyebrow="Follow through"
                  title="Work tasks"
                  description={
                    owner
                      ? "Assign work, review staff reports, and verify what has been resolved."
                      : "Review your assignments, submit completion reports, and respond to owner feedback."
                  }
                />
                <div className="split">
                  <div className="task-lists">
                    {owner && (
                      <>
                        <h3>Draft work tasks</h3>
                        {openTasks
                          .filter((item) =>
                            ["proposed", "deferred"].includes(item.status),
                          )
                          .map((item) => (
                            <button
                              key={item.id}
                              className={`review-row ${task?.id === item.id ? "chosen" : ""}`}
                              onClick={() => openTask(item.id)}
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
                      </>
                    )}
                    <h3>{owner ? "Assigned work" : "Your work"}</h3>
                    {visibleTaskList
                      .filter((item) =>
                        [
                          "approved_open",
                          "in_progress",
                          "reported",
                          "needs_rework",
                        ].includes(item.status),
                      )
                      .map((item) => (
                        <button
                          key={item.id}
                          className={`review-row ${task?.id === item.id ? "chosen" : ""}`}
                          onClick={() => openTask(item.id)}
                        >
                          <b>{item.title}</b>
                          <span>
                            {state.employees.find(
                              (employee) => employee.id === item.assigneeId,
                            )?.name || "Assigned employee"}{" "}
                            ·{" "}
                            {item.status === "reported"
                              ? "Awaiting owner verification"
                              : item.status === "needs_rework"
                                ? "Returned for rework"
                                : "Awaiting employee confirmation"}
                          </span>
                        </button>
                      ))}
                    {!visibleTaskList.some((item) =>
                      [
                        "approved_open",
                        "in_progress",
                        "reported",
                        "needs_rework",
                      ].includes(item.status),
                    ) && (
                      <p className="task-list-empty">
                        {owner
                          ? "No assigned work yet"
                          : "No active work assigned to this staff profile"}
                      </p>
                    )}
                    <div className="completed-tasks">
                      <h3>Completed work tasks</h3>
                      {visibleTaskList
                        .filter((item) => item.status === "resolved")
                        .map((item) => (
                          <button
                            key={item.id}
                            className={`review-row ${task?.id === item.id ? "chosen" : ""}`}
                            onClick={() => openTask(item.id)}
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
                      {!visibleTaskList.some(
                        (item) => item.status === "resolved",
                      ) && (
                        <p className="task-list-empty">No completed work yet</p>
                      )}
                    </div>
                  </div>
                  <div className="card detail task-detail">
                    {task ? (
                      <>
                        <header className="task-detail-header">
                          <p className="eyebrow">
                            Work task /{" "}
                            {branchName(
                              state.themes.find(
                                (item) => item.id === task.themeId,
                              )?.branchId || "",
                            )}
                          </p>
                          <div className="task-detail-title-row">
                            <h2 id="task-detail-title" tabIndex={-1}>
                              {task.title}
                            </h2>
                            <span
                              className={`task-detail-state task-detail-state-${task.status}`}
                            >
                              {task.status === "resolved"
                                ? "Verified"
                                : task.status === "approved_open"
                                  ? "Assigned"
                                  : task.status === "reported"
                                    ? "Awaiting verification"
                                    : label(task.status)}
                            </span>
                          </div>
                        </header>
                        {task.rejectionReason &&
                          ["needs_rework", "in_progress", "reported"].includes(
                            task.status,
                          ) && (
                            <div className="decision-callout" role="note">
                              <strong>
                                {task.status === "needs_rework"
                                  ? "Needs rework"
                                  : "Previous manager feedback"}
                              </strong>
                              <p>{task.rejectionReason}</p>
                              {task.rejectedAt && (
                                <small>Returned {date(task.rejectedAt)}</small>
                              )}
                            </div>
                          )}
                        <section className="task-brief" aria-label="Task brief">
                          <p className="eyebrow">01&nbsp;&nbsp;Task brief</p>
                          <p>{task.description}</p>
                        </section>
                        {!["proposed", "deferred"].includes(task.status) && (
                          <dl className="task-facts">
                            <div>
                              <dt>Assigned to</dt>
                              <dd>
                                {state.employees.find(
                                  (employee) => employee.id === task.assigneeId,
                                )?.name || task.assigneeRole}
                              </dd>
                            </div>
                            <div>
                              <dt>Due</dt>
                              <dd>{date(task.dueAt)}</dd>
                            </div>
                            {task.verifiedAt && (
                              <div>
                                <dt>Verified</dt>
                                <dd>{date(task.verifiedAt)}</dd>
                              </div>
                            )}
                          </dl>
                        )}
                        <TaskEvidencePanel
                          key={task.id}
                          taskId={task.id}
                          themeId={task.themeId}
                          themeTitle={
                            state.themes.find(
                              (item) => item.id === task.themeId,
                            )?.title || "Related issue"
                          }
                          reviews={state.reviews}
                          observations={state.observations}
                          memberships={state.memberships}
                          onOpenTheme={openTheme}
                          onOpenReview={openReview}
                        />
                        <TaskReportHistory
                          attempts={state.taskReportAttempts
                            .filter((attempt) => attempt.taskId === task.id)
                            .sort((a, b) => a.version - b.version)}
                        />
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
                                  void act("edit_task", {
                                    taskId: task.id,
                                    data,
                                  })
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
                        {[
                          "approved_open",
                          "in_progress",
                          "needs_rework",
                        ].includes(task.status) &&
                          owner && (
                            <div className="task-status-note">
                              Waiting for employee report
                            </div>
                          )}

                        {role === "staff" && (
                          <section
                            className="staff-work-update"
                            aria-label="Employee work update"
                          >
                            <label className="staff-employee-picker">
                              Your staff profile
                              <select
                                value={effectiveEmployeeId}
                                onChange={(event) =>
                                  changeEmployee(event.target.value)
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
                                    <option
                                      key={employee.id}
                                      value={employee.id}
                                    >
                                      {employee.name} · {employee.jobTitle}
                                    </option>
                                  ))}
                              </select>
                            </label>
                            {[
                              "approved_open",
                              "in_progress",
                              "needs_rework",
                            ].includes(task.status) &&
                            task.assigneeId === effectiveEmployeeId ? (
                              <div className="staff-work-report">
                                <label>
                                  {task.status === "needs_rework"
                                    ? "Additional fixes completed"
                                    : "Work completed"}
                                  <textarea
                                    rows={4}
                                    value={workReport}
                                    onChange={(event) =>
                                      setWorkReport(event.target.value)
                                    }
                                    placeholder={
                                      task.status === "needs_rework"
                                        ? "Describe how you addressed the owner's feedback…"
                                        : "Describe what you inspected, repaired, or replaced…"
                                    }
                                  />
                                </label>
                                <label className="staff-evidence-upload">
                                  Add photo evidence
                                  <input
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    multiple
                                    onChange={(event) => {
                                      const files = Array.from(
                                        event.currentTarget.files || [],
                                      );
                                      const total = files.reduce(
                                        (size, file) => size + file.size,
                                        0,
                                      );
                                      if (
                                        files.length > 5 ||
                                        total > 6 * 1024 * 1024 ||
                                        files.some(
                                          (file) =>
                                            ![
                                              "image/jpeg",
                                              "image/png",
                                              "image/webp",
                                            ].includes(file.type) ||
                                            file.size > 2 * 1024 * 1024,
                                        )
                                      ) {
                                        setWorkImageError(
                                          "Choose up to five JPEG, PNG, or WebP images, 2 MB each and 6 MB total.",
                                        );
                                        setWorkImages([]);
                                        event.currentTarget.value = "";
                                        return;
                                      }
                                      setWorkImageError("");
                                      setWorkImages(files);
                                    }}
                                  />
                                </label>
                                {workImages.length > 0 && (
                                  <ul className="staff-selected-images">
                                    {workImages.map((file, index) => (
                                      <li key={file.name + file.lastModified}>
                                        {file.name}
                                        <button
                                          type="button"
                                          className="link"
                                          onClick={() =>
                                            setWorkImages((current) =>
                                              current.filter(
                                                (_, itemIndex) =>
                                                  itemIndex !== index,
                                              ),
                                            )
                                          }
                                        >
                                          Remove
                                        </button>
                                      </li>
                                    ))}
                                  </ul>
                                )}
                                {workImageError && (
                                  <p className="field-error" role="alert">
                                    {workImageError}
                                  </p>
                                )}
                                <button
                                  disabled={
                                    !!busy || workReport.trim().length < 10
                                  }
                                  onClick={async () => {
                                    try {
                                      const attachments = await Promise.all(
                                        workImages.map(async (file) => ({
                                          name: file.name,
                                          mediaType: file.type,
                                          dataUrl: await imageAsDataUrl(file),
                                        })),
                                      );
                                      const result = await act("report_task", {
                                        taskId: task.id,
                                        effectiveEmployeeId,
                                        note: workReport,
                                        attachments,
                                      });
                                      if (result) {
                                        setWorkReport("");
                                        setWorkImages([]);
                                        setWorkImageError("");
                                      }
                                    } catch {
                                      setWorkImageError(
                                        "Could not read the selected image. Choose it again.",
                                      );
                                    }
                                  }}
                                >
                                  {busy === "report_task"
                                    ? "Submitting…"
                                    : "Submit update"}
                                </button>
                              </div>
                            ) : (
                              <p className="staff-assignment-note">
                                {task.status === "reported"
                                  ? "Your update was submitted and is waiting for owner review."
                                  : `Assigned to ${state.employees.find((employee) => employee.id === task.assigneeId)?.name || "another employee"}. Select the assigned staff profile to submit an update.`}
                              </p>
                            )}
                          </section>
                        )}
                        {task.status === "reported" && owner && (
                          <div className="controls verification-actions">
                            <button
                              disabled={!!busy}
                              onClick={() =>
                                void act("verify_task", {
                                  taskId: task.id,
                                  reportVersion: task.reportVersion,
                                })
                              }
                            >
                              Verify completed work
                            </button>
                            <button
                              className="secondary"
                              disabled={!!busy}
                              onClick={() => {
                                setDecision({
                                  kind: "task",
                                  id: task.id,
                                  version: task.reportVersion,
                                });
                                setDecisionNote("");
                                setDecisionError("");
                              }}
                            >
                              Reject / return for rework
                            </button>
                          </div>
                        )}
                        {task.status === "resolved" && (
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
                        )}
                      </>
                    ) : (
                      <p className="muted">No work tasks yet.</p>
                    )}
                  </div>
                </div>
              </section>
            )}
            {/* 06 Replies: drafts, revision, approval, and simulated posting. */}
            {tab === "replies" && (
              <section className="replies-page">
                <div className="reply-page-heading">
                  <PageHeading
                    index="05"
                    eyebrow="Close the loop"
                    title="Manage replies"
                    description="Review each response beside the guest’s original words."
                  />
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
                      replies are ready. Select Prepare replies from the
                      completed task to finish the rest.
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
                            void act("edit_reply", {
                              replyId: reply.id,
                              text,
                              draftVersion: reply.draftVersion,
                            })
                          }
                          approve={async (text, partialApproved) => {
                            let version = reply.draftVersion;
                            if (text !== reply.text) {
                              const saved = await act("edit_reply", {
                                replyId: reply.id,
                                text,
                                draftVersion: version,
                              });
                              if (!saved) return;
                              version = (saved as Reply).draftVersion;
                            }
                            await act("approve_reply", {
                              replyId: reply.id,
                              partialApproved,
                              draftVersion: version,
                            });
                          }}
                          reject={() => {
                            setDecision({
                              kind: "reply",
                              id: reply.id,
                              version: reply.draftVersion,
                            });
                            setDecisionNote("");
                            setDecisionError("");
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
                        disabled={
                          currentReplyIndex >= currentReplies.length - 1
                        }
                        onClick={() => setReplyIndex(currentReplyIndex + 1)}
                      >
                        Next review
                      </button>
                    </nav>
                  </>
                ) : (
                  <div className="card empty-state-card">
                    <p className="empty-state-title">No response drafts yet</p>
                    <p className="empty-state-copy">
                      Drafts appear here once a verified work task has replies prepared for linked guest feedback.
                    </p>
                  </div>
                )}
              </section>
            )}
            {/* 07 Activity: persistent decision and workflow history. */}
            {tab === "activity" && (
              <ActivityView
                events={state.events}
                employees={state.employees}
                tasks={state.tasks}
                themes={state.themes}
                reviews={state.reviews}
                replies={state.replies}
                onOpenTask={openTask}
              />
            )}
          </fieldset>
        </main>
      )}
      <footer className="workspace-footer">
        <span className="workspace-footer-brand">Clarity</span>
        <span className="workspace-footer-purpose">
          Customer feedback and operational follow-through
        </span>
      </footer>
      {decision && (
        <div
          className="decision-overlay"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget && !busy)
              setDecision(null);
          }}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="decision-title"
            aria-describedby="decision-description"
            className="decision-dialog"
            onKeyDown={(event) => {
              if (event.key === "Escape" && !busy) setDecision(null);
              if (event.key !== "Tab") return;
              const controls = [
                ...event.currentTarget.querySelectorAll<HTMLElement>(
                  "textarea, button:not(:disabled)",
                ),
              ];
              const first = controls[0],
                last = controls.at(-1);
              if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last?.focus();
              } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first?.focus();
              }
            }}
          >
            <p className="eyebrow">Owner decision</p>
            <h2 id="decision-title">
              {decision.kind === "task"
                ? "Return this work for rework?"
                : "Reject this reply draft?"}
            </h2>
            <p id="decision-description">
              {decision.kind === "task"
                ? "The employee will see your reason and can submit a corrected report. Replies stay blocked until you verify the work."
                : "Publishing will be blocked. Revise the draft before it can be approved again."}
            </p>
            <label htmlFor="decision-reason">Reason for rejection</label>
            <textarea
              id="decision-reason"
              ref={decisionInput}
              rows={4}
              maxLength={500}
              value={decisionNote}
              aria-invalid={!!decisionError}
              aria-describedby={decisionError ? "decision-error" : undefined}
              onChange={(event) => {
                setDecisionNote(event.target.value);
                setDecisionError("");
              }}
              onBlur={() => {
                if (decisionNote.length && decisionNote.trim().length < 10)
                  setDecisionError(
                    "Write at least 10 characters so the next person knows what to change.",
                  );
              }}
              placeholder={
                decision.kind === "task"
                  ? "What still needs to be fixed?"
                  : "What should the revised reply change?"
              }
            />
            {decisionError && (
              <p id="decision-error" role="alert" className="field-error">
                {decisionError}
              </p>
            )}
            <p className="form-hint">
              10–500 characters. This reason is saved in the activity log.
            </p>
            <div className="controls">
              <button
                className="secondary"
                type="button"
                disabled={!!busy}
                onClick={() => setDecision(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!!busy || decisionNote.trim().length < 10}
                onClick={async () => {
                  if (decisionNote.trim().length < 10) {
                    setDecisionError(
                      "Write at least 10 characters so the next person knows what to change.",
                    );
                    return;
                  }
                  const result = await act(
                    decision.kind === "task"
                      ? "reject_task_report"
                      : "reject_reply",
                    {
                      [decision.kind === "task" ? "taskId" : "replyId"]:
                        decision.id,
                      [decision.kind === "task"
                        ? "reportVersion"
                        : "draftVersion"]: decision.version,
                      reason: decisionNote.trim(),
                    },
                  );
                  if (result) setDecision(null);
                }}
              >
                {busy
                  ? "Saving decision…"
                  : decision.kind === "task"
                    ? "Return for rework"
                    : "Reject draft"}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
    </>
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
          aria-label="Due date"
          aria-describedby={!dueAt ? "task-due-hint" : undefined}
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
        />
        {!dueAt && (
          <span id="task-due-hint" className="form-hint">
            Set a due date before assigning.
          </span>
        )}
      </label>
      <div className="controls">
        <button className="secondary" onClick={() => save(data())}>
          Save edits
        </button>
        <button className="secondary" onClick={() => defer(data())}>
          Keep for later
        </button>
        <button
          disabled={
            !title.trim() || !description.trim() || !assigneeId || !dueAt
          }
          onClick={() => approve(data())}
        >
          Approve and assign
        </button>
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
  reject,
  publish,
}: {
  reply: Reply;
  review?: Review;
  owner: boolean;
  save: (text: string) => void;
  approve: (text: string, partialApproved: boolean) => void;
  reject: () => void;
  publish: () => void;
}) {
  const [text, setText] = useState(reply.text);
  const unresolvedConcerns = reply.partialWarning
    ?.replace(/^Other complaints? in this review remains? unresolved:\s*/i, "")
    .split(/;\s*/)
    .map((concern) => concern.trim().replace(/[.;]+$/, ""))
    .filter(Boolean);
  return (
    <div className="card reply">
      <div className="reply-source">
        <div className="reply-card-heading">
          <h3>Original review</h3>
          <StatusBadge status={reply.status} />
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
        {reply.status === "needs_revision" && reply.rejectionReason && (
          <div className="decision-callout" role="note">
            <strong>Needs revision</strong>
            <p>{reply.rejectionReason}</p>
          </div>
        )}
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
                {reply.status === "needs_revision"
                  ? "Submit revised draft"
                  : "Save edits"}
              </button>
            )}
            {reply.status === "draft" && (
              <button
                onClick={() => approve(text, Boolean(reply.partialWarning))}
              >
                {reply.partialWarning
                  ? "Approve partial reply"
                  : "Approve reply"}
              </button>
            )}
            {reply.status === "draft" && (
              <button className="secondary reject-action" onClick={reject}>
                Reject draft
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
