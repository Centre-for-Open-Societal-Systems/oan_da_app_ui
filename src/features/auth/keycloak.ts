import { ApiError, apiRequest } from "@/lib/api";
import { fetchIamMe, iamReturnUrl, startIamLogin } from "@/lib/iam";
import { loginProviderFor } from "@/lib/loginProvider";
import { buildOidcLoginUrl, endOidcSession, exchangeOidcCode, hasOidcResult, hasPendingOidcLogin } from "@/lib/oidc";
import type { Role } from "@/lib/rbac";
import type { AuthTokens } from "@/store/useAuthStore";
import { toMeSession, type MeResponse } from "./me";
import type { LoginResult } from "./login";
import { toOidcTokens } from "./session";

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
// That needs the portal on a host under IAM's cookie domain (*.development.oanstaging.com on dev); on any other host the
// browser never sends IAM's cookies and step 4 answers 401. Such hosts (da-registry-development.oanstaging.com,
// localhost) sign in with direct Keycloak instead (lib/loginProvider): authorization code + PKCE against the public
// client da_registry, the token pair kept in the auth store as provider "oidc" and sent as Bearer.

const STATE_KEY = "oan-iam-login-state";

/** Whether the login form asks for credentials even when Keycloak still has a session for this browser. */
const forceLogin = () => process.env.NEXT_PUBLIC_IAM_PROMPT !== "none-forced";

/** The stored session of an IAM sign-in: IAM's cookies hold the token, so there is nothing to keep but the marker. */
export const IAM_SESSION: AuthTokens = { accessToken: "", refreshToken: "", expiresAt: 0, provider: "iam" };

/** Steps 1-2: opens the Keycloak sign-in for this host. The page is left behind, so this never resolves in practice. */
export async function beginKeycloakLogin(): Promise<void> {
  if (loginProviderFor(window.location.hostname) === "oidc") {
    window.location.assign(await buildOidcLoginUrl(window.location.origin, { forceLogin: forceLogin() }));
    return;
  }
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

/** An OIDC sign-in that did not finish; its message is shown as is (never the IAM-cookie hint). */
export class OidcLoginError extends ApiError {}

/** Whether a callback URL is the return of a direct Keycloak (OIDC) sign-in rather than of IAM's flow. */
export const isOidcCallback = (search: URLSearchParams, hostname = typeof window === "undefined" ? "" : window.location.hostname) =>
  hasOidcResult(search) && (hasPendingOidcLogin() || loginProviderFor(hostname) === "oidc");

const claimText = (claims: Record<string, unknown> | null, key: string) => (typeof claims?.[key] === "string" ? (claims[key] as string) : "");

/** Direct Keycloak: trades the code for tokens, then asks /da-services/me with the access token as Bearer. */
async function completeOidcLogin(search: URLSearchParams): Promise<LoginResult> {
  let tokens: AuthTokens;
  try {
    tokens = toOidcTokens(await exchangeOidcCode(search, window.location.origin), Date.now());
  } catch (err) {
    throw new OidcLoginError(err instanceof Error ? err.message : "Keycloak did not issue a session.", err instanceof ApiError ? err.status : 400);
  }
  try {
    const session = toMeSession(await apiRequest<MeResponse>("/da-services/me", { accessToken: tokens.accessToken }));
    if (!session) throw new ApiError("Your account holds a role this portal does not know. Contact your administrator.", 403);
    return { ...session, tokens };
  } catch (err) {
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
      // Signed in at Keycloak but not let into the portal: end that Keycloak session so nothing is left behind.
      void endOidcSession(tokens.refreshToken);
      const message = err.status === 401 ? "Keycloak signed you in, but the DA Services API did not accept the token. Contact your administrator." : err.message;
      throw new OidcLoginError(message, err.status);
    }
    // API unreachable or failing: sign in on the token's claims; ProfileSync reads /me again on the next load.
    const claims = tokenClaims(tokens.accessToken);
    const email = claimText(claims, "email");
    const name = claimText(claims, "name") || claimText(claims, "preferred_username") || email;
    return { user: { id: claimText(claims, "sub") || email, name, email }, role: roleFromClaims(claims), tokens };
  }
}

/** Step 4: turns the callback into a session. `search` is the callback URL's query. */
export async function completeKeycloakLogin(search: URLSearchParams = new URLSearchParams()): Promise<LoginResult> {
  if (isOidcCallback(search)) return completeOidcLogin(search);
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
