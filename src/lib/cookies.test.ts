import { afterEach, describe, expect, it, vi } from "vitest";
import { readCookie } from "./cookies";

// No jsdom in this project's test setup (see other *.test.ts files): stub just the `cookie` string document.cookie
// exposes, the only part readCookie touches.
afterEach(() => {
  vi.unstubAllGlobals();
});

describe("readCookie", () => {
  it("reads a cookie by exact name", () => {
    vi.stubGlobal("document", { cookie: "X-CSRF-Token=abc123" });
    expect(readCookie("X-CSRF-Token")).toBe("abc123");
  });

  it("picks the right cookie among several", () => {
    vi.stubGlobal("document", { cookie: "sid=Guest; X-CSRF-Token=xyz; user_id=Guest" });
    expect(readCookie("X-CSRF-Token")).toBe("xyz");
  });

  it("decodes a URL-encoded value", () => {
    vi.stubGlobal("document", { cookie: `X-CSRF-Token=${encodeURIComponent("a b/c")}` });
    expect(readCookie("X-CSRF-Token")).toBe("a b/c");
  });

  it("returns null when the cookie is not set", () => {
    vi.stubGlobal("document", { cookie: "sid=Guest" });
    expect(readCookie("X-CSRF-Token")).toBeNull();
  });

  it("returns null outside the browser", () => {
    vi.stubGlobal("document", undefined);
    expect(readCookie("X-CSRF-Token")).toBeNull();
  });
});
