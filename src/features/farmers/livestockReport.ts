import {
  finalizeFarmerLivestock,
  saveFarmerLivestock,
  type ApiLivestockChoice,
  type ApiLivestockIntakeField,
  type ApiLivestockIntakeForm,
  type LivestockSectionInput,
} from "./livestockApi";

// The Livestock intake form: tabs → sections → fields, from the livestock field and option map (GET
// /livestock/intake-form, 2026-11-02). The live response overrides this snapshot where it answers (applyLivestockIntake).
//
// Which column a catalog field stores: the map gives species, breed, sex, health, vaccination status and vaccine. The rest
// are marked "not read" there, so they follow what the registry returned in GET /farmers/{id}/livestock: the code for event
// type, location, cause, breeding method and outcome (DISEASE, HOME), the id for disease (LIVESTOCK_DISEASE_ANTHRAX).
//
// `showWhen` also comes from those rows: the map only says these fields "have show/require rules", without giving them.

export type LivestockFieldType = "text" | "number" | "integer" | "date" | "select" | "boolean" | "animal" | "geo";

export interface LivestockChoice {
  /** What the registry stores. */
  value: string;
  label: string;
}

export interface LivestockFieldDef {
  key: string;
  label: string;
  type: LivestockFieldType;
  choices?: LivestockChoice[];
  /** The catalog behind `choices`: tells how a live choice turns into the stored value. */
  catalog?: Catalog;
  /** Always needed. */
  required?: boolean;
  /** Needed once the row of a list section has anything in it (the map's "show/require rules"). */
  requiredInRow?: boolean;
  /** Shown but never sent. */
  readOnly?: boolean;
  /** Filled by the registry from the URL: shown, never sent, not counted as missing. */
  fromUrl?: boolean;
  pattern?: RegExp;
  patternHint?: string;
  maxLength?: number;
  /** The field only applies when another field of the row holds one of these values. */
  showWhen?: { field: string; values: string[] };
}

export interface LivestockSectionDef {
  id: string;
  title: string;
  registerId: string;
  /** A table in the registry: any number of rows. */
  isList: boolean;
  /** The noun for "Add …" and row headings. */
  rowLabel?: string;
  fields: LivestockFieldDef[];
}

export interface LivestockTabDef {
  key: string;
  label: string;
  sections: LivestockSectionDef[];
}

/** One row of a section, as the form holds it. */
export type LivestockRow = Record<string, string>;
/** Section id → rows. A one-row section always holds one. */
export type LivestockValues = Record<string, LivestockRow[]>;
/** Field id (livestockFieldId) → what is wrong with it. */
export type LivestockErrors = Record<string, string>;
/** Registry ids of the location picked. */
export type LivestockGeoIds = Partial<Record<"region" | "zone" | "woreda" | "kebele", string>>;

export const livestockFieldId = (sectionId: string, row: number, key: string) => `${sectionId}.${row}.${key}`;

// ── Catalogs ────────────────────────────────────────────────────────────────────────────────────────────

interface Catalog {
  attribute: string;
  store: "id" | "code";
}

const catalogChoice = ({ attribute, store }: Catalog, id: string, label: string, code?: string): LivestockChoice => ({
  value: store === "id" ? id : (code ?? (id.startsWith(`${attribute}_`) ? id.slice(attribute.length + 1) : id)),
  label,
});

const catalog = (attribute: string, store: Catalog["store"], rows: [id: string, label: string][]) => {
  const def: Catalog = { attribute, store };
  return { catalog: def, choices: rows.map(([id, label]) => catalogChoice(def, id, label)) };
};

const SPECIES = catalog("LIVESTOCK_SPECIES", "id", [
  ["CATTLE", "Cattle"],
  ["GOATS", "Goat"],
  ["SHEEP", "Sheep"],
  ["POULTRY", "Poultry"],
  ["CAMELS", "Camel"],
  ["EQUINES", "Equines"],
  ["OTHER", "Other"],
  ["DONKEY", "Donkey"],
  ["HORSE", "Horse"],
  ["MULE", "Mule"],
  ["PIG", "Pig"],
  ["BEEHIVE", "Beehive"],
]);
const BREED = catalog("LIVESTOCK_BREED", "id", [
  ["BREED_IMPROVED", "Improved"],
  ["BREED_LOCAL", "Local"],
  ["BREED_HYBRID", "Hybrid"],
  ["BREED_CATTLE_BORAN", "Boran"],
  ["BREED_CATTLE_FOGERA", "Fogera"],
  ["BREED_CATTLE_HORRO", "Horro"],
  ["BREED_CATTLE_SHEKO", "Sheko"],
  ["BREED_CATTLE_BEGAIT", "Begait"],
  ["BREED_CATTLE_ARSI", "Arsi"],
  ["BREED_CATTLE_BARKA", "Barka"],
  ["BREED_CATTLE_LOCAL_ZEBU", "Local Zebu"],
  ["BREED_CATTLE_HOLSTEIN_FRIESIAN_CROSS", "Holstein Friesian Cross"],
  ["BREED_CATTLE_JERSEY_CROSS", "Jersey Cross"],
  ["BREED_SHEEP_MENZ", "Menz"],
  ["BREED_SHEEP_AFAR", "Afar"],
  ["BREED_SHEEP_BLACKHEAD_SOMALI", "Blackhead Somali"],
  ["BREED_SHEEP_HORRO", "Horro"],
  ["BREED_SHEEP_BONGA", "Bonga"],
  ["BREED_SHEEP_WASHERA", "Washera"],
  ["BREED_SHEEP_DORPER_CROSS", "Dorper Cross"],
  ["BREED_SHEEP_LOCAL", "Local"],
  ["BREED_GOAT_AFAR", "Afar"],
  ["BREED_GOAT_ABERGELE", "Abergele"],
  ["BREED_GOAT_BEGAIT", "Begait"],
  ["BREED_GOAT_CENTRAL_HIGHLAND", "Central Highland"],
  ["BREED_GOAT_LONG_EARED_SOMALI", "Long Eared Somali"],
  ["BREED_GOAT_WOITO_GUJI", "Woito Guji"],
  ["BREED_GOAT_BOER_CROSS", "Boer Cross"],
  ["BREED_GOAT_LOCAL", "Local"],
  ["BREED_CAMEL_SOMALI", "Somali"],
  ["BREED_CAMEL_AFAR", "Afar"],
  ["BREED_CAMEL_LOCAL", "Local"],
  ["BREED_DONKEY_ABYSSINIAN", "Abyssinian"],
  ["BREED_DONKEY_SINNAR", "Sinnar"],
  ["BREED_DONKEY_LOCAL", "Local"],
  ["BREED_HORSE_ABYSSINIAN", "Abyssinian"],
  ["BREED_HORSE_OROMO", "Oromo"],
  ["BREED_HORSE_LOCAL", "Local"],
  ["BREED_MULE_LOCAL", "Local"],
  ["BREED_POULTRY_BOVANS_BROWN", "Bovans Brown"],
  ["BREED_POULTRY_ISA_BROWN", "Isa Brown"],
  ["BREED_POULTRY_SASSO", "Sasso"],
  ["BREED_POULTRY_KOEKOEK", "Koekoek"],
  ["BREED_POULTRY_WHITE_LEGHORN_CROSS", "White Leghorn Cross"],
  ["BREED_POULTRY_LOCAL_CHICKEN", "Local Chicken"],
  ["BREED_PIG_LARGE_WHITE", "Large White"],
  ["BREED_PIG_LANDRACE", "Landrace"],
  ["BREED_PIG_LOCAL", "Local"],
  ["BREED_BEEHIVE_APIS_MELLIFERA_SCUTELLATA", "African Honey Bee (Apis mellifera scutellata)"],
]);
const SEX = catalog("LIVESTOCK_SEX", "code", [["SEX_MALE", "Male"], ["SEX_FEMALE", "Female"], ["SEX_MALE_NEUTER", "Castrated male"], ["SEX_FEMALE_NEUTER", "Female neuter"], ["SEX_MIXED", "Mixed / Not Applicable"]]);
const HEALTH_STATUS = catalog("LIVESTOCK_HEALTH_STATUS", "code", [["LIVESTOCK_HEALTH_STATUS_HEALTHY", "Healthy"], ["LIVESTOCK_HEALTH_STATUS_SICK", "Sick"], ["LIVESTOCK_HEALTH_STATUS_QUARANTINED", "Quarantined"], ["LIVESTOCK_HEALTH_STATUS_DECEASED", "Deceased"]]);
const VACCINATION_STATUS = catalog("LIVESTOCK_VACCINATION_STATUS", "code", [["LIVESTOCK_VACCINATION_STATUS_UP_TO_DATE", "Up to date"], ["LIVESTOCK_VACCINATION_STATUS_OVERDUE", "Overdue"], ["LIVESTOCK_VACCINATION_STATUS_NONE", "None"]]);
const HEALTH_EVENT = catalog("LIVESTOCK_HEALTH_EVENT_TYPE", "code", [["LIVESTOCK_HEALTH_EVENT_TYPE_DISEASE", "Disease"], ["LIVESTOCK_HEALTH_EVENT_TYPE_INJURY", "Injury"], ["LIVESTOCK_HEALTH_EVENT_TYPE_TREATMENT", "Treatment"], ["LIVESTOCK_HEALTH_EVENT_TYPE_RECOVERY", "Recovery"]]);
const DISEASE = catalog("LIVESTOCK_DISEASE", "id", [
  ["LIVESTOCK_DISEASE_ANTHRAX", "Anthrax"],
  ["LIVESTOCK_DISEASE_BLACKLEG", "Blackleg"],
  ["LIVESTOCK_DISEASE_CBPP", "Contagious bovine pleuropneumonia"],
  ["LIVESTOCK_DISEASE_CCPP", "Contagious caprine pleuropneumonia"],
  ["LIVESTOCK_DISEASE_FMD", "Foot and mouth disease"],
  ["LIVESTOCK_DISEASE_LSD", "Lumpy skin disease"],
  ["LIVESTOCK_DISEASE_PPR", "Peste des petits ruminants"],
  ["LIVESTOCK_DISEASE_SHEEP_GOAT_POX", "Sheep and goat pox"],
  ["LIVESTOCK_DISEASE_NEWCASTLE_DISEASE", "Newcastle disease"],
  ["LIVESTOCK_DISEASE_GUMBORO_DISEASE", "Gumboro"],
  ["LIVESTOCK_DISEASE_FOWL_TYPHOID_DISEASE", "Fowl typhoid"],
  ["LIVESTOCK_DISEASE_FOWL_POX_DISEASE", "Fowl pox"],
  ["LIVESTOCK_DISEASE_RABIES", "Rabies"],
  ["LIVESTOCK_DISEASE_BRUCELLOSIS", "Brucellosis"],
  ["LIVESTOCK_DISEASE_TRYPANOSOMIASIS", "Trypanosomiasis"],
  ["LIVESTOCK_DISEASE_MASTITIS", "Mastitis"],
  ["LIVESTOCK_DISEASE_INTERNAL_PARASITES", "Internal parasites"],
  ["LIVESTOCK_DISEASE_EXTERNAL_PARASITES", "External parasites"],
  ["LIVESTOCK_DISEASE_PASTEURELLOSIS", "Pasteurellosis"],
  ["LIVESTOCK_DISEASE_BOVINE_TB", "Bovine tuberculosis"],
  ["LIVESTOCK_DISEASE_CAMEL_POX", "Camel pox"],
  ["LIVESTOCK_DISEASE_AFRICAN_HORSE_SICKNESS", "African horse sickness"],
  ["LIVESTOCK_DISEASE_ENTEROTOXAEMIA_DISEASE", "Enterotoxaemia"],
  ["LIVESTOCK_DISEASE_COCCIDIOSIS", "Coccidiosis"],
  ["LIVESTOCK_DISEASE_FOOT_ROT", "Foot rot"],
  ["LIVESTOCK_DISEASE_BLOAT", "Bloat"],
  ["LIVESTOCK_DISEASE_RETAINED_PLACENTA", "Retained placenta"],
  ["LIVESTOCK_DISEASE_DIARRHOEA", "Diarrhoea"],
  ["LIVESTOCK_DISEASE_OTHER_DISEASE", "Other"],
]);
const EVENT_LOCATION = catalog("LIVESTOCK_EVENT_LOCATION", "code", [["LIVESTOCK_EVENT_LOCATION_HOME", "Home"], ["LIVESTOCK_EVENT_LOCATION_VETERINARY", "Veterinary clinic"], ["LIVESTOCK_EVENT_LOCATION_MARKET", "Market"], ["LIVESTOCK_EVENT_LOCATION_FIELD", "Field"], ["LIVESTOCK_EVENT_LOCATION_QUARANTINE_CENTER", "Quarantine center"], ["LIVESTOCK_EVENT_LOCATION_OTHER", "Other"]]);
const VACCINE_TYPE = catalog("VACCINE_TYPE", "id", [
  ["VACCINE_TYPE_ANTHRAX_CATTLE", "Anthrax (cattle)"],
  ["VACCINE_TYPE_BLACKLEG", "Blackleg"],
  ["VACCINE_TYPE_CBPP", "Contagious bovine pleuropneumonia"],
  ["VACCINE_TYPE_FMD_CATTLE", "Foot and mouth disease"],
  ["VACCINE_TYPE_LSD", "Lumpy skin disease"],
  ["VACCINE_TYPE_PASTEURELLOSIS_CATTLE", "Bovine pasteurellosis"],
  ["VACCINE_TYPE_BRUCELLOSIS_S19", "Brucellosis (S19)"],
  ["VACCINE_TYPE_RABIES_CATTLE", "Rabies (cattle)"],
  ["VACCINE_TYPE_PPR_SHEEP", "Peste des petits ruminants (sheep)"],
  ["VACCINE_TYPE_SGP_SHEEP", "Sheep and goat pox (sheep)"],
  ["VACCINE_TYPE_ANTHRAX_SHEEP", "Anthrax (sheep)"],
  ["VACCINE_TYPE_PASTEURELLOSIS_SHEEP", "Ovine pasteurellosis"],
  ["VACCINE_TYPE_ENTEROTOXAEMIA", "Enterotoxaemia"],
  ["VACCINE_TYPE_PPR_GOAT", "Peste des petits ruminants (goats)"],
  ["VACCINE_TYPE_SGP_GOAT", "Sheep and goat pox (goats)"],
  ["VACCINE_TYPE_CCPP", "Contagious caprine pleuropneumonia"],
  ["VACCINE_TYPE_ANTHRAX_GOAT", "Anthrax (goats)"],
  ["VACCINE_TYPE_PASTEURELLOSIS_GOAT", "Caprine pasteurellosis"],
  ["VACCINE_TYPE_ANTHRAX_CAMEL", "Anthrax (camels)"],
  ["VACCINE_TYPE_CAMEL_POX_VACCINE", "Camel pox"],
  ["VACCINE_TYPE_PASTEURELLOSIS_CAMEL", "Camel pasteurellosis"],
  ["VACCINE_TYPE_NEWCASTLE", "Newcastle disease"],
  ["VACCINE_TYPE_GUMBORO", "Gumboro (infectious bursal disease)"],
  ["VACCINE_TYPE_FOWL_TYPHOID", "Fowl typhoid"],
  ["VACCINE_TYPE_FOWL_POX", "Fowl pox"],
  ["VACCINE_TYPE_MAREK", "Marek disease"],
  ["VACCINE_TYPE_AHS", "African horse sickness (horse)"],
  ["VACCINE_TYPE_TETANUS_HORSE", "Tetanus"],
  ["VACCINE_TYPE_AHS_DONKEY", "African horse sickness (donkey)"],
  ["VACCINE_TYPE_RABIES_DONKEY", "Rabies (donkeys)"],
]);
const VITAL_EVENT = catalog("LIVESTOCK_VITAL_EVENT_TYPE", "code", [["LIVESTOCK_VITAL_EVENT_TYPE_BIRTH", "Birth"], ["LIVESTOCK_VITAL_EVENT_TYPE_MORTALITY", "Mortality"], ["LIVESTOCK_VITAL_EVENT_TYPE_DISEASE", "Disease"]]);
const CAUSE_OF_DEATH = catalog("LIVESTOCK_CAUSE_OF_DEATH", "code", [["LIVESTOCK_CAUSE_OF_DEATH_DISEASE", "Disease"], ["LIVESTOCK_CAUSE_OF_DEATH_ACCIDENT", "Accident"], ["LIVESTOCK_CAUSE_OF_DEATH_PREDATION", "Predation"], ["LIVESTOCK_CAUSE_OF_DEATH_SLAUGHTER", "Slaughter"], ["LIVESTOCK_CAUSE_OF_DEATH_UNKNOWN", "Unknown"]]);
const BREEDING_METHOD = catalog("LIVESTOCK_BREEDING_METHOD", "code", [["LIVESTOCK_BREEDING_METHOD_NATURAL", "Natural breeding"], ["LIVESTOCK_BREEDING_METHOD_AI", "Artificial insemination"]]);
const BREEDING_OUTCOME = catalog("LIVESTOCK_BREEDING_OUTCOME", "code", [["LIVESTOCK_BREEDING_OUTCOME_PENDING", "Pending"], ["LIVESTOCK_BREEDING_OUTCOME_SUCCESSFUL", "Successful"], ["LIVESTOCK_BREEDING_OUTCOME_FAILED", "Failed"]]);

// ── Form ────────────────────────────────────────────────────────────────────────────────────────────────

const LOOKUP = "livestock_farmer_lookup";
const PERSONNEL = "livestock_survey_personnel_section_02";
export const LIVESTOCK_LOCATION_SECTION = "livestock_livestock_location_section_03";
export const LIVESTOCK_ANIMAL_SECTION = "livestock_animal_details_section_01";
const HEALTH = "livestock_health_event_details_section_01";
const VACCINATION = "livestock_vaccination_details_section_01";
const VITAL = "livestock_vital_event_details_section_01";
const BREEDING = "livestock_breeding_details_section_01";
export { HEALTH as LIVESTOCK_HEALTH_SECTION, VACCINATION as LIVESTOCK_VACCINATION_SECTION, VITAL as LIVESTOCK_VITAL_SECTION, BREEDING as LIVESTOCK_BREEDING_SECTION };

const HOLDING_REGISTER = "997676d3-7008-59f9-b23e-613ad79bbb08";
const NAME_RULE = { maxLength: 100 };

type F = LivestockFieldDef;
const text = (key: string, label: string, extra: Partial<F> = {}): F => ({ key, label, type: "text", ...extra });
const date = (key: string, label: string, extra: Partial<F> = {}): F => ({ key, label, type: "date", ...extra });
const select = (key: string, label: string, from: { catalog: Catalog; choices: LivestockChoice[] }, extra: Partial<F> = {}): F => ({ key, label, type: "select", ...from, ...extra });
const yesNo = (key: string, label: string, extra: Partial<F> = {}): F => ({ key, label, type: "boolean", ...extra });

/** The animal a row belongs to, and what the registry works out from it. */
const animalColumns = (): F[] => [
  { key: "ear_tag_id", label: "Ear tag / secondary identifier", type: "animal", requiredInRow: true },
  text("species", "Species", { readOnly: true, ...SPECIES }),
  text("age", "Age", { readOnly: true }),
];

const only = (field: string, ...values: string[]) => ({ showWhen: { field, values } });

export const LIVESTOCK_REPORT_FORM: LivestockTabDef[] = [
  {
    key: "farmer",
    label: "Farmer",
    sections: [
      {
        id: LOOKUP,
        title: "Farmer lookup",
        registerId: HOLDING_REGISTER,
        isList: false,
        fields: [
          text("farmer_id", "Farmer ID", { required: true, readOnly: true, fromUrl: true }),
          text("fayda_id", "Fayda ID (FAN or FIN)", { required: true, pattern: /^\s*(?:[0-9]{12}|[0-9](?:\s*[0-9]){15})\s*$/, patternHint: "Enter exactly 12 digits (FIN) or 16 digits (FAN)." }),
        ],
      },
      {
        id: PERSONNEL,
        title: "Survey personnel",
        registerId: HOLDING_REGISTER,
        isList: false,
        fields: [
          text("surveyor_name", "DA name", { required: true, ...NAME_RULE }),
          text("surveyor_mobile_number", "DA mobile number"),
          text("supervisor_name", "Supervisor name", NAME_RULE),
          text("supervisor_mobile_number", "Supervisor mobile number"),
        ],
      },
      {
        id: LIVESTOCK_LOCATION_SECTION,
        title: "Location",
        registerId: HOLDING_REGISTER,
        isList: false,
        fields: [
          { key: "geo_lowest_level_value_id", label: "Administrative hierarchy", type: "geo", required: true },
          { key: "latitude", label: "Holding latitude", type: "number" },
          { key: "longitude", label: "Holding longitude", type: "number" },
        ],
      },
    ],
  },
  {
    key: "livestock",
    label: "Livestock",
    sections: [
      {
        id: LIVESTOCK_ANIMAL_SECTION,
        title: "Livestock details",
        registerId: "041a9f79-2142-548a-a15b-a4c76fc9f6f7",
        isList: true,
        rowLabel: "animal",
        fields: [
          select("species", "Species", SPECIES, { required: true }),
          select("breed", "Breed", BREED, { required: true }),
          text("ear_tag_id", "Ear tag", { pattern: /^ET\d{10}$/, patternHint: "Use ET followed by 10 digits, e.g. ET2149721223." }),
          text("secondary_identifier", "Secondary identifier"),
          { key: "quantity", label: "Number of animals (head count)", type: "integer" },
          { key: "weight", label: "Weight (kg)", type: "number" },
          date("date_of_birth", "Date of birth"),
          text("age", "Age", { readOnly: true }),
          select("gender", "Sex", SEX, { required: true }),
          select("health_status", "Health status", HEALTH_STATUS, { required: true }),
          select("vaccination_status", "Vaccination status", VACCINATION_STATUS, { required: true }),
          date("registration_date", "Registration date", { required: true }),
        ],
      },
    ],
  },
  {
    key: "health",
    label: "Health & Vaccination",
    sections: [
      {
        id: HEALTH,
        title: "Health event details",
        registerId: "a40e4a02-1b82-5b31-89df-71624bd96545",
        isList: true,
        rowLabel: "health event",
        fields: [
          ...animalColumns(),
          select("event_type", "Event type", HEALTH_EVENT, { requiredInRow: true }),
          select("disease_type", "Disease", DISEASE, only("event_type", "DISEASE")),
          date("date_onset", "Date of onset", only("event_type", "DISEASE", "INJURY", "TREATMENT")),
          date("date_resolution", "Date of resolution", only("event_type", "DISEASE", "INJURY", "RECOVERY")),
          yesNo("is_notifiable", "Notifiable disease", only("event_type", "DISEASE")),
          text("treatment", "Treatment administered"),
          text("veterinarian_name", "Veterinarian / officer", NAME_RULE),
          select("location", "Location", EVENT_LOCATION),
          text("location_details", "Location details"),
          text("notes", "Notes"),
        ],
      },
      {
        id: VACCINATION,
        title: "Vaccination details",
        registerId: "51c1f6d6-856a-5e2f-84e9-ff5abdc4fb75",
        isList: true,
        rowLabel: "vaccination",
        fields: [
          ...animalColumns(),
          select("vaccine_type", "Vaccine", VACCINE_TYPE, { requiredInRow: true }),
          date("vaccination_date", "Vaccination date", { requiredInRow: true }),
          date("next_due_date", "Next due date"),
          text("batch_number", "Batch / lot number"),
          text("administered_by", "Administered by"),
          text("notes", "Notes"),
        ],
      },
    ],
  },
  {
    key: "breeding",
    label: "Breeding & Vital Events",
    sections: [
      {
        id: VITAL,
        title: "Vital event details",
        registerId: "76811bf6-07df-5ed4-9466-13b782f627fe",
        isList: true,
        rowLabel: "vital event",
        fields: [
          ...animalColumns(),
          select("event_type", "Event type", VITAL_EVENT, { requiredInRow: true }),
          date("event_date", "Event date", { requiredInRow: true }),
          select("cause", "Cause", CAUSE_OF_DEATH, only("event_type", "MORTALITY")),
          select("location", "Location", EVENT_LOCATION),
          text("location_details", "Location details"),
          select("disease_type", "Disease / diagnosis", DISEASE, only("event_type", "DISEASE")),
          date("date_onset", "Date of onset", only("event_type", "DISEASE")),
          date("date_resolution", "Date of resolution", only("event_type", "DISEASE")),
          text("treatment", "Treatment administered", only("event_type", "DISEASE")),
          text("veterinarian_name", "Attending veterinarian", { ...NAME_RULE, ...only("event_type", "DISEASE") }),
          yesNo("is_notifiable", "Notifiable disease", only("event_type", "DISEASE")),
          { key: "offspring_count", label: "Number of offspring", type: "integer", ...only("event_type", "BIRTH") },
          select("offspring_gender", "Sex of offspring", SEX, only("event_type", "BIRTH")),
          select("offspring_breed", "Breed of offspring", BREED, only("event_type", "BIRTH")),
          { key: "offspring_weight", label: "Birth weight (kg)", type: "number", ...only("event_type", "BIRTH") },
          text("reporting_officer", "Reporting officer"),
          text("notes", "Notes"),
        ],
      },
      {
        id: BREEDING,
        title: "Breeding details",
        registerId: "192c08b0-5403-5167-968a-2676d4af2879",
        isList: true,
        rowLabel: "breeding record",
        fields: [
          ...animalColumns(),
          select("event_type", "Breeding type", BREEDING_METHOD, { requiredInRow: true }),
          date("breeding_date", "Breeding date", { requiredInRow: true }),
          text("sire_or_semen_id", "Sire / semen source"),
          select("location", "Location", EVENT_LOCATION),
          text("location_details", "Location details"),
          text("ai_technician_name", "AI technician", { ...NAME_RULE, ...only("event_type", "AI") }),
          text("ai_technique", "Technique used", only("event_type", "AI")),
          text("semen_batch_number", "Semen batch number", only("event_type", "AI")),
          date("expected_calving_date", "Expected calving date"),
          yesNo("pregnancy_confirmed", "Pregnancy confirmed"),
          date("pregnancy_confirmation_date", "Pregnancy confirmation date", only("pregnancy_confirmed", "true")),
          select("outcome", "Outcome", BREEDING_OUTCOME),
          text("notes", "Notes"),
        ],
      },
    ],
  },
];

/** Every section of a form, in screen order. */
export const livestockSections = (form: LivestockTabDef[] = LIVESTOCK_REPORT_FORM) => form.flatMap((t) => t.sections);

// ── The live form ───────────────────────────────────────────────────────────────────────────────────────

/** A live choice as the form uses it. The intake body gives value_id and value_display; value_code is used when present. */
function toChoice(raw: string | ApiLivestockChoice, def: Catalog | undefined): LivestockChoice | null {
  if (typeof raw === "string") return { value: raw, label: raw };
  const id = raw.value_id ?? raw.value_code;
  if (!id) return null;
  const label = raw.value_display ?? id;
  return catalogChoice(def ?? { attribute: "", store: "id" }, id, label, raw.value_code);
}

function fromLiveField(live: ApiLivestockIntakeField, base: LivestockFieldDef | undefined): LivestockFieldDef {
  const type = (live.data_type ?? "").toLowerCase();
  const inferred: LivestockFieldType = /int/.test(type) ? "integer" : /number|float|decimal|double/.test(type) ? "number" : /date/.test(type) ? "date" : /bool/.test(type) ? "boolean" : "text";
  const liveChoices = (live.choices?.length ? live.choices : live.options) ?? [];
  const choices = liveChoices.map((c) => toChoice(c, base?.catalog)).filter((c): c is LivestockChoice => !!c);
  const field: LivestockFieldDef = base ?? { key: live.field_name, label: live.field_name, type: choices.length ? "select" : inferred };
  return {
    ...field,
    label: live.label?.trim() || field.label,
    // The live flags win. showWhen and requiredInRow stay from the snapshot: the live `rules` are not read yet.
    required: live.required ?? field.required,
    readOnly: live.readonly ?? field.readOnly,
    ...(choices.length && field.type === "select" ? { choices } : {}),
  };
}

/**
 * The form as the live response has it: labels, required, read-only, choices and field order follow the response, which
 * wins over the snapshot; a field it no longer lists is not drawn. Location stays as built here: its one Geography control
 * stands for the level pickers and the coordinates, whose fields do not match one to one. Without a response nothing changes.
 */
export function applyLivestockIntake(form: LivestockTabDef[], intake: ApiLivestockIntakeForm | null | undefined): LivestockTabDef[] {
  if (!intake?.sections?.length) return form;
  return form.map((tab) => ({
    ...tab,
    sections: tab.sections.map((section) => {
      const live = section.id === LIVESTOCK_LOCATION_SECTION ? undefined : intake.sections?.find((s) => s.section_id === section.id)?.fields;
      if (!live?.length) return section;
      return { ...section, fields: live.map((l) => fromLiveField(l, section.fields.find((f) => f.key === l.field_name))) };
    }),
  }));
}

// ── Values ──────────────────────────────────────────────────────────────────────────────────────────────

/** A new form: one-row sections with their row, list sections empty. */
export function emptyLivestockValues(form: LivestockTabDef[] = LIVESTOCK_REPORT_FORM): LivestockValues {
  return Object.fromEntries(livestockSections(form).map((s) => [s.id, s.isList ? [] : [{}]]));
}

export const isLivestockFieldVisible = (field: LivestockFieldDef, row: LivestockRow) => !field.showWhen || field.showWhen.values.includes(row[field.showWhen.field] ?? "");

const isEmptyRow = (row: LivestockRow) => Object.values(row).every((v) => !v?.trim());

const fieldIsWritable = (field: LivestockFieldDef) => !field.readOnly && !field.fromUrl;

/** The form's checks, per row. Only what the field map states, plus what makes a list row mean anything. */
export function validateLivestockForm(form: LivestockTabDef[], values: LivestockValues, geoIds: LivestockGeoIds = {}): LivestockErrors {
  const errors: LivestockErrors = {};
  for (const section of livestockSections(form)) {
    (values[section.id] ?? []).forEach((row, index) => {
      if (section.isList && isEmptyRow(row)) return;
      for (const field of section.fields) {
        if (field.readOnly || field.fromUrl || !isLivestockFieldVisible(field, row)) continue;
        const id = livestockFieldId(section.id, index, field.key);
        if (field.type === "geo") {
          if (field.required && !geoIds.kebele) errors[id] = "Choose the region, zone, woreda and kebele.";
          continue;
        }
        const raw = (row[field.key] ?? "").trim();
        if (!raw) {
          if (field.required || field.requiredInRow) errors[id] = `${field.label} is required.`;
          continue;
        }
        if (field.pattern && !field.pattern.test(raw)) errors[id] = field.patternHint ?? `${field.label} is not valid.`;
        else if (field.maxLength && raw.length > field.maxLength) errors[id] = `${field.label} can be at most ${field.maxLength} characters.`;
        else if (field.type === "number" || field.type === "integer") {
          const n = Number(raw);
          if (!Number.isFinite(n) || (field.key !== "latitude" && field.key !== "longitude" && n < 0)) errors[id] = `${field.label} must be a number.`;
          else if (field.type === "integer" && !Number.isInteger(n)) errors[id] = `${field.label} must be a whole number.`;
        }
      }
    });
  }
  return errors;
}

/** The tab a field id is on. */
export function tabOfLivestockField(form: LivestockTabDef[], fieldId: string): string | undefined {
  return form.find((t) => t.sections.some((s) => fieldId.startsWith(`${s.id}.`)))?.key;
}

function toApiValue(raw: string, field: LivestockFieldDef): unknown {
  const value = raw.trim();
  if (field.type === "number" || field.type === "integer") return Number(value);
  if (field.type === "boolean") return value === "true";
  if (field.key === "fayda_id") return value.replace(/\s/g, "");
  return value;
}

function locationRecord(row: LivestockRow, geoIds: LivestockGeoIds): Record<string, unknown> {
  const levels = [["region", "l1"], ["zone", "l2"], ["woreda", "l3"], ["kebele", "l4"]] as const;
  const hierarchy = levels.flatMap(([level, levelId]) => {
    const id = geoIds[level];
    return id ? [{ level, level_id: levelId, level_mnemonic: level, level_value_id: id, level_value_mnemonic: row[level] }] : [];
  });
  const lowest = geoIds.kebele;
  return {
    ...(lowest ? { geo_lowest_level_value_id: lowest, geo_code_hierarchy_json: { hierarchy, lowest_level_value_id: lowest } } : {}),
    ...(row.latitude?.trim() ? { latitude: Number(row.latitude) } : {}),
    ...(row.longitude?.trim() ? { longitude: Number(row.longitude) } : {}),
  };
}

/** The sections as the save route takes them: writable, visible, filled fields only; rows and sections with nothing go out. */
export function buildLivestockSections(form: LivestockTabDef[], values: LivestockValues, geoIds: LivestockGeoIds = {}): LivestockSectionInput[] {
  return livestockSections(form).flatMap((section) => {
    const records = (values[section.id] ?? []).flatMap((row) => {
      const record: Record<string, unknown> =
        section.id === LIVESTOCK_LOCATION_SECTION
          ? locationRecord(row, geoIds)
          : Object.fromEntries(
              section.fields
                .filter((f) => fieldIsWritable(f) && isLivestockFieldVisible(f, row) && (row[f.key] ?? "").trim() !== "")
                .map((f) => [f.key, toApiValue(row[f.key], f)]),
            );
      return Object.keys(record).length ? [record] : [];
    });
    return records.length ? [{ section_id: section.id, records }] : [];
  });
}

// ── Submit ──────────────────────────────────────────────────────────────────────────────────────────────

/** How far a submit got, so a retry never saves the same section twice. */
export interface LivestockSubmitProgress {
  submissionId: string;
  subjectRecordId?: string;
  reference?: string;
  /** Sections already on the draft. */
  saved: string[];
}

const MAIN_SECTIONS = new Set([LOOKUP, PERSONNEL, LIVESTOCK_LOCATION_SECTION, LIVESTOCK_ANIMAL_SECTION]);

/**
 * The order the Livestock collection documents: a new draft with the farmer sections and the animals, then the event
 * sections on that draft (they name those animals), then finalize. `onProgress` reports each step that went through.
 */
export async function submitLivestockReport(
  farmerCode: string,
  sections: LivestockSectionInput[],
  progress: LivestockSubmitProgress | null,
  onProgress: (next: LivestockSubmitProgress) => void,
): Promise<LivestockSubmitProgress> {
  let current = progress;
  if (!current) {
    const main = sections.filter((s) => MAIN_SECTIONS.has(s.section_id));
    const saved = await saveFarmerLivestock(farmerCode, main);
    if (!saved.submission_id) throw new Error("The registry did not return a submission. Nothing was sent for approval.");
    current = { submissionId: saved.submission_id, subjectRecordId: saved.subject_record_id, reference: saved.application_reference, saved: main.map((s) => s.section_id) };
    onProgress(current);
  }
  const alreadySaved = current.saved;
  const rest = sections.filter((s) => !alreadySaved.includes(s.section_id));
  if (rest.length) {
    await saveFarmerLivestock(farmerCode, rest, { submissionId: current.submissionId, subjectRecordId: current.subjectRecordId });
    current = { ...current, saved: [...alreadySaved, ...rest.map((s) => s.section_id)] };
    onProgress(current);
  }
  const finalized = await finalizeFarmerLivestock(farmerCode, current.submissionId);
  return { ...current, reference: finalized?.application_reference ?? current.reference };
}
