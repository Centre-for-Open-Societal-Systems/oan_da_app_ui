import { authRequest } from "@/features/auth";
import type { Farmer, FarmerStatus, Plot, Visit } from "./types";

/** One row of GET /api/v1/da-services/farmers. */
export interface ApiFarmer {
  /** Farmer Registry internal record id; the id every other farmer call takes. */
  farmer_id: string;
  /** Registry number shown to people, e.g. "FR-88341". */
  reg_id: string | null;
  farmer_name: string;
  phone: string | null;
  kebele: string | null;
  woreda: string | null;
  region: string | null;
  total_land_hectares: number | null;
  /** DRAFT, PENDING_APPROVAL, APPROVED … */
  registration_state: string | null;
  registered_at: string | null;
  /** Only on the cached list; a live registry search does not carry visit data. */
  visit_count?: number;
  last_visit?: string | null;
}

export interface FarmerQuery {
  woreda?: string;
  kebele?: string;
  /** Registration state, e.g. "APPROVED". */
  state?: string;
  limit?: number;
  start?: number;
  /**
   * Name, Farmer-ID or phone. With it the live Farmer Registry is searched (within the caller's scope)
   * instead of the DA Services cache; "FR-" matches every approved farmer.
   */
  search_text?: string;
  /** 1-based page, with page_size (registry paging). */
  page?: number;
  page_size?: number;
}

/** Paging the backend reports with the list: page / page_size from a registry search, limit / start from the cache. */
export interface FarmerPage {
  page?: number;
  page_size?: number;
  number_of_pages?: number;
  limit?: number;
  start?: number;
  /** True when scope was applied after the registry answered, so a page may hold fewer rows than page_size. */
  filtered_client_side?: boolean;
}

/** GET /farmers: a DA's farmers in their Kebeles; officers' farmers by scope. */
export async function listFarmers(q: FarmerQuery = {}): Promise<{ items: ApiFarmer[]; total: number; page?: FarmerPage; source?: "registry" | "cache" }> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(q)) if (value !== undefined && value !== "") query.set(key, String(value));
  const res = await authRequest<{ data: { farmers: ApiFarmer[]; total: number; page?: FarmerPage; source?: "registry" | "cache" } }>(`/da-services/farmers?${query}`);
  return { items: res.data.farmers, total: res.data.total, page: res.data.page, source: res.data.source };
}

/** GET /farmers/{id}/profile: header and stats of the farmer profile. */
export interface ApiFarmerProfile {
  farmer_id: string;
  reg_id: string | null;
  name: string;
  kebele: string | null;
  woreda: string | null;
  region: string | null;
  phone: string | null;
  email: string | null;
  verification_state: string | null;
  /** Open follow-up tasks for this farmer. */
  pending_actions: number;
  household_size: number | null;
  total_land_area: number | null;
  land_ownership: string | null;
  primary_crop: string | null;
  registration_date: string | null;
  last_visit_date: string | null;
  last_visit_outcome: string | null;
  can_edit: boolean;
  is_linked: boolean;
}

const farmerPath = (id: string, part: string) => `/da-services/farmers/${encodeURIComponent(id)}/${part}`;

export async function fetchFarmerProfile(farmerId: string): Promise<ApiFarmerProfile> {
  const res = await authRequest<{ data: ApiFarmerProfile }>(farmerPath(farmerId, "profile"));
  return res.data;
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

/** One land plot from GET /farmers/{id}/plots (Farmer Registry). */
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

/** Registry state → the three-way status pill; the state itself is the hover reason when not approved. */
export function toFarmerStatus(state: string | null): { status: FarmerStatus; reason?: string } {
  if (!state || state === "APPROVED") return { status: "Verified" };
  if (["REJECTED", "SUSPENDED", "FLAGGED"].includes(state)) return { status: "Flagged", reason: humanize(state) };
  return { status: "Pending", reason: humanize(state) };
}

/** A list row as a table Farmer. The list carries no crop or livestock yet, so those read "—". */
export function apiFarmerToFarmer(f: ApiFarmer): Farmer {
  const registered = splitDateTime(f.registered_at);
  const { status, reason } = toFarmerStatus(f.registration_state);
  return {
    id: f.farmer_id,
    name: f.farmer_name,
    email: "",
    phone: f.phone ?? "",
    kebele: f.kebele ?? "—",
    woreda: f.woreda ?? "",
    region: f.region ?? "",
    crop: "—",
    landHa: f.total_land_hectares ?? 0,
    livestock: "—",
    livestockHeads: 0,
    registeredAt: registered.date,
    registeredTime: registered.time,
    status,
    statusReason: reason,
    totalPlots: 0,
    visits: f.visit_count ?? 0,
    lastVisit: splitDateTime(f.last_visit ?? null).date,
  };
}

/** The profile header and stats as a Farmer; plot and visit counts come from their own calls. */
export function profileToFarmer(p: ApiFarmerProfile, counts: { plots: number; visits: number }): Farmer {
  const registered = splitDateTime(p.registration_date);
  const { status, reason } = toFarmerStatus(p.verification_state);
  return {
    id: p.farmer_id,
    name: p.name,
    email: p.email ?? "",
    phone: p.phone ?? "",
    kebele: p.kebele ?? "—",
    woreda: p.woreda ?? "",
    region: p.region ?? "",
    crop: p.primary_crop ?? "—",
    landHa: p.total_land_area ?? 0,
    livestock: "—",
    livestockHeads: 0,
    registeredAt: registered.date,
    registeredTime: registered.time,
    status,
    statusReason: reason,
    totalPlots: counts.plots,
    visits: counts.visits,
    lastVisit: splitDateTime(p.last_visit_date).date,
  };
}

/** A registry plot for the Holdings tab. The registry has no centroid yet, so lat/lng are NaN (no map link). */
export function apiPlotToPlot(p: ApiPlot): Plot {
  return {
    code: p.plot_id,
    crop: humanize(p.current_land_use) || "—",
    areaHa: p.area_in_hectare ?? 0,
    soil: p.soil_fertility ?? "—",
    zone: p.land_kebele ?? "—",
    lat: Number.NaN,
    lng: Number.NaN,
    tenure: humanize(p.land_ownership_type) || "—",
  };
}

/** A visit for the Visit history timeline. */
export function apiVisitToVisit(v: ApiFarmerVisit): Visit {
  const at = splitDateTime(v.completed_at ?? v.scheduled_at);
  return {
    title: `${v.visit_type} · ${v.physical_status}`,
    summary: v.outcome || `Visit ${v.name} by ${v.da_id}`,
    date: at.date,
    time: at.time,
  };
}
