import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchKpis, kpiTilesFor } from "./kpis";

class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.get(k) ?? null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "Supervisor", { accessToken: "t", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

describe("kpiTilesFor", () => {
  it("gives a DA four tiles and officers six", () => {
    expect(kpiTilesFor("DA")).toEqual(["visitsCompleted", "followUpsCompleted", "advisoriesCompleted", "raisedGrievances"]);
    for (const role of ["Supervisor", "Executive", "Admin"]) expect(kpiTilesFor(role)).toHaveLength(6);
  });
});

describe("fetchKpis", () => {
  it("reads each tile from its own API and leaves the tiles without one empty", async () => {
    fetchMock.mockImplementation(async (input) => {
      const url = String(input);
      if (url.startsWith("/api/v1/da-services/visits?")) return json({ data: [], meta: { total: 7 } });
      if (url.startsWith("/api/v1/da-services/grievances/summary")) return json({ data: { cards: [{ status: "Submitted", label: "Submitted", order: 2, is_open: 1, is_terminal: 0, count: 3 }, { status: "All", label: "All", order: 1, is_open: 0, is_terminal: 0, count: 12 }] } });
      if (url.startsWith("/api/v1/da-services/agents?")) return json({ data: { agents: [], total: 42 } });
      if (url.startsWith("/api/v1/da-services/farmers?")) return json({ data: [], meta: { number_of_items: 128 } });
      return json({}, 404);
    });

    const kpis = await fetchKpis(kpiTilesFor("Supervisor"), { from: "2026-10-30", to: "2026-11-28" });

    expect(kpis).toEqual({
      visitsCompleted: { value: 7 },
      followUpsCompleted: { value: null },
      advisoriesCompleted: { value: null },
      raisedGrievances: { value: 12 },
      agents: { value: 42 },
      farmers: { value: 128 },
    });
    const visitsUrl = fetchMock.mock.calls.map(([u]) => String(u)).find((u) => u.includes("/visits?"))!;
    expect(new URL(visitsUrl, "http://x").searchParams.toString()).toBe("status=Completed&from=2026-10-30&to=2026-11-28&limit=1");
  });

  it("marks only the tile whose call failed", async () => {
    fetchMock.mockImplementation(async (input) => (String(input).includes("/grievances/summary") ? json({ status: "error", message: "Grievance Service unavailable" }, 503) : json({ data: [], meta: { total: 0 } })));

    const kpis = await fetchKpis(["visitsCompleted", "raisedGrievances"], { from: "2026-11-01", to: "2026-11-28" });

    expect(kpis.visitsCompleted).toEqual({ value: 0 });
    expect(kpis.raisedGrievances.value).toBeNull();
    expect(kpis.raisedGrievances.error).toBeTruthy();
  });
});
