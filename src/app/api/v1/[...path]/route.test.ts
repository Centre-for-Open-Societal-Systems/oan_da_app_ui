// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, beforeEach, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

interface Seen {
  raw: string[];
  url?: string;
  body: string;
  headers: http.IncomingHttpHeaders;
}

let server: http.Server;
let calls: Seen[] = [];
/** How the fake backend answers a call; the default is 200 {"ok":true} with two cookies. */
let answer: (call: Seen) => { status?: number; body?: string; cookies?: string[] } = () => ({});

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      const call = { raw: req.rawHeaders, url: req.url, body, headers: req.headers };
      calls.push(call);
      const a = answer(call);
      res.statusCode = a.status ?? 200;
      res.setHeader("Set-Cookie", a.cookies ?? ["a=1", "b=2"]);
      res.setHeader("Content-Type", "application/json");
      res.end(a.body ?? '{"ok":true}');
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.API_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  delete process.env.CROP_SOWN_BASE_URL;
});
afterAll(() => server.close());
beforeEach(() => {
  calls = [];
  answer = () => ({});
});

const IAM_COOKIES = "X-Access-Token=old; X-ID-Token=id; X-Session-Id=sess; X-CSRF-Token=csrf; other=x";

it("sends X-CSRF-Token with exactly that spelling, plus the Bearer token and query", async () => {
  const req = new NextRequest("http://localhost:3000/api/v1/da-services/me?limit=1", { headers: { "x-csrf-token": "tok", authorization: "Bearer abc" } });
  const res = await GET(req);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  const [seen] = calls;
  expect(seen.url).toBe("/api/v1/da-services/me?limit=1");
  expect(seen.raw).toContain("X-CSRF-Token");
  expect(seen.raw).not.toContain("x-csrf-token");
  expect(seen.raw[seen.raw.indexOf("X-CSRF-Token") + 1]).toBe("tok");
  expect(seen.headers.authorization).toBe("Bearer abc");
  expect(seen.raw).toContain("ngrok-skip-browser-warning");
  expect(res.headers.getSetCookie()).toEqual(["a=1", "b=2"]);
});

it("forwards a JSON body", async () => {
  const req = new NextRequest("http://localhost:3000/api/v1/da-services/x", { method: "POST", body: '{"a":1}', headers: { "content-type": "application/json" } });
  expect((await POST(req)).status).toBe(200);
  expect(calls[0].body).toBe('{"a":1}');
});

it("turns IAM's cookies into the Bearer token and X-CSRF-Token", async () => {
  await GET(new NextRequest("http://localhost:3000/api/v1/da-services/farmers", { headers: { cookie: IAM_COOKIES } }));
  expect(calls[0].headers.authorization).toBe("Bearer old");
  expect(calls[0].headers["x-csrf-token"]).toBe("csrf");
});

it("reads IAM's cookies under a login-option prefix", async () => {
  await GET(new NextRequest("http://localhost:3000/api/v1/da-services/farmers", { headers: { cookie: "agent-X-Access-Token=pref; agent-X-CSRF-Token=c2" } }));
  expect(calls[0].headers.authorization).toBe("Bearer pref");
  expect(calls[0].headers["x-csrf-token"]).toBe("c2");
});

it("renews an expired IAM session once, retries with the new token and relays IAM's cookies", async () => {
  answer = (call) => {
    if (call.url === "/api/v1/auth/refresh") return { cookies: ["X-Access-Token=new; Domain=.development.oanstaging.com; Path=/; HttpOnly", "X-CSRF-Token=csrf2; Path=/"] };
    return call.headers.authorization === "Bearer new" ? { body: '{"farmers":[]}' } : { status: 401, body: '{"message":"Authentication failed"}' };
  };
  const res = await GET(new NextRequest("http://localhost:3000/api/v1/da-services/farmers", { headers: { cookie: IAM_COOKIES } }));

  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ farmers: [] });
  expect(calls.map((c) => c.url)).toEqual(["/api/v1/da-services/farmers", "/api/v1/auth/refresh", "/api/v1/da-services/farmers"]);
  expect(JSON.parse(calls[1].body)).toEqual({ access_token: "old" });
  expect(calls[1].headers.cookie).toBe("X-Access-Token=old; X-ID-Token=id; X-Session-Id=sess; X-CSRF-Token=csrf");
  expect(res.headers.getSetCookie()).toEqual(expect.arrayContaining(["X-Access-Token=new; Domain=.development.oanstaging.com; Path=/; HttpOnly"]));
});

it("answers 401 when IAM refuses the renewal, relaying the cookies IAM clears", async () => {
  answer = (call) => (call.url === "/api/v1/auth/refresh" ? { status: 401, cookies: ["X-Access-Token=; Max-Age=0"] } : { status: 401 });
  const res = await GET(new NextRequest("http://localhost:3000/api/v1/da-services/farmers", { headers: { cookie: IAM_COOKIES } }));
  expect(res.status).toBe(401);
  expect(calls).toHaveLength(2);
  expect(res.headers.getSetCookie()).toContain("X-Access-Token=; Max-Age=0");
});

it("does not try to renew a call that brought its own token", async () => {
  answer = () => ({ status: 401 });
  await GET(new NextRequest("http://localhost:3000/api/v1/da-services/farmers", { headers: { authorization: "Bearer mine", cookie: IAM_COOKIES } }));
  expect(calls).toHaveLength(1);
  expect(calls[0].headers.authorization).toBe("Bearer mine");
});

it("sends a sign-in without the old session's Bearer token and relays the new session cookies", async () => {
  answer = () => ({ cookies: ["X-Access-Token=new; HttpOnly; Path=/", "X-CSRF-Token=c2; Path=/"] });
  const res = await POST(new NextRequest("http://localhost:3000/api/v1/da-services/auth/login", { method: "POST", body: '{"usr":"u","pwd":"p"}', headers: { "content-type": "application/json", cookie: IAM_COOKIES } }));
  expect(calls).toHaveLength(1);
  expect(calls[0].headers.authorization).toBeUndefined();
  expect(JSON.parse(calls[0].body)).toEqual({ usr: "u", pwd: "p" });
  expect(res.headers.getSetCookie()).toEqual(["X-Access-Token=new; HttpOnly; Path=/", "X-CSRF-Token=c2; Path=/"]);
});

it("fills the IAM access token into an empty logout body", async () => {
  await POST(new NextRequest("http://localhost:3000/api/v1/auth/logout", { method: "POST", body: "{}", headers: { "content-type": "application/json", cookie: IAM_COOKIES } }));
  expect(JSON.parse(calls[0].body)).toEqual({ access_token: "old" });
});

it("leaves a logout body that names its own token alone", async () => {
  await POST(new NextRequest("http://localhost:3000/api/v1/auth/logout", { method: "POST", body: '{"refresh_token":"r"}', headers: { "content-type": "application/json", cookie: IAM_COOKIES } }));
  expect(JSON.parse(calls[0].body)).toEqual({ refresh_token: "r" });
});
