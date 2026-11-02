import { CROP_SOWN_CODES, CROP_SOWN_SPEC, type SpecField, type SpecSection, type SpecWidget } from "./cropSownSpec";
import type { CropSownFieldDef, CropSownFieldType, CropSownTabDef } from "./cropSown";

// Lays the Crop Sown registry's own definition (cropSownSpec.ts, generated from its intake-form metadata) over the
// portal's form: the registry decides which fields a section has, their order and labels, their kind, which are
// required or read-only, the static choices and the rules. Choices the registry serves as attributes stay with the
// portal's own lists until the intake-form route answers (see useIntakeFields).

/** The portal's form section → the registry section behind it. */
export const SPEC_SECTION: Record<string, string> = {
  identity: "cropsown_intake_record_section_01",
  address: "cropsown_cropsown_location_section_03",
  planning: "cropsown_planning_details_section_01",
  "planning-cluster": "cropsown_cluster_details_section_01",
  cultivation: "cropsown_cultivation_details_section_01",
  "cultivation-cluster": "cropsown_cultivation_cluster_details_section_01",
  sowing: "cropsown_sowing_details_section_01",
  infestation: "cropsown_infestation_details_section_01",
  harvest: "cropsown_harvest_details_section_01",
};

/** The portal's form section behind a registry section (the reverse of SPEC_SECTION). */
export const UI_SECTION_OF = Object.fromEntries(Object.entries(SPEC_SECTION).map(([ui, spec]) => [spec, ui]));

const TYPE: Record<SpecWidget, CropSownFieldType> = {
  text: "text",
  number: "number",
  date: "date",
  select: "select",
  "multi-select": "multiselect",
  radio: "radio",
  "geo-hierarchy": "geo",
};

/** The identity section is the Planning form's own record; the other three forms open with the common one (no name). */
const COMMON_IDENTITY = "cropsown_common_intake_record_section_01";

export const specSectionOf = (uiSectionId: string, tabKey?: string): SpecSection | undefined =>
  CROP_SOWN_SPEC[uiSectionId === "identity" && tabKey && tabKey !== "planning" ? COMMON_IDENTITY : (SPEC_SECTION[uiSectionId] ?? "")];

const titleCase = (words: string) => words.toLowerCase().replace(/(^|\s)\S/g, (c) => c.toUpperCase());

/** "SEASON_MEHER" → "Meher", "CROPCAT_FOOD_LEGUME" → "Food Legume": a readable label for a Master Data code. */
export function codeLabel(attribute: string, code: string): string {
  const rest = code.startsWith(`${attribute}_`) ? code.slice(attribute.length + 1) : code.split("_").slice(1).join("_");
  return titleCase((rest || code).replace(/_/g, " "));
}

/**
 * Static choices whose Master Data list the registry also documents: the form metadata says ANNUAL_CROP but the registry's
 * code check takes PLOT_CATEGORY_ANNUAL_CROP. The documented code wins.
 */
const STATIC_LIST: Record<string, string> = { plot_category: "PLOT_CATEGORY", water_source_frequency: "WATER_SOURCE_FREQUENCY" };

function staticValue(field: string, value: string | boolean): string | boolean {
  const list = CROP_SOWN_CODES[STATIC_LIST[field] ?? ""];
  if (!list || typeof value !== "string") return value;
  return list.find((code) => code === value || code.endsWith(`_${value}`)) ?? value;
}

/**
 * The label of a registry code as another API spells it: the Land API says OWNER and SF_HIGH where the Master Data
 * lists say OWNERSHIP_TYPE_OWNER and SF_HIGH. Undefined when the attribute has no such code.
 */
export function labelOfCode(attribute: string, code: string): string | undefined {
  const match = (CROP_SOWN_CODES[attribute] ?? []).find((c) => c === code || c.endsWith(`_${code}`));
  return match ? codeLabel(attribute, match) : undefined;
}

function toDef(spec: SpecField, base: CropSownFieldDef | undefined): CropSownFieldDef {
  const staticOptions = spec.options;
  // A catalog field the registry lists codes for: those codes (labelled) stand in until the intake-form route answers.
  const codes = !staticOptions && spec.attribute ? CROP_SOWN_CODES[spec.attribute] : undefined;
  const fallback = codes ? Object.fromEntries(codes.map((c) => [codeLabel(spec.attribute!, c), c])) : undefined;
  return {
    ...base,
    key: spec.key,
    label: spec.label,
    type: TYPE[spec.widget],
    options: staticOptions ? staticOptions.map(([label]) => label) : fallback ? Object.keys(fallback) : base?.options,
    fallbackValues: fallback,
    optionValues: staticOptions ? Object.fromEntries(staticOptions.map(([label, value]) => [label, staticValue(spec.key, value)])) : undefined,
    required: spec.required,
    readOnly: spec.readonly,
    numeric: spec.numeric,
    rules: spec.rules,
  };
}

/** The form with every section's fields replaced by the registry's list, in its order. */
export function applySpec(tabs: CropSownTabDef[]): CropSownTabDef[] {
  return tabs.map((tab) => ({
    ...tab,
    sections: tab.sections.map((section) => {
      const spec = specSectionOf(section.id, tab.key);
      if (!spec) return section;
      return { ...section, fields: spec.fields.map((f) => toDef(f, section.fields.find((b) => b.key === f.key))) };
    }),
  }));
}
