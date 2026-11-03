import { ApiError, apiPost } from "@/lib/api";
import { endIamSession } from "@/lib/iam";
import { ROLE_LABELS, ROLE_SCOPES, type Role } from "@/lib/rbac";
import { DEMO_ACCOUNTS, MOCK_LOGIN_ROLES } from "./accounts";
import type { AuthProfile, AuthTokens, AuthUser } from "@/store/useAuthStore";
import { IAM_SESSION, roleFromNames } from "./keycloak";
import { fetchMe, toMeSession } from "./me";
import { toTokens, type TokenResponse } from "./session";

export interface LoginResult {
  user: AuthUser;
  role: Role;
  tokens: AuthTokens;
  /** From /me; absent when /me could not be reached and the login response's roles were used instead. */
  profile?: AuthProfile;
}

// Role the portal falls back to when the account holds none of the portal's roles.
const FALLBACK_ROLE: Role = "DA";

export const NO_ASSIGNMENT_MESSAGE = "Your account has no active role assignment yet. Contact your administrator.";

/** POST /api/v1/da-services/auth/login: the backend signs the user in at IAM / Keycloak with these credentials. */
export interface IamPasswordLoginResponse {
  data: {
    /** IAM access token; also set as IAM's X-Access-Token cookie on this app's host. */
    access_token: string;
    token_type: string;
    expires_in: number;
    csrf_token: string | null;
    /** The user's email (or Keycloak username). */
    user: string;
    name: string | null;
    roles: string[];
  };
}

/**
 * Username and password sign-in through IAM / Keycloak, run by the backend (POST /api/v1/da-services/auth/login), then
 * GET /da-services/me for the name, role and scope the portal shows. The backend answers with IAM's session cookies,
 * which the /api/v1 proxy relays to this app's host: from then on the session is an IAM cookie session (the proxy sends
 * the token as Bearer and renews it), exactly as after the Keycloak redirect.
 * Wrong credentials come back as ApiError 401. An account /me refuses (no active RBAC assignment) is signed straight
 * out again and comes back as ApiError 403.
 */
export async function login(usr: string, pwd: string): Promise<LoginResult> {
  const { data } = await apiPost<IamPasswordLoginResponse>("/da-services/auth/login", { usr: usr.trim(), pwd });
  try {
    const session = toMeSession(await fetchMe(data.access_token, data.csrf_token ?? undefined));
    if (!session) throw new ApiError(NO_ASSIGNMENT_MESSAGE, 403);
    return { ...session, tokens: IAM_SESSION };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      void endIamSession();
      throw new ApiError(NO_ASSIGNMENT_MESSAGE, 403);
    }
    // /me unreachable: sign in on the login response alone; AuthHydration reads /me again on the next load.
    return { user: { id: data.user, name: data.name || data.user, email: data.user }, role: roleFromNames(data.roles ?? []), tokens: IAM_SESSION };
  }
}

export type MockLoginResult = Omit<LoginResult, "tokens"> & { profile: AuthProfile };

/**
 * Local sign-in for the mock-data roles (Super Admin): no backend call and no token pair, so nothing in the
 * session ever reaches the API. Null when the credentials are not one of those accounts.
 */
export function mockLogin(usr: string, pwd: string): MockLoginResult | null {
  const email = usr.trim().toLowerCase();
  const account = DEMO_ACCOUNTS.find((a) => MOCK_LOGIN_ROLES.includes(a.role) && a.email === email && a.password === pwd);
  if (!account) return null;
  return {
    user: { id: account.email, name: account.name, email: account.email },
    role: account.role,
    profile: {
      roleLabel: ROLE_LABELS[account.role],
      scopeLabel: ROLE_SCOPES[account.role],
      scope: { regions: [], woredas: [], zones: [] },
      unrestricted: true,
      menu: [],
      daId: null,
      agent: null,
    },
  };
}

export function toLoginResult(res: TokenResponse, now: number): LoginResult {
  const { user, roles } = res.data;
  return {
    // The response carries only the user id, which is the email for every account except Administrator.
    user: { id: user, name: user, email: user },
    role: toPortalRole(roles),
    tokens: toTokens(res, now),
  };
}

// An account can hold several backend roles (Administrator holds all of them), so the most senior one wins.
const ROLE_PRIORITY: [Role, string[]][] = [
  ["Admin", ["Administrator", "OAN Administrator", "System Manager"]],
  ["Executive", ["Executive"]],
  ["Supervisor", ["Supervisor"]],
  ["CommsOfficer", ["Communications Officer"]],
  ["DA", ["Development Agent"]],
];

export function toPortalRole(backendRoles: string[]): Role {
  const held = new Set(backendRoles);
  return ROLE_PRIORITY.find(([, names]) => names.some((n) => held.has(n)))?.[0] ?? FALLBACK_ROLE;
}
