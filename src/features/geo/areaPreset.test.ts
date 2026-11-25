import { describe, expect, it } from "vitest";
import { levelsDownTo, userAreaPreset } from "./areaPreset";

const at = (id: string, name: string) => ({ id, name });
const full = {
  country: at("ET", "Ethiopia"),
  region: at("ET04", "Oromia"),
  zone: at("ET0401", "West Shewa"),
  woreda: at("ET040101", "Bako Tibe"),
  kebele: at("ET04010105", "Lekatit"),
};

describe("userAreaPreset", () => {
  it("locks a DA down to the Kebele", () => {
    expect(userAreaPreset("DA", full)).toEqual({
      region: { code: "ET04", name: "Oromia" },
      zone: { code: "ET0401", name: "West Shewa" },
      woreda: { code: "ET040101", name: "Bako Tibe" },
      kebele: { code: "ET04010105", name: "Lekatit" },
    });
  });

  it("locks a Supervisor down to the Woreda and an Executive down to the Zone", () => {
    expect(Object.keys(userAreaPreset("Supervisor", full))).toEqual(["region", "zone", "woreda"]);
    expect(Object.keys(userAreaPreset("Executive", full))).toEqual(["region", "zone"]);
  });

  it("locks nothing for Admin, Communications Officer or an unknown role", () => {
    expect(userAreaPreset("Admin", full)).toEqual({});
    expect(userAreaPreset("CommsOfficer", full)).toEqual({});
    expect(userAreaPreset(null, full)).toEqual({});
  });

  it("locks nothing when /me sends no place", () => {
    expect(userAreaPreset("DA", null)).toEqual({});
    expect(userAreaPreset("Supervisor", { region: null, zone: null, woreda: null, kebele: null })).toEqual({});
  });

  it("takes a Region or Zone /me leaves out from the Woreda's code", () => {
    expect(userAreaPreset("Supervisor", { region: null, zone: null, woreda: at("ET040101", "Bako Tibe"), kebele: null })).toEqual({
      region: { code: "ET04", name: "" },
      zone: { code: "ET0401", name: "" },
      woreda: { code: "ET040101", name: "Bako Tibe" },
    });
  });

  it("stops at the first level it cannot fill, so the rest are picked", () => {
    expect(userAreaPreset("DA", { region: at("ET04", "Oromia"), zone: null, woreda: null, kebele: null })).toEqual({ region: { code: "ET04", name: "Oromia" } });
    expect(userAreaPreset("Executive", { region: at("ET04", "Oromia"), zone: null, woreda: null, kebele: null })).toEqual({ region: { code: "ET04", name: "Oromia" } });
  });
});

describe("levelsDownTo", () => {
  it("lists the levels from Region down to the given one", () => {
    expect(levelsDownTo("region")).toEqual(["region"]);
    expect(levelsDownTo("woreda")).toEqual(["region", "zone", "woreda"]);
    expect(levelsDownTo("kebele")).toEqual(["region", "zone", "woreda", "kebele"]);
  });
});
