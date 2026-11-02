import type { NextRequest } from "next/server";

// Forwards /iam-api/v1/* to the OAN auth service (IAM_BASE_URL). A plain rewrite keeps the browser's Host and
// X-Forwarded-Host (localhost:3000), and the staging nginx answers that with a 308 to https://localhost/…; fetching
// from here sends the target's own Host instead.
export const dynamic = "force-dynamic";

const IAM_BASE = () => process.env.IAM_BASE_URL ?? "https://grievance-backend-dev.oanstaging.com/api";
const DROP_REQUEST = new Set(["host", "connection", "content-length", "accept-encoding", "x-forwarded-host", "x-forwarded-for", "x-forwarded-proto", "x-forwarded-port"]);
const DROP_RESPONSE = new Set(["content-encoding", "content-length", "transfer-encoding", "connection"]);

async function forward(request: NextRequest, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;
  const target = new URL(`${IAM_BASE()}/v1/${path.join("/")}${request.nextUrl.search}`);

  const headers = new Headers();
  request.headers.forEach((value, key) => {
    if (!DROP_REQUEST.has(key.toLowerCase())) headers.set(key, value);
  });
  headers.set("ngrok-skip-browser-warning", "1");

  const hasBody = request.method !== "GET" && request.method !== "HEAD";
  let upstream: Response;
  try {
    upstream = await fetch(target, { method: request.method, headers, body: hasBody ? await request.arrayBuffer() : undefined, redirect: "manual", cache: "no-store" });
  } catch {
    return Response.json({ message: "Could not reach the sign-in service." }, { status: 502 });
  }

  const out = new Headers();
  upstream.headers.forEach((value, key) => {
    if (!DROP_RESPONSE.has(key.toLowerCase()) && key.toLowerCase() !== "set-cookie") out.append(key, value);
  });
  for (const cookie of upstream.headers.getSetCookie()) out.append("set-cookie", cookie);
  return new Response(upstream.body, { status: upstream.status, headers: out });
}

export { forward as GET, forward as POST, forward as PUT, forward as PATCH, forward as DELETE };
