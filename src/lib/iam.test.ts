import { afterEach, describe, expect, it, vi } from "vitest";
import {
  decodeJwtExpiry,
  delegatedUserId,
  encodeLoginOption,
  iamLoginHref,
  loginErrorMessage,
  parseLoginOption,
  readIamSession,
  requestOrigin,
  safeReturnPath,
} from "./iam";

const jwt = (claims: Record<string, unknown>) => `h.${Buffer.from(JSON.stringify(claims)).toString("base64url")}.s`;

describe("safeReturnPath", () => {
  it("keeps a path on this app", () => {
    expect(safeReturnPath("/farmers?tab=visits")).toBe("/farmers?tab=visits");
  });

  it("falls back for anything that could leave the app or hit an API route", () => {
    for (const bad of [undefined, "", "https://evil.test/x", "//evil.test", "/\\evil.test", "javascript:alert(1)", "/api/auth/iam/session", "/a b"]) {
      expect(safeReturnPath(bad)).toBe("/dashboard");
    }
  });
});

describe("login option cookie", () => {
  it("round-trips key and cookie prefix", () => {
    expect(parseLoginOption(encodeLoginOption({ key: "agent", cookiePrefix: "" }))).toEqual({ key: "agent", cookiePrefix: "" });
    expect(parseLoginOption(encodeLoginOption({ key: "staff", cookiePrefix: "staff-" }))).toEqual({ key: "staff", cookiePrefix: "staff-" });
  });

  it("ignores a missing or malformed cookie", () => {
    expect(parseLoginOption(undefined)).toBeNull();
    expect(parseLoginOption("not json")).toBeNull();
    expect(parseLoginOption(encodeURIComponent('{"cookiePrefix":"x"}'))).toBeNull();
  });
});

describe("requestOrigin", () => {
  it("prefers forwarded headers, then the Host header, then the fallback", () => {
    expect(requestOrigin(new Headers({ "x-forwarded-host": "ui.example.org", "x-forwarded-proto": "https" }), "http://localhost:3000")).toBe("https://ui.example.org");
    expect(requestOrigin(new Headers({ host: "da-local.development.oanstaging.com:3000" }), "https://localhost:3000")).toBe("https://da-local.development.oanstaging.com:3000");
    expect(requestOrigin(new Headers(), "http://localhost:3000")).toBe("http://localhost:3000");
  });
});

describe("decodeJwtExpiry", () => {
  it("reads exp as epoch milliseconds", () => {
    expect(decodeJwtExpiry(jwt({ exp: 1_700_000_000, sub: "x" }))).toBe(1_700_000_000_000);
  });

  it("is null without exp or for garbage", () => {
    expect(decodeJwtExpiry(jwt({ sub: "x" }))).toBeNull();
    expect(decodeJwtExpiry("garbage")).toBeNull();
    expect(decodeJwtExpiry("a.%%%.c")).toBeNull();
  });
});

describe("links and messages", () => {
  it("builds the sign-in link with a safe return path", () => {
    expect(iamLoginHref("agent", "https://evil.test")).toBe("/api/auth/iam/login?key=agent&returnUrl=%2Fdashboard");
  });

  it("maps error codes to messages", () => {
    expect(loginErrorMessage("session_expired")).toMatch(/session has ended/);
    expect(loginErrorMessage("something_else")).toMatch(/did not complete/);
    expect(loginErrorMessage(null)).toBeNull();
  });
});

describe("readIamSession", () => {
  const fetchMock = vi.fn<typeof fetch>();
  const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });

  afterEach(() => {
    vi.unstubAllGlobals();
    fetchMock.mockReset();
  });

  it("returns the tokens the UI server read from the cookies", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(json(200, { data: { access_token: "a", csrf_token: "c", cookie_prefix: "", login_option: "agent" } }));
    await expect(readIamSession()).resolves.toEqual({ accessToken: "a", csrfToken: "c", cookiePrefix: "", loginOption: "agent" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/auth/iam/session");
  });

  it("is null when no cookie reached the origin, or the server cannot be reached", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(json(401, { message: "none" }));
    await expect(readIamSession()).resolves.toBeNull();
    fetchMock.mockRejectedValueOnce(new TypeError("offline"));
    await expect(readIamSession()).resolves.toBeNull();
  });
});

describe("delegatedUserId", () => {
  it("derives the backend's user id from the login option and the Keycloak sub", async () => {
    const { createHash } = await import("node:crypto");
    const sub = "3f2c1d8e-1111-4c3e-9d2f-8b5a1e7c3f90";
    const expected = `${createHash("sha256").update(`agent:${sub}`).digest("hex").slice(0, 32)}@iam.internal`;
    await expect(delegatedUserId(sub, "agent")).resolves.toBe(expected);
    await expect(delegatedUserId(` ${sub} `, "agent")).resolves.toBe(expected);
  });

  it("keeps an id that already is a DA Services staff id", async () => {
    await expect(delegatedUserId("63C05EFC714C763C0FDB27B216C4229F@iam.internal", "agent")).resolves.toBe("63c05efc714c763c0fdb27b216c4229f@iam.internal");
  });
});
