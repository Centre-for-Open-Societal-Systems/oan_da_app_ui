import { describe, expect, it } from "vitest";
import { audienceScopes, initialAudience } from "./AudienceFields";

const scope = { regions: ["ET01"], zones: ["ET0101"], woredas: ["ET010108"] };
const empty = { region: "", zone: "", woreda: "", woredas: [], kebeles: [] };

describe("initialAudience", () => {
  it("fixes a Supervisor to their assigned Woreda", () => {
    expect(initialAudience("Supervisor", scope)).toEqual({ ...empty, region: "ET01", zone: "ET0101", woreda: "ET010108" });
  });
  it("fixes an Executive to their assigned Zone", () => {
    expect(initialAudience("Executive", scope)).toEqual({ ...empty, region: "ET01", zone: "ET0101" });
  });
  it("leaves an Admin free", () => {
    expect(initialAudience("Admin", scope)).toEqual(empty);
  });
  it("starts an edit from the saved scopes", () => {
    expect(initialAudience("Admin", scope, [{ region: "ET03", zone: "ET0304", woreda: "ET030403" }])).toEqual({ ...empty, region: "ET03", zone: "ET0304", woreda: "ET030403" });
    expect(initialAudience("Executive", scope, [{ region: "ET01", zone: "ET0101", woreda: "W1" }, { region: "ET01", zone: "ET0101", woreda: "W2" }])).toEqual({ ...empty, region: "ET01", zone: "ET0101", woredas: ["W1", "W2"] });
  });
});

describe("audienceScopes", () => {
  it("writes one row per kebele (Supervisor / Admin)", () => {
    expect(audienceScopes({ ...empty, region: "ET01", zone: "ET0101", woreda: "ET010108", kebeles: ["K1", "K2"] })).toEqual([
      { region: "ET01", zone: "ET0101", woreda: "ET010108", kebele: "K1" },
      { region: "ET01", zone: "ET0101", woreda: "ET010108", kebele: "K2" },
    ]);
  });
  it("writes one row per woreda (Executive)", () => {
    expect(audienceScopes({ ...empty, region: "ET01", zone: "ET0101", woredas: ["W1", "W2"] })).toEqual([
      { region: "ET01", zone: "ET0101", woreda: "W1" },
      { region: "ET01", zone: "ET0101", woreda: "W2" },
    ]);
  });
  it("writes the narrowest level picked, or nothing for everyone", () => {
    expect(audienceScopes({ ...empty, region: "ET01", zone: "ET0101", woreda: "ET010108" })).toEqual([{ region: "ET01", zone: "ET0101", woreda: "ET010108" }]);
    expect(audienceScopes({ ...empty, region: "ET01", zone: "ET0101" })).toEqual([{ region: "ET01", zone: "ET0101" }]);
    expect(audienceScopes(empty)).toEqual([]);
  });
});
