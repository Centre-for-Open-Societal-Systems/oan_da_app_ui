// Which Keycloak sign-in this portal host can use.
//
//  - "iam": the OAN standard. IAM runs the Keycloak flow and keeps the session in cookies it sets on its shared cookie
//    domain (.development.oanstaging.com on dev). Works only when the portal host is inside that domain, because the
//    browser sends those cookies to no other host.
//  - "oidc": direct Keycloak authorization code + PKCE with the public client (lib/oidc). The token pair lives in the
//    auth store and goes out as Bearer. Used on every host that cannot receive IAM's cookies, e.g.
//    da-registry-development.oanstaging.com (a sibling of development.oanstaging.com, not under it) and localhost.
import { isOidcConfigured } from "@/lib/oidc";

export type LoginProvider = "iam" | "oidc";

/** The domain IAM sets its session cookies on. */
export const iamCookieDomain = () => process.env.NEXT_PUBLIC_IAM_COOKIE_DOMAIN ?? ".development.oanstaging.com";

/** Whether the browser sends cookies set for `domain` to `hostname` (the host itself or any subdomain of it). */
export function isUnderCookieDomain(hostname: string, domain: string): boolean {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  const base = domain.toLowerCase().trim().replace(/^\./, "").replace(/\.$/, "");
  if (!base || !host) return false;
  return host === base || host.endsWith(`.${base}`);
}

/** The sign-in for a portal host: IAM's cookie flow inside IAM's cookie domain, direct Keycloak (OIDC) anywhere else. */
export function loginProviderFor(hostname: string, { cookieDomain = iamCookieDomain(), oidcConfigured = isOidcConfigured() }: { cookieDomain?: string; oidcConfigured?: boolean } = {}): LoginProvider {
  if (isUnderCookieDomain(hostname, cookieDomain)) return "iam";
  // Without a public Keycloak client there is nothing else to try; IAM's flow at least reports why it failed.
  return oidcConfigured ? "oidc" : "iam";
}
