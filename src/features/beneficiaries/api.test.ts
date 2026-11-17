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

const AREAS = {
  Kebele: [
    { code: "ET04-W01-K01", level: "Kebele", parent_area: "ET04-W01", name_en: "Lekatit", name_am: null },
    // Same kebele name in another woreda: must not be picked.
    { code: "ET03-W02-K09", level: "Kebele", parent_area: "ET03-W02", name_en: "Lekatit", name_am: null },
  ],
  Woreda: [{ code: "ET04-W01", level: "Woreda", parent_area: "ET04-Z01", name_en: "Shire Endaslasie town", name_am: null }],
  Zone: [{ code: "ET04-Z01", level: "Zone", parent_area: "ET04", name_en: "North Western", name_am: null }],
};

/** Answers /master/areas from AREAS and the beneficiary POST with `post`. */
function route(post: (body: Record<string, string>) => Response) {
  fetchMock.mockImplementation(async (input, init) => {
    const url = new URL(String(input), "http://x");
    if (url.pathname.endsWith("/master/areas")) return json({ data: AREAS[url.searchParams.get("level") as keyof typeof AREAS] ?? [] });
    if (url.pathname.endsWith("/farmer-beneficiaries") && init?.method === "POST") return post(JSON.parse(String(init.body)));
    return json({ message: "unexpected" }, 500);
  });
}

const farmer = () => ({ id: "uuid-1", name: "Aster", kebele: "Lekatit", woreda: "Shire Endaslasie town" }) as Farmer;

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
  it("finds the kebele under the farmer's woreda and walks up to zone and region", async () => {
    route(() => json({}));
    await expect(resolveFarmerArea(farmer())).resolves.toEqual({ region: "ET04", zone: "ET04-Z01", woreda: "ET04-W01", kebele: "ET04-W01-K01" });
  });

  it("explains a kebele that is not in the area master", async () => {
    route(() => json({}));
    await expect(resolveFarmerArea({ kebele: "Nowhere", woreda: "Shire Endaslasie town" })).resolves.toEqual({ error: expect.stringContaining("Nowhere") });
  });
});

describe("addFarmersToSegment", () => {
  it("posts each farmer with area codes and sorts out added / already in / failed", async () => {
    const posted: Record<string, string>[] = [];
    route((body) => {
      posted.push(body);
      if (body.farmer_id === "uuid-2") return json({ message: "Farmer uuid-2 is already in segment BS-00001." }, 409);
      return json({ data: { name: "FB-9", ...body } }, 201);
    });

    const r = await addFarmersToSegment([farmer(), { ...farmer(), id: "uuid-2", name: "Bekele" }, { ...farmer(), id: "uuid-3", name: "Chala", kebele: "Nowhere" }], "BS-00001");

    expect(posted[0]).toEqual({ farmer_id: "uuid-1", beneficiary_segment: "BS-00001", region: "ET04", zone: "ET04-Z01", woreda: "ET04-W01", kebele: "ET04-W01-K01" });
    expect(posted).toHaveLength(2);
    expect(r.added.map((a) => a.name)).toEqual(["FB-9"]);
    expect(r.skipped.map((f) => f.name)).toEqual(["Bekele"]);
    expect(r.failed.map((f) => f.farmer.name)).toEqual(["Chala"]);
    expect(describeAddResult(r, "Package 1")).toMatchObject({ tone: "warning", text: expect.stringContaining("1 farmer added to “Package 1”") });
  });

  it("keeps the backend's reason when a POST is refused", async () => {
    route(() => json({ message: "Not permitted for this kebele." }, 403));
    const r = await addFarmersToSegment([farmer()], "BS-00001");
    expect(r.failed[0].reason).toContain("Not permitted");
    expect(describeAddResult(r, "Package 1").tone).toBe("error");
  });
});
