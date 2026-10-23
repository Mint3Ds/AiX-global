/** Clean, human-crafted typography-driven IssuesView */
import React, { useState } from "react";
import type { Theme, Observation, Membership, Review } from "./ReviewsView";

export type Employee = {
  id: string;
  businessId: string;
  branchId: string;
  name: string;
  jobTitle: string;
};

function formatSentenceCase(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

const priorityRank = (priority: string) =>
  ({ urgent: 4, high: 3, medium: 2, low: 1 })[
    priority.toLowerCase() as "urgent" | "high" | "medium" | "low"
  ] || 0;

export function IssuesView({
  themes,
  themeSupport,
  observations,
  memberships,
  reviews,
  employees,
  branches,
  selectedThemeId,
  onSelectTheme,
  owner,
  onSetSeverity,
  onSetStatus,
  onProposeTask,
  onCorrectMembership,
  dateFormatter,
  busy,
}: {
  themes: Theme[];
  themeSupport: Record<string, number>;
  observations: Observation[];
  memberships: Membership[];
  reviews: Review[];
  employees: Employee[];
  branches: { id: string; name: string }[];
  selectedThemeId: string;
  onSelectTheme: (id: string) => void;
  owner: boolean;
  onSetSeverity: (themeId: string, severity: number) => Promise<void>;
  onSetStatus: (themeId: string, status: string) => Promise<void>;
  onProposeTask: (
    themeId: string,
    data?: {
      title: string;
      description: string;
      assigneeRole: string;
      assigneeId: string;
      dueAt: string;
    },
  ) => Promise<void>;
  onCorrectMembership: (observationId: string, themeId: string | null) => Promise<void>;
  dateFormatter: (d: string | null) => string;
  busy?: string;
}) {
  const [filterType, setFilterType] = useState<"all" | "operational_issue" | "suggestion" | "positive_pattern">("operational_issue");
  const [showTaskForm, setShowTaskForm] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [dueDate, setDueDate] = useState("");

  const branchName = (id: string) =>
    branches.find((b) => b.id === id)?.name || id;

  const selectedTheme = themes.find((t) => t.id === selectedThemeId) || themes[0];

  const currentThemeObs = selectedTheme
    ? observations.filter((o) =>
        memberships.some(
          (m) => m.themeId === selectedTheme.id && m.observationId === o.id,
        ),
      )
    : [];

  const eligibleEmployees = selectedTheme
    ? employees.filter((e) => e.branchId === selectedTheme.branchId)
    : employees;

  const sortedThemes = [...themes]
    .filter((t) => filterType === "all" || t.type === filterType)
    .sort(
      (a, b) =>
        priorityRank(b.priority) - priorityRank(a.priority) ||
        b.severity - a.severity ||
        (themeSupport[b.id] || 0) - (themeSupport[a.id] || 0),
    );

  const handleOpenTaskForm = () => {
    if (!selectedTheme) return;
    setTaskTitle(`Resolve: ${selectedTheme.title}`);
    setTaskDescription(
      selectedTheme.priorityReason ||
        `Investigate and remediate issues reported across ${themeSupport[selectedTheme.id] || 0} distinct source reviews.`,
    );
    setAssigneeId(eligibleEmployees[0]?.id || "");
    const in3Days = new Date(Date.now() + 3 * 24 * 3600 * 1000).toISOString().slice(0, 16);
    setDueDate(in3Days);
    setShowTaskForm(true);
  };

  const handleSubmitTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTheme) return;
    const emp = employees.find((e) => e.id === assigneeId);
    await onProposeTask(selectedTheme.id, {
      title: taskTitle,
      description: taskDescription,
      assigneeRole: emp?.jobTitle || "Operations",
      assigneeId,
      dueAt: dueDate,
    });
    setShowTaskForm(false);
  };

  return (
    <div className="w-full space-y-6 font-sans">
      {/* Header & Filter Tabs */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            Issues & Insights
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Deterministic observation clustering, severity ranking, and task initiation.
          </p>
        </div>

        {/* Category Pills Switcher */}
        <div className="inline-flex items-center p-1 rounded-full bg-white border border-neutral-200/80 shadow-2xs">
          {[
            { id: "operational_issue", label: "Issues" },
            { id: "suggestion", label: "Suggestions" },
            { id: "positive_pattern", label: "Praise" },
            { id: "all", label: "All" },
          ].map((tab) => {
            const count =
              tab.id === "all"
                ? themes.length
                : themes.filter((t) => t.type === tab.id).length;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterType(tab.id as typeof filterType)}
                className={`segmented-btn ${filterType === tab.id ? "active" : ""}`}
              >
                <span>{tab.label}</span>
                <span
                  className={`ml-1.5 text-[11px] ${
                    filterType === tab.id ? "text-neutral-300" : "text-neutral-400"
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Two Column Layout: Left List & Right Detail, each with independent scroll wheel */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (5 of 12 cols): Stacked Cards List with independent scroll */}
        <div className="lg:col-span-5 space-y-3 max-h-[calc(100vh-210px)] overflow-y-auto pr-2 clean-scrollbar">
          {sortedThemes.length > 0 ? (
            sortedThemes.map((item) => {
              const isSelected = selectedTheme?.id === item.id;
              const supportCount = themeSupport[item.id] || 0;
              const isRecurrence = item.status === "recurrence";

              return (
                <div
                  key={item.id}
                  onClick={() => {
                    onSelectTheme(item.id);
                    setShowTaskForm(false);
                  }}
                  className={`bg-white rounded-2xl p-5 border transition-all cursor-pointer text-left space-y-3 ${
                    isSelected
                      ? "border-neutral-900 shadow-sm ring-1 ring-neutral-900/10"
                      : "border-neutral-200/80 hover:border-neutral-300 shadow-2xs"
                  }`}
                >
                  {/* Top Pills */}
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Severity / Priority Pill */}
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold ${
                          item.priority === "urgent"
                            ? "bg-amber-50 text-amber-900 border border-amber-200/80"
                            : item.priority === "high"
                              ? "bg-orange-50 text-orange-800 border border-orange-200/80"
                              : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                        }`}
                      >
                        {formatSentenceCase(item.priority)}
                      </span>

                      {/* Recurrence Pill */}
                      {isRecurrence && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-rose-50 text-rose-800 border border-rose-200/80">
                          Possible recurrence
                        </span>
                      )}

                      {/* Property Pill */}
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-neutral-50 text-neutral-600 border border-neutral-200">
                        {branchName(item.branchId)}
                      </span>
                    </div>

                    {/* Status Label */}
                    <span className="text-[11px] font-medium text-neutral-400">
                      {formatSentenceCase(item.status)}
                    </span>
                  </div>

                  {/* Title */}
                  <h4 className="text-base font-semibold text-neutral-900 leading-snug">
                    {item.title}
                  </h4>

                  {/* Footer Meta */}
                  <div className="flex items-center justify-between text-xs text-neutral-500 pt-1 border-t border-neutral-100">
                    <span>
                      <b className="font-semibold text-neutral-900">{supportCount}</b> distinct source reviews
                    </span>
                    <span className="text-neutral-400">
                      Severity {item.severity}/3
                    </span>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-8 text-center text-sm text-neutral-500 shadow-xs">
              No items match this category filter.
            </div>
          )}
        </div>

        {/* Right Column (7 of 12 cols): Selected Issue Detail & Evidence with independent scroll */}
        <div className="lg:col-span-7 sticky top-6 max-h-[calc(100vh-210px)] overflow-y-auto pr-1 clean-scrollbar">
          {selectedTheme ? (
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs space-y-6">
              {/* Header Badges & Actions */}
              <div className="space-y-3 pb-4 border-b border-neutral-100">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold ${
                        selectedTheme.priority === "urgent"
                          ? "bg-amber-50 text-amber-900 border border-amber-200/80"
                          : selectedTheme.priority === "high"
                            ? "bg-orange-50 text-orange-800 border border-orange-200/80"
                            : "bg-neutral-100 text-neutral-700 border border-neutral-200"
                      }`}
                    >
                      {formatSentenceCase(selectedTheme.priority)}
                    </span>

                    {selectedTheme.status === "recurrence" && (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-semibold bg-rose-50 text-rose-800 border border-rose-200/80">
                        Possible recurrence
                      </span>
                    )}

                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-neutral-50 text-neutral-700 border border-neutral-200">
                      {branchName(selectedTheme.branchId)}
                    </span>

                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-white text-neutral-500 border border-neutral-200">
                      Status: {formatSentenceCase(selectedTheme.status)}
                    </span>
                  </div>

                  {/* Owner Controls (Severity & Confirmation) */}
                  {owner && (
                    <div className="flex items-center gap-2">
                      <select
                        value={selectedTheme.severity}
                        onChange={(e) => void onSetSeverity(selectedTheme.id, Number(e.target.value))}
                        className="rounded-xl border border-neutral-200 bg-white px-2.5 py-1 text-xs text-neutral-700 focus:border-neutral-400 focus:outline-none cursor-pointer"
                        title="Owner Severity Score"
                      >
                        <option value={1}>Severity 1 · Low</option>
                        <option value={2}>Severity 2 · Medium</option>
                        <option value={3}>Severity 3 · Safety concern</option>
                      </select>
                    </div>
                  )}
                </div>

                {/* Title */}
                <h3 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900">
                  {selectedTheme.title}
                </h3>

                {/* Deterministic Priority Rationale */}
                <p className="text-xs sm:text-[13px] text-neutral-500 leading-relaxed">
                  {selectedTheme.priorityReason ||
                    `${themeSupport[selectedTheme.id] || 0} distinct source reviews mention this issue at ${branchName(selectedTheme.branchId)}. Deterministic recurrence and verified severity score of ${selectedTheme.severity}/3.`}
                </p>

                {/* Action Row for Suggested Issues */}
                {owner && selectedTheme.status === "suggested" && (
                  <div className="pt-2 flex items-center gap-2.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => void onSetStatus(selectedTheme.id, "owner_confirmed")}
                      className="bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                    >
                      Confirm issue
                    </button>
                    <button
                      type="button"
                      onClick={() => void onSetStatus(selectedTheme.id, "dismissed")}
                      className="secondary text-xs font-semibold px-4 py-2 rounded-full cursor-pointer hover:bg-neutral-50"
                    >
                      Dismiss
                    </button>
                    <span className="text-xs text-neutral-400 ml-1">
                      Confirms this is a real issue and enables task dispatch.
                    </span>
                  </div>
                )}
              </div>

              {/* Supporting Reviews & Exact Quote Callouts */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-neutral-900">
                    Supporting Review Evidence ({currentThemeObs.length})
                  </h4>
                  <span className="text-xs text-neutral-400">
                    Across {themeSupport[selectedTheme.id] || 0} distinct source reviews
                  </span>
                </div>

                {currentThemeObs.length > 0 ? (
                  <div className="space-y-3">
                    {currentThemeObs.map((obs) => {
                      const parentReview = reviews.find((r) => r.id === obs.reviewId);
                      return (
                        <div
                          key={obs.id}
                          className="rounded-xl border border-neutral-200/70 bg-neutral-50/40 p-4 space-y-2.5"
                        >
                          <div className="flex items-center justify-between text-xs text-neutral-500">
                            <span className="font-medium text-neutral-700">
                              {parentReview ? `${parentReview.source.replace(/\s*\[Simulated\]/i, "")} · ${parentReview.rating}★` : "Source Review"}
                            </span>
                            <span>{dateFormatter(parentReview?.reviewedAt || null)}</span>
                          </div>

                          {/* Signature Exact Supporting Quote Callout Box */}
                          <blockquote className="rounded-xl bg-white border border-neutral-200/70 px-4 py-3 italic text-neutral-700 text-sm leading-relaxed">
                            “{obs.evidenceQuote}”
                          </blockquote>

                          <div className="flex items-center justify-between text-xs text-neutral-500 pt-1">
                            <span className="text-[11px] text-neutral-400">
                              Aspect: {obs.aspect || obs.category}
                            </span>
                            {owner && (
                              <button
                                type="button"
                                onClick={() => void onCorrectMembership(obs.id, null)}
                                className="link text-xs text-neutral-500 hover:text-red-600 cursor-pointer"
                              >
                                Remove from issue
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <p className="text-xs text-neutral-400 py-3">
                    No specific observations currently linked to this issue.
                  </p>
                )}
              </div>

              {/* Inline Task Creation Drawer/Form */}
              {selectedTheme.type === "operational_issue" && owner && (
                <div className="pt-2">
                  {!showTaskForm ? (
                    <div className="flex items-center justify-between p-4 rounded-xl bg-neutral-50 border border-neutral-200/80">
                      <div>
                        <h5 className="text-sm font-semibold text-neutral-900">
                          Create an operational task
                        </h5>
                        <p className="text-xs text-neutral-500 mt-0.5">
                          Dispatch work order to Orbyte or assign to property team.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleOpenTaskForm}
                        className="bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold px-4 py-2 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                      >
                        Create task →
                      </button>
                    </div>
                  ) : (
                    <form
                      onSubmit={handleSubmitTask}
                      className="rounded-xl border border-neutral-200 bg-neutral-50/70 p-5 space-y-4"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-neutral-200/60">
                        <h5 className="text-sm font-semibold text-neutral-900">
                          New Task Proposal
                        </h5>
                        <button
                          type="button"
                          onClick={() => setShowTaskForm(false)}
                          className="link text-xs text-neutral-500 hover:text-neutral-900 cursor-pointer"
                        >
                          Cancel
                        </button>
                      </div>

                      {/* Task Title */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1">
                          Task Title
                        </label>
                        <input
                          type="text"
                          required
                          value={taskTitle}
                          onChange={(e) => setTaskTitle(e.target.value)}
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none"
                        />
                      </div>

                      {/* Description */}
                      <div>
                        <label className="block text-xs font-semibold text-neutral-600 mb-1">
                          Task Description
                        </label>
                        <textarea
                          rows={3}
                          required
                          value={taskDescription}
                          onChange={(e) => setTaskDescription(e.target.value)}
                          className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none"
                        />
                      </div>

                      {/* Assignee & Due Date Row */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <label className="block text-xs font-semibold text-neutral-600 mb-1">
                            Employee Assignee
                          </label>
                          <select
                            value={assigneeId}
                            onChange={(e) => setAssigneeId(e.target.value)}
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none cursor-pointer"
                          >
                            {eligibleEmployees.map((emp) => (
                              <option key={emp.id} value={emp.id}>
                                {emp.name} · {emp.jobTitle}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="block text-xs font-semibold text-neutral-600 mb-1">
                            Due Date
                          </label>
                          <input
                            type="datetime-local"
                            required
                            value={dueDate}
                            onChange={(e) => setDueDate(e.target.value)}
                            className="w-full rounded-xl border border-neutral-200 bg-white px-3.5 py-2 text-sm text-neutral-800 focus:border-neutral-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Submit Actions */}
                      <div className="pt-2 flex items-center justify-end gap-2.5">
                        <button
                          type="button"
                          onClick={() => setShowTaskForm(false)}
                          className="secondary text-xs font-semibold px-4 py-2 rounded-full cursor-pointer hover:bg-neutral-50"
                        >
                          Cancel
                        </button>
                        <button
                          type="submit"
                          className="bg-[#1d1d1f] hover:bg-black text-white text-xs font-semibold px-5 py-2 rounded-full shadow-xs hover:shadow active:scale-[0.98] transition-all cursor-pointer"
                        >
                          Approve & send to Orbyte (Simulated)
                        </button>
                      </div>
                    </form>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-neutral-200/80 p-10 text-center text-sm text-neutral-500 shadow-xs">
              Choose an issue from the list to view its deterministic evidence and actions.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
