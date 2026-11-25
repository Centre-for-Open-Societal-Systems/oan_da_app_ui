import { authRequest } from "@/features/auth";
import { ApiError } from "@/lib/api";
import type { ApiGeoValue } from "./cropSownApi";

// Livestock routes of the DA Services API (see the OAN-DA-Livestock Postman collection). Paths are relative to /api/v1;
// authRequest attaches the Bearer token and CSRF value, which DA Services forwards to the Livestock staff host.

/** A catalog choice of a live field: value_code only comes with some attributes. */
export interface ApiLivestockChoice {
  value_id?: string;
  value_code?: string;
  value_display?: string;
}

/** A field of the live form. Only what the portal reads is typed: `rules` and `autofill` are not used yet. */
export interface ApiLivestockIntakeField {
  field_name: string;
  label?: string;
  data_type?: string;
  required?: boolean;
  readonly?: boolean;
  choices?: (string | ApiLivestockChoice)[] | null;
  options?: (string | ApiLivestockChoice)[] | null;
}

export interface ApiLivestockIntakeForm {
  form_id?: string;
  sections?: { section_id: string; fields?: ApiLivestockIntakeField[] }[];
}

export interface LivestockSectionInput {
  section_id: string;
  records: Record<string, unknown>[];
}

export interface ApiSavedLivestock {
  submission_id: string;
  subject_record_id?: string;
  application_reference?: string;
  draft_status?: string;
  approval_status?: string;
}

const farmerLivestock = (farmerId: string) => `/da-services/farmers/${encodeURIComponent(farmerId)}/livestock`;

/** GET /livestock/intake-form: the live form: sections, then fields in screen order. */
export async function fetchLivestockIntakeForm(): Promise<ApiLivestockIntakeForm> {
  return (await authRequest<{ data: ApiLivestockIntakeForm }>("/da-services/livestock/intake-form")).data;
}

/** GET /livestock/geo-level-values: l1 region, l2 zone, l3 woreda, l4 kebele. */
export async function fetchLivestockGeoLevelValues(levelId: string, parentLevelValueId?: string): Promise<ApiGeoValue[]> {
  const query = new URLSearchParams({ level_id: levelId });
  if (parentLevelValueId) query.set("parent_level_value_id", parentLevelValueId);
  return (await authRequest<{ data: { values: ApiGeoValue[] } }>(`/da-services/livestock/geo-level-values?${query}`)).data.values;
}

/**
 * POST /farmers/{id}/livestock: a new draft (no `draft` given), or more sections on an existing one. The registry fills
 * farmer_id from the URL.
 */
export async function saveFarmerLivestock(farmerId: string, sections: LivestockSectionInput[], draft?: { submissionId: string; subjectRecordId?: string }): Promise<ApiSavedLivestock> {
  const body = draft
    ? { submission_id: draft.submissionId, ...(draft.subjectRecordId ? { subject_record_id: draft.subjectRecordId } : {}), sections }
    : { submission_id: null, sections };
  return (await authRequest<{ data: ApiSavedLivestock }>(farmerLivestock(farmerId), { method: "POST", body })).data;
}

/** POST /farmers/{id}/livestock/{submission_id}/finalize: sends the draft for approval (FINAL and PENDING). */
export async function finalizeFarmerLivestock(farmerId: string, submissionId: string): Promise<ApiSavedLivestock | undefined> {
  return (await authRequest<{ data?: ApiSavedLivestock }>(`${farmerLivestock(farmerId)}/${encodeURIComponent(submissionId)}/finalize`, { method: "POST" })).data;
}

/** The text to show for a failed Livestock call. A 400's message already names the fields the API rejected. */
export function describeLivestockError(err: unknown): string {
  if (!(err instanceof ApiError)) return err instanceof Error ? err.message : "Could not reach the Livestock service.";
  switch (err.status) {
    case 401: return "Your session has ended. Please sign in again.";
    case 403: return err.message && !/^forbidden$/i.test(err.message) ? err.message : "You do not have access to this farmer.";
    case 404: return "Farmer or submission not found.";
    case 502:
    case 503:
    case 504: return "Registry unavailable, try again.";
    default: return err.message;
  }
}
