/** Visual shell only. Review state and actions remain in Workspace.tsx. */
import Image from "next/image";
export type WorkspaceTab =
  "dashboard" | "reviews" | "issues" | "new" | "tasks" | "replies" | "activity";

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
    <>
      <header className="top">
        <div className="brand-lockup">
          <Image className="brand-mark" src="/clarity-symbol.svg" alt="" width={44} height={44} />
          <div>
            <h1>Clarity</h1>
            <p>Review workspace</p>
          </div>
        </div>
        <div className="header-actions">
          <div className="workspace-controls">
          <label className="workspace-control business-switcher">
            <span>Business</span>
            <select
              value={businessId}
              onChange={(event) => onBusinessChange(event.target.value)}
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name}
                </option>
              ))}
            </select>
          </label>
          <label className="workspace-control role-switcher">
            <span>View as</span>
            <select
              value={role}
              onChange={(event) => onRoleChange(event.target.value as DemoRole)}
            >
              <option value="owner">Owner</option>
              <option value="staff">Staff</option>
            </select>
          </label>
          </div>
        </div>
      </header>

      <nav className="main-nav" aria-label="Main navigation">
        {tabs.map((item) => (
          <button
            key={item}
            className={tab === item ? "active" : ""}
            onClick={() => onTabChange(item)}
          >
            {item === "new"
              ? "New review"
              : item[0].toUpperCase() + item.slice(1)}
          </button>
        ))}
      </nav>
    </>
  );
}
