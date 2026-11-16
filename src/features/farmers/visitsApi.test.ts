import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { planVisit } from "./visitsApi";
import { durationMinutes, splitPriority } from "./components/planVisit";

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

describe("planVisit", () => {
  it("posts the visit and returns the stored record", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { name: "DA-VIS-0001", physical_status: "Planned" } }), { status: 201 }));
    const body = { farmer_id: "FRM-000103", user: "u", date: "2026-10-16", time: "10:30", visit_type: "Advisory", purpose: "Input advisory", duration_min: 60, priority: "High" as const, notify_farmer_sms: true, client_op_id: "op-1" };

    await expect(planVisit(body)).resolves.toMatchObject({ name: "DA-VIS-0001" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/visits");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual(body);
  });
});

describe("form helpers", () => {
  it("reads minutes from the duration label", () => {
    expect(durationMinutes("60 min")).toBe(60);
    expect(durationMinutes("")).toBe(45);
  });

  it("splits a priority label into level and reason", () => {
    expect(splitPriority("High — overdue by 4 days")).toEqual({ level: "High", reason: "Overdue by 4 days" });
    expect(splitPriority("Low — routine")).toEqual({ level: "Low", reason: "Routine" });
    expect(splitPriority("Medium")).toEqual({ level: "Medium", reason: undefined });
  });
});
