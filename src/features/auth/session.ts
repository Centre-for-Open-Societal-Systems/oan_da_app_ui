import { ApiError, apiPost, apiRequest, type ApiRequest } from "@/lib/api";
import { decodeJwtExpiry, readIamSession } from "@/lib/iam";
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
  kind: "local",
  accessToken: data.access_token,
  refreshToken: data.refresh_token,
  expiresAt: now + data.expires_in * 1000,
});

// Refresh this long before the access token's expiry, so a request never leaves with a token about to lapse.
const EXPIRY_SKEW_MS = 30_000;
// IAM access tokens live 5 minutes on dev; used when a refreshed token carries no exp claim.
const IAM_TOKEN_TTL_MS = 5 * 60_000;

// Refresh tokens are single-use: the backend rotates them and rejects a reused one with 401. Concurrent
// callers therefore share one in-flight refresh instead of each spending the same token.
let inflight: Promise<string | null> | null = null;

/** The session is over: drop the pair first so logout does not try to end it server-side a second time. */
function endSession(): null {
  useAuthStore.setState({ tokens: null });
  useAuthStore.getState().logout();
  return null;
}

async function refreshLocalSession(refreshToken: string): Promise<string | null> {
  try {
    const res = await apiPost<TokenResponse>("/auth/refresh", { refresh_token: refreshToken });
    const tokens = toTokens(res, Date.now());
    useAuthStore.getState().setTokens(tokens);
    return tokens.accessToken;
  } catch (err) {
    // Already spent or revoked.
    if (err instanceof ApiError && (err.status === 400 || err.status === 401)) return endSession();
    throw err;
  }
}

/**
 * A staff IAM session has no refresh token: POST /auth/refresh with the access token makes the backend refresh
 * from the IAM cookies the browser sends along (shared parent domain) and relay the new cookies. The page cannot
 * read those, so the UI server (/api/auth/iam/session) reads the rotated token back.
 */
async function refreshIamSession(tokens: AuthTokens): Promise<string | null> {
  try {
    await apiPost<{ data: { refreshed: boolean } }>("/auth/refresh", { access_token: tokens.accessToken });
  } catch (err) {
    if (err instanceof ApiError && (err.status === 400 || err.status === 401)) return endSession();
    throw err;
  }
  const fresh = await readIamSession();
  if (!fresh) return endSession();
  const next: AuthTokens = {
    ...tokens,
    accessToken: fresh.accessToken,
    csrfToken: fresh.csrfToken ?? tokens.csrfToken,
    expiresAt: decodeJwtExpiry(fresh.accessToken) ?? Date.now() + IAM_TOKEN_TTL_MS,
  };
  useAuthStore.getState().setTokens(next);
  return next.accessToken;
}

/**
 * Refresh the stored session and resolve to the new access token, or null when the session is over (nothing to
 * refresh with, or the backend rejected it): the user is then signed out. Network and server errors are
 * rethrown and keep the session, so a flaky connection does not log anyone out.
 */
export function refreshSession(): Promise<string | null> {
  inflight ??= (async () => {
    const tokens = useAuthStore.getState().tokens;
    if (!tokens) return null;
    if (tokens.kind === "iam") return refreshIamSession(tokens);
    if (!tokens.refreshToken) return null;
    return refreshLocalSession(tokens.refreshToken);
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

/** The IAM's CSRF value of the stored session, sent as X-CSRF-Token; local sessions have none. */
const csrfToken = () => useAuthStore.getState().tokens?.csrfToken;

/** apiRequest for signed-in calls: attaches the Bearer token (and CSRF value) and retries once after a 401 with a fresh one. */
export async function authRequest<T>(path: string, init: Omit<ApiRequest, "accessToken" | "csrfToken"> = {}): Promise<T> {
  const accessToken = await getAccessToken();
  if (!accessToken) throw new ApiError("Your session has ended. Please sign in again.", 401);
  try {
    return await apiRequest<T>(path, { ...init, accessToken, csrfToken: csrfToken() });
  } catch (err) {
    if (!(err instanceof ApiError) || err.status !== 401) throw err;
    const fresh = await refreshSession();
    if (!fresh) throw err;
    return apiRequest<T>(path, { ...init, accessToken: fresh, csrfToken: csrfToken() });
  }
}
