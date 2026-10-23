/** Clean, human-crafted typography-driven TasksView */
import React, { useState } from "react";
import type { Theme, Observation, Membership, Review } from "./ReviewsView";
import type { Employee } from "./IssuesView";

export type Task = {
  id: string;
  themeId: string;
  title: string;
  description: string;
  assigneeRole: string;
  assigneeId: string | null;
  dueAt: string | null;
  status: string;
  dispatchTarget?: string | null;
  dispatchStatus?: string | null;
  dispatchedAt?: string | null;
  externalRef?: string | null;
  approvedAt?: string | null;
  employeeReport?: string | null;
  resolvedAt?: string | null;
  resolutionNote?: string | null;
};

function formatSentenceCase(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function TasksView({
  tasks,
  themes,
  employees,
  branches,
  observations,
  memberships,
  reviews,
  selectedTaskId,
  onSelectTask,
  role,
  activeEmployeeId,
  onSetEmployeeId,
  onStartTask,
  onReportTask,
  onVerifyTask,
  onDecideTask,
  onEditTask,
  onDraftReply,
  onOpenTheme,
  onOpenReview,
  dateFormatter,
  busy,
}: {
  tasks: Task[];
  themes: Theme[];
  employees: Employee[];
  branches: { id: string; name: string }[];
  observations: Observation[];
  memberships: Membership[];
  reviews: Review[];
  selectedTaskId: string;
  onSelectTask: (id: string) => void;
  role: "owner" | "staff";
  activeEmployeeId: string;
  onSetEmployeeId: (id: string) => void;
  onStartTask: (taskId: string, employeeId: string) => Promise<void>;
  onReportTask: (taskId: string, employeeId: string, note: string) => Promise<void>;
  onVerifyTask: (taskId: string, note: string) => Promise<void>;
  onDecideTask: (taskId: string, decision: "approve" | "defer" | "reject") => Promise<void>;
  onEditTask: (
    taskId: string,
    data: {
      title: string;
      description: string;
      assigneeRole: string;
      assigneeId: string;
      dueAt: string;
    },
  ) => Promise<void>;
  onDraftReply: (reviewId: string, taskId: string) => Promise<void>;
  onOpenTheme: (themeId: string) => void;
  onOpenReview: (reviewId: string) => void;
  dateFormatter: (d: string | null) => string;
  busy?: string;
}) {
  const [workReport, setWorkReport] = useState("");
  const [verifyResolution, setVerifyResolution] = useState("");

  const selectedTask = tasks.find((t) => t.id === selectedTaskId) || tasks[0];
  const linkedTheme = selectedTask
    ? themes.find((t) => t.id === selectedTask.themeId)
    : null;
  const branchName = (id?: string) =>
    branches.find((b) => b.id === id)?.name || id || "General";

  const assignee = employees.find((e) => e.id === selectedTask?.assigneeId);

  const linkedReviewIds = selectedTask
    ? [
        ...new Set(
          observations
            .filter((o) =>
              memberships.some(
                (m) => m.themeId === selectedTask.themeId && m.observationId === o.id,
              ),
            )
            .map((o) => o.reviewId),
        ),
      ]
    : [];

  const isOwner = role === "owner";

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "approved_open":
        return "bg-blue-50 text-blue-800 border border-blue-200/80";
      case "in_progress":
        return "bg-purple-50 text-purple-800 border border-purple-200/80";
      case "reported":
        return "bg-amber-50 text-amber-900 border border-amber-200/80";
      case "resolved":
        return "bg-emerald-50 text-emerald-800 border border-emerald-200/80";
      default:
        return "bg-neutral-100 text-neutral-700 border border-neutral-200";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "approved_open":
        return "Approved";
      case "in_progress":
        return "In Progress";
      case "reported":
        return "Reported — Awaiting Verification";
      case "resolved":
        return "Verified Resolved";
      case "proposed":
        return "Proposed";
      default:
        return formatSentenceCase(status);
    }
  };

  return (
    <div className="w-full space-y-6 font-sans">
      {/* View Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            Work Tasks & Execution
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Operational remediation, Orbyte dispatch, and verified separation of duties.
          </p>
        </div>
      </div>

      {/* Role-Aware Governance Banner */}
      <div className="rounded-2xl bg-neutral-100/70 border border-neutral-200/80 px-5 py-3.5 flex items-center justify-between gap-4 flex-wrap text-xs text-neutral-700">
        <div>
          <span className="font-semibold text-neutral-900">
            Active Role: {isOwner ? "Owner / General Manager" : "Employee"}
          </span>
          <span className="text-neutral-500 ml-2">
            {isOwner
              ? "Full authority to approve tasks, verify completed work, and initiate Orbyte dispatch."
              : "Authorized to start work, inspect issues, and submit completion reports. Manager or Owner verification required to resolve."}
          </span>
        </div>

        {!isOwner && (
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-medium text-neutral-500">Acting as:</span>
            <select
              value={activeEmployeeId}
              onChange={(e) => onSetEmployeeId(e.target.value)}
              className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-800 focus:border-neutral-400 focus:outline-none cursor-pointer"
            >
              {employees.map((emp) => (
                <option key={emp.id} value={emp.id}>
                  {emp.name} ({emp.jobTitle})
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Two Column Layout: Left Tasks List & Right Task Detail */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 of 12 cols): Tasks List */}
        <div className="lg:col-span-5 space-y-3">
          {tasks.length > 0 ? (
            tasks.map((item) => {
              const isSelected = selectedTask?.id === item.id;
              const itemTheme = themes.find((t) => t.id === item.themeId);
              const itemAssignee = employees.find((e) => e.id === item.assigneeId);

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectTask(item.id)}
                  className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer text-left space-y-3 ${
                    isSelected
                      ? "border-neutral-900 shadow-sm ring-1 ring-neutral-900/10"
                      : "border-neutral-200/80 hover:border-neutral-300 shadow-2xs"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${getStatusBadge(
                        item.status,
                      )}`}
                    >
                      {getStatusLabel(item.status)}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Due: {dateFormatter(item.dueAt)}
                    </span>
                  </div>

                  <h4 className="text-base font-semibold text-neutral-900 leading-snug">
                    {item.title}
                  </h4>

                  <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-100">
                    <span>
                      {itemAssignee?.name || item.assigneeRole}
                    </span>
                    <span className="text-neutral-400">
                      {branchName(itemTheme?.branchId)}
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-8 text-center text-sm text-neutral-500 shadow-xs">
              No work tasks currently created.
            </div>
          )}
        </div>

        {/* Right Column (7 of 12 cols): Selected Task Detail */}
        <div className="lg:col-span-7">
          {selectedTask ? (
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs space-y-6">
              {/* Header Info */}
              <div className="space-y-3 pb-4 border-b border-neutral-100">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${getStatusBadge(
                        selectedTask.status,
                      )}`}
                    >
                      {getStatusLabel(selectedTask.status)}
                    </span>
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-neutral-50 text-neutral-700 border border-neutral-200">
                      {branchName(linkedTheme?.branchId)}
                    </span>
                  </div>
                  <span className="text-xs text-neutral-400">
                    Due: {dateFormatter(selectedTask.dueAt)}
                  </span>
                </div>

                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
                  {selectedTask.title}
                </h3>

                <p className="text-sm text-neutral-700 leading-relaxed font-normal">
                  {selectedTask.description}
                </p>

                <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                  <span>
                    <b>Assigned to:</b> {assignee ? `${assignee.name} (${assignee.jobTitle})` : selectedTask.assigneeRole}
                  </span>
                  {linkedTheme && (
                    <button
                      type="button"
                      onClick={() => onOpenTheme(linkedTheme.id)}
                      className="link text-xs font-semibold text-[#0071e3] hover:underline cursor-pointer"
                    >
                      View related issue →
                    </button>
                  )}
                </div>
              </div>

              {/* Simulated Orbyte Handoff Box (Inside Approved Tasks) */}
              {["approved_open", "in_progress", "reported", "resolved"].includes(selectedTask.status) && (
                <div className="rounded-xl bg-neutral-50/80 border border-neutral-200/70 p-4 space-y-2 text-xs text-neutral-600">
                  <div className="flex items-center justify-between font-semibold text-neutral-900">
                    <span>Simulated Orbyte Handoff Payload</span>
                    <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                      Handoff Ready
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div><b>Property:</b> {branchName(linkedTheme?.branchId)}</div>
                    <div><b>Assignee:</b> {assignee?.name || selectedTask.assigneeRole}</div>
                    <div><b>Due Date:</b> {dateFormatter(selectedTask.dueAt)}</div>
                    <div><b>Supporting Reviews:</b> {linkedReviewIds.length} source reviews</div>
                  </div>
                </div>
              )}

              {/* Action Controls by State & Role */}
              <div className="space-y-4 pt-2">
                {/* Proposed Task Approval (Owner) */}
                {selectedTask.status === "proposed" && isOwner && (
                  <div className="p-4 rounded-xl bg-neutral-50/70 border border-neutral-200 space-y-3">
                    <span className="text-xs font-semibold text-neutral-900 block">
                      Task Proposal Decision
                    </span>
                    <div className="flex items-center gap-2.5 flex-wrap">
                      <button
                        type="button"
                        onClick={() => void onDecideTask(selectedTask.id, "approve")}
                        className="bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Approve task
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDecideTask(selectedTask.id, "defer")}
                        className="secondary text-xs font-semibold px-4 py-2 rounded-full cursor-pointer hover:bg-neutral-50"
                      >
                        Keep for later
                      </button>
                      <button
                        type="button"
                        onClick={() => void onDecideTask(selectedTask.id, "reject")}
                        className="secondary text-xs font-semibold px-4 py-2 rounded-full cursor-pointer hover:bg-neutral-50"
                      >
                        Decline task
                      </button>
                    </div>
                  </div>
                )}

                {/* Approved Task: Start Work */}
                {selectedTask.status === "approved_open" && (isOwner || selectedTask.assigneeId === activeEmployeeId) && (
                  <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-200">
                    <div>
                      <span className="text-xs font-semibold text-neutral-900 block">
                        Work Order Ready
                      </span>
                      <span className="text-xs text-neutral-500">
                        Mark task as in progress to start work.
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => void onStartTask(selectedTask.id, activeEmployeeId)}
                      className="bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Start work
                    </button>
                  </div>
                )}

                {/* Work in Progress: Submit Completion Report */}
                {["approved_open", "in_progress"].includes(selectedTask.status) && (isOwner || selectedTask.assigneeId === activeEmployeeId) && (
                  <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 space-y-3">
                    <label className="block text-xs font-semibold text-neutral-800">
                      Employee Work Completion Report
                    </label>
                    <textarea
                      rows={3}
                      value={workReport}
                      onChange={(e) => setWorkReport(e.target.value)}
                      placeholder="What did you actually inspect, repair, or replace?"
                      className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none"
                    />
                    <div className="flex items-center justify-between gap-3 pt-1">
                      {!isOwner && (
                        <span className="text-xs text-neutral-400">
                          Manager or Owner role required to verify completion.
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => {
                          if (workReport.trim()) {
                            void onReportTask(selectedTask.id, activeEmployeeId, workReport);
                            setWorkReport("");
                          }
                        }}
                        className="bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer ml-auto"
                      >
                        Submit completion report
                      </button>
                    </div>
                  </div>
                )}

                {/* Reported: Manager Verification */}
                {selectedTask.status === "reported" && (
                  <div className="space-y-4">
                    {/* Employee's Note in Callout Box */}
                    <div className="space-y-1.5">
                      <span className="text-xs font-semibold text-neutral-700 block">
                        Submitted Employee Note:
                      </span>
                      <blockquote className="rounded-xl bg-neutral-50/80 border border-neutral-200/60 p-4 text-xs sm:text-sm text-neutral-700 italic">
                        “{selectedTask.employeeReport || "Work completed and inspected on site."}”
                      </blockquote>
                    </div>

                    {isOwner ? (
                      <div className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4 space-y-3">
                        <label className="block text-xs font-semibold text-neutral-800">
                          Manager Verification Note
                        </label>
                        <textarea
                          rows={3}
                          value={verifyResolution}
                          onChange={(e) => setVerifyResolution(e.target.value)}
                          placeholder="What did you physically verify? Be specific and truthful."
                          className="w-full rounded-xl border border-neutral-200 bg-white p-3 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none"
                        />
                        <div className="flex items-center justify-end gap-2.5 pt-1">
                          <button
                            type="button"
                            onClick={() => {
                              if (verifyResolution.trim()) {
                                void onVerifyTask(selectedTask.id, verifyResolution);
                                setVerifyResolution("");
                              }
                            }}
                            className="bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold px-5 py-2 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                          >
                            Verify completion & resolve
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="p-3.5 rounded-xl bg-neutral-100/60 border border-neutral-200 text-xs text-neutral-500">
                        Work report submitted. Manager or Owner verification required to verify and mark resolved.
                      </div>
                    )}
                  </div>
                )}

                {/* Resolved: Grounding for Guest Replies */}
                {selectedTask.status === "resolved" && (
                  <div className="space-y-4">
                    <div className="rounded-xl bg-emerald-50/60 border border-emerald-200/70 p-4 space-y-1.5">
                      <div className="flex items-center justify-between text-emerald-900 text-xs font-semibold">
                        <span>Verified Resolved</span>
                        <span>{dateFormatter(selectedTask.resolvedAt || null)}</span>
                      </div>
                      <p className="text-xs sm:text-sm text-emerald-950 font-medium">
                        {selectedTask.resolutionNote || "Resolution verified by property management."}
                      </p>
                    </div>

                    {/* Linked Reviews Available for Reply Drafting */}
                    {linkedReviewIds.length > 0 && (
                      <div className="rounded-xl border border-neutral-200/80 p-4 space-y-3 bg-white">
                        <div className="flex items-center justify-between text-xs font-semibold text-neutral-900">
                          <span>Prepare Guest Replies ({linkedReviewIds.length})</span>
                          <span className="text-neutral-400 font-normal">Grounded in this verified resolution</span>
                        </div>

                        <div className="space-y-2">
                          {linkedReviewIds.map((rId) => {
                            const rev = reviews.find((r) => r.id === rId);
                            if (!rev) return null;
                            return (
                              <div
                                key={rId}
                                className="flex items-center justify-between gap-3 p-3 rounded-lg border border-neutral-100 bg-neutral-50/50 hover:bg-neutral-50 text-xs"
                              >
                                <span className="line-clamp-1 text-neutral-700 flex-1">
                                  {rev.rating}★ · {rev.originalText}
                                </span>
                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    type="button"
                                    onClick={() => onOpenReview(rId)}
                                    className="link text-xs font-medium text-[#0071e3] hover:underline cursor-pointer"
                                  >
                                    View review
                                  </button>
                                  {isOwner && (
                                    <button
                                      type="button"
                                      onClick={() => void onDraftReply(rId, selectedTask.id)}
                                      className="secondary text-xs font-semibold px-3 py-1 rounded-full cursor-pointer hover:bg-neutral-50"
                                    >
                                      Draft reply →
                                    </button>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-10 text-center text-sm text-neutral-500 shadow-xs">
              Choose a task from the list to view its execution details and Orbyte handoff status.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
