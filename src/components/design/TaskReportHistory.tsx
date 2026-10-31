import Image from "next/image";

type ReportAttempt = {
  id: string;
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

const reportDate = (value: string) => {
  const date = new Date(value);
  return `${date.toLocaleDateString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    dateStyle: "medium",
  })} · ${date.toLocaleTimeString("en-MY", {
    timeZone: "Asia/Kuala_Lumpur",
    timeStyle: "short",
  })}`;
};

function Attachments({
  items,
  label,
}: {
  items: ReportAttempt["attachments"];
  label: string;
}) {
  if (!items.length) return null;
  return (
    <div className="report-attachments" aria-label={label}>
      {items.map((attachment) => {
        const isImage = attachment.mediaType.startsWith("image/");
        return (
          <a
            href={attachment.url}
            target="_blank"
            rel="noreferrer"
            key={attachment.id}
            className={
              isImage ? "report-attachment-image" : "report-attachment-file"
            }
          >
            {isImage ? (
              <Image
                src={attachment.url}
                alt={attachment.name}
                loading="lazy"
                width={112}
                height={78}
                unoptimized
              />
            ) : (
              <span className="report-file-badge">
                {attachment.mediaType === "application/pdf"
                  ? "PDF"
                  : attachment.mediaType === "text/csv"
                    ? "CSV"
                    : "TXT"}
              </span>
            )}
            <span className="report-attachment-name">{attachment.name}</span>
            <small>{label}</small>
          </a>
        );
      })}
    </div>
  );
}

export function TaskReportHistory({ attempts }: { attempts: ReportAttempt[] }) {
  if (!attempts.length) return null;
  const rejectionCount = attempts.filter(
    (attempt) => attempt.decision === "rejected",
  ).length;
  const rejected = attempts.filter(
    (attempt) => attempt.decision === "rejected",
  );
  const verified = attempts.filter(
    (attempt) => attempt.decision === "approved",
  );

  return (
    <div className="task-history-stack">
      <section
        className="task-report-history"
        aria-label="Employee work reports"
      >
        <header className="task-report-history-heading">
          <div>
            <p className="eyebrow">03&nbsp;&nbsp;Submission record</p>
            <h3>Employee work reports</h3>
          </div>
          <span className="task-rejection-count">
            {rejectionCount} {rejectionCount === 1 ? "return" : "returns"} for
            rework
          </span>
        </header>
        <ol>
          {attempts.map((attempt) => (
            <li
              key={attempt.id}
              className={`task-report-attempt decision-${attempt.decision}`}
            >
              <div className="task-report-attempt-meta">
                <strong>
                  Report {String(attempt.version).padStart(2, "0")}
                </strong>
                <time dateTime={attempt.reportedAt}>
                  {reportDate(attempt.reportedAt)}
                </time>
                <span
                  className={`report-decision report-decision-${attempt.decision}`}
                >
                  {attempt.decision === "approved"
                    ? "Verified"
                    : attempt.decision === "rejected"
                      ? "Returned for rework"
                      : "Pending Owner Approval"}
                </span>
              </div>
              <div className="task-report-attempt-content">
                <p>{attempt.note}</p>
                <Attachments
                  items={attempt.attachments.filter(
                    (attachment) =>
                      attachment.uploadedBy !== "owner" ||
                      attachment.context === "completion",
                  )}
                  label="Employee work evidence"
                />
              </div>
            </li>
          ))}
        </ol>
      </section>

      {rejected.length > 0 && (
        <section
          className="task-report-history task-feedback-history"
          aria-label="Owner rejection feedback"
        >
          <header className="task-report-history-heading">
            <div>
              <p className="eyebrow">04&nbsp;&nbsp;Rework guidance</p>
              <h3>Owner rejection feedback</h3>
            </div>
            <span className="task-rejection-count">
              {rejectionCount} {rejectionCount === 1 ? "return" : "returns"}
            </span>
          </header>
          <ol>
            {rejected.map((attempt) => (
              <li
                key={attempt.id}
                className="task-report-attempt decision-rejected"
              >
                <div className="task-report-attempt-meta">
                  <strong>
                    After report {String(attempt.version).padStart(2, "0")}
                  </strong>
                  {attempt.decidedAt && (
                    <time dateTime={attempt.decidedAt}>
                      {reportDate(attempt.decidedAt)}
                    </time>
                  )}
                </div>
                <div className="task-report-attempt-content">
                  {attempt.decisionReason && (
                    <div className="report-feedback">
                      <strong>Reason</strong>
                      <p>{attempt.decisionReason}</p>
                    </div>
                  )}
                  {attempt.decisionInstructions && (
                    <div className="report-feedback report-rework-instructions">
                      <strong>Instructions for rework</strong>
                      <p>{attempt.decisionInstructions}</p>
                    </div>
                  )}
                  <Attachments
                    items={attempt.attachments.filter(
                      (attachment) =>
                        attachment.uploadedBy === "owner" &&
                        attachment.context === "owner_review",
                    )}
                    label="Owner review evidence"
                  />
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}

      {verified.length > 0 && (
        <section
          className="task-report-history task-verification-history"
          aria-label="Verification history"
        >
          <header className="task-report-history-heading">
            <div>
              <p className="eyebrow">05&nbsp;&nbsp;Final decision</p>
              <h3>Verification history</h3>
            </div>
          </header>
          <ol>
            {verified.map((attempt) => (
              <li
                key={attempt.id}
                className="task-report-attempt decision-approved"
              >
                <div className="task-report-attempt-meta">
                  <strong>
                    Report {String(attempt.version).padStart(2, "0")} verified
                  </strong>
                  {attempt.decidedAt && (
                    <time dateTime={attempt.decidedAt}>
                      {reportDate(attempt.decidedAt)}
                    </time>
                  )}
                </div>
                <div className="task-report-attempt-content">
                  {attempt.decisionReason && (
                    <div className="report-feedback">
                      <strong>Verification note</strong>
                      <p>{attempt.decisionReason}</p>
                    </div>
                  )}
                  <Attachments
                    items={attempt.attachments.filter(
                      (attachment) =>
                        attachment.uploadedBy === "owner" &&
                        attachment.context === "owner_review",
                    )}
                    label="Owner verification evidence"
                  />
                </div>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
