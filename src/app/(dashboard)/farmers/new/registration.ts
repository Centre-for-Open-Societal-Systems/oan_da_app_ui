import { withCountryCode, type PlaceLevel, type RegistrationBody } from "@/features/farmers";
import type { StepKey } from "./registrySpec";

// The Register Farmer form, and the POST /farmers body it becomes (the collection's "Register farmer" request).
// Choices hold registry codes (field-options `value`), the location holds place ids; names are kept only for display.

export interface MemberRow {
  first_name: string;
  grandfather_name: string;
  gender: string;
  date_of_birth: string;
  relationship: string;
}

export interface LandRow {
  ownership: string;
  area_hectare: string;
}

export interface CropRow {
  name: string;
  planted_date: string;
  season: string;
}

export interface LivestockRow {
  animal: string;
  count: string;
  system: string;
}

export interface RegistrationForm {
  first_name: string;
  father_name: string;
  grandfather_name: string;
  gender: string;
  date_of_birth: string;
  phone: string;
  national_id: string;
  marital_status: string;
  education_level: string;
  income_sources: string[];
  /** Place ids of the chosen region, zone, woreda and kebele; the kebele id goes in the body. */
  places: Partial<Record<PlaceLevel, string>>;
  /** Names of the chosen places, for the review and the confirmation only. */
  placeNames: Partial<Record<PlaceLevel, string>>;
  /** "latitude longitude altitude accuracy". */
  location: string;
  household_size: string;
  members: MemberRow[];
  lands: LandRow[];
  crops: CropRow[];
  livestock: LivestockRow[];
  /** The uploaded ID document: its id goes in the body as identity_document_id. */
  document: { id: string; name: string } | null;
}

export const EMPTY_MEMBER: MemberRow = { first_name: "", grandfather_name: "", gender: "", date_of_birth: "", relationship: "" };
export const EMPTY_LAND: LandRow = { ownership: "", area_hectare: "" };
export const EMPTY_CROP: CropRow = { name: "", planted_date: "", season: "" };
export const EMPTY_LIVESTOCK: LivestockRow = { animal: "", count: "", system: "" };

export const EMPTY_FORM: RegistrationForm = {
  first_name: "",
  father_name: "",
  grandfather_name: "",
  gender: "",
  date_of_birth: "",
  phone: "",
  national_id: "",
  marital_status: "",
  education_level: "",
  income_sources: [],
  places: {},
  placeNames: {},
  location: "",
  household_size: "",
  members: [],
  lands: [{ ...EMPTY_LAND }],
  crops: [],
  livestock: [],
  document: null,
};

export const farmerFullName = (form: Pick<RegistrationForm, "first_name" | "father_name" | "grandfather_name">) =>
  [form.first_name, form.father_name, form.grandfather_name].map((s) => s.trim()).filter(Boolean).join(" ") || "New farmer";

export const placeTrail = (form: Pick<RegistrationForm, "placeNames">) =>
  (["region", "zone", "woreda", "kebele"] as const).map((l) => form.placeNames[l]).filter(Boolean).join(" › ");

const isBlank = (row: object) => Object.values(row).every((v) => String(v ?? "").trim() === "");
const trimmed = (v: string) => v.trim();
const optional = <K extends string>(key: K, value: string) => (value.trim() ? ({ [key]: value.trim() } as Record<K, string>) : {});
const digitsOnly = (v: string) => v.replace(/\D/g, "");

/** The POST /farmers body. Empty optional fields and empty rows are left out; `clientOpId` is this registration's key. */
export function buildRegistrationBody(form: RegistrationForm, clientOpId: string): RegistrationBody {
  const members = form.members.filter((m) => !isBlank(m));
  const lands = form.lands.filter((l) => !isBlank(l));
  const crops = form.crops.filter((c) => !isBlank(c));
  const livestock = form.livestock.filter((a) => !isBlank(a));
  const size = form.household_size.trim();

  return {
    client_op_id: clientOpId,
    first_name: trimmed(form.first_name),
    father_name: trimmed(form.father_name),
    grandfather_name: trimmed(form.grandfather_name),
    gender: form.gender,
    date_of_birth: form.date_of_birth,
    phone: withCountryCode(form.phone),
    kebele: form.places.kebele ?? "",
    national_id: digitsOnly(form.national_id),
    ...optional("location", form.location),
    ...optional("marital_status", form.marital_status),
    ...optional("education_level", form.education_level),
    ...(form.income_sources.length ? { income_sources: [...form.income_sources] } : {}),
    ...(size || members.length
      ? {
          household: {
            size: Number(size),
            members: members.map((m) => ({
              first_name: trimmed(m.first_name),
              ...optional("grandfather_name", m.grandfather_name),
              ...optional("gender", m.gender),
              ...optional("date_of_birth", m.date_of_birth),
              ...optional("relationship", m.relationship),
            })),
          },
        }
      : {}),
    identity_document_id: form.document?.id ?? "",
    ...(lands.length ? { lands: lands.map((l) => ({ ownership: l.ownership, area_hectare: Number(l.area_hectare) })) } : {}),
    ...(crops.length ? { crops: crops.map((c) => ({ name: c.name, ...optional("planted_date", c.planted_date), ...optional("season", c.season) })) } : {}),
    ...(livestock.length ? { livestock: livestock.map((a) => ({ animal: a.animal, count: Number(a.count), ...optional("system", a.system) })) } : {}),
  };
}

/** Problems by field: top-level names ("first_name"), place levels ("kebele"), and rows as "lands.0.area_hectare". */
export type FormErrors = Record<string, string>;

const today = () => new Date().toISOString().slice(0, 10);
const positive = (v: string) => v.trim() !== "" && Number.isFinite(Number(v)) && Number(v) > 0;
const wholeNumber = (v: string) => /^\d+$/.test(v.trim());

/** The checks for one step (the review step checks all of them). The registry still has the last word: its 400s name fields too. */
export function validateStep(step: StepKey, form: RegistrationForm): FormErrors {
  if (step === "review") return (["farmer", "location", "household", "holdings", "document"] as const).reduce<FormErrors>((all, s) => ({ ...all, ...validateStep(s, form) }), {});
  const errors: FormErrors = {};
  const need = (key: keyof RegistrationForm, label: string) => {
    if (!String(form[key] ?? "").trim()) errors[key] = `${label} is required.`;
  };

  if (step === "farmer") {
    need("first_name", "First name");
    need("father_name", "Father's name");
    need("grandfather_name", "Grandfather's name");
    need("gender", "Gender");
    need("date_of_birth", "Date of birth");
    need("phone", "Phone");
    need("national_id", "National ID");
    if (form.date_of_birth && form.date_of_birth > today()) errors.date_of_birth = "Date of birth cannot be in the future.";
    const phone = digitsOnly(withCountryCode(form.phone));
    if (form.phone.trim() && !/^251\d{9}$/.test(phone)) errors.phone = "Enter an Ethiopian phone number: 9 digits after +251.";
    const id = digitsOnly(form.national_id);
    if (form.national_id.trim() && id.length !== 12 && id.length !== 16) errors.national_id = "National ID: enter the 12-digit FIN or the 16-digit FAN.";
  }

  if (step === "location") {
    for (const level of ["region", "zone", "woreda", "kebele"] as const) {
      if (!form.places[level]) errors[level] = `${level[0].toUpperCase()}${level.slice(1)} is required.`;
    }
    if (form.location.trim() && !/^-?\d+(\.\d+)?(\s+-?\d+(\.\d+)?){1,3}$/.test(form.location.trim())) {
      errors.location = "GPS: latitude and longitude (altitude and accuracy optional), separated by spaces.";
    }
  }

  if (step === "household") {
    const size = form.household_size.trim();
    const members = form.members.filter((m) => !isBlank(m));
    if (size && (!wholeNumber(size) || Number(size) < 1)) errors.household_size = "Household size must be a whole number of 1 or more.";
    if (!size && members.length) errors.household_size = "Household size is required when members are listed.";
    // The registry counts the farmer plus each member listed and refuses a size that differs.
    const people = 1 + members.length;
    if (!errors.household_size && size && Number(size) !== people) {
      errors.household_size = `Household size is ${Number(size)}, but ${people} ${people === 1 ? "person is" : "people are"} listed (the farmer plus each member). Add every member, or change the size to ${people}.`;
    }
    form.members.forEach((m, i) => {
      if (isBlank(m)) return;
      // The registry takes a member only with all five details (HouseholdMemberItem in the backend).
      if (!m.first_name.trim()) errors[`members.${i}.first_name`] = "First name is required.";
      if (!m.grandfather_name.trim()) errors[`members.${i}.grandfather_name`] = "Grandfather's name is required.";
      if (!m.gender) errors[`members.${i}.gender`] = "Gender is required.";
      if (!m.date_of_birth) errors[`members.${i}.date_of_birth`] = "Date of birth is required.";
      if (!m.relationship) errors[`members.${i}.relationship`] = "Relationship is required.";
      if (m.date_of_birth && m.date_of_birth > today()) errors[`members.${i}.date_of_birth`] = "Date of birth cannot be in the future.";
    });
  }

  if (step === "holdings") {
    form.lands.forEach((l, i) => {
      if (isBlank(l)) return;
      if (!l.ownership) errors[`lands.${i}.ownership`] = "Ownership is required.";
      if (!positive(l.area_hectare)) errors[`lands.${i}.area_hectare`] = "Area must be a number above 0.";
    });
    form.crops.forEach((c, i) => {
      if (!isBlank(c) && !c.name) errors[`crops.${i}.name`] = "Crop is required.";
    });
    form.livestock.forEach((a, i) => {
      if (isBlank(a)) return;
      if (!a.animal) errors[`livestock.${i}.animal`] = "Animal is required.";
      if (!wholeNumber(a.count) || Number(a.count) < 1) errors[`livestock.${i}.count`] = "Count must be a whole number of 1 or more.";
    });
  }

  if (step === "document" && !form.document) errors.document = "Upload the farmer's ID document.";

  return errors;
}

/** The step a field belongs to, for a 400 that names it (the body's own names, e.g. "kebele", "identity_document_id", "household.size"). */
export function stepOfField(field: string): StepKey | null {
  const root = field.split(/[.[]/)[0];
  if (["first_name", "father_name", "grandfather_name", "gender", "date_of_birth", "phone", "national_id", "marital_status", "education_level", "income_sources"].includes(root)) return "farmer";
  if (["kebele", "location", "region", "zone", "woreda"].includes(root)) return "location";
  if (["household", "household_size", "members"].includes(root)) return "household";
  if (["lands", "crops", "livestock"].includes(root)) return "holdings";
  if (["identity_document_id", "document"].includes(root)) return "document";
  return null;
}

/** A 400's details (body field → message) as form errors: body names mapped onto the form's. */
export function errorsFromDetails(details: Record<string, string>): FormErrors {
  const out: FormErrors = {};
  for (const [field, message] of Object.entries(details)) {
    const key = field === "identity_document_id" ? "document" : field === "household.size" ? "household_size" : field.replace(/^household\.members/, "members").replace(/\[(\d+)\]/g, ".$1");
    out[key] = message;
  }
  return out;
}
