import { NextResponse, type NextRequest } from "next/server";
import { IAM_COOKIE, LOGIN_OPTION_COOKIE, decodeJwtExpiry, iamCookieName, parseLoginOption, type IamSessionResponse } from "@/lib/iam";

// The staff IAM sets its token cookies (HttpOnly) on the shared parent domain, where the page cannot read them
// but this server can. /login/iam calls this right after the IAM callback, and features/auth/session after a
// refresh, to pick up the current access token and CSRF value. 401 when no IAM cookie reached this origin,
// which is the case when the app is opened as plain localhost instead of da-local.development.oanstaging.com.

export const dynamic = "force-dynamic";

const NO_STORE = { "Cache-Control": "no-store" };

/** Every value the Cookie header carries for that name; browsers send duplicates (different Domain or Path) side by side. */
function cookieValues(request: NextRequest, name: string): string[] {
  const header = request.headers.get("cookie");
  if (!header) {
    const one = request.cookies.get(name)?.value;
    return one ? [one] : [];
  }
  const values: string[] = [];
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1 || part.slice(0, eq).trim() !== name) continue;
    const value = decodeURIComponent(part.slice(eq + 1).trim().replace(/^"|"$/g, ""));
    if (value) values.push(value);
  }
  return values;
}

/**
 * After several sign-ins in one browser the header can carry two access-token cookies: the IAM's domain-wide one
 * and a stale copy. Cookie order says nothing about freshness, so the token that stays valid longest wins.
 */
function freshestToken(values: string[]): string | undefined {
  let best: { token: string; exp: number } | undefined;
  for (const token of values) {
    const exp = decodeJwtExpiry(token) ?? 0;
    if (!best || exp > best.exp) best = { token, exp };
  }
  return best?.token;
}

export function GET(request: NextRequest) {
  const option = parseLoginOption(cookieValues(request, LOGIN_OPTION_COOKIE).at(-1));
  // Without the option cookie (expired, or signed in through another OAN UI) try the unprefixed names.
  const prefixes = option ? [option.cookiePrefix] : [""];
  for (const prefix of prefixes) {
    const accessToken = freshestToken(cookieValues(request, iamCookieName(prefix, IAM_COOKIE.access)));
    if (!accessToken) continue;
    const body: IamSessionResponse = {
      data: {
        access_token: accessToken,
        csrf_token: cookieValues(request, iamCookieName(prefix, IAM_COOKIE.csrf)).at(-1) ?? null,
        cookie_prefix: prefix,
        login_option: option?.key ?? null,
      },
    };
    return NextResponse.json(body, { headers: NO_STORE });
  }
  return NextResponse.json({ message: "No staff IAM session cookie reached this origin." }, { status: 401, headers: NO_STORE });
}
