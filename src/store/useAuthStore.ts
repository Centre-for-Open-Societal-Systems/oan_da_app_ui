import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { Role } from "@/lib/rbac";
import { clearAllDrafts } from "@/lib/drafts";
import { setCsrfProvider } from "@/lib/api";
import { revokeRefreshToken } from "@/lib/authApi";
import { endIamSession } from "@/lib/iam";
import { endOidcSession } from "@/lib/oidc";

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
   * are empty) and the /api/v1 proxy sends and renews it. "oidc": direct Keycloak sign-in (lib/oidc) on hosts outside
   * IAM's cookie domain; the fields above hold Keycloak's pair, renewed and ended at Keycloak. Unset: the backend's
   * own /auth/login pair.
   */
  provider?: "iam" | "oidc";
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
  /** The Kebeles a DA is posted to (Effective assignments); a DA broadcasts to these. Absent for other roles. */
  kebeles?: { code: string; name: string }[];
  /** The user's post in the DA Hierarchy, e.g. "agent". */
  designation?: string | null;
  /** Where the user's DA Hierarchy node sits; a level the node does not set is null. */
  location?: ProfileLocation;
}

/** One administrative area as /me names it: its code and its display name. */
export interface AreaRef {
  id: string;
  name: string;
}

export interface ProfileLocation {
  country: AreaRef | null;
  region: AreaRef | null;
  zone: AreaRef | null;
  woreda: AreaRef | null;
  kebele: AreaRef | null;
}

/** No Region, Zone or Woreda: what a profile holds when /me sends no scope. */
export const EMPTY_SCOPE: AuthProfile["scope"] = { regions: [], woredas: [], zones: [] };

/** A stored or received profile with the lists the screens read always present (older sessions and newer backends may omit them). */
export function completeProfile(profile: AuthProfile | null | undefined): AuthProfile | null {
  if (!profile) return null;
  const scope = profile.scope ?? EMPTY_SCOPE;
  return {
    ...profile,
    scope: { regions: scope.regions ?? [], woredas: scope.woredas ?? [], zones: scope.zones ?? [] },
    unrestricted: profile.unrestricted ?? false,
    menu: profile.menu ?? [],
    daId: profile.daId ?? null,
    agent: profile.agent ?? null,
  };
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
      // A new sign-in ends the "Session expired" state, or the dashboard would show the dialog again.
      signIn: (user, role, tokens, profile) => set({ user, role, tokens: tokens ?? null, profile: completeProfile(profile), isAuthenticated: true, sessionExpired: false }),
      setSession: (user, role, profile) => set({ user, role, profile: completeProfile(profile) }),
      setTokens: (tokens) => set({ tokens }),
      logout: () => {
        // Drafts hold farmer and visit personal data; none of it may outlive the session.
        clearAllDrafts();
        // Revoke server-side too, so a copied refresh token is useless once the user has logged out.
        const tokens = get().tokens;
        if (tokens?.provider === "iam") void endIamSession();
        else if (tokens?.provider === "oidc") {
          if (tokens.refreshToken) void endOidcSession(tokens.refreshToken);
        }
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
      // A session stored before a backend change may lack a list a screen reads; fill it in on the way back.
      merge: (persisted, current) => {
        const stored = (persisted ?? {}) as Partial<AuthState>;
        return { ...current, ...stored, profile: completeProfile(stored.profile) };
      },
      // Runs after every rehydrate, including the empty-storage case, so the guard never waits forever.
      onRehydrateStorage: () => (state) => state?.setHasHydrated(true),
    },
  ),
);

// Every API call sends the session CSRF token as X-CSRF-Token (see lib/api).
setCsrfProvider(() => useAuthStore.getState().tokens?.csrfToken);

/**
 * The signed-in user's own Woreda, Kebele and DA-ID, for the calls that must name them: the backend no longer
 * reads them from the token. The Kebele is a DA's only (other roles work across their Woreda).
 */
export function ownArea(): { woreda?: string; kebele?: string; daId?: string } {
  const { profile, role } = useAuthStore.getState();
  const woredas = profile?.scope?.woredas ?? [];
  return {
    woreda: profile?.location?.woreda?.id ?? (woredas.length === 1 ? woredas[0] : undefined),
    kebele: role === "DA" ? (profile?.location?.kebele?.id ?? undefined) : undefined,
    daId: profile?.daId ?? undefined,
  };
}
