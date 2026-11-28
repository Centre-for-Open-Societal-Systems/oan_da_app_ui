import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import type { Farmer } from "@/features/farmers";
import { addFarmersToSegment, describeAddResult, listBeneficiarySegments, listFarmerBeneficiaries, resolveFarmerArea } from "./api";

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
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });

// The geo Master Data, by "<level>:<parent>".
const GEO: Record<string, { code: string; name: string }[]> = {
  "region:ET": [{ code: "ET01", name: "Tigray" }, { code: "ET04", name: "Oromia" }],
  "zone:ET04": [{ code: "ET0401", name: "North Western" }, { code: "ET0402", name: "West Shewa" }],
  "woreda:ET0401": [{ code: "ET040101", name: "Shire Endaslasie town" }],
  // Same woreda name in another zone, without the kebele: must not be picked.
  "woreda:ET0402": [{ code: "ET040201", name: "Shire Endaslasie town" }],
  "kebele:ET040101": [{ code: "ET04010101", name: "Lekatit" }],
  "kebele:ET040201": [{ code: "ET04020109", name: "Other" }],
};

/** Answers get_master_data from GEO and the beneficiary POST with `post`. */
function route(post: (body: Record<string, unknown>) => Response) {
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input), "http://x");
    if (url.pathname.endsWith("/get_master_data")) {
      const parent = url.searchParams.get("parent")!;
      return json({ data: (GEO[`${url.searchParams.get("field_name")}:${parent}`] ?? []).map((r) => ({ ...r, parent })) });
    }
    if (url.pathname.endsWith("/farmer-beneficiaries") && init?.method === "POST") return post(JSON.parse(String(init.body)));
    return json({ message: "unexpected" }, 500);
  });
}

const farmer = () => ({ id: "uuid-1", regId: "FR-101", name: "Aster", kebele: "Lekatit", woreda: "Shire Endaslasie town", region: "Oromia" }) as Farmer;

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "Supervisor", { accessToken: "t", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

describe("reads", () => {
  it("asks for segment counts", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [{ name: "BS-00001", title: "Package 1", short_desc: null, long_desc: null, farmer_beneficiary_count: 3 }] }));
    await expect(listBeneficiarySegments()).resolves.toHaveLength(1);
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/v1/da-services/beneficiary-segments?limit=500&get_count=true");
  });

  it("returns the rows and the total", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [{ name: "FB-1", farmer_id: "uuid-1" }], meta: { total: 7 } }));
    await expect(listFarmerBeneficiaries({ beneficiary_segment: "BS-00001" })).resolves.toMatchObject({ total: 7, items: [{ name: "FB-1" }] });
    expect(String(fetchMock.mock.calls[0][0])).toBe("/api/v1/da-services/farmer-beneficiaries?limit=500&beneficiary_segment=BS-00001");
  });
});

describe("resolveFarmerArea", () => {
  it("finds the region, the woreda among its zones and the kebele under that woreda by name", async () => {
    route(() => json({}));
    await expect(resolveFarmerArea(farmer())).resolves.toEqual({ region: "ET04", zone: "ET0401", woreda: "ET040101", kebele: "ET04010101" });
  });

  it("explains a kebele that is not in the Master Data", async () => {
    route(() => json({}));
    await expect(resolveFarmerArea({ kebele: "Nowhere", woreda: "Shire Endaslasie town", region: "Oromia" })).resolves.toEqual({ error: expect.stringContaining("Nowhere") });
  });
});

describe("addFarmersToSegment", () => {
  it("posts the farmers of one area together as farmer_ids and sorts out added / already in / failed", async () => {
    const posted: Record<string, unknown>[] = [];
    route((body) => {
      posted.push(body);
      return json({ data: { created: [{ name: "FB-9", farmer_id: "FR-101" }], skipped: ["FR-102"] } }, 201);
    });

    const r = await addFarmersToSegment(
      [farmer(), { ...farmer(), id: "uuid-2", regId: "FR-102", name: "Bekele" }, { ...farmer(), id: "uuid-3", regId: "FR-103", name: "Chala", kebele: "Nowhere" }, { ...farmer(), id: "uuid-4", regId: undefined, name: "Dawit" }],
      "BS-00001",
    );

    expect(r.failed.map((f) => f.farmer.name)).toEqual(["Chala", "Dawit"]);
    expect(posted).toEqual([{ farmer_ids: ["FR-101", "FR-102"], beneficiary_segment: "BS-00001", region: "ET04", zone: "ET0401", woreda: "ET040101", kebele: "ET04010101" }]);
    expect(r.added.map((a) => a.name)).toEqual(["FB-9"]);
    expect(r.skipped.map((f) => f.name)).toEqual(["Bekele"]);

    expect(describeAddResult(r, "Package 1")).toMatchObject({ tone: "warning", text: expect.stringContaining("1 farmer added to “Package 1”") });
  });

  it("sends every farmer with the area picked in the form, without looking it up", async () => {
    const posted: Record<string, unknown>[] = [];
    route((body) => {
      posted.push(body);
      return json({ data: { created: [{ name: "FB-9", farmer_id: "FR-101" }], skipped: [] } }, 201);
    });
    const area = { region: "ET01", zone: "ET0101", woreda: "ET010108", kebele: "ET01010805" };
    await addFarmersToSegment([farmer(), { ...farmer(), id: "uuid-3", regId: "FR-103", kebele: "Nowhere" }], "BS-00001", area);
    expect(posted).toEqual([{ farmer_ids: ["FR-101", "FR-103"], beneficiary_segment: "BS-00001", ...area }]);
    expect(fetchMock.mock.calls.some(([url]) => String(url).includes("get_master_data"))).toBe(false);
  });

  it("keeps the backend's reason when a POST is refused", async () => {
    route(() => json({ message: "Not permitted for this kebele." }, 403));
    const r = await addFarmersToSegment([farmer()], "BS-00001");
    expect(r.failed[0].reason).toContain("Not permitted");
    expect(describeAddResult(r, "Package 1").tone).toBe("error");
  });
});
