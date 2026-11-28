// What each role sees on Org Hierarchy. UI only: the signed-in user is placed in the static employee tree by the
// names their login carries (own name, region, woreda, kebele), falling back to a sample person for the role.
import type { Role } from "@/lib/rbac";
import { EMPLOYEE_TREE, WOREDA_TEAMS, chainTo, type Employee, type EmployeeRole, type WoredaTeams } from "./data";

/** Names from the login that place the user in the sample tree. */
export interface Viewer {
  name?: string | null;
  region?: string | null;
  woreda?: string | null;
  kebele?: string | null;
}

const NATIONWIDE: readonly Role[] = ["Admin", "SuperAdmin", "CommsOfficer"];
const same = (a: string | null | undefined, b: string) => !!a && b.toLowerCase().startsWith(a.trim().toLowerCase());

/** Sample person for each role when the login names no match. */
const FALLBACK: Partial<Record<Role, string>> = { Executive: "kenenisa", Supervisor: "ayana", DA: "chaltu" };
const ROLE_IN_TREE: Partial<Record<Role, EmployeeRole>> = { Executive: "Executive", Supervisor: "Supervisor", DA: "DA" };

function all(e: Employee): Employee[] {
  return [e, ...(e.reports ?? []).flatMap(all)];
}

/** The signed-in user's own node in the tree, or null for a nationwide role. */
export function selfIn(role: Role, viewer: Viewer = {}): Employee | null {
  const kind = ROLE_IN_TREE[role];
  if (!kind) return null;
  const people = all(EMPLOYEE_TREE).filter((e) => e.role === kind);
  const byName = people.find((e) => !!viewer.name && e.name.toLowerCase() === viewer.name.trim().toLowerCase());
  const byPlace = kind === "Executive" ? people.find((e) => same(viewer.region, e.place)) : kind === "DA" ? people.find((e) => same(viewer.kebele, e.place)) : undefined;
  return byName ?? byPlace ?? people.find((e) => e.id === FALLBACK[role]) ?? null;
}

/**
 * Where the tree starts for a role: everyone for Admin / Comms; an Executive's region; a Supervisor's woreda
 * (their woreda head and the teams under them); a DA's own team (their supervisor and teammates).
 */
export function treeRootFor(role: Role, viewer: Viewer = {}): Employee {
  if (NATIONWIDE.includes(role)) return EMPLOYEE_TREE;
  const self = selfIn(role, viewer);
  if (!self) return EMPLOYEE_TREE;
  const chain = chainTo(self.id);
  if (role === "Executive") return self;
  if (role === "Supervisor") return chain.find((e) => e.role === "WoredaHead") ?? self;
  // DA: their supervisor's team.
  return chain[chain.length - 2] ?? self;
}

/** The people above the tree's root (shown as "Reports to" context), top first. */
export const chainAbove = (root: Employee): Employee[] => chainTo(root.id).slice(0, -1);

/** Admin and Supervisor manage reporting lines; the others only read. */
export const canManageTeams = (role: Role) => role === "Supervisor" || role === "Admin";

/** Only the Admin edits the wider structure. */
export const canEditStructure = (role: Role) => role === "Admin";

/**
 * Supervisors and teams by role: a DA sees their own team and reporting line; a Supervisor their woreda's teams;
 * an Admin / Comms pick any woreda, an Executive one of their region.
 */
export type TeamsMode = "own" | "woreda" | "browse";

export const teamsModeFor = (role: Role): TeamsMode => (role === "DA" ? "own" : role === "Supervisor" ? "woreda" : "browse");

/** The woredas a role may see on Supervisors and teams. */
export function woredasFor(role: Role, viewer: Viewer = {}): WoredaTeams[] {
  if (NATIONWIDE.includes(role)) return WOREDA_TEAMS;
  const self = selfIn(role, viewer);
  const chain = self ? chainTo(self.id) : [];
  if (role === "Executive") {
    const region = self?.place;
    return WOREDA_TEAMS.filter((w) => w.region === region);
  }
  const head = chain.find((e) => e.role === "WoredaHead");
  const own = WOREDA_TEAMS.find((w) => !!head && same(w.name, head.place)) ?? WOREDA_TEAMS.find((w) => same(viewer.woreda, w.name));
  return own ? [own] : WOREDA_TEAMS.slice(0, 1);
}
