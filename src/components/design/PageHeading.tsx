import type { ReactNode } from "react";

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

const statusLabels: Record<string, string> = {
  complete: "Analysed",
  generic: "General feedback",
  needs_review: "Needs review",
  pending: "Pending",
  processing: "Analysing",
  failed: "Analysis failed",
  draft: "Draft",
  approved_ready: "Approved",
  simulated_published: "Posted in demo",
  needs_revision: "Needs revision",
  needs_rework: "Needs rework",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`status-badge status-${status}`}>
      {statusLabels[status] || status.replaceAll("_", " ")}
    </span>
  );
}
