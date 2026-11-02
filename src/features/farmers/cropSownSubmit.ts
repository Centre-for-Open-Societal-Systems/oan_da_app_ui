import { CROP_SOWN_FORM, registryCode, valueKey, type CropSownFieldDef, type CropSownValues } from "./cropSown";
import { fetchIntakeForm, saveFarmerCrop, type ApiIntakeField, type ApiIntakeForm, type ApiSavedCrop, type CropSectionInput, type CropSownForm } from "./cropSownApi";
import type { Farmer } from "./types";

// Step-by-step submission of the Submit Crop Report form, the way the Crop Sown registry takes an intake
// (cropsown-regsitry: docker/db-seed/load_sample_data.py). Each stage is its own submission on its own form; the
// same route, POST /farmers/{id}/crops, saves it one section at a time:
//   1. the first save of a stage (crop_farmer_lookup) creates the draft and answers submission_id + subject_record_id;
//   2. the stage's season section and (Planning) location section are single rows sharing that subject_record_id;
//   3. the stage's detail sections are lists: one row each, with its own internal_record_id and a
//      link_internal_record_id pointing at the subject_record_id. Saving a section again replaces its rows.

const LOOKUP = "crop_farmer_lookup";
const LOCATION = "cropsown_cropsown_location_section_03";
const MULTI_SEPARATOR = ", ";

/** The form tab → registry stage and the sections the tab saves. `ui` are the form sections that feed it. */
interface StagePlan {
  form: CropSownForm;
  season: string;
  /** Sections saved by this tab, after the draft exists. `single` rows share the subject record; lists link to it. */
  sections: { sectionId: string; ui: string[]; single?: boolean }[];
}

const PLANNING_SEASON = "cropsown_intake_season_section_01";
const COMMON_SEASON = "cropsown_common_intake_season_section_01";

export const STAGE_PLANS: Record<string, StagePlan> = {
  // Farmer identity and address open the Planning intake.
  "crop-sown": { form: "planning", season: PLANNING_SEASON, sections: [{ sectionId: LOCATION, ui: ["address"], single: true }] },
  planning: {
    form: "planning",
    season: PLANNING_SEASON,
    sections: [
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

/** What a stage's draft has so far: kept by the form between saves. */
export interface StageDraft {
  submissionId: string;
  /** The stage's subject record: the row id the single sections share and the lists link to. */
  rootId: string;
  reference?: string;
}
export type StageDrafts = Partial<Record<CropSownForm, StageDraft>>;

/** Registry ids for the geo names the form shows (regions and zones come from the geo-level routes). */
export interface GeoIds {
  region?: string;
  zone?: string;
}

const intakeForms = new Map<CropSownForm, Promise<ApiIntakeForm | null>>();
/** The stage's live field list, once per page. A failed read is not cached and falls back to the form's own fields. */
function loadIntakeForm(form: CropSownForm): Promise<ApiIntakeForm | null> {
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

const optionId = (o: NonNullable<ApiIntakeField["options"]>[number]) => (typeof o === "string" ? o : o.value_id);
const optionLabel = (o: NonNullable<ApiIntakeField["options"]>[number]) => (typeof o === "string" ? o : (o.value_display ?? o.value_id));

/** A form value in the shape the registry field takes: catalog choices as their value_id, numbers as numbers. */
function toApiValue(raw: string, def: CropSownFieldDef | undefined, api: ApiIntakeField | undefined, geoIds: GeoIds): unknown {
  const key = def?.key ?? api?.field_name ?? "";
  if (key === "region" && geoIds.region) return geoIds.region;
  if (key === "zone" && geoIds.zone) return geoIds.zone;

  const pick = (one: string) => {
    const options = api?.options;
    if (!options?.length) return one;
    const wanted = one.trim().toLowerCase();
    const hit = options.find((o) => optionId(o).toLowerCase() === wanted || optionLabel(o).toLowerCase() === wanted);
    return hit ? optionId(hit) : one;
  };

  if (def?.type === "multiselect") return raw.split(MULTI_SEPARATOR).filter(Boolean).map(pick);
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
export function buildRecord(values: CropSownValues, uiSectionIds: string[], apiFields: ApiIntakeField[] | undefined, geoIds: GeoIds = {}): Record<string, unknown> {
  const record: Record<string, unknown> = {};
  const defs = CROP_SOWN_FORM.flatMap((t) => t.sections).filter((s) => uiSectionIds.includes(s.id));
  for (const section of defs) {
    for (const def of section.fields) {
      const raw = values[valueKey(section.id, def.key)];
      if (raw === undefined || raw === "") continue;
      const api = apiFields?.find((f) => f.field_name === def.key);
      if (apiFields && (!api || api.readonly)) continue;
      record[def.key] = toApiValue(raw, def, api, geoIds);
    }
  }
  return record;
}

const digits = (v: string | undefined) => (v ?? "").replace(/\D/g, "");

/** The lookup row: the Farmer ID plus the Fayda number, a 12-digit FIN or a 16-digit FAN (the registry takes either). */
export function lookupRecord(farmer: Farmer, values: CropSownValues): Record<string, unknown> {
  const fayda = digits(values[valueKey("identity", "fayda_fan_id")]);
  return { farmer_id: registryCode(farmer), ...(fayda ? (fayda.length === 16 ? { fayda_fan_id: fayda } : { fayda_fin: fayda }) : {}) };
}

export interface SaveStageInput {
  farmer: Farmer;
  /** The form tab being saved ("crop-sown", "planning", …). */
  tab: string;
  values: CropSownValues;
  drafts: StageDrafts;
  geoIds?: GeoIds;
}

export interface SaveStageResult {
  drafts: StageDrafts;
  /** Sections that were saved, for the user's confirmation. */
  saved: string[];
}

const newId = () => globalThis.crypto.randomUUID();

/**
 * Saves one form tab. Opens the stage's draft first when it has none (lookup + season), then saves the tab's own
 * sections, each in its own call. Returns the drafts to keep for the next tab.
 */
export async function saveStage({ farmer, tab, values, drafts, geoIds = {} }: SaveStageInput): Promise<SaveStageResult> {
  const plan = STAGE_PLANS[tab];
  if (!plan) return { drafts, saved: [] };
  const code = registryCode(farmer);
  const intake = await loadIntakeForm(plan.form);
  const fieldsOf = (sectionId: string) => intake?.sections.find((s) => s.section_id === sectionId)?.fields;
  const saved: string[] = [];

  let draft = drafts[plan.form];
  const send = async (section: CropSectionInput) => {
    const res: ApiSavedCrop = await saveFarmerCrop(code, plan.form, [section], draft ? { submissionId: draft.submissionId } : {});
    saved.push(section.section_id);
    return res;
  };

  if (!draft) {
    const res = await send({ section_id: LOOKUP, records: [lookupRecord(farmer, values)] });
    const root = res.subject_record_id ?? res.section_payloads?.[0]?.records?.[0]?.internal_record_id;
    if (!res.submission_id || typeof root !== "string") throw new Error("The registry did not return the new submission.");
    draft = { submissionId: res.submission_id, rootId: root, reference: res.application_reference };

    const year = values[valueKey("identity", "crop_year")] || String(new Date().getFullYear());
    const seasonFields = fieldsOf(plan.season);
    const season = buildRecord(values, ["identity"], seasonFields?.filter((f) => ["crop_year", "production_season"].includes(f.field_name)) ?? [
      { field_name: "crop_year", label: "", data_type: "string", required: true, readonly: false, options: null, attribute_id: null },
      { field_name: "production_season", label: "", data_type: "string", required: true, readonly: false, options: seasonFields?.find((f) => f.field_name === "production_season")?.options ?? null, attribute_id: null },
    ]);
    await send({ section_id: plan.season, records: [{ internal_record_id: draft.rootId, ...season, crop_year: year }] });
  }

  for (const section of plan.sections) {
    const record = buildRecord(values, section.ui, fieldsOf(section.sectionId), geoIds);
    if (Object.keys(record).length === 0) continue;
    const row = section.single ? { internal_record_id: draft.rootId, ...record } : { internal_record_id: newId(), link_internal_record_id: draft.rootId, ...record };
    await send({ section_id: section.sectionId, records: [row] });
  }

  return { drafts: { ...drafts, [plan.form]: draft }, saved };
}
