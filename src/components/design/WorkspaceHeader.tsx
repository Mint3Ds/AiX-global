/** Visual shell only. Review state and actions remain in Workspace.tsx. */
import React from "react";

export type WorkspaceTab =
  | "dashboard"
  | "reviews"
  | "issues"
  | "new"
  | "tasks"
  | "replies"
  | "activity";

type DemoRole = "owner" | "staff";

const tabs: WorkspaceTab[] = [
  "dashboard",
  "reviews",
  "issues",
  "new",
  "tasks",
  "replies",
  "activity",
];

export function WorkspaceHeader({
  businesses,
  businessId,
  onBusinessChange,
  tab,
  role,
  onTabChange,
  onRoleChange,
}: {
  businesses: { id: string; name: string }[];
  businessId: string;
  onBusinessChange: (id: string) => void;
  tab: WorkspaceTab;
  role: DemoRole;
  onTabChange: (tab: WorkspaceTab) => void;
  onRoleChange: (role: DemoRole) => void;
}) {
  return (
    <header className="w-full pt-4 pb-2 mb-6 font-sans">
      {/* Top Brand & Context Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 py-3 border-b border-gray-200/80">
        <div className="flex items-center gap-3">
          <div
            className="w-8 h-8 rounded-lg border border-gray-200/90 p-1 grid grid-cols-2 gap-1 bg-white shadow-xs"
            aria-hidden="true"
          >
            <span className="bg-[#1d1d1f] rounded-xs" />
            <span className="bg-[#0071e3] rounded-xs" />
            <span className="border border-gray-200 rounded-xs" />
            <span className="bg-[#1d1d1f] rounded-xs" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-gray-900 leading-none">
              Visit<span className="text-[#0071e3]">2</span>Value
            </h1>
            <p className="text-[11px] font-medium text-gray-400 tracking-wide mt-0.5">
              Review workspace
            </p>
          </div>
        </div>

        {/* Business and Role Switchers (Apple Clean Style) */}
        <div className="flex items-center gap-3 flex-wrap">
          <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-500">
            Business
            <div className="relative">
              <select
                value={businessId}
                onChange={(event) => onBusinessChange(event.target.value)}
                className="appearance-none bg-white text-gray-800 text-xs font-semibold pl-3 pr-8 py-1.5 rounded-xl border border-gray-200 shadow-2xs hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all cursor-pointer"
              >
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name}
                  </option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </label>

          <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-500">
            View as
            <div className="relative">
              <select
                value={role}
                onChange={(event) => onRoleChange(event.target.value as DemoRole)}
                className="appearance-none bg-white text-gray-800 text-xs font-semibold pl-3 pr-8 py-1.5 rounded-xl border border-gray-200 shadow-2xs hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-300 transition-all cursor-pointer"
              >
                <option value="owner">Owner</option>
                <option value="staff">Staff</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-2 text-gray-400">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* Apple-style Segmented Navigation */}
      <nav aria-label="Main navigation" className="pt-4 flex items-center overflow-x-auto no-scrollbar">
        <div className="inline-flex p-1 bg-gray-200/50 backdrop-blur-md rounded-2xl border border-black/[0.04] shadow-inner gap-1">
          {tabs.map((item) => {
            const isActive = tab === item;
            return (
              <button
                key={item}
                onClick={() => onTabChange(item)}
                className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-150 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? "bg-white text-gray-900 font-semibold shadow-[0_1px_3px_rgba(0,0,0,0.08),0_1px_2px_rgba(0,0,0,0.04)]"
                    : "text-gray-500 hover:text-gray-900 hover:bg-white/40"
                }`}
              >
                {item === "new"
                  ? "New review"
                  : item[0].toUpperCase() + item.slice(1)}
              </button>
            );
          })}
        </div>
      </nav>
    </header>
  );
}
