import { describe, expect, it } from "vitest";
import { CROP_SOWN_FORM, CROP_SOWN_TABS, cropSownTabs, findFarmersById, getCropSownPrefill, getCropSownRecord, registryCode, valueKey } from "./cropSown";
import { FARMERS } from "./data";

describe("Crop Sown form", () => {
  it("shows the identity and address once, on an opening Crop Sown tab", () => {
    expect(CROP_SOWN_TABS.map((t) => [t.label, t.sections.map((s) => s.id)])).toEqual([
      ["Crop Sown", ["identity", "address"]],
      ["Planning", ["planning", "planning-cluster"]],
      ["Cultivation / Land Preparation", ["cultivation", "cultivation-cluster"]],
      ["Sowing", ["sowing", "infestation"]],
      ["Harvesting", ["harvest"]],
    ]);
  });

  it("follows the Crop Sown Registry tab, section and field list", () => {
    expect(CROP_SOWN_FORM.map((t) => [t.label, t.sections.map((s) => [s.title, s.fields.length])])).toEqual([
      ["Planning", [["Farmer Identity", 5], ["Address / Location", 3], ["Crop Planning Details", 42], ["Cluster Information Details", 42]]],
      ["Cultivation / Land Preparation", [["Farmer Identity", 4], ["Cultivation / Land Preparation Details", 35], ["Cultivation Cluster Information Details", 42]]],
      ["Sowing", [["Farmer Identity", 4], ["Sowing Details", 21], ["Infestation Incident Details", 41]]],
      ["Harvesting", [["Farmer Identity", 4], ["Harvest Details", 27]]],
    ]);
  });

  it("never repeats a field inside a section", () => {
    for (const s of CROP_SOWN_FORM.flatMap((t) => t.sections)) {
      expect(new Set(s.fields.map((f) => f.key)).size).toBe(s.fields.length);
    }
  });
});

describe("sample record", () => {
  it("fills every field for every farmer", () => {
    const keys = CROP_SOWN_FORM.flatMap((t) => t.sections.flatMap((s) => s.fields.map((f) => valueKey(s.id, f.key))));
    for (const farmer of FARMERS) {
      const record = getCropSownRecord(farmer);
      expect(keys.filter((k) => !record[k] || record[k] === "NaN")).toEqual([]);
    }
  });

  it("prefills registry data only, leaving the DA's observations empty", () => {
    const prefill = getCropSownPrefill(FARMERS[0]);
    expect(prefill["identity.farmer_name"]).toBe(FARMERS[0].name);
    expect(prefill["planning.land_area"]).toBe(String(FARMERS[0].landHa));
    expect(prefill["harvest.qty_harvested"]).toBeUndefined();
    expect(prefill["planning.planned_area"]).toBeUndefined();
  });

  it("formats GC and EC dates for display", () => {
    const planning = cropSownTabs(getCropSownRecord(FARMERS[0])).find((t) => t.key === "planning")!.sections.find((s) => s.title === "Crop Planning Details")!.fields;
    expect(planning.find((f) => f.key === "planned_date")?.value).toBe("18 Jun 2025");
    expect(planning.find((f) => f.key === "planned_date_ec")?.value).toBe("11 Sene 2017");
  });
});

describe("findFarmersById", () => {
  it("matches the Farmer ID regardless of case and spacing", () => {
    const farmer = FARMERS[0];
    expect(findFarmersById(` ${registryCode(farmer).toLowerCase()} `)).toContainEqual(farmer);
  });

  it("returns nothing for a blank or unknown ID", () => {
    expect(findFarmersById("  ")).toEqual([]);
    expect(findFarmersById("FR-00000")).toEqual([]);
  });
});
