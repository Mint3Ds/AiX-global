import { BrandIdentity } from "./BrandIdentity";
import { ChoiceMenu } from "./ChoiceMenu";
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
  businesses: { id: string; name: string }[];
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
        <div className="workspace-controls">
          <ChoiceMenu
            className="workspace-control business-switcher"
            label="Business"
            value={businessId}
            disabled={busy}
            options={businesses.map((business) => ({
              value: business.id,
              label: business.name,
            }))}
            onChange={onBusinessChange}
          />
          <ChoiceMenu
            className="workspace-control role-switcher"
            label="View as"
            value={role}
            disabled={busy}
            options={[
              { value: "owner", label: "Owner" },
              { value: "staff", label: "Staff" },
            ]}
            onChange={(value) => onRoleChange(value as DemoRole)}
          />
        </div>
      </div>
    </header>
  );
}
