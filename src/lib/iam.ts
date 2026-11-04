// Calls to the OAN auth service (oan_auth_service, served by the DA Services backend under /api/v1/auth) that run the
// IAM / Keycloak sign-in. They go through this app's /api/v1 proxy like every other call; the proxy adds the IAM
// session cookies as the Bearer token (see app/api/v1/[...path]/route.ts).
import { ApiError, apiRequest } from "@/lib/api";

/** Which IAM login option to use. `agent` signs in at the staff Keycloak realm (client staff-portal). */
export const IAM_LOGIN_KEY = process.env.NEXT_PUBLIC_IAM_LOGIN_KEY ?? "agent";

/** Where IAM sends the browser once it has exchanged the Keycloak code and set its session cookies. */
export const iamReturnUrl = (origin: string) => `${origin}/auth/callback`;

/** POST /api/v1/auth/iam/login: starts the OAuth2 login and answers with the Keycloak authorization URL to open. */
export async function startIamLogin(returnUrl: string): Promise<string> {
  const res = await apiRequest<{ data: { redirect_url?: string; redirectUrl?: string } }>("/auth/iam/login", { method: "POST", body: { key: IAM_LOGIN_KEY, return_url: returnUrl } });
  const url = res.data.redirect_url ?? res.data.redirectUrl;
  if (!url) throw new ApiError("IAM did not return a sign-in address.", 502);
  return url;
}

/** What GET /api/v1/auth/me says about the IAM user. */
export interface IamMe {
  /** IAM user id, e.g. "63c0…@iam.internal". */
  user: string;
  first_name: string | null;
  last_name: string | null;
  login_email: string | null;
  login_option: string;
  roles: string[];
}

/** GET /api/v1/auth/me for the IAM cookie session. */
export async function fetchIamMe(): Promise<IamMe> {
  return (await apiRequest<{ data: IamMe }>("/auth/me")).data;
}

/**
 * POST /api/v1/auth/logout for the IAM cookie session: IAM ends the Keycloak session and clears its cookies (the proxy
 * fills in the access token and relays IAM's Set-Cookie). Best effort: the local session is cleared regardless.
 */
export async function endIamSession(): Promise<void> {
  try {
    await fetch("/api/v1/auth/logout", { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: "{}", keepalive: true });
  } catch {
    // Offline or backend down: IAM's session simply expires on its own.
  }
}
