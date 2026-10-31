import { describe, expect, it } from "vitest";
import { registrationProblems, toRegistration } from "./registration";

const complete: Record<string, string> = {
  first_name: "Tolosa",
  middle_name: "Bekele",
  last_name: "Haile",
  gender: "MALE",
  birth_date: "1988-04-12",
  phone_number: "0911 223 344",
  education_level: "PRIMARY",
  marital_status: "MARRIED",
  income_source: "SOI_CROP_PRODUCTION",
  region: "ET04",
  zone: "ET0408",
  woreda: "ET040801",
  kebele: "ET04080101",
  identity_document_type: "IDDOC_FAYDA",
  identity_document_id: "523293a6-ec28-4c5d-8549-1ca3784c3dfd",
  members_count: "1",
  member_0_first_name: "Almaz",
  member_0_grandfather_name: "Worku",
  member_0_gender: "FEMALE",
  member_0_birth_date: "1990-02-20",
  member_0_relationship: "SPOUSE",
  land_ownership_type: "OWNER",
  area_in_hectare: "1.5",
  soil_fertility: "SF_HIGH",
  commodity: "CROP_TEFF",
  season: "SEASON_MEHER",
  livestock_type: "LSTK_CATTLE",
  head_count: "3",
  client_op_id: "op-1",
};

describe("registrationProblems", () => {
  it("passes a complete registration", () => {
    expect(registrationProblems(complete)).toEqual([]);
  });

  it("names every missing required field, member field and the location", () => {
    const problems = registrationProblems({ members_count: "1" });
    expect(problems).toContain("Farmer: First Name is required.");
    expect(problems).toContain("Documents: Identity Document is required.");
    expect(problems).toContain("Location: pick the region, zone, woreda and kebele.");
    expect(problems).toContain("Household: member 1 needs First Name.");
  });

  it("asks for the conditional answers the registry requires", () => {
    const problems = registrationProblems({ ...complete, disabled: "Yes", income_source: "SOI_OTHERS", is_primary_cooperative_member: "Yes" });
    expect(problems).toContain("Farmer: Disability Type is required.");
    expect(problems).toContain("Farmer: Other Income Source is required.");
    expect(problems).toContain("Membership: Primary Cooperative Name is required.");
  });

  it("needs a land parcel for crops and livestock", () => {
    const noLand = { ...complete, land_ownership_type: "", area_in_hectare: "" };
    expect(registrationProblems(noLand)).toContain("Lands: crops and livestock belong to a land parcel; add the parcel first.");
  });
});

describe("toRegistration", () => {
  it("maps the wizard fields onto POST /farmers", () => {
    const body = toRegistration(complete);
    expect(body).toMatchObject({
      first_name: "Tolosa",
      father_name: "Bekele",
      grandfather_name: "Haile",
      gender: "MALE",
      date_of_birth: "1988-04-12",
      phone: "0911223344",
      kebele: "ET04080101",
      income_sources: ["SOI_CROP_PRODUCTION"],
      disabled: false,
      identity_document_id: "523293a6-ec28-4c5d-8549-1ca3784c3dfd",
      identity_document_type: "IDDOC_FAYDA",
      client_op_id: "op-1",
    });
    expect(body.household).toMatchObject({ size: 2, other_land_owner: false, father_included: true });
    expect(body.household?.members[0]).toEqual({ first_name: "Almaz", father_name: undefined, grandfather_name: "Worku", gender: "FEMALE", date_of_birth: "1990-02-20", relationship: "SPOUSE" });
    expect(body.membership).toEqual({
      is_primary_cooperative_member: false,
      primary_cooperative_name: undefined,
      is_cooperative_union_member: false,
      cooperative_union_name: undefined,
      is_farmer_cluster_member: false,
      farmer_cluster_role: undefined,
      primary_commodity: undefined,
    });
    expect(body.lands).toEqual([{ ownership: "OWNER", area_hectare: 1.5, soil_fertility: "SF_HIGH", current_land_use: undefined, means_of_acquisition: undefined, year_of_acquisition: undefined, remark: undefined }]);
    expect(body.crops).toEqual([{ name: "CROP_TEFF", planted_date: undefined, season: "SEASON_MEHER", end_use: undefined }]);
    expect(body.livestock?.[0]).toMatchObject({ animal: "LSTK_CATTLE", count: 3 });
  });

  it("leaves out land, crops, livestock and conditional answers that were not given", () => {
    const body = toRegistration({ first_name: "Rahel", disabled: "No", disability_type: "VISION" });
    expect(body.lands).toEqual([]);
    expect(body.crops).toEqual([]);
    expect(body.livestock).toEqual([]);
    expect(body.disability_type).toBeUndefined();
    expect(body.household?.size).toBe(1);
  });
});
