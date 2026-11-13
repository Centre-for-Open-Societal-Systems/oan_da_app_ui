import { CROP_SOWN_FORM, CROP_SOWN_INTRO_TAB, registryCode, valueKey, type CropSownFieldDef, type CropSownValues } from "./cropSown";
import { fetchIntakeForm, saveFarmerCrop, type ApiIntakeField, type ApiIntakeForm, type ApiSavedCrop, type CropSectionInput, type CropSownForm } from "./cropSownApi";
import type { Farmer } from "./types";
import { GEO_LEVELS, type GeoIds } from "./useGeoLevels";

export type { GeoIds };
/** The geo ids picked in each form section (by the form's section id), as the registry names them. */
export type GeoIdsBySection = Record<string, GeoIds>;

// Stage-by-stage submission of the Submit Crop Report form, the way the Crop Sown registry takes an intake
// (cropsown-regsitry: docker/db-seed/load_sample_data.py). Each stage is its own submission on its own form, saved with
// ONE call to POST /farmers/{id}/crops whose `sections` array carries every section of the stage:
//   - crop_farmer_lookup, the season section, the location and the detail sections are plain rows. The registry owns
//     the record ids: internal_record_id (and the link from a list row to the stage's root) is set by the registry
//     when it saves the sections of one submission, so the form never sends one.
// One call per stage means nothing has to be continued afterwards (a second POST would open a second draft).

const LOOKUP = "crop_farmer_lookup";
const LOCATION = "cropsown_cropsown_location_section_03";
const MULTI_SEPARATOR = ", ";

/** The form tab → registry stage and the sections the tab saves. `ui` are the form sections that feed it. */
interface StagePlan {
  form: CropSownForm;
  season: string;
  /** Sections saved by this tab, after the stage's lookup and season. */
  sections: { sectionId: string; ui: string[] }[];
}

const PLANNING_SEASON = "cropsown_intake_season_section_01";
const COMMON_SEASON = "cropsown_common_intake_season_section_01";

export const STAGE_PLANS: Record<string, StagePlan> = {
  planning: {
    form: "planning",
    season: PLANNING_SEASON,
    sections: [
      { sectionId: LOCATION, ui: ["address"] },
      { sectionId: "cropsown_planning_details_section_01", ui: ["planning"] },
      { sectionId: "cropsown_cluster_details_section_01", ui: ["planning-cluster"] },
    ],
  },
  cultivation: {
    form: "cultivation",
    season: COMMON_SEASON,
    sections: [
      { sectionId: "cropsown_cultivation_details_section_01", ui: ["cultivation"] },
      { sectionId: "cropsown_cultivation_cluster_details_section_01", ui: ["cultivation-cluster"] },
    ],
  },
  sowing: {
    form: "sowing",
    season: COMMON_SEASON,
    sections: [
      { sectionId: "cropsown_sowing_details_section_01", ui: ["sowing"] },
      { sectionId: "cropsown_infestation_details_section_01", ui: ["infestation"] },
    ],
  },
  harvesting: { form: "harvesting", season: COMMON_SEASON, sections: [{ sectionId: "cropsown_harvest_details_section_01", ui: ["harvest"] }] },
};

/** The stage behind a form tab. The "Crop Sown" tab saves nothing itself; its identity and address belong to Planning. */
export const stagePlanOf = (tab: string): StagePlan | undefined => STAGE_PLANS[tab === CROP_SOWN_INTRO_TAB ? "planning" : tab];

/** What a stage's draft has so far: kept by the form between saves. */
export interface StageDraft {
  submissionId: string;
  /** The stage's subject record, as the registry answered it. */
  rootId: string;
  reference?: string;
}
export type StageDrafts = Partial<Record<CropSownForm, StageDraft>>;


const intakeForms = new Map<CropSownForm, Promise<ApiIntakeForm | null>>();
/** Forgets the fetched field lists, so the next save or render asks the intake-form route again. */
export const clearIntakeFormCache = () => intakeForms.clear();

/** The stage's live field list, once per page. A failed read is not cached and falls back to the form's own fields. */
export function loadIntakeForm(form: CropSownForm): Promise<ApiIntakeForm | null> {
  let found = intakeForms.get(form);
  if (!found) {
    found = fetchIntakeForm(form).catch(() => {
      intakeForms.delete(form);
      return null;
    });
    intakeForms.set(form, found);
  }
  return found;
}


type ApiOption = NonNullable<ApiIntakeField["options"]>[number];
const text = (v: unknown) => (typeof v === "string" || typeof v === "number" ? String(v) : "");
const pickText = (o: Record<string, unknown>, keys: string[]) => keys.map((k) => text(o[k])).find(Boolean) ?? "";

/** The value a catalog choice is saved as: the plain string, or its value_id (id / value as fallbacks). */
export const optionId = (o: ApiOption | null | undefined): string =>
  typeof o === "object" && o ? pickText(o as Record<string, unknown>, ["value_id", "id", "value", "code", "value_display", "label"]) : text(o);
/** The text a catalog choice is shown as: the plain string, or its value_display (label / name as fallbacks). */
export const optionLabel = (o: ApiOption | null | undefined): string =>
  typeof o === "object" && o ? pickText(o as Record<string, unknown>, ["value_display", "display", "label", "name", "value_id", "id", "value"]) : text(o);

/** A form value in the shape the registry field takes: catalog choices as their value_id, numbers as numbers. */
function toApiValue(raw: string, def: CropSownFieldDef | undefined, api: ApiIntakeField | undefined, geoIds: GeoIds): unknown {
  const key = def?.key ?? api?.field_name ?? "";
  // Region, zone, woreda and kebele go as the registry's geo ids, once the geo levels have answered.
  const geoId = GEO_LEVELS.some((l) => l.key === key) ? geoIds[key as keyof GeoIds] : undefined;
  if (geoId) return geoId;

  const pick = (one: string): unknown => {
    // The registry's own static choices (a label with its value) come first, then the intake-form route's catalog.
    const fixed = def?.optionValues?.[one];
    if (fixed !== undefined) return fixed;
    const wanted = one.trim().toLowerCase();
    const hit = api?.options?.find((o) => optionId(o).toLowerCase() === wanted || optionLabel(o).toLowerCase() === wanted);
    if (hit) return optionId(hit);
    // Not in the live catalog (or it has not loaded): the registry's documented codes.
    const code = def?.fallbackValues && Object.entries(def.fallbackValues).find(([label, c]) => label.toLowerCase() === wanted || c.toLowerCase() === wanted);
    return code ? code[1] : one;
  };

  if (def?.type === "multiselect") return raw.split(MULTI_SEPARATOR).filter(Boolean).map((one) => pick(one));
  const type = (api?.data_type ?? "").toLowerCase();
  if (def?.type === "number" || /int|number|float|decimal|double/.test(type)) {
    const n = Number(raw);
    return Number.isFinite(n) && raw.trim() !== "" ? n : raw;
  }
  if (/bool/.test(type)) return /^(yes|true|1)$/i.test(raw);
  return pick(raw);
}

/**
 * One row of a registry section from the form's values. With the live field list only the section's own, writable
 * fields go out; without it every filled field of the form sections does.
 */
export function buildRecord(values: CropSownValues, uiSectionIds: string[], apiFields: ApiIntakeField[] | undefined, geoIds: GeoIdsBySection = {}): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  const defs = CROP_SOWN_FORM.flatMap((t) => t.sections).filter((s) => uiSectionIds.includes(s.id));
  for (const section of defs) {
    for (const def of section.fields) {
      // Calculated by the registry (EC dates, yields, cluster ids): never sent.
      if (def.readOnly) continue;
      const raw = values[valueKey(section.id, def.key)];
      if (raw === undefined || raw === "") continue;
      const api = apiFields?.find((f) => f.field_name === def.key);
      if (apiFields && (!api || api.readonly)) continue;
      record[def.key] = toApiValue(raw, def, api, geoIds[section.id] ?? {});
    }
  }
  return record;
}

const digits = (v: string | undefined) => (v ?? "").replace(/\D/g, "");

/**
 * The lookup row: the Farmer ID plus the Fayda number, a 12-digit FIN or a 16-digit FAN (the registry takes either, in
 * its own field). Anything else is refused here with the registry's own wording, before a save is spent on it.
 */
export function lookupRecord(farmer: Farmer, values: CropSownValues): Record<string, unknown> {
  const fayda = digits(values[valueKey("identity", "fayda_fan_id")]);
  if (fayda && fayda.length !== 12 && fayda.length !== 16) {
    throw new Error("Fayda ID: enter exactly 12 digits (FIN) or 16 digits (FAN), spaces allowed.");
  }
  return { farmer_id: registryCode(farmer), ...(fayda ? (fayda.length === 16 ? { fayda_fan_id: fayda } : { fayda_fin: fayda }) : {}) };
}

/** A required value is missing from the form; `tab` is where the user fills it in. */
export class MissingFieldError extends Error {
  constructor(
    message: string,
    readonly tab: string,
  ) {
    super(message);
    this.name = "MissingFieldError";
  }
}

/**
 * The Location section of the Planning intake: the geo ids picked in the Address section as l1–l4, the lowest one, and
 * the chain (geo_code_hierarchy_json), the way the registry's own geo widget writes them.
 */
export function locationRecord(geo: GeoIds | undefined, values: CropSownValues): Record<string, unknown> {
  const hierarchy = GEO_LEVELS.flatMap(({ key, level }) => {
    const id = geo?.[key];
    return id ? [{ level_id: level, level: key, level_mnemonic: values[valueKey("address", key)] ?? key, level_value_id: id }] : [];
  });
  if (hierarchy.length === 0) return {};
  const lowest = hierarchy[hierarchy.length - 1].level_value_id;
  return {
    ...Object.fromEntries(hierarchy.map((h) => [h.level_id, h.level_value_id])),
    geo_lowest_level_value_id: lowest,
    geo_code_hierarchy_json: { hierarchy, lowest_level_value_id: lowest },
  };
}

export interface SaveStageInput {
  farmer: Farmer;
  /** The form tab being saved ("crop-sown", "planning", …). */
  tab: string;
  values: CropSownValues;
  drafts: StageDrafts;
  geoIds?: GeoIdsBySection;
}

export interface SaveStageResult {
  drafts: StageDrafts;
  /** Sections that were saved, for the user's confirmation. */
  saved: string[];
}

/**
 * Saves one form tab with a single call: the stage's lookup and season sections (when it has no draft yet) and the
 * tab's own sections. Returns the
 * drafts to keep for the next tab.
 */
export async function saveStage({ farmer, tab, values, drafts, geoIds = {} }: SaveStageInput): Promise<SaveStageResult> {
  const plan = STAGE_PLANS[tab];
  if (!plan) return { drafts, saved: [] };
  const code = registryCode(farmer);
  const intake = await loadIntakeForm(plan.form);
  const fieldsOf = (sectionId: string) => intake?.sections.find((s) => s.section_id === sectionId)?.fields;

  const existing = drafts[plan.form];
  const sections: CropSectionInput[] = [];

  if (!existing) {
    sections.push({ section_id: LOOKUP, records: [lookupRecord(farmer, values)] });
    // The season is what the registry files the stage under: crop year and production season are both needed.
    const rawSeason = values[valueKey("identity", "production_season")]?.trim();
    if (!rawSeason) throw new MissingFieldError("Production Season is required. Choose it under Farmer Identity.", CROP_SOWN_INTRO_TAB);
    const year = values[valueKey("identity", "crop_year")]?.trim() || String(new Date().getFullYear());
    const seasonDef = CROP_SOWN_FORM.flatMap((t) => t.sections).find((x) => x.id === "identity")?.fields.find((f) => f.key === "production_season");
    const seasonApi = fieldsOf(plan.season)?.find((f) => f.field_name === "production_season");
    sections.push({ section_id: plan.season, records: [{ crop_year: year, production_season: toApiValue(rawSeason, seasonDef, seasonApi, {}) }] });
  }

  for (const section of plan.sections) {
    const record = section.sectionId === LOCATION ? locationRecord(geoIds.address, values) : buildRecord(values, section.ui, fieldsOf(section.sectionId), geoIds);
    if (Object.keys(record).length === 0) continue;
    sections.push({ section_id: section.sectionId, records: [record] });
  }

  // Dev only: what is about to go out and what the registry offered for the season, so a rejected value can be compared.
  if (process.env.NODE_ENV !== "production") {
    const shown = JSON.stringify(sections, (key, value) => (key.startsWith("fayda") ? "<masked>" : value));
    console.info(`[crop-sown] ${plan.form} -> ${shown}`);
    const season = fieldsOf(plan.season)?.find((f) => f.field_name === "production_season");
    console.info("[crop-sown] registry choices for production_season:", season ? JSON.stringify(season.options) : "(intake-form not loaded)");
  }

  // Saving the same stage again continues its draft; the first save of a stage never carries a submission id.
  const res: ApiSavedCrop = await saveFarmerCrop(code, plan.form, sections, existing ? { submissionId: existing.submissionId } : {});
  const draft: StageDraft = existing ?? { submissionId: res.submission_id, rootId: res.subject_record_id, reference: res.application_reference };
  return { drafts: { ...drafts, [plan.form]: draft }, saved: sections.map((s) => s.section_id) };
}

/** The registry sections behind a form section on a tab: where its live field list (options, required) comes from. */
export function apiSectionIds(tab: string, uiSectionId: string): string[] {
  const plan = stagePlanOf(tab);
  if (!plan) return [];
  if (uiSectionId === "identity") return [LOOKUP, plan.season];
  return plan.sections.filter((s) => s.ui.includes(uiSectionId)).map((s) => s.sectionId);
}
