import { authRequest, getAccessToken } from "@/features/auth";
import { ApiError, currentCsrfToken } from "@/lib/api";
import { downloadBlob } from "@/lib/download";
import { useAuthStore } from "@/store/useAuthStore";
import type { Role } from "@/lib/rbac";
import type { SurveyStatus, SurveyTask, SurveyType } from "./data";

// Surveys API (DA Services, FR-09d): /da-services/surveys/templates, /surveys, /surveys/{id}/responses|results.
// Contract: oan_da_app_backend docs/surveys-frontend.md and docs/surveys-integration.md (develop branch).

const BASE = "/da-services/surveys";

/** Who may publish / edit templates. */
export const canWriteSurveys = (role: Role | null | undefined) => role === "Supervisor" || role === "Admin";
/** Who sees the officer view: template list, results and the XLSX export. */
export const isSurveyOfficer = (role: Role | null | undefined) => role === "Supervisor" || role === "Admin" || role === "Executive";

interface ListResponse<T> {
  data: T[];
  meta?: { total?: number; limit?: number; start?: number };
}

export interface SurveyPage<T> {
  items: T[];
  total: number;
}

const query = (params: Record<string, string | number | undefined | null>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== null && String(v).trim() !== "") q.set(k, String(v).trim());
  const s = q.toString();
  return s ? `?${s}` : "";
};

const page = <T>(res: ListResponse<T>): SurveyPage<T> => ({ items: res.data ?? [], total: res.meta?.total ?? res.data?.length ?? 0 });

// ---- templates (Supervisor / Admin write; Executive reads) ---------------------------------------

export interface TemplateListQuery {
  status?: SurveyStatus;
  type?: SurveyType;
  woreda?: string;
  q?: string;
  limit?: number;
  start?: number;
}

/** GET /surveys/templates: templates in the caller's scope (Supervisor, Admin, Executive). */
export async function listSurveyTemplates({ limit = 200, start = 0, ...filters }: TemplateListQuery = {}): Promise<SurveyPage<SurveyTask>> {
  return page(await authRequest<ListResponse<SurveyTask>>(`${BASE}/templates${query({ ...filters, limit, start })}`));
}

/** GET /surveys/templates/{id}: full template with parameters and assignedDaIds. */
export async function getSurveyTemplate(id: string): Promise<SurveyTask> {
  return (await authRequest<{ data: SurveyTask }>(`${BASE}/templates/${encodeURIComponent(id)}`)).data;
}

export interface TemplateQuestionBody {
  prompt: string;
  type: "rating" | "single" | "multi" | "text";
  /** Sent as a list so a multi-word choice ("Yes, fully") stays one value. */
  options: string[] | "";
  required: boolean;
  /** Non-English prompts keyed by language ("Amharic", "Afaan Oromoo"); English stays in `prompt`. */
  translations?: Record<string, string>;
}

/** POST /surveys/templates body. Consent, Farmer ID and Kebele (p1–p3) are prepended by the server. */
export interface TemplateBody {
  name: string;
  type: SurveyType;
  /** yyyy-mm-dd. */
  open: string;
  close: string;
  languages: string[];
  targetFarmers: number;
  questions: TemplateQuestionBody[];
  /** Woreda code. Admin must send it; a Supervisor may leave it out when they have exactly one Woreda. */
  woreda?: string;
  assignmentMode?: "Woreda" | "Selected";
  /** Required when assignmentMode is Selected; every DA must be in the Woreda. */
  assignedDaIds?: string[];
  /** Same id on a retry returns the template already created instead of a second one. */
  client_op_id?: string;
}

/** POST /surveys/templates: create = publish (status Open). 201 with the new SurveyTask. */
export async function createSurveyTemplate(body: TemplateBody): Promise<SurveyTask> {
  return (await authRequest<{ data: SurveyTask }>(`${BASE}/templates`, { method: "POST", body })).data;
}

/** PATCH body: send only the keys to change. Type and Woreda cannot be changed. */
export interface TemplatePatch {
  name?: string;
  status?: "Open" | "Closed";
  open?: string;
  close?: string;
  languages?: string[];
  targetFarmers?: number;
  /** With collected == 0 the template is edited in place; otherwise the server creates a new template version. */
  questions?: TemplateQuestionBody[];
  assignmentMode?: "Woreda" | "Selected";
  assignedDaIds?: string[];
}

/** PATCH /surveys/templates/{id}. Returns the updated template, or the new version when questions changed after responses. */
export async function patchSurveyTemplate(id: string, patch: TemplatePatch): Promise<SurveyTask> {
  return (await authRequest<{ data: SurveyTask }>(`${BASE}/templates/${encodeURIComponent(id)}`, { method: "PATCH", body: patch })).data;
}

export const closeSurveyTemplate = (id: string) => patchSurveyTemplate(id, { status: "Closed" });
export const reopenSurveyTemplate = (id: string) => patchSurveyTemplate(id, { status: "Open" });

// ---- assigned surveys (DA capture) ---------------------------------------------------------------

export interface SurveyListQuery {
  status?: SurveyStatus;
  type?: SurveyType;
  language?: string;
  woreda?: string;
  q?: string;
  limit?: number;
  start?: number;
}

/** GET /surveys: surveys assigned to the caller. For a DA, collected / queued / answered are their own. */
export async function listSurveys({ limit = 200, start = 0, ...filters }: SurveyListQuery = {}): Promise<SurveyPage<SurveyTask>> {
  return page(await authRequest<ListResponse<SurveyTask>>(`${BASE}${query({ ...filters, limit, start })}`));
}

/** GET /surveys/{id}: one survey with its parameters and answered[] (403 for a DA not assigned in Selected mode). */
export async function getSurvey(id: string): Promise<SurveyTask> {
  return (await authRequest<{ data: SurveyTask }>(`${BASE}/${encodeURIComponent(id)}`)).data;
}

// ---- responses -----------------------------------------------------------------------------------

export type SurveyAnswers = Record<string, string | string[]>;

export interface ResponseBody {
  /** Farmer Registry internal id or the FR-… id; the server resolves the canonical one. */
  farmer_id: string;
  consent: "granted" | "declined";
  answers: SurveyAnswers;
  /** Only Queued or Synced; Draft is rejected with 400. */
  sync_state?: "Queued" | "Synced";
  /** Reuse the same id on a retry; a different payload under the same id is 409. */
  client_op_id?: string;
  /** Collector DA-ID; required when a Supervisor / Admin collects on behalf of a DA. */
  da_id?: string;
  started_at?: string;
  completed_at?: string;
}

/** One stored response (serialize_response). */
export interface SurveyResponseRecord {
  id: string;
  survey_id: string;
  template_version: string | null;
  collector_da_id: string;
  /** Canonical internal farmer id. */
  farmer_id: string;
  consent: "granted" | "declined" | null;
  answers: SurveyAnswers;
  sync_state: "Synced" | "Queued" | "Declined" | "Draft" | "Rejected" | "Conflict" | string;
  started_at: string | null;
  completed_at: string | null;
  client_op_id: string | null;
  region: string | null;
  zone: string | null;
  woreda: string | null;
  kebele: string | null;
}

/** POST /surveys/{id}/responses: 201 stored; 400 invalid / outside window; 403 out of scope; 404 farmer; 409 duplicate. */
export async function submitSurveyResponse(surveyId: string, body: ResponseBody): Promise<SurveyResponseRecord> {
  return (await authRequest<{ data: SurveyResponseRecord }>(`${BASE}/${encodeURIComponent(surveyId)}/responses`, { method: "POST", body })).data;
}

export interface ResponseListQuery {
  farmer_id?: string;
  da_id?: string;
  region?: string;
  zone?: string;
  woreda?: string;
  kebele?: string;
  limit?: number;
  start?: number;
}

/** GET /surveys/{id}/responses: officers get their scope, a DA only their own collector rows. */
export async function listSurveyResponses(surveyId: string, { limit = 500, start = 0, ...filters }: ResponseListQuery = {}): Promise<SurveyPage<SurveyResponseRecord>> {
  return page(await authRequest<ListResponse<SurveyResponseRecord>>(`${BASE}/${encodeURIComponent(surveyId)}/responses${query({ ...filters, limit, start })}`));
}

// ---- results and export (Supervisor / Executive / Admin) -----------------------------------------

export interface ParameterSummary {
  response_count: number;
  /** Rating only. */
  average?: number | null;
  /** Rating: "1".."5" → count; choice types: option → count. */
  counts?: Record<string, number>;
}

export interface SurveyResults {
  survey_id: string;
  name: string;
  target_farmers: number;
  collected: number;
  queued: number;
  by_status: Record<string, number>;
  parameters: { id: string; prompt: string; type: string; summary: ParameterSummary }[];
}

/** GET /surveys/{id}/results: basic counts and rating averages (consent / auto parameters left out). */
export async function getSurveyResults(surveyId: string): Promise<SurveyResults> {
  return (await authRequest<{ data: SurveyResults }>(`${BASE}/${encodeURIComponent(surveyId)}/results`)).data;
}

const filenameOf = (disposition: string | null, fallback: string) => {
  const m = disposition?.match(/filename\*?=(?:UTF-8'')?"?([^";]+)"?/i);
  return m ? decodeURIComponent(m[1]) : fallback;
};

/**
 * GET /surveys/{id}/responses/export: the server-built XLSX (raw bytes, not the JSON envelope), saved under the
 * filename from Content-Disposition. Supervisor / Executive / Admin with a live officer assignment; others get 403.
 */
export async function downloadSurveyResponses(surveyId: string): Promise<void> {
  const path = `/api/v1${BASE}/${encodeURIComponent(surveyId)}/responses/export`;
  const headers: Record<string, string> = { Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet, application/json" };
  // An IAM session's credentials are its cookies (the /api/v1 proxy adds the Bearer); other sessions send their token.
  if (useAuthStore.getState().tokens?.provider !== "iam") {
    const token = await getAccessToken();
    if (!token) throw new ApiError("Your session has ended. Please sign in again.", 401);
    headers.Authorization = `Bearer ${token}`;
  }
  const csrf = currentCsrfToken();
  if (csrf) headers["X-CSRF-Token"] = csrf;

  let res: Response;
  try {
    res = await fetch(path, { headers });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    const data = await res.json().catch(() => null);
    const message = data && typeof data === "object" && typeof (data as { message?: unknown }).message === "string" ? (data as { message: string }).message : `Export failed (${res.status}).`;
    throw new ApiError(message, res.status);
  }
  downloadBlob(await res.blob(), filenameOf(res.headers.get("Content-Disposition"), `survey-${surveyId}-responses.xlsx`));
}

// ---- errors --------------------------------------------------------------------------------------

/** Text for a failed survey call, following the status table in docs/surveys-frontend.md. */
export function describeSurveyError(err: unknown, action: "load" | "submit" | "save" | "export" = "load"): string {
  if (!(err instanceof ApiError)) return err instanceof Error ? err.message : "Something went wrong. Try again.";
  switch (err.status) {
    case 0: return err.message;
    case 401: return "Your session has ended. Please sign in again.";
    case 403:
      if (action === "submit") return "This farmer is not in your assigned Kebele for this survey.";
      if (action === "export") return "Only a Supervisor, Executive or Admin with an active assignment can export responses.";
      return err.message && !/^Request failed/.test(err.message) ? err.message : "You don't have access to this survey.";
    case 404: return action === "submit" ? "Farmer not found. Search again and pick the farmer from the list." : "Survey not found.";
    case 409: return action === "submit" ? "A response for this farmer already exists for this survey." : err.message;
    default: return err.details ? Object.values(err.details).join(" ") : err.message;
  }
}

/** A fresh operation id for idempotent create / submit; reuse it when retrying the same request. */
export const newOpId = (prefix: string) =>
  `${prefix}-${typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
