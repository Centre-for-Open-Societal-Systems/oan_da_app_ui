import { valueKey, type CropSownFieldDef, type CropSownSectionDef, type CropSownValues } from "./cropSown";
import { UI_SECTION_OF } from "./cropSownSpecApply";

// The checks the Crop Sown registry makes on its intake form (its spec: required / numeric kind / rules, and the field
// rules of meta_data/register-metadata/zzzzzz_field_rules.sql with the registry's own wording), run before a stage is
// saved so the user sees every problem next to its field instead of one rejection from the API.

/** Messages by form field key (valueKey(section, field)). */
export type FieldErrors = Record<string, string>;

/** Optional lists: their required columns only count once a row is being entered. */
const OPTIONAL_SECTIONS = new Set(["planning-cluster", "cultivation-cluster", "infestation"]);

const PERSON_NAME = /^(?=.{1,100}$)(?=.*\p{L})[\p{L}\p{M}\s'’-]+$/u;
const personMessage = (who: string) => `${who}: use 1 to 100 letters, spaces, hyphens or apostrophes. Do not use digits or other symbols.`;
const NAME_RULES: Record<string, string> = {
  farmer_name: personMessage("Farmer name"),
  da_name: personMessage("Development agent name"),
  supervisor_name: personMessage("Supervisor name"),
};
/** Dates the registry refuses before 1900. */
const MIN_DATE_FIELDS = new Set(["actual_cultivation_date", "cluster_harvest_date", "end_gc", "establishing_date", "harvest_date", "observation_date", "planned_date", "sowing_date", "start_gc"]);

const digits = (v: string) => v.replace(/\s/g, "");

/** The registry's own pattern checks for a field, or null when the value passes (or the field has none). */
function patternError(field: CropSownFieldDef, value: string): string | null {
  switch (field.key) {
    case "farmer_id":
      return /^FR-\d{12}$/.test(value.trim()) ? null : "Farmer ID: enter FR- followed by exactly 12 digits, preserving leading zeroes.";
    case "fayda_fan_id":
      return /^\d{16}$/.test(digits(value)) ? null : "Fayda FAN ID: enter exactly 16 digits, optionally separated by spaces.";
    case "crop_year":
      if (!/^\d{4}$/.test(value.trim())) return "Crop Year: enter a four-digit year.";
      return Number(value) < new Date().getFullYear() ? "Crop year must not be in the past." : null;
    default:
      return field.key in NAME_RULES && !PERSON_NAME.test(value.trim()) ? NAME_RULES[field.key] : null;
  }
}

const isIsoDate = (v: string) => /^\d{4}-\d{2}-\d{2}$/.test(v) && !Number.isNaN(Date.parse(`${v}T00:00:00Z`)) && new Date(`${v}T00:00:00Z`).toISOString().startsWith(v);

function typeError(field: CropSownFieldDef, value: string): string | null {
  if (field.type === "number") {
    const n = Number(value);
    if (value.trim() === "" || !Number.isFinite(n)) return `${field.label} must be a number.`;
    if (field.numeric === "integer" && !Number.isInteger(n)) return `${field.label} must be a whole number.`;
  }
  if (field.type === "date") {
    if (!isIsoDate(value)) return `${field.label}: enter a valid date.`;
    if (MIN_DATE_FIELDS.has(field.key) && value < "1900-01-01") return `${field.label}: the date is too early. Enter a date in 1900 or later.`;
  }
  return null;
}

function ruleError(field: CropSownFieldDef, value: string, sectionId: string, values: CropSownValues): string | null {
  for (const rule of field.rules ?? []) {
    const otherSection = rule.section ? (UI_SECTION_OF[rule.section] ?? sectionId) : sectionId;
    const other = values[valueKey(otherSection, rule.field)]?.trim();
    if (!other) continue;
    if (rule.kind === "equals" && value !== other) return rule.message;
    const [a, b] = [Number(value), Number(other)];
    if (Number.isNaN(a) || Number.isNaN(b)) continue;
    if ((rule.kind === "max" && a > b) || (rule.kind === "min" && a < b)) return rule.message;
  }
  return null;
}

/** Everything wrong in one form section. Read-only fields (calculated by the registry) are not checked. */
export function validateSection(section: CropSownSectionDef, values: CropSownValues): FieldErrors {
  const errors: FieldErrors = {};
  const entering = !OPTIONAL_SECTIONS.has(section.id) || section.fields.some((f) => !f.readOnly && (values[valueKey(section.id, f.key)] ?? "").trim() !== "");
  for (const field of section.fields) {
    if (field.readOnly) continue;
    const key = valueKey(section.id, field.key);
    const value = (values[key] ?? "").trim();
    if (value === "") {
      if (field.required && entering) errors[key] = `${field.label} is required.`;
      continue;
    }
    const message = typeError(field, value) ?? patternError(field, value) ?? ruleError(field, value, section.id, values);
    if (message) errors[key] = message;
  }
  return errors;
}

/** Everything wrong on a tab's sections. */
export function validateSections(sections: CropSownSectionDef[], values: CropSownValues): FieldErrors {
  return Object.assign({}, ...sections.map((s) => validateSection(s, values)));
}

const isWordChar = (c: string | undefined) => c !== undefined && /[a-z0-9_]/.test(c);
/** Whether `name` appears in `text` as a whole word / phrase (both lowercase). */
function containsWord(text: string, name: string): boolean {
  for (let at = text.indexOf(name); at !== -1; at = text.indexOf(name, at + 1)) {
    if (!isWordChar(text[at - 1]) && !isWordChar(text[at + name.length])) return true;
  }
  return false;
}

/**
 * The form field a registry/API rejection is about, found by the field's name or label in the message
 * ("production_season is not an allowed value", "Crop year must not be in the past"). The longest match wins;
 * null when the message names no field of these sections.
 */
export function fieldInMessage(message: string, sections: CropSownSectionDef[]): { key: string; sectionId: string } | null {
  const text = message.toLowerCase();
  let best: { key: string; sectionId: string; length: number } | null = null;
  for (const section of sections) {
    for (const field of section.fields) {
      for (const name of [field.key, field.label.toLowerCase()]) {
        if (name.length < 4 || !containsWord(text, name)) continue;
        if (!best || name.length > best.length) best = { key: valueKey(section.id, field.key), sectionId: section.id, length: name.length };
      }
    }
  }
  return best && { key: best.key, sectionId: best.sectionId };
}
