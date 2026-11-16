import { CROP_SOWN_FORM, valueKey, type CropSownFieldDef, type CropSownValues } from "./cropSown";
import { fetchFarmerCrop, fetchRegisterTab, listFarmerCrops, REGISTER_TAB_IDS, type ApiFarmerCrop, type ApiIntakeField, type ApiRegisterTab, type ApiIntakeForm, type CropSownForm } from "./cropSownApi";
import { loadIntakeForm, optionId, optionLabel, STAGE_PLANS } from "./cropSownSubmit";

// A farmer's earlier Crop Sown details, from the registry itself: GET /farmers/{id}/crops?source=submission lists their
// submissions (one per stage form), ?source=register their approved register rows. ?submission_id= reads one submission
// with its section records; ?internal_record_id=&tab_id= reads one tab of the register record. A stage's tab is filled
// from the register record when asked for and it has that tab, else from the newest submission of that stage, turning
// the registry's codes back into the labels the form shows.

const STAGES: CropSownForm[] = ["planning", "cultivation", "sowing", "harvesting"];

/** A row of a section as the registry returns it. */
type Row = Record<string, unknown>;

/** Every {section_id, records} in a response, wherever the API nests it (sections, section_payloads, tabs → sections). */
export function sectionRows(node: unknown, found: { sectionId: string; rows: Row[] }[] = []): { sectionId: string; rows: Row[] }[] {
  if (Array.isArray(node)) node.forEach((n) => sectionRows(n, found));
  else if (node && typeof node === "object") {
    const o = node as Record<string, unknown>;
    const rows = o.records ?? o.section_payload ?? o.rows;
    if (typeof o.section_id === "string" && Array.isArray(rows)) found.push({ sectionId: o.section_id, rows: rows.filter((r): r is Row => !!r && typeof r === "object") });
    else Object.values(o).forEach((v) => typeof v === "object" && sectionRows(v, found));
  }
  return found;
}

/** The label the form shows for a code the registry stored: static/catalog choice, boolean, list or plain value. */
export function toFormValue(raw: unknown, def: CropSownFieldDef, api: ApiIntakeField | undefined): string {
  if (raw === null || raw === undefined || raw === "") return "";
  if (Array.isArray(raw)) return raw.map((one) => toFormValue(one, def, api)).filter(Boolean).join(", ");
  if (def.type === "date") return String(raw).slice(0, 10);
  const same = (a: unknown, b: unknown) => String(a).toLowerCase() === String(b).toLowerCase();
  const fixed = def.optionValues && Object.entries(def.optionValues).find(([, value]) => same(value, raw));
  if (fixed) return fixed[0];
  const code = def.fallbackValues && Object.entries(def.fallbackValues).find(([, value]) => same(value, raw));
  if (code) return code[0];
  const option = api?.options?.find((o) => same(optionId(o), raw));
  if (option) return optionLabel(option);
  return String(raw);
}

/**
 * The form values behind one stage's section records. Geo ids and the lookup's Fayda FIN have no field to land in.
 * With `display`, for reading rather than editing, read-only fields and the coordinates count too.
 */
export function stageValues(tab: string, sections: { sectionId: string; rows: Row[] }[], intake: ApiIntakeForm | null, display = false): CropSownValues {
  const plan = STAGE_PLANS[tab];
  const values: CropSownValues = {};
  if (!plan) return values;
  const fieldsOf = (id: string) => intake?.sections.find((s) => s.section_id === id)?.fields;

  const take = (uiSectionId: string, sectionId: string, row: Row | undefined) => {
    if (!row) return;
    const ui = CROP_SOWN_FORM.find((t) => t.key === tab)?.sections.find((s) => s.id === uiSectionId);
    for (const def of ui?.fields ?? []) {
      if (display ? def.type === "geo" : def.readOnly && def.key !== "farmer_id") continue;
      const value = toFormValue(row[def.key], def, fieldsOf(sectionId)?.find((f) => f.field_name === def.key));
      if (value !== "") values[valueKey(uiSectionId, def.key)] = value;
    }
  };

  for (const { sectionId, rows } of sections) {
    if (sectionId === plan.season) take("identity", sectionId, rows[0]);
    else if (sectionId === "crop_farmer_lookup") take("identity", sectionId, rows[0]);
    else {
      const target = plan.sections.find((s) => s.sectionId === sectionId);
      if (target && (display || target.sectionId !== "cropsown_cropsown_location_section_03")) take(target.ui[0], sectionId, rows[0]);
    }
  }
  return values;
}

/**
 * The sections of a register tab response. The register names a section by its section_register_id only; the stage's
 * intake form tells which section_id that is. A section no intake form knows (Production) keeps `fallback` as its id.
 */
export function registerSections(tab: ApiRegisterTab, intake: ApiIntakeForm | null, fallback: string): { sectionId: string; rows: Row[] }[] {
  return (tab.tabs ?? []).flatMap((t) => t.records ?? []).map((sec) => ({
    sectionId: sec.section_id ?? intake?.sections.find((i) => i.section_register_id === sec.section_register_id)?.section_id ?? fallback,
    rows: (sec.records ?? []).filter((r): r is Row => !!r && typeof r === "object"),
  }));
}

/** The register record among a farmer's crop rows (the row with internal_record_id), if any. */
export const registerRowOf = (crops: ApiFarmerCrop[]): ApiFarmerCrop | undefined => crops.find((c) => !c.submission_id && !!c.internal_record_id);

/** Every register record of the farmer (one per season / crop sown ID), in the order the list gives them. */
export const registerRowsOf = (crops: ApiFarmerCrop[]): ApiFarmerCrop[] => crops.filter((c) => !c.submission_id && !!c.internal_record_id);

/** The intake submissions in a crops list (the register's own row has no submission), newest first. */
export function submissionsOf(crops: ApiFarmerCrop[]): ApiFarmerCrop[] {
  const stamp = (c: ApiFarmerCrop) => c.last_updated_at ?? c.first_created_at ?? "";
  return crops.filter((c) => !!c.submission_id).sort((a, b) => stamp(b).localeCompare(stamp(a)));
}

/**
 * The summary values (Fayda FAN, region, zone, woreda, kebele, crop year) across a farmer's rows: for each one the newest
 * row that has it. Recent drafts often have none of them, so older rows (the approved one) fill the gaps.
 */
export function summaryOf(crops: ApiFarmerCrop[]): Record<string, string> {
  const rows = [...submissionsOf(crops), ...crops.filter((c) => !c.submission_id)];
  const out: Record<string, string> = {};
  for (const row of rows) {
    for (const f of row.display_fields ?? []) if (f.value && !(f.field_name in out)) out[f.field_name] = f.value;
  }
  return out;
}

/** Form values from the summary: identity and the location names. A past crop year is not carried over (the registry takes the current one). */
export function summaryValues(summary: Record<string, string>): CropSownValues {
  const values: CropSownValues = {};
  if (summary.fayda_fan_id) values[valueKey("identity", "fayda_fan_id")] = summary.fayda_fan_id;
  if (summary.crop_year && Number(summary.crop_year) >= new Date().getFullYear()) values[valueKey("identity", "crop_year")] = summary.crop_year;
  const places: [string, string][] = [["region_name", "region"], ["zone_name", "zone"], ["woreda_name", "woreda"], ["kebele_name", "kebele"]];
  for (const [from, key] of places) if (summary[from]) values[valueKey("address", key)] = summary[from];
  return values;
}

/** The summary for reading: any crop year, and the location names in the address card's one location field. */
export function summaryDisplay(summary: Record<string, string>): CropSownValues {
  const values = summaryValues(summary);
  if (summary.crop_year) values[valueKey("identity", "crop_year")] = summary.crop_year;
  const place = [summary.region_name, summary.zone_name, summary.woreda_name, summary.kebele_name].filter(Boolean).join(", ");
  if (place) values[valueKey("address", "geo_code_hierarchy_json")] = place;
  return values;
}

export interface LoadedCropDetails {
  values: CropSownValues;
  /** The stages that had an earlier submission. */
  stages: CropSownForm[];
  /** How many intake submissions the farmer has in all. */
  total: number;
  /** The register record's Production tab sections, when the register was read. */
  production?: { sectionId: string; rows: Row[] }[];
}

export interface LoadCropOptions {
  /** Keep what only a read-only view shows (see stageValues). */
  display?: boolean;
  /** Read each stage from the register record's tab first (one call per tab), falling back to the newest submission. */
  register?: boolean;
}

/** The register record's id when `register` is asked for and the list has one. */
const registerIdOf = (crops: ApiFarmerCrop[], register: boolean) => (register ? registerRowOf(crops)?.internal_record_id : undefined);

/** The sections of one register tab; none when it cannot be read, so the submission can stand in. */
async function readRegisterTab(farmerCode: string, registerId: string | undefined, tabId: string, intake: ApiIntakeForm | null, fallback: string) {
  if (!registerId) return [];
  try {
    return registerSections(await fetchRegisterTab(farmerCode, registerId, tabId), intake, fallback);
  } catch {
    return [];
  }
}

/**
 * One stage's values: its intake form, then the register record's tab (with `register`), else the newest submission of
 * that stage. Empty when the stage has nothing. Lets a view load a stage only when its tab is opened.
 */
export async function loadStageValues(farmerCode: string, crops: ApiFarmerCrop[], form: CropSownForm, { display = false, register = false }: LoadCropOptions = {}): Promise<CropSownValues> {
  const intake = await loadIntakeForm(form);
  const fromRegister = await readRegisterTab(farmerCode, registerIdOf(crops, register), REGISTER_TAB_IDS[form], intake, form);
  const registerValues = fromRegister.length ? stageValues(form, fromRegister, intake, display) : {};
  if (Object.keys(registerValues).length) return registerValues;
  // Newest first; the stage's form id tells which submission belongs to which tab.
  const latest = intake ? submissionsOf(crops).find((c) => c.form_id === intake.form_id) : undefined;
  if (!latest?.submission_id) return {};
  try {
    const detail = (await fetchFarmerCrop(farmerCode, latest.submission_id)) as { sections?: unknown; tabs?: unknown; section_payloads?: unknown };
    return stageValues(form, sectionRows([detail.sections, detail.tabs, detail.section_payloads]), intake, display);
  } catch {
    // One unreadable submission must not hide the rest.
    return {};
  }
}

/** The register record's Production tab sections that hold rows; none without a register record. */
export async function loadProductionSections(farmerCode: string, crops: ApiFarmerCrop[], registerId = registerIdOf(crops, true)): Promise<{ sectionId: string; rows: Row[] }[]> {
  const sections = await readRegisterTab(farmerCode, registerId, REGISTER_TAB_IDS.production, null, "Production");
  return sections.filter((section) => section.rows.length > 0);
}

/**
 * The list's summary values with the loaded stages' values on top; what a stage's own sections hold wins. Identity is
 * shared by the four tabs: the first stage (in stage order) to give a value wins. Stages not loaded yet are skipped.
 */
export function mergeStageValues(crops: ApiFarmerCrop[], perStage: Partial<Record<CropSownForm, CropSownValues>>, display = false): { values: CropSownValues; stages: CropSownForm[] } {
  const values: CropSownValues = (display ? summaryDisplay : summaryValues)(summaryOf(crops));
  const stages: CropSownForm[] = [];
  const taken = new Set<string>();
  for (const form of STAGES) {
    const mine = perStage[form];
    if (!mine || Object.keys(mine).length === 0) continue;
    stages.push(form);
    for (const [key, value] of Object.entries(mine)) {
      const shared = key.startsWith("identity.");
      if (shared && taken.has(key)) continue;
      if (shared) taken.add(key);
      values[key] = value;
    }
  }
  return { values, stages };
}

/**
 * Reads the farmer's earlier Crop Sown records and turns them into form values. `listed` is the list when the caller
 * already has it (submission and register rows); see LoadCropOptions for the rest.
 */
export async function loadCropDetails(farmerCode: string, listed?: ApiFarmerCrop[], options: LoadCropOptions = {}): Promise<LoadedCropDetails> {
  const crops = listed ?? (await listFarmerCrops(farmerCode, "submission"));
  if (crops.length === 0) return { values: {}, stages: [], total: 0 };
  const production = registerIdOf(crops, !!options.register) ? loadProductionSections(farmerCode, crops) : undefined;
  const loaded = await Promise.all(STAGES.map(async (form) => [form, await loadStageValues(farmerCode, crops, form, options)] as const));
  const { values, stages } = mergeStageValues(crops, Object.fromEntries(loaded), !!options.display);
  return { values, stages, total: submissionsOf(crops).length, ...(production ? { production: await production } : {}) };
}

/** One section of a stage as its intake form lays it out, with the farmer's values. A list section has one entry per row. */
export interface IntakeDisplaySection {
  sectionId: string;
  title: string;
  isList: boolean;
  /** The section's fields as the intake form names them (a list section's table columns). */
  columns: { key: string; label: string }[];
  rows: { key: string; label: string; value: string }[][];
}

export interface StageDisplay {
  /** The intake form's sections in its order; empty when the intake form could not be read. */
  sections: IntakeDisplaySection[];
  /** Whether any field holds a value (else the tab shows "nothing submitted"). */
  hasData: boolean;
  /** The same records as form values, for the identity and summary the other tabs share. */
  values: CropSownValues;
}

const EMPTY = "—";
const humanizeKey = (key: string) => key.replace(/^(cs_|cropsown_)+/, "").replace(/_section_\d+$/, "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());

/** The section title: the portal's own for a section it knows, else the intake form's mnemonic made readable. */
function sectionTitle(form: CropSownForm, section: ApiIntakeForm["sections"][number]): string {
  const plan = STAGE_PLANS[form];
  const uiId = section.section_id === "crop_farmer_lookup" || section.section_id === plan?.season ? "identity" : plan?.sections.find((s) => s.sectionId === section.section_id)?.ui[0];
  const ui = uiId && CROP_SOWN_FORM.flatMap((t) => t.sections).find((s) => s.id === uiId);
  return ui ? ui.title : humanizeKey(section.section_mnemonic || section.section_id);
}

/** A stored value as the intake form shows it: an option's label for its code, Yes/No for booleans, lists joined. */
export function intakeDisplayValue(raw: unknown, field: ApiIntakeField): string {
  if (raw === null || raw === undefined || raw === "") return EMPTY;
  if (Array.isArray(raw)) return raw.map((one) => intakeDisplayValue(one, field)).filter((v) => v !== EMPTY).join(", ") || EMPTY;
  if (typeof raw === "boolean") return raw ? "Yes" : "No";
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const named = o.value_display ?? o.label ?? o.name;
    return typeof named === "string" && named ? named : Object.values(o).filter((v) => v !== null && v !== "" && typeof v !== "object").join(", ") || EMPTY;
  }
  // Static options (label/value) and catalog choices (value_display/value_id) both name the code they store.
  const choices = (field as { choices?: unknown }).choices;
  const all = [...(field.options ?? []), ...(Array.isArray(choices) ? choices : [])] as Parameters<typeof optionId>[0][];
  const match = all.find((o) => optionId(o).toLowerCase() === String(raw).toLowerCase());
  return match ? optionLabel(match) : String(raw);
}

/**
 * One stage laid out by its intake form (GET /crop-sown/intake-form?form=): every section and field label as the form
 * names them, filled from the register record's tab (with `register`), else from the newest submission of the stage.
 */
export async function loadStageDisplay(farmerCode: string, crops: ApiFarmerCrop[], form: CropSownForm, { registerId = registerIdOf(crops, true) }: { registerId?: string } = {}): Promise<StageDisplay> {
  const intake = await loadIntakeForm(form);
  const hasRows = (sections: { rows: Row[] }[]) => sections.some((s) => s.rows.some((r) => Object.values(r).some((v) => v !== null && v !== "")));
  let records = await readRegisterTab(farmerCode, registerId, REGISTER_TAB_IDS[form], intake, form);
  // An empty register tab falls back to the stage's newest submission, unless the farmer has several register records:
  // then the chosen one shows only its own data, as another season's submission would be misleading.
  if (!hasRows(records) && !(registerId && registerRowsOf(crops).length > 1)) {
    const latest = intake ? submissionsOf(crops).find((c) => c.form_id === intake.form_id) : undefined;
    records = [];
    if (latest?.submission_id) {
      try {
        const detail = (await fetchFarmerCrop(farmerCode, latest.submission_id)) as { sections?: unknown; tabs?: unknown; section_payloads?: unknown };
        records = sectionRows([detail.sections, detail.tabs, detail.section_payloads]);
      } catch {
        // One unreadable submission must not hide the rest.
      }
    }
  }

  // The farmer lookup, season and location sections repeat on every form; the "Crop Sown" tab shows them once, so a
  // stage tab shows only its own sections (Planning: crop planning and cluster details).
  const shared = new Set(["crop_farmer_lookup", "cropsown_cropsown_location_section_03", STAGE_PLANS[form]?.season]);
  const sections: IntakeDisplaySection[] = (intake?.sections ?? []).filter((section) => !shared.has(section.section_id)).map((section) => {
    const found = records.find((r) => r.sectionId === section.section_id)?.rows ?? [];
    // A list keeps only records that hold something: an empty row would show as a second "Record".
    const filled = found.filter((r) => Object.values(r).some((v) => v !== null && v !== "" && !(Array.isArray(v) && v.length === 0)));
    const rows = section.is_list ? filled : [found[0] ?? {}];
    return {
      sectionId: section.section_id,
      title: sectionTitle(form, section),
      isList: section.is_list,
      columns: section.fields.map((f) => ({ key: f.field_name, label: f.label || humanizeKey(f.field_name) })),
      rows: rows.map((row) => section.fields.map((f) => ({ key: f.field_name, label: f.label || humanizeKey(f.field_name), value: intakeDisplayValue(row[f.field_name], f) }))),
    };
  });
  const hasData = sections.some((s) => s.rows.some((row) => row.some((f) => f.value !== EMPTY)));
  return { sections, hasData, values: records.length ? stageValues(form, records, intake, true) : {} };
}
