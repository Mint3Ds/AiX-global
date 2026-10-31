import Image from "next/image";

type ReportAttempt = {
  id: string;
  version: number;
  note: string;
  reportedAt: string;
  decision: string;
  decisionReason: string | null;
  decidedAt: string | null;
  attachments: { id: string; name: string; url: string }[];
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

export function TaskReportHistory({ attempts }: { attempts: ReportAttempt[] }) {
  if (!attempts.length) return null;
  const rejectionCount = attempts.filter(
    (attempt) => attempt.decision === "rejected",
  ).length;

  return (
    <section
      className="task-report-history"
      aria-label="Completion report history"
    >
      <header className="task-report-history-heading">
        <div>
          <p className="eyebrow">03&nbsp;&nbsp;Completion history</p>
          <h3>Staff reports</h3>
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
            className={"task-report-attempt decision-" + attempt.decision}
          >
            <div className="task-report-attempt-meta">
              <strong>Report {String(attempt.version).padStart(2, "0")}</strong>
              <time dateTime={attempt.reportedAt}>
                {reportDate(attempt.reportedAt)}
              </time>
              <span
                className={
                  "report-decision report-decision-" + attempt.decision
                }
              >
                {attempt.decision === "approved"
                  ? "Verified"
                  : attempt.decision === "rejected"
                    ? "Returned for rework"
                    : "Awaiting owner review"}
              </span>
            </div>
            <div className="task-report-attempt-content">
              <p>{attempt.note}</p>
              {attempt.decisionReason && (
                <div className="report-feedback">
                  <strong>
                    {attempt.decision === "rejected"
                      ? "Owner feedback"
                      : "Verification note"}
                  </strong>
                  <p>{attempt.decisionReason}</p>
                </div>
              )}
              {attempt.attachments.length > 0 && (
                <div
                  className="report-attachments"
                  aria-label="Attached work evidence"
                >
                  {attempt.attachments.map((attachment) => (
                    <a
                      href={attachment.url}
                      target="_blank"
                      rel="noreferrer"
                      key={attachment.id}
                    >
                      <Image
                        src={attachment.url}
                        alt={attachment.name}
                        loading="lazy"
                        width={112}
                        height={78}
                        unoptimized
                      />
                      <span>{attachment.name}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
