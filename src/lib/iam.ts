// Staff IAM (Keycloak) sign-in: names, URL helpers and token parsing shared by the UI's /api/auth/iam routes,
// the /login pages and features/auth. Framework-free on purpose (see docs/ARCHITECTURE.md).
//
// Flow (oan_auth_service, docs/IAM_LOGIN_DISCOVERY_FLOW.md): /login sends the browser to this app's
// /api/auth/iam/login, which asks the backend to start the IAM sign-in and redirects to Keycloak. Keycloak
// returns to the IAM, the IAM sets its token cookies on the shared parent domain (development.oanstaging.com)
// and lands the browser on this app's /api/auth/iam/complete, from where /login/iam reads the token back
// through /api/auth/iam/session and signs the user in. The app must therefore be served under that parent
// domain, locally as https://da-local.development.oanstaging.com:3000 (see README).

/** Cookie names the IAM sets at its callback, each prefixed with the login option's `cookie_prefix`. */
export const IAM_COOKIE = {
  access: "X-Access-Token",
  csrf: "X-CSRF-Token",
  id: "X-ID-Token",
  session: "X-Session-Id",
} as const;

/** This app's own cookie: which login option (key and cookie prefix) the sign-in in progress belongs to. */
export const LOGIN_OPTION_COOKIE = "oan_login_option";

/** The backend's login option for staff and field agents; NEXT_PUBLIC_IAM_LOGIN_KEY overrides it. */
export const DEFAULT_IAM_KEY = "agent";
export const DEFAULT_RETURN_PATH = "/dashboard";

/** This app's routes in the flow. */
export const IAM_LOGIN_PATH = "/api/auth/iam/login";
export const IAM_COMPLETE_PATH = "/api/auth/iam/complete";
export const IAM_SESSION_ENDPOINT = "/api/auth/iam/session";
export const IAM_LANDING_PATH = "/login/iam";

export const iamCookieName = (prefix: string, name: (typeof IAM_COOKIE)[keyof typeof IAM_COOKIE]) => `${prefix}${name}`;

export interface LoginOption {
  key: string;
  cookiePrefix: string;
}

export const encodeLoginOption = (option: LoginOption) => encodeURIComponent(JSON.stringify(option));

export function parseLoginOption(raw: string | null | undefined): LoginOption | null {
  if (!raw) return null;
  try {
    const value = JSON.parse(decodeURIComponent(raw)) as Partial<LoginOption>;
    if (typeof value.key !== "string" || !value.key) return null;
    return { key: value.key, cookiePrefix: typeof value.cookiePrefix === "string" ? value.cookiePrefix : "" };
  } catch {
    return null;
  }
}

/**
 * Where to send the user after sign-in: only a path on this app. Anything else (another origin, a scheme,
 * a protocol-relative URL, an API route) falls back, so the return URL can never become an open redirect.
 */
export function safeReturnPath(raw: string | null | undefined, fallback = DEFAULT_RETURN_PATH): string {
  const path = (raw ?? "").trim();
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (/[\s<>"'`]/.test(path) || path.startsWith("/api/")) return fallback;
  return path;
}

/** The /login?error=… codes this app's routes set, and what the sign-in form says for each. */
export const LOGIN_ERROR_MESSAGES: Record<string, string> = {
  session_expired: "Your session has ended. Please sign in again.",
  iam_failed: "The staff sign-in did not complete. Please try again.",
  iam_unavailable: "The staff sign-in service could not be reached. Please try again in a moment.",
  no_access: "Your account has no active role assignment yet. Contact your administrator.",
};

export const loginErrorMessage = (code: string | null | undefined): string | null =>
  code ? (LOGIN_ERROR_MESSAGES[code] ?? "Sign-in did not complete. Please try again.") : null;

/** Link that starts the sign-in: a page navigation, not a fetch, so the browser can follow Keycloak's redirects. */
export const iamLoginHref = (key: string, returnPath = DEFAULT_RETURN_PATH) =>
  `${IAM_LOGIN_PATH}?${new URLSearchParams({ key, returnUrl: safeReturnPath(returnPath) })}`;

/**
 * The public origin of this app as the browser sees it, for the IAM's return URL. Forwarded headers win (a
 * proxy or tunnel in front), then the Host header (the dev server listens on localhost but is opened as
 * da-local.development.oanstaging.com), then the request's own origin.
 */
export function requestOrigin(headers: Headers, fallback: string): string {
  const forwardedHost = headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || headers.get("host")?.trim();
  if (!host) return fallback;
  const forwardedProto = headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const proto = forwardedProto || (fallback.startsWith("https://") ? "https" : "http");
  return `${proto}://${host}`;
}

/** The IAM token pair the UI works with once the sign-in has completed. */
export interface IamSessionTokens {
  accessToken: string;
  csrfToken?: string;
  cookiePrefix?: string;
  loginOption?: string;
}

function base64UrlDecode(part: string): string {
  const b64 = part.replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(part.length / 4) * 4, "=");
  const bytes = atob(b64);
  return decodeURIComponent(Array.from(bytes, (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join(""));
}

/** The `exp` claim of a JWT as epoch milliseconds, without verifying it; null when the token carries none. */
export function decodeJwtExpiry(token: string): number | null {
  const payload = token.split(".")[1];
  if (!payload) return null;
  try {
    const claims = JSON.parse(base64UrlDecode(payload)) as { exp?: unknown };
    return typeof claims.exp === "number" && Number.isFinite(claims.exp) ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

/** JSON the UI server answers on GET /api/auth/iam/session. */
export interface IamSessionResponse {
  data: {
    access_token: string;
    csrf_token: string | null;
    cookie_prefix: string;
    login_option: string | null;
  };
}

/**
 * Asks this app's server for the IAM token the browser holds in cookies. Null when none reached this origin
 * (not signed in, or the app is not served under the IAM's parent domain). Throws only on an unexpected answer.
 */
export async function readIamSession(): Promise<IamSessionTokens | null> {
  let res: Response;
  try {
    res = await fetch(IAM_SESSION_ENDPOINT, { credentials: "same-origin", cache: "no-store", headers: { Accept: "application/json" } });
  } catch {
    return null;
  }
  if (res.status === 401 || res.status === 404) return null;
  if (!res.ok) throw new Error(`Could not read the sign-in session (${res.status}).`);
  const { data } = (await res.json()) as IamSessionResponse;
  return {
    accessToken: data.access_token,
    csrfToken: data.csrf_token ?? undefined,
    cookiePrefix: data.cookie_prefix,
    loginOption: data.login_option ?? undefined,
  };
}

/** Domain of the DA Services accounts the backend creates for staff IAM users at their first sign-in. */
export const DELEGATED_USER_DOMAIN = "iam.internal";

export const isDelegatedUserId = (value: string) => value.trim().toLowerCase().endsWith(`@${DELEGATED_USER_DOMAIN}`);

/**
 * The DA Services user id of a staff IAM user: `sha256("<login option>:<sub>")[:32]@iam.internal`, where `sub`
 * is the identity provider's stable user id (the user's ID in the Keycloak console). Mirrors oan_auth_service
 * `iam_users.user_name_for_sub`, so an Admin can assign a role to a staff user from their Keycloak ID. A value
 * that already is such an id is returned as typed.
 */
export async function delegatedUserId(sub: string, loginOption: string): Promise<string> {
  const value = sub.trim();
  if (isDelegatedUserId(value)) return value.toLowerCase();
  const bytes = new TextEncoder().encode(`${loginOption}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  const hex = Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
  return `${hex.slice(0, 32)}@${DELEGATED_USER_DOMAIN}`;
}
