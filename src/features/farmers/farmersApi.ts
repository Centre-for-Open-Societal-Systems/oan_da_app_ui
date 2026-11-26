import { authRequest } from "@/features/auth";
import { ApiError } from "@/lib/api";
import { labelOfCode } from "./cropSownSpecApply";
import type { Farmer, FarmerStatus, Plot, Visit } from "./types";

/**
 * One row of GET /api/v1/da-services/farmers: a Farmer Registry register row, its display fields as plain keys.
 * Numbers come as strings ("2.25", "2").
 */
export interface ApiFarmer {
  /** Farmer-ID shown to people, e.g. "FR-821910965037"; the id every other farmer call takes. */
  functional_record_id: string | null;
  /** Registry internal record id (a UUID). */
  internal_record_id: string;
  /** Full name, e.g. "Signoff Odk Test". */
  record_name: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  /** With the +251 prefix. */
  primary_phone_number: string | null;
  kebele_name: string | null;
  woreda_name: string | null;
  zone_name?: string | null;
  region_name: string | null;
  /** Hectares, as a decimal string. */
  total_land_area: string | number | null;
  /** Number of land records (plots), as a string. */
  total_plots: string | number | null;
  /** Time-limited link to the farmer's photo (about an hour); null when there is none. */
  record_image_url: string | null;
  created_at?: string | null;
  created_by?: string | null;
  last_approved_at: string | null;
  last_approved_by?: string | null;
  birth_date?: string | null;
  gender?: string | null;
  education_level?: string | null;
  marital_status?: string | null;
  foundational_id?: string | null;
  link_internal_record_id?: string | null;
  link_foundational_id?: string | null;
}

/** The Farmer-ID of a list row, the internal record id when the registry sent none. */
export const apiFarmerId = (f: ApiFarmer) => f.functional_record_id || f.internal_record_id;

export interface FarmerQuery {
  /** Name, Farmer-ID or phone, as typed in the search box; empty lists every farmer in scope. */
  searchText?: string;
  /** 1-based. */
  page?: number;
  /** Default 50, at most 1000. */
  pageSize?: number;
  /**
   * Registry filters, sent as filter_by JSON, e.g. `{ kebele_code: { eq: "ET04010105" } }`. The geo keys (region_code,
   * zone_code, woreda_code, kebele_code) take geo Master Data codes and are checked against the caller's area.
   */
  filterBy?: Record<string, unknown>;
}

/** The search text the list used to send for "every farmer"; kept so callers can tell a real search from none. */
export const ALL_FARMERS_SEARCH = "FR-";

export interface FarmerPage {
  items: ApiFarmer[];
  /** meta.number_of_items: rows across all pages. */
  total: number;
  /** meta.number_of_pages. */
  totalPages: number;
}

/**
 * GET /farmers?search_text=&current_page=&page_size=: one page of the Farmer Registry register in the caller's scope
 * (a DA's kebele, a supervisor's woreda, all for Admin). Answers `{ data: ApiFarmer[], meta: { number_of_items, number_of_pages } }`.
 */
export async function listFarmers({ searchText, page = 1, pageSize = 50, filterBy }: FarmerQuery = {}): Promise<FarmerPage> {
  const query = new URLSearchParams({ search_text: searchText?.trim() ?? "", current_page: String(page), page_size: String(pageSize) });
  if (filterBy && Object.keys(filterBy).length > 0) query.set("filter_by", JSON.stringify(filterBy));
  const res = await authRequest<{ data: ApiFarmer[] | null; meta?: { number_of_items?: number; number_of_pages?: number } }>(`/da-services/farmers?${query}`);
  const items = res.data ?? [];
  const total = res.meta?.number_of_items ?? items.length;
  return { items, total, totalPages: res.meta?.number_of_pages ?? Math.max(1, Math.ceil(total / pageSize)) };
}

/** The text to show for a failed farmer call, following the backend's error table. */
export function describeFarmerError(err: unknown): string {
  if (!(err instanceof ApiError)) return err instanceof Error ? err.message : "Could not load farmers.";
  switch (err.status) {
    case 401: return "Your session has ended. Please sign in again.";
    case 403: return "You don't have access to this farmer.";
    case 404: return "Farmer not found.";
    case 502:
    case 503:
    case 504: return "Registry unavailable, try again.";
    // 400: the details texts, else the message.
    default: return err.details ? Object.values(err.details).join(" ") : err.message;
  }
}

/**
 * GET /farmers/{internal_id}/details: the farmer's record straight from the Farmer Registry (about 100 keys; the ones the
 * profile reads are typed). Takes the internal_record_id (UUID), not the Farmer-ID. Numbers may come as strings.
 */
export interface ApiFarmerDetails {
  internal_record_id: string;
  functional_record_id: string | null;
  record_name: string | null;
  first_name?: string | null;
  middle_name?: string | null;
  last_name?: string | null;
  /** "ACTIVE" for an approved record. */
  record_status?: string | null;
  /** With the +251 prefix. */
  primary_phone_number: string | null;
  email?: string | null;
  region_name: string | null;
  zone_name?: string | null;
  woreda_name: string | null;
  kebele_name: string | null;
  /** Hectares, as a decimal string. */
  total_land_area: string | number | null;
  land_ownership?: string | null;
  total_plots: string | number | null;
  /** Time-limited link to the farmer's photo; null when there is none. */
  record_image_url: string | null;
  last_approved_at: string | null;
}

const farmerPath = (id: string, part: string) => `/da-services/farmers/${encodeURIComponent(id)}/${part}`;

export async function fetchFarmerDetails(internalId: string): Promise<ApiFarmerDetails> {
  return (await authRequest<{ data: ApiFarmerDetails }>(farmerPath(internalId, "details"))).data;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * The registry internal_record_id for a farmer URL id: a UUID as it is, a Farmer-ID ("FR-…") looked up in the farmer list
 * (search_text=FR-id). Throws a 404 ApiError when the list has no such farmer.
 */
export async function resolveFarmerInternalId(id: string): Promise<string> {
  if (UUID.test(id)) return id;
  const { items } = await listFarmers({ searchText: id, pageSize: 5 });
  const row = items.find((f) => f.functional_record_id?.toLowerCase() === id.toLowerCase());
  if (!row) throw new ApiError("Farmer not found.", 404);
  return row.internal_record_id;
}

/** One row of GET /farmers/{id}/visits, newest first. */
export interface ApiFarmerVisit {
  name: string;
  scheduled_at: string | null;
  physical_status: string;
  visit_type: string;
  outcome: string | null;
  da_id: string;
  completed_at: string | null;
}

export async function fetchFarmerVisits(farmerId: string, { limit = 50, start = 0 } = {}): Promise<{ items: ApiFarmerVisit[]; total: number }> {
  const res = await authRequest<{ data: { visits: ApiFarmerVisit[]; total: number } }>(`${farmerPath(farmerId, "visits")}?${new URLSearchParams({ limit: String(limit), start: String(start) })}`);
  return { items: res.data.visits, total: res.data.total };
}

/** One land plot from GET /farmers/{id}/plots (Farmer Registry). Still used by the Crop Report form; the profile reads land_details. */
export interface ApiPlot {
  plot_id: string;
  land_kebele: string | null;
  area_in_hectare: number | null;
  land_ownership_type: string | null;
  soil_fertility: string | null;
  current_land_use: string | null;
  certificate_provided: boolean;
}

export async function fetchFarmerPlots(farmerId: string): Promise<ApiPlot[]> {
  const res = await authRequest<{ data: { plots: ApiPlot[] } }>(farmerPath(farmerId, "plots"));
  return res.data.plots;
}

/** One plot from GET /farmers/{internal_id}/land_details (the is_list section of the registry's Lands tab). */
export interface ApiLandRecord {
  internal_record_id: string;
  record_status?: string | null;
  /** Hectares, as a decimal string ("1.750000"). */
  area_in_hectare: string | number | null;
  land_ownership_type: string | null;
  soil_fertility: string | null;
  current_land_use: string | null;
  land_kebele: string | null;
  certificate_provided?: boolean;
}

/** GET /farmers/{internal_id}/land_details: the farmer's plots; the section with is_list true holds one record per plot. */
export async function fetchFarmerLandDetails(internalId: string): Promise<ApiLandRecord[]> {
  const res = await authRequest<{ data: { is_list: boolean; records: ApiLandRecord[] }[] | null }>(farmerPath(internalId, "land_details"));
  return (res.data ?? []).find((section) => section.is_list)?.records ?? [];
}

/**
 * One row of GET /farmers/{id}/livestock: a `kind: "submission"` with its `sections`, or a `kind: "record"` of a register.
 * Each register has its own columns; livestockRecords.ts reads them.
 */
export type ApiFarmerLivestock = Record<string, unknown>;

/** GET /farmers/{id}/livestock: every livestock submission and register record of the farmer. Takes the FR-… Farmer ID. */
export async function fetchFarmerLivestock(farmerId: string): Promise<ApiFarmerLivestock[]> {
  const res = await authRequest<{ data: { livestock: ApiFarmerLivestock[] } }>(farmerPath(farmerId, "livestock"));
  return res.data.livestock;
}

// ---- Edit permission, queued updates and DA links ----

/** GET /farmers/{id}/permissions: whether the caller may act on this farmer. */
export interface FarmerPermissions {
  can_edit: boolean;
  reason: string | null;
  is_linked: boolean;
  link_type: "Automatic" | "Manual" | null;
}

export async function fetchFarmerPermissions(farmerId: string): Promise<FarmerPermissions> {
  return (await authRequest<{ data: FarmerPermissions }>(farmerPath(farmerId, "permissions"))).data;
}

/** Fields a DA may edit on a farmer; identity fields are rejected by the backend. */
export interface FarmerUpdate {
  phone?: string;
  email?: string;
  alternative_contact?: string;
  household_size?: number;
  dependents?: number;
  occupation?: string;
  income_source?: string;
  livelihood_type?: string;
  total_land_hectares?: number;
  land_tenure?: string;
  irrigated_land?: number;
  certifications?: string;
  training_status?: string;
}

/** PATCH /farmers/{id}: queued for the registry, so the answer is a queue reference, not the updated farmer. */
export async function updateFarmer(farmerId: string, updates: FarmerUpdate, clientOpId: string): Promise<{ event_id: string; status: string; updates: FarmerUpdate }> {
  const res = await authRequest<{ data: { event_id: string; status: string; updates: FarmerUpdate } }>(`/da-services/farmers/${encodeURIComponent(farmerId)}`, { method: "PATCH", body: { ...updates, client_op_id: clientOpId } });
  return res.data;
}

export interface PendingFarmerUpdate {
  event_id: string;
  status: string;
  attempts: number;
  next_retry: string | null;
  last_error: string | null;
  queued_at: string;
}

/** GET /farmers/{id}/update-status: edits that have not reached the registry yet. */
export async function fetchFarmerUpdateStatus(farmerId: string): Promise<{ pending: PendingFarmerUpdate[]; total: number }> {
  const res = await authRequest<{ data: { pending_updates: PendingFarmerUpdate[]; total_pending: number } }>(farmerPath(farmerId, "update-status"));
  return { pending: res.data.pending_updates, total: res.data.total_pending };
}

/** POST /farmers/updates/{event_id}/retry (Admin): re-queues a Failed or Conflict update. */
export async function retryFarmerUpdate(eventId: string): Promise<void> {
  await authRequest(`/da-services/farmers/updates/${encodeURIComponent(eventId)}/retry`, { method: "POST" });
}

export interface FarmerLink {
  link_id: string;
  da_id: string;
  farmer_id: string;
  link_type: "Automatic" | "Manual";
  is_active: boolean;
  linked_at: string;
  kebele?: string | null;
}

/** GET /farmer-links: how each farmer got onto a DA list. */
export async function listFarmerLinks(q: { daId?: string; farmerId?: string; linkType?: "Automatic" | "Manual"; active?: boolean } = {}): Promise<FarmerLink[]> {
  const query = new URLSearchParams();
  if (q.daId) query.set("da_id", q.daId);
  if (q.farmerId) query.set("farmer_id", q.farmerId);
  if (q.linkType) query.set("link_type", q.linkType);
  if (q.active !== undefined) query.set("is_active", q.active ? "1" : "0");
  return (await authRequest<{ data: FarmerLink[] }>(`/da-services/farmer-links?${query}`)).data;
}

/** POST /farmer-links (Supervisor): links one farmer to a DA whose assignment is in Manual mode. */
export async function linkFarmer(daId: string, farmerId: string, clientOpId: string): Promise<FarmerLink> {
  return (await authRequest<{ data: FarmerLink }>("/da-services/farmer-links", { method: "POST", body: { da_id: daId, farmer_id: farmerId, client_op_id: clientOpId } })).data;
}

// ---- Mapping onto the portal's shapes ----

/** "CROP_PRODUCTION" → "Crop production". */
export const humanize = (code: string | null | undefined) => (code ? code.charAt(0) + code.slice(1).toLowerCase().replace(/_/g, " ") : "");

/** Site-local ISO date-time → "12 May 2026" and "08:20"; no UTC shift (the backend sends local time). */
function splitDateTime(iso: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "" };
  const day = new Date(`${iso.slice(0, 10)}T00:00:00`);
  return { date: day.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }), time: iso.length > 10 ? iso.slice(11, 16) : "" };
}

/** The profile sends the phone without +251 ("964815374"), the list with it ("+251964815374"): shown one way. */
export function withCountryCode(phone: string | null | undefined): string {
  const digits = (phone ?? "").replace(/[^\d+]/g, "");
  if (!digits) return "";
  if (digits.startsWith("+")) return digits;
  if (digits.startsWith("251")) return `+${digits}`;
  return `+251${digits.replace(/^0/, "")}`;
}

/** Registry state → the three-way status pill; the state itself is the hover reason when not approved. */
export function toFarmerStatus(state: string | null): { status: FarmerStatus; reason?: string } {
  if (!state || state === "APPROVED" || state === "ACTIVE") return { status: "Verified" };
  if (["REJECTED", "SUSPENDED", "FLAGGED"].includes(state)) return { status: "Flagged", reason: humanize(state) };
  return { status: "Pending", reason: humanize(state) };
}

/** "2.25" / 2.25 → 2.25; null, "" or not a number → null. */
function toNumber(value: string | number | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

/**
 * A list row as a table Farmer. The register row carries no registration state, visits, crop or livestock: the status
 * reads as the default (no state), visits as 0 and the rest as "—". "Registered" shows when the record was last approved.
 */
export function apiFarmerToFarmer(f: ApiFarmer): Farmer {
  const approved = splitDateTime(f.last_approved_at);
  const { status, reason } = toFarmerStatus(null);
  const land = toNumber(f.total_land_area);
  const plots = toNumber(f.total_plots);
  const id = apiFarmerId(f);
  const name = f.record_name?.trim() || [f.first_name, f.middle_name, f.last_name].filter(Boolean).join(" ");
  return {
    id,
    regId: f.functional_record_id ?? undefined,
    internalId: f.internal_record_id,
    avatar: f.record_image_url ?? undefined,
    name,
    email: "",
    phone: withCountryCode(f.primary_phone_number),
    landUnknown: land === null,
    plotsUnknown: plots === null,
    kebele: f.kebele_name ?? "—",
    woreda: f.woreda_name ?? "",
    region: f.region_name ?? "",
    crop: "—",
    landHa: land ?? 0,
    livestock: "—",
    livestockHeads: 0,
    registeredAt: approved.date,
    registeredTime: approved.time,
    status,
    statusReason: reason,
    totalPlots: plots ?? 0,
    visits: 0,
    lastVisit: "—",
  };
}

/**
 * The registry details as the profile's Farmer. Visits (count and last visit) come from the visits call. The record has
 * no primary crop or livestock: those read "—".
 */
export function profileToFarmer(d: ApiFarmerDetails, visits: { total: number; lastAt?: string | null }): Farmer {
  const approved = splitDateTime(d.last_approved_at);
  const { status, reason } = toFarmerStatus(d.record_status ?? null);
  const land = toNumber(d.total_land_area);
  const plots = toNumber(d.total_plots);
  return {
    id: d.functional_record_id || d.internal_record_id,
    regId: d.functional_record_id ?? undefined,
    internalId: d.internal_record_id,
    avatar: d.record_image_url ?? undefined,
    name: d.record_name?.trim() || [d.first_name, d.middle_name, d.last_name].filter(Boolean).join(" "),
    email: d.email ?? "",
    phone: withCountryCode(d.primary_phone_number),
    landUnknown: land === null,
    plotsUnknown: plots === null,
    kebele: d.kebele_name ?? "—",
    woreda: d.woreda_name ?? "",
    region: d.region_name ?? "",
    crop: "—",
    landHa: land ?? 0,
    livestock: "—",
    livestockHeads: 0,
    registeredAt: approved.date,
    registeredTime: approved.time,
    status,
    statusReason: reason,
    totalPlots: plots ?? 0,
    visits: visits.total,
    lastVisit: splitDateTime(visits.lastAt ?? null).date,
  };
}

/** A registry plot for the Holdings tab. The registry has no centroid yet, so lat/lng are NaN (no map link). */
export function apiPlotToPlot(p: ApiLandRecord): Plot {
  return {
    code: p.internal_record_id,
    crop: humanize(p.current_land_use) || "—",
    areaHa: toNumber(p.area_in_hectare) ?? 0,
    // Registry codes (SF_HIGH, OWNER, CROP_SHARING) are shown by their labels.
    soil: (p.soil_fertility && (labelOfCode("SOIL_FERTILITY", p.soil_fertility) ?? humanize(p.soil_fertility))) || "—",
    zone: p.land_kebele ?? "—",
    lat: Number.NaN,
    lng: Number.NaN,
    tenure: (p.land_ownership_type && (labelOfCode("OWNERSHIP_TYPE", p.land_ownership_type) ?? humanize(p.land_ownership_type))) || "—",
  };
}

/** The backend's closed-visit status as people read it. */
const VISIT_STATUS_LABELS: Record<string, string> = { "Physical Visit Complete": "Completed" };

/** A visit for the Visit history timeline. */
export function apiVisitToVisit(v: ApiFarmerVisit): Visit {
  const at = splitDateTime(v.completed_at ?? v.scheduled_at);
  return {
    title: `${v.visit_type} · ${VISIT_STATUS_LABELS[v.physical_status] ?? v.physical_status}`,
    summary: v.outcome || `Visit ${v.name} by ${v.da_id}`,
    date: at.date,
    time: at.time,
  };
}
