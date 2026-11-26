import { farmerActivity } from "./filters";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import {
  apiFarmerToFarmer,
  apiPlotToPlot,
  apiVisitToVisit,
  describeFarmerError,
  fetchFarmerLivestock,
  fetchFarmerDetails,
  fetchFarmerLandDetails,
  fetchFarmerVisits,
  listFarmers,
  profileToFarmer,
  resolveFarmerInternalId,
  toFarmerStatus,
  type ApiFarmer,
  type ApiFarmerDetails,
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

const UUID = "38ef1bcb-a359-45b4-b813-dd0d2b05c864";

// GET /farmers/{internal_id}/details, the collection's saved response (shortened).
const details: ApiFarmerDetails = {
  internal_record_id: UUID,
  functional_record_id: "FR-675618129549",
  record_name: "Aster Mulugeta Assefa",
  record_status: "ACTIVE",
  primary_phone_number: "+251964815374",
  email: null,
  region_name: "Tigray",
  zone_name: "North Western",
  woreda_name: "Shire Endaslasie town",
  kebele_name: "Lekatit",
  total_land_area: "4.25",
  total_plots: 2,
  record_image_url: "https://garage.example/photo.jpg",
  last_approved_at: "2026-11-12T15:48:07.346262",
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

  it("reads the details, visits and land details of one farmer", async () => {
    const plot = { internal_record_id: "0065cd98", area_in_hectare: "1.750000" };
    fetchMock
      .mockResolvedValueOnce(json({ data: { internal_record_id: UUID, record_name: "Aster" } }))
      .mockResolvedValueOnce(json({ data: { visits: [], total: 0 } }))
      .mockResolvedValueOnce(json({ data: [{ is_list: false, records: [{ internal_record_id: UUID }] }, { is_list: true, records: [plot] }] }));

    await fetchFarmerDetails(UUID);
    await expect(fetchFarmerVisits("FR-675618129549")).resolves.toEqual({ items: [], total: 0 });
    await expect(fetchFarmerLandDetails(UUID)).resolves.toEqual([plot]);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      `/api/v1/da-services/farmers/${UUID}/details`,
      "/api/v1/da-services/farmers/FR-675618129549/visits?limit=50&start=0",
      `/api/v1/da-services/farmers/${UUID}/land_details`,
    ]);
  });

  it("finds the internal id of a Farmer-ID through the list search; a UUID is used as it is", async () => {
    await expect(resolveFarmerInternalId(UUID)).resolves.toBe(UUID);
    expect(fetchMock).not.toHaveBeenCalled();

    fetchMock.mockResolvedValueOnce(json({ data: [row], meta: { number_of_items: 1, number_of_pages: 1 } }));
    await expect(resolveFarmerInternalId("FR-821910965037")).resolves.toBe(row.internal_record_id);
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/farmers?search_text=FR-821910965037&current_page=1&page_size=5");

    fetchMock.mockResolvedValueOnce(json({ data: [], meta: { number_of_items: 0, number_of_pages: 0 } }));
    await expect(resolveFarmerInternalId("FR-000")).rejects.toMatchObject({ status: 404 });
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
      internalId: "95162d8b-1f6c-4d0c-beee-2f2e12710b2c",
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
    expect(toFarmerStatus("ACTIVE")).toEqual({ status: "Verified" });
    expect(toFarmerStatus("PENDING_APPROVAL")).toEqual({ status: "Pending", reason: "Pending approval" });
    expect(toFarmerStatus("REJECTED")).toEqual({ status: "Flagged", reason: "Rejected" });
  });

  it("builds the profile farmer with the visit count and last visit from the visits call", () => {
    expect(profileToFarmer({ ...details, kebele_name: null }, { total: 4, lastAt: "2026-11-02T10:00:00" })).toMatchObject({ kebele: "—", crop: "—", visits: 4, lastVisit: "02 Nov 2026" });
    expect(profileToFarmer(details, { total: 0 })).toMatchObject({ visits: 0, lastVisit: "—" });
  });

  it("maps plots and visits for the tabs", () => {
    const plot = apiPlotToPlot({ internal_record_id: "LR-1", land_kebele: "Gedo", area_in_hectare: "0.800000", land_ownership_type: "OWNER", soil_fertility: "Good", current_land_use: "CROP_PRODUCTION", certificate_provided: true });
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

// The collection's saved responses (OAN-DA-Farmers: "List farmers", "Farmer details", "Farmer land details").
describe("mapping the collection's example responses", () => {
  it("shows a list row with nulls as dashes and initials, not as 0 ha or a broken photo", () => {
    const bare: ApiFarmer = { ...row, primary_phone_number: null, record_image_url: null, total_land_area: null, total_plots: null };
    expect(apiFarmerToFarmer(bare)).toMatchObject({ phone: "", avatar: undefined, landUnknown: true, plotsUnknown: true, landHa: 0, totalPlots: 0 });
    expect(apiFarmerToFarmer({ ...row, total_land_area: "0.00", total_plots: "0" })).toMatchObject({ landUnknown: false, plotsUnknown: false, landHa: 0, totalPlots: 0 });
  });

  it("reads the details example: string numbers, ACTIVE as verified, photo and registration from the record", () => {
    expect(profileToFarmer(details, { total: 0 })).toMatchObject({
      id: "FR-675618129549", regId: "FR-675618129549", internalId: UUID, name: "Aster Mulugeta Assefa", phone: "+251964815374",
      avatar: "https://garage.example/photo.jpg", region: "Tigray", woreda: "Shire Endaslasie town", kebele: "Lekatit",
      status: "Verified", crop: "—", landHa: 4.25, landUnknown: false, totalPlots: 2, plotsUnknown: false, registeredAt: "12 Nov 2026", registeredTime: "15:48",
    });
    expect(profileToFarmer({ ...details, total_land_area: null, total_plots: null }, { total: 0 })).toMatchObject({ landUnknown: true, plotsUnknown: true });
  });

  it("shows the plots' registry codes as labels", () => {
    expect(apiPlotToPlot({ internal_record_id: "0065cd98", area_in_hectare: "1.750000", land_ownership_type: "OWNER", soil_fertility: "SF_HIGH", current_land_use: "AGRICULTURAL", land_kebele: null, certificate_provided: false }))
      .toMatchObject({ code: "0065cd98", areaHa: 1.75, tenure: "Owner", soil: "High", crop: "Agricultural", zone: "—" });
    expect(apiPlotToPlot({ internal_record_id: "5069b1b1", area_in_hectare: null, land_ownership_type: "TENANT", soil_fertility: "SF_MEDIUM", current_land_use: "GRAZING", land_kebele: null, certificate_provided: false }))
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
