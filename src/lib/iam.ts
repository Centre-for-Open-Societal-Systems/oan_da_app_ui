// Calls to the OAN auth service (IAM) that run Keycloak sign-in. The browser talks to this app only: /iam-api/v1 is
// proxied to IAM_BASE_URL (see next.config), and /api/auth/iam holds the two route handlers that finish the sign-in.
import { ApiError, apiRequest } from "@/lib/api";

const IAM = "/iam-api/v1";
const HANDOFF = "/api/auth/iam";

/** Which IAM login option to use. `agent` signs in at the staff Keycloak realm (client staff-portal). */
export const IAM_LOGIN_KEY = process.env.NEXT_PUBLIC_IAM_LOGIN_KEY ?? "agent";

/** Where IAM sends the browser once the code exchange is done; the route handler there forwards to the callback page. */
export const iamReturnUrl = (origin: string) => `${origin}/api/auth/iam/complete`;

/** POST /v1/auth/iam/login: starts the OAuth2 login and answers with the Keycloak authorization URL to open. */
export async function startIamLogin(returnUrl: string): Promise<string> {
  const res = await apiRequest<{ data: { redirect_url?: string; redirectUrl?: string } }>("/auth/iam/login", { method: "POST", body: { key: IAM_LOGIN_KEY, return_url: returnUrl }, prefix: IAM });
  const url = res.data.redirect_url ?? res.data.redirectUrl;
  if (!url) throw new ApiError("IAM did not return a sign-in address.", 502);
  return url;
}

/** What GET /v1/auth/me says about the IAM user. */
export interface IamMe {
  /** IAM user id, e.g. "63c0…@iam.internal". */
  user: string;
  first_name: string | null;
  last_name: string | null;
  login_email: string | null;
  login_option: string;
  roles: string[];
}

export async function fetchIamMe(accessToken: string): Promise<IamMe> {
  return (await apiRequest<{ data: IamMe }>("/auth/me", { accessToken, prefix: IAM })).data;
}

/** The access token IAM left in its (HttpOnly) cookie, read on the server side of this app. */
export interface IamSession {
  access_token: string;
  /** From IAM's X-CSRF-Token cookie, set alongside the access token; null when IAM did not set one. Sent back as the
   * X-CSRF-Token header — the backends behind IAM require it on top of the Bearer token. */
  csrf_token: string | null;
  /** Epoch ms. */
  expires_at: number;
}

/** GET /api/auth/iam/session: 401 when this browser did not receive IAM's cookie. */
export async function fetchIamSession(): Promise<IamSession> {
  return (await apiRequest<{ data: IamSession }>("/session", { prefix: HANDOFF })).data;
}

/** What POST /v1/auth/refresh hands back; IAM may answer with a body, or only by re-setting its cookies. */
export interface IamRefreshed {
  accessToken: string;
  csrfToken?: string;
  /** Epoch ms. */
  expiresAt: number;
}

const expOf = (token: string): number | null => {
  try {
    const exp = (JSON.parse(atob((token.split(".")[1] ?? "").replace(/-/g, "+").replace(/_/g, "/"))) as { exp?: number }).exp;
    return typeof exp === "number" ? exp * 1000 : null;
  } catch {
    return null;
  }
};

/**
 * POST /v1/auth/refresh with the current access token: IAM holds the refresh token server-side, renews the Keycloak
 * session and issues a new access token (and CSRF value). Sent without the Authorization header on purpose — the
 * token being renewed is usually the expired one. 400/401/403 mean the session is over.
 */
export async function refreshIamTokens(accessToken: string): Promise<IamRefreshed> {
  const res = await apiRequest<{ data?: Record<string, unknown> } & Record<string, unknown>>("/auth/refresh", { method: "POST", body: { access_token: accessToken }, prefix: IAM });
  const d = (res.data ?? res) as { access_token?: string; csrf_token?: string; expires_in?: number; expires_at?: number };
  // No token in the body: IAM renewed its cookies instead, which the session route reads.
  if (!d.access_token) {
    const s = await fetchIamSession();
    return { accessToken: s.access_token, csrfToken: s.csrf_token ?? undefined, expiresAt: s.expires_at };
  }
  const expiresAt = d.expires_at ?? (d.expires_in ? Date.now() + d.expires_in * 1000 : (expOf(d.access_token) ?? Date.now() + 2_100_000));
  return { accessToken: d.access_token, csrfToken: d.csrf_token, expiresAt };
}
