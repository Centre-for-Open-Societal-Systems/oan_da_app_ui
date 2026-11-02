import { beforeEach, describe, expect, it, vi } from "vitest";

// Minimal in-memory Storage for the PKCE state the browser keeps while it is away at Keycloak.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.get(k) ?? null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
}

const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

async function load() {
  vi.resetModules();
  vi.stubEnv("NEXT_PUBLIC_KEYCLOAK_CLIENT_ID", "da-portal");
  return import("./oidc");
}

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("direct Keycloak sign-in", () => {
  it("builds a PKCE login URL and keeps the verifier and state for the way back", async () => {
    const oidc = await load();
    const url = new URL(await oidc.buildOidcLoginUrl("http://localhost:3000"));

    expect(url.origin + url.pathname).toBe("https://keycloak.development.oanstaging.com/realms/staff/protocol/openid-connect/auth");
    expect(Object.fromEntries(url.searchParams)).toMatchObject({ client_id: "da-portal", response_type: "code", redirect_uri: "http://localhost:3000/auth/callback", code_challenge_method: "S256", prompt: "login" });
    expect(url.searchParams.get("code_challenge")).toMatch(/^[\w-]{43}$/);
    const pending = JSON.parse(sessionStorage.getItem("oan-oidc-pending")!);
    expect(pending.state).toBe(url.searchParams.get("state"));
    expect(oidc.isOidcConfigured()).toBe(true);
  });

  it("can skip prompt=login to allow single sign-on", async () => {
    const oidc = await load();
    expect(new URL(await oidc.buildOidcLoginUrl("http://localhost:3000", { forceLogin: false })).searchParams.has("prompt")).toBe(false);
  });

  it("trades the callback code for tokens with the stored verifier", async () => {
    const oidc = await load();
    const login = new URL(await oidc.buildOidcLoginUrl("http://localhost:3000"));
    const state = login.searchParams.get("state")!;
    fetchMock.mockResolvedValueOnce(json({ access_token: "a", refresh_token: "r", expires_in: 300 }));

    const search = new URLSearchParams({ code: "abc", state });
    expect(oidc.hasOidcResult(search)).toBe(true);
    await expect(oidc.exchangeOidcCode(search, "http://localhost:3000")).resolves.toMatchObject({ access_token: "a", refresh_token: "r" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("https://keycloak.development.oanstaging.com/realms/staff/protocol/openid-connect/token");
    const body = new URLSearchParams(String(init?.body));
    expect(Object.fromEntries(body)).toMatchObject({ grant_type: "authorization_code", client_id: "da-portal", code: "abc", redirect_uri: "http://localhost:3000/auth/callback" });
    expect(body.get("code_verifier")).toBeTruthy();
    // The state is single-use.
    await expect(oidc.exchangeOidcCode(search, "http://localhost:3000")).rejects.toMatchObject({ status: 400 });
  });

  it("rejects a callback whose state was not issued by this browser", async () => {
    const oidc = await load();
    await oidc.buildOidcLoginUrl("http://localhost:3000");
    await expect(oidc.exchangeOidcCode(new URLSearchParams({ code: "abc", state: "forged" }), "http://localhost:3000")).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports Keycloak's refusal and renews with the refresh token", async () => {
    const oidc = await load();
    fetchMock.mockResolvedValueOnce(json({ error: "invalid_grant", error_description: "Token is not active" }, 400));
    await expect(oidc.refreshOidcTokens("old")).rejects.toMatchObject({ status: 400, message: "Token is not active" });

    fetchMock.mockResolvedValueOnce(json({ access_token: "a2", refresh_token: "r2", expires_in: 300 }));
    await expect(oidc.refreshOidcTokens("r1")).resolves.toMatchObject({ refresh_token: "r2" });
    expect(new URLSearchParams(String(fetchMock.mock.calls[1][1]?.body)).get("grant_type")).toBe("refresh_token");
  });
});
