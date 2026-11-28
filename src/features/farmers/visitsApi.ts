import { authRequest } from "@/features/auth";
import { ApiError } from "@/lib/api";

/** Body of POST /api/v1/da-services/visits. A DA plans for themself; an officer must also send `da_id`. */
export interface PlanVisitRequest {
  farmer_id: string;
  /** The farmer's display name as the UI shows it; required, stored as sent (no registry lookup on the backend). */
  farmer_name: string;
  /** Frappe User name (email) of the DA the visit is for; the backend reads da_id from it. Required, no session fallback. */
  user: string;
  /** "2026-10-16" */
  date: string;
  /** "10:30" */
  time: string;
  /** Crop Survey, Livestock Survey, Services, Advisory or Follow-up. */
  visit_type: string;
  purpose: string;
  duration_min: number;
  priority: "Low" | "Medium" | "High";
  priority_reason?: string;
  /** The farmer's plot the visit is for: a plot_id from GET /farmers/{id}/plots (as on the Holdings tab). */
  plot_ref?: string;
  location?: { lat: number; lng: number };
  notify_farmer_sms: boolean;
  /** Advisory visits only: the farmer's questions and the advice to give. */
  advisory_qa?: { question: string; answer: string }[];
  da_id?: string;
  /** Same id on a retry returns the visit already created instead of a duplicate. */
  client_op_id: string;
}

/** The planned visit as the backend stores it (subset the portal uses). */
export interface PlannedVisit {
  /** Visit id, e.g. "DA-VIS-0001". */
  name: string;
  da_id: string;
  farmer_id: string;
  farmer_name?: string | null;
  visit_type: string;
  physical_status: string;
  scheduled_at: string;
  duration_min: number;
  priority: string;
}

/** POST /api/v1/da-services/visits (201). */
export async function planVisit(body: PlanVisitRequest): Promise<PlannedVisit> {
  const res = await authRequest<{ data: PlannedVisit }>("/da-services/visits", { method: "POST", body });
  return res.data;
}

/** One item of a batch plan: a single-visit body without `user` / `da_id` (the envelope's apply). */
export type BatchVisitItem = Omit<PlanVisitRequest, "user" | "da_id">;

/** Batch body of the same POST /visits: 1-5 visits, each for a different farmer. */
export interface PlanVisitsBatchRequest {
  user: string;
  da_id?: string;
  visits: BatchVisitItem[];
}

export interface PlanVisitsBatchResult {
  created: PlannedVisit[];
  failed: { farmer_id: string; reason: string }[];
}

/** A failed batch item: the backend's error plus the item it received (`request`). */
type RawBatchFailure = { error?: string; code?: string; request?: { farmer_id?: string } };
type RawBatch = { created?: PlannedVisit[]; failed?: RawBatchFailure[] };

const toBatchResult = (data: RawBatch): PlanVisitsBatchResult => ({
  created: data.created ?? [],
  failed: (data.failed ?? []).map((f) => ({ farmer_id: (f.request?.farmer_id ?? "").trim(), reason: f.error || "Could not plan the visit." })),
});

/**
 * POST /api/v1/da-services/visits with `visits: [...]`: 201 when at least one visit was created (the others come back
 * in `failed`), 400 with the same body when none was. Both come back as a result; other errors are thrown.
 */
export async function planVisitsBatch(body: PlanVisitsBatchRequest): Promise<PlanVisitsBatchResult> {
  try {
    const res = await authRequest<{ data: RawBatch }>("/da-services/visits", { method: "POST", body });
    return toBatchResult(res.data);
  } catch (err) {
    const data = err instanceof ApiError && err.status === 400 ? (err.body as { data?: RawBatch } | null)?.data : undefined;
    if (data && Array.isArray(data.failed)) return toBatchResult(data);
    throw err;
  }
}
