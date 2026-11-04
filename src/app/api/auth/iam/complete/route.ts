import { type NextRequest } from "next/server";
import { IAM_LANDING_PATH, safeReturnPath } from "@/lib/iam";

// Where the staff IAM lands the browser after Keycloak (the `return_url` sent by /api/auth/iam/login). The IAM's
// token cookies are on the shared parent domain, so they travel with the next same-origin request: the landing
// page at /login/iam fetches /api/auth/iam/session to read them and signs the user in. A meta refresh instead of
// a 30x, so that navigation is started by this app's own page (same reason as the reference UI).

export const dynamic = "force-dynamic";

const escapeHtml = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] ?? c);

export function GET(request: NextRequest) {
  const returnPath = safeReturnPath(request.nextUrl.searchParams.get("returnUrl"));
  const next = `${IAM_LANDING_PATH}?${new URLSearchParams({ returnUrl: returnPath })}`;
  const href = escapeHtml(next);
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Signing in…</title><meta http-equiv="refresh" content="0;url=${href}"><meta name="robots" content="noindex"></head><body style="font-family:system-ui,sans-serif;padding:2rem;color:#27272a">Completing your sign-in… <a href="${href}">Continue</a></body></html>`;
  return new Response(html, { status: 200, headers: { "Content-Type": "text/html; charset=utf-8", "Cache-Control": "no-store" } });
}
