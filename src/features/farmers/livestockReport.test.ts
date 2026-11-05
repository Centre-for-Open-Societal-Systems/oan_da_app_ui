import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import { useAuthStore } from "@/store/useAuthStore";
import { animalOptions, displayLivestockValue, headCount, livestockAge, livestockDetailsTabs, livestockPrefill, noLivestockHolding, readLivestock, type ApiLivestockRecord } from "./livestockRecords";
import {
  applyLivestockIntake,
  buildLivestockSections,
  emptyLivestockValues,
  LIVESTOCK_ANIMAL_SECTION as ANIMALS,
  LIVESTOCK_LOCATION_SECTION as LOCATION,
  LIVESTOCK_REPORT_FORM as FORM,
  livestockFieldId,
  livestockSections,
  submitLivestockReport,
  validateLivestockForm,
} from "./livestockReport";

const HEALTH = "livestock_health_event_details_section_01";
const VITAL = "livestock_vital_event_details_section_01";
const GEO = { region: "ET04", zone: "ET0401", woreda: "ET040101", kebele: "ET04010101" };

const valid = () => ({
  ...emptyLivestockValues(),
  livestock_farmer_lookup: [{ fayda_id: "1234 5678 9012 3456" }],
  livestock_survey_personnel_section_02: [{ surveyor_name: "Abebe Kebede" }],
  [LOCATION]: [{ region: "Oromia", zone: "West Wellega", woreda: "Mana Sibu", kebele: "Bengua 01", latitude: "8.9" }],
});

const animal = { species: "CATTLE", breed: "BREED_LOCAL", gender: "SEX_FEMALE", health_status: "HEALTHY", vaccination_status: "UP_TO_DATE", registration_date: "2026-11-02", ear_tag_id: "ET2149721223", weight: "312.5" };

describe("the form follows the field map", () => {
  it("has the map's sections and registers", () => {
    expect(FORM.map((t) => t.key)).toEqual(["farmer", "livestock", "health", "breeding"]);
    expect(livestockSections().find((s) => s.id === ANIMALS)?.registerId).toBe("041a9f79-2142-548a-a15b-a4c76fc9f6f7");
  });

  it("stores what each catalog stores: the code for health status, the id for species and disease", () => {
    const field = (section: string, key: string) => livestockSections().find((s) => s.id === section)?.fields.find((f) => f.key === key);
    expect(field(ANIMALS, "health_status")?.choices?.map((c) => c.value)).toEqual(["HEALTHY", "SICK", "QUARANTINED", "DECEASED"]);
    expect(field(ANIMALS, "species")?.choices?.[0].value).toBe("CATTLE");
    expect(field(ANIMALS, "gender")?.choices?.[0].value).toBe("SEX_MALE");
    expect(field(HEALTH, "event_type")?.choices?.map((c) => c.value)).toEqual(["DISEASE", "INJURY", "TREATMENT", "RECOVERY"]);
    expect(field(HEALTH, "disease_type")?.choices?.[0].value).toBe("LIVESTOCK_DISEASE_ANTHRAX");
  });
});

describe("applyLivestockIntake", () => {
  it("uses the live labels, flags, order and choices, keeping the stored column right", () => {
    const form = applyLivestockIntake(FORM, {
      sections: [
        {
          section_id: ANIMALS,
          fields: [
            { field_name: "health_status", label: "Health", required: true, choices: [{ value_id: "LIVESTOCK_HEALTH_STATUS_SICK", value_display: "Sick" }] },
            { field_name: "species", required: false, readonly: false },
          ],
        },
      ],
    });
    const fields = livestockSections(form).find((s) => s.id === ANIMALS)!.fields;
    expect(fields.map((f) => f.key)).toEqual(["health_status", "species"]);
    expect(fields[0].label).toBe("Health");
    expect(fields[0].choices).toEqual([{ value: "SICK", label: "Sick" }]);
    expect(fields[1].required).toBe(false);
  });

  it("changes nothing without a response", () => {
    expect(applyLivestockIntake(FORM, null)).toBe(FORM);
  });

  it("keeps the location controls whatever the response lists", () => {
    const form = applyLivestockIntake(FORM, { sections: [{ section_id: LOCATION, fields: [{ field_name: "latitude" }] }] });
    expect(livestockSections(form).find((s) => s.id === LOCATION)?.fields.map((f) => f.key)).toContain("longitude");
  });
});

describe("validateLivestockForm", () => {
  it("passes a complete form and asks for the map's required fields", () => {
    expect(validateLivestockForm(FORM, valid(), GEO)).toEqual({});
    const errors = validateLivestockForm(FORM, emptyLivestockValues());
    expect(Object.keys(errors).sort()).toEqual([
      livestockFieldId(LOCATION, 0, "geo_lowest_level_value_id"),
      livestockFieldId("livestock_farmer_lookup", 0, "fayda_id"),
      livestockFieldId("livestock_survey_personnel_section_02", 0, "surveyor_name"),
    ].sort());
  });

  it("checks the ear tag and Fayda patterns and whole numbers", () => {
    const values = { ...valid(), livestock_farmer_lookup: [{ fayda_id: "123" }], [ANIMALS]: [{ ...animal, ear_tag_id: "ET12", quantity: "1.5" }] };
    const errors = validateLivestockForm(FORM, values, GEO);
    expect(errors[livestockFieldId("livestock_farmer_lookup", 0, "fayda_id")]).toMatch(/12 digits/);
    expect(errors[livestockFieldId(ANIMALS, 0, "ear_tag_id")]).toMatch(/ET followed by 10 digits/);
    expect(errors[livestockFieldId(ANIMALS, 0, "quantity")]).toMatch(/whole number/);
  });

  it("does not hold a field to its rules while its event type hides it", () => {
    const row = { ear_tag_id: "ET2149721223", event_type: "INJURY", veterinarian_name: "Dr M", disease_type: "x".repeat(200) };
    expect(validateLivestockForm(FORM, { ...valid(), [HEALTH]: [row] }, GEO)).toEqual({});
  });
});

describe("buildLivestockSections", () => {
  it("sends typed values and leaves out the farmer id, empty rows and hidden or read-only fields", () => {
    const values = {
      ...valid(),
      [ANIMALS]: [animal, {}],
      [HEALTH]: [{ ear_tag_id: "ET2149721223", species: "CATTLE", age: "5 years", event_type: "INJURY", disease_type: "LIVESTOCK_DISEASE_LSD", date_onset: "2026-10-12" }],
      [VITAL]: [{ ear_tag_id: "ET2149721223", event_type: "BIRTH", event_date: "2026-08-01", offspring_count: "2", is_notifiable: "true" }],
    };
    const sections = buildLivestockSections(FORM, values, GEO);
    const records = (id: string) => sections.find((s) => s.section_id === id)?.records;

    expect(records("livestock_farmer_lookup")).toEqual([{ fayda_id: "1234567890123456" }]);
    expect(records(ANIMALS)).toEqual([{ ...animal, weight: 312.5 }]);
    expect(records(HEALTH)).toEqual([{ ear_tag_id: "ET2149721223", event_type: "INJURY", date_onset: "2026-10-12" }]);
    expect(records(VITAL)).toEqual([{ ear_tag_id: "ET2149721223", event_type: "BIRTH", event_date: "2026-08-01", offspring_count: 2 }]);
    expect(records("livestock_breeding_details_section_01")).toBeUndefined();
  });

  it("sends the location as the geo ids with the chain", () => {
    const [record] = buildLivestockSections(FORM, valid(), GEO).find((s) => s.section_id === LOCATION)!.records as Record<string, unknown>[];
    expect(record.geo_lowest_level_value_id).toBe("ET04010101");
    expect(record.latitude).toBe(8.9);
    expect(record.region).toBeUndefined();
    expect((record.geo_code_hierarchy_json as { hierarchy: unknown[] }).hierarchy).toHaveLength(4);
  });
});

describe("submitLivestockReport", () => {
  const fetchMock = vi.fn();
  const ok = (data: unknown) => new Response(JSON.stringify({ data }), { status: 200, headers: { "content-type": "application/json" } });
  const fail = () => new Response(JSON.stringify({ message: "Registry down" }), { status: 502, headers: { "content-type": "application/json" } });
  const sections = [
    { section_id: "livestock_farmer_lookup", records: [{ fayda_id: "1" }] },
    { section_id: ANIMALS, records: [animal] },
    { section_id: HEALTH, records: [{ ear_tag_id: "ET2149721223" }] },
  ];
  const body = (i: number) => JSON.parse(fetchMock.mock.calls[i][1].body as string);

  beforeEach(() => {
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {}, removeItem: () => {} });
    vi.stubGlobal("fetch", fetchMock);
    useAuthStore.setState({ tokens: { accessToken: "tok", refreshToken: "r", expiresAt: Date.now() + 3_600_000 } });
  });

  afterEach(() => {
    fetchMock.mockReset();
    vi.unstubAllGlobals();
  });

  it("opens the draft with the animals, adds the events, then finalizes", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(ok({ submission_id: "S1", subject_record_id: "R1", application_reference: "REF" })).mockResolvedValueOnce(ok({ submission_id: "S1" })).mockResolvedValueOnce(ok({ submission_id: "S1" }));

    const done = await submitLivestockReport("FR-1", sections, null, () => {});

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/v1/da-services/farmers/FR-1/livestock", "/api/v1/da-services/farmers/FR-1/livestock", "/api/v1/da-services/farmers/FR-1/livestock/S1/finalize"]);
    expect(body(0).submission_id).toBeNull();
    expect(body(0).sections.map((s: { section_id: string }) => s.section_id)).toEqual(["livestock_farmer_lookup", ANIMALS]);
    expect(body(1)).toMatchObject({ submission_id: "S1", subject_record_id: "R1", sections: [{ section_id: HEALTH }] });
    expect(done.reference).toBe("REF");
  });

  it("retries from the failed step, without saving a section twice", async () => {
    vi.stubGlobal("fetch", fetchMock);
    fetchMock.mockResolvedValueOnce(ok({ submission_id: "S1" })).mockResolvedValueOnce(fail());
    const onProgress = vi.fn();
    await expect(submitLivestockReport("FR-1", sections, null, onProgress)).rejects.toThrow();
    const progress = onProgress.mock.calls[0][0];

    fetchMock.mockReset();
    fetchMock.mockResolvedValueOnce(ok({ submission_id: "S1" })).mockResolvedValueOnce(ok({ submission_id: "S1" }));
    await submitLivestockReport("FR-1", sections, progress, onProgress);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(body(0).sections.map((s: { section_id: string }) => s.section_id)).toEqual([HEALTH]);
  });
});

describe("reading GET /farmers/{id}/livestock", () => {
  const HOLDING_REGISTER = "997676d3-7008-59f9-b23e-613ad79bbb08";
  const ANIMAL_REGISTER = "041a9f79-2142-548a-a15b-a4c76fc9f6f7";
  const rows: ApiLivestockRecord[] = [
    { kind: "submission", submission_id: "A", application_reference: "REF-A", approval_status: "APPROVED", draft_status: "FINAL", finalized_at: "2026-11-02T10:00:00", created_by: "Alex", sections: [{ section_id: ANIMALS, records: [{ ear_tag_id: "ET1" }] }] },
    {
      kind: "submission",
      submission_id: "P",
      application_reference: "REF-P",
      approval_status: "PENDING",
      draft_status: "FINAL",
      last_updated_at: "2026-10-29T17:54:00",
      sections: [{ section_id: LOCATION, records: [{ farmer_id: "FR-1", geo_code_hierarchy_json: { hierarchy: [{ level: "region", level_value_mnemonic: "Addis Ababa" }] } }] }],
    },
    { kind: "record", register_id: HOLDING_REGISTER, internal_record_id: "H", functional_record_id: "LS-1", farmer_id: "FR-1", farmer_name: "Bekele", fayda_fin: "824459234875", region: "Oromia", state: "VERIFIED", last_approved_at: "2026-11-02T10:34:00" },
    { kind: "record", register_id: ANIMAL_REGISTER, link_internal_record_id: "H", internal_record_id: "X", ear_tag_id: "ET1", species: "CATTLE", health_status: "HEALTHY", quantity: 1, weight: "1.8000000000000000444089209850062616169452667236328125" },
    { kind: "record", register_id: ANIMAL_REGISTER, link_internal_record_id: "H", internal_record_id: "Y", secondary_identifier: "FLOCK-1", species: "POULTRY", health_status: "HEALTHY", quantity: 120 },
    { kind: "record", register_id: ANIMAL_REGISTER, link_internal_record_id: "H", internal_record_id: "Z", ear_tag_id: "ET2", species: "GOATS", health_status: "DECEASED" },
  ];

  it("groups records under their holding, keeps only unapproved submissions as entries, newest first", () => {
    const { holdings, submissions } = readLivestock(rows);
    expect(holdings.map((h) => h.label)).toEqual(["LS-1", "REF-P"]);
    expect(holdings[0].rows[ANIMALS]).toHaveLength(3);
    expect(submissions.map((s) => s.reference)).toEqual(["REF-A", "REF-P"]);
    expect(submissions[0].animals).toBe(1);
  });

  it("shows approved submissions when the farmer has no register records yet", () => {
    const approvedOnly = rows.filter((r) => r.kind === "submission" && r.approval_status === "APPROVED");
    expect(readLivestock(approvedOnly).holdings.map((h) => h.label)).toEqual(["REF-A"]);
  });

  it("lays out a farmer with no livestock from the profile, with every section empty", () => {
    const tabs = livestockDetailsTabs(noLivestockHolding({ id: "uuid-1", regId: "FR-9", name: "Zewditu Bekele", region: "Tigray", woreda: "Shire", kebele: "—" }), "Zewditu Bekele");
    const [record, , location] = tabs[0].sections;
    expect(record.fields.find((f) => f.key === "farmer_id")?.value).toBe("FR-9");
    expect(record.fields.find((f) => f.key === "head_count")?.value).toBe("0");
    expect(location.fields.find((f) => f.key === "region")?.value).toBe("Tigray");
    expect(location.fields.find((f) => f.key === "kebele")?.value).toBe("—");
    const empty = tabs.slice(1).flatMap((t) => t.sections);
    for (const section of empty) expect(section.fields[0].value).toBe(section.note ? "—" : "None recorded");
    expect(empty.filter((s) => s.note).map((s) => s.title)).toEqual(["Ear Tag Replacement", "Import Batch Details", "Audit Log Details"]);
  });

  it("names the Fayda number by its length", () => {
    const fayda = (value: Record<string, string>) => livestockDetailsTabs({ ...noLivestockHolding({ id: "u", name: "Z", region: "", woreda: "", kebele: "" }), holding: value }, "Z")[0].sections[0].fields.find((f) => f.key === "fayda");
    expect(fayda({ fayda_fin: "824459234875" })).toMatchObject({ label: "Fayda ID (FIN)", value: "824459234875" });
    expect(fayda({ fayda_id: "4821 7735 1000 2233" })?.label).toBe("Fayda ID (FAN)");
  });

  it("shows the registry's breed and species labels, never a stored code", () => {
    const tabs = livestockDetailsTabs(readLivestock([rows[2], { ...rows[3], species: "DONKEY", breed: "BREED_CATTLE_BORAN" }]).holdings[0], "X");
    const fields = tabs[1].sections[0].fields;
    expect(fields.find((f) => f.key === "species")?.value).toBe("Donkey");
    expect(fields.find((f) => f.key === "breed")?.value).toBe("Boran");
    expect(displayLivestockValue({ key: "b", label: "b", type: "select", choices: [{ value: "A", label: "A" }] }, "BREED_NEW_ONE")).toBe("Breed new one");
    expect(displayLivestockValue({ key: "b", label: "b", type: "text" }, "free text")).toBe("free text");
  });

  it("reads an age from the registry, the event's animal, or the date of birth", () => {
    const today = new Date(2026, 10, 5);
    expect(livestockAge({ age: "1 years, 1 months" })).toBe("1 year, 1 month");
    expect(livestockAge({ age: "11 years, 2 months" })).toBe("11 years, 2 months");
    expect(livestockAge({ date_of_birth: "2024-02-10" }, [], today)).toBe("2 years, 8 months");
    expect(livestockAge({ date_of_birth: "2026-11-05" }, [], today)).toBe("0 years, 0 months");
    expect(livestockAge({ ear_tag_id: "ET1" }, [{ ear_tag_id: "ET1", date_of_birth: "2025-10-05" }], today)).toBe("1 year, 1 month");
    expect(livestockAge({ ear_tag_id: "FLOCK-1" }, [{ secondary_identifier: "FLOCK-1", age: "0 years, 4 months" }], today)).toBe("0 years, 4 months");
    expect(livestockAge({ date_of_birth: "2027-01-01" }, [], today)).toBe("—");
    expect(livestockAge({}, [], today)).toBe("—");
  });

  it("keeps every vital event field whatever the event type, and an ear tag replacement once the registry sends one", () => {
    const vital = livestockSections().find((s) => s.isList && s.fields.some((f) => f.key === "offspring_count"))!;
    const birth = { kind: "record", register_id: vital.registerId, link_internal_record_id: "H", internal_record_id: "B", ear_tag_id: "ET1", event_type: "BIRTH" };
    const retag = { kind: "record", register_id: "not-yet-known", link_internal_record_id: "H", internal_record_id: "R", ear_tag_id: "ET1", new_ear_tag_id: "ET2", species: "CATTLE", retag_date: "2024-06-02" };
    const tabs = livestockDetailsTabs(readLivestock([rows[2], birth, retag]).holdings[0], "X");
    expect(tabs[3].sections[0].fields.find((f) => f.key === "cause")?.value).toBe("—");
    const [, replacement] = tabs[1].sections;
    expect(replacement.title).toBe("Ear Tag Replacement · ET1 (1 of 1)");
    expect(replacement.note).toBeUndefined();
    expect(replacement.fields.find((f) => f.key === "new_ear_tag_id")?.value).toBe("ET2");
    expect(replacement.fields.find((f) => f.key === "species")?.value).toBe("Cattle");
    expect(replacement.fields.find((f) => f.key === "retag_date")?.value).toBe("02 Jun 2024");
  });

  it("shows the ear tags the registry assigned to a birth's offspring", () => {
    const vital = livestockSections().find((s) => s.isList && s.fields.some((f) => f.key === "offspring_count"))!;
    const birth = { kind: "record", register_id: vital.registerId, link_internal_record_id: "H", internal_record_id: "B", event_type: "BIRTH", offspring_ear_tags: "ET1, ET2" };
    const [holding] = readLivestock([rows[2], birth]).holdings;
    const fields = livestockDetailsTabs(holding, "X").flatMap((t) => t.sections).flatMap((s) => s.fields);
    expect(fields.find((f) => f.key === "offspring_ear_tags")?.value).toBe("ET1, ET2");
  });

  it("counts heads: a flock's quantity, none for the deceased", () => {
    expect(headCount(readLivestock(rows).holdings[0])).toBe(121);
  });

  it("lays a holding out as the Livestock Details tabs, with labels and clean numbers", () => {
    const [record, pending] = readLivestock(rows).holdings;
    const tabs = livestockDetailsTabs(record, "Fallback");
    expect(tabs.map((t) => t.label)).toEqual(["Farmer", "Livestock", "Health & Vaccination", "Breeding & Vital Events", "Imports & Audit"]);
    expect(tabs[0].sections[0].fields[0]).toMatchObject({ value: "Bekele", isFarmerAvatar: true, initials: "B" });
    const first = tabs[1].sections[0];
    expect(first.title).toBe("Livestock Details · ET1 (1 of 3)");
    expect(first.fields.slice(0, 4).map((f) => f.label)).toEqual(["Livestock Ear Tag", "Secondary Identifier", "Species", "Breed"]);
    expect(first.fields.find((f) => f.key === "weight")?.value).toBe("1.8");
    expect(first.fields.find((f) => f.key === "species")?.value).toBe("Cattle");
    expect(tabs[2].sections.map((s) => s.fields[0].value)).toEqual(["None recorded", "None recorded"]);
    expect(livestockDetailsTabs(pending, "Fallback")[0].sections[2].fields[0].value).toBe("Addis Ababa");
  });

  it("shows booleans as Yes and No", () => {
    expect(displayLivestockValue({ key: "x", label: "x", type: "boolean" }, false)).toBe("No");
  });

  it("offers the animals entered and the live ones on the register, once each", () => {
    const overview = readLivestock(rows);
    const options = animalOptions({ [ANIMALS]: [{ ear_tag_id: "ET9", species: "SHEEP" }, { ear_tag_id: "ET1", species: "CATTLE" }] }, overview);
    expect(options.map((o) => o.value)).toEqual(["ET9", "ET1", "FLOCK-1"]);
    expect(options[0].label).toBe("ET9 · Sheep");
  });

  it("starts a report from the newest holding", () => {
    const prefill = livestockPrefill(readLivestock(rows));
    expect(prefill.name).toBe("Bekele");
    expect(prefill.values.livestock_farmer_lookup).toEqual([{ fayda_id: "824459234875" }]);
    expect(prefill.values[LOCATION][0].region).toBe("Oromia");
  });

  it("reads the farmer's real sample response when it is on this machine", () => {
    const path = "C:/Users/sdss2/Downloads/livestock_output.json";
    let raw: string;
    try {
      raw = readFileSync(path, "utf8");
    } catch {
      return;
    }
    const { holdings, submissions } = readLivestock(JSON.parse(raw).data.livestock);
    expect(holdings).toHaveLength(6);
    expect(submissions).toHaveLength(6);
    expect(holdings.find((h) => h.label === "LS-569363252972")?.rows[ANIMALS]).toHaveLength(44);
  });
});
