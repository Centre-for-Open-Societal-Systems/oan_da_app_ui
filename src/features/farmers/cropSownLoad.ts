import { CROP_SOWN_FORM, valueKey, type CropSownFieldDef, type CropSownValues } from "./cropSown";
import { fetchFarmerCrop, listFarmerCrops, type ApiFarmerCrop, type ApiIntakeField, type ApiIntakeForm, type CropSownForm } from "./cropSownApi";
import { loadIntakeForm, optionId, optionLabel, STAGE_PLANS } from "./cropSownSubmit";

// A farmer's earlier Crop Sown details, from the registry itself: GET /farmers/{id}/crops lists their submissions (one per
// stage form), GET /farmers/{id}/crops?submission_id= reads one with its section records. The newest submission of each
// stage fills that stage's tab, turning the registry's codes back into the labels the form shows.

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

/** The form values behind one stage's section records. Geo ids and the lookup's Fayda FIN have no field to land in. */
export function stageValues(tab: string, sections: { sectionId: string; rows: Row[] }[], intake: ApiIntakeForm | null): CropSownValues {
  const plan = STAGE_PLANS[tab];
  const values: CropSownValues = {};
  if (!plan) return values;
  const fieldsOf = (id: string) => intake?.sections.find((s) => s.section_id === id)?.fields;

  const take = (uiSectionId: string, sectionId: string, row: Row | undefined) => {
    if (!row) return;
    const ui = CROP_SOWN_FORM.find((t) => t.key === tab)?.sections.find((s) => s.id === uiSectionId);
    for (const def of ui?.fields ?? []) {
      if (def.readOnly && def.key !== "farmer_id") continue;
      const value = toFormValue(row[def.key], def, fieldsOf(sectionId)?.find((f) => f.field_name === def.key));
      if (value !== "") values[valueKey(uiSectionId, def.key)] = value;
    }
  };

  for (const { sectionId, rows } of sections) {
    if (sectionId === plan.season) take("identity", sectionId, rows[0]);
    else if (sectionId === "crop_farmer_lookup") take("identity", sectionId, rows[0]);
    else {
      const target = plan.sections.find((s) => s.sectionId === sectionId);
      if (target && target.sectionId !== "cropsown_cropsown_location_section_03") take(target.ui[0], sectionId, rows[0]);
    }
  }
  return values;
}

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

export interface LoadedCropDetails {
  values: CropSownValues;
  /** The stages that had an earlier submission. */
  stages: CropSownForm[];
  /** How many intake submissions the farmer has in all. */
  total: number;
}

/** Reads the farmer's earlier Crop Sown submissions and turns them into form values. `listed` is the list when the caller already has it. */
export async function loadCropDetails(farmerCode: string, listed?: ApiFarmerCrop[]): Promise<LoadedCropDetails> {
  const crops = listed ?? (await listFarmerCrops(farmerCode));
  if (crops.length === 0) return { values: {}, stages: [], total: 0 };
  const submissions = submissionsOf(crops);

  const perStage = await Promise.all(
    STAGES.map(async (form) => {
      const intake = await loadIntakeForm(form);
      // Newest first; the stage's form id tells which submission belongs to which tab.
      const latest = intake ? submissions.find((c) => c.form_id === intake.form_id) : undefined;
      if (!latest?.submission_id) return { form, mine: {} as CropSownValues };
      try {
        const detail = (await fetchFarmerCrop(farmerCode, latest.submission_id)) as { sections?: unknown; tabs?: unknown; section_payloads?: unknown };
        return { form, mine: stageValues(form, sectionRows([detail.sections, detail.tabs, detail.section_payloads]), intake) };
      } catch {
        // One unreadable submission must not hide the rest.
        return { form, mine: {} as CropSownValues };
      }
    }),
  );

  // The list's summaries first; what a stage's own sections hold wins. Identity is shared by the four tabs: the first stage
  // (in stage order) to give a value wins.
  const values: CropSownValues = { ...summaryValues(summaryOf(crops)) };
  const stages: CropSownForm[] = [];
  const taken = new Set<string>();
  for (const { form, mine } of perStage) {
    if (Object.keys(mine).length === 0) continue;
    stages.push(form);
    for (const [key, value] of Object.entries(mine)) {
      const shared = key.startsWith("identity.");
      if (shared && taken.has(key)) continue;
      if (shared) taken.add(key);
      values[key] = value;
    }
  }
  return { values, stages, total: submissions.length };
}
