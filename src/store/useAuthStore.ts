import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/rbac";
import { clearAllDrafts } from "@/lib/drafts";
import { setCsrfProvider } from "@/lib/api";
import { revokeRefreshToken } from "@/lib/authApi";
import { endIamSession } from "@/lib/iam";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

/** Bearer tokens from POST /api/v1/auth/login, rotated by /auth/refresh (see features/auth/session). */
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Epoch ms after which the access token is rejected. */
  expiresAt: number;
  /** Sent as the X-CSRF-Token header on every call when set. */
  csrfToken?: string;
  /**
   * Where the session comes from. "iam": the IAM / Keycloak sign-in; the token stays in IAM's cookies (the fields above
   * are empty) and the /api/v1 proxy sends and renews it.
   */
  provider?: "iam";
}

/** What GET /da-services/me says about the signed-in user beyond identity and role (see features/auth/me). */
export interface AuthProfile {
  /** e.g. "OAN / ATI Administrator". */
  roleLabel: string;
  /** Sidebar scope line, e.g. "All regions" or "Own record · ET03-W02". */
  scopeLabel: string;
  scope: { regions: string[]; woredas: string[]; zones: string[] };
  unrestricted: boolean;
  /** Routes the backend allows this user to open. */
  menu: string[];
  daId: string | null;
  /** The DA's registry record; null for other roles. */
  agent: Record<string, unknown> | null;
}

interface AuthState {
  user: AuthUser | null;
  isAuthenticated: boolean;
  /** Backend token pair; the refresh token is revoked on logout. Null for locally registered accounts. */
  tokens: AuthTokens | null;
  /** From /me; null until it has been read (and for locally registered accounts). */
  profile: AuthProfile | null;
  /** Active RBAC role, fixed by the account signed in at /login; drives nav visibility and gated actions. */
  role: Role;
  /** False until the persisted session has been read back (see AuthHydration); guards wait on it. */
  hasHydrated: boolean;
  setUser: (user: AuthUser) => void;
  /** Sign-in result: identity and role land together so the dashboard renders for the right role. */
  signIn: (user: AuthUser, role: Role, tokens?: AuthTokens, profile?: AuthProfile) => void;
  /** Updates identity, role and profile from a fresh /me without touching the tokens. */
  setSession: (user: AuthUser, role: Role, profile: AuthProfile) => void;
  /** Swaps in a refreshed token pair without touching identity or role. */
  setTokens: (tokens: AuthTokens) => void;
  logout: () => void;
  /** The session ended without the user asking (token lapsed, refresh refused): signs out and raises the re-login popup. */
  expireSession: () => void;
  /** True from expireSession until the user signs in again. Not persisted. */
  sessionExpired: boolean;
  setHasHydrated: (value: boolean) => void;
}

const DEFAULT_ROLE: Role = "Supervisor";

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      tokens: null,
      profile: null,
      role: DEFAULT_ROLE,
      hasHydrated: false,
      sessionExpired: false,
      setUser: (user) => set({ user, isAuthenticated: true }),
      signIn: (user, role, tokens, profile) => set({ user, role, tokens: tokens ?? null, profile: profile ?? null, isAuthenticated: true }),
      setSession: (user, role, profile) => set({ user, role, profile }),
      setTokens: (tokens) => set({ tokens }),
      logout: () => {
        // Drafts hold farmer and visit personal data; none of it may outlive the session.
        clearAllDrafts();
        // Revoke server-side too, so a copied refresh token is useless once the user has logged out.
        const tokens = get().tokens;
        if (tokens?.provider === "iam") void endIamSession();
        else if (tokens?.refreshToken) void revokeRefreshToken(tokens.refreshToken);
        set({ user: null, isAuthenticated: false, tokens: null, profile: null, role: DEFAULT_ROLE, sessionExpired: false });
      },
      expireSession: () => {
        get().logout();
        set({ sessionExpired: true });
      },
      setHasHydrated: (value) => set({ hasHydrated: value }),
    }),
    {
      // Survives a refresh so a signed-in role does not fall back to the default mid-session.
      name: "oan-auth",
      // Rehydrated after mount (see AuthHydration) so the first client render matches the server HTML.
      skipHydration: true,
      partialize: (s) => ({ user: s.user, isAuthenticated: s.isAuthenticated, role: s.role, tokens: s.tokens, profile: s.profile }),
      // Runs after every rehydrate, including the empty-storage case, so the guard never waits forever.
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

// Every API call sends the session CSRF token as X-CSRF-Token (see lib/api).
setCsrfProvider(() => useAuthStore.getState().tokens?.csrfToken);
