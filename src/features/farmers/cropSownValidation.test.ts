import { describe, expect, it } from "vitest";
import { CROP_SOWN_FORM, valueKey } from "./cropSown";
import { labelOfCode } from "./cropSownSpecApply";
import { fieldInMessage, validateSection, validateSections } from "./cropSownValidation";

const section = (id: string) => CROP_SOWN_FORM.flatMap((t) => t.sections).find((s) => s.id === id)!;
const v = (sectionId: string, field: string, value: string) => ({ [valueKey(sectionId, field)]: value });

describe("the form follows the registry's definition", () => {
  it("takes required, read-only and numeric kinds from the registry", () => {
    const planning = section("planning").fields;
    const by = (key: string) => planning.find((f) => f.key === key)!;
    expect([by("land_id").required, by("season").required, by("commodity").required]).toEqual([true, true, true]);
    expect(by("planned_date_ec").readOnly).toBe(true);
    expect(by("growth_duration_days").numeric).toBe("integer");
    expect(by("plot_category").optionValues).toEqual({ "Annual Crop": "PLOT_CATEGORY_ANNUAL_CROP", "Perennial Crop": "PLOT_CATEGORY_PERENNIAL_CROP", "Biennial Crop": "PLOT_CATEGORY_BIENNIAL_CROP" });
    expect(by("water_source_frequency").optionValues?.Daily).toBe("WATER_SOURCE_FREQUENCY_DAILY");
    expect(by("production_season")?.options ?? section("identity").fields.find((f) => f.key === "production_season")!.options).toEqual(["Meher", "Belg", "Irrigation"]);
    expect(by("seed_class").options).toEqual(["Local", "Improved"]);
    expect(by("seed_class").optionValues).toEqual({ Local: "LOCAL", Improved: "IMPROVED" });
    expect(by("is_plot_registered").optionValues).toEqual({ Yes: true, No: false });
  });
});

describe("validateSection", () => {
  it("asks for the identity values the registry requires", () => {
    const errors = validateSection(section("identity"), {});
    expect(Object.keys(errors).sort()).toEqual(["identity.crop_year", "identity.farmer_id", "identity.fayda_fan_id", "identity.production_season"]);
    expect(errors["identity.production_season"]).toBe("Production Season is required.");
  });

  it("checks the Farmer ID, Fayda FAN, crop year and names with the registry's patterns", () => {
    const values = { ...v("identity", "farmer_id", "FRM-000103"), ...v("identity", "fayda_fan_id", "4821 7735 863"), ...v("identity", "crop_year", "26"), ...v("identity", "production_season", "Meher"), ...v("identity", "farmer_name", "R2D2") };
    const errors = validateSection(section("identity"), values);
    expect(errors["identity.farmer_id"]).toBe("Farmer ID: enter FR- followed by exactly 12 digits, preserving leading zeroes.");
    expect(errors["identity.fayda_fan_id"]).toContain("exactly 16 digits");
    expect(errors["identity.crop_year"]).toContain("four-digit year");
    expect(errors["identity.farmer_name"]).toContain("1 to 100 letters");
    const ok = { ...values, ...v("identity", "farmer_id", "FR-913731039093"), ...v("identity", "fayda_fan_id", "5837 2910 4628 3715"), ...v("identity", "crop_year", "2026"), ...v("identity", "farmer_name", "Lelise Gudeta") };
    expect(validateSection(section("identity"), ok)).toEqual({});
  });

  it("refuses a crop year in the past, as the registry does", () => {
    const past = String(new Date().getFullYear() - 1);
    expect(validateSection(section("identity"), v("identity", "crop_year", past))["identity.crop_year"]).toBe("Crop year must not be in the past.");
    expect(validateSection(section("identity"), v("identity", "crop_year", String(new Date().getFullYear())))["identity.crop_year"]).toBeUndefined();
  });

  it("requires Land ID, Season and Crop in Planning, and checks number kinds", () => {
    const errors = validateSection(section("planning"), { ...v("planning", "planned_labor", "2.5"), ...v("planning", "land_area", "abc") });
    expect(errors["planning.land_id"]).toBe("Land ID is required.");
    expect(errors["planning.season"]).toBe("Season is required.");
    expect(errors["planning.commodity"]).toBe("Crop is required.");
    expect(errors["planning.planned_labor"]).toBe("Planned Labour must be a whole number.");
    expect(errors["planning.land_area"]).toBe("Total Land Area (ha) must be a number.");
  });

  it("holds Planned Crop Area to the Total Land Area", () => {
    const base = { ...v("planning", "land_id", "L1"), ...v("planning", "season", "Meher"), ...v("planning", "commodity", "Teff"), ...v("planning", "land_area", "1.5") };
    expect(validateSection(section("planning"), { ...base, ...v("planning", "planned_area", "2") })["planning.planned_area"]).toBe("Planned Crop Area cannot be greater than Total Land Area");
    expect(validateSection(section("planning"), { ...base, ...v("planning", "planned_area", "1.5") })).toEqual({});
  });

  it("refuses dates before 1900 and malformed dates", () => {
    const base = { ...v("planning", "land_id", "L1"), ...v("planning", "season", "Meher"), ...v("planning", "commodity", "Teff") };
    expect(validateSection(section("planning"), { ...base, ...v("planning", "planned_date", "1850-01-01") })["planning.planned_date"]).toContain("1900 or later");
    expect(validateSection(section("planning"), { ...base, ...v("planning", "planned_date", "2026-02-31") })["planning.planned_date"]).toContain("valid date");
  });

  it("leaves an optional list (cluster) alone until a row is started, then wants its Land ID matching Planning", () => {
    expect(validateSection(section("planning-cluster"), {})).toEqual({});
    const started = { ...v("planning-cluster", "cluster_name", "FPC"), ...v("planning", "land_id", "L1") };
    expect(validateSection(section("planning-cluster"), started)["planning-cluster.land_id"]).toBe("Land ID is required.");
    const wrong = { ...started, ...v("planning-cluster", "land_id", "L2") };
    expect(validateSection(section("planning-cluster"), wrong)["planning-cluster.land_id"]).toBe("Land ID in Cluster must match Land ID specified in Crop Planning");
    expect(validateSection(section("planning-cluster"), { ...started, ...v("planning-cluster", "land_id", "L1") })).toEqual({});
  });

  it("does not check read-only fields", () => {
    expect(validateSection(section("harvest"), { ...v("harvest", "land_id", "L1"), ...v("harvest", "commodity", "Teff"), ...v("harvest", "harvest_date", "2026-05-01"), ...v("harvest", "qty_harvested", "10"), ...v("harvest", "area_harvested", "1"), ...v("harvest", "yield_kg_ha", "x") })).toEqual({});
  });

  it("validateSections merges the sections of a tab", () => {
    expect(Object.keys(validateSections(CROP_SOWN_FORM[0].sections, {}))).toEqual(expect.arrayContaining(["identity.crop_year", "planning.land_id"]));
  });
});

describe("fieldInMessage", () => {
  const sections = [section("identity"), section("planning")];
  it("finds the field a registry rejection names, by key or by label", () => {
    expect(fieldInMessage("production_season is not an allowed value", sections)).toMatchObject({ key: "identity.production_season", sectionId: "identity" });
    expect(fieldInMessage("Crop Sown Registry rejected save crop section: Crop year must not be in the past", sections)).toMatchObject({ key: "identity.crop_year" });
    expect(fieldInMessage("commodity is not an allowed value", sections)).toMatchObject({ key: "planning.commodity" });
  });
  it("returns null when no field is named", () => {
    expect(fieldInMessage("Registry unavailable, try again.", sections)).toBeNull();
  });
});

describe("labelOfCode", () => {
  it("reads the Land API's codes (OWNER, SF_HIGH) as the registry's labels", () => {
    expect(labelOfCode("OWNERSHIP_TYPE", "OWNER")).toBe("Owner");
    expect(labelOfCode("OWNERSHIP_TYPE", "TENANT")).toBe("Tenant");
    expect(labelOfCode("SOIL_FERTILITY", "SF_HIGH")).toBe("High");
    expect(labelOfCode("SOIL_FERTILITY", "NOPE")).toBeUndefined();
  });
});
