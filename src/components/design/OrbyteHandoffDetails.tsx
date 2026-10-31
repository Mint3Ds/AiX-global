"use client";

type HandoffPayloadView = {
  businessId?: string;
  propertyId?: string;
  orbyteStaffId?: string;
  taskId?: string;
  taskVersion?: number;
  dueDate?: string;
  timezone?: string;
  approvedTask?: { title?: string; instructions?: string };
  linkedEvidence?: { reviewIds?: string[]; observationIds?: string[] };
  approvedAt?: string;
};

export function OrbyteHandoffDetails({
  payload,
  recordStatus,
  createdAt,
}: {
  payload: Record<string, unknown>;
  recordStatus: string;
  createdAt: string;
}) {
  const data = payload as HandoffPayloadView;
  const evidence = data.linkedEvidence;
  const due = data.dueDate ? new Date(data.dueDate) : null;
  const dueLabel = due && !Number.isNaN(due.getTime())
    ? `${due.toLocaleDateString("en-MY", {
        timeZone: data.timezone || "Asia/Kuala_Lumpur",
        day: "numeric", month: "short", year: "numeric",
      })} · ${due.toLocaleTimeString("en-MY", {
        timeZone: data.timezone || "Asia/Kuala_Lumpur",
        hour: "numeric", minute: "2-digit",
      })}`
    : "—";
  const status =
    recordStatus === "superseded"
      ? "Superseded"
      : recordStatus === "invalidated"
        ? "Invalidated"
    : "Recorded locally · Not sent to Orbyte";
  return (
    <details className={`orbyte-handoff orbyte-handoff-${recordStatus}`}>
      <summary>
        <span className="orbyte-handoff-mark" aria-hidden="true">O</span>
        <span className="orbyte-handoff-summary-copy">
          <strong>Simulated Orbyte Handoff</strong>
          <span className="orbyte-handoff-sep" aria-hidden="true">·</span>
          <small>{status}</small>
        </span>
      </summary>
      <div className="orbyte-handoff-content">
        {recordStatus !== "superseded" && recordStatus !== "invalidated" && (
          <p className="orbyte-handoff-snapshot-note">
            Assignment details captured when the owner approved this task.
          </p>
        )}
        {data.approvedTask?.title && (
          <p className="orbyte-handoff-task">{data.approvedTask.title}</p>
        )}
        <dl className="orbyte-handoff-facts">
          <div><dt>Business</dt><dd>{data.businessId || "—"}</dd></div>
          <div><dt>Property</dt><dd>{data.propertyId || "—"}</dd></div>
          <div><dt>Assigned staff</dt><dd>{data.orbyteStaffId || "—"}</dd></div>
          <div><dt>Due</dt><dd>{dueLabel}</dd></div>
          <div><dt>Evidence linked</dt><dd>{(evidence?.reviewIds || []).length} reviews · {(evidence?.observationIds || []).length} observations</dd></div>
        </dl>
        <p className="orbyte-handoff-recorded">
          Approval recorded {new Date(createdAt).toLocaleString("en-MY", {
            timeZone: data.timezone || "Asia/Kuala_Lumpur",
            day: "numeric", month: "short", year: "numeric",
            hour: "numeric", minute: "2-digit",
          })}
        </p>
      </div>
    </details>
  );
}
