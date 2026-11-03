import { afterEach, describe, expect, it, vi } from "vitest";
import { isUnderCookieDomain, loginProviderFor } from "./loginProvider";

afterEach(() => vi.unstubAllEnvs());

describe("loginProviderFor", () => {
  it("uses direct Keycloak (OIDC) on the deployed host, which sits outside IAM's cookie domain", () => {
    // da-registry-development.oanstaging.com is a sibling of development.oanstaging.com (dash, not dot).
    expect(isUnderCookieDomain("da-registry-development.oanstaging.com", ".development.oanstaging.com")).toBe(false);
    expect(loginProviderFor("da-registry-development.oanstaging.com")).toBe("oidc");
  });

  it("keeps IAM's cookie flow on every host under .development.oanstaging.com", () => {
    for (const host of ["crop-registry.development.oanstaging.com", "da-portal.development.oanstaging.com", "da-local.development.oanstaging.com", "a.b.development.oanstaging.com", "DA-PORTAL.Development.OANStaging.com"]) {
      expect(loginProviderFor(host)).toBe("iam");
    }
  });

  it("uses OIDC on hosts that only look alike or are unrelated", () => {
    for (const host of ["xdevelopment.oanstaging.com", "development.oanstaging.com.evil.com", "localhost", "127.0.0.1", "oanstaging.com"]) {
      expect(loginProviderFor(host)).toBe("oidc");
    }
  });

  it("reads the cookie domain from NEXT_PUBLIC_IAM_COOKIE_DOMAIN, with or without the leading dot", () => {
    vi.stubEnv("NEXT_PUBLIC_IAM_COOKIE_DOMAIN", "oanstaging.com");
    expect(loginProviderFor("da-registry-development.oanstaging.com")).toBe("iam");
    vi.stubEnv("NEXT_PUBLIC_IAM_COOKIE_DOMAIN", ".staging.example.org");
    expect(loginProviderFor("portal.staging.example.org")).toBe("iam");
    expect(loginProviderFor("da-registry-development.oanstaging.com")).toBe("oidc");
  });

  it("falls back to IAM when no public Keycloak client is configured", () => {
    expect(loginProviderFor("da-registry-development.oanstaging.com", { oidcConfigured: false })).toBe("iam");
  });
});
