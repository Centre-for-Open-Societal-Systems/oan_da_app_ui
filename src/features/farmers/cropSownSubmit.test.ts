import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./cropSownApi", () => ({ fetchIntakeForm: vi.fn(), saveFarmerCrop: vi.fn() }));

import { buildRecord, lookupRecord, saveStage } from "./cropSownSubmit";
import { fetchIntakeForm, saveFarmerCrop } from "./cropSownApi";
import { valueKey } from "./cropSown";
import type { Farmer } from "./types";

const farmer = { id: "FR-427495614351", regId: "FR-427495614351", name: "Test Farmer" } as Farmer;
const field = (field_name: string, extra: object = {}) => ({ field_name, label: field_name, data_type: "string", required: false, readonly: false, options: null, attribute_id: null, ...extra });
const saved = () => ({ farmer_id: farmer.id, submission_id: "sub-1", subject_record_id: "root-1", application_reference: "REF-1", section_payloads: [], record_name: farmer.id, draft_status: "DRAFT", approval_status: "PENDING", form_id: "f", register_id: "r" });

const planningForm = {
  form_id: "f", register_id: "r", form_mnemonic: "Crop planning intake", intake_forms: [],
  sections: [
    { section_id: "cropsown_intake_season_section_01", section_register_id: "r", section_mnemonic: "cs_intake_season", screen_section: null, is_list: false, fields: [field("crop_year"), field("production_season", { options: [{ value_id: "CROP_SEASON_MEHER", value_display: "Meher" }] })] },
    { section_id: "cropsown_planning_details_section_01", section_register_id: "r", section_mnemonic: "cs_planning_details", screen_section: null, is_list: true, fields: [field("land_id"), field("land_area", { data_type: "number" }), field("farmer_name", { readonly: true })] },
  ],
};

beforeEach(() => {
  vi.mocked(fetchIntakeForm).mockReset().mockResolvedValue(planningForm);
  vi.mocked(saveFarmerCrop).mockReset().mockResolvedValue(saved());
});

describe("lookupRecord", () => {
  it("sends a 12-digit Fayda number as fayda_fin and a 16-digit one as fayda_fan_id", () => {
    expect(lookupRecord(farmer, { [valueKey("identity", "fayda_fan_id")]: "1234 5678 9012" })).toEqual({ farmer_id: farmer.id, fayda_fin: "123456789012" });
    expect(lookupRecord(farmer, { [valueKey("identity", "fayda_fan_id")]: "1234567890123456" })).toEqual({ farmer_id: farmer.id, fayda_fan_id: "1234567890123456" });
    expect(lookupRecord(farmer, {})).toEqual({ farmer_id: farmer.id });
  });
});

describe("buildRecord", () => {
  it("keeps only the section's writable fields, numbers as numbers and catalog choices as value_id", () => {
    const values = { [valueKey("planning", "land_id")]: "L-1", [valueKey("planning", "land_area")]: "1.5", [valueKey("planning", "commodity")]: "Teff" };
    expect(buildRecord(values, ["planning"], planningForm.sections[1].fields)).toEqual({ land_id: "L-1", land_area: 1.5 });
    expect(buildRecord({ [valueKey("identity", "production_season")]: "Meher" }, ["identity"], planningForm.sections[0].fields)).toEqual({ production_season: "CROP_SEASON_MEHER" });
  });

  it("falls back to every filled form field when the live field list is unavailable", () => {
    expect(buildRecord({ [valueKey("planning", "land_id")]: "L-1" }, ["planning"], undefined)).toEqual({ land_id: "L-1" });
  });
});

describe("saveStage", () => {
  const values = {
    [valueKey("identity", "fayda_fan_id")]: "123456789012",
    [valueKey("identity", "crop_year")]: "2026",
    [valueKey("identity", "production_season")]: "Meher",
    [valueKey("planning", "land_id")]: "L-1",
  };

  it("opens the draft with the lookup and season, then saves the tab's list section linked to the subject record", async () => {
    const { drafts, saved: sections } = await saveStage({ farmer, tab: "planning", values, drafts: {} });
    const calls = vi.mocked(saveFarmerCrop).mock.calls;

    expect(sections).toEqual(["crop_farmer_lookup", "cropsown_intake_season_section_01", "cropsown_planning_details_section_01"]);
    expect(calls[0]).toEqual([farmer.id, "planning", [{ section_id: "crop_farmer_lookup", records: [{ farmer_id: farmer.id, fayda_fin: "123456789012" }] }], {}]);
    expect(calls[1][2][0]).toEqual({ section_id: "cropsown_intake_season_section_01", records: [{ internal_record_id: "root-1", crop_year: "2026", production_season: "CROP_SEASON_MEHER" }] });
    expect(calls[1][3]).toEqual({ submissionId: "sub-1" });
    const list = calls[2][2][0];
    expect(list.section_id).toBe("cropsown_planning_details_section_01");
    expect(list.records[0]).toMatchObject({ link_internal_record_id: "root-1", land_id: "L-1" });
    expect(list.records[0].internal_record_id).toEqual(expect.any(String));
    expect(calls[2][3]).toEqual({ submissionId: "sub-1" });
    expect(drafts.planning).toEqual({ submissionId: "sub-1", rootId: "root-1", reference: "REF-1" });
  });

  it("continues an existing draft without opening a new one", async () => {
    await saveStage({ farmer, tab: "planning", values, drafts: { planning: { submissionId: "sub-9", rootId: "root-9" } } });
    const calls = vi.mocked(saveFarmerCrop).mock.calls;
    expect(calls).toHaveLength(1);
    expect(calls[0][3]).toEqual({ submissionId: "sub-9" });
    expect(calls[0][2][0].records[0]).toMatchObject({ link_internal_record_id: "root-9" });
  });

  it("stops at the first refused save and leaves the drafts untouched", async () => {
    vi.mocked(saveFarmerCrop).mockRejectedValueOnce(new Error("Registry unavailable, try again."));
    await expect(saveStage({ farmer, tab: "planning", values, drafts: {} })).rejects.toThrow("Registry unavailable");
    expect(saveFarmerCrop).toHaveBeenCalledTimes(1);
  });
});
