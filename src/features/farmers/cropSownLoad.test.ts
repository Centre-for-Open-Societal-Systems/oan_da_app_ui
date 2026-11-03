import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./cropSownApi", () => ({ fetchIntakeForm: vi.fn(), saveFarmerCrop: vi.fn(), listFarmerCrops: vi.fn(), fetchFarmerCrop: vi.fn() }));

import { loadCropDetails, sectionRows, stageValues, submissionsOf, summaryOf, summaryValues, toFormValue } from "./cropSownLoad";
import { clearIntakeFormCache } from "./cropSownSubmit";
import { fetchFarmerCrop, fetchIntakeForm, listFarmerCrops } from "./cropSownApi";
import { CROP_SOWN_FORM } from "./cropSown";

const field = (field_name: string, extra: object = {}) => ({ field_name, label: field_name, data_type: "string", required: false, readonly: false, options: null, attribute_id: null, ...extra });
const intake = (form_id: string, sections: object[] = []) => ({ form_id, register_id: "r", form_mnemonic: form_id, intake_forms: [], sections }) as never;
const planningIntake = intake("form-planning", [
  { section_id: "cropsown_intake_season_section_01", section_register_id: "r", section_mnemonic: "s", screen_section: null, is_list: false, fields: [field("production_season", { options: [{ value_id: "SEASON_MEHER", value_display: "Meher" }] })] },
]);

beforeEach(() => {
  clearIntakeFormCache();
  vi.mocked(listFarmerCrops).mockReset();
  vi.mocked(fetchFarmerCrop).mockReset();
  vi.mocked(fetchIntakeForm).mockReset().mockImplementation(async (form) => (form === "planning" ? planningIntake : intake(`form-${form}`)));
});

describe("toFormValue", () => {
  const def = (key: string, extra: object = {}) => ({ key, label: key, type: "select" as const, ...extra });
  it("turns the registry's codes back into the form's labels", () => {
    expect(toFormValue("PLOT_CATEGORY_ANNUAL_CROP", def("plot_category", { optionValues: { "Annual Crop": "PLOT_CATEGORY_ANNUAL_CROP" } }), undefined)).toBe("Annual Crop");
    expect(toFormValue(true, def("is_plot_registered", { optionValues: { Yes: true, No: false } }), undefined)).toBe("Yes");
    expect(toFormValue("CROP_TEFF", def("commodity", { fallbackValues: { Teff: "CROP_TEFF" } }), undefined)).toBe("Teff");
    expect(toFormValue("SEASON_MEHER", def("production_season"), field("production_season", { options: [{ value_id: "SEASON_MEHER", value_display: "Meher" }] }))).toBe("Meher");
    expect(toFormValue(["A", "B"], def("x", { type: "multiselect" }), undefined)).toBe("A, B");
    expect(toFormValue("2026-05-01T00:00:00", def("planned_date", { type: "date" }), undefined)).toBe("2026-05-01");
    expect(toFormValue(null, def("x"), undefined)).toBe("");
  });
});

describe("sectionRows", () => {
  it("finds section records however the API nests them", () => {
    const rows = sectionRows([{ tabs: [{ sections: [{ section_id: "a", records: [{ x: 1 }] }] }] }, { section_id: "b", section_payload: [{ y: 2 }] }]);
    expect(rows.map((r) => r.sectionId)).toEqual(["a", "b"]);
  });
});

describe("stageValues", () => {
  it("fills the Identity and Planning sections of the Planning tab", () => {
    const values = stageValues(
      "planning",
      [
        { sectionId: "crop_farmer_lookup", rows: [{ farmer_id: "FR-1", fayda_fan_id: "5837291046283715" }] },
        { sectionId: "cropsown_intake_season_section_01", rows: [{ crop_year: "2026", production_season: "SEASON_MEHER" }] },
        { sectionId: "cropsown_planning_details_section_01", rows: [{ land_id: "L-1", land_area: 1.5, plot_category: "PLOT_CATEGORY_ANNUAL_CROP" }] },
      ],
      planningIntake,
    );
    expect(values).toMatchObject({ "identity.crop_year": "2026", "identity.production_season": "Meher", "identity.fayda_fan_id": "5837291046283715", "planning.land_id": "L-1", "planning.land_area": "1.5", "planning.plot_category": "Annual Crop" });
    expect(CROP_SOWN_FORM[0].key).toBe("planning");
  });
});

// The shape of GET /farmers/{id}/crops: drafts (no region, no year), the approved submission, and the register's own row.
const display = (extra: Record<string, string | null> = {}) =>
  Object.entries({ fayda_fan_id: "5837291046283715", region_name: null, zone_name: null, woreda_name: null, kebele_name: null, crop_year: null, ...extra }).map(([field_name, value], order) => ({ field_name, order, value }));
const LIST = [
  { submission_id: "sub-new", form_id: "form-planning", record_name: "FR-9", draft_status: "DRAFT", approval_status: "PENDING", last_updated_at: "2026-11-02T10:08:27", display_fields: display() },
  { submission_id: "sub-old", form_id: "form-planning", record_name: "FR-9", draft_status: "DRAFT", approval_status: "PENDING", last_updated_at: "2026-11-02T08:17:28", display_fields: display() },
  { submission_id: "sub-final", form_id: "form-planning", record_name: "FR-9", draft_status: "FINAL", approval_status: "APPROVED", last_updated_at: "2026-11-02T06:34:26", display_fields: display({ region_name: "Tigray", zone_name: "North Western", woreda_name: "Laelay Koraro", crop_year: "2026" }) },
  { internal_record_id: "reg-1", functional_record_id: "REG/S1/2026/28979", record_name: "FR-9", display_fields: display({ region_name: "Tigray" }) },
] as never;

describe("the crops list", () => {
  it("separates submissions from the register row, newest first", () => {
    expect(submissionsOf([LIST[3], LIST[2], LIST[0], LIST[1]] as never).map((c) => c.submission_id)).toEqual(["sub-new", "sub-old", "sub-final"]);
  });

  it("takes each summary value from the newest row that has it (drafts have none)", () => {
    expect(summaryOf(LIST)).toMatchObject({ fayda_fan_id: "5837291046283715", region_name: "Tigray", zone_name: "North Western", woreda_name: "Laelay Koraro", crop_year: "2026" });
  });

  it("turns the summary into Identity and Address values, leaving a past crop year out", () => {
    const year = String(new Date().getFullYear());
    expect(summaryValues({ fayda_fan_id: "5837291046283715", crop_year: year, region_name: "Tigray", zone_name: "North Western", woreda_name: "Laelay Koraro" })).toEqual({
      "identity.fayda_fan_id": "5837291046283715",
      "identity.crop_year": year,
      "address.region": "Tigray",
      "address.zone": "North Western",
      "address.woreda": "Laelay Koraro",
    });
    expect(summaryValues({ crop_year: "2019" })).toEqual({});
  });
});

describe("loadCropDetails", () => {
  it("reports a farmer with no earlier submission", async () => {
    vi.mocked(listFarmerCrops).mockResolvedValue([]);
    await expect(loadCropDetails("FR-1")).resolves.toEqual({ values: {}, stages: [], total: 0 });
  });

  it("fills the form from the list's summary and the newest submission's sections", async () => {
    vi.mocked(fetchFarmerCrop).mockResolvedValue({ sections: [{ section_id: "cropsown_intake_season_section_01", records: [{ crop_year: String(new Date().getFullYear()), production_season: "SEASON_MEHER" }] }], tabs: [] } as never);
    const result = await loadCropDetails("FR-9", LIST);
    expect(fetchFarmerCrop).toHaveBeenCalledTimes(1);
    expect(fetchFarmerCrop).toHaveBeenCalledWith("FR-9", "sub-new");
    expect(result.total).toBe(3);
    expect(result.stages).toEqual(["planning"]);
    expect(result.values).toMatchObject({ "identity.fayda_fan_id": "5837291046283715", "address.region": "Tigray", "address.zone": "North Western", "identity.production_season": "Meher" });
  });

  it("still gives the summary when a submission cannot be read", async () => {
    vi.mocked(fetchFarmerCrop).mockRejectedValue(new Error("boom"));
    const result = await loadCropDetails("FR-9", LIST);
    expect(result.stages).toEqual([]);
    expect(result.values).toMatchObject({ "identity.fayda_fan_id": "5837291046283715", "address.woreda": "Laelay Koraro" });
  });
});
