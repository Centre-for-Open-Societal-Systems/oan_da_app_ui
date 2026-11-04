import { describe, expect, it } from "vitest";
import { toLoginResult, toPortalRole } from "./login";

describe("toLoginResult", () => {
  it("reads the login response", () => {
    const res = {
      data: { access_token: "a", expires_in: 900, refresh_token: "r", token_type: "Bearer", roles: ["Development Agent"], user: "da@moa.et" },
    };
    expect(toLoginResult(res, 1000)).toEqual({
      user: { id: "da@moa.et", name: "da@moa.et", email: "da@moa.et" },
      role: "DA",
      tokens: { accessToken: "a", refreshToken: "r", expiresAt: 901_000 },
    });
  });
});

describe("toPortalRole", () => {
  it("picks the most senior portal role", () => {
    expect(toPortalRole(["Development Agent", "Supervisor", "Executive", "Administrator"])).toBe("Admin");
    expect(toPortalRole(["Supervisor", "Communications Officer"])).toBe("Supervisor");
  });

  it("falls back to DA when no portal role is held", () => {
    expect(toPortalRole(["Sales User"])).toBe("DA");
  });
});
