import { ApiError } from "@/lib/api";
import { fetchIamMe, fetchIamSession, iamReturnUrl, startIamLogin } from "@/lib/iam";
import type { Role } from "@/lib/rbac";
import type { AuthTokens } from "@/store/useAuthStore";
import { fetchMe, toMeSession } from "./me";
import type { LoginResult } from "./login";

// Sign-in through the OAN auth service (IAM) and the staff Keycloak realm. No client, redirect URI or token exchange
// of our own: IAM owns the authorization-code flow.
//
//  1. POST /api/v1/auth/iam/login (through the /iam-api proxy) returns redirect_url, the staff-realm authorize URL.
//  2. The browser leaves for that URL as a top-level navigation (+ prompt=login). Keycloak renders its own login form
//     and posts it itself; this app never sees or sends the credentials.
//  3. Keycloak returns to IAM's /auth/callback, which exchanges the code and sets X-Access-Token and X-CSRF-Token
//     cookies for *.development.oanstaging.com, then sends the browser on to return_url (/api/auth/iam/complete).
//  4. /auth/callback here reads both cookies via /api/auth/iam/session and stores the pair in the auth store.
//
// Every DA Services call then carries Authorization: Bearer <access token> and X-CSRF-Token (see session.authRequest).
// A 401 or CSRF rejection clears the pair and starts this flow again with a fresh state; nothing is reused.

const STATE_KEY = "oan-iam-login-state";

/** Whether the login form asks for credentials even when Keycloak still has a session for this browser. */
const forceLogin = () => process.env.NEXT_PUBLIC_IAM_PROMPT !== "none-forced";

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

/** The portal role for the roles in a token; the most senior match wins, a Development Agent otherwise. */
export function roleFromClaims(claims: Record<string, unknown> | null): Role {
  const access = claims?.resource_access as Record<string, { roles?: string[] }> | undefined;
  const roles = access?.["da-client"]?.roles ?? [];
  return ROLE_PATTERNS.find(([, pattern]) => roles.some((r) => pattern.test(r)))?.[0] ?? "DA";
}

/**
 * Who a token belongs to. GET /da-services/me gives the role, scope and menu when the API accepts the token; else
 * the identity comes from the token's own claims (and, for an IAM token, IAM's /auth/me).
 */
async function sessionFor(tokens: AuthTokens): Promise<LoginResult> {
  try {
    const session = toMeSession(await fetchMe(tokens.accessToken, tokens.csrfToken));
    if (session) return { ...session, tokens };
  } catch {
    // The API does not know this account (yet) or is unreachable: fall back to what the token says.
  }

  const claims = tokenClaims(tokens.accessToken);
  const me = await fetchIamMe(tokens.accessToken).catch(() => null);
  if (!me && !claims) throw new ApiError("Could not read your account after signing in.", 0);
  const name = [me?.first_name, me?.last_name].filter(Boolean).join(" ") || String(claims?.name ?? "");
  const email = me?.login_email ?? String(claims?.email ?? "");
  return { user: { id: me?.user ?? String(claims?.sub ?? email), name: name || email, email }, role: roleFromClaims(claims), tokens };
}

/** Step 4: turns the cookies IAM left for this page into a session. `search` is the callback URL's query. */
export async function completeKeycloakLogin(search: URLSearchParams = new URLSearchParams()): Promise<LoginResult> {
  verifyLoginState(search);
  const { access_token: accessToken, csrf_token: csrfToken, expires_at: expiresAt } = await fetchIamSession();
  return sessionFor({ accessToken, refreshToken: "", expiresAt, provider: "keycloak", csrfToken: csrfToken ?? undefined });
}
