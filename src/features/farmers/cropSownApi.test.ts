import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { ApiError } from "@/lib/api";
import { describeCropSownError, fetchGeoLevelValues, fetchIntakeForm, isCropsNotFound, listFarmerCrops, saveFarmerCrop } from "./cropSownApi";

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

beforeEach(() => {
  vi.stubGlobal("localStorage", new MemoryStorage());
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockReset();
  useAuthStore.setState({ tokens: { accessToken: "tok", refreshToken: "r", expiresAt: Date.now() + 3_600_000 } });
});

describe("Crop Sown API", () => {
  it("reads an intake form with the stage as `form`", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { form_id: "f1", sections: [] } }));
    expect((await fetchIntakeForm("planning")).form_id).toBe("f1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/crop-sown/intake-form?form=planning");
    expect((init?.headers as Record<string, string>).Authorization).toBe("Bearer tok");
  });

  it("reads regions, then zones of a region", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { values: [{ level_value_id: "ET01", level_value_mnemonic: "Tigray" }] } }));
    expect(await fetchGeoLevelValues("l1")).toEqual([{ level_value_id: "ET01", level_value_mnemonic: "Tigray" }]);
    fetchMock.mockResolvedValueOnce(json({ data: { values: [] } }));
    await fetchGeoLevelValues("l2", "ET01");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/crop-sown/geo-level-values?level_id=l1");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/da-services/crop-sown/geo-level-values?level_id=l2&parent_level_value_id=ET01");
  });

  it("posts the sections of a stage for the farmer", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { submission_id: "s1" } }));
    const sections = [{ section_id: "crop_farmer_lookup", records: [{ farmer_id: "FR-1", fayda_fin: "123" }] }];
    expect((await saveFarmerCrop("FR-1", "planning", sections)).submission_id).toBe("s1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/farmers/FR-1/crops");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ form: "planning", sections });
  });

  it("lists the crops of a farmer", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { farmer_id: "FR-1", crops: [{ submission_id: "s1" }] } }));
    expect(await listFarmerCrops("FR-1")).toHaveLength(1);
  });

  it("words the error for the status", () => {
    expect(describeCropSownError(new ApiError("x", 404))).toBe("Farmer or submission not found.");
    expect(describeCropSownError(new ApiError("bad field", 400))).toBe("bad field");
  });
});

describe("isCropsNotFound", () => {
  it("is true only for a 404", () => {
    expect(isCropsNotFound(new ApiError("Farmer not found.", 404))).toBe(true);
    expect(isCropsNotFound(new ApiError("Registry down", 503))).toBe(false);
    expect(isCropsNotFound(new Error("offline"))).toBe(false);
  });
});
