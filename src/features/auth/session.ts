import { ApiError, apiPost, apiRequest, type ApiRequest } from "@/lib/api";
import { readCookie } from "@/lib/cookies";
import { refreshIamTokens } from "@/lib/iam";
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
    const provider = useAuthStore.getState().tokens?.provider;
    // Keycloak session (via IAM): IAM renews it from the access token. A refused renewal ends the session.
    if (provider === "keycloak") {
      const current = useAuthStore.getState().tokens;
      if (!current) return null;
      try {
        const fresh = await refreshIamTokens(current.accessToken);
        useAuthStore.getState().setTokens({ ...current, accessToken: fresh.accessToken, csrfToken: fresh.csrfToken ?? current.csrfToken, expiresAt: fresh.expiresAt });
        return fresh.accessToken;
      } catch (err) {
        if (err instanceof ApiError && [400, 401, 403].includes(err.status)) {
          useAuthStore.getState().expireSession();
          return null;
        }
        throw err;
      }
    }
    const refreshToken = useAuthStore.getState().tokens?.refreshToken;
    if (!refreshToken) return null;
    try {
      const tokens = toTokens(await apiPost<TokenResponse>("/auth/refresh", { refresh_token: refreshToken }), Date.now());
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

// The access token and the CSRF value come from the same IAM callback and are stored as a pair; the CSRF value goes
// out as the X-CSRF-Token header on every call, GET included. The Crop Sown backend may rotate it with a cookie on its
// own responses (first-party here, since those calls go through this app's proxy), so that cookie wins when present.
const csrfTokenNow = () => useAuthStore.getState().tokens?.csrfToken ?? readCookie("X-CSRF-Token") ?? undefined;

/** A 401, or the staff CSRF rejection (403 naming the CSRF token): the stored pair is no good any more. */
const isRejectedPair = (err: unknown) => err instanceof ApiError && (err.status === 401 || (err.status === 403 && /csrf/i.test(err.message)));

/**
 * apiRequest for signed-in calls: attaches the Bearer token and X-CSRF-Token. A rejected Keycloak pair is cleared and
 * the sign-in starts again (AuthGuard sends the signed-out user to /login); other sessions retry once with a refresh.
 */
export async function authRequest<T>(path: string, init: Omit<ApiRequest, "accessToken" | "csrfToken"> = {}): Promise<T> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new ApiError("Your session has ended. Please sign in again.", 401);
  try {
    return await apiRequest<T>(path, { ...init, accessToken, csrfToken: csrfTokenNow() });
  } catch (err) {
    if (!isRejectedPair(err)) throw err;
    console.warn(`[auth] ${path} was rejected (${(err as ApiError).status}): ${(err as ApiError).message}.`);
    if ((err as ApiError).status !== 401) {
      // The CSRF value does not match the session: nothing a refresh would fix for a Keycloak pair.
      if (useAuthStore.getState().tokens?.provider === "keycloak") useAuthStore.getState().expireSession();
      throw err;
    }
    // 401: renew once and retry. A refused renewal has already ended the session (refreshSession).
    const fresh = await refreshSession();
    if (!fresh) throw err;
    return apiRequest<T>(path, { ...init, accessToken: fresh, csrfToken: csrfTokenNow() });
  }
}
