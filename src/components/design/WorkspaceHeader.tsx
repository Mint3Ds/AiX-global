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

const journey: {
  number: string;
  title: string;
  detail: string;
  tab: WorkspaceTab;
}[] = [
  {
    number: "01",
    title: "Capture",
    detail: "A review enters the workspace",
    tab: "new",
  },
  {
    number: "02",
    title: "Read",
    detail: "One review, separate observations",
    tab: "reviews",
  },
  {
    number: "03",
    title: "Connect",
    detail: "Spot a recurring pattern",
    tab: "issues",
  },
  {
    number: "04",
    title: "Verify",
    detail: "Inspect the exact evidence",
    tab: "issues",
  },
  {
    number: "05",
    title: "Act",
    detail: "Approve and resolve the work",
    tab: "tasks",
  },
  {
    number: "06",
    title: "Respond",
    detail: "Review a truthful reply",
    tab: "replies",
  },
  {
    number: "07",
    title: "Trace",
    detail: "See the simulated handoff",
    tab: "activity",
  },
];

export function WorkspaceHeader({
  mode,
  businesses,
  businessId,
  branchCount,
  onBusinessChange,
  tab,
  role,
  guideOpen,
  onTabChange,
  onRoleChange,
  onGuideToggle,
}: {
  mode: string;
  businesses: { id: string; name: string }[];
  businessId: string;
  branchCount: number;
  onBusinessChange: (id: string) => void;
  tab: WorkspaceTab;
  role: DemoRole;
  guideOpen: boolean;
  onTabChange: (tab: WorkspaceTab) => void;
  onRoleChange: (role: DemoRole) => void;
  onGuideToggle: () => void;
}) {
  return (
    <>
      <header className="top">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
          </div>
          <div>
            <h1>
              Visit<span>2</span>Value
            </h1>
            <p>THE CUSTOMER SIGNAL DESK</p>
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
          <strong className="synthetic-badge">
            <span className="status-dot" /> SYNTHETIC DEMO
          </strong>
          <strong className={mode === "live" ? "live" : "fixture"}>
            AI / {mode}
          </strong>
          <label>
            Demo role{" "}
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

      <nav aria-label="Main navigation">
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

      <div className="workspace-strip">
        <span>
          WORKSPACE /{" "}
          {businesses
            .find((business) => business.id === businessId)
            ?.name.toUpperCase() || "LOADING"}{" "}
          / {branchCount} {branchCount === 1 ? "LOCATION" : "LOCATIONS"}
        </span>
        <button
          className="strip-button"
          onClick={onGuideToggle}
          aria-expanded={guideOpen}
        >
          {guideOpen ? "CLOSE FIELD GUIDE −" : "OPEN FIELD GUIDE +"}
        </button>
      </div>
      {guideOpen && (
        <div className="journey-rail" aria-label="Guided demo path">
          {journey.map((step) => (
            <button key={step.number} onClick={() => onTabChange(step.tab)}>
              <small>
                {step.number} / {step.title}
              </small>
              <span>{step.detail}</span>
            </button>
          ))}
        </div>
      )}
    </>
  );
}
