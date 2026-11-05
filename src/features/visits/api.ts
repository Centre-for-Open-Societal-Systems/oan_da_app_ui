import { authRequest } from "@/features/auth";
import type { PlannerStatus, VisitRecord, VisitStatus } from "./types";

/** One row of GET /api/v1/da-services/visits (the fields the portal reads). */
export interface ApiVisit {
  /** Visit id, e.g. "DA-VIS-2026-0000123". */
  name: string;
  da_id: string;
  farmer_id: string;
  visit_type: string;
  purpose: string | null;
  /** "2026-10-16T10:30:00", server local time. */
  scheduled_at: string;
  duration_min: number;
  kebele: string | null;
  plot_ref: string | null;
  assigned_by: string | null;
  /** Planned, Confirmed, In progress, Physical Visit Complete, Missed, Rescheduled, Cancelled or Superseded. */
  physical_status: string;
  /** Planned / Confirmed / Completed / Missed, or a raw physical status (Cancelled, Rescheduled …). */
  ui_status: string;
  /** The planner's card colour, derived by the backend. */
  planner_status?: PlannerStatus;
  /** Unknown, Confirmed, Tentative or Declined. */
  farmer_confirmation?: string | null;
  confirmation_note?: string | null;
  location_lat?: number | null;
  location_lng?: number | null;
}

export interface VisitQuery {
  /** One day, "2026-10-16". Wins over from/to. */
  date?: string;
  from?: string;
  to?: string;
  /** Planned / Confirmed / Completed / Missed or a physical status. */
  status?: string;
  /** Only this DA's visits. Without it a DA gets every visit in their assigned Kebeles. */
  da_id?: string;
  limit?: number;
  start?: number;
}

/** GET /api/v1/da-services/visits: visits the caller may see, earliest first. */
export async function listVisits(q: VisitQuery = {}): Promise<{ items: ApiVisit[]; total: number }> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(q)) if (value !== undefined && value !== "") query.set(key, String(value));
  const res = await authRequest<{ data: ApiVisit[]; meta: { total: number } }>(`/da-services/visits?${query}`);
  return { items: res.data, total: res.meta.total };
}

const UI_STATUSES: readonly VisitStatus[] = ["Confirmed", "Planned", "Completed", "Missed"];

/**
 * An API visit in the table's shape. The API carries the farmer's registry id only (no name or email yet),
 * so the id stands in for the name. Cancelled / rescheduled visits show as Missed, the closest pill.
 */
export function toVisitRecord(v: ApiVisit): VisitRecord {
  const at = new Date(v.scheduled_at);
  return {
    id: v.name,
    date: at.toLocaleDateString("en-US", { month: "short", day: "2-digit", year: "numeric" }),
    time: v.scheduled_at.slice(11, 16),
    agent: v.da_id,
    farmerId: v.farmer_id,
    farmerName: v.farmer_id,
    farmerEmail: "",
    kebele: v.kebele ?? "—",
    purpose: v.purpose || v.visit_type,
    status: (UI_STATUSES as readonly string[]).includes(v.ui_status) ? (v.ui_status as VisitStatus) : "Missed",
    plotRef: v.plot_ref ?? "—",
    durationMin: v.duration_min,
    assignedBy: v.assigned_by ?? undefined,
    physicalStatus: v.physical_status,
  };
}

/** A DA acts only on their own visits; an unknown DA id (/me not read yet) counts as not theirs. Officers are not limited here. */
export const canActOnVisit = (v: Pick<VisitRecord, "agent">, isDA: boolean, daId: string | null | undefined) => !isDA || v.agent === daId;

/** Only these can be checked in; anything else gets "Only a Planned or Confirmed visit can be started." */
export const canStartVisit = (v: Pick<VisitRecord, "physicalStatus">) => v.physicalStatus === "Planned" || v.physicalStatus === "Confirmed";

export interface StartVisitRequest {
  /** Device position at check-in; left out when the browser could not get one. */
  gps?: { lat: number; lng: number; accuracy_m: number };
  /** The backend refuses a check-in without the farmer present. */
  farmer_present: true;
  /** Same id on a retry returns the visit already started instead of an error. */
  client_op_id: string;
}

/** POST /api/v1/da-services/visits/{id}/start: check in at the farm; the visit moves to In progress. */
export async function startVisit(visitId: string, body: StartVisitRequest): Promise<ApiVisit> {
  const res = await authRequest<{ data: ApiVisit }>(`/da-services/visits/${encodeURIComponent(visitId)}/start`, { method: "POST", body });
  return res.data;
}

/** What the photo or document shows; the backend's evidence kinds. */
export const EVIDENCE_KINDS = ["Crop", "Land", "Animal", "Document"] as const;
export type EvidenceKind = (typeof EVIDENCE_KINDS)[number];

/** File types the backend takes (checked by extension and by content there too). */
export const EVIDENCE_ACCEPT = ".jpg,.jpeg,.png,.webp,.pdf";
export const EVIDENCE_MAX_MB = 10;

/** One stored piece of evidence on a visit. */
export interface VisitAttachment {
  name: string;
  /** Server path of the stored file, e.g. "/private/files/plot.jpg". */
  file: string;
  kind: EvidenceKind;
  content_hash: string;
  captured_at: string | null;
  gps: { lat: number | null; lng: number | null };
  sync_state: string;
}

/** Problem with a file before it is sent, or null when it can go. */
export function evidenceProblem(file: File): string | null {
  const ext = file.name.includes(".") ? file.name.split(".").pop()!.toLowerCase() : "";
  if (!EVIDENCE_ACCEPT.split(",").includes(`.${ext}`)) return "Use a JPG, PNG, WEBP or PDF file.";
  if (file.size > EVIDENCE_MAX_MB * 1024 * 1024) return `The file is larger than ${EVIDENCE_MAX_MB} MB.`;
  return null;
}

/**
 * POST /api/v1/da-services/visits/{id}/attachments (multipart): geo-tagged evidence on an open or completed
 * visit. Sending the same bytes again returns the row already stored.
 */
export async function uploadVisitEvidence(visitId: string, { file, kind, gps }: { file: File; kind: EvidenceKind; gps?: { lat: number; lng: number } }): Promise<VisitAttachment> {
  const form = new FormData();
  form.append("file", file);
  form.append("kind", kind);
  if (gps) {
    form.append("lat", String(gps.lat));
    form.append("lng", String(gps.lng));
  }
  const res = await authRequest<{ data: VisitAttachment }>(`/da-services/visits/${encodeURIComponent(visitId)}/attachments`, { method: "POST", body: form });
  return res.data;
}

/** Evidence can be added while a visit is open or once it is complete; not after it is cancelled or missed. */
export const canAddEvidence = (v: Pick<VisitRecord, "physicalStatus">) =>
  ["Planned", "Confirmed", "In progress", "Physical Visit Complete"].includes(v.physicalStatus ?? "");

/** GET /visits/{id}: the visit with its status history and the evidence already stored. */
export interface ApiVisitDetail extends ApiVisit {
  timeline: { label: string; by: string | null; when: string | null; done: boolean }[];
  attachments: { file: string; kind: EvidenceKind; captured_at: string | null }[];
  outcome: string | null;
  next_action_type: string;
  next_action_date: string | null;
}

export async function fetchVisit(visitId: string): Promise<ApiVisitDetail> {
  const res = await authRequest<{ data: ApiVisitDetail }>(`/da-services/visits/${encodeURIComponent(visitId)}`);
  return res.data;
}

/** What happens next after a visit; a follow-up visit or task is created by the backend. */
export const NEXT_ACTION_TYPES = ["None", "Follow-up visit", "Task"] as const;
export type NextActionType = (typeof NEXT_ACTION_TYPES)[number];

export interface SubmitOutcomeRequest {
  purpose?: string;
  farmer_response?: string;
  observed?: string;
  advice_given?: string;
  inputs_actions?: string;
  next_action?: { type: NextActionType; note?: string; date?: string };
  /** Same id on a retry returns the completed visit instead of creating a second follow-up. */
  client_op_id: string;
}

/** POST /visits/{id}/submit: closes the visit (Physical Visit Complete) and creates any follow-up. */
export async function submitVisitOutcome(visitId: string, body: SubmitOutcomeRequest): Promise<ApiVisit> {
  const res = await authRequest<{ data: ApiVisit }>(`/da-services/visits/${encodeURIComponent(visitId)}/submit`, { method: "POST", body });
  return res.data;
}

/** The outcome is logged once the DA has checked in. */
export const canLogOutcome = (v: Pick<VisitRecord, "physicalStatus">) => v.physicalStatus === "In progress";

/** "2026-10-15T15:48:22.56" → "15 Oct, 15:48" (site-local time, shown as is). */
export const formatVisitTime = (iso: string | null) =>
  iso ? `${new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${iso.slice(11, 16)}` : "";

/** Id for one device operation (client_op_id). randomUUID needs https or localhost; plain http falls back to time + random. */
export const newClientOpId = () => (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

/** Rescheduling and cancelling work on visits not yet closed; the backend refuses the rest. */
export const canReschedule = (v: Pick<VisitRecord, "physicalStatus">) => v.physicalStatus === "Planned" || v.physicalStatus === "Confirmed";
export const canCancel = (v: Pick<VisitRecord, "physicalStatus">) => ["Planned", "Confirmed", "In progress"].includes(v.physicalStatus ?? "");

/**
 * POST /visits/{id}/reschedule. The old visit becomes Rescheduled; the answer is the NEW Planned visit
 * (its `rescheduled_from` points back).
 */
export async function rescheduleVisit(visitId: string, body: { date: string; time: string; reason: string }): Promise<ApiVisit> {
  const res = await authRequest<{ data: ApiVisit }>(`/da-services/visits/${encodeURIComponent(visitId)}/reschedule`, { method: "POST", body });
  return res.data;
}

/** POST /visits/{id}/cancel. */
export async function cancelVisit(visitId: string, reason: string): Promise<ApiVisit> {
  const res = await authRequest<{ data: ApiVisit }>(`/da-services/visits/${encodeURIComponent(visitId)}/cancel`, { method: "POST", body: { reason } });
  return res.data;
}

/** GET /reports/activity: one week of the DA's completed visits, compiled from their outcomes. */
export interface ActivityReportData {
  da_id: string;
  /** "2026-W42" */
  week: string;
  from: string;
  to: string;
  visits_completed: number;
  visits_planned: number;
  farmers_reached: number;
  advisories_issued: number;
  /** Stays 0 until grievances are linked to visits on the backend. */
  issues_raised: number;
  follow_ups: number;
  outcomes: { visit_id: string; farmer_id: string; kebele: string | null; purpose: string; summary: string | null; completed_at: string | null }[];
}

/** `week` as "2026-W42"; the backend defaults to the current week. */
export async function fetchActivityReport(week?: string): Promise<ActivityReportData> {
  const query = week ? `?${new URLSearchParams({ week })}` : "";
  const res = await authRequest<{ data: ActivityReportData }>(`/da-services/reports/activity${query}`);
  return res.data;
}
