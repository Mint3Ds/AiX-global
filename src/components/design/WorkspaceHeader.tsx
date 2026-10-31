import { BrandIdentity } from "./BrandIdentity";
import { CustomDropdown } from "./CustomDropdown";

export type WorkspaceTab =
  | "dashboard"
  | "reviews"
  | "issues"
  | "new"
  | "tasks"
  | "replies"
  | "activity"
  | "stats";

type DemoRole = "owner" | "staff";

const tabs: { id: WorkspaceTab; label: string }[] = [
  // Edit navigation labels here. IDs also control which workspace screen opens.
  { id: "dashboard", label: "Dashboard" },
  { id: "reviews", label: "Reviews" },
  { id: "issues", label: "Issues" },
  { id: "tasks", label: "Tasks" },
  { id: "replies", label: "Replies" },
  { id: "activity", label: "Activity" },
  { id: "stats", label: "Stats" },
  { id: "new", label: "New review" },
];

export function WorkspaceHeader({
  businesses,
  businessId,
  onBusinessChange,
  tab,
  role,
  busy,
  onTabChange,
  onRoleChange,
}: {
  businesses: { id: string; name: string; issueCount?: number }[];
  businessId: string;
  onBusinessChange: (id: string) => void;
  tab: WorkspaceTab;
  role: DemoRole;
  busy: boolean;
  onTabChange: (tab: WorkspaceTab) => void;
  onRoleChange: (role: DemoRole) => void;
}) {
  return (
    <header className="workspace-header">
      <a className="skip-link" href="#workspace-main">
        Skip to content
      </a>
      <div className="top">
        <button
          type="button"
          className="brand-lockup"
          onClick={() => onTabChange("dashboard")}
          aria-label="Clarity dashboard"
        >
          <BrandIdentity />
        </button>
        <nav className="main-nav" aria-label="Main navigation">
          {tabs
            .filter(({ id }) =>
              role === "owner"
                ? true
                : ["dashboard", "tasks", "activity"].includes(id),
            )
            .map(({ id, label }) => (
              <button
                key={id}
                type="button"
                className={tab === id ? "active" : ""}
                aria-current={tab === id ? "page" : undefined}
                onClick={() => onTabChange(id)}
              >
                {label}
              </button>
            ))}
        </nav>
        <div className="workspace-controls gap-2">
          <div className="workspace-control business-switcher">
            <CustomDropdown
              value={businessId}
              disabled={busy}
              ariaLabel="Switch Property"
              sectionLabel="Switch Property"
              align="right"
              options={businesses.map((business) => ({
                value: business.id,
                label: business.name,
                meta:
                  business.issueCount !== undefined
                    ? business.issueCount
                    : undefined,
              }))}
              onChange={(id) => onBusinessChange(id)}
            />
          </div>
          <div className="workspace-control role-switcher">
            <CustomDropdown<DemoRole>
              value={role}
              disabled={busy}
              ariaLabel="Workspace Role"
              sectionLabel="Workspace Role"
              align="right"
              options={[
                { value: "owner", label: "Owner" },
                { value: "staff", label: "Staff" },
              ]}
              renderTriggerContent={(selected) => (
                <span className="clarity-role-trigger-inner">
                  <span className="clarity-role-badge bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded">
                    {selected?.label ?? (role === "owner" ? "Owner" : "Staff")}
                  </span>
                </span>
              )}
              onChange={(nextRole) => onRoleChange(nextRole)}
            />
          </div>
        </div>
      </div>
    </header>
  );
}
