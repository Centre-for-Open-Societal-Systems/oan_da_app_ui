import { authRequest } from "@/features/auth";
import { ApiError } from "@/lib/api";

// Crop Sown routes of the DA Services API (see the OAN-DA-CropSown Postman collection). Paths are relative to /api/v1;
// the Bearer token is attached by authRequest, so they work with the Keycloak sign-in as with the DA login.

/** The four Crop Sown stages the intake-form route takes as `form`. */
export type CropSownForm = "planning" | "cultivation" | "sowing" | "harvesting";

export interface ApiIntakeField {
  field_name: string;
  label: string;
  data_type: string;
  required: boolean;
  readonly: boolean;
  /** Plain strings, or catalog choices as value_id + value_display. */
  options: (string | { value_id: string; value_display?: string })[] | null;
  attribute_id: string | null;
}

export interface ApiIntakeSection {
  section_id: string;
  section_register_id: string;
  section_mnemonic: string;
  screen_section: string | null;
  is_list: boolean;
  fields: ApiIntakeField[];
}

export interface ApiIntakeForm {
  form_id: string;
  register_id: string;
  form_mnemonic: string;
  /** Every stage's form, so the UI can list them without four calls. */
  intake_forms: { form_id: string; form_mnemonic: string }[];
  sections: ApiIntakeSection[];
}

export interface ApiGeoValue {
  level_value_id: string;
  level_value_mnemonic: string;
}

/** Shared by the save and read routes. */
export interface ApiCropSubmission {
  farmer_id: string;
  submission_id: string;
  draft_status: string;
  approval_status: string;
  form_id: string;
  register_id: string;
}

export interface ApiSectionPayload {
  section_id: string;
  section_register_id: string;
  is_list: boolean;
  records: Record<string, unknown>[];
}

export interface ApiSavedCrop extends ApiCropSubmission {
  subject_record_id: string;
  record_name: string;
  application_reference: string;
  section_payloads: ApiSectionPayload[];
}

/** One of the `display_fields` the list gives each row: the registry's own summary of it (Fayda FAN, region, crop year…). */
export interface ApiDisplayField {
  field_name: string;
  order: number;
  value: string | null;
}

/**
 * A row of GET /farmers/{id}/crops, newest first. Most rows are intake submissions (they carry submission_id and form_id);
 * the last is usually the approved register record of the farmer's crop (internal_record_id, no submission).
 */
export interface ApiFarmerCrop {
  submission_id?: string;
  form_id?: string;
  register_id?: string;
  record_name: string;
  application_reference?: string;
  draft_status?: string;
  approval_status?: string;
  approved_by?: string | null;
  created_by?: string | null;
  first_created_at?: string;
  last_updated_at?: string;
  /** Rows of the register itself. */
  internal_record_id?: string;
  functional_record_id?: string;
  created_at?: string;
  submission_source?: string;
  display_fields?: ApiDisplayField[];
  section_payloads?: ApiSectionPayload[] | null;
}

/** One section's records as the save route takes them. */
export interface CropSectionInput {
  section_id: string;
  records: Record<string, unknown>[];
}

/** Save options: `submissionId` continues the draft the first save created (the registry saves section by section). */
export interface SaveCropOptions {
  submissionId?: string;
}

const BASE = "/da-services/crop-sown";
const farmerCrops = (farmerId: string) => `/da-services/farmers/${encodeURIComponent(farmerId)}/crops`;

/** GET /crop-sown/intake-form?form=: the field list of one stage. */
export async function fetchIntakeForm(form: CropSownForm): Promise<ApiIntakeForm> {
  return (await authRequest<{ data: ApiIntakeForm }>(`${BASE}/intake-form?${new URLSearchParams({ form })}`)).data;
}

/** GET /crop-sown/geo-level-values: the values of one geo level, e.g. the regions (l1) or the zones (l2) of a region. */
export async function fetchGeoLevelValues(levelId: string, parentLevelValueId?: string): Promise<ApiGeoValue[]> {
  const query = new URLSearchParams({ level_id: levelId });
  if (parentLevelValueId) query.set("parent_level_value_id", parentLevelValueId);
  return (await authRequest<{ data: { values: ApiGeoValue[] } }>(`${BASE}/geo-level-values?${query}`)).data.values;
}

/** POST /farmers/{id}/crops: saves a stage's sections as a draft submission. */
export async function saveFarmerCrop(farmerId: string, form: CropSownForm, sections: CropSectionInput[], { submissionId }: SaveCropOptions = {}): Promise<ApiSavedCrop> {
  const body = { form, ...(submissionId ? { submission_id: submissionId } : {}), sections };
  return (await authRequest<{ data: ApiSavedCrop }>(farmerCrops(farmerId), { method: "POST", body })).data;
}

/** GET /farmers/{id}/crops?submission_id=: one saved submission. */
export async function fetchFarmerCrop(farmerId: string, submissionId: string): Promise<ApiCropSubmission & { sections: unknown[]; tabs: unknown[] }> {
  const query = new URLSearchParams({ submission_id: submissionId });
  return (await authRequest<{ data: ApiCropSubmission & { sections: unknown[]; tabs: unknown[] } }>(`${farmerCrops(farmerId)}?${query}`)).data;
}

/** GET /farmers/{id}/crops: every crop submission of the farmer. */
export async function listFarmerCrops(farmerId: string): Promise<ApiFarmerCrop[]> {
  return (await authRequest<{ data: { crops: ApiFarmerCrop[] } }>(farmerCrops(farmerId))).data.crops;
}

/** 404 on the crops list: a farmer the registries do not know, which for a profile simply means no crops. */
export const isCropsNotFound = (err: unknown): boolean => err instanceof ApiError && err.status === 404;

/** The text to show for a failed Crop Sown call. */
export function describeCropSownError(err: unknown): string {
  if (!(err instanceof ApiError)) return err instanceof Error ? err.message : "Could not reach the Crop Sown service.";
  switch (err.status) {
    case 401: return "Your session has ended. Please sign in again.";
    // The API says why (e.g. "Farmer is not linked or assigned to you."); that is more useful than a generic line.
    case 403: return err.message && !/^forbidden$/i.test(err.message) ? err.message : "You do not have access to this farmer.";
    case 404: return "Farmer or submission not found.";
    case 502:
    case 504: return "Registry unavailable, try again.";
    default: return err.message;
  }
}
