import { describe, expect, it } from "vitest";
import { buildRegistrationBody, EMPTY_FORM, errorsFromDetails, stepOfField, validateStep, type RegistrationForm } from "./registration";

// A registration filled as the collection's "Register farmer" body.
const filled: RegistrationForm = {
  ...EMPTY_FORM,
  first_name: " Abebe ",
  father_name: "Kebede",
  grandfather_name: "Tesfaye",
  gender: "male",
  date_of_birth: "1985-04-12",
  phone: "0911234567",
  national_id: "1234 5678 9012 3456",
  marital_status: "married",
  education_level: "read_write",
  income_sources: ["crop", "livestock"],
  places: { region: "ET04", zone: "ET0408", woreda: "ET040801", kebele: "ET04080101" },
  placeNames: { region: "Oromia", zone: "Z", woreda: "W", kebele: "K" },
  location: "9.03 38.74 2350 5",
  household_size: "2",
  members: [{ first_name: "Almaz", grandfather_name: "Bekele", gender: "female", date_of_birth: "1990-01-01", relationship: "spouse" }],
  lands: [{ ownership: "owner", area_hectare: "1.5" }],
  crops: [{ name: "teff", planted_date: "2026-07-01", season: "meher" }],
  livestock: [{ animal: "cattle", count: "3", system: "mixed" }],
  document: { id: "doc-123", name: "fayda.pdf" },
};

describe("buildRegistrationBody", () => {
  it("builds the POST /farmers body of the collection: codes, the kebele id, the document id and the client_op_id", () => {
    expect(buildRegistrationBody(filled, "reg-1")).toEqual({
      client_op_id: "reg-1",
      first_name: "Abebe",
      father_name: "Kebede",
      grandfather_name: "Tesfaye",
      gender: "male",
      date_of_birth: "1985-04-12",
      phone: "+251911234567",
      kebele: "ET04080101",
      national_id: "1234567890123456",
      location: "9.03 38.74 2350 5",
      marital_status: "married",
      education_level: "read_write",
      income_sources: ["crop", "livestock"],
      household: { size: 2, members: [{ first_name: "Almaz", grandfather_name: "Bekele", gender: "female", date_of_birth: "1990-01-01", relationship: "spouse" }] },
      identity_document_id: "doc-123",
      lands: [{ ownership: "owner", area_hectare: 1.5 }],
      crops: [{ name: "teff", planted_date: "2026-07-01", season: "meher" }],
      livestock: [{ animal: "cattle", count: 3, system: "mixed" }],
    });
  });

  it("leaves out empty optional fields, empty rows and an empty household", () => {
    const body = buildRegistrationBody(
      { ...filled, location: "", marital_status: "", education_level: "", income_sources: [], household_size: "", members: [], lands: [{ ownership: "", area_hectare: "" }], crops: [], livestock: [] },
      "reg-2",
    );
    for (const key of ["location", "marital_status", "education_level", "income_sources", "household", "lands", "crops", "livestock"]) expect(body).not.toHaveProperty(key);
    expect(body.client_op_id).toBe("reg-2");
  });

  it("keeps the client_op_id it is given, so a retry of the same registration is not a second farmer", () => {
    expect(buildRegistrationBody(filled, "reg-same").client_op_id).toBe("reg-same");
  });
});

describe("validateStep", () => {
  it("passes the filled registration", () => {
    expect(validateStep("review", filled)).toEqual({});
  });

  it("asks for the farmer's required details and checks phone, national id and birth date", () => {
    expect(Object.keys(validateStep("farmer", EMPTY_FORM)).sort()).toEqual(["date_of_birth", "father_name", "first_name", "gender", "grandfather_name", "national_id", "phone"]);
    const wrong = validateStep("farmer", { ...filled, phone: "12345", national_id: "123", date_of_birth: "2999-01-01" });
    expect(wrong.phone).toContain("+251");
    expect(wrong.national_id).toContain("12-digit FIN or the 16-digit FAN");
    expect(wrong.date_of_birth).toContain("future");
  });

  it("needs the whole place cascade down to the kebele", () => {
    expect(validateStep("location", { ...filled, places: { region: "ET04" } })).toMatchObject({ zone: "Zone is required.", woreda: "Woreda is required.", kebele: "Kebele is required." });
  });

  it("checks rows only once they are started", () => {
    expect(validateStep("holdings", { ...filled, lands: [{ ownership: "", area_hectare: "" }], crops: [], livestock: [] })).toEqual({});
    expect(validateStep("holdings", { ...filled, lands: [{ ownership: "owner", area_hectare: "0" }] })).toEqual({ "lands.0.area_hectare": "Area must be a number above 0." });
    expect(validateStep("household", { ...filled, household_size: "" })).toEqual({ household_size: "Household size is required when members are listed." });
  });

  it("needs the household size to equal the farmer plus the members listed, as the registry does", () => {
    expect(validateStep("household", filled)).toEqual({});
    expect(validateStep("household", { ...filled, household_size: "4", members: [] })).toEqual({
      household_size: "Household size is 4, but 1 person is listed (the farmer plus each member). Add every member, or change the size to 1.",
    });
    expect(validateStep("household", { ...filled, household_size: "1", members: [] })).toEqual({});
    expect(validateStep("household", { ...filled, household_size: "", members: [] })).toEqual({});
  });

  it("needs all five details of a listed member, as the registry does", () => {
    const member = { first_name: "Almaz", grandfather_name: "", gender: "", date_of_birth: "", relationship: "" };
    expect(validateStep("household", { ...filled, household_size: "2", members: [member] })).toEqual({
      "members.0.grandfather_name": "Grandfather's name is required.",
      "members.0.gender": "Gender is required.",
      "members.0.date_of_birth": "Date of birth is required.",
      "members.0.relationship": "Relationship is required.",
    });
  });

  it("needs the uploaded ID document", () => {
    expect(validateStep("document", { ...filled, document: null })).toEqual({ document: "Upload the farmer's ID document." });
  });
});

describe("a 400's details", () => {
  it("land on the form's fields and steps", () => {
    const errors = errorsFromDetails({ identity_document_id: "Unknown document", "household.size": "Must be at least 1", "lands[0].area_hectare": "Too large", kebele: "Kebele is required" });
    expect(errors).toEqual({ document: "Unknown document", household_size: "Must be at least 1", "lands.0.area_hectare": "Too large", kebele: "Kebele is required" });
    expect(Object.keys(errors).map(stepOfField)).toEqual(["document", "household", "holdings", "location"]);
  });
});
