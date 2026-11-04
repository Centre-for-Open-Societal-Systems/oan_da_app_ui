import { NextResponse, type NextRequest } from "next/server";
import { backendBaseUrl } from "@/lib/backend";
import { DEFAULT_IAM_KEY, IAM_COMPLETE_PATH, LOGIN_OPTION_COOKIE, encodeLoginOption, requestOrigin, safeReturnPath } from "@/lib/iam";

// Step 1 of the staff IAM sign-in (oan_auth_service, IAM_LOGIN_DISCOVERY_FLOW.md). /login navigates here (a
// page navigation, not a fetch, because the browser must follow the identity provider's redirects). This route
// asks the backend to start the sign-in for the chosen login option and sends the browser to Keycloak,
// remembering the option in an HttpOnly cookie so /api/auth/iam/session knows which cookie prefix to read.

export const dynamic = "force-dynamic";

const START_TIMEOUT_MS = 15_000;

interface StartResponse {
  data?: { redirect_url?: unknown; iam?: unknown; cookie_prefix?: unknown };
}

const backToLogin = (origin: string, code: string) => NextResponse.redirect(new URL(`/login?error=${code}`, origin), 303);

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const key = params.get("key") || process.env.NEXT_PUBLIC_IAM_LOGIN_KEY || DEFAULT_IAM_KEY;
  const returnPath = safeReturnPath(params.get("returnUrl"));
  const origin = requestOrigin(request.headers, request.nextUrl.origin);
  // Where the IAM lands the browser afterwards; the backend checks this origin against the option's allow-list.
  const returnUrl = `${origin}${IAM_COMPLETE_PATH}?${new URLSearchParams({ key, returnUrl: returnPath })}`;

  let body: StartResponse | null = null;
  let status: number;
  try {
    const res = await fetch(`${backendBaseUrl()}/api/v1/auth/iam/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ key, return_url: returnUrl }),
      cache: "no-store",
      signal: AbortSignal.timeout(START_TIMEOUT_MS),
    });
    status = res.status;
    body = (await res.json().catch(() => null)) as StartResponse | null;
  } catch {
    return backToLogin(origin, "iam_unavailable");
  }

  // 400: unknown or disabled option, or this origin is not allowed as a return URL. 502/503: the IAM itself.
  if (status !== 200) return backToLogin(origin, status === 400 ? "iam_failed" : "iam_unavailable");
  const redirectUrl = body?.data?.redirect_url;
  if (typeof redirectUrl !== "string" || !/^https?:\/\//i.test(redirectUrl)) return backToLogin(origin, "iam_unavailable");

  // Always show Keycloak's form, even with a live Keycloak session: a demo (and a shared machine) switches
  // users, and without this Keycloak would silently return the previous user. Same as the Postman collection.
  const keycloakUrl = new URL(redirectUrl);
  keycloakUrl.searchParams.set("prompt", "login");
  const response = NextResponse.redirect(keycloakUrl, 303);
  response.cookies.set(LOGIN_OPTION_COOKIE, encodeLoginOption({ key, cookiePrefix: typeof body?.data?.cookie_prefix === "string" ? body.data.cookie_prefix : "" }), {
    httpOnly: true,
    sameSite: "lax",
    secure: origin.startsWith("https://"),
    path: "/",
    maxAge: 15 * 60,
  });
  // Dev only: lets `curl -i` show which return URL the IAM was given.
  if (process.env.NODE_ENV !== "production") response.headers.set("X-OAN-Return-Url", returnUrl);
  return response;
}
