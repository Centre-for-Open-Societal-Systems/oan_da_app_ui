import {
  isLivestockFieldVisible,
  LIVESTOCK_ANIMAL_SECTION,
  LIVESTOCK_BREEDING_SECTION,
  LIVESTOCK_HEALTH_SECTION,
  LIVESTOCK_VACCINATION_SECTION,
  LIVESTOCK_VITAL_SECTION,
  livestockSections,
  type LivestockFieldDef,
  type LivestockFieldType,
  type LivestockRow,
  type LivestockValues,
} from "./livestockReport";
import type { Farmer } from "./types";

// Reads GET /farmers/{id}/livestock. The list mixes two kinds of row:
//   - kind "record": a row of a register. Holdings carry farmer_id; the rest (animals, health, vaccination, vital, breeding)
//     point at their holding with link_internal_record_id, and which one they are shows in register_id.
//   - kind "submission": an intake with its rows under `sections`. Once approved its rows are records too (and may have moved
//     on: an approved mortality turns the animal DECEASED), so only submissions not yet approved are shown as their own entry.

export type ApiLivestockRecord = Record<string, unknown>;

interface ApiSubmissionSection {
  section_id?: string;
  records?: ApiLivestockRecord[];
}

/** A holding with what hangs off it: from the register once approved, from the submission's sections before that. */
export interface LivestockHolding {
  key: string;
  /** LS-… for a register record, the application reference for a submission. */
  label: string;
  /** Approved register record, or a submission still on its way. */
  source: "record" | "submission";
  status: string;
  /** Newest first by this. */
  updatedAt: string;
  holding: ApiLivestockRecord;
  /** Section id → rows. */
  rows: Record<string, ApiLivestockRecord[]>;
}

export interface LivestockSubmissionSummary {
  key: string;
  reference: string;
  date: string;
  createdBy: string;
  source: string;
  animals: number;
  status: string;
}

export interface LivestockOverview {
  holdings: LivestockHolding[];
  submissions: LivestockSubmissionSummary[];
}

const str = (v: unknown) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
const list = (v: unknown): ApiLivestockRecord[] => (Array.isArray(v) ? v.filter((r): r is ApiLivestockRecord => !!r && typeof r === "object") : []);

const words = (code: string) => (code ? code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, " ") : "");

// Ear tag replacement is not on the live form yet, so its register has no known id: its rows show by their own column.
const RETAG_SECTION = "livestock_retagging_details_section_01";

const sectionOfRow = (row: ApiLivestockRecord) => livestockSections().find((s) => s.isList && s.registerId === row.register_id)?.id ?? ("new_ear_tag_id" in row ? RETAG_SECTION : undefined);

function fromRecord(row: ApiLivestockRecord, all: ApiLivestockRecord[]): LivestockHolding {
  const id = row.internal_record_id;
  const rows: Record<string, ApiLivestockRecord[]> = {};
  for (const other of all) {
    if (other.link_internal_record_id !== id) continue;
    const sectionId = sectionOfRow(other);
    if (sectionId) (rows[sectionId] ??= []).push(other);
  }
  return {
    key: str(id),
    label: str(row.functional_record_id) || str(id),
    source: "record",
    status: words(str(row.state)) || "Approved",
    updatedAt: str(row.last_approved_at) || str(row.created_at),
    holding: row,
    rows,
  };
}

function fromSubmission(row: ApiLivestockRecord): LivestockHolding {
  const sections = list(row.sections) as ApiSubmissionSection[];
  const rows: Record<string, ApiLivestockRecord[]> = {};
  for (const section of sections) if (section.section_id) rows[section.section_id] = list(section.records);
  // Lookup, personnel and location share one holding row; the location's has the most in it.
  const holding = livestockSections().filter((s) => !s.isList).map((s) => rows[s.id]?.[0]).reverse().find(Boolean) ?? {};
  return {
    key: str(row.submission_id),
    label: str(row.application_reference) || str(row.submission_id),
    source: "submission",
    status: submissionStatus(row),
    updatedAt: str(row.last_updated_at) || str(row.first_created_at),
    holding,
    rows,
  };
}

function submissionStatus(row: ApiLivestockRecord): string {
  return str(row.draft_status) === "DRAFT" ? "Draft" : words(str(row.approval_status)) || "Pending";
}

const animalsOf = (row: ApiLivestockRecord) => (list(row.sections) as ApiSubmissionSection[]).find((s) => s.section_id === LIVESTOCK_ANIMAL_SECTION)?.records?.length ?? 0;

/** The farmer's holdings newest first, then every submission for the history. */
export function readLivestock(rows: ApiLivestockRecord[]): LivestockOverview {
  const records = rows.filter((r) => r.kind === "record");
  const submissions = rows.filter((r) => r.kind === "submission");
  const registered = records.filter((r) => !!r.farmer_id);
  // Approved submissions are normally shown through their records; with no records at all they are all there is to show.
  const holdings = [
    ...registered.map((r) => fromRecord(r, records)),
    ...submissions.filter((s) => registered.length === 0 || str(s.approval_status) !== "APPROVED").map(fromSubmission),
  ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return {
    holdings,
    submissions: submissions
      .map((s) => ({
        key: str(s.submission_id),
        reference: str(s.application_reference) || "—",
        date: str(s.finalized_at) || str(s.first_created_at),
        createdBy: str(s.created_by) || "—",
        source: words(str(s.submission_source)) || "—",
        animals: animalsOf(s),
        status: submissionStatus(s),
      }))
      .sort((a, b) => b.date.localeCompare(a.date)),
  };
}

/** A farmer without livestock, for the same layout: only what the profile knows. */
export function noLivestockHolding(farmer: Pick<Farmer, "id" | "regId" | "name" | "region" | "woreda" | "kebele">): LivestockHolding {
  return {
    key: "none",
    label: "—",
    source: "record",
    status: "No records",
    updatedAt: "",
    holding: { farmer_id: farmer.regId ?? farmer.id, farmer_name: farmer.name, region: farmer.region, woreda: farmer.woreda, kebele: farmer.kebele === "—" ? "" : farmer.kebele },
    rows: {},
  };
}

/** Live head count of a holding: a flock's quantity, one for a tagged animal, none for the deceased. */
export function headCount(holding: LivestockHolding): number {
  return (holding.rows[LIVESTOCK_ANIMAL_SECTION] ?? []).reduce((sum, a) => (a.health_status === "DECEASED" ? sum : sum + (typeof a.quantity === "number" && a.quantity > 0 ? a.quantity : 1)), 0);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2026-11-02" or a local date-time → "02 Nov 2026"; anything else as it came. */
export function formatLivestockDate(raw: unknown): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(str(raw));
  return match ? `${match[3]} ${MONTHS[Number(match[2]) - 1] ?? match[2]} ${match[1]}` : str(raw) || "—";
}

/** A stored value as shown: catalog label, Yes / No, date, or number without the registry's float noise (1.8000000000000000444). */
export function displayLivestockValue(field: LivestockFieldDef, raw: unknown): string {
  if (raw === null || raw === undefined || raw === "") return "—";
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (field.type === "date") return formatLivestockDate(raw);
  if (field.type === "number" || field.type === "integer") {
    const n = Number(raw);
    return Number.isFinite(n) ? String(n) : str(raw);
  }
  const choice = field.choices?.find((c) => c.value === raw);
  if (choice) return choice.label;
  // A catalog value newer than the form's snapshot: readable rather than the stored code.
  if (field.choices?.length && /^[A-Z0-9_]+$/.test(str(raw))) return words(str(raw));
  return str(raw) || "—";
}

const plural = (n: number, unit: string) => `${n} ${unit}${n === 1 ? "" : "s"}`;

/** "2 years, 8 months" as of today, the registry's wording; "—" for a date that is not a past date of birth. */
function ageFromBirth(raw: string, today: Date): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(raw);
  if (!match) return "—";
  const [year, month, day] = match.slice(1).map(Number);
  const months = (today.getFullYear() - year) * 12 + today.getMonth() + 1 - month - (today.getDate() < day ? 1 : 0);
  return months < 0 ? "—" : `${plural(Math.floor(months / 12), "year")}, ${plural(months % 12, "month")}`;
}

/** The registry's age of an animal or of the animal an event names, else worked out from its date of birth. */
export function livestockAge(row: ApiLivestockRecord, animals: ApiLivestockRecord[] = [], today = new Date()): string {
  const tag = str(row.ear_tag_id) || str(row.secondary_identifier);
  const animal = tag ? animals.find((a) => a.ear_tag_id === tag || a.secondary_identifier === tag) : undefined;
  const stored = str(row.age) || str(animal?.age);
  if (stored) return stored.replace(/\b1 (year|month)s\b/g, "1 $1");
  return ageFromBirth(str(row.date_of_birth) || str(animal?.date_of_birth), today);
}

export interface LivestockDetailsField {
  key: string;
  label: string;
  value: string;
  isFarmerAvatar?: boolean;
  initials?: string;
}

export interface LivestockDetailsSectionDef {
  title: string;
  /** Why the section is empty when that is not the farmer's record but the data source. */
  note?: string;
  fields: LivestockDetailsField[];
}

export interface LivestockDetailsTab {
  key: string;
  label: string;
  sections: LivestockDetailsSectionDef[];
}

const initialsOf = (name: string) => name.split(/\s+/).map((p) => p[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "—";

/** A level's name: the holding's own column, else the geo chain (a submission not yet approved has only that). */
function placeName(holding: ApiLivestockRecord, level: string): string {
  const own = str(holding[level]);
  if (own) return own;
  const json = holding.geo_code_hierarchy_json as { hierarchy?: { level?: string; level_value_mnemonic?: string }[] } | null | undefined;
  return json?.hierarchy?.find((h) => h.level === level)?.level_value_mnemonic ?? "—";
}

const coerced = (row: ApiLivestockRecord): LivestockRow => Object.fromEntries(Object.entries(row).map(([k, v]) => [k, typeof v === "boolean" ? String(v) : str(v)]));

const NOT_PROVIDED = "The Livestock API does not provide this yet.";

/** A column of a profile card: registry field, its label, and its type when no form section defines it. */
type ProfileField = [key: string, label: string, type?: LivestockFieldType];

interface ProfileCard {
  sectionId: string;
  title: string;
  fields: ProfileField[];
  /** Keep every field, empty or not, whatever the record's event type. */
  allFields?: boolean;
  /** Shown while the card has no rows, in place of "None recorded". */
  unavailable?: string;
}

const ANIMAL_COLUMNS: ProfileField[] = [["ear_tag_id", "Ear Tag / Secondary Identifier"], ["species", "Species"], ["age", "Age"]];

// The profile's layout, as designed: its own titles, labels and order. The report form keeps the live form's.
const PROFILE_TABS: { key: string; label: string; cards: ProfileCard[] }[] = [
  {
    key: "livestock",
    label: "Livestock",
    cards: [
      {
        sectionId: LIVESTOCK_ANIMAL_SECTION,
        title: "Livestock Details",
        fields: [
          ["ear_tag_id", "Livestock Ear Tag"],
          ["secondary_identifier", "Secondary Identifier"],
          ["species", "Species"],
          ["breed", "Breed"],
          ["quantity", "Quantity"],
          ["weight", "Weight"],
          ["date_of_birth", "Date of Birth"],
          ["age", "Age"],
          ["gender", "Sex"],
          ["health_status", "Health Status"],
          ["vaccination_status", "Vaccination Status"],
          ["registration_date", "Registration Date"],
        ],
      },
      {
        sectionId: RETAG_SECTION,
        title: "Ear Tag Replacement",
        allFields: true,
        unavailable: NOT_PROVIDED,
        fields: [
          ["ear_tag_id", "Old Ear Tag"],
          ["species", "Species"],
          ["new_ear_tag_id", "New Ear Tag"],
          ["reason", "Reason for Replacement"],
          ["retag_date", "Date of Retagging", "date"],
          ["approving_officer", "Approving Officer"],
          ["justification", "Justification Notes"],
          ["created_at", "Applied On", "date"],
        ],
      },
    ],
  },
  {
    key: "health",
    label: "Health & Vaccination",
    cards: [
      {
        sectionId: LIVESTOCK_HEALTH_SECTION,
        title: "Health Event Details",
        fields: [
          ...ANIMAL_COLUMNS,
          ["event_type", "Event Type"],
          ["disease_type", "Disease"],
          ["date_onset", "Date of Onset"],
          ["date_resolution", "Date of Resolution"],
          ["is_notifiable", "Notifiable Disease"],
          ["treatment", "Treatment Administered"],
          ["veterinarian_name", "Veterinarian / Officer"],
          ["location", "Location"],
          ["location_details", "Location Details"],
          ["notes", "Notes"],
        ],
      },
      {
        sectionId: LIVESTOCK_VACCINATION_SECTION,
        title: "Vaccination Details",
        fields: [
          ...ANIMAL_COLUMNS,
          ["vaccine_type", "Vaccine"],
          ["vaccination_date", "Vaccination Date"],
          ["next_due_date", "Next Due Date"],
          ["batch_number", "Batch / Lot Number"],
          ["administered_by", "Administered By"],
          ["notes", "Notes"],
        ],
      },
    ],
  },
  {
    key: "breeding",
    label: "Breeding & Vital Events",
    cards: [
      {
        sectionId: LIVESTOCK_VITAL_SECTION,
        title: "Vital Event Details",
        allFields: true,
        fields: [
          ...ANIMAL_COLUMNS,
          ["event_type", "Event Type"],
          ["event_date", "Event Date"],
          ["cause", "Cause"],
          ["location", "Location"],
          ["location_details", "Location Details"],
          ["disease_type", "Disease / Diagnosis"],
          ["date_onset", "Date of Onset"],
          ["date_resolution", "Date of Resolution"],
          ["treatment", "Treatment Administered"],
          ["veterinarian_name", "Attending Veterinarian"],
          ["is_notifiable", "Notifiable Disease"],
          ["offspring_count", "Number of Offspring"],
          ["offspring_gender", "Sex of Offspring"],
          ["reporting_officer", "Reporting Officer"],
          ["notes", "Notes"],
        ],
      },
      {
        sectionId: LIVESTOCK_BREEDING_SECTION,
        title: "Breeding Details",
        fields: [
          ...ANIMAL_COLUMNS,
          ["event_type", "Breeding Type"],
          ["breeding_date", "Breeding Date"],
          ["sire_or_semen_id", "Sire / Semen Source"],
          ["location", "Location"],
          ["location_details", "Location Details"],
          ["ai_technician_name", "AI Technician"],
          ["ai_technique", "Technique Used"],
          ["semen_batch_number", "Semen Batch Number"],
          ["expected_calving_date", "Expected Calving Date"],
          ["pregnancy_confirmed", "Pregnancy Confirmed"],
          ["pregnancy_confirmation_date", "Pregnancy Confirmation Date"],
          ["outcome", "Outcome"],
          ["notes", "Notes"],
        ],
      },
    ],
  },
];

const notProvided = (title: string, labels: string[]): LivestockDetailsSectionDef => ({ title, note: NOT_PROVIDED, fields: labels.map((label) => ({ key: label, label, value: "—" })) });

// Designed, but no Livestock API returns imports or the audit log: the layout is here for when one does.
const IMPORTS_TAB: LivestockDetailsTab = {
  key: "imports",
  label: "Imports & Audit",
  sections: [
    notProvided("Import Batch Details", ["Batch ID", "Source System", "Status", "File Name", "File Document", "Total Rows", "Succeeded", "Failed", "Conflicts", "Error / Conflict Log", "Processed By", "Processed On"]),
    notProvided("Audit Log Details", ["Related Model", "Related Record", "Action", "User", "User Role", "Changes", "Timestamp", "IP Address", "Session ID"]),
  ],
};

const formField = (sectionId: string, key: string) => livestockSections().find((s) => s.id === sectionId)?.fields.find((f) => f.key === key);

/** One card per record, with the fields that apply to its event type. */
function recordSections(card: ProfileCard, rows: ApiLivestockRecord[], animals: ApiLivestockRecord[]): LivestockDetailsSectionDef[] {
  if (rows.length === 0) {
    if (card.unavailable) return [{ title: card.title, note: card.unavailable, fields: card.fields.map(([key, label]) => ({ key, label, value: "—" })) }];
    return [{ title: card.title, fields: [{ key: "none", label: "Records", value: "None recorded" }] }];
  }
  return rows.map((row, index) => {
    const name = str(row.ear_tag_id) || str(row.secondary_identifier) || str(row.record_name);
    const flat = coerced(row);
    const fields = card.fields.flatMap(([key, label, type]): LivestockDetailsField[] => {
      const def = formField(card.sectionId, key) ?? formField(LIVESTOCK_ANIMAL_SECTION, key) ?? { key, label, type: type ?? "text" };
      if (!card.allFields && !isLivestockFieldVisible(def, flat)) return [];
      return [{ key, label, value: key === "age" ? livestockAge(row, animals) : displayLivestockValue(def, row[key]) }];
    });
    // The registry assigns these on an approved birth; they are not part of the form.
    const offspringTags = str(row.offspring_ear_tags);
    if (offspringTags) fields.push({ key: "offspring_ear_tags", label: "Offspring Ear Tags", value: offspringTags });
    return { title: `${card.title}${name ? ` · ${name}` : ""} (${index + 1} of ${rows.length})`, fields };
  });
}

/** One holding as the sub-tabs of the profile's "Livestock Details". */
export function livestockDetailsTabs(item: LivestockHolding, farmerName: string): LivestockDetailsTab[] {
  const h = item.holding;
  const name = str(h.farmer_name) || farmerName;
  const value = (key: string) => str(h[key]) || "—";
  const heads = headCount(item);
  const place = (level: string, label: string): LivestockDetailsField => ({ key: level, label, value: placeName(h, level) });
  const fayda = str(h.fayda_id) || str(h.fayda_fin) || str(h.fayda_fan_id);
  const animals = item.rows[LIVESTOCK_ANIMAL_SECTION] ?? [];
  return [
    {
      key: "farmer",
      label: "Farmer",
      sections: [
        {
          title: "Livestock Record",
          fields: [
            { key: "farmer", label: "Farmer", value: name, isFarmerAvatar: true, initials: initialsOf(name) },
            { key: "farmer_id", label: "Farmer ID", value: value("farmer_id") },
            // The registry holds a 12-digit FIN or a 16-digit FAN, whichever the farmer gave.
            { key: "fayda", label: `Fayda ID (${fayda.replace(/\D/g, "").length === 12 ? "FIN" : "FAN"})`, value: fayda || "—" },
            { key: "farmer_name", label: "Farmer Name", value: name },
            { key: "record", label: item.source === "record" ? "Livestock ID" : "Application reference", value: item.label },
            { key: "status", label: "Status", value: item.status },
            { key: "head_count", label: "Head count (alive)", value: String(heads) },
          ],
        },
        {
          title: "Survey Personnel",
          fields: [
            { key: "surveyor_name", label: "DA Name", value: value("surveyor_name") },
            { key: "surveyor_mobile_number", label: "DA Mobile Number", value: value("surveyor_mobile_number") },
            { key: "supervisor_name", label: "Supervisor Name", value: value("supervisor_name") },
            { key: "supervisor_mobile_number", label: "Supervisor Mobile Number", value: value("supervisor_mobile_number") },
          ],
        },
        {
          title: "Location",
          fields: [
            place("region", "Location"),
            place("zone", "Zone"),
            place("woreda", "Woreda"),
            place("kebele", "Kebele"),
            { key: "latitude", label: "Latitude", value: value("latitude") },
            { key: "longitude", label: "Longitude", value: value("longitude") },
          ],
        },
      ],
    },
    ...PROFILE_TABS.map((tab) => ({
      key: tab.key,
      label: tab.label,
      sections: tab.cards.flatMap((card) => recordSections(card, item.rows[card.sectionId] ?? [], animals)),
    })),
    IMPORTS_TAB,
  ];
}

/** The animal a row can name: the ear tag, else the secondary identifier (a flock's FLOCK-… goes in the row's ear_tag_id). */
export interface LivestockAnimalOption {
  value: string;
  label: string;
  species: string;
  age: string;
}

const animalOption = (row: ApiLivestockRecord | LivestockRow, speciesLabel: (v: string) => string): LivestockAnimalOption | null => {
  const value = str(row.ear_tag_id) || str(row.secondary_identifier);
  if (!value) return null;
  const species = str(row.species);
  return { value, label: `${value} · ${speciesLabel(species) || "—"}`, species, age: str(row.age) };
};

const speciesLabel = (value: string) => livestockSections().find((s) => s.id === LIVESTOCK_ANIMAL_SECTION)?.fields.find((f) => f.key === "species")?.choices?.find((c) => c.value === value)?.label ?? value;

/** Animals the row pickers offer: the ones entered in this form first, then those on the register (alive only), one per id. */
export function animalOptions(values: LivestockValues, overview: LivestockOverview | null): LivestockAnimalOption[] {
  const entered = (values[LIVESTOCK_ANIMAL_SECTION] ?? []).map((r) => animalOption(r, speciesLabel));
  const registered = (overview?.holdings ?? []).filter((h) => h.source === "record").flatMap((h) => (h.rows[LIVESTOCK_ANIMAL_SECTION] ?? []).filter((a) => a.health_status !== "DECEASED").map((a) => animalOption(a, speciesLabel)));
  const seen = new Set<string>();
  return [...entered, ...registered].filter((o): o is LivestockAnimalOption => {
    if (!o || seen.has(o.value)) return false;
    seen.add(o.value);
    return true;
  });
}

/** What a new report starts from: the identity, people and place of the farmer's newest holding. The DA can change them. */
export function livestockPrefill(overview: LivestockOverview): { name: string; values: LivestockValues } {
  const newest = overview.holdings[0]?.holding ?? {};
  const name = overview.holdings.map((h) => str(h.holding.farmer_name)).find(Boolean) ?? "";
  const pick = (keys: string[]): LivestockRow => Object.fromEntries(keys.flatMap((k) => (str(newest[k]) ? [[k, str(newest[k])]] : [])));
  const fayda = str(newest.fayda_id) || str(newest.fayda_fin) || str(newest.fayda_fan_id);
  // Place names from the holding's columns, else its geo chain: a submission not yet approved has only the chain.
  const places = Object.fromEntries(["region", "zone", "woreda", "kebele"].flatMap((level) => {
    const place = placeName(newest, level);
    return place && place !== "—" ? [[level, place]] : [];
  }));
  return {
    name,
    values: {
      livestock_farmer_lookup: [fayda ? { fayda_id: fayda } : {}],
      livestock_survey_personnel_section_02: [pick(["surveyor_name", "surveyor_mobile_number", "supervisor_name", "supervisor_mobile_number"])],
      livestock_livestock_location_section_03: [{ ...places, ...pick(["latitude", "longitude"]) }],
    },
  };
}
