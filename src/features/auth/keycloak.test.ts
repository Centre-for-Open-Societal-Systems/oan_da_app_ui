import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { getAccessToken } from "./session";
import { completeKeycloakLogin, roleFromClaims, tokenClaims } from "./keycloak";

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

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.setState({ user: null, isAuthenticated: false, tokens: null, profile: null, role: "Supervisor" });
});

describe("token claims", () => {
  it("reads the claims of a JWT and maps its client roles onto a portal role", () => {
    expect(tokenClaims(TOKEN)?.email).toBe("da-agent@services.com");
    expect(roleFromClaims(tokenClaims(TOKEN))).toBe("DA");
    expect(roleFromClaims({ resource_access: { "da-client": { roles: ["DA_Supervisor"] } } })).toBe("Supervisor");
    expect(roleFromClaims({ resource_access: { "da-client": { roles: ["DA_Development_Agent", "DA_Admin"] } } })).toBe("Admin");
    expect(roleFromClaims(null)).toBe("DA");
    expect(tokenClaims("not-a-jwt")).toBeNull();
  });
});

describe("completeKeycloakLogin", () => {
  const session = { data: { access_token: TOKEN, expires_at: Date.now() + 600_000 } };

  it("takes the role, scope and menu from /da-services/me when the API accepts the token", async () => {
    fetchMock
      .mockResolvedValueOnce(json(session))
      .mockResolvedValueOnce(json({ data: { user: { id: "u1", name: "Da Agent", email: "da@x.com" }, role: "DA", role_codes: ["DA"], role_label: "Development Agent", roles: [], scope: { regions: [], woredas: [], zones: [] }, scope_label: "Own", unrestricted: false, menu: [], da_id: "DA-1" } }));

    sessionStorage.setItem("oan-iam-login-state", "s1");
    const result = await completeKeycloakLogin(new URLSearchParams({ state: "s1" }));
    expect(result.role).toBe("DA");
    expect(result.profile?.daId).toBe("DA-1");
    expect(result.tokens).toMatchObject({ accessToken: TOKEN, refreshToken: "", provider: "keycloak" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/iam/session");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/da-services/me");
  });

  it("falls back to IAM's /auth/me and the token roles when the API refuses the token", async () => {
    fetchMock
      .mockResolvedValueOnce(json(session))
      .mockResolvedValueOnce(json({ message: "Authentication failed" }, 401))
      .mockResolvedValueOnce(json({ data: { user: "iam-user", first_name: "DA", last_name: "Agent", login_email: "da-agent@services.com", login_option: "agent", roles: [] } }));

    sessionStorage.setItem("oan-iam-login-state", "s1");
    const result = await completeKeycloakLogin(new URLSearchParams({ state: "s1" }));
    expect(result).toMatchObject({ user: { id: "iam-user", name: "DA Agent", email: "da-agent@services.com" }, role: "DA" });
    expect(fetchMock.mock.calls[2][0]).toBe("/iam-api/v1/auth/me");
  });

  it("fails with a 401 when the browser has no IAM cookie", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: "error", code: "NO_SESSION", message: "No IAM session cookie was received by this browser." }, 401));
    sessionStorage.setItem("oan-iam-login-state", "s1");
    await expect(completeKeycloakLogin()).rejects.toMatchObject({ status: 401 });
  });
});

describe("an expired Keycloak token", () => {
  const expired = () => useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "DA", { accessToken: TOKEN, refreshToken: "", expiresAt: Date.now() - 1000, provider: "keycloak", csrfToken: "old-csrf" });

  it("is renewed through IAM's /auth/refresh with the access token, keeping the session", async () => {
    expired();
    fetchMock.mockResolvedValueOnce(json({ data: { access_token: "h.e30.s", csrf_token: "new-csrf", expires_in: 300 } }));

    await expect(getAccessToken()).resolves.toBe("h.e30.s");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/iam-api/v1/auth/refresh");
    expect(JSON.parse(String(init?.body))).toEqual({ access_token: TOKEN });
    expect((init?.headers as Record<string, string>).Authorization).toBeUndefined();
    const { tokens, isAuthenticated } = useAuthStore.getState();
    expect(isAuthenticated).toBe(true);
    expect(tokens).toMatchObject({ accessToken: "h.e30.s", csrfToken: "new-csrf", provider: "keycloak" });
    expect(tokens!.expiresAt).toBeGreaterThan(Date.now() + 200_000);
  });

  it("ends the session when IAM refuses the renewal", async () => {
    expired();
    fetchMock.mockResolvedValueOnce(json({ code: "AUTHENTICATION_ERROR", message: "Invalid token" }, 401));

    await expect(getAccessToken()).resolves.toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().sessionExpired).toBe(true);
  });

  it("keeps the session on a network error", async () => {
    expired();
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));

    await expect(getAccessToken()).rejects.toMatchObject({ status: 0 });
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });
});

describe("login state", () => {
  it("refuses a callback whose state differs, or one this tab never started", async () => {
    sessionStorage.setItem("oan-iam-login-state", "s1");
    await expect(completeKeycloakLogin(new URLSearchParams({ state: "forged" }))).rejects.toMatchObject({ status: 400 });
    await expect(completeKeycloakLogin()).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
