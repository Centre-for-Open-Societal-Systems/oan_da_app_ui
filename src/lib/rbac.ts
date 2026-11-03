// Role model and role-scoped navigation (FSD D3 §2.2, §2.4, §3.1.1, Appendix B/D).
// Navigation is deny-by-default: an item is visible only to the roles listed on it.

export const ROLES = ["DA", "Supervisor", "Executive", "Admin", "CommsOfficer", "SuperAdmin"] as const;
export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  DA: "Development Agent",
  Supervisor: "Supervisor (Woreda)",
  Executive: "Executive (Regional)",
  Admin: "OAN / ATI Administrator",
  CommsOfficer: "Communications Officer",
  SuperAdmin: "Super Admin",
};

/** Scope line shown under the role in the sidebar footer (Appendix D: identity shown in the sidebar footer). */
export const ROLE_SCOPES: Record<Role, string> = {
  DA: "Own record · Bako Tibe",
  Supervisor: "Woreda · Bako Tibe",
  Executive: "Region · Oromia (read)",
  Admin: "All regions",
  CommsOfficer: "Broadcast domain",
  SuperAdmin: "All regions · all departments",
};

export type Part = 1 | 2 | "shared";

export interface NavItem {
  title: string;
  href: string;
  roles: readonly Role[];
  /** Part 2 items are rendered but disabled ("coming soon") — the nav shape is final per §2.4. */
  part: Part;
}

export interface NavGroup {
  /** Empty title = the ungrouped "Top" group. */
  title: string;
  items: NavItem[];
}

// Super Admin has its own four-item rail (Dashboard · Department · Users · Roles) and none of the field modules.
const ALL: readonly Role[] = ROLES.filter((r) => r !== "SuperAdmin");
const OFFICERS: readonly Role[] = ["Supervisor", "Executive", "Admin"];

export const NAV_GROUPS: NavGroup[] = [
  {
    title: "",
    items: [
      { title: "Dashboard", href: "/dashboard", roles: [...ALL, "SuperAdmin"], part: "shared" },
      { title: "Department", href: "/department", roles: ["SuperAdmin"], part: "shared" },
      { title: "Users", href: "/users", roles: ["SuperAdmin"], part: "shared" },
      { title: "Roles", href: "/roles", roles: ["SuperAdmin"], part: "shared" },
    ],
  },
  {
    title: "Farmer Management",
    items: [
      { title: "My Farmers", href: "/farmers", roles: ["DA", "Supervisor", "Executive"], part: 1 },
      { title: "Beneficiaries", href: "/beneficiaries", roles: ["DA", "Supervisor", "Admin"], part: 1 },
      { title: "Grievances", href: "/grievances", roles: ["DA", "Supervisor", "Admin"], part: 1 },
    ],
  },
  {
    title: "Agent Registry",
    items: [
      // The DA sees their own Woreda team here; the full registry is for officers.
      { title: "My Teams", href: "/my-teams", roles: ["DA"], part: 1 },
      { title: "Agents", href: "/agents", roles: OFFICERS, part: 1 },
      // Supervisor sees field operations here (visits + kebele assignment) instead of the registry-admin items
      { title: "Field Visits", href: "/visits", roles: ["Supervisor"], part: 1 },
      { title: "Assignments", href: "/assignments", roles: ["Supervisor"], part: 1 },
      // Governed status changes (transfer, leave, retirement …) for a DA, with their audit trail.
      { title: "Lifecycle Management", href: "/lifecycle", roles: ALL, part: 1 },
      { title: "Approvals", href: "/approvals", roles: ["Admin"], part: 1 },
      { title: "Registry Sync", href: "/registry-sync", roles: ["Admin"], part: 1 },
      // Internal Feedback (/feedback) is hidden from the sidebar; the page still opens by URL.
    ],
  },
  {
    title: "Leave",
    items: [
      { title: "My Leave", href: "/lifecycle/leave", roles: ALL.filter((r) => r !== "Admin"), part: 1 },
      { title: "Team Leave", href: "/team-leave", roles: ALL.filter((r) => r !== "Admin"), part: 1 },
      // The Admin runs leave for the whole programme instead of having a leave record of their own.
      { title: "Leave Overview", href: "/leave-overview", roles: ["Admin"], part: 1 },
      { title: "Leave Configure", href: "/leave-configure", roles: ["Admin"], part: 1 },
      { title: "Government Calendar", href: "/government-calendar", roles: ["Admin"], part: 1 },
    ],
  },
  {
    title: "Communication",
    items: [
      { title: "Knowledge Base", href: "/knowledge", roles: ALL, part: 1 },
      { title: "Broadcast", href: "/broadcast", roles: ["DA", "CommsOfficer", "Admin"], part: 1 },
      { title: "Alerts", href: "/alerts", roles: ["CommsOfficer", "Admin", "Supervisor"], part: 1 },
      // Admin maintains the directory; DAs open it from My Teams.
      { title: "Advisors", href: "/advisors", roles: ["Admin"], part: 1 },
    ],
  },
  {
    title: "Performance",
    items: [
      { title: "My Performance", href: "/performance", roles: ["DA", "Supervisor"], part: 1 },
      // The Supervisor's Performance rail: team, appraisal cycle, monitoring, then reviews through training.
      { title: "My Teams", href: "/performance/teams", roles: ["Supervisor"], part: 1 },
      { title: "Appraisals", href: "/appraisals", roles: ["Supervisor"], part: 1 },
      { title: "Monitoring", href: "/monitoring", roles: ["Supervisor"], part: 1 },
      { title: "Reviews", href: "/reviews", roles: ["Supervisor", "Admin"], part: 1 },
      { title: "Coaching", href: "/coaching", roles: ["Supervisor"], part: 1 },
      { title: "Recognition", href: "/recognition", roles: ["Supervisor"], part: 2 },
      { title: "Surveys", href: "/surveys", roles: ["DA", "Supervisor"], part: 1 },
      { title: "Training", href: "/training", roles: ["DA", "Supervisor"], part: 1 },
    ],
  },
  {
    title: "Administration",
    items: [
      { title: "Users & Roles", href: "/admin/users", roles: ["Admin"], part: "shared" },
      { title: "Reports", href: "/admin/reports", roles: OFFICERS, part: "shared" },
      { title: "Settings", href: "/admin/settings", roles: ["Admin"], part: "shared" },
    ],
  },
];

/** Groups + items the given role may see; groups with nothing visible are dropped. */
export function navForRole(role: Role): NavGroup[] {
  const groups = NAV_GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => i.roles.includes(role)) })).filter((g) => g.items.length > 0);
  // Admin works registry-first: Agent Registry sits right after the Dashboard, Farmer Management second.
  if (role !== "Admin") return groups;
  const registry = groups.find((g) => g.title === "Agent Registry");
  if (!registry) return groups;
  const rest = groups.filter((g) => g !== registry);
  return [rest[0], registry, ...rest.slice(1)];
}

/** Sub-routes that are not their own nav item but belong under a parent for the header title. */
export const PAGE_TITLES: { prefix: string; title: string }[] = [
  { prefix: "/dashboard", title: "Dashboard" },
  { prefix: "/profile", title: "My Profile" },
  // DA-ID, Fayda and Registry sync are tabs of the Agents module, so the header keeps the parent title.
  { prefix: "/agents/daid", title: "Agents" },
  { prefix: "/agents/fayda", title: "Agents" },
  { prefix: "/agents/", title: "DA Profile" },
  { prefix: "/agents", title: "Agents" },
  { prefix: "/my-teams", title: "My Teams" },
  { prefix: "/approvals", title: "Approvals" },
  { prefix: "/lifecycle/leave", title: "My Leave" },
  { prefix: "/team-leave", title: "Team Leave" },
  { prefix: "/leave-overview", title: "Leave Overview" },
  { prefix: "/leave-configure", title: "Leave Configure" },
  { prefix: "/government-calendar", title: "Government Calendar" },
  { prefix: "/lifecycle", title: "Lifecycle Management" },
  { prefix: "/registry-sync", title: "Agents" },
  { prefix: "/feedback", title: "Internal Feedback" },
  { prefix: "/farmers/new", title: "Register Farmer" },
  { prefix: "/farmers/crop-report", title: "Crop Report" },
  { prefix: "/farmers/livestock-report", title: "Livestock Report" },
  { prefix: "/farmers/", title: "Farmer Profile" },
  { prefix: "/farmers", title: "My Farmers" },
  { prefix: "/visits/", title: "Visit Planner" },
  { prefix: "/visits", title: "Visits" },
  { prefix: "/assignments", title: "Agent Assignment" },
  { prefix: "/beneficiaries", title: "Beneficiaries" },
  { prefix: "/grievances", title: "Grievances" },
  { prefix: "/knowledge/", title: "Article" },
  { prefix: "/knowledge", title: "Knowledge Base" },
  { prefix: "/broadcast", title: "Broadcast" },
  { prefix: "/alerts", title: "Alerts" },
  { prefix: "/advisors", title: "Advisors" },
  { prefix: "/performance/kpi-entry", title: "KPI Entry" },
  { prefix: "/performance/teams/targets", title: "Set Targets" },
  { prefix: "/performance/teams", title: "My Teams" },
  { prefix: "/appraisals", title: "Appraisals" },
  { prefix: "/monitoring", title: "Monitoring" },
  { prefix: "/coaching", title: "Coaching" },
  { prefix: "/recognition", title: "Recognition" },
  { prefix: "/performance", title: "My Performance" },
  { prefix: "/reviews/history", title: "Review History" },
  { prefix: "/reviews", title: "Reviews" },
  { prefix: "/surveys/", title: "Survey Capture" },
  { prefix: "/surveys", title: "Surveys" },
  { prefix: "/training/agents", title: "Agent Training" },
  { prefix: "/training", title: "Training" },
  { prefix: "/sync", title: "Sync Queue" },
  { prefix: "/department", title: "Department" },
  { prefix: "/users", title: "Users" },
  { prefix: "/roles", title: "Roles" },
  { prefix: "/admin/users", title: "Users & Roles" },
  { prefix: "/admin/reports", title: "Reports" },
  { prefix: "/admin/settings", title: "Settings" },
];

export const pageTitleFor = (pathname: string) => {
  if (pathname.startsWith("/visits/") && pathname.endsWith("/outcome")) return "Visit Outcome";
  if (pathname.startsWith("/farmers/") && pathname.endsWith("/services")) return "Farmer Services";
  return PAGE_TITLES.find((p) => pathname.startsWith(p.prefix))?.title ?? "Dashboard";
};
