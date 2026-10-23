/** Clean, human-crafted typography-driven ActivityView */
import React from "react";
import type { Employee } from "./IssuesView";

export type Event = {
  id: string;
  businessId?: string;
  actor: string;
  role: string;
  type: string;
  entityType: string;
  entityId: string;
  description: string;
  metadata: unknown;
  createdAt: string;
};

function formatSentenceCase(str?: string | null): string {
  if (!str) return "";
  return str
    .replace(/[_-]/g, " ")
    .toLowerCase()
    .replace(/^\w/, (c) => c.toUpperCase());
}

export function ActivityView({
  events,
  employees,
  dateFormatter,
}: {
  events: Event[];
  employees: Employee[];
  dateFormatter: (d: string | null) => string;
}) {
  const getActorBadge = (actor: string, role: string, type: string) => {
    if (type.includes("handoff") || type.includes("orbyte")) {
      return {
        label: "Simulated Orbyte Handoff",
        style: "bg-amber-50 text-amber-900 border border-amber-200/80",
      };
    }
    if (type.includes("jev") || actor.toLowerCase().includes("jev")) {
      return {
        label: "Jev Screening Pipeline",
        style: "bg-emerald-50 text-emerald-800 border border-emerald-200/80",
      };
    }
    if (actor === "demo owner" || role === "owner") {
      return {
        label: "By Owner",
        style: "bg-neutral-100 text-neutral-800 border border-neutral-200/80",
      };
    }
    if (role === "manager" || actor.toLowerCase().includes("manager")) {
      return {
        label: "By Manager",
        style: "bg-purple-50 text-purple-800 border border-purple-200/80",
      };
    }
    const emp = employees.find((e) => e.id === actor);
    return {
      label: emp ? `By ${emp.name} (${emp.jobTitle})` : `By ${actor}`,
      style: "bg-blue-50 text-blue-800 border border-blue-200/80",
    };
  };

  const sortedEvents = [...events].sort(
    (a, b) =>
      new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime(),
  );

  return (
    <div className="w-full space-y-6 font-sans">
      {/* View Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-neutral-900">
            Activity Audit Trail
          </h2>
          <p className="text-xs text-neutral-500 mt-1">
            Chronological audit trail of intake, screening, task execution, manager verifications, and simulated publishing.
          </p>
        </div>
        <div className="text-xs text-neutral-400">
          Total audit entries: <b className="font-semibold text-neutral-800">{events.length}</b>
        </div>
      </div>

      {/* Full-Width Editorial Timeline Card */}
      <div className="bg-white rounded-2xl border border-neutral-200/80 p-6 sm:p-7 shadow-xs">
        {sortedEvents.length > 0 ? (
          <div className="divide-y divide-neutral-100">
            {sortedEvents.map((item) => {
              const actorInfo = getActorBadge(item.actor, item.role, item.type);

              return (
                <div key={item.id} className="py-4.5 first:pt-0 last:pb-0 space-y-2">
                  {/* Top Row: Event Title + Formatted Timestamp */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <span className="font-semibold text-neutral-900 text-sm">
                      {formatSentenceCase(item.type)}
                    </span>
                    <time className="text-xs text-neutral-400 font-normal">
                      {dateFormatter(item.createdAt)}
                    </time>
                  </div>

                  {/* Middle Row: Detailed Description & Evidence / Handoff Summary */}
                  <p className="text-sm text-neutral-600 leading-relaxed font-normal">
                    {item.description}
                  </p>

                  {/* Bottom Row: Acting Role / Provider Pill Badge */}
                  <div className="pt-1 flex items-center gap-2">
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium ${actorInfo.style}`}
                    >
                      {actorInfo.label}
                    </span>
                    <span className="text-[11px] text-neutral-400">
                      Entity: {formatSentenceCase(item.entityType)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-10 text-sm text-neutral-400">
            No activity events recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}
