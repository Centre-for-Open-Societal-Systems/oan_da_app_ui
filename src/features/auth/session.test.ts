import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { authRequest, getAccessToken, refreshSession } from "./session";

// Minimal in-memory Storage so the persisted store and logout's draft cleanup run under Node.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.get(k) ?? null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
}

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const refreshed = (n: number) =>
  json(200, { data: { access_token: `access-${n}`, expires_in: 900, refresh_token: `refresh-${n}`, token_type: "Bearer", roles: [], user: "u" } });

const fetchMock = vi.fn<typeof fetch>();

function signInWith(expiresAt: number) {
  useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "Admin", { accessToken: "access-0", refreshToken: "refresh-0", expiresAt });
}

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("refreshSession", () => {
  it("stores the rotated pair and spends the refresh token only once for concurrent callers", async () => {
    signInWith(0);
    fetchMock.mockResolvedValueOnce(refreshed(1));

    const results = await Promise.all([refreshSession(), refreshSession(), getAccessToken()]);

    expect(results).toEqual(["access-1", "access-1", "access-1"]);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/auth/refresh");
    expect(JSON.parse(init!.body as string)).toEqual({ refresh_token: "refresh-0" });
    expect(useAuthStore.getState().tokens?.refreshToken).toBe("refresh-1");
  });

  it("signs out without a logout call when the backend rejects the refresh token", async () => {
    signInWith(0);
    fetchMock.mockResolvedValueOnce(json(401, { message: "Invalid refresh token" }));

    await expect(refreshSession()).resolves.toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("keeps the session on a network error", async () => {
    signInWith(0);
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));

    await expect(refreshSession()).rejects.toMatchObject({ status: 0 });
    expect(useAuthStore.getState().tokens?.refreshToken).toBe("refresh-0");
  });
});

describe("authRequest", () => {
  it("uses the stored token while it is fresh", async () => {
    signInWith(Date.now() + 600_000);
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));

    await authRequest("/things");

    expect(new Headers(fetchMock.mock.calls[0][1]!.headers).get("Authorization")).toBe("Bearer access-0");
  });

  it("refreshes and retries once after a 401", async () => {
    signInWith(Date.now() + 600_000);
    fetchMock.mockResolvedValueOnce(json(401, {})).mockResolvedValueOnce(refreshed(1)).mockResolvedValueOnce(json(200, { ok: true }));

    await expect(authRequest("/things")).resolves.toEqual({ ok: true });
    expect(new Headers(fetchMock.mock.calls[2][1]!.headers).get("Authorization")).toBe("Bearer access-1");
  });
});

describe("staff IAM sessions", () => {
  const iamJwt = (exp: number) => `h.${Buffer.from(JSON.stringify({ exp })).toString("base64url")}.s`;
  const signInIam = (expiresAt: number) =>
    useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "Supervisor", { kind: "iam", accessToken: "iam-0", csrfToken: "csrf-0", loginOption: "agent", expiresAt });
  const sessionJson = (n: number) =>
    json(200, { data: { access_token: iamJwt(Math.floor(Date.now() / 1000) + 300), csrf_token: `csrf-${n}`, cookie_prefix: "", login_option: "agent" } });

  it("sends the CSRF value with the token while it is fresh", async () => {
    signInIam(Date.now() + 600_000);
    fetchMock.mockResolvedValueOnce(json(200, { ok: true }));

    await authRequest("/things");

    const headers = new Headers(fetchMock.mock.calls[0][1]!.headers);
    expect(headers.get("Authorization")).toBe("Bearer iam-0");
    expect(headers.get("X-CSRF-Token")).toBe("csrf-0");
  });

  it("refreshes through the IAM and reads the rotated token back from the UI server", async () => {
    signInIam(0);
    fetchMock
      .mockResolvedValueOnce(json(200, { data: { refreshed: true } }))
      .mockResolvedValueOnce(sessionJson(1))
      .mockResolvedValueOnce(json(200, { ok: true }));

    await expect(authRequest("/things")).resolves.toEqual({ ok: true });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/refresh");
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ access_token: "iam-0" });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/auth/iam/session");
    const headers = new Headers(fetchMock.mock.calls[2][1]!.headers);
    expect(headers.get("Authorization")).toMatch(/^Bearer h\./);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-1");
    expect(useAuthStore.getState().tokens?.kind).toBe("iam");
  });

  it("ends the session when no IAM cookie reaches the UI server after a refresh", async () => {
    signInIam(0);
    fetchMock.mockResolvedValueOnce(json(200, { data: { refreshed: false } })).mockResolvedValueOnce(json(401, { message: "none" }));

    await expect(authRequest("/things")).rejects.toMatchObject({ status: 401 });
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it("ends the session when the IAM rejects the refresh", async () => {
    signInIam(0);
    fetchMock.mockResolvedValueOnce(json(401, { message: "Session over" }));

    await expect(refreshSession()).resolves.toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
