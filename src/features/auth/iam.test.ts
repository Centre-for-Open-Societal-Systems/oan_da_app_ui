import { beforeEach, describe, expect, it, vi } from "vitest";
import { completeIamLogin, fetchIamProviders, toIamTokens } from "./iam";
import { NO_ASSIGNMENT_MESSAGE } from "./login";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn<typeof fetch>();
const jwt = (claims: Record<string, unknown>) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;

const me = (role = "Supervisor") => ({
  data: {
    user: { id: "sup@moa.gov.et", name: "Almaz", email: "sup@moa.gov.et" },
    role,
    role_codes: [role],
    role_label: "Supervisor (Woreda)",
    roles: ["Supervisor"],
    scope: { regions: ["ET04"], woredas: ["ET04-W01"], zones: [] },
    scope_label: "Woreda · ET04-W01",
    unrestricted: false,
    menu: ["/dashboard", "/agents"],
    da_id: null,
  },
});

beforeEach(() => {
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
});

describe("toIamTokens", () => {
  it("takes the expiry from the JWT and marks the session as IAM", () => {
    const token = jwt({ exp: 1_700_000_000 });
    expect(toIamTokens({ accessToken: token, csrfToken: "c", loginOption: "agent" }, 5)).toEqual({
      kind: "iam",
      accessToken: token,
      csrfToken: "c",
      loginOption: "agent",
      expiresAt: 1_700_000_000_000,
    });
  });

  it("assumes the dev TTL when the token carries no exp", () => {
    expect(toIamTokens({ accessToken: "opaque" }, 1000).expiresAt).toBe(1000 + 5 * 60_000);
  });
});

describe("completeIamLogin", () => {
  it("checks the token with /auth/me, then reads /me and builds the session", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { user: "u", roles: ["Supervisor"] } })).mockResolvedValueOnce(json(200, me()));

    const result = await completeIamLogin({ accessToken: jwt({ exp: 2_000_000_000 }), csrfToken: "csrf-1", loginOption: "agent" });

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/me");
    const [url, init] = fetchMock.mock.calls[1];
    expect(url).toBe("/api/v1/da-services/me");
    const headers = new Headers(init!.headers);
    expect(headers.get("Authorization")).toMatch(/^Bearer h\./);
    expect(headers.get("X-CSRF-Token")).toBe("csrf-1");
    expect(result.role).toBe("Supervisor");
    expect(result.profile.scopeLabel).toBe("Woreda · ET04-W01");
    expect(result.tokens.kind).toBe("iam");
    expect(result.tokens.refreshToken).toBeUndefined();
  });

  it("refuses a user the portal has no role for", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: {} })).mockResolvedValueOnce(json(200, me("Auditor")));
    await expect(completeIamLogin({ accessToken: "t" })).rejects.toMatchObject({ status: 403, message: NO_ASSIGNMENT_MESSAGE });
  });

  it("reports a missing assignment when the token is good but DA Services refuses", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: {} })).mockResolvedValueOnce(json(401, { message: "Authentication failed" }));
    await expect(completeIamLogin({ accessToken: "t" })).rejects.toMatchObject({ status: 403, message: NO_ASSIGNMENT_MESSAGE });
  });

  it("passes a token the auth app refuses on as 401", async () => {
    fetchMock.mockResolvedValueOnce(json(401, { message: "Invalid or expired token" }));
    await expect(completeIamLogin({ accessToken: "t" })).rejects.toMatchObject({ status: 401 });
  });
});

describe("fetchIamProviders", () => {
  it("lists the backend's sign-in options", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { providers: [{ key: "local", label: "Sign in", icon_url: "" }, { key: "agent", label: "Agent", icon_url: "" }] } }));
    await expect(fetchIamProviders()).resolves.toEqual([
      { key: "local", label: "Sign in", icon_url: "" },
      { key: "agent", label: "Agent", icon_url: "" },
    ]);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/auth/iam/providers");
  });
});
