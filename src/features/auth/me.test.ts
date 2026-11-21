import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeProfile, ownArea, useAuthStore, type AuthProfile } from "@/store/useAuthStore";
import { login, NO_ASSIGNMENT_MESSAGE } from "./login";
import { refreshProfile, toMeSession, type MeResponse } from "./me";

// Minimal in-memory Storage so the persisted store runs under Node.
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
const fetchMock = vi.fn<typeof fetch>();

// A JWT whose payload is { "exp": 2000000000 }.
const TOKEN = `h.${Buffer.from(JSON.stringify({ exp: 2_000_000_000 })).toString("base64url")}.s`;
// The shape of POST /da-services/sso/login on da-backend-development.
const loginOk = () => json(200, {
  data: {
    access_token: TOKEN,
    csrf_token: "c1",
    user: { user: "63c0@iam.internal", login_email: "admin@moa.gov.et", first_name: "Admin", last_name: "User", login_option: "agent", roles: ["Development Agent", "OAN Administrator"] },
  },
  message: "Success",
  status: "success",
});
const me = (over: Partial<MeResponse["data"]> = {}): MeResponse => ({
  data: {
    user: { id: "Administrator", name: "Administrator", email: "Administrator" },
    role: "Admin",
    role_codes: ["Admin"],
    role_label: "OAN / ATI Administrator",
    roles: ["OAN Administrator"],
    scope: { regions: [], woredas: [], zones: [] },
    scope_label: "All regions",
    unrestricted: true,
    menu: ["/dashboard", "/admin/users"],
    da_id: null,
    ...over,
  },
});

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.setState({ user: null, isAuthenticated: false, tokens: null, profile: null });
});

describe("toMeSession name", () => {
  it("shows the DA's registry name instead of the account name", () => {
    const body = me();
    body.data.agent = { full_name: " Selamawit Tesfaye " };
    expect(toMeSession(body)?.user.name).toBe("Selamawit Tesfaye");
  });
});

describe("toMeSession", () => {
  it("maps /me to identity, portal role and profile", () => {
    expect(toMeSession(me())).toEqual({
      user: { id: "Administrator", name: "Administrator", email: "Administrator" },
      role: "Admin",
      profile: { roleLabel: "OAN / ATI Administrator", scopeLabel: "All regions", scope: { regions: [], woredas: [], zones: [] }, unrestricted: true, menu: ["/dashboard", "/admin/users"], daId: null, agent: null, designation: null, location: { country: null, region: null, zone: null, woreda: null, kebele: null } },
    });
  });

  it("rejects a role the portal does not know", () => {
    expect(toMeSession(me({ role: "Auditor" }))).toBeNull();
  });

  it("fills in an empty scope when /me sends none, so screens can read scope.woredas", () => {
    // What a backend that leaves scope to Frappe User Permissions sends: no scope, unrestricted, da_id or agent.
    const body = { data: { user: { id: "da@x", name: "DA", email: "da@x" }, role: "DA", role_codes: ["DA"], role_label: "Development Agent", roles: ["Development Agent"], scope_label: "Own record", menu: ["/dashboard"] } } as MeResponse;

    const profile = toMeSession(body)?.profile;
    expect(profile?.scope).toEqual({ regions: [], woredas: [], zones: [] });
    expect(profile?.scope.woredas).toEqual([]);
    expect([profile?.unrestricted, profile?.daId, profile?.agent]).toEqual([false, null, null]);
  });

  it("reads the hierarchy location of the newer /me: own Woreda and Kebele, labels built here", () => {
    // The /me of a backend with DA Hierarchy: no role_label, scope_label, scope, kebeles or da_id.
    const body = {
      data: {
        user: { id: "da@x", name: "DA Agent", email: "da@x" },
        role: "DA",
        roles: ["Development Agent"],
        designation: "agent",
        country: { id: "ET", name: "Ethiopia" },
        region: { id: "ET01", name: "Tigray" },
        zone: { id: "ET0101", name: "North Western" },
        woreda: { id: "ET010108", name: "Shire Endaslasie town" },
        kebele: { id: "ET01010805", name: "Lekatit" },
        menu: ["/dashboard", "/farmers"],
      },
    } as MeResponse;

    const profile = toMeSession(body)!.profile;
    expect(profile.location?.woreda).toEqual({ id: "ET010108", name: "Shire Endaslasie town" });
    expect(profile.scope).toEqual({ regions: ["ET01"], zones: ["ET0101"], woredas: ["ET010108"] });
    expect(profile.kebeles).toEqual([{ code: "ET01010805", name: "Lekatit" }]);
    expect([profile.roleLabel, profile.scopeLabel, profile.designation]).toEqual(["Development Agent", "Own record · Shire Endaslasie town", "agent"]);
  });

  it("names a Supervisor's Woreda in the scope line and gives them no Kebele list", () => {
    const body = { data: { user: { id: "s@x", name: "S", email: "s@x" }, role: "Supervisor", roles: ["Supervisor"], woreda: { id: "ET010108", name: "Shire" }, kebele: null, menu: [] } } as MeResponse;
    const profile = toMeSession(body)!.profile;
    expect([profile.scopeLabel, profile.kebeles, profile.scope.woredas]).toEqual(["Woreda · Shire", undefined, ["ET010108"]]);
  });
});

describe("ownArea", () => {
  const at = { country: null, region: null, zone: null, woreda: { id: "ET010108", name: "Shire" }, kebele: { id: "ET01010805", name: "Lekatit" } };
  const profile = { roleLabel: "", scopeLabel: "", menu: [], location: at } as unknown as AuthProfile;

  it("gives a DA their Woreda and Kebele, and a Supervisor the Woreda only", () => {
    useAuthStore.getState().setSession({ id: "da@x", name: "DA", email: "da@x" }, "DA", profile);
    expect(ownArea()).toEqual({ woreda: "ET010108", kebele: "ET01010805", daId: undefined });
    useAuthStore.getState().setSession({ id: "s@x", name: "S", email: "s@x" }, "Supervisor", profile);
    expect(ownArea()).toEqual({ woreda: "ET010108", kebele: undefined, daId: undefined });
  });
});

describe("completeProfile", () => {
  it("gives a stored profile without a scope an empty one, and leaves a full profile as it is", () => {
    const stored = { roleLabel: "Development Agent", scopeLabel: "Own record", menu: ["/dashboard"] } as unknown as AuthProfile;
    expect(completeProfile(stored)).toMatchObject({ scope: { regions: [], woredas: [], zones: [] }, unrestricted: false, daId: null, agent: null, menu: ["/dashboard"] });

    const full = toMeSession(me({ scope: { regions: ["ET04"], woredas: ["ET040801"], zones: [] } }))!.profile;
    expect(completeProfile(full)).toEqual(full);
    expect(completeProfile(null)).toBeNull();
  });

  it("is applied when a session is set, so the store never holds a profile without a scope", () => {
    const stored = { roleLabel: "Development Agent", scopeLabel: "Own record", menu: [] } as unknown as AuthProfile;
    useAuthStore.getState().setSession({ id: "da@x", name: "DA", email: "da@x" }, "DA", stored);
    expect(useAuthStore.getState().profile?.scope.woredas).toEqual([]);
  });
});

describe("login", () => {
  it("signs in through sso/login, then takes identity and role from /me with the returned token", async () => {
    fetchMock.mockResolvedValueOnce(loginOk()).mockResolvedValueOnce(json(200, me({ role: "Supervisor", role_label: "Supervisor (Woreda)" })));

    const result = await login(" admin@moa.gov.et ", "pw");

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/sso/login");
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ username: "admin@moa.gov.et", password: "pw", key: "agent" });
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/da-services/me");
    const headers = new Headers(fetchMock.mock.calls[1][1]!.headers);
    expect(headers.get("Authorization")).toBe(`Bearer ${TOKEN}`);
    expect(headers.get("X-CSRF-Token")).toBe("c1");
    expect(result.role).toBe("Supervisor");
    expect(result.profile?.roleLabel).toBe("Supervisor (Woreda)");
    // No IAM cookies come back: the token itself is the session, valid until the JWT's exp, with no refresh token.
    expect(result.tokens).toEqual({ accessToken: TOKEN, refreshToken: "", expiresAt: 2_000_000_000_000, csrfToken: "c1" });
  });

  it("passes on wrong credentials as a 401", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { message: "Invalid login credentials" }));

    await expect(login("da@moa.gov.et", "bad")).rejects.toMatchObject({ status: 401 });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("refuses an account without an active assignment", async () => {
    fetchMock.mockResolvedValueOnce(loginOk()).mockResolvedValueOnce(json(401, { message: "Authentication failed" }));

    await expect(login("da@moa.gov.et", "pw")).rejects.toMatchObject({ status: 403, message: NO_ASSIGNMENT_MESSAGE });
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("falls back to the login response when /me cannot be reached", async () => {
    fetchMock.mockResolvedValueOnce(loginOk()).mockRejectedValueOnce(new TypeError("offline"));

    const result = await login("admin@moa.gov.et", "pw");

    expect(result.role).toBe("Admin");
    expect(result.user).toEqual({ id: "63c0@iam.internal", name: "Admin User", email: "admin@moa.gov.et" });
    expect(result.profile).toBeUndefined();
  });
});

describe("refreshProfile", () => {
  it("updates the stored identity and profile", async () => {
    useAuthStore.getState().signIn({ id: "x", name: "x", email: "x" }, "DA", { accessToken: "a", refreshToken: "r", expiresAt: Date.now() + 600_000 });
    fetchMock.mockResolvedValueOnce(json(200, me()));

    await refreshProfile();

    const s = useAuthStore.getState();
    expect(s.role).toBe("Admin");
    expect(s.user?.name).toBe("Administrator");
    expect(s.profile?.scopeLabel).toBe("All regions");
    expect(s.tokens?.accessToken).toBe("a");
  });
});
