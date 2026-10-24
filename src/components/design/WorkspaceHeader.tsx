/** Visual shell only. Review state and actions remain in Workspace.tsx. */
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
          <div className="brand-identity">
            <img
              src="/clarity-logo.png"
              alt="Clarity logo"
              className="brand-logo-img"
              height={30}
            />
            <h1 className="visually-hidden">Clarity</h1>
            <p className="brand-tagline">Review workspace</p>
          </div>
        </div>
        <div className="badges">
          <label className="business-switcher">
            Business
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
          <label>
            View as{" "}
            <select
              value={role}
              onChange={(event) => onRoleChange(event.target.value as DemoRole)}
            >
              <option value="owner">Owner</option>
              <option value="staff">Staff</option>
            </select>
          </label>
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
