import type { ReactNode } from "react";

/** One editorial heading for every workspace tab. Page copy stays with each tab. */
export function PageHeading({
  index,
  eyebrow,
  title,
  description,
  children,
}: {
  index: string;
  eyebrow: string;
  title: string;
  description?: string;
  children?: ReactNode;
}) {
  return (
    <header className="page-heading">
      <div>
        <p className="eyebrow">
          <span>{index}</span> / {eyebrow}
        </p>
        <h1 tabIndex={-1} data-page-title>
          {title}
        </h1>
        {description && <p className="page-description">{description}</p>}
      </div>
      {children && <div className="page-heading-actions">{children}</div>}
    </header>
  );
}

// Human-readable status names shared by review and reply badges.
const statusLabels: Record<string, string> = {
  complete: "Analysed",
  generic: "General feedback",
  needs_review: "Needs review",
  pending: "Pending",
  processing: "Analysing",
  failed: "Analysis failed",
  draft: "Draft",
  approved_ready: "Approved",
  simulated_published: "Simulated published",
  needs_revision: "Needs revision",
  needs_rework: "Needs rework",
  proposed: "Awaiting approval",
  deferred: "Saved for later",
  approved_open: "Assigned",
  in_progress: "In progress",
  reported: "Awaiting verification",
  resolved: "Verified",
  rejected: "Rejected",
  owner_confirmed: "Owner confirmed",
  suggested: "Needs review",
};

const toSentenceCase = (text: string) => {
  if (!text) return "";
  const cleaned = text.replaceAll("_", " ").toLowerCase();
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status}`}>
      {statusLabels[status] || toSentenceCase(status)}
    </span>
  );
}
