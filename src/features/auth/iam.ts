import { ApiError, apiRequest } from "@/lib/api";
import { decodeJwtExpiry, type IamSessionTokens } from "@/lib/iam";
import type { AuthTokens } from "@/store/useAuthStore";
import { NO_ASSIGNMENT_MESSAGE } from "./login";
import { fetchMe, toMeSession, type MeSession } from "./me";

/** One sign-in option the backend offers (GET /api/v1/auth/iam/providers). */
export interface IamProvider {
  key: string;
  label: string;
  icon_url: string;
}

/** GET /api/v1/auth/iam/providers (guest): every sign-in option the backend offers, `local` included. */
export async function fetchIamProviders(): Promise<IamProvider[]> {
  const res = await apiRequest<{ data: { providers: IamProvider[] } }>("/auth/iam/providers");
  return res.data.providers ?? [];
}

// IAM access tokens live 5 minutes on dev; used only when the token carries no exp claim.
const IAM_TOKEN_TTL_MS = 5 * 60_000;

/** The session's token record for a staff IAM sign-in; expiry comes from the JWT itself. */
export function toIamTokens(t: IamSessionTokens, now = Date.now()): AuthTokens {
  return {
    kind: "iam",
    accessToken: t.accessToken,
    csrfToken: t.csrfToken,
    loginOption: t.loginOption,
    expiresAt: decodeJwtExpiry(t.accessToken) ?? now + IAM_TOKEN_TTL_MS,
  };
}

export type IamLoginResult = MeSession & { tokens: AuthTokens };

/**
 * The IAM token is in hand (read from the cookies by the UI server): GET /da-services/me with it for the name,
 * role and scope the portal shows. A user the backend knows no portal role for comes back as ApiError 403; a
 * token the backend refuses as 401.
 */
export async function completeIamLogin(t: IamSessionTokens): Promise<IamLoginResult> {
  const tokens = toIamTokens(t);
  const auth = { accessToken: tokens.accessToken, csrfToken: tokens.csrfToken };
  // First the auth app's own /auth/me (IAM_LOGIN_DISCOVERY_FLOW phase 5): it validates the token and, at a first
  // sign-in, creates the DA Services account and syncs its roles without DA Services' assignment check. Without
  // this, a user who has no assignment yet is rejected by /da-services/me and the account rolls back with the
  // rejection, so an Admin can never assign them anything.
  await apiRequest<unknown>("/auth/me", auth);
  let me;
  try {
    me = await fetchMe(auth.accessToken, auth.csrfToken);
  } catch (err) {
    // The token is good (the auth app just accepted it); DA Services refuses only for a missing assignment.
    if (err instanceof ApiError && (err.status === 401 || err.status === 403)) throw new ApiError(NO_ASSIGNMENT_MESSAGE, 403);
    throw err;
  }
  const session = toMeSession(me);
  if (!session) throw new ApiError(NO_ASSIGNMENT_MESSAGE, 403);
  return { ...session, tokens };
}

/** What the sign-in landing page tells the user when completing the IAM sign-in fails. */
export function iamLoginErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return "Something went wrong while completing the sign-in. Please try again.";
  // A 401 right after Keycloak is usually the backend's own rule (no active role assignment yet), which its
  // message names; only a bare 401 means the token itself was refused.
  if (err.status === 401) return /^Request failed/.test(err.message) ? "The staff sign-in token was not accepted. Please sign in again." : `${err.message.replace(/[.!]*$/, ".")} Ask your administrator to assign your role, then sign in again.`;
  if (err.status === 0 || err.status >= 500) return "Could not reach the server. Please try again in a moment.";
  return err.message;
}
