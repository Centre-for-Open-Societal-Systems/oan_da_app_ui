import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./cropSownApi", () => ({ fetchIntakeForm: vi.fn(), saveFarmerCrop: vi.fn() }));

import { buildRecord, clearIntakeFormCache, lookupRecord, MissingFieldError, optionId, optionLabel, saveStage } from "./cropSownSubmit";
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
  clearIntakeFormCache();
  vi.mocked(fetchIntakeForm).mockReset().mockResolvedValue(planningForm);
  vi.mocked(saveFarmerCrop).mockReset().mockResolvedValue(saved());
});

describe("lookupRecord", () => {
  it("sends a 12-digit Fayda number as fayda_fin and a 16-digit one as fayda_fan_id", () => {
    expect(lookupRecord(farmer, { [valueKey("identity", "fayda_fan_id")]: "1234 5678 9012" })).toEqual({ farmer_id: farmer.id, fayda_fin: "123456789012" });
    expect(lookupRecord(farmer, { [valueKey("identity", "fayda_fan_id")]: "1234567890123456" })).toEqual({ farmer_id: farmer.id, fayda_fan_id: "1234567890123456" });
    expect(lookupRecord(farmer, { [valueKey("identity", "fayda_fan_id")]: "5837 2910 4628 3715" })).toEqual({ farmer_id: farmer.id, fayda_fan_id: "5837291046283715" });
    expect(lookupRecord(farmer, {})).toEqual({ farmer_id: farmer.id });
  });

  it("refuses a Fayda number that is neither 12 nor 16 digits", () => {
    expect(() => lookupRecord(farmer, { [valueKey("identity", "fayda_fan_id")]: "4821 7735 863" })).toThrow("12 digits (FIN) or 16 digits (FAN)");
  });
});

describe("catalog choices", () => {
  it("read plain strings, value_id/value_display and other common shapes without throwing", () => {
    expect([optionId("Teff"), optionLabel("Teff")]).toEqual(["Teff", "Teff"]);
    expect([optionId({ value_id: "A", value_display: "Alpha" }), optionLabel({ value_id: "A", value_display: "Alpha" })]).toEqual(["A", "Alpha"]);
    expect(optionLabel({ value_id: "A" })).toBe("A");
    expect([optionId({ id: 7, label: "Seven" } as never), optionLabel({ id: 7, label: "Seven" } as never)]).toEqual(["7", "Seven"]);
    expect(optionLabel({} as never)).toBe("");
    expect(optionLabel(null)).toBe("");
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

  it("sends a new stage's lookup, season and detail sections in ONE call, with no record ids (the registry owns them)", async () => {
    const { drafts, saved: sections } = await saveStage({ farmer, tab: "planning", values, drafts: {} });
    const calls = vi.mocked(saveFarmerCrop).mock.calls;

    expect(calls).toHaveLength(1);
    expect(sections).toEqual(["crop_farmer_lookup", "cropsown_intake_season_section_01", "cropsown_planning_details_section_01"]);
    const [code, form, body, options] = calls[0];
    expect([code, form, options]).toEqual([farmer.id, "planning", {}]);
    expect(body[0]).toEqual({ section_id: "crop_farmer_lookup", records: [{ farmer_id: farmer.id, fayda_fin: "123456789012" }] });
    expect(body[1]).toEqual({ section_id: "cropsown_intake_season_section_01", records: [{ crop_year: "2026", production_season: "CROP_SEASON_MEHER" }] });
    expect(body[2]).toEqual({ section_id: "cropsown_planning_details_section_01", records: [{ land_id: "L-1" }] });
    expect(JSON.stringify(body)).not.toContain("internal_record_id");
    expect(JSON.stringify(body)).not.toContain("link_internal_record_id");
    expect(drafts.planning).toEqual({ submissionId: "sub-1", rootId: "root-1", reference: "REF-1" });
  });

  it("refuses a new stage without a Production Season, pointing at the tab where it is entered", async () => {
    const { [valueKey("identity", "production_season")]: _omitted, ...without } = values;
    void _omitted;
    await expect(saveStage({ farmer, tab: "planning", values: without, drafts: {} })).rejects.toMatchObject({ name: "MissingFieldError", tab: "planning" });
    expect(saveFarmerCrop).not.toHaveBeenCalled();
    expect(new MissingFieldError("x", "planning")).toBeInstanceOf(Error);
  });

  it("falls back to the registry's documented season codes when the intake-form route has not answered", async () => {
    vi.mocked(fetchIntakeForm).mockResolvedValue(null as never);
    await saveStage({ farmer, tab: "planning", values: { ...values, [valueKey("planning", "season")]: "Belg", [valueKey("planning", "commodity")]: "Teff" }, drafts: {} });
    const body = vi.mocked(saveFarmerCrop).mock.calls[0][2];
    expect(body[1].records[0]).toEqual({ crop_year: "2026", production_season: "SEASON_MEHER" });
    expect(body[2].records[0]).toMatchObject({ season: "SEASON_BELG", commodity: "CROP_TEFF" });
  });

  it("saves the same stage again into its draft, without a second lookup", async () => {
    await saveStage({ farmer, tab: "planning", values, drafts: { planning: { submissionId: "sub-9", rootId: "root-9" } } });
    const [, , body, options] = vi.mocked(saveFarmerCrop).mock.calls[0];
    expect(options).toEqual({ submissionId: "sub-9" });
    expect(body.map((s) => s.section_id)).toEqual(["cropsown_planning_details_section_01"]);
  });

  it("leaves the drafts untouched when the save is refused", async () => {
    vi.mocked(saveFarmerCrop).mockRejectedValueOnce(new Error("Registry unavailable, try again."));
    await expect(saveStage({ farmer, tab: "planning", values, drafts: {} })).rejects.toThrow("Registry unavailable");
  });
});
