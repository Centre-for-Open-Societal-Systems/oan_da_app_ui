import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import {
  apiFarmerToFarmer,
  apiPlotToPlot,
  apiVisitToVisit,
  fetchFarmerPlots,
  fetchFarmerProfile,
  fetchFarmerVisits,
  listFarmers,
  profileToFarmer,
  toFarmerStatus,
  type ApiFarmer,
} from "./farmersApi";
import { registryCode } from "./components/planVisit";
import { FARMERS } from "./data";

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

const json = (body: unknown) => new Response(JSON.stringify(body));
const fetchMock = vi.fn<typeof fetch>();

const row: ApiFarmer = {
  farmer_id: "FRM-000103",
  reg_id: "FR-88341",
  farmer_name: "Lelise Gudeta",
  phone: "+251 91 246 3157",
  kebele: "Bako Tibe",
  woreda: "ET04-W01",
  region: "ET04",
  total_land_hectares: 1.2,
  registration_state: "APPROVED",
  registered_at: "2026-05-12 08:20:00",
  visit_count: 9,
  last_visit: "2026-06-12",
};

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "DA", { accessToken: "t", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

describe("farmer calls", () => {
  it("lists farmers with filters and paging", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { farmers: [row], total: 1, page: { limit: 20, start: 0 } } }));

    await expect(listFarmers({ kebele: "Bako Tibe", limit: 20 })).resolves.toEqual({ items: [row], total: 1, page: { limit: 20, start: 0 } });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/farmers?kebele=Bako+Tibe&limit=20");
  });

  it("reads the profile, visits and plots of one farmer", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ data: { farmer_id: "FRM-000103", name: "Lelise" } }))
      .mockResolvedValueOnce(json({ data: { visits: [], total: 0 } }))
      .mockResolvedValueOnce(json({ data: { plots: [] } }));

    await fetchFarmerProfile("FRM-000103");
    await expect(fetchFarmerVisits("FRM-000103")).resolves.toEqual({ items: [], total: 0 });
    await expect(fetchFarmerPlots("FRM-000103")).resolves.toEqual([]);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/da-services/farmers/FRM-000103/profile",
      "/api/v1/da-services/farmers/FRM-000103/visits?limit=50&start=0",
      "/api/v1/da-services/farmers/FRM-000103/plots",
    ]);
  });
});

describe("mapping", () => {
  it("turns a list row into a table farmer", () => {
    expect(apiFarmerToFarmer(row)).toMatchObject({
      id: "FRM-000103",
      name: "Lelise Gudeta",
      kebele: "Bako Tibe",
      crop: "—",
      landHa: 1.2,
      registeredAt: "12 May 2026",
      registeredTime: "08:20",
      status: "Verified",
      visits: 9,
      lastVisit: "12 Jun 2026",
    });
  });

  it("maps registry states onto the status pill", () => {
    expect(toFarmerStatus("APPROVED")).toEqual({ status: "Verified" });
    expect(toFarmerStatus("PENDING_APPROVAL")).toEqual({ status: "Pending", reason: "Pending approval" });
    expect(toFarmerStatus("REJECTED")).toEqual({ status: "Flagged", reason: "Rejected" });
  });

  it("builds the profile farmer with plot and visit counts", () => {
    const profile = {
      farmer_id: "FRM-000103", reg_id: "FR-88341", name: "Lelise Gudeta", kebele: null, woreda: "ET04-W01", region: "ET04", phone: null, email: null,
      verification_state: null, pending_actions: 0, household_size: 5, total_land_area: 2.5, land_ownership: "OWNER", primary_crop: "Teff",
      registration_date: "2026-05-12", last_visit_date: null, last_visit_outcome: null, can_edit: true, is_linked: true,
    };
    expect(profileToFarmer(profile, { plots: 2, visits: 4 })).toMatchObject({ kebele: "—", crop: "Teff", landHa: 2.5, totalPlots: 2, visits: 4, lastVisit: "—", registeredTime: "" });
  });

  it("maps plots and visits for the tabs", () => {
    const plot = apiPlotToPlot({ plot_id: "LR-1", land_kebele: "Gedo", area_in_hectare: 0.8, land_ownership_type: "OWNER", soil_fertility: "Good", current_land_use: "CROP_PRODUCTION", certificate_provided: true });
    expect(plot).toMatchObject({ code: "LR-1", crop: "Crop production", areaHa: 0.8, soil: "Good", zone: "Gedo", tenure: "Owner" });
    expect(Number.isNaN(plot.lat)).toBe(true);

    expect(apiVisitToVisit({ name: "DA-VIS-1", scheduled_at: "2026-10-15T16:30:00", physical_status: "Physical Visit Complete", visit_type: "Advisory", outcome: "Rust found", da_id: "DA-000003", completed_at: null }))
      .toEqual({ title: "Advisory · Physical Visit Complete", summary: "Rust found", date: "15 Oct 2026", time: "16:30" });
  });

  it("sends the registry id for API farmers and the mock code for sample ones", () => {
    expect(registryCode(apiFarmerToFarmer(row))).toBe("FRM-000103");
    expect(registryCode(FARMERS[0])).toMatch(/^FR-\d{5}$/);
  });
});
