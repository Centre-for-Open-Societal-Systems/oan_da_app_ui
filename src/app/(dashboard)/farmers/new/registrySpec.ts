import type { FieldOption } from "@/features/farmers";
import { toEthiopianDate } from "./ethiopianDate";

// Register Farmer steps, following the Farmer Registry intake form ("Farmer registration").
// Only fields an agent fills in are listed; record IDs, audit stamps and totals the registry
// works out itself are left out. Dropdown values are not hard-coded: a field with `source`
// takes its options from GET /registries/farmer/field-options (the registry's own code lists),
// and the value kept is the registry code that POST /farmers expects.

export type FieldType = "text" | "number" | "date" | "tel" | "select" | "radio" | "checkbox" | "textarea" | "document" | "derived" | "capture";

export interface RegistryField {
  /** Form field name, also the draft key. */
  name: string;
  label: string;
  type: FieldType;
  /** Fixed choices (yes / no). Registry code lists use `source` instead. */
  options?: readonly (string | FieldOption)[];
  /** Registry register and field whose code list fills this dropdown, e.g. { register: "Farmer", field: "gender" }. */
  source?: { register: string; field: string };
  required?: boolean;
  /** Enabled only while another field holds this value; the field stays on screen, greyed out, until then. */
  showWhen?: { field: string; equals: string };
  hint?: string;
  /** Worked out from the other fields and shown read-only. */
  derive?: (values: Record<string, string>) => string;
  /** Value the field starts with until the agent changes it. */
  defaultValue?: string;
  /** Replaces the default "Enter <label>" / "Select <label>" prompt. */
  placeholder?: string;
  /** Spans the whole row. */
  wide?: boolean;
  /** Coordinate fields: shows a pin that fills latitude and longitude (and, for the enumerator, altitude and accuracy) from the device. */
  locate?: boolean;
  /** Checkbox only: heading over a run of consecutive checkboxes, set on the first of them. */
  group?: string;
}

export interface RegistrySection {
  title: string;
  /** One line under the title. */
  description?: string;
  /** Fields per row from xl up (default 3). */
  columns?: 3 | 4;
  fields: RegistryField[];
}

export interface RegistryTab {
  key: string;
  label: string;
  /** Title and line of the card that wraps the step's sections. */
  heading?: { title: string; description: string };
  sections: RegistrySection[];
}

export const YES_NO = ["Yes", "No"] as const;

/** Whole years from a yyyy-mm-dd birth date to today; empty until a date is entered. */
const ageFrom = (iso: string) => {
  const born = /^\d{4}-\d{2}-\d{2}$/.test(iso) ? new Date(`${iso}T00:00:00`) : null;
  if (!born || Number.isNaN(born.getTime())) return "";
  const now = new Date();
  let years = now.getFullYear() - born.getFullYear();
  if (now.getMonth() < born.getMonth() || (now.getMonth() === born.getMonth() && now.getDate() < born.getDate())) years -= 1;
  return years >= 0 ? String(years) : "";
};

const from = (register: string, field: string) => ({ register, field });

export const REGISTRY_TABS: RegistryTab[] = [
  {
    key: "farmer",
    label: "Farmer",
    heading: { title: "Farmer Profile", description: "Record the farmer's name, contact, birth, socio-economic and identity details." },
    sections: [
      {
        title: "Personal Information",
        description: "Ethiopian names: first name, father's name, grandfather's name. Add the name in the farmer's own language if known.",
        fields: [
          { name: "first_name", label: "First Name", type: "text", required: true, hint: "Letters, spaces, ' and - only" },
          { name: "middle_name", label: "Father's Name", type: "text" },
          { name: "last_name", label: "Grandfather's Name", type: "text", required: true },
          { name: "first_name_local", label: "First Name (local language)", type: "text" },
          { name: "middle_name_local", label: "Father's Name (local language)", type: "text" },
          { name: "last_name_local", label: "Grandfather's Name (local language)", type: "text" },
          { name: "language_spoken", label: "Language Spoken", type: "select", source: from("Farmer", "language_spoken") },
        ],
      },
      {
        title: "Phone Number",
        description: "The farmer's primary mobile number.",
        columns: 4,
        fields: [{ name: "phone_number", label: "Phone Number", type: "tel", hint: "09XXXXXXXX or +2519XXXXXXXX" }],
      },
      {
        title: "Birth Details",
        description: "Gender and date of birth; the Ethiopian date and age are worked out from it.",
        columns: 4,
        fields: [
          { name: "gender", label: "Gender", type: "select", required: true, source: from("Farmer", "gender") },
          { name: "birth_date", label: "Date Of Birth (GC)", type: "date", required: true },
          { name: "birth_date_ec", label: "Date Of Birth (EC)", type: "text", hint: "Ethiopian calendar", placeholder: "Filled from the date of birth", derive: (v) => toEthiopianDate(v.birth_date ?? "") },
          { name: "estimated_age", label: "Age", type: "text", placeholder: "Filled from the date of birth", derive: (v) => ageFrom(v.birth_date ?? "") },
        ],
      },
      {
        title: "Socio-economic and Health Details",
        description: "Record income, education, marital status, PSNP participation and disability details.",
        fields: [
          { name: "income_source", label: "Source Of Income", type: "select", source: from("Farmer", "income_sources") },
          { name: "income_source_other", label: "Other Income Source", type: "text", required: true, hint: "Needed when income is Others", showWhen: { field: "income_source", equals: "SOI_OTHERS" } },
          { name: "education_level", label: "Education Level", type: "select", required: true, source: from("Farmer", "education_level") },
          { name: "marital_status", label: "Marital Status", type: "select", required: true, source: from("Farmer", "marital_status") },
          { name: "is_psnp_user", label: "PSNP User", type: "radio", options: YES_NO, defaultValue: "No" },
          { name: "disabled", label: "Disabled", type: "radio", options: YES_NO, required: true, defaultValue: "No" },
          { name: "disability_type", label: "Disability Type", type: "select", required: true, hint: "Needed when Disabled is Yes", showWhen: { field: "disabled", equals: "Yes" }, source: from("Farmer", "disability_type") },
          { name: "disability_severity", label: "Disability Severity", type: "select", required: true, hint: "Needed when Disabled is Yes", showWhen: { field: "disabled", equals: "Yes" }, source: from("Farmer", "disability_severity") },
        ],
      },
      {
        title: "Identity",
        description: "Fayda numbers, when the farmer has them.",
        fields: [
          { name: "national_id", label: "Fayda FIN / FAN", type: "text", hint: "12-digit FIN or 16-digit FAN" },
          { name: "fayda_rid", label: "Fayda RID", type: "text", hint: "29-digit registration slip number" },
        ],
      },
    ],
  },
  {
    key: "household",
    label: "Household",
    heading: { title: "Household Information", description: "The farmer is the head of the household. Add every other member; family size and counts follow from them." },
    sections: [
      {
        title: "Household Composition",
        description: "Children and land owned by others; tick the parents who live in the household.",
        fields: [
          { name: "number_of_children", label: "Number Of Children", type: "number" },
          { name: "other_land_owner", label: "Household Farms Land Owned By Others", type: "radio", options: YES_NO, required: true, defaultValue: "No" },
          { name: "father_included", label: "Father Included", type: "checkbox", group: "Members included" },
          { name: "mother_included", label: "Mother Included", type: "checkbox" },
        ],
      },
    ],
  },
  {
    key: "location",
    label: "Location",
    heading: { title: "Location Information", description: "Pick the farmer's region, zone, woreda and kebele from Master Data, and the GPS position if known." },
    sections: [
      {
        title: "GPS Coordinates",
        description: "Use the pin to read the device position, or type it in.",
        columns: 4,
        fields: [
          { name: "latitude", label: "Geo Latitude", type: "number", locate: true },
          { name: "longitude", label: "Geo Longitude", type: "number", locate: true },
        ],
      },
    ],
  },
  {
    key: "lands",
    label: "Lands",
    heading: { title: "Land Holdings", description: "The farmer's land parcel. Crops and livestock are recorded against it." },
    sections: [
      {
        title: "Land Parcel",
        description: "Leave empty if the farmer holds no land. Ownership and area are needed once a parcel is entered.",
        fields: [
          { name: "land_ownership_type", label: "Land Ownership Type", type: "select", source: from("Land", "land_ownership_type") },
          { name: "area_in_hectare", label: "Area In Hectare", type: "number" },
          { name: "soil_fertility", label: "Soil Fertility", type: "select", source: from("Land", "soil_fertility") },
          { name: "current_land_use", label: "Current Land Use", type: "select", source: from("Land", "current_land_use") },
          { name: "means_of_acquisition", label: "Means Of Acquisition", type: "select", source: from("Land", "means_of_acquisition") },
          { name: "year_of_acquisition", label: "Year Of Acquisition", type: "number" },
          { name: "remark", label: "Remark", type: "textarea", wide: true },
        ],
      },
    ],
  },
  {
    key: "crops",
    label: "Crops",
    heading: { title: "Crop Registration", description: "The main crop on the parcel, its planting date, season and end use." },
    sections: [
      {
        title: "Crop Details",
        description: "Leave empty if the farmer grows no crop. A crop needs a land parcel.",
        fields: [
          { name: "commodity", label: "Commodity", type: "select", source: from("Crop", "commodity"), placeholder: "Select commodity..." },
          { name: "planted_date", label: "Planted Date", type: "date" },
          { name: "planted_date_ec", label: "Planted Date (EC)", type: "text", hint: "Ethiopian calendar", placeholder: "Filled from the planted date", derive: (v) => toEthiopianDate(v.planted_date ?? "") },
          { name: "season", label: "Season", type: "select", source: from("Crop", "season"), placeholder: "Select season..." },
          { name: "end_use", label: "End Use", type: "select", source: from("Crop", "end_use"), placeholder: "Select end use..." },
        ],
      },
    ],
  },
  {
    key: "livestocks",
    label: "Livestock",
    heading: { title: "Livestock Registration", description: "The farmer's main livestock and how it is kept." },
    sections: [
      {
        title: "Livestock Details",
        description: "Leave empty if the farmer keeps no livestock. Livestock needs a land parcel.",
        fields: [
          { name: "livestock_type", label: "Livestock Type", type: "select", source: from("Livestock", "livestock_type"), placeholder: "Select type..." },
          { name: "head_count", label: "Head Count", type: "number", placeholder: "1" },
          { name: "livestock_system", label: "Livestock System", type: "select", source: from("Livestock", "livestock_system"), placeholder: "Select system..." },
          { name: "breed", label: "Breed", type: "select", source: from("Livestock", "breed"), placeholder: "Select breed..." },
          { name: "livestock_gender", label: "Gender", type: "select", source: from("Livestock", "gender"), placeholder: "Select gender..." },
          { name: "body_condition", label: "Body Condition", type: "select", source: from("Livestock", "body_condition"), placeholder: "Select condition..." },
          { name: "production_type", label: "Production Type", type: "select", source: from("Livestock", "production_type"), placeholder: "Select production type..." },
        ],
      },
    ],
  },
  {
    key: "membership",
    label: "Membership",
    heading: { title: "Membership Details", description: "Cooperative, union and farmer cluster membership. The registry needs all three answers." },
    sections: [
      {
        title: "Cooperatives and Clusters",
        description: "Answer each question; a name is needed for every Yes.",
        fields: [
          { name: "is_primary_cooperative_member", label: "Primary Cooperative Member", type: "radio", options: YES_NO, required: true, defaultValue: "No" },
          { name: "primary_cooperative_name", label: "Primary Cooperative Name", type: "text", required: true, showWhen: { field: "is_primary_cooperative_member", equals: "Yes" } },
          { name: "is_cooperative_union_member", label: "Cooperative Union Member", type: "radio", options: YES_NO, required: true, defaultValue: "No" },
          { name: "cooperative_union_name", label: "Cooperative Union Name", type: "text", required: true, showWhen: { field: "is_cooperative_union_member", equals: "Yes" } },
          { name: "is_farmer_cluster_member", label: "Farmer Cluster Member", type: "radio", options: YES_NO, required: true, defaultValue: "No" },
          { name: "farmer_cluster_role", label: "Farmer Cluster Role", type: "select", showWhen: { field: "is_farmer_cluster_member", equals: "Yes" }, source: from("MembershipDetails", "farmer_cluster_role") },
          { name: "primary_commodity", label: "Primary Commodity", type: "select", showWhen: { field: "is_farmer_cluster_member", equals: "Yes" }, source: from("MembershipDetails", "primary_commodity") },
        ],
      },
    ],
  },
  {
    key: "ids",
    label: "Documents",
    heading: { title: "Identity Document", description: "Upload the farmer's identity document. The registry requires it." },
    sections: [
      {
        title: "Identity Document",
        description: "PDF, JPEG or PNG, up to 5 MB. It is uploaded to the Farmer Registry as soon as you pick it.",
        fields: [
          { name: "identity_document_type", label: "Document Type", type: "select", required: true, source: from("Farmer", "identity_document_type"), defaultValue: "IDDOC_FAYDA" },
          { name: "identity_document", label: "Identity Document", type: "document", required: true },
        ],
      },
    ],
  },
  {
    key: "enumerator",
    label: "Enumerator",
    heading: { title: "Enumerator Information", description: "Review the enumerator and device location captured during registration." },
    sections: [
      {
        title: "Collection and GPS Details",
        description: "Review the collector, collection date and device GPS readings.",
        fields: [
          { name: "enumerator_name", label: "Enumerator Name", type: "text" },
          { name: "enumerator_user_id", label: "Enumerator User ID", type: "text" },
          { name: "data_collection_date", label: "Data Collection Date", type: "date", placeholder: "Select date" },
          { name: "enumerator_latitude", label: "Enumerator Latitude", type: "text", locate: true },
          { name: "enumerator_longitude", label: "Enumerator Longitude", type: "text", locate: true },
          { name: "enumerator_altitude", label: "Enumerator Altitude", type: "text" },
          { name: "enumerator_accuracy", label: "Enumerator Accuracy", type: "text" },
          { name: "enumerator_gps_captured_at", label: "GPS capture", type: "capture" },
        ],
      },
    ],
  },
];

const ALL_FIELDS = REGISTRY_TABS.flatMap((t) => t.sections.flatMap((s) => s.fields));

/** A field's value, or its default when the agent has not touched it. */
export const fieldValue = (values: Record<string, string>, name: string) => values[name] ?? ALL_FIELDS.find((f) => f.name === name)?.defaultValue ?? "";

// Location tab fields that come from the Region > Zone > Woreda > Kebele cascade (ids; names in `<level>_name`).
export const LOCATION_HIERARCHY_FIELDS = [
  { name: "region", label: "Region" },
  { name: "zone", label: "Zone" },
  { name: "woreda", label: "Woreda" },
  { name: "kebele", label: "Kebele" },
] as const;

/** Household member fields, stored as member_<i>_<field>; `members_count` holds how many rows there are. */
export const MEMBER_FIELDS = [
  { field: "first_name", label: "First Name", required: true },
  { field: "father_name", label: "Father's Name", required: false },
  { field: "grandfather_name", label: "Grandfather's Name", required: true },
  { field: "gender", label: "Gender", required: true },
  { field: "birth_date", label: "Date Of Birth", required: true },
  { field: "relationship", label: "Relationship To Head", required: true },
] as const;

export const memberKey = (index: number, field: string) => `member_${index}_${field}`;
export const memberCount = (values: Record<string, string>) => Math.max(0, parseInt(values.members_count ?? "0", 10) || 0);

export const isFieldVisible = (field: RegistryField, values: Record<string, string>) =>
  !field.showWhen || fieldValue(values, field.showWhen.field) === field.showWhen.equals;

/** Options of a field as {value, label}: fixed choices as they are, registry code lists from `fieldOptions`. */
export function optionsFor(field: RegistryField, fieldOptions: Record<string, Record<string, FieldOption[]>>): FieldOption[] {
  if (field.source) return fieldOptions[field.source.register]?.[field.source.field] ?? [];
  return (field.options ?? []).map((o) => (typeof o === "string" ? { value: o, label: o } : o));
}
