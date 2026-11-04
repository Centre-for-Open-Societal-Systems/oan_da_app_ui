import { ApiError, apiPost } from "@/lib/api";
import { ROLE_LABELS, ROLE_SCOPES, type Role } from "@/lib/rbac";
import { DEMO_ACCOUNTS, MOCK_LOGIN_ROLES } from "./accounts";
import type { AuthProfile, AuthTokens, AuthUser } from "@/store/useAuthStore";
import { roleFromNames, tokenClaims } from "./keycloak";
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

/** POST /api/v1/da-services/sso/login: the backend signs the user in at IAM / Keycloak with these credentials. */
export const SSO_LOGIN_PATH = "/da-services/sso/login";
/** IAM login option the backend signs in through (the `OAN IAM Service` row). */
const SSO_LOGIN_KEY = process.env.NEXT_PUBLIC_IAM_LOGIN_KEY || "agent";

/** The IAM user the sso/login response describes. */
export interface SsoLoginUser {
  /** IAM user id, e.g. "63c0…@iam.internal". */
  user: string;
  login_email: string | null;
  first_name: string | null;
  last_name: string | null;
  roles: string[];
}

/** Successful POST /api/v1/da-services/sso/login. */
export interface SsoLoginResponse {
  data: {
    /** Keycloak (staff realm) access token; sent as Bearer on every call. */
    access_token: string;
    csrf_token: string | null;
    user: SsoLoginUser;
  };
}

// Used when the token carries no readable `exp`; Keycloak's staff realm issues 30-minute access tokens.
const DEFAULT_TOKEN_TTL_MS = 30 * 60 * 1000;

/**
 * The stored session of an sso/login sign-in: the access token and CSRF token go out on every call. The response sets
 * no IAM session cookies and gives no refresh token, so the session ends (re-login popup) when the token expires.
 */
export function toSsoTokens(accessToken: string, csrfToken: string | null, now: number): AuthTokens {
  const exp = tokenClaims(accessToken)?.exp;
  return {
    accessToken,
    refreshToken: "",
    expiresAt: typeof exp === "number" ? exp * 1000 : now + DEFAULT_TOKEN_TTL_MS,
    csrfToken: csrfToken ?? undefined,
  };
}

function ssoUser({ user, login_email, first_name, last_name }: SsoLoginUser): AuthUser {
  const email = login_email || user;
  return { id: user, name: [first_name, last_name].filter(Boolean).join(" ") || email, email };
}

/**
 * Username and password sign-in: the backend signs the user in at IAM / Keycloak (POST /api/v1/da-services/sso/login)
 * and returns the access token, then GET /da-services/me with that token gives the name, role and scope the portal shows.
 * Wrong credentials come back as ApiError 401. An account /me refuses (no active RBAC assignment) comes back as 403.
 */
export async function login(usr: string, pwd: string): Promise<LoginResult> {
  const { data } = await apiPost<SsoLoginResponse>(SSO_LOGIN_PATH, { username: usr.trim(), password: pwd, key: SSO_LOGIN_KEY });
  if (!data?.access_token) throw new ApiError("Sign-in failed: the server sent no session.", 502);
  const tokens = toSsoTokens(data.access_token, data.csrf_token, Date.now());
  try {
    const session = toMeSession(await fetchMe(tokens.accessToken, tokens.csrfToken));
    if (!session) throw new ApiError(NO_ASSIGNMENT_MESSAGE, 403);
    return { ...session, tokens };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) throw new ApiError(NO_ASSIGNMENT_MESSAGE, 403);
    // /me unreachable: sign in on the login response alone; AuthHydration reads /me again on the next load.
    return { user: ssoUser(data.user), role: roleFromNames(data.user?.roles ?? []), tokens };
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
