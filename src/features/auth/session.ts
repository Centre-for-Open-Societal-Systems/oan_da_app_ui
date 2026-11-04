import { ApiError, apiPost, apiRequest, type ApiRequest } from "@/lib/api";
import { readCookie } from "@/lib/cookies";
import { refreshOidcTokens, type OidcTokenResponse } from "@/lib/oidc";
import { useAuthStore, type AuthTokens } from "@/store/useAuthStore";

/** Successful POST /api/v1/auth/refresh; /auth/login answers in the same shape. */
export interface TokenResponse {
  data: {
    access_token: string;
    /** Seconds the access token stays valid. */
    expires_in: number;
    refresh_token: string;
    token_type: string;
    roles: string[];
    /** Backend user id, e.g. "Administrator" or the user's email. */
    user: string;
  };
}

export const toTokens = ({ data }: TokenResponse, now: number): AuthTokens => ({
  accessToken: data.access_token,
  refreshToken: data.refresh_token,
  expiresAt: now + data.expires_in * 1000,
});

/** Keycloak's token response (direct OIDC sign-in) as the stored session. */
export const toOidcTokens = (res: OidcTokenResponse, now: number): AuthTokens => ({
  accessToken: res.access_token,
  refreshToken: res.refresh_token,
  expiresAt: now + res.expires_in * 1000,
  provider: "oidc",
});

// Refresh this long before the access token's expiry, so a request never leaves with a token about to lapse.
const EXPIRY_SKEW_MS = 30_000;

// Refresh tokens are single-use: the backend rotates them and rejects a reused one with 401. Concurrent
// callers therefore share one in-flight refresh instead of each spending the same token.
let inflight: Promise<string | null> | null = null;

/**
 * POST /api/v1/auth/refresh and store the new token pair. Resolves to the new access token, or null when
 * the session is over (no refresh token, or the backend rejected it) — the user is then signed out.
 * Network and server errors are rethrown and keep the session, so a flaky connection does not log anyone out.
 */
export function refreshSession(): Promise<string | null> {
  inflight ??= (async () => {
    // An IAM session lives in IAM's cookies; the /api/v1 proxy renews it on the way, so there is nothing to do here.
    if (useAuthStore.getState().tokens?.provider === "iam") return null;
    const current = useAuthStore.getState().tokens;
    const refreshToken = current?.refreshToken;
    if (!refreshToken) {
      // A session without a refresh token (sso/login) cannot be renewed: once its token lapses, the user signs in again.
      if (current) useAuthStore.getState().expireSession();
      return null;
    }
    try {
      // A direct Keycloak session renews at Keycloak's token endpoint (a 400 there means the refresh token is spent).
      const tokens = current?.provider === "oidc" ? toOidcTokens(await refreshOidcTokens(refreshToken), Date.now()) : toTokens(await apiPost<TokenResponse>("/auth/refresh", { refresh_token: refreshToken }), Date.now());
      useAuthStore.getState().setTokens(tokens);
      return tokens.accessToken;
    } catch (err) {
      if (err instanceof ApiError && (err.status === 400 || err.status === 401)) {
        // Already spent or revoked: clear the pair first so logout does not try to revoke it again.
        useAuthStore.setState({ tokens: null });
        useAuthStore.getState().expireSession();
        return null;
      }
      throw err;
    }
  })().finally(() => {
    inflight = null;
  });
  return inflight;
}

/** A usable access token, refreshing first when the stored one has expired or is about to. */
export async function getAccessToken(): Promise<string | null> {
  const tokens = useAuthStore.getState().tokens;
  if (!tokens) return null;
  if (tokens.expiresAt - EXPIRY_SKEW_MS > Date.now()) return tokens.accessToken;
  return refreshSession();
}

// X-CSRF-Token goes out on every call when the page can read one (the session's own, else the cookie of that name); for
// an IAM session the /api/v1 proxy adds IAM's CSRF cookie itself when the page sends none.
const csrfTokenNow = () => useAuthStore.getState().tokens?.csrfToken ?? readCookie("X-CSRF-Token") ?? undefined;

/** A 401, or the staff CSRF rejection (403 naming the CSRF token): the stored pair is no good any more. */
const isRejectedPair = (err: unknown) => err instanceof ApiError && (err.status === 401 || (err.status === 403 && /csrf/i.test(err.message)));

/**
 * apiRequest for signed-in calls: attaches the Bearer token and X-CSRF-Token. A rejected Keycloak pair is cleared and
 * the sign-in starts again (AuthGuard sends the signed-out user to /login); other sessions retry once with a refresh.
 */
export async function authRequest<T>(path: string, init: Omit<ApiRequest, "accessToken" | "csrfToken"> = {}): Promise<T> {
  // IAM session: the browser's IAM cookies are the credentials (the /api/v1 proxy sends them as Bearer + CSRF and
  // renews an expired token). A 401 that survives that renewal means the IAM session is over.
  if (useAuthStore.getState().tokens?.provider === "iam") {
    try {
      return await apiRequest<T>(path, { ...init, csrfToken: csrfTokenNow() });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) useAuthStore.getState().expireSession();
      throw err;
    }
  }
  const accessToken = await getAccessToken();
  if (!accessToken) throw new ApiError("Your session has ended. Please sign in again.", 401);
  try {
    return await apiRequest<T>(path, { ...init, accessToken, csrfToken: csrfTokenNow() });
  } catch (err) {
    if (!isRejectedPair(err)) throw err;
    console.warn(`[auth] ${path} was rejected (${(err as ApiError).status}): ${(err as ApiError).message}.`);
    if ((err as ApiError).status !== 401) {
      throw err;
    }
    // 401: renew once and retry. A refused renewal has already ended the session (refreshSession).
    const fresh = await refreshSession();
    if (!fresh) throw err;
    return apiRequest<T>(path, { ...init, accessToken: fresh, csrfToken: csrfTokenNow() });
  }
}
