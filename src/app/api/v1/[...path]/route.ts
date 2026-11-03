import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";

// Forwards /api/v1/* to the DA Services API (API_BASE_URL; Crop Sown routes to CROP_SOWN_BASE_URL when it is set).
// It uses node:http(s) rather than a Next rewrite or fetch because both lowercase header names, and the backend wants
// X-CSRF-Token exactly in that spelling. Also adds ngrok-skip-browser-warning (ngrok's free tunnels otherwise answer a
// browser's request with an interstitial page) and sends the target's own Host.
//
// IAM sign-in (the OAN standard, as in the grievance and registry portals): IAM keeps the session in its own cookies on
// the shared parent domain (X-Access-Token HttpOnly, X-ID-Token, X-Session-Id, X-CSRF-Token). The browser never holds
// the token; it sends those cookies with every call to this app, and this proxy turns them into what the backend reads:
//  - Authorization: Bearer <X-Access-Token cookie> and X-CSRF-Token: <X-CSRF-Token cookie>, unless the caller set them;
//  - an expired session (401) is renewed once through POST /api/v1/auth/refresh with the IAM cookies, the call retried
//    with the new token, and IAM's Set-Cookie headers relayed so the browser keeps the new session;
//  - POST /api/v1/auth/refresh and /auth/logout with an empty body get the cookie's access token as `access_token`.
export const dynamic = "force-dynamic";

const CROP_SOWN = /^\/api\/v1\/da-services\/(crop-sown\/|farmers\/[^/]+\/crops$)/;
const IAM_TOKEN_ROUTES = new Set(["/api/v1/auth/refresh", "/api/v1/auth/logout"]);
const DROP_REQUEST = new Set(["host", "connection", "content-length", "accept-encoding", "x-forwarded-host", "x-forwarded-for", "x-forwarded-proto", "x-forwarded-port", "transfer-encoding"]);
const DROP_RESPONSE = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"]);
/** Header names the backend matches by exact spelling; everything else goes out as the browser named it (lowercase). */
const EXACT_CASE: Record<string, string> = { "x-csrf-token": "X-CSRF-Token" };

/** IAM's session cookies, read under any login-option prefix (e.g. `agent-X-Access-Token`). */
const IAM_COOKIES = ["X-Access-Token", "X-ID-Token", "X-Session-Id", "X-CSRF-Token"] as const;

const apiBase = () => process.env.API_BASE_URL ?? "http://127.0.0.1:8200";

function targetFor(request: NextRequest): URL {
  const { pathname, search } = request.nextUrl;
  const base = (CROP_SOWN.test(pathname) ? process.env.CROP_SOWN_BASE_URL : undefined) ?? apiBase();
  return new URL(`${pathname}${search}`, base);
}

/** The value of IAM cookie `base`, under its plain name or a login-option prefix. */
function iamCookie(request: NextRequest, base: string): string | undefined {
  return request.cookies.get(base)?.value || request.cookies.getAll().find((c) => c.name.endsWith(base))?.value || undefined;
}

/** The IAM cookies as one Cookie header, for IAM's refresh (it renews from X-Session-Id). */
function iamCookieHeader(request: NextRequest): string {
  return request.cookies
    .getAll()
    .filter((c) => IAM_COOKIES.some((base) => c.name.endsWith(base)))
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");
}

/** A new access token among IAM's Set-Cookie headers, if it sent one. */
function accessTokenFrom(setCookies: string[]): string | undefined {
  for (const header of setCookies) {
    const [pair] = header.split(";");
    const eq = pair.indexOf("=");
    if (eq > 0 && pair.slice(0, eq).trim().endsWith("X-Access-Token")) return pair.slice(eq + 1).trim() || undefined;
  }
  return undefined;
}

interface Upstream {
  res: http.IncomingMessage;
  setCookies: string[];
}

function send(target: URL, method: string, headers: Record<string, string>, body?: Buffer): Promise<Upstream | null> {
  const transport = target.protocol === "https:" ? https : http;
  const out: Record<string, string> = { ...headers, "ngrok-skip-browser-warning": "1", Host: target.host };
  if (body) out["Content-Length"] = String(body.length);
  return new Promise((resolve) => {
    const req = transport.request(target, { method, headers: out }, (res) => {
      const raw = res.headers["set-cookie"];
      resolve({ res, setCookies: raw ? (Array.isArray(raw) ? raw : [raw]) : [] });
    });
    req.on("error", () => resolve(null));
    req.end(body);
  });
}

const drain = (res: http.IncomingMessage) => new Promise<Buffer>((resolve) => {
  const chunks: Buffer[] = [];
  res.on("data", (c: Buffer) => chunks.push(c));
  res.on("end", () => resolve(Buffer.concat(chunks)));
  res.on("error", () => resolve(Buffer.concat(chunks)));
});

/** POST /api/v1/auth/refresh for the cookie session: the new access token (or null) and IAM's Set-Cookie headers. */
async function refreshIam(request: NextRequest, accessToken: string): Promise<{ token: string | null; setCookies: string[] }> {
  const body = Buffer.from(JSON.stringify({ access_token: accessToken }));
  const up = await send(new URL("/api/v1/auth/refresh", apiBase()), "POST", { "content-type": "application/json", accept: "application/json", cookie: iamCookieHeader(request) }, body);
  if (!up) return { token: null, setCookies: [] };
  await drain(up.res);
  const ok = (up.res.statusCode ?? 0) < 300;
  return { token: ok ? (accessTokenFrom(up.setCookies) ?? accessToken) : null, setCookies: up.setCookies };
}

async function forward(request: NextRequest): Promise<Response> {
  const target = targetFor(request);

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    const name = key.toLowerCase();
    if (!DROP_REQUEST.has(name)) headers[EXACT_CASE[name] ?? name] = value;
  });

  // The cookie session, when the caller did not send its own credentials.
  const cookieToken = headers.authorization ? undefined : iamCookie(request, "X-Access-Token");
  if (cookieToken) headers.authorization = `Bearer ${cookieToken}`;
  const cookieCsrf = iamCookie(request, "X-CSRF-Token");
  if (!headers["X-CSRF-Token"] && cookieCsrf) headers["X-CSRF-Token"] = cookieCsrf;

  let body = request.method === "GET" || request.method === "HEAD" ? undefined : Buffer.from(await request.arrayBuffer());
  // IAM's refresh and logout take the (HttpOnly) access token in the body; the page cannot read it, so it sends `{}`.
  if (cookieToken && request.method === "POST" && IAM_TOKEN_ROUTES.has(target.pathname) && (!body?.length || body.toString().trim() === "{}")) {
    body = Buffer.from(JSON.stringify({ access_token: cookieToken }));
    headers["content-type"] = "application/json";
  }

  let up = await send(target, request.method, headers, body);
  if (!up) return Response.json({ message: "Could not reach the server." }, { status: 502 });

  // An expired cookie session: renew it once with IAM and retry, then hand the browser IAM's new cookies.
  let relayCookies: string[] = [];
  if (up.res.statusCode === 401 && cookieToken && !IAM_TOKEN_ROUTES.has(target.pathname)) {
    const refreshed = await refreshIam(request, cookieToken);
    relayCookies = refreshed.setCookies;
    if (refreshed.token && refreshed.token !== cookieToken) {
      await drain(up.res);
      const retry = await send(target, request.method, { ...headers, authorization: `Bearer ${refreshed.token}` }, body);
      if (!retry) return Response.json({ message: "Could not reach the server." }, { status: 502 });
      up = retry;
    }
  }

  const { res } = up;
  const out = new Headers();
  for (const [key, value] of Object.entries(res.headers)) {
    if (DROP_RESPONSE.has(key) || value === undefined) continue;
    for (const v of Array.isArray(value) ? value : [value]) out.append(key, v);
  }
  for (const c of relayCookies) out.append("set-cookie", c);

  // Dev only: a failed call's status and the start of its body go to the dev server log.
  if (process.env.NODE_ENV !== "production" && (res.statusCode ?? 0) >= 400) {
    const buffer = await drain(res);
    console.log(`[api] ${request.method} ${target.pathname} <- ${res.statusCode} ${buffer.toString("utf8").slice(0, 400)}`);
    return new Response(new Uint8Array(buffer), { status: res.statusCode ?? 502, headers: out });
  }
  const noBody = request.method === "HEAD" || res.statusCode === 204 || res.statusCode === 304;
  return new Response(noBody ? null : (Readable.toWeb(res) as ReadableStream), { status: res.statusCode ?? 502, headers: out });
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
