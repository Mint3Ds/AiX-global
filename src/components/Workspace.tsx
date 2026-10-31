"use client";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DashboardView } from "@/components/design/DashboardView";
import { ActivityView } from "@/components/design/ActivityView";
import { StatsView } from "@/components/design/StatsView";
import { TaskEvidencePanel } from "@/components/design/TaskEvidencePanel";
import { TaskReportHistory } from "@/components/design/TaskReportHistory";
import { TaskEditHistory } from "@/components/design/TaskEditHistory";
import { OrbyteHandoffDetails } from "@/components/design/OrbyteHandoffDetails";
import {
  ReportAttachmentPicker,
  evidenceMediaType,
} from "@/components/design/ReportAttachmentPicker";
import { StaffDashboardView } from "@/components/design/StaffDashboardView";
import { PageHeading, StatusBadge } from "@/components/design/PageHeading";
import { RatingStars } from "@/components/design/RatingStars";
import { BrandLoadingScreen } from "@/components/design/BrandLoadingScreen";
import {
  WorkspaceHeader,
  type WorkspaceTab as Tab,
} from "@/components/design/WorkspaceHeader";
import { CustomDropdown } from "@/components/design/CustomDropdown";
import type { WorkspaceMetrics } from "@/domain/metrics";
import {
  reviewCategoryGroup,
  reviewCategoryOptions,
} from "@/domain/review-filter";
import { getSimulatedAttendance } from "@/integrations/orbyte/attendance";

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
  firstViewedAt?: string | null;
  lastViewedAt?: string | null;
  triagedAt?: string | null;
  triageDurationSeconds?: number | null;
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
  observations: Observation[];
};
type Task = {
  id: string;
  themeId: string;
  branchId: string;
  title: string;
  description: string;
  priority: string;
  originalTitle: string | null;
  originalDescription: string | null;
  assigneeRole: string;
  assigneeId: string | null;
  dueAt: string | null;
  employeeReport: string | null;
  reportVersion: number;
  rejectionReason: string | null;
  reworkInstructions: string | null;
  rejectedAt: string | null;
  reportedAt: string | null;
  reportedBy: string | null;
  verifiedAt: string | null;
  recurrenceOfTaskId: string | null;
  status: string;
  resolutionNote: string | null;
  approvedAt: string | null;
  taskVersion: number;
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
  decisionInstructions: string | null;
  decidedAt: string | null;
  attachments: {
    id: string;
    name: string;
    mediaType: string;
    uploadedBy: string;
    context: string;
    url: string;
  }[];
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
  businesses: { id: string; name: string; businessType: string; issueCount?: number }[];
  branches: { id: string; businessId: string; name: string; timezone: string }[];
  employees: {
    id: string;
    businessId: string;
    branchId: string;
    name: string;
    jobTitle: string;
    orbyteStaffId: string;
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
    approvedTaskVersion: number;
    payload: Record<string, unknown>;
    simulatedStatus: string;
    createdAt: string;
  }[];
  themeSupport: Record<string, number>;
  metrics?: WorkspaceMetrics;
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

const fileAsDataUrl = (file: File) =>
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
const evidencePayload = (files: File[]) =>
  Promise.all(
    files.map(async (file) => ({
      name: file.name,
      mediaType: evidenceMediaType(file),
      dataUrl: await fileAsDataUrl(file),
    })),
  );
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
    start_task: "Work started.",
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
  };
  if (type === "membership")
    return values.themeId
      ? "Feedback moved to the selected issue."
      : "Feedback removed from its issue.";
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
function observationThemeType(kind: string) {
  if (kind === "operational_complaint") return "operational_issue";
  if (kind === "suggestion") return "suggestion";
  return "positive_pattern";
}

function ObservationIssueControl({
  observation,
  businessId,
  themes,
  currentTheme,
  disabled,
  onMove,
}: {
  observation: Observation;
  businessId: string;
  themes: Theme[];
  currentTheme: Theme | null;
  disabled: boolean;
  onMove: (themeId: string | null) => Promise<unknown>;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const candidates = themes.filter(
    (theme) =>
      theme.id !== currentTheme?.id &&
      theme.businessId === businessId &&
      theme.branchId === observation.branchId &&
      theme.type === observationThemeType(observation.kind) &&
      theme.status !== "dismissed",
  );
  const matchingCandidates = candidates
    .filter((theme) =>
      !query.trim() || theme.title.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase()),
    )
    .slice(0, 6);

  const move = async (themeId: string | null) => {
    const result = await onMove(themeId);
    if (result) {
      setOpen(false);
      setQuery("");
    }
  };

  return (
    <div className="observation-issue-control">
      <button
        type="button"
        className="link observation-issue-trigger"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        {currentTheme ? "Change issue" : "Link to an issue"}
      </button>
      {open && (
        <div
          className="observation-issue-panel"
          role="group"
          aria-label="Move this feedback"
        >
          <p>
            {currentTheme
              ? `Move this feedback from ${currentTheme.title}.`
              : "Choose an issue at this property."}
          </p>
          {candidates.length > 5 && (
            <input
              className="observation-issue-search"
              type="search"
              aria-label="Search active issues"
              placeholder="Find an issue by name"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          )}
          {matchingCandidates.length ? (
            <ul>
              {matchingCandidates.map((theme) => (
                <li key={theme.id}>
                  <button
                    type="button"
                    disabled={disabled}
                    onClick={() => void move(theme.id)}
                  >
                    <span>{theme.title}</span>
                    <small>{label(theme.priority)} priority</small>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="observation-issue-empty">
              {query
                ? "No matching active issue at this property."
                : "No other active issue matches this feedback type at this property."}
            </p>
          )}
          {!query && candidates.length > matchingCandidates.length && (
            <p className="observation-issue-count">
              Showing 6 of {candidates.length}. Search to find another issue.
            </p>
          )}
          <div className="observation-issue-actions">
            {currentTheme && (
              <button
                type="button"
                className="link"
                disabled={disabled}
                onClick={() => void move(null)}
              >
                Remove from issue
              </button>
            )}
            <button
              type="button"
              className="link"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
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
const workspaceTabs: Tab[] = [
  "dashboard",
  "reviews",
  "issues",
  "tasks",
  "replies",
  "activity",
  "new",
];
const isOwnerVisibleTheme = (theme: Theme, support: number) =>
  theme.status !== "dismissed" &&
  (theme.type === "operational_issue"
    ? support > 0 &&
      (support >= 4 ||
        theme.priority === "urgent" ||
        ["owner_confirmed", "recurrence"].includes(theme.status))
    : support > 0 || theme.status === "owner_confirmed");

/**
 * Workspace owns the shared snapshot, filters, and navigation for all tabs.
 * For visual edits, start with tokens.css and the matching screen section below.
 */
export function Workspace({
  initialTab = "dashboard",
}: {
  initialTab?: Tab;
} = {}) {
  // UI-only state. Server data is always refreshed from /api/state after actions.
  const [state, setState] = useState<State | null>(null);
  const [error, setError] = useState("");
  const [errorSource, setErrorSource] = useState<"load" | "action" | null>(
    null,
  );
  const [busy, setBusy] = useState("");
  const [message, setMessage] = useState("");
  const [tab, setTab] = useState<Tab>(initialTab);
  const navigateTab = useCallback(
    (nextTab: Tab, replace = false) => {
      if (typeof window !== "undefined" && (nextTab !== tab || replace)) {
        const historyState = {
          ...window.history.state,
          clarityWorkspaceTab: nextTab,
        };
        if (replace)
          window.history.replaceState(historyState, "", window.location.href);
        else
          window.history.pushState(historyState, "", window.location.href);
      }
      setTab(nextTab);
    },
    [tab],
  );
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
  const [selectedTheme, setSelectedTheme] = useState<string | null>(
    "hotel-central-ac",
  );
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
  const [ownerVerifyNote, setOwnerVerifyNote] = useState("");
  const [ownerVerifyNoteError, setOwnerVerifyNoteError] = useState("");
  const [ownerVerifyFiles, setOwnerVerifyFiles] = useState<File[]>([]);
  const [ownerVerifyFileError, setOwnerVerifyFileError] = useState("");
  const [decisionFiles, setDecisionFiles] = useState<File[]>([]);
  const [decisionFileError, setDecisionFileError] = useState("");
  const [decision, setDecision] = useState<{
    kind: "task" | "reply";
    id: string;
    version: number;
  } | null>(null);
  const [decisionNote, setDecisionNote] = useState("");
  const [decisionInstructions, setDecisionInstructions] = useState("");
  const [decisionInstructionsError, setDecisionInstructionsError] = useState("");
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
  useEffect(() => {
    const restoreWorkspaceTab = (event: PopStateEvent) => {
      const previousTab = event.state?.clarityWorkspaceTab;
      setTab(
        typeof previousTab === "string" &&
          workspaceTabs.includes(previousTab as Tab)
          ? (previousTab as Tab)
          : "dashboard",
      );
    };
    window.addEventListener("popstate", restoreWorkspaceTab);
    return () => window.removeEventListener("popstate", restoreWorkspaceTab);
  }, []);
  // Shared data loading and action feedback for every tab.
  const refresh = useCallback(async () => {
    try {
      for (let attempt = 0; attempt < 3; attempt += 1) {
        try {
          const response = await fetch(
            `/api/state?businessId=${encodeURIComponent(businessId)}`,
            { cache: "no-store" },
          );
          if (response.status === 503 && attempt < 2) {
            await new Promise((resolve) =>
              setTimeout(resolve, 300 * 2 ** attempt),
            );
            continue;
          }
          const body = await response.json();
          if (!response.ok) throw new Error(body.error || "Could not load data");
          if (activeBusinessId.current !== businessId) return;
          setCachedBusinesses(body.businesses || []);
          setState(body);
          setError("");
          setErrorSource(null);
          return;
        } catch (reason) {
          // Browser/network connection resets are safe to retry because this
          // endpoint only reads state. Do not retry application errors.
          if (!(reason instanceof TypeError) || attempt === 2) throw reason;
          await new Promise((resolve) =>
            setTimeout(resolve, 300 * 2 ** attempt),
          );
        }
      }
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

  const activeReviewTimerRef = useRef<{
    reviewId: string;
    startTime: number;
  } | null>(null);

  useEffect(() => {
    if (tab === "reviews" && selectedReview) {
      activeReviewTimerRef.current = {
        reviewId: selectedReview,
        startTime: performance.now(),
      };

      void fetch("/api/action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "track_view",
          role,
          businessId,
          reviewId: selectedReview,
        }),
      }).catch(() => {});
    }

    return () => {
      if (activeReviewTimerRef.current) {
        const { reviewId, startTime } = activeReviewTimerRef.current;
        const totalSeconds = Math.round((performance.now() - startTime) / 1000);
        if (totalSeconds >= 1) {
          void fetch("/api/action", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              type: "record_dwell",
              role,
              businessId,
              reviewId,
              durationSeconds: totalSeconds,
            }),
          })
            .then(() => void refresh())
            .catch(() => {});
        }
        activeReviewTimerRef.current = null;
      }
    };
  }, [tab, selectedReview, role, businessId, refresh]);
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
      navigateTab("reviews");
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
  const completedTasks = useMemo(
    () =>
      (state?.tasks || []).filter(
        (item) =>
          item.status === "resolved" &&
          (owner || item.assigneeId === effectiveEmployeeId),
      ),
    [state, owner, effectiveEmployeeId],
  );
  const visibleTaskList = owner
    ? [...openTasks, ...completedTasks]
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
      {
        quote: string;
        reviews: Map<string, Review>;
        observations: Observation[];
      }
    >();

    for (const point of themeObservations) {
      const quote = point.evidenceQuote.trim().replace(/\s+/g, " ");
      const key = quote ? quote.toLocaleLowerCase() : `observation:${point.id}`;
      const review = reviewsById.get(point.reviewId);
      if (!review) continue;

      if (!groups.has(key))
        groups.set(key, { quote, reviews: new Map(), observations: [] });
      groups.get(key)!.reviews.set(review.id, review);
      groups.get(key)!.observations.push(point);
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
        observations: group.observations,
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
  const taskThemeId = task?.themeId;
  const affectedReviews = (() => {
    if (!state || !taskThemeId) return [];
    const reviewIds = new Set(
      state.observations
        .filter((point) =>
          state.memberships.some(
            (membership) =>
              membership.themeId === taskThemeId &&
              membership.observationId === point.id,
          ),
        )
        .map((point) => point.reviewId),
    );
    return state.reviews.filter((review) => reviewIds.has(review.id));
  })();
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
              points.some(
                (point) =>
                  reviewCategoryGroup(label(point.category)) === category,
              )) &&
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
  const categories = reviewCategoryOptions(
    (state?.observations || []).map((observation) => observation.category),
  );
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
    navigateTab("issues");
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
    navigateTab("reviews");
    revealDetailOnMobile("review-detail-title", 900);
  };
  const openTask = (id: string) => {
    setWorkReport("");
    setWorkImages([]);
    setWorkImageError("");
    setOwnerVerifyNote("");
    setOwnerVerifyNoteError("");
    setOwnerVerifyFiles([]);
    setOwnerVerifyFileError("");
    setSelectedTask(id);
    navigateTab("tasks");
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
          ["suggested", "recurrence"].includes(item.status) &&
          ["urgent", "high"].includes(item.priority),
      )
      .sort((a, b) => {
        return (
          priorityRank(b.priority) - priorityRank(a.priority) ||
          b.severity - a.severity ||
          (state.themeSupport[b.id] || 0) - (state.themeSupport[a.id] || 0)
        );
      })
      .slice(0, 3) || [];
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
  const dashboardReviews = state?.reviews || [];
  const dashboardThemes = state?.themes || [];
  const dashboardThemeSupport = state?.themeSupport || {};
  const dashboardTasks = state?.tasks || [];
  const dashboardToday = new Date();
  const analyzedReviewIds = new Set(
    (state?.observations || []).map((point) => point.reviewId),
  );
  const dailyReviewSeries = Array.from({ length: 7 }, (_, index) => {
    const offset = 6 - index;
    const dateForDay = new Date(dashboardToday);
    dateForDay.setDate(dashboardToday.getDate() - offset);
    const day = localDay(dateForDay.toISOString());
    return {
      label: offset === 0
        ? "Today"
        : dateForDay.toLocaleDateString("en-MY", {
            weekday: "short",
            timeZone: "Asia/Kuala_Lumpur",
          }),
      value: dashboardReviews.filter(
        (review) =>
          !review.isHistoricalImport && localDay(review.createdAt) === day,
      ).length,
    };
  });
  const issuePrioritySegments = [
    { label: "Urgent", priority: "urgent", tone: "urgent" },
    { label: "High", priority: "high", tone: "high" },
    { label: "Medium", priority: "medium", tone: "medium" },
    { label: "Low", priority: "low", tone: "low" },
  ].map((item) => ({
    ...item,
    value: dashboardThemes.filter(
      (theme) =>
        theme.type === "operational_issue" &&
        isOwnerVisibleTheme(theme, dashboardThemeSupport[theme.id] || 0) &&
        ["suggested", "recurrence"].includes(theme.status) &&
        theme.priority === item.priority,
    ).length,
  }));
  const taskFlowSegments = [
    { label: "Assigned", status: "approved_open", tone: "assigned" },
    { label: "Active", status: "in_progress", tone: "progress" },
    { label: "Review", status: "reported", tone: "review" },
    { label: "Rework", status: "needs_rework", tone: "rework" },
  ].map((item) => ({
    ...item,
    value: dashboardTasks.filter((task) => task.status === item.status).length,
  }));

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
            : [{ id: "harbour-house", name: "Harbour House Hotel", issueCount: 11 }])
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
          navigateTab("dashboard", true);
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
          navigateTab(nextTab);
        }}
        onRoleChange={(nextRole) => {
          setRole(nextRole);
          if (
            nextRole === "staff" &&
            ["reviews", "issues", "new", "replies"].includes(tab)
          )
            navigateTab("dashboard", true);
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
                          "resolved",
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
                      description: item.description,
                      priority: item.priority,
                      relatedIssue: state.themes.find((theme) => theme.id === item.themeId)?.title || "Related issue",
                      sourceReviewCount: state.themeSupport[item.themeId] || 0,
                      status: item.status,
                      dueAt: item.dueAt,
                      rejectionReason: item.rejectionReason,
                      reworkInstructions: item.reworkInstructions,
                      rejections: state.taskReportAttempts.filter(
                        (attempt) =>
                          attempt.taskId === item.id &&
                          attempt.decision === "rejected",
                      ).length,
                    }))}
                  onEmployeeChange={changeEmployee}
                  onOpenTask={openTask}
                  onOpenTasks={() => navigateTab("tasks")}
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
                      visual: {
                        type: "ratings" as const,
                        segments: [1, 2, 3, 4, 5].map((rating) => ({
                          label: `${rating} star${rating === 1 ? "" : "s"}`,
                          value: state.reviews.filter(
                            (review) => Math.round(review.rating) === rating,
                          ).length,
                          tone: "cool",
                        })),
                      },
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
                      visual: {
                        type: "distribution" as const,
                        segments: [
                          { label: "Urgent", priority: "urgent", tone: "deep" },
                          { label: "High", priority: "high", tone: "mid" },
                          { label: "Medium", priority: "medium", tone: "soft" },
                          { label: "Low", priority: "low", tone: "pale" },
                        ].map((priority) => ({
                          label: priority.label,
                          tone: priority.tone,
                          value: state.themes.filter(
                            (theme) =>
                              theme.type === "operational_issue" &&
                              isOwnerVisibleTheme(
                                theme,
                                state.themeSupport[theme.id] || 0,
                              ) &&
                              ["suggested", "recurrence"].includes(theme.status) &&
                              theme.priority === priority.priority,
                          ).length,
                        })),
                      },
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
                      visual: {
                        type: "distribution" as const,
                        segments: [
                          { label: "Assigned", status: "approved_open", tone: "pale" },
                          { label: "In progress", status: "in_progress", tone: "mid" },
                          { label: "Awaiting verification", status: "reported", tone: "deep" },
                          { label: "Needs rework", status: "needs_rework", tone: "warm" },
                        ].map((status) => ({
                          label: status.label,
                          tone: status.tone,
                          value: state.tasks.filter(
                            (task) => task.status === status.status,
                          ).length,
                        })),
                      },
                    },
                    {
                      title: "Replies to approve",
                      value: state.replies.filter(
                        (reply) => reply.status === "draft",
                      ).length,
                      hint: "Awaiting sign-off",
                      destination: "replies",
                      visual: {
                        type: "distribution" as const,
                        segments: [
                          { label: "Draft", status: "draft", tone: "deep" },
                          { label: "Approved", status: "approved_ready", tone: "mid" },
                          { label: "Published", status: "simulated_published", tone: "pale" },
                          { label: "Needs revision", status: "needs_revision", tone: "warm" },
                        ].map((status) => ({
                          label: status.label,
                          tone: status.tone,
                          value: state.replies.filter(
                            (reply) => reply.status === status.status,
                          ).length,
                        })),
                      },
                    },
                  ]}
                  issues={priorityIssues.map((item) => ({
                    id: item.id,
                    title: item.title,
                    priority: item.priority,
                    branchName: branchName(item.branchId),
                    support: state.themeSupport[item.id] || 0,
                    status: item.status === "recurrence" ? "Recurring" : "New issue",
                    evidenceQuote:
                      state.observations.find((point) =>
                        state.memberships.some(
                          (m) =>
                            m.themeId === item.id &&
                            m.observationId === point.id,
                        ),
                      )?.evidenceQuote ||
                      (item.id === spotlight?.id
                        ? spotlightEvidence?.evidenceQuote
                        : undefined),
                  }))}
                  work={state.tasks
                    .filter((task) =>
                      [
                        "approved_open",
                        "in_progress",
                        "reported",
                        "needs_rework",
                        "proposed",
                        "deferred",
                      ].includes(task.status),
                    )
                    .sort(
                      (a, b) =>
                        Number(["reported", "proposed", "deferred"].includes(b.status)) -
                          Number(["reported", "proposed", "deferred"].includes(a.status)) ||
                        (a.dueAt || "9999").localeCompare(b.dueAt || "9999"),
                    )
                    .slice(0, 5)
                    .map((item) => ({
                      id: item.id,
                      title: item.title,
                      description: item.description,
                      priority: item.priority,
                      relatedIssue:
                        state.themes.find((theme) => theme.id === item.themeId)?.title || "",
                      status: item.status,
                      assigneeId: item.assigneeId,
                      dueAt: item.dueAt,
                      reportVersion: item.reportVersion,
                      assignee:
                        state.employees.find(
                          (employee) => employee.id === item.assigneeId,
                        )?.name || "Not yet assigned",
                      due: item.dueAt
                        ? `Due ${date(item.dueAt)}`
                        : "Due date not set",
                      employees: state.employees
                        .filter((employee) => employee.branchId === item.branchId)
                        .map(({ id, name, jobTitle, orbyteStaffId }) => ({
                          id,
                          name,
                          jobTitle,
                          orbyteStaffId,
                        })),
                      timezone:
                        state.branches.find((branch) => branch.id === item.branchId)
                          ?.timezone || "Asia/Kuala_Lumpur",
                    }))}
                  onOpenTask={openTask}
                  busy={busy}
                  onVerifyTask={(taskId, reportVersion) =>
                    void act("verify_task", { taskId, reportVersion })
                  }
                  onRejectTask={(taskId, reportVersion) => {
                    setDecision({ kind: "task", id: taskId, version: reportVersion });
                    setDecisionNote("");
                    setDecisionInstructions("");
                    setDecisionInstructionsError("");
                    setDecisionError("");
                    setDecisionFiles([]);
                    setDecisionFileError("");
                  }}
                  onApproveTask={async (taskItem, assigneeId, dueAt) => {
                    const employee = state.employees.find((item) => item.id === assigneeId);
                    const saved = await act("edit_task", {
                      taskId: taskItem.id,
                      data: {
                        title: taskItem.title,
                        description: taskItem.description,
                        priority: taskItem.priority,
                        assigneeRole: employee?.jobTitle || "Employee",
                        assigneeId,
                        dueAt,
                      },
                    });
                    if (saved)
                      await act("decide_task", {
                        taskId: taskItem.id,
                        decision: "approve",
                      });
                  }}
                  activity={recentActivity.map((item) => ({
                    id: item.id,
                    title: label(item.type),
                    description: formatEventDescription(item.description),
                    date: date(item.createdAt),
                  }))}
                  onNewReview={() => navigateTab("new")}
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
                    navigateTab(destination);
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
                  description="Personal identifiers are removed before review text is stored and analyzed."
                />
                <div className="new-review-layout">
                  <form
                    className="card form new-review-form"
                    onSubmit={submitNew}
                  >
                    <div className="new-review-form-heading">
                      <h3>Review details</h3>
                      <p>Review text is screened for personal identifiers before it enters the workspace.</p>
                    </div>

                    <label>
                      Property or branch
                      <CustomDropdown
                        ariaLabel="Property or branch"
                        sectionLabel="Select Property"
                        value={newBranch}
                        options={state.branches.map((item) => ({
                          value: item.id,
                          label: item.name,
                        }))}
                        onChange={(value) => setNewBranch(value)}
                        align="left"
                        fullWidth
                      />
                    </label>
                    <label>
                      Rating
                      <CustomDropdown
                        ariaLabel="Rating"
                        sectionLabel="Guest Rating"
                        value={String(newRating)}
                        options={[1, 2, 3, 4, 5].map((value) => ({
                          value: String(value),
                          label: `${"★".repeat(value)}${"☆".repeat(5 - value)}`,
                          meta: `${value}/5`,
                        }))}
                        onChange={(value) => setNewRating(Number(value))}
                        align="left"
                        fullWidth
                      />
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
                      <small className="intake-privacy-note">
                        Contact, identity, and payment number patterns are
                        redacted before saving or external AI analysis.
                      </small>
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
                        onClick={() => navigateTab("reviews")}
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
                        placeholder="Search reviews or evidence"
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
                      <CustomDropdown
                        ariaLabel="Property"
                        sectionLabel="Filter by Property"
                        value={branch}
                        options={[
                          { value: "all", label: "All properties" },
                          ...state.branches.map((item) => ({
                            value: item.id,
                            label: item.name,
                          })),
                        ]}
                        onChange={(value) =>
                          changeReviewFilter(() => setBranch(value))
                        }
                        align="left"
                        fullWidth
                      />
                    </label>
                    <label>
                      Rating
                      <CustomDropdown
                        ariaLabel="Rating"
                        sectionLabel="Filter by Rating"
                        value={String(rating)}
                        options={[
                          { value: "all", label: "All ratings" },
                          ...[1, 2, 3, 4, 5].map((value) => ({
                            value: String(value),
                            label: `${value} ${value === 1 ? "star" : "stars"}`,
                          })),
                        ]}
                        onChange={(value) =>
                          changeReviewFilter(() => setRating(value))
                        }
                        align="left"
                        fullWidth
                      />
                    </label>

                    <button
                      className="secondary filter-toggle"
                      aria-expanded={showReviewFilters}
                      aria-controls="advanced-review-filters"
                      onClick={() => setShowReviewFilters(!showReviewFilters)}
                    >
                      Filters
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
                      <CustomDropdown
                        ariaLabel="Category"
                        sectionLabel="Filter by Category"
                        value={category}
                        options={[
                          { value: "all", label: "All categories" },
                          ...categories.map((item) => ({
                            value: item.key,
                            label: item.name,
                          })),
                        ]}
                        onChange={(value) =>
                          changeReviewFilter(() => setCategory(value))
                        }
                        align="left"
                        fullWidth
                      />
                    </label>
                    <label>
                      Screening status
                      <CustomDropdown
                        ariaLabel="Screening status"
                        sectionLabel="Screening Status"
                        value={status}
                        options={[
                          { value: "all", label: "All statuses" },
                          { value: "attention", label: "Needs attention" },
                          ...[
                            "pending",
                            "processing",
                            "complete",
                            "generic",
                            "needs_review",
                            "failed",
                          ].map((value) => ({
                            value,
                            label: label(value),
                          })),
                        ]}
                        onChange={(value) =>
                          changeReviewFilter(() => setStatus(value))
                        }
                        align="left"
                        fullWidth
                      />
                    </label>
                    <label>
                      Received
                      <CustomDropdown
                        ariaLabel="Received"
                        sectionLabel="Received Date"
                        value={received}
                        options={[
                          { value: "all", label: "All dates" },
                          { value: "today", label: "Today" },
                        ]}
                        onChange={(value) =>
                          changeReviewFilter(() => setReceived(value))
                        }
                        align="right"
                        fullWidth
                      />
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
                        Clear filters
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
                  </p>

                  <div>
                    <span className="sr-only">Sort reviews</span>
                    <CustomDropdown
                      ariaLabel="Sort reviews"
                      sectionLabel="Sort Reviews"
                      value={reviewSort}
                      options={[
                        { value: "newest", label: "Newest first" },
                        { value: "oldest", label: "Oldest first" },
                        { value: "lowest", label: "Lowest rating" },
                        { value: "highest", label: "Highest rating" },
                      ]}
                      onChange={(value) =>
                        changeReviewFilter(() => setReviewSort(value))
                      }
                      align="right"
                    />
                  </div>

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
                              navigateTab("replies");
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
                                  {owner && (
                                    <ObservationIssueControl
                                      observation={point}
                                      businessId={businessId}
                                      themes={state.themes.filter(
                                        (candidate) =>
                                          candidate.businessId ===
                                            businessId &&
                                          candidate.branchId === point.branchId &&
                                          candidate.type ===
                                            observationThemeType(point.kind),
                                      )}
                                      currentTheme={linkedTheme || null}
                                      disabled={busy === "membership"}
                                      onMove={(themeId) =>
                                        act("membership", {
                                          observationId: point.id,
                                          themeId,
                                        })
                                      }
                                    />
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
                                {state.themeSupport[item.id] || 0} distinct source
                                {state.themeSupport[item.id] === 1
                                  ? " review"
                                  : " reviews"}
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
                              {state.themeSupport[theme.id] || 0} distinct source
                              {state.themeSupport[theme.id] === 1
                                ? " review"
                                : " reviews"}
                            </span>
                          </div>
                        </div>
                        {theme.priorityReason.trim() && (
                          <details className="priority-rationale">
                            <summary>Why this priority</summary>
                            <p>{theme.priorityReason}</p>
                          </details>
                        )}
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
                                      ? "Dismissed feedback remains available in Reviews and Activity."
                                      : "Severity sets the issue priority."}
                                </p>
                              </div>

                              <label>
                                Severity
                                <CustomDropdown
                                  ariaLabel="Severity"
                                  sectionLabel="Issue Severity"
                                  value={String(theme.severity)}
                                  options={[
                                    { value: "1", label: "Low" },
                                    { value: "2", label: "Medium" },
                                    { value: "3", label: "Safety concern" },
                                  ]}
                                  onChange={(value) =>
                                    void act("severity", {
                                      themeId: theme.id,
                                      severity: Number(value),
                                    })
                                  }
                                  align="right"
                                  fullWidth
                                />
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
                                  onClick={async () => {
                                    const dismissed = await act("theme_status", {
                                      themeId: theme.id,
                                      status: "dismissed",
                                    });
                                    if (dismissed) setSelectedTheme(null);
                                  }}
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
                                    distinct source review
                                    {group.reviews.length === 1 ? "" : "s"}
                                  </strong>
                                  {group.reviews.length > 1 && (
                                    <span>Same feedback</span>
                                  )}
                                </div>
                                <blockquote className="evidence-quote">
                                  “{group.quote}”
                                </blockquote>
                                {owner && group.observations.length > 0 && (
                                  <details className="evidence-reassign">
                                    <summary>Move source feedback</summary>
                                    <ul>
                                      {group.observations.map((point) => {
                                        const sourceReview = state.reviews.find(
                                          (review) => review.id === point.reviewId,
                                        );
                                        const linkedTheme = state.themes.find(
                                          (candidate) =>
                                            state.memberships.some(
                                              (membership) =>
                                                membership.observationId === point.id &&
                                                membership.themeId === candidate.id,
                                            ),
                                        );
                                        if (!sourceReview) return null;
                                        return (
                                          <li key={point.id}>
                                            <span>
                                              {date(sourceReview.reviewedAt)} · {point.summary}
                                            </span>
                                            <ObservationIssueControl
                                              observation={point}
                                              businessId={businessId}
                                              themes={state.themes}
                                              currentTheme={linkedTheme || null}
                                              disabled={busy === "membership"}
                                              onMove={(themeId) =>
                                                act("membership", {
                                                  observationId: point.id,
                                                  themeId,
                                                })
                                              }
                                            />
                                          </li>
                                        );
                                      })}
                                    </ul>
                                  </details>
                                )}
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
                                  : "Saved"}
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
                            {owner && `${state.employees.find((employee) => employee.id === item.assigneeId)?.name || "Assigned employee"} · `}
                            {item.status === "reported"
                              ? owner ? "Pending Verification" : "Pending Owner Approval"
                              : item.status === "needs_rework"
                                ? owner ? "Pending" : "Assigned · Needs Rework"
                                : item.status === "in_progress"
                                  ? owner ? "Pending · In Progress" : "In Progress"
                                  : owner ? "Pending" : "Assigned"}
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
                      {completedTasks.map((item) => (
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
                            · Completed — Verified by Owner {date(item.verifiedAt)}
                          </span>
                        </button>
                      ))}
                      {completedTasks.length === 0 && (
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
                                ? "Completed — Verified by Owner"
                                : task.status === "proposed"
                                  ? "Saved"
                                  : task.status === "deferred"
                                    ? "Saved for later"
                                : task.status === "reported"
                                  ? owner ? "Pending Verification" : "Pending Owner Approval"
                                  : task.status === "needs_rework"
                                    ? owner ? "Pending" : "Assigned — Needs Rework"
                                    : task.status === "approved_open"
                                      ? owner ? "Pending" : "Assigned"
                                      : task.status === "in_progress"
                                        ? owner ? "Pending · In Progress" : "In Progress"
                                        : label(task.status)}
                            </span>
                          </div>
                        </header>
                        {task.rejectionReason &&
                          ["needs_rework", "in_progress", "reported"].includes(
                            task.status,
                          ) && (
                            <div className="decision-callout" role="note">
                              <strong>Owner’s reason</strong>
                              <p>{task.rejectionReason}</p>
                              {task.reworkInstructions && (
                                <div className="decision-instructions">
                                  <strong>Instructions for rework</strong>
                                  <p>{task.reworkInstructions}</p>
                                </div>
                              )}
                              {task.rejectedAt && (
                                <small>Returned {date(task.rejectedAt)}</small>
                              )}
                            </div>
                          )}
                        <section className="task-brief" aria-label="Original task brief">
                          <p className="eyebrow">01&nbsp;&nbsp;Original task brief</p>
                          {task.originalTitle && task.originalTitle !== task.title && <h3>{task.originalTitle}</h3>}
                          <p>{task.originalDescription || task.description}</p>
                        </section>
                        {task.originalDescription && task.description !== task.originalDescription && (
                          <section className="task-brief task-current-brief" aria-label="Current task brief">
                            <p className="eyebrow">Current approved instructions</p>
                            <p>{task.description}</p>
                          </section>
                        )}
                        <TaskEditHistory
                          events={state.events.filter((item) => item.entityType === "task" && item.entityId === task.id)}
                          employees={state.employees}
                        />
                        {!["proposed", "deferred"].includes(task.status) && (
                          <dl className="task-facts">
                            <div>
                              <dt>Priority</dt>
                              <dd><PriorityBadge priority={task.priority} /></dd>
                            </div>
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
                        {state.handoffs
                          .filter(
                            (handoff) =>
                              handoff.approvedTaskId === task.id &&
                              handoff.approvedTaskVersion === task.taskVersion,
                          )
                          .map((handoff) => (
                            <OrbyteHandoffDetails
                              key={handoff.id}
                              payload={handoff.payload}
                              recordStatus={handoff.simulatedStatus}
                              createdAt={handoff.createdAt}
                            />
                          ))}
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
                                timezone={
                                  state.branches.find(
                                    (item) => item.id === task.branchId,
                                  )?.timezone || "Asia/Kuala_Lumpur"
                                }
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
                        {["approved_open", "in_progress", "needs_rework"].includes(
                          task.status,
                        ) &&
                          owner && (
                            <details className="task-revision-disclosure">
                              <summary>Revise task or assignment</summary>
                              <p className="form-hint">
                                Saving a change supersedes the current simulated handoff and returns the task for approval.
                              </p>
                              <TaskEditor
                                key={`revise:${task.id}:${task.taskVersion}`}
                                task={task}
                                employees={state.employees.filter(
                                  (employee) => employee.branchId === task.branchId,
                                )}
                                timezone={
                                  state.branches.find(
                                    (item) => item.id === task.branchId,
                                  )?.timezone || "Asia/Kuala_Lumpur"
                                }
                                save={(data) =>
                                  void act("edit_task", { taskId: task.id, data })
                                }
                                approve={async (data) => {
                                  const saved = await act("edit_task", {
                                    taskId: task.id,
                                    data,
                                  });
                                  if (saved)
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
                                  if (saved)
                                    await act("decide_task", {
                                      taskId: task.id,
                                      decision: "defer",
                                    });
                                }}
                              />
                            </details>
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
                              <CustomDropdown
                                ariaLabel="Your staff profile"
                                sectionLabel="Staff Profile"
                                value={effectiveEmployeeId}
                                options={state.employees.map((employee) => ({
                                  value: employee.id,
                                  label: `${employee.name} · ${employee.jobTitle}`,
                                }))}
                                onChange={(value) => changeEmployee(value)}
                                align="left"
                                fullWidth
                              />
                            </label>

                            {task.assigneeId === effectiveEmployeeId &&
                            ["approved_open", "needs_rework"].includes(
                              task.status,
                            ) ? (
                              <div className="staff-work-report">
                                <p className="staff-assignment-note">
                                  {task.status === "needs_rework"
                                    ? "Review the owner’s feedback, then start the corrected work."
                                    : "Start this assignment to mark it in progress before reporting completion."}
                                </p>
                                <button
                                  disabled={!!busy}
                                  onClick={() =>
                                    void act("start_task", {
                                      taskId: task.id,
                                      employeeId: effectiveEmployeeId,
                                    })
                                  }
                                >
                                  {task.status === "needs_rework"
                                    ? "Start rework"
                                    : "Start work"}
                                </button>
                              </div>
                            ) : task.status === "in_progress" &&
                              task.assigneeId === effectiveEmployeeId ? (
                              <div className="staff-work-report">
                                <label>
                                  {task.reportVersion > 0
                                    ? "Additional fixes completed"
                                    : "Work completed"}
                                  <textarea
                                    rows={4}
                                    value={workReport}
                                    onChange={(event) =>
                                      setWorkReport(event.target.value)
                                    }
                                    placeholder={
                                      task.reportVersion > 0
                                        ? "Describe how you addressed the owner's feedback…"
                                        : "Describe what you inspected, repaired, or replaced…"
                                    }
                                  />
                                </label>
                                <ReportAttachmentPicker
                                  files={workImages}
                                  onChange={setWorkImages}
                                  error={workImageError}
                                  onError={setWorkImageError}
                                />
                                <button
                                  disabled={
                                    !!busy || workReport.trim().length < 10
                                    || !!workImageError
                                  }
                                  onClick={async () => {
                                    try {
                                      const attachments = await evidencePayload(workImages);
                                      const result = await act("report_task", {
                                        taskId: task.id,
                                        employeeId: effectiveEmployeeId,
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
                                        "Could not read the selected attachment. Choose it again.",
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
                                  : task.status === "resolved"
                                    ? "The owner verified this work."
                                    : `Assigned to ${state.employees.find((employee) => employee.id === task.assigneeId)?.name || "another employee"}. Select the assigned staff profile to submit an update.`}
                              </p>
                            )}
                          </section>
                        )}
                        {task.status === "reported" && owner && (
                          <>
                          <section className="owner-verification-panel" aria-label="Owner verification evidence">
                            <p className="form-hint">
                              Add a short verification note or attach evidence for the work decision.
                            </p>
                            <label>
                              Verification note <span>(optional)</span>
                              <textarea
                                rows={3}
                                value={ownerVerifyNote}
                                aria-invalid={!!ownerVerifyNoteError}
                                aria-describedby={ownerVerifyNoteError ? "owner-verify-note-error" : undefined}
                                placeholder="What did you check before verifying this work?"
                                onChange={(event) => {
                                  setOwnerVerifyNote(event.target.value);
                                  setOwnerVerifyNoteError(
                                    event.target.value.trim() && event.target.value.trim().length < 10
                                      ? "Add at least 10 characters, or leave the note empty."
                                      : "",
                                  );
                                }}
                                onBlur={() => {
                                  if (ownerVerifyNote.trim() && ownerVerifyNote.trim().length < 10)
                                    setOwnerVerifyNoteError("Add at least 10 characters, or leave the note empty.");
                                }}
                              />
                              {ownerVerifyNoteError && (
                                <span id="owner-verify-note-error" className="field-error" role="alert">
                                  {ownerVerifyNoteError}
                                </span>
                              )}
                            </label>
                            <ReportAttachmentPicker
                              files={ownerVerifyFiles}
                              onChange={setOwnerVerifyFiles}
                              error={ownerVerifyFileError}
                              onError={setOwnerVerifyFileError}
                              label="Attach verification evidence"
                            />
                          </section>
                          <div className="controls verification-actions">
                            <button
                              disabled={!!busy || !!ownerVerifyNoteError || !!ownerVerifyFileError}
                              onClick={async () => {
                                try {
                                  const attachments = await evidencePayload(ownerVerifyFiles);
                                  const result = await act("verify_task", {
                                    taskId: task.id,
                                    note: ownerVerifyNote,
                                    reportVersion: task.reportVersion,
                                    attachments,
                                  });
                                  if (result) {
                                    setOwnerVerifyNote("");
                                    setOwnerVerifyNoteError("");
                                    setOwnerVerifyFiles([]);
                                    setOwnerVerifyFileError("");
                                  }
                                } catch {
                                  setOwnerVerifyFileError("Could not read a selected attachment. Choose it again.");
                                }
                              }}
                            >
                              {busy === "verify_task" ? "Verifying…" : "Verify completed work"}
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
                                setDecisionInstructions("");
                                setDecisionInstructionsError("");
                                setDecisionError("");
                                setDecisionFiles([]);
                                setDecisionFileError("");
                              }}
                            >
                              Reject / return for rework
                            </button>
                          </div>
                          </>
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
                                    navigateTab("replies");
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
                                navigateTab("replies");
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
                branches={state.branches}
                replies={state.replies}
              handoffs={state.handoffs}
                metrics={state.metrics}
                onOpenTask={openTask}
                onOpenReview={openReview}
              />
            )}
            {tab === "stats" && <StatsView metrics={state.metrics} />}
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
            {decision.kind === "task" && (
              <>
                <label htmlFor="decision-instructions">Instructions for the employee</label>
                <textarea
                  id="decision-instructions"
                  rows={4}
                  maxLength={500}
                  value={decisionInstructions}
                  aria-invalid={!!decisionInstructionsError}
                  aria-describedby={decisionInstructionsError ? "decision-instructions-error" : undefined}
                  onChange={(event) => {
                    setDecisionInstructions(event.target.value);
                    setDecisionInstructionsError("");
                  }}
                  onBlur={() => {
                    if (decisionInstructions.length && decisionInstructions.trim().length < 10)
                      setDecisionInstructionsError("Write at least 10 characters describing the corrective work.");
                  }}
                  placeholder="Describe the exact corrective work needed."
                />
                {decisionInstructionsError && <p id="decision-instructions-error" role="alert" className="field-error">{decisionInstructionsError}</p>}
                <p className="form-hint">These instructions are saved separately from the original task brief and this rejection reason.</p>
              </>
            )}
            {decision.kind === "task" && (
              <ReportAttachmentPicker
                files={decisionFiles}
                onChange={setDecisionFiles}
                error={decisionFileError}
                onError={setDecisionFileError}
                label="Attach owner review evidence"
              />
            )}
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
                disabled={!!busy || decisionNote.trim().length < 10 || (decision.kind === "task" && decisionInstructions.trim().length < 10) || !!decisionFileError}
                onClick={async () => {
                  if (decisionNote.trim().length < 10) {
                    setDecisionError(
                      "Write at least 10 characters so the next person knows what to change.",
                    );
                    return;
                  }
                  if (decision.kind === "task" && decisionInstructions.trim().length < 10) {
                    setDecisionInstructionsError("Write at least 10 characters describing the corrective work.");
                    return;
                  }
                  let attachments: Awaited<ReturnType<typeof evidencePayload>> = [];
                  try {
                    if (decision.kind === "task")
                      attachments = await evidencePayload(decisionFiles);
                  } catch {
                    setDecisionFileError("Could not read a selected attachment. Choose it again.");
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
                      instructions: decision.kind === "task" ? decisionInstructions.trim() : undefined,
                      attachments,
                    },
                  );
                  if (result) {
                    setDecision(null);
                    setDecisionFiles([]);
                    setDecisionFileError("");
                  }
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
  timezone,
  save,
  approve,
  defer,
}: {
  task: Task;
  employees: State["employees"];
  timezone: string;
  save: (data: {
    title: string;
    description: string;
    priority: string;
    assigneeRole: string;
    assigneeId: string;
    dueAt: string;
  }) => void;
  approve: (data: {
    title: string;
    description: string;
    priority: string;
    assigneeRole: string;
    assigneeId: string;
    dueAt: string;
  }) => void;
  defer: (data: {
    title: string;
    description: string;
    priority: string;
    assigneeRole: string;
    assigneeId: string;
    dueAt: string;
  }) => void;
}) {
  const [title, setTitle] = useState(task.title),
    [description, setDescription] = useState(task.description),
    [priority, setPriority] = useState(task.priority),
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
    }),
    [isFirefox, setIsFirefox] = useState(false);

  useEffect(() => {
    if (typeof navigator !== "undefined" && /firefox/i.test(navigator.userAgent)) {
      const timer = window.setTimeout(() => setIsFirefox(true), 0);
      return () => window.clearTimeout(timer);
    }
  }, []);

  const firefoxDate = dueAt ? dueAt.slice(0, 10) : "";
  const firefoxTime = dueAt && dueAt.length >= 16 ? dueAt.slice(11, 16) : "17:00";

  const data = () => ({
    title,
    description,
    priority,
    assigneeId,
    assigneeRole:
      employees.find((employee) => employee.id === assigneeId)?.jobTitle ||
      "Employee",
    dueAt,
  });
  const selectedEmployee = employees.find(
    (employee) => employee.id === assigneeId,
  );
  const attendance = getSimulatedAttendance({
    employeeId: selectedEmployee?.id || "",
    orbyteStaffId: selectedEmployee?.orbyteStaffId,
    dueAt,
    timezone,
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
        Task priority
        <CustomDropdown
          ariaLabel="Task priority"
          sectionLabel="Task Priority"
          value={priority}
          options={[
            { value: "urgent", label: "Urgent", meta: "Needs immediate attention" },
            { value: "high", label: "High", meta: "Address promptly" },
            { value: "medium", label: "Medium", meta: "Standard priority" },
            { value: "low", label: "Low", meta: "When capacity allows" },
          ]}
          onChange={(value) => setPriority(value)}
          align="left"
          fullWidth
        />
      </label>
      <label>
        Assign to employee
        <CustomDropdown
          ariaLabel="Assign to employee"
          sectionLabel="Assign Employee"
          value={assigneeId}
          options={employees.map((employee) => ({
            value: employee.id,
            label: `${employee.name} · ${employee.jobTitle}`,
            meta: employee.orbyteStaffId,
          }))}
          onChange={(value) => setAssigneeId(value)}
          align="left"
          fullWidth
        />
      </label>
      <div
        className={`attendance-context attendance-${attendance.state}`}
        role="status"
        aria-live="polite"
      >
        <div>
          <strong>{selectedEmployee?.name || "No employee"} · {attendance.label}</strong>
          <span>{attendance.detail}</span>
        </div>
        <small>{attendance.source}</small>
      </div>
      {!['on_shift', 'unknown'].includes(attendance.state) && (
        <p className="attendance-warning">
          This employee is not scheduled for the selected date. You can still assign the task.
        </p>
      )}
      <label>
        Due date
        <input
          type="datetime-local"
          aria-label="Due date"
          aria-describedby={!dueAt ? "task-due-hint" : undefined}
          value={dueAt}
          onChange={(event) => setDueAt(event.target.value)}
        />
      </label>
      {isFirefox ? (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 140px", gap: "14px" }}>
          <label>
            Due date
            <input
              type="date"
              aria-label="Due date"
              aria-describedby={!dueAt ? "task-due-hint" : undefined}
              value={firefoxDate}
              onChange={(event) => {
                const newDate = event.target.value;
                setDueAt(newDate ? `${newDate}T${firefoxTime || "17:00"}` : "");
              }}
            />
            {!dueAt && (
              <span id="task-due-hint" className="form-hint">
                Set a due date before assigning.
              </span>
            )}
          </label>
          <label>
            Due time
            <input
              type="time"
              aria-label="Due time"
              value={firefoxTime}
              onChange={(event) => {
                const newTime = event.target.value;
                setDueAt(firefoxDate ? `${firefoxDate}T${newTime || "17:00"}` : "");
              }}
            />
          </label>
        </div>
      ) : (
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
      )}
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
            <p className="reply-warning-copy">
              This review includes concerns that remain open. Keep the response
              specific about what was verified and what still needs attention.
            </p>
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
