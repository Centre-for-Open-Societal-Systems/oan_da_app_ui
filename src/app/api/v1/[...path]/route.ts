import http from "node:http";
import https from "node:https";
import { Readable } from "node:stream";
import type { NextRequest } from "next/server";

// Forwards /api/v1/* to the DA Services API (API_BASE_URL; Crop Sown routes to CROP_SOWN_BASE_URL when it is set).
// It uses node:http(s) rather than a Next rewrite or fetch because both lowercase header names, and the backend wants
// X-CSRF-Token exactly in that spelling. Also adds ngrok-skip-browser-warning (ngrok's free tunnels otherwise answer a
// browser's request with an interstitial page) and sends the target's own Host.
export const dynamic = "force-dynamic";

const CROP_SOWN = /^\/api\/v1\/da-services\/(crop-sown\/|farmers\/[^/]+\/crops$)/;
const DROP_REQUEST = new Set(["host", "connection", "content-length", "accept-encoding", "x-forwarded-host", "x-forwarded-for", "x-forwarded-proto", "x-forwarded-port", "transfer-encoding"]);
const DROP_RESPONSE = new Set(["content-encoding", "content-length", "transfer-encoding", "connection", "keep-alive"]);
/** Header names the backend matches by exact spelling; everything else goes out as the browser named it (lowercase). */
const EXACT_CASE: Record<string, string> = { "x-csrf-token": "X-CSRF-Token" };

function targetFor(request: NextRequest): URL {
  const { pathname, search } = request.nextUrl;
  const base = (CROP_SOWN.test(pathname) ? process.env.CROP_SOWN_BASE_URL : undefined) ?? process.env.API_BASE_URL ?? "http://127.0.0.1:8200";
  return new URL(`${pathname}${search}`, base);
}

async function forward(request: NextRequest): Promise<Response> {
  const target = targetFor(request);

  const headers: Record<string, string> = {};
  request.headers.forEach((value, key) => {
    const name = key.toLowerCase();
    if (!DROP_REQUEST.has(name)) headers[EXACT_CASE[name] ?? name] = value;
  });
  headers["ngrok-skip-browser-warning"] = "1";
  headers.Host = target.host;

  const body = request.method === "GET" || request.method === "HEAD" ? undefined : Buffer.from(await request.arrayBuffer());
  if (body) headers["Content-Length"] = String(body.length);

  // Dev only: shows the exact spelling of the CSRF header on the way to the backend (the browser cannot see this hop).
  const sentCsrfAs = Object.keys(headers).find((k) => k.toLowerCase() === "x-csrf-token");
  if (process.env.NODE_ENV !== "production") console.log(`[api] ${request.method} ${target.origin}${target.pathname} -> CSRF header sent as: ${sentCsrfAs ?? "(none)"}`);

  const transport = target.protocol === "https:" ? https : http;
  return new Promise<Response>((resolve) => {
    const upstream = transport.request(target, { method: request.method, headers }, (res) => {
      const out = new Headers();
      for (const [key, value] of Object.entries(res.headers)) {
        if (DROP_RESPONSE.has(key) || value === undefined) continue;
        for (const v of Array.isArray(value) ? value : [value]) out.append(key, v);
      }
      // Dev only: visible in the browser's Network tab, response headers.
      if (process.env.NODE_ENV !== "production") out.set("x-debug-csrf-header-to-backend", sentCsrfAs ?? "(none)");
      const noBody = request.method === "HEAD" || res.statusCode === 204 || res.statusCode === 304;
      resolve(new Response(noBody ? null : (Readable.toWeb(res) as ReadableStream), { status: res.statusCode ?? 502, headers: out }));
    });
    upstream.on("error", () => resolve(Response.json({ message: "Could not reach the server." }, { status: 502 })));
    upstream.end(body);
  });
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
