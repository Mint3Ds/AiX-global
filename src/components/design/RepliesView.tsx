/** Clean, human-crafted typography-driven RepliesView */
import React, { useState } from "react";
import type { Review, Reply } from "./ReviewsView";
import type { Task } from "./TasksView";

function formatSentenceCase(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function RepliesView({
  replies,
  reviews,
  tasks,
  branches,
  owner,
  onSaveReply,
  onApproveReply,
  onApproveBatch,
  onPublishReply,
  dateFormatter,
  busy,
}: {
  replies: Reply[];
  reviews: Review[];
  tasks: Task[];
  branches: { id: string; name: string }[];
  owner: boolean;
  onSaveReply: (replyId: string, text: string) => Promise<void>;
  onApproveReply: (replyId: string, partialApproved: boolean) => Promise<void>;
  onApproveBatch: (replyIds: string[]) => Promise<void>;
  onPublishReply: (replyId: string) => Promise<void>;
  dateFormatter: (d: string | null) => string;
  busy?: string;
}) {
  const [selectedReplyIds, setSelectedReplyIds] = useState<string[]>([]);
  const [editedTexts, setEditedTexts] = useState<Record<string, string>>({});

  const branchName = (id?: string) =>
    branches.find((b) => b.id === id)?.name || id || "General";

  const lowRiskDrafts = replies.filter(
    (r) => r.status === "draft" && !r.partialWarning,
  );

  const toggleSelectAllLowRisk = () => {
    if (selectedReplyIds.length === lowRiskDrafts.length) {
      setSelectedReplyIds([]);
    } else {
      setSelectedReplyIds(lowRiskDrafts.map((r) => r.id));
    }
  };

  const toggleSelectOne = (id: string) => {
    setSelectedReplyIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id],
    );
  };

  const getWorkflowBadge = (status: string) => {
    switch (status) {
      case "draft":
        return "bg-neutral-100 text-neutral-700 border border-neutral-200";
      case "approved_ready":
        return "bg-blue-50 text-blue-800 border border-blue-200/80";
      case "simulated_published":
        return "bg-emerald-50 text-emerald-800 border border-emerald-200/80";
      default:
        return "bg-neutral-50 text-neutral-600 border border-neutral-200";
    }
  };

  const getWorkflowLabel = (status: string) => {
    switch (status) {
      case "draft":
        return "Draft";
      case "approved_ready":
        return "Approved (Not Yet Posted)";
      case "simulated_published":
        return "Simulated Published";
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
            Guest Replies
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Grounded reply drafts, truth-in-advertising safeguards, and simulated posting.
          </p>
        </div>
      </div>

      {/* Batch Approval Bar (for Low-Risk Drafts) */}
      {owner && lowRiskDrafts.length > 0 && (
        <div className="bg-white rounded-2xl border border-neutral-200/80 p-4 shadow-xs flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="select-all-low-risk"
              checked={selectedReplyIds.length === lowRiskDrafts.length && lowRiskDrafts.length > 0}
              onChange={toggleSelectAllLowRisk}
              className="rounded border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer w-4 h-4"
            />
            <label
              htmlFor="select-all-low-risk"
              className="text-xs font-medium text-neutral-700 cursor-pointer"
            >
              Select all low-risk drafts ({lowRiskDrafts.length} available)
            </label>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-neutral-400">
              {selectedReplyIds.length} of {lowRiskDrafts.length} selected
            </span>
            <button
              type="button"
              disabled={selectedReplyIds.length === 0}
              onClick={() => {
                void onApproveBatch(selectedReplyIds);
                setSelectedReplyIds([]);
              }}
              className="bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer disabled:opacity-40"
            >
              Approve selected drafts ({selectedReplyIds.length})
            </button>
          </div>
        </div>
      )}

      {/* Replies List */}
      <div className="space-y-6">
        {replies.length > 0 ? (
          replies.map((reply) => {
            const review = reviews.find((r) => r.id === reply.reviewId);
            const task = tasks.find((t) => t.id === reply.taskId);
            const isSelected = selectedReplyIds.includes(reply.id);
            const currentText = editedTexts[reply.id] !== undefined ? editedTexts[reply.id] : reply.text;
            const hasTextChanges = editedTexts[reply.id] !== undefined && editedTexts[reply.id] !== reply.text;

            return (
              <div
                key={reply.id}
                className="bg-white rounded-2xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs space-y-5"
              >
                {/* Header Row: Workflow Status Pill + Checkbox + Metadata */}
                <div className="flex items-center justify-between gap-3 pb-3 border-b border-neutral-100 flex-wrap">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {/* Batch Selection Checkbox (Only on draft without partial warning) */}
                    {owner && reply.status === "draft" && !reply.partialWarning && (
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleSelectOne(reply.id)}
                        className="rounded border-neutral-300 text-neutral-900 focus:ring-0 cursor-pointer w-4 h-4 mr-1"
                        title="Select for batch approval"
                      />
                    )}

                    {/* Workflow State Pill */}
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${getWorkflowBadge(
                        reply.status,
                      )}`}
                    >
                      {getWorkflowLabel(reply.status)}
                    </span>

                    {review && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-neutral-50 text-neutral-700 border border-neutral-200">
                        {branchName(review.branchId)}
                      </span>
                    )}

                    {review && (
                      <span className="text-xs text-neutral-500">
                        Rating: {review.rating} / 5
                      </span>
                    )}
                  </div>

                  <span className="text-xs text-neutral-400">
                    Reviewed: {dateFormatter(review?.reviewedAt || null)}
                  </span>
                </div>

                {/* Paired Layout: Left/Top Review Context + Right/Bottom Reply Draft */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Left Column (5 of 12 cols): Original Review Context */}
                  <div className="lg:col-span-5 space-y-3">
                    <span className="text-xs font-semibold text-neutral-800 block uppercase tracking-wider">
                      Original Guest Feedback
                    </span>

                    {/* Exact Quote in Signature Box */}
                    <blockquote className="rounded-xl bg-neutral-50/80 border border-neutral-200/60 p-4 text-xs sm:text-sm text-neutral-700 leading-relaxed italic">
                      “{review?.originalText || "No original text available."}”
                    </blockquote>

                    {task && (
                      <div className="text-[11px] text-neutral-500 pt-1">
                        Remediation task: <b className="font-medium text-neutral-800">{task.title}</b>
                      </div>
                    )}
                  </div>

                  {/* Right Column (7 of 12 cols): Reply Draft & Grounding */}
                  <div className="lg:col-span-7 space-y-4">
                    {/* Conspicuous Unresolved-Issue Warning Banner */}
                    {reply.partialWarning && (
                      <div className="rounded-xl bg-amber-50/90 border border-amber-200 px-4 py-3 text-sm text-amber-900 font-medium space-y-1">
                        <div className="font-bold flex items-center gap-1.5">
                          <span>Partial Reply Warning</span>
                        </div>
                        <p className="text-xs text-amber-800 leading-relaxed font-normal">
                          {reply.partialWarning}. Another operational concern in this review remains unresolved. Truthful partial reply approval is explicitly required.
                        </p>
                      </div>
                    )}

                    {/* Verified Resolution Note Grounding */}
                    <div className="rounded-xl bg-neutral-50/80 border border-neutral-200/60 p-3.5 space-y-1 text-xs text-neutral-600">
                      <span className="font-semibold text-neutral-800 block">
                        Grounded in Verified Resolution:
                      </span>
                      <p className="italic text-neutral-700">
                        “{task?.resolutionNote || "Physical remediation verified on site."}”
                      </p>
                    </div>

                    {/* Editable Reply Textarea */}
                    <div>
                      <div className="flex items-center justify-between pb-1.5 text-xs">
                        <label className="font-semibold text-neutral-800">
                          {reply.status === "simulated_published" ? "Published Reply" : "Reply Draft"}
                        </label>
                        {owner && reply.status !== "simulated_published" && (
                          <span className="text-[11px] text-neutral-400">
                            Editable by Owner
                          </span>
                        )}
                      </div>
                      <textarea
                        rows={5}
                        value={currentText}
                        onChange={(e) =>
                          setEditedTexts((prev) => ({
                            ...prev,
                            [reply.id]: e.target.value,
                          }))
                        }
                        disabled={!owner || reply.status === "simulated_published"}
                        className="w-full rounded-xl border border-neutral-200 bg-white p-3.5 text-sm text-neutral-800 leading-relaxed focus:border-neutral-400 focus:outline-none disabled:bg-neutral-50/60 disabled:text-neutral-600"
                      />
                    </div>

                    {/* Status & Actions Controls */}
                    {owner && (
                      <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                        {hasTextChanges && reply.status !== "simulated_published" ? (
                          <button
                            type="button"
                            onClick={() => onSaveReply(reply.id, currentText)}
                            className="secondary text-xs font-semibold px-4 py-2 rounded-full cursor-pointer hover:bg-neutral-50"
                          >
                            Save edits
                          </button>
                        ) : (
                          <div />
                        )}

                        <div className="flex items-center gap-2.5 ml-auto">
                          {/* Draft State Actions */}
                          {reply.status === "draft" && (
                            <button
                              type="button"
                              onClick={() => onApproveReply(reply.id, Boolean(reply.partialWarning))}
                              className="bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold px-5 py-2 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                            >
                              {reply.partialWarning ? "Approve partial reply" : "Approve reply"}
                            </button>
                          )}

                          {/* Approved State: Simulate Publishing */}
                          {reply.status === "approved_ready" && (
                            <button
                              type="button"
                              onClick={() => onPublishReply(reply.id)}
                              className="bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold px-5 py-2 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                            >
                              Simulate publishing →
                            </button>
                          )}

                          {/* Published State Badge */}
                          {reply.status === "simulated_published" && (
                            <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              Simulated Published
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="bg-white rounded-2xl border border-neutral-200/80 p-10 text-center text-sm text-neutral-500 shadow-xs">
            No reply drafts created yet. Resolve an approved task, then generate a grounded draft from its linked reviews.
          </div>
        )}
      </div>
    </div>
  );
}
