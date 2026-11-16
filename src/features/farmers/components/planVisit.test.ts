import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import type { Farmer } from "../types";
import { joinNames, MAX_BATCH_FARMERS, planFarmers, toggleFarmer } from "./planVisit";

// Minimal in-memory Storage so the persisted auth store runs under Node.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.get(k) ?? null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
}

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "DA", { accessToken: "t", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

const farmer = (id: string) => ({ id, name: `Farmer ${id}` }) as Farmer;

describe("toggleFarmer", () => {
  it("adds a farmer and removes them on a second toggle", () => {
    const one = toggleFarmer([], farmer("a"));
    expect(one.map((f) => f.id)).toEqual(["a"]);
    expect(toggleFarmer(one, farmer("a"))).toEqual([]);
  });

  it("keeps a full batch at MAX_BATCH_FARMERS but still allows removing", () => {
    const full = Array.from({ length: MAX_BATCH_FARMERS }, (_, i) => farmer(String(i)));
    expect(toggleFarmer(full, farmer("x"))).toBe(full);
    expect(toggleFarmer(full, farmer("0"))).toHaveLength(MAX_BATCH_FARMERS - 1);
  });
});

describe("joinNames", () => {
  it("joins one, two and more names", () => {
    expect(joinNames([])).toBe("");
    expect(joinNames(["A"])).toBe("A");
    expect(joinNames(["A", "B"])).toBe("A and B");
    expect(joinNames(["A", "B", "C"])).toBe("A, B and C");
  });
});

describe("planFarmers", () => {
  const item = (f: Farmer) => ({ farmer_id: f.id, date: "2026-11-20", time: "10:00", visit_type: "Crop Survey", purpose: "", duration_min: 45, priority: "Medium" as const, notify_farmer_sms: true, client_op_id: `op-${f.id}` });
  const reply = (body: unknown, status = 201) => new Response(JSON.stringify(body), { status });

  it("sends the single-visit body for one farmer", async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: { name: "V-a", farmer_id: "a" } }));
    const out = await planFarmers([farmer("a")], { user: "da@example.com" }, item);
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ ...item(farmer("a")), user: "da@example.com" });
    expect(out.planned.map((p) => p.visit.name)).toEqual(["V-a"]);
  });

  it("sends one batch body for several farmers and splits created / failed", async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: { created: [{ name: "V-a", farmer_id: "a" }, { name: "V-c", farmer_id: "c" }], failed: [{ status: "failed", error: "Farmer not in your scope", code: "validation", request: { farmer_id: "b" } }], summary: {} } }));
    const out = await planFarmers([farmer("a"), farmer("b"), farmer("c")], { user: "da@example.com" }, item);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toEqual({ user: "da@example.com", visits: ["a", "b", "c"].map((id) => item(farmer(id))) });
    expect(out.planned.map((p) => p.visit.name)).toEqual(["V-a", "V-c"]);
    expect(out.failed).toEqual([{ farmer: farmer("b"), reason: "Farmer not in your scope" }]);
  });

  it("reads each farmer's reason from a 400 where none was planned", async () => {
    const failed = (id: string, error: string) => ({ status: "failed", error, code: "validation", request: { farmer_id: id } });
    fetchMock.mockResolvedValueOnce(reply({ message: "No visits planned", data: { created: [], failed: [failed("a", "scheduled_at is required."), failed("b", "Farmer already has an active visit")], summary: { created: 0 } } }, 400));
    const out = await planFarmers([farmer("a"), farmer("b")], { user: "da@example.com" }, item);
    expect(out.planned).toEqual([]);
    expect(out.failed.map((f) => [f.farmer.id, f.reason])).toEqual([["a", "scheduled_at is required."], ["b", "Farmer already has an active visit"]]);
  });

  it("fails every farmer with the error when the batch call itself fails", async () => {
    fetchMock.mockResolvedValueOnce(reply({ message: "Not permitted" }, 403));
    const out = await planFarmers([farmer("a"), farmer("b")], { user: "da@example.com" }, item);
    expect(out.failed.map((f) => f.reason)).toEqual(["Not permitted", "Not permitted"]);
  });

  it("sends the chosen DA's da_id when an officer plans", async () => {
    fetchMock.mockResolvedValueOnce(reply({ data: { name: "V-a", farmer_id: "a" } }));
    await planFarmers([farmer("a")], { user: "da1@example.com", daId: "DA-001" }, item);
    expect(JSON.parse(fetchMock.mock.calls[0][1]!.body as string)).toMatchObject({ user: "da1@example.com", da_id: "DA-001", farmer_id: "a" });
    fetchMock.mockResolvedValueOnce(reply({ data: { created: [{ name: "V-a", farmer_id: "a" }, { name: "V-b", farmer_id: "b" }], failed: [] } }));
    await planFarmers([farmer("a"), farmer("b")], { user: "da1@example.com", daId: "DA-001" }, item);
    expect(JSON.parse(fetchMock.mock.calls[1][1]!.body as string)).toMatchObject({ user: "da1@example.com", da_id: "DA-001" });
  });
});
