// @vitest-environment node
import http from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, expect, it } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "./route";

let server: http.Server;
let seen: { raw: string[]; url?: string; body: string } = { raw: [], body: "" };

beforeAll(async () => {
  server = http.createServer((req, res) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      seen = { raw: req.rawHeaders, url: req.url, body };
      res.setHeader("Set-Cookie", ["a=1", "b=2"]);
      res.setHeader("Content-Type", "application/json");
      res.end('{"ok":true}');
    });
  });
  await new Promise<void>((r) => server.listen(0, "127.0.0.1", r));
  process.env.API_BASE_URL = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  delete process.env.CROP_SOWN_BASE_URL;
});
afterAll(() => server.close());

it("sends X-CSRF-Token with exactly that spelling, plus the Bearer token and query", async () => {
  const req = new NextRequest("http://localhost:3000/api/v1/da-services/me?limit=1", { headers: { "x-csrf-token": "tok", authorization: "Bearer abc" } });
  const res = await GET(req);
  expect(res.status).toBe(200);
  expect(await res.json()).toEqual({ ok: true });
  expect(seen.url).toBe("/api/v1/da-services/me?limit=1");
  expect(seen.raw).toContain("X-CSRF-Token");
  expect(seen.raw).not.toContain("x-csrf-token");
  expect(seen.raw[seen.raw.indexOf("X-CSRF-Token") + 1]).toBe("tok");
  expect(seen.raw).toContain("ngrok-skip-browser-warning");
  expect(res.headers.getSetCookie()).toEqual(["a=1", "b=2"]);
});

it("forwards a JSON body", async () => {
  const req = new NextRequest("http://localhost:3000/api/v1/da-services/x", { method: "POST", body: '{"a":1}', headers: { "content-type": "application/json" } });
  expect((await POST(req)).status).toBe(200);
  expect(seen.body).toBe('{"a":1}');
});
