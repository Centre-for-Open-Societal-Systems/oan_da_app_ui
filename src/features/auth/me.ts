import { apiRequest } from "@/lib/api";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/rbac";
import { useAuthStore, type AreaRef, type AuthProfile, type AuthUser, type ProfileLocation } from "@/store/useAuthStore";
import { authRequest } from "./session";

/**
 * GET /api/v1/da-services/me: who the bearer is, the portal role they act as, their post and place in the
 * DA Hierarchy and the routes they may open.
 */
export interface MeResponse {
  data: {
    user: { id: string; name: string; email: string };
    /** Portal role code, the same codes as lib/rbac (DA, Supervisor, Executive, Admin, CommsOfficer). */
    role: string;
    /** Backend role names, e.g. "Development Agent". */
    roles: string[];
    /** The user's post in the DA Hierarchy, e.g. "agent"; null without a hierarchy node. */
    designation: string | null;
    /** Where the user's DA Hierarchy node sits, each as {id, name}; a level the node does not set is null. */
    country: AreaRef | null;
    region: AreaRef | null;
    zone: AreaRef | null;
    woreda: AreaRef | null;
    kebele: AreaRef | null;
    /** Routes the backend allows this user to open. */
    menu: string[];
  };
}

export interface MeSession {
  user: AuthUser;
  role: Role;
  profile: AuthProfile;
}

const isRole = (code: string): code is Role => (ROLES as readonly string[]).includes(code);

/** The sidebar scope line for a role and its place in the hierarchy, e.g. "Woreda · Bako Tibe". */
function scopeLabelFor(role: Role, at: ProfileLocation): string {
  if (role === "Admin" || role === "SuperAdmin") return "All regions";
  if (role === "CommsOfficer") return "Broadcast domain";
  if (role === "DA") return at.woreda ? `Own record · ${at.woreda.name}` : "Own record";
  if (role === "Executive") return at.region ? `Region · ${at.region.name} (read)` : "Read only";
  const [label, area] = at.woreda ? ["Woreda", at.woreda] : at.zone ? ["Zone", at.zone] : ["Region", at.region];
  return area ? `${label} · ${area.name}` : "";
}

/**
 * The /me payload as the session stores it. Null when the backend names a role the portal does not know.
 * /me sends no scope, labels or Kebele list: they are built here from the role and the hierarchy location,
 * for the screens that read them.
 */
export function toMeSession({ data }: MeResponse): MeSession | null {
  if (!isRole(data.role)) return null;
  const location: ProfileLocation = { country: data.country ?? null, region: data.region ?? null, zone: data.zone ?? null, woreda: data.woreda ?? null, kebele: data.kebele ?? null };
  const codes = (area: AreaRef | null) => (area ? [area.id] : []);
  return {
    user: { id: data.user.id, name: data.user.name, email: data.user.email },
    role: data.role,
    profile: {
      roleLabel: ROLE_LABELS[data.role],
      scopeLabel: scopeLabelFor(data.role, location),
      // The user's own Region, Zone and Woreda; empty lists for a level the node does not set.
      scope: { regions: codes(location.region), zones: codes(location.zone), woredas: codes(location.woreda) },
      unrestricted: data.role === "Admin" || data.role === "SuperAdmin",
      menu: data.menu ?? [],
      daId: null,
      agent: null,
      // A DA's posting: the Kebele of their hierarchy node.
      ...(data.role === "DA" && location.kebele ? { kebeles: [{ code: location.kebele.id, name: location.kebele.name }] } : {}),
      designation: data.designation ?? null,
      location,
    },
  };
}

/**
 * GET /me. With `accessToken` (right after sign-in, before the session is stored) the call is made with that
 * token as is; without it the stored session is used and refreshed when needed.
 */
export function fetchMe(accessToken?: string, csrfToken?: string): Promise<MeResponse> {
  return accessToken ? apiRequest<MeResponse>("/da-services/me", { accessToken, csrfToken }) : authRequest<MeResponse>("/da-services/me");
}

/**
 * Re-reads /me for a stored backend session, so a role or scope changed by an Admin shows up on the next load.
 * Best effort: a failure keeps what is stored.
 */
export async function refreshProfile(): Promise<void> {
  if (!useAuthStore.getState().tokens) return;
  try {
    const session = toMeSession(await fetchMe());
    if (session) useAuthStore.getState().setSession(session.user, session.role, session.profile);
  } catch {
    // Offline or backend down: the stored identity stays until the next load.
  }
}
