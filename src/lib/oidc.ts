// Direct Keycloak sign-in: the OpenID Connect authorization-code flow with PKCE, run by the browser against a public
// Keycloak client. No cookie or server is involved, so it works the same on localhost and on the deployed host.
//   Keycloak client: public (Client authentication Off), Standard flow On, PKCE S256, with this app's
//   /auth/callback as a valid redirect URI and this app's origin as a web origin (the token calls are cross-origin).
import { ApiError } from "@/lib/api";

/** Client id of the public Keycloak client. Leave unset to sign in through IAM instead. */
export const OIDC_CLIENT_ID = process.env.NEXT_PUBLIC_KEYCLOAK_CLIENT_ID ?? "da_registry";
const ISSUER = (process.env.NEXT_PUBLIC_KEYCLOAK_URL ?? "https://keycloak.development.oanstaging.com/realms/staff").replace(/\/$/, "");
const ENDPOINT = `${ISSUER}/protocol/openid-connect`;

export const isOidcConfigured = () => OIDC_CLIENT_ID !== "";
export const oidcRedirectUri = (origin: string) => `${origin}/auth/callback`;

const PENDING_KEY = "oan-oidc-pending";

/** What the browser keeps between leaving for Keycloak and coming back. */
interface Pending {
  state: string;
  verifier: string;
}

const base64Url = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const randomString = (bytes = 32) => base64Url(crypto.getRandomValues(new Uint8Array(bytes)));
const challengeOf = async (verifier: string) => base64Url(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(verifier))));

/** The Keycloak login URL for this browser; remembers the PKCE verifier and state for the way back. */
export async function buildOidcLoginUrl(origin: string, { forceLogin = true }: { forceLogin?: boolean } = {}): Promise<string> {
  if (!crypto.subtle) throw new ApiError("This page must be opened over https (or on localhost) to sign in with Keycloak.", 0);
  const pending: Pending = { state: randomString(), verifier: randomString(64) };
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(pending));

  const params = new URLSearchParams({
    client_id: OIDC_CLIENT_ID,
    response_type: "code",
    scope: "openid profile email",
    redirect_uri: oidcRedirectUri(origin),
    state: pending.state,
    code_challenge: await challengeOf(pending.verifier),
    code_challenge_method: "S256",
  });
  // Keycloak keeps its own browser session; `prompt=login` makes it ask for the credentials every time.
  if (forceLogin) params.set("prompt", "login");
  return `${ENDPOINT}/auth?${params}`;
}

/** The token response of Keycloak's token endpoint. */
export interface OidcTokenResponse {
  access_token: string;
  refresh_token: string;
  /** Seconds the access token stays valid. */
  expires_in: number;
}

async function tokenRequest(body: Record<string, string>): Promise<OidcTokenResponse> {
  let res: Response;
  try {
    res = await fetch(`${ENDPOINT}/token`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded", Accept: "application/json" }, body: new URLSearchParams({ client_id: OIDC_CLIENT_ID, ...body }) });
  } catch {
    throw new ApiError("Could not reach Keycloak. Check that this address is a web origin of the Keycloak client.", 0);
  }
  const data = (await res.json().catch(() => null)) as (Partial<OidcTokenResponse> & { error?: string; error_description?: string }) | null;
  if (!res.ok || !data?.access_token) throw new ApiError(data?.error_description ?? data?.error ?? `Keycloak refused the request (${res.status}).`, res.status || 400);
  return data as OidcTokenResponse;
}

/** Whether the URL the browser came back on carries a Keycloak authorization result. */
export const hasOidcResult = (search: URLSearchParams) => search.has("code") && search.has("state");

/** Trades the code in the callback URL for tokens, after checking the state against the one sent out. */
export async function exchangeOidcCode(search: URLSearchParams, origin: string): Promise<OidcTokenResponse> {
  const raw = sessionStorage.getItem(PENDING_KEY);
  sessionStorage.removeItem(PENDING_KEY);
  const pending = raw ? (JSON.parse(raw) as Pending) : null;
  if (!pending || pending.state !== search.get("state")) throw new ApiError("This sign-in was not started in this browser tab. Please try again.", 400);
  return tokenRequest({ grant_type: "authorization_code", code: search.get("code") ?? "", redirect_uri: oidcRedirectUri(origin), code_verifier: pending.verifier });
}

/** Swaps a refresh token for a new token pair. A 400 means the refresh token is spent or the Keycloak session ended. */
export const refreshOidcTokens = (refreshToken: string) => tokenRequest({ grant_type: "refresh_token", refresh_token: refreshToken });

/** Ends the Keycloak session behind a refresh token. Best effort: the local session is cleared regardless. */
export async function endOidcSession(refreshToken: string): Promise<void> {
  try {
    await fetch(`${ENDPOINT}/logout`, { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: new URLSearchParams({ client_id: OIDC_CLIENT_ID, refresh_token: refreshToken }), keepalive: true });
  } catch {
    // Offline or Keycloak down: the session simply expires on its own.
  }
}
