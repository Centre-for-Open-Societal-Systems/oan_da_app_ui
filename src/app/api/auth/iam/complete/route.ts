import { NextResponse, type NextRequest } from "next/server";

// The return_url IAM redirects to after it exchanged the Keycloak code (it has just set its cookies on this
// request's way in). Nothing is stored here: the browser is sent on to the callback page, which collects the
// token from /api/auth/iam/session and signs the user in. Query parameters (an IAM error, for one) are carried over.
export const dynamic = "force-dynamic";

export function GET(request: NextRequest) {
  // The address the browser used (Host header), not nextUrl.origin: the dev server binds 127.0.0.1, which Next reports
  // as https://localhost:3000, and the IAM cookie exists only for the *.development.oanstaging.com address.
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  const proto = request.headers.get("x-forwarded-proto") ?? request.nextUrl.protocol.replace(":", "");
  const target = new URL("/auth/callback", process.env.APP_URL ?? (host ? `${proto}://${host}` : request.nextUrl.origin));
  request.nextUrl.searchParams.forEach((value, key) => target.searchParams.set(key, value));
  return NextResponse.redirect(target);
}
