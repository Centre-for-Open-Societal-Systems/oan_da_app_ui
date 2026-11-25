import { farmerActivity } from "./filters";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import {
  apiFarmerToFarmer,
  apiPlotToPlot,
  apiVisitToVisit,
  describeFarmerError,
  fetchFarmerLivestock,
  fetchFarmerPlots,
  fetchFarmerProfile,
  fetchFarmerVisits,
  listFarmers,
  profileToFarmer,
  toFarmerStatus,
  type ApiFarmer,
} from "./farmersApi";
import { ApiError } from "@/lib/api";
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

// A row of the live response (GET /da-services/farmers, Farmer Registry register).
const row: ApiFarmer = {
  functional_record_id: "FR-821910965037",
  internal_record_id: "95162d8b-1f6c-4d0c-beee-2f2e12710b2c",
  record_name: "Signoff Odk Test",
  first_name: "Signoff",
  middle_name: "Odk",
  last_name: "Test",
  primary_phone_number: "+251911200001",
  kebele_name: "Adi Hageray",
  woreda_name: "Tahtay Adiyabo",
  zone_name: "North Western",
  region_name: "Tigray",
  total_land_area: "2.25",
  total_plots: "2",
  record_image_url: "https://storage.example/photo.jpg",
  created_at: "2026-11-20T04:59:52.512221",
  last_approved_at: "2026-11-20T05:46:37.876763",
};

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "DA", { accessToken: "t", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

describe("farmer calls", () => {
  it("lists farmers by search text and page", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [row], meta: { api_version: "v1", number_of_items: 26, number_of_pages: 3 } }));

    await expect(listFarmers({ searchText: "Signoff", page: 2, pageSize: 10 })).resolves.toEqual({ items: [row], total: 26, totalPages: 3 });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/farmers?search_text=Signoff&current_page=2&page_size=10");
  });

  it("sends an empty search text when the search box is empty", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [], meta: { number_of_items: 0, number_of_pages: 0 } }));

    await expect(listFarmers({ searchText: "  " })).resolves.toEqual({ items: [], total: 0, totalPages: 0 });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/farmers?search_text=&current_page=1&page_size=50");
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

  it("reads the livestock of one farmer", async () => {
    const animals = [{ animal: "cattle", count: 3 }];
    fetchMock.mockResolvedValueOnce(json({ data: { livestock: animals } }));

    await expect(fetchFarmerLivestock("FR-512145929324")).resolves.toEqual(animals);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/farmers/FR-512145929324/livestock");
  });
});

describe("mapping", () => {
  it("turns a list row into a table farmer", () => {
    expect(apiFarmerToFarmer(row)).toMatchObject({
      id: "FR-821910965037",
      regId: "FR-821910965037",
      avatar: "https://storage.example/photo.jpg",
      phone: "+251911200001",
      totalPlots: 2,
      name: "Signoff Odk Test",
      kebele: "Adi Hageray",
      woreda: "Tahtay Adiyabo",
      region: "Tigray",
      crop: "—",
      landHa: 2.25,
      registeredAt: "20 Nov 2026",
      registeredTime: "05:46",
      status: "Verified",
      statusReason: undefined,
      visits: 0,
      lastVisit: "—",
    });
  });

  it("words farmer errors as the backend error table says", () => {
    expect(describeFarmerError(new ApiError("x", 403))).toBe("You don't have access to this farmer.");
    expect(describeFarmerError(new ApiError("x", 404))).toBe("Farmer not found.");
    expect(describeFarmerError(new ApiError("x", 502))).toBe("Registry unavailable, try again.");
    expect(describeFarmerError(new ApiError("usr: Field required", 400))).toBe("usr: Field required");
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
      .toEqual({ title: "Advisory · Completed", summary: "Rust found", date: "15 Oct 2026", time: "16:30" });
  });

  it("sends the Farmer ID for API farmers and the mock code for sample ones", () => {
    expect(registryCode(apiFarmerToFarmer(row))).toBe("FR-821910965037");
    expect(registryCode(apiFarmerToFarmer({ ...row, functional_record_id: null }))).toBe("95162d8b-1f6c-4d0c-beee-2f2e12710b2c");
    expect(registryCode(FARMERS[0])).toMatch(/^FR-\d{5}$/);
  });
});

// The collection's saved responses (OAN-DA-Farmers: "List farmers", "Farmer profile", "Farmer plots").
describe("mapping the collection's example responses", () => {
  it("shows a list row with nulls as dashes and initials, not as 0 ha or a broken photo", () => {
    const bare: ApiFarmer = { ...row, primary_phone_number: null, record_image_url: null, total_land_area: null, total_plots: null };
    expect(apiFarmerToFarmer(bare)).toMatchObject({ phone: "", avatar: undefined, landUnknown: true, plotsUnknown: true, landHa: 0, totalPlots: 0 });
    expect(apiFarmerToFarmer({ ...row, total_land_area: "0.00", total_plots: "0" })).toMatchObject({ landUnknown: false, plotsUnknown: false, landHa: 0, totalPlots: 0 });
  });

  it("reads the profile example: phone without +251, no verification_state or primary_crop", () => {
    const profile = {
      farmer_id: "38ef1bcb-a359-45b4-b813-dd0d2b05c864", reg_id: "FR-675618129549", name: "Aster Mulugeta Assefa", phone: "964815374", email: null, gender: "female",
      education_level: "PRIMARY", kebele: "Lekatit", woreda: "Shire Endaslasie town", region: "Tigray", total_land_area: 4.25, land_ownership: "HYBRID", household_size: 0,
      registration_date: "2026-10-30 14:16:40.292811", last_visit_date: null, last_visit_outcome: null, pending_actions: 0, can_edit: true, is_linked: false, incomplete_sections: [],
    };
    expect(profileToFarmer(profile, { plots: 2, visits: 0 })).toMatchObject({ regId: "FR-675618129549", phone: "+251964815374", status: "Verified", crop: "—", landHa: 4.25, landUnknown: false, registeredAt: "30 Oct 2026", registeredTime: "14:16" });
    expect(profileToFarmer({ ...profile, total_land_area: null }, { plots: 0, visits: 0 })).toMatchObject({ landUnknown: true });
  });

  it("shows the plots' registry codes as labels", () => {
    expect(apiPlotToPlot({ plot_id: "0065cd98", area_in_hectare: 1.75, land_ownership_type: "OWNER", soil_fertility: "SF_HIGH", current_land_use: "AGRICULTURAL", land_kebele: null, certificate_provided: false }))
      .toMatchObject({ areaHa: 1.75, tenure: "Owner", soil: "High", crop: "Agricultural", zone: "—" });
    expect(apiPlotToPlot({ plot_id: "5069b1b1", area_in_hectare: null, land_ownership_type: "TENANT", soil_fertility: "SF_MEDIUM", current_land_use: "GRAZING", land_kebele: null, certificate_provided: false }))
      .toMatchObject({ areaHa: 0, tenure: "Tenant", soil: "Medium", crop: "Grazing" });
  });

  it("words 503 and a 400's details as the integration guide says", () => {
    expect(describeFarmerError(new ApiError("x", 503))).toBe("Registry unavailable, try again.");
    expect(describeFarmerError(new ApiError("Validation failed", 400, { kebele: "Kebele is required", phone: "Invalid phone" }))).toBe("Kebele is required Invalid phone");
  });
});

describe("farmerActivity", () => {
  it("shows an approved farmer as Active and every other one as Inactive", () => {
    expect(farmerActivity("Verified")).toBe("Active");
    expect(farmerActivity("Pending")).toBe("Inactive");
    expect(farmerActivity("Flagged")).toBe("Inactive");
  });
});
