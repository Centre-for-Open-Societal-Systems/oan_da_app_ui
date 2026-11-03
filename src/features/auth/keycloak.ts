import { ApiError, apiRequest } from "@/lib/api";
import { fetchIamMe, iamReturnUrl, startIamLogin } from "@/lib/iam";
import type { Role } from "@/lib/rbac";
import type { AuthTokens } from "@/store/useAuthStore";
import { toMeSession, type MeResponse } from "./me";
import type { LoginResult } from "./login";

// Sign-in through the OAN auth service (IAM) and the staff Keycloak realm, the OAN standard (the grievance and registry
// portals do the same). No client, redirect URI or token exchange of our own: IAM owns the authorization-code flow and
// the session, and this app never holds the access token.
//
//  1. POST /api/v1/auth/iam/login returns redirect_url, the staff-realm authorize URL.
//  2. The browser leaves for that URL as a top-level navigation (+ prompt=login). Keycloak renders its own login form
//     and posts it itself; this app never sees or sends the credentials.
//  3. Keycloak returns to IAM's /auth/callback, which exchanges the code, sets its session cookies (X-Access-Token,
//     X-Session-Id, X-CSRF-Token…) on the shared parent domain and sends the browser on to return_url (/auth/callback).
//  4. /auth/callback here asks GET /api/v1/da-services/me who is signed in. The browser sends IAM's cookies with it and
//     the /api/v1 proxy turns them into the Bearer token and X-CSRF-Token the backend reads, renewing an expired token.
//
// The portal must therefore be served on a host under IAM's cookie domain (*.development.oanstaging.com on dev); on any
// other host the browser never sends IAM's cookies and step 4 answers 401.

const STATE_KEY = "oan-iam-login-state";

/** Whether the login form asks for credentials even when Keycloak still has a session for this browser. */
const forceLogin = () => process.env.NEXT_PUBLIC_IAM_PROMPT !== "none-forced";

/** The stored session of an IAM sign-in: IAM's cookies hold the token, so there is nothing to keep but the marker. */
export const IAM_SESSION: AuthTokens = { accessToken: "", refreshToken: "", expiresAt: 0, provider: "iam" };

/** Steps 1-2: asks IAM for the authorize URL and opens it. The page is left behind, so this never resolves in practice. */
export async function beginKeycloakLogin(): Promise<void> {
  const url = new URL(await startIamLogin(iamReturnUrl(window.location.origin)));
  const state = url.searchParams.get("state");
  if (url.searchParams.get("response_type") !== "code" || !state) throw new ApiError("IAM returned an unexpected sign-in address.", 502);
  // Kept for the way back: the callback must carry this same state.
  sessionStorage.setItem(STATE_KEY, state);
  // Keycloak keeps its own browser session, so without this a returning user is passed straight through, with no form.
  if (forceLogin() && !url.searchParams.has("prompt")) url.searchParams.set("prompt", "login");
  window.location.assign(url.toString());
}

/** Checks the state on the callback URL against the one this browser sent out. One-shot: the stored state is dropped. */
export function verifyLoginState(search: URLSearchParams): void {
  const expected = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(STATE_KEY);
  const returned = search.get("state");
  // IAM exchanges the code on its own callback; whether it echoes state on to return_url is up to it. When it does,
  // it must match. A login this tab never started is refused either way.
  if (!expected || (returned !== null && returned !== expected)) throw new ApiError("This sign-in was not started in this browser tab. Please try again.", 400);
}

const decodeSegment = (segment: string): Record<string, unknown> | null => {
  try {
    const base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(atob(base64), (c) => c.charCodeAt(0)))) as Record<string, unknown>;
  } catch {
    return null;
  }
};

/** The claims of a JWT access token (not verified: the API verifies it on every call). */
export const tokenClaims = (token: string) => decodeSegment(token.split(".")[1] ?? "");

// Roles the Keycloak client of the portal grants, e.g. "DA_Development_Agent" under resource_access["da-client"].
const ROLE_PATTERNS: [Role, RegExp][] = [
  ["Admin", /admin/i],
  ["Executive", /executive/i],
  ["Supervisor", /supervisor/i],
  ["CommsOfficer", /comm/i],
  ["DA", /\bda\b|development[_ ]agent/i],
];

/** The portal role for a list of role names; the most senior match wins, a Development Agent otherwise. */
export const roleFromNames = (roles: string[]): Role => ROLE_PATTERNS.find(([, pattern]) => roles.some((r) => pattern.test(r)))?.[0] ?? "DA";

/** The portal role for the roles in a token. */
export function roleFromClaims(claims: Record<string, unknown> | null): Role {
  const access = claims?.resource_access as Record<string, { roles?: string[] }> | undefined;
  return roleFromNames(access?.["da-client"]?.roles ?? []);
}

/** Step 4: reads who IAM's cookies belong to and turns that into a session. `search` is the callback URL's query. */
export async function completeKeycloakLogin(search: URLSearchParams = new URLSearchParams()): Promise<LoginResult> {
  verifyLoginState(search);
  try {
    const session = toMeSession(await apiRequest<MeResponse>("/da-services/me"));
    if (session) return { ...session, tokens: IAM_SESSION };
  } catch (err) {
    // No IAM cookie reached this app: the sign-in did not produce a session here.
    if (err instanceof ApiError && err.status === 401) throw err;
    // Otherwise the API does not know this account (yet) or is unreachable: fall back to IAM's own record.
  }
  const me = await fetchIamMe();
  const email = me.login_email ?? "";
  const name = [me.first_name, me.last_name].filter(Boolean).join(" ") || email;
  return { user: { id: me.user, name, email }, role: roleFromNames(me.roles ?? []), tokens: IAM_SESSION };
}
