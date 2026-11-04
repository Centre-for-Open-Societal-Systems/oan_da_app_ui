import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { authRequest } from "./session";
import { IAM_SESSION, OidcLoginError, beginKeycloakLogin, completeKeycloakLogin, roleFromClaims, roleFromNames, tokenClaims } from "./keycloak";

// Minimal in-memory Storage so the persisted auth store runs under Node.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.get(k) ?? null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
}

const b64 = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
const claims = { name: "DA Agent", email: "da-agent@services.com", resource_access: { "da-client": { roles: ["DA_Development_Agent"] } } };
const TOKEN = `h.${b64(claims)}.s`;

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn<typeof fetch>();
const ME = { data: { user: { id: "u1", name: "Da Agent", email: "da@x.com" }, role: "DA", role_codes: ["DA"], role_label: "Development Agent", roles: [], scope: { regions: [], woredas: [], zones: [] }, scope_label: "Own", unrestricted: false, menu: [], da_id: "DA-1" } };

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.setState({ user: null, isAuthenticated: false, tokens: null, profile: null, role: "Supervisor", sessionExpired: false });
});

const headersOf = (call: number) => (fetchMock.mock.calls[call][1]?.headers ?? {}) as Record<string, string>;

describe("roles", () => {
  it("maps token or IAM role names onto a portal role", () => {
    expect(tokenClaims(TOKEN)?.email).toBe("da-agent@services.com");
    expect(roleFromClaims(tokenClaims(TOKEN))).toBe("DA");
    expect(roleFromClaims({ resource_access: { "da-client": { roles: ["DA_Supervisor"] } } })).toBe("Supervisor");
    expect(roleFromNames(["Development Agent", "OAN Administrator"])).toBe("Admin");
    expect(roleFromNames([])).toBe("DA");
    expect(tokenClaims("not-a-jwt")).toBeNull();
  });
});

describe("completeKeycloakLogin", () => {
  it("asks /da-services/me with the IAM cookies (no token in the page) and keeps only the IAM marker", async () => {
    fetchMock.mockResolvedValueOnce(json(ME));
    sessionStorage.setItem("oan-iam-login-state", "s1");

    const result = await completeKeycloakLogin(new URLSearchParams({ state: "s1" }));
    expect(result.role).toBe("DA");
    expect(result.profile?.daId).toBe("DA-1");
    expect(result.tokens).toEqual(IAM_SESSION);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/me");
    expect(headersOf(0).Authorization).toBeUndefined();
  });

  it("falls back to IAM's /auth/me when the API does not place the user", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ message: "User holds no DA Services role" }, 403))
      .mockResolvedValueOnce(json({ data: { user: "iam-user", first_name: "DA", last_name: "Agent", login_email: "da-agent@services.com", login_option: "agent", roles: ["Development Agent"] } }));
    sessionStorage.setItem("oan-iam-login-state", "s1");

    const result = await completeKeycloakLogin(new URLSearchParams({ state: "s1" }));
    expect(result).toMatchObject({ user: { id: "iam-user", name: "DA Agent", email: "da-agent@services.com" }, role: "DA", tokens: IAM_SESSION });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/auth/me");
  });

  it("fails with a 401 when no IAM cookie reached the portal", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "Authentication failed" }, 401));
    sessionStorage.setItem("oan-iam-login-state", "s1");
    await expect(completeKeycloakLogin()).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses a callback whose state differs, or one this tab never started", async () => {
    sessionStorage.setItem("oan-iam-login-state", "s1");
    await expect(completeKeycloakLogin(new URLSearchParams({ state: "forged" }))).rejects.toMatchObject({ status: 400 });
    await expect(completeKeycloakLogin()).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("an IAM session", () => {
  const signedIn = () => useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "DA", IAM_SESSION);

  it("calls the API without a token of its own: the proxy sends IAM's cookies as the Bearer", async () => {
    signedIn();
    fetchMock.mockResolvedValueOnce(json({ ok: true }));
    await expect(authRequest("/da-services/farmers")).resolves.toEqual({ ok: true });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/farmers");
    expect(headersOf(0).Authorization).toBeUndefined();
  });

  it("ends when the API still answers 401 (the proxy could not renew it)", async () => {
    signedIn();
    fetchMock.mockResolvedValueOnce(json({ message: "Authentication failed" }, 401));
    await expect(authRequest("/da-services/farmers")).rejects.toMatchObject({ status: 401 });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().sessionExpired).toBe(true);
  });

  it("keeps the session on other errors", async () => {
    signedIn();
    fetchMock.mockResolvedValueOnce(json({ message: "Registry unavailable" }, 503));
    await expect(authRequest("/da-services/farmers")).rejects.toMatchObject({ status: 503 });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

describe("direct Keycloak (OIDC) on hosts outside IAM's cookie domain", () => {
  const ORIGIN = "https://da-registry-development.oanstaging.com";
  const location = { hostname: "da-registry-development.oanstaging.com", origin: ORIGIN, assign: vi.fn() };
  const KC = "https://keycloak.development.oanstaging.com/realms/staff/protocol/openid-connect";

  beforeEach(() => {
    location.assign.mockReset();
    vi.stubGlobal("window", { location });
  });

  /** Runs beginKeycloakLogin and returns the authorize URL it opened. */
  const begin = async () => {
    await beginKeycloakLogin();
    return new URL(location.assign.mock.calls[0][0] as string);
  };

  it("sends the deployed host straight to Keycloak with client da_registry and its own callback (no IAM call)", async () => {
    const url = await begin();
    expect(fetchMock).not.toHaveBeenCalled();
    expect(url.origin + url.pathname).toBe(`${KC}/auth`);
    expect(url.searchParams.get("client_id")).toBe("da_registry");
    expect(url.searchParams.get("redirect_uri")).toBe(`${ORIGIN}/auth/callback`);
    expect(url.searchParams.get("code_challenge_method")).toBe("S256");
  });

  it("keeps IAM's flow on a host under .development.oanstaging.com", async () => {
    location.hostname = "da-portal.development.oanstaging.com";
    fetchMock.mockResolvedValueOnce(json({ data: { redirect_url: `${KC}/auth?response_type=code&state=s1&client_id=staff-portal` } }));
    try {
      const url = await begin();
      expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/iam/login");
      expect(url.searchParams.get("client_id")).toBe("staff-portal");
    } finally {
      location.hostname = "da-registry-development.oanstaging.com";
    }
  });

  it("exchanges the code, reads /me with the Bearer token and stores the pair as provider oidc", async () => {
    const state = (await begin()).searchParams.get("state")!;
    fetchMock.mockResolvedValueOnce(json({ access_token: TOKEN, refresh_token: "kc-refresh", expires_in: 300 })).mockResolvedValueOnce(json(ME));

    const result = await completeKeycloakLogin(new URLSearchParams({ code: "c1", state }));
    expect(fetchMock.mock.calls[0][0]).toBe(`${KC}/token`);
    expect(Object.fromEntries(new URLSearchParams(String(fetchMock.mock.calls[0][1]?.body)))).toMatchObject({ grant_type: "authorization_code", client_id: "da_registry", code: "c1", redirect_uri: `${ORIGIN}/auth/callback` });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/da-services/me");
    expect(headersOf(1).Authorization).toBe(`Bearer ${TOKEN}`);
    expect(result).toMatchObject({ role: "DA", tokens: { accessToken: TOKEN, refreshToken: "kc-refresh", provider: "oidc" } });
  });

  it("reports an API refusal as an OIDC error (not the IAM-cookie one) and ends the Keycloak session", async () => {
    const state = (await begin()).searchParams.get("state")!;
    fetchMock
      .mockResolvedValueOnce(json({ access_token: TOKEN, refresh_token: "kc-refresh", expires_in: 300 }))
      .mockResolvedValueOnce(json({ message: "Authentication failed" }, 401))
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const err = await completeKeycloakLogin(new URLSearchParams({ code: "c1", state })).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(OidcLoginError);
    expect((err as OidcLoginError).message).toMatch(/did not accept the token/);
    expect(fetchMock.mock.calls[2][0]).toBe(`${KC}/logout`);
  });

  it("reports a failed code exchange as an OIDC error", async () => {
    const state = (await begin()).searchParams.get("state")!;
    fetchMock.mockResolvedValueOnce(json({ error: "invalid_grant", error_description: "Code not valid" }, 400));
    await expect(completeKeycloakLogin(new URLSearchParams({ code: "c1", state }))).rejects.toBeInstanceOf(OidcLoginError);
  });

  it("sends the Bearer token, renews at Keycloak after a 401 and ends the Keycloak session on logout", async () => {
    useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "DA", { accessToken: "old", refreshToken: "kc-r0", expiresAt: Date.now() + 600_000, provider: "oidc" });
    fetchMock
      .mockResolvedValueOnce(json({ message: "expired" }, 401))
      .mockResolvedValueOnce(json({ access_token: "new", refresh_token: "kc-r1", expires_in: 300 }))
      .mockResolvedValueOnce(json({ ok: true }));

    await expect(authRequest("/da-services/me")).resolves.toEqual({ ok: true });
    expect(headersOf(0).Authorization).toBe("Bearer old");
    expect(fetchMock.mock.calls[1][0]).toBe(`${KC}/token`);
    expect(Object.fromEntries(new URLSearchParams(String(fetchMock.mock.calls[1][1]?.body)))).toMatchObject({ grant_type: "refresh_token", refresh_token: "kc-r0", client_id: "da_registry" });
    expect(headersOf(2).Authorization).toBe("Bearer new");
    expect(useAuthStore.getState().tokens).toMatchObject({ accessToken: "new", refreshToken: "kc-r1", provider: "oidc" });

    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }));
    useAuthStore.getState().logout();
    expect(fetchMock.mock.calls[3][0]).toBe(`${KC}/logout`);
    expect(String(fetchMock.mock.calls[3][1]?.body)).toContain("refresh_token=kc-r1");
  });
});
