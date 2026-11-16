import { authRequest } from "@/features/auth";
import type { Role } from "@/lib/rbac";

/** Roles an Admin can give a new account. Admin itself is not handed out from the portal. */
export const ASSIGNABLE_ROLES = ["DA", "Supervisor", "Executive", "CommsOfficer"] as const satisfies readonly Role[];
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/** Backend role names, as /auth/register and /rbac-assignments expect them. */
export const BACKEND_ROLE: Record<AssignableRole, string> = {
  DA: "Development Agent",
  Supervisor: "Supervisor",
  Executive: "Executive",
  CommsOfficer: "Communications Officer",
};

export const isAssignableRole = (role: Role): role is AssignableRole => (ASSIGNABLE_ROLES as readonly Role[]).includes(role);

export interface NewUser {
  fullName: string;
  email: string;
  password: string;
  role: AssignableRole;
  /** Required by the backend for a Development Agent; ignored for other roles. */
  daId?: string;
  regionScope: string;
  /** The Zone the Woreda sits in. Omitted for region-wide roles. */
  zoneScope?: string;
  /** Omitted for region-wide roles. */
  woredaScope?: string;
  /** ISO dates, "2026-10-15". */
  effectiveFrom: string;
  effectiveTo?: string;
}

/** POST /api/v1/auth/register as the signed-in Admin. Resolves to the backend user id, e.g. "5d69…@id.openagrinet.internal". */
export async function registerUser(u: Pick<NewUser, "fullName" | "email" | "password" | "role">): Promise<string> {
  // The response also carries tokens for the new account; the Admin's own session must not pick them up.
  const res = await authRequest<{ data: { user: string } }>("/auth/register", {
    method: "POST",
    body: { email: u.email, full_name: u.fullName, password: u.password, role: BACKEND_ROLE[u.role] },
  });
  return res.data.user;
}

export interface RbacAssignmentRecord {
  /** Assignment id, e.g. "DA-RBAC-00111". */
  name: string;
  user: string;
  role: string;
  da_id: string | null;
  region_scope: string | null;
  zone_scope?: string | null;
  woreda_scope: string | null;
  effective_from: string;
  effective_to: string | null;
  active: boolean;
  assigned_by: string;
}

/** POST /api/v1/da-services/rbac-assignments: binds the role and its scope to the user. */
export async function createRbacAssignment(userId: string, u: NewUser): Promise<RbacAssignmentRecord> {
  const res = await authRequest<{ data: RbacAssignmentRecord }>("/da-services/rbac-assignments", {
    method: "POST",
    body: {
      user: userId,
      role: BACKEND_ROLE[u.role],
      ...(u.role === "DA" && { da_id: u.daId }),
      region_scope: u.regionScope,
      ...(u.zoneScope && { zone_scope: u.zoneScope }),
      ...(u.woredaScope && { woreda_scope: u.woredaScope }),
      effective_from: u.effectiveFrom,
      ...(u.effectiveTo && { effective_to: u.effectiveTo }),
    },
  });
  return res.data;
}

export interface RbacQuery {
  user?: string;
  /** Backend role name, e.g. "Development Agent". */
  role?: string;
  active?: boolean;
  limit?: number;
  start?: number;
}

/** GET /rbac-assignments: the Users & Roles table (Admin). The list may arrive as a bare array or wrapped in an object. */
export async function listRbacAssignments(q: RbacQuery = {}): Promise<{ items: RbacAssignmentRecord[]; total: number }> {
  const query = new URLSearchParams();
  if (q.user) query.set("user", q.user);
  if (q.role) query.set("role", q.role);
  if (q.active !== undefined) query.set("is_active", q.active ? "1" : "0");
  query.set("limit", String(q.limit ?? 200));
  query.set("start", String(q.start ?? 0));
  const res = await authRequest<{ data: RbacAssignmentRecord[] | { assignments?: RbacAssignmentRecord[]; items?: RbacAssignmentRecord[]; total?: number }; meta?: { total?: number } }>(`/da-services/rbac-assignments?${query}`);
  const items = Array.isArray(res.data) ? res.data : (res.data.assignments ?? res.data.items ?? []);
  const total = res.meta?.total ?? (Array.isArray(res.data) ? undefined : res.data.total) ?? items.length;
  return { items, total };
}

const assignmentPath = (id: string, part = "") => `/da-services/rbac-assignments/${encodeURIComponent(id)}${part}`;

/** GET /rbac-assignments/{id}: one assignment with its scope and dates. */
export async function fetchRbacAssignment(id: string): Promise<RbacAssignmentRecord> {
  return (await authRequest<{ data: RbacAssignmentRecord }>(assignmentPath(id))).data;
}

export interface RbacAssignmentPatch {
  region_scope?: string;
  zone_scope?: string;
  woreda_scope?: string;
  /** ISO dates, "2026-10-15". A role change is a new assignment, not a patch. */
  effective_from?: string;
  effective_to?: string;
}

/** PATCH /rbac-assignments/{id}: edits scope or dates. */
export async function updateRbacAssignment(id: string, patch: RbacAssignmentPatch): Promise<RbacAssignmentRecord> {
  return (await authRequest<{ data: RbacAssignmentRecord }>(assignmentPath(id), { method: "PATCH", body: patch })).data;
}

/** POST /rbac-assignments/{id}/revoke: deactivates the assignment; the row stays for audit. */
export async function revokeRbacAssignment(id: string, reason?: string): Promise<RbacAssignmentRecord> {
  return (await authRequest<{ data: RbacAssignmentRecord }>(assignmentPath(id, "/revoke"), { method: "POST", body: reason ? { reason } : {} })).data;
}

/** Backend role name → portal role; null for a role the portal does not know. */
export function toPortalRoleFromBackend(role: string): Role | null {
  const assignable = (Object.entries(BACKEND_ROLE) as [AssignableRole, string][]).find(([, name]) => name === role)?.[0];
  if (assignable) return assignable;
  return /^(administrator|admin|system manager)$/i.test(role) ? "Admin" : null;
}
