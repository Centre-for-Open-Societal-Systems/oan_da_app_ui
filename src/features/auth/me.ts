import { apiRequest } from "@/lib/api";
import { ROLES, type Role } from "@/lib/rbac";
import { useAuthStore, type AuthProfile, type AuthUser } from "@/store/useAuthStore";
import { authRequest } from "./session";

/** GET /api/v1/da-services/me: who the bearer is, the portal role they act as and their scope. */
export interface MeResponse {
  data: {
    user: { id: string; name: string; email: string };
    /** Portal role code, the same codes as lib/rbac (DA, Supervisor, Executive, Admin, CommsOfficer). */
    role: string;
    role_codes: string[];
    role_label: string;
    /** Backend role names, e.g. "Development Agent". */
    roles: string[];
    scope: { regions: string[]; woredas: string[]; zones: string[] };
    scope_label: string;
    /** True for roles not bound to a region or Woreda (Admin). */
    unrestricted: boolean;
    /** Routes the backend allows this user to open. */
    menu: string[];
    da_id: string | null;
    /** The DA's registry record; only for a Development Agent. */
    agent?: Record<string, unknown>;
  };
}

export interface MeSession {
  user: AuthUser;
  role: Role;
  profile: AuthProfile;
}

const isRole = (code: string): code is Role => (ROLES as readonly string[]).includes(code);

/** The /me payload as the session stores it. Null when the backend names a role the portal does not know. */
export function toMeSession({ data }: MeResponse): MeSession | null {
  if (!isRole(data.role)) return null;
  const fullName = typeof data.agent?.full_name === "string" ? data.agent.full_name.trim() : "";
  return {
    user: { id: data.user.id, name: fullName || data.user.name, email: data.user.email },
    role: data.role,
    profile: {
      roleLabel: data.role_label,
      scopeLabel: data.scope_label,
      scope: data.scope,
      unrestricted: data.unrestricted,
      menu: data.menu,
      daId: data.da_id,
      agent: data.agent ?? null,
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
