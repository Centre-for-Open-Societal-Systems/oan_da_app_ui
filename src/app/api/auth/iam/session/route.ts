import { cookies } from "next/headers";
import { NextResponse } from "next/server";

// IAM finishes the Keycloak login by setting its token in an HttpOnly cookie on the shared parent domain, which page
// scripts cannot read. This handler reads it on the server and hands the access token to the callback page once,
// so the page can keep it in the browser's session store. It answers only for the browser that holds the cookie.
export const dynamic = "force-dynamic";

const ACCESS_COOKIE = "X-Access-Token";
// IAM sets this alongside the access token, same parent domain and lifetime: the backends behind it want it echoed
// back as the X-CSRF-Token request header on top of the Bearer token.
const CSRF_COOKIE = "X-CSRF-Token";
/** IAM's cookie lifetime (Max-Age 2100 s), used when the token carries no exp claim. */
const FALLBACK_LIFETIME_MS = 2_100_000;
const NO_STORE = { "Cache-Control": "no-store" };

/** The exp claim of a JWT in epoch ms, or null when it cannot be read. */
function expiryOf(token: string): number | null {
  try {
    const claims = JSON.parse(Buffer.from(token.split(".")[1] ?? "", "base64url").toString("utf8")) as { exp?: number };
    return typeof claims.exp === "number" ? claims.exp * 1000 : null;
  } catch {
    return null;
  }
}

export async function GET() {
  const jar = await cookies();
  const token = cookieNamed(jar, ACCESS_COOKIE);
  if (!token) {
    return NextResponse.json({ status: "error", code: "NO_SESSION", message: "No IAM session cookie was received by this browser." }, { status: 401, headers: NO_STORE });
  }
  const expiresAt = expiryOf(token) ?? Date.now() + FALLBACK_LIFETIME_MS;
  if (expiresAt <= Date.now()) {
    return NextResponse.json({ status: "error", code: "EXPIRED", message: "The IAM session has expired." }, { status: 401, headers: NO_STORE });
  }
  const csrfToken = cookieNamed(jar, CSRF_COOKIE) ?? null;
  return NextResponse.json({ status: "success", data: { access_token: token, csrf_token: csrfToken, expires_at: expiresAt } }, { headers: NO_STORE });
}

/** The cookie called `name`, or one whose name ends with it (IAM may prefix it, e.g. agent-X-Access-Token). */
function cookieNamed(jar: Awaited<ReturnType<typeof cookies>>, name: string): string | undefined {
  return jar.get(name)?.value ?? jar.getAll().find((c) => c.name.endsWith(name))?.value;
}
