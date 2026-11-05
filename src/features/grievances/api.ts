import { authRequest } from "@/features/auth";
import type { Grievance, GrievanceCase, ThreadMessage } from "./types";

// DA Services proxies the external OAN Grievance Service: a DA sees their own tickets, a Supervisor their
// Woreda's, an Admin all. Reads fail with 503 when the service is down; a submit is then queued instead.
// Contract follows oan_da_app_services/postman/Grievance (staging da-backend-development).

// --- GET /grievances/options (raise form dropdowns) -------------------------

/** A category choice: `value` is submitted (as service_category), `label` is shown. */
export interface GrievanceCategoryOption {
  value: string;
  label: string;
  /** Grievance types for this category; the form offers these as the grievance_type. */
  subcategories: string[];
}

/** A status choice from /options: `status` is the code, `label` is shown. */
export interface GrievanceStatusOption {
  status: string;
  label: string;
}

export interface GrievanceOptions {
  categories: GrievanceCategoryOption[];
  /** Flat grievance-type list (type names); used when the chosen category carries no subcategories. */
  grievanceTypes: string[];
  statuses: GrievanceStatusOption[];
  /** Submitter type names from the service (e.g. "Individual Farmer", "Cooperative"), for the raise form. */
  submitterTypes: string[];
}

/** Read a list of strings/objects into a name list, trying the given keys in order. */
function toNameList(list: unknown, keys: string[]): string[] {
  if (!Array.isArray(list)) return [];
  return list
    .map((v) => {
      if (typeof v === "string") return v;
      if (v && typeof v === "object") {
        for (const k of keys) {
          const val = (v as Record<string, unknown>)[k];
          if (val) return String(val);
        }
      }
      return "";
    })
    .filter(Boolean);
}

export async function fetchGrievanceOptions(): Promise<GrievanceOptions> {
  const raw = (await authRequest<{ data: { categories?: unknown; grievance_types?: unknown; statuses?: unknown; submitter_types?: unknown } }>("/da-services/grievances/options")).data;
  const categories: GrievanceCategoryOption[] = Array.isArray(raw.categories)
    ? raw.categories.map((c: { value?: string; label?: string; subcategories?: unknown }) => ({
        value: String(c.value ?? ""),
        label: String(c.label ?? c.value ?? ""),
        subcategories: toNameList(c.subcategories, ["type_name", "label", "value"]),
      }))
    : [];
  const statuses: GrievanceStatusOption[] = Array.isArray(raw.statuses)
    ? raw.statuses
        .map((s: { status?: string; label?: string } | string) =>
          typeof s === "string" ? { status: s, label: s } : { status: String(s.status ?? ""), label: String(s.label ?? s.status ?? "") },
        )
        .filter((s: GrievanceStatusOption) => s.status && s.status !== "All")
    : [];
  return {
    categories,
    // grievance_types are {grievance_type_id, service_category, type_name}; keep the type names.
    grievanceTypes: toNameList(raw.grievance_types, ["type_name", "label", "value"]),
    statuses,
    // submitter_types are {code, type_name}; the create body sends the type name.
    submitterTypes: toNameList(raw.submitter_types, ["type_name", "label"]),
  };
}

// --- GET /grievances/summary (stat cards) -----------------------------------

/** One status card from /summary; `status` is the code the list filters by, `count` is the whole-dataset total. */
export interface GrievanceSummaryCard {
  status: string;
  label: string;
  order: number;
  /** 1 when the status is still open (not terminal). */
  is_open: number;
  /** 1 when the status is terminal (resolved/closed/rejected). */
  is_terminal: number;
  count: number;
}

export async function fetchGrievanceSummary(): Promise<GrievanceSummaryCard[]> {
  const cards = ((await authRequest<{ data: { cards?: GrievanceSummaryCard[] } }>("/da-services/grievances/summary")).data || {}).cards;
  return Array.isArray(cards) ? [...cards].sort((a, b) => a.order - b.order) : [];
}

// --- GET /grievances (list) -------------------------------------------------

/** One row of GET /grievances. */
export interface ApiGrievance {
  ticket_number: string;
  /** Same as ticket_number on the current backend; kept for older payloads. */
  ticket_id?: string;
  /** The service's status code (also the summary-card / filter key). */
  status: string;
  category: string;
  subject: string;
  /** Who raised it (the service records a name even for DA-assisted cases). */
  complainant_name?: string;
  /** Timestamp (the list sends "YYYY-MM-DD HH:mm:ss.ssssss", not strict ISO), or null. */
  created_at: string | null;
  updated_at?: string | null;
  /** Free-text location label (e.g. a Kebele name), or null. */
  location: string | null;
}

/** Page size the API allows at most. */
export const GRIEVANCE_PAGE_MAX = 100;

export interface ListGrievancesParams {
  page?: number;
  pageSize?: number;
  status?: string;
  category?: string;
  location?: string;
  fromDate?: string;
  toDate?: string;
  search?: string;
}

export async function listGrievances(params: ListGrievancesParams = {}): Promise<{ items: ApiGrievance[]; total: number }> {
  const { page = 1, pageSize = 20, status, category, location, fromDate, toDate, search } = params;
  const query = new URLSearchParams({ page: String(page), page_size: String(pageSize) });
  // Sent only when set, matching the collection's pre-request script.
  const optional: Record<string, string | undefined> = { status, category, location, from_date: fromDate, to_date: toDate, search };
  for (const [key, value] of Object.entries(optional)) if (value) query.set(key, value);
  const res = await authRequest<{ data: ApiGrievance[]; meta: { total: number } }>(`/da-services/grievances?${query}`);
  return { items: res.data, total: res.meta?.total ?? res.data.length };
}

// --- GET /grievances/{ticket_id} --------------------------------------------

/** GET /grievances/{ticket_id}. */
export interface ApiGrievanceDetail {
  ticket_number: string;
  ticket_id?: string;
  status: string;
  subject: string;
  description: string;
  category: string;
  /** The grievance type (the service calls it the subcategory). */
  subcategory: string | null;
  complainant_name: string;
  complainant_role: string;
  complainant_id: string;
  region: string | null;
  woreda: string | null;
  assigned_to: string | null;
  resolution: string | null;
  resolved_at: string | null;
  /** ISO date/time the SLA is due by, or null. */
  sla_due_date: string | null;
  /** 0-100; how much of the SLA window has been used, or null. */
  sla_consumed_percent: number | null;
  created_at: string | null;
  updated_at?: string | null;
  /** The detail echoes the timeline too; the modal also fetches /timeline for the same data. */
  timeline?: ApiGrievanceEvent[];
}

export async function fetchGrievance(ticketId: string): Promise<ApiGrievanceDetail> {
  return (await authRequest<{ data: ApiGrievanceDetail }>(`/da-services/grievances/${encodeURIComponent(ticketId)}`)).data;
}

/** One entry of GET /grievances/{ticket_id}/timeline. */
export interface ApiGrievanceEvent {
  timestamp: string;
  /** e.g. "created", "assigned", "resolved". */
  action: string;
  actor: string;
  detail: string;
}

export async function fetchGrievanceTimeline(ticketId: string): Promise<ApiGrievanceEvent[]> {
  return (await authRequest<{ data: ApiGrievanceEvent[] }>(`/da-services/grievances/${encodeURIComponent(ticketId)}/timeline`)).data;
}

// --- POST /grievances (create) ----------------------------------------------

export interface SubmitGrievanceRequest {
  subject: string;
  description: string;
  priority: string;
  /** "Self" or "Farmer". */
  raised_for: string;
  submitter_type: string;
  submitter_name: string;
  contact_mobile: string;
  /** Area code (e.g. a Kebele code) the complaint is about. */
  administrative_area: string;
  /** Human label for that area (e.g. the Kebele name). */
  administrative_unit: string;
  /** A category value from /options. */
  service_category: string;
  /** A grievance type from the category's subcategories (or the flat grievance_types list). */
  grievance_type: string;
  desired_outcome: string;
  /** 1 when the submitter consented to data sharing, else 0. */
  consent_given: number;
  /** 1 to hide the submitter's identity, else 0. */
  is_anonymous: number;
  /** Same id on a retry is not queued twice while the service is down. */
  client_op_id?: string;
}

/** POST /grievances (201). `ticket_id` is null and `sync_state` "pending" when the service was down and it was queued. */
export interface SubmitGrievanceResult {
  ticket_id: string | null;
  ticket_number: string | null;
  sync_state: "synced" | "pending";
  queue_ref?: string;
  message?: string | null;
}

export async function submitGrievance(body: SubmitGrievanceRequest): Promise<SubmitGrievanceResult> {
  const data = (await authRequest<{ data: Partial<SubmitGrievanceResult> }>("/da-services/grievances", { method: "POST", body })).data || {};
  return {
    ticket_id: data.ticket_id ?? data.ticket_number ?? null,
    ticket_number: data.ticket_number ?? data.ticket_id ?? null,
    sync_state: data.sync_state ?? "synced",
    queue_ref: data.queue_ref,
    message: data.message ?? null,
  };
}

// --- administrative area ----------------------------------------------------
// The create endpoint validates administrative_area against the grievance service's geo registry, as
// `kebele-<geo value_id>` (e.g. "kebele-ET140108101008"). As of 2026-11-04 no DA-token-accessible endpoint
// lists those codes (the registries' /geo-level-values reject the DA issuer, and grievances exposes no areas
// route), so the raise form takes the Kebele code directly. Swap to a picker once the backend exposes one.

/** A known-valid staging Kebele, used to prefill the raise form's area field. */
export const SAMPLE_KEBELE = { code: "ET140108101008", name: "Kebele 01 Center" };

/** administrative_area the create endpoint expects for a Kebele: `kebele-<geo value_id>`. */
export const toAdministrativeArea = (kebeleCode: string) => {
  const code = kebeleCode.trim();
  return code.startsWith("kebele-") ? code : `kebele-${code}`;
};

/** POST /grievances/sync/retry (OAN Administrator): replays failed grievance sync events, one by name or all when omitted. */
export async function retryGrievanceSync(eventName?: string): Promise<{ retried: string[]; count: number }> {
  return (await authRequest<{ data: { retried: string[]; count: number } }>("/da-services/grievances/sync/retry", { method: "POST", body: eventName ? { event_name: eventName } : {} })).data;
}

// --- helpers / mappers ------------------------------------------------------

/** Id for one submit (client_op_id). randomUUID needs https or localhost; plain http falls back to time + random. */
export const newClientOpId = () => (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

/** "Sep 20, 2026, 1:00 PM" in the viewer's time zone (the service sends UTC); "—" when missing. */
export function formatGrievanceTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}, ${d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}`;
}

/**
 * An API ticket in the table's shape. The list carries no submitter or priority, so those stay empty;
 * every API ticket counts as raised by a DA (the service records the signed-in DA or officer as complainant).
 */
export function toGrievance(g: ApiGrievance): Grievance {
  return {
    ticketId: g.ticket_number || g.ticket_id || "",
    title: g.subject,
    submitter: g.complainant_name ?? "",
    region: "",
    woreda: "",
    location: g.location ?? "",
    type: "",
    category: g.category,
    status: g.status,
    submittedAt: formatGrievanceTime(g.created_at),
    attachments: 0,
    responses: 0,
    raisedBy: "DA",
    fromApi: true,
  };
}

/** Case view for an API ticket: its description and timeline as the thread, submitter + SLA from the detail. */
export function caseFromApi(grievance: Grievance, detail?: ApiGrievanceDetail, timeline: ApiGrievanceEvent[] = []): GrievanceCase {
  const createdAt = detail?.created_at ?? null;
  const submittedOn = createdAt ? new Date(createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : grievance.submittedAt;
  const events = (timeline.length > 0 ? timeline : detail?.timeline ?? []);
  const thread: ThreadMessage[] = [];
  if (detail) {
    thread.push({
      kind: "submission",
      id: "submission",
      author: detail.complainant_name || grievance.submitter || "Submitter",
      role: detail.complainant_role || "Submitter",
      at: formatGrievanceTime(createdAt),
      body: detail.description || detail.subject || grievance.title,
      attachments: [],
    });
  }
  // The timeline's own "submission"/"created" entry is the block above; later events become thread lines.
  events
    .filter((e) => e.action !== "created" && e.action !== "submission")
    .forEach((e, i) => thread.push({ kind: "event", id: `event-${i}`, action: e.action, actor: e.actor, at: formatGrievanceTime(e.timestamp), detail: e.detail }));
  if (detail?.resolution) {
    thread.push({ kind: "internal-note", id: "resolution", author: detail.assigned_to ?? "Grievance Service", role: "Resolution", at: formatGrievanceTime(detail.resolved_at), body: detail.resolution });
  }

  const dueOn = detail?.sla_due_date ? formatGrievanceTime(detail.sla_due_date) : "—";
  return {
    grievance: detail
      ? { ...grievance, status: detail.status || grievance.status, category: detail.category || grievance.category, type: detail.subcategory ?? grievance.type, region: detail.region ?? grievance.region, woreda: detail.woreda ?? grievance.woreda }
      : grievance,
    thread,
    submitter: {
      name: detail?.complainant_name || grievance.submitter || "—",
      kind: detail?.complainant_role || "—",
      faydaId: detail?.complainant_id || "—",
      kebele: grievance.location || detail?.woreda || "—",
      channel: "DA Portal",
      submittedOn,
    },
    sla: { consumedPct: Math.max(0, Math.min(100, detail?.sla_consumed_percent ?? 0)), submittedOn, dueOn },
  };
}
