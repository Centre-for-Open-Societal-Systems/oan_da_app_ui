import { authRequest } from "@/features/auth";
import type { AgentAssignment, AgentAssignStatus, AssignmentStatus, AssociationMode, Geofence } from "./data";

/** One row of GET /api/v1/da-services/assignments (and the core of /assignments/me). */
export interface ApiAssignmentRow {
  da_id: string;
  agent: string;
  region: string | null;
  /** Woreda code, e.g. "ET04-W01". */
  woreda: string | null;
  /** Kebele code, e.g. "ET04-W01-K01"; null when the DA has none. */
  kebele: string | null;
  kebele_name: string | null;
  farmers: number | null;
  status: AgentAssignStatus;
  assignment_status: AssignmentStatus;
  assignment_id: string | null;
  /** ISO date. */
  effective_date: string | null;
  geofence: Geofence;
  geofence_reason: string | null;
  mode: AssociationMode | null;
  assigned_by: string | null;
  /** A pending out-of-bounds decision waiting for a supervisor. */
  flagged: { assignment_id: string; kebele: string; kebele_name: string | null; effective_date: string | null; reason: string | null } | null;
}

export interface AssignmentSummary {
  agents: number;
  unassigned: number;
  on_leave: number;
  flagged: number;
}

/** A Region / Zone / Woreda / Kebele from the administrative-area master. */
export interface AdminArea {
  code: string;
  level: "Region" | "Zone" | "Woreda" | "Kebele";
  parent_area: string | null;
  name_en: string;
  name_am: string | null;
}

export interface KebeleCoverage {
  kebele: string;
  kebele_name: string;
  woreda: string;
  agents: number;
  agent_ids: string[];
  farmers: number;
  /** Farmer Registry link pending; null until then. */
  households: number | null;
  coverage: "Full" | "Agent on leave" | "Flagged" | "Uncovered";
}

export interface CoverageResponse {
  woreda: string;
  kebeles: KebeleCoverage[];
  summary: { kebeles: number; full: number; uncovered: number; flagged: number; agent_on_leave: number };
}

/** One stored assignment decision (history rows, and the answer to an assign). */
export interface AssignmentRecord {
  name: string;
  da_id: string;
  kebele: string;
  /** Proposed / Validated / Flagged / Effective / Superseded. */
  state: AssignmentStatus;
  mode: AssociationMode;
  effective_date: string | null;
  reason: string | null;
  assigned_by: string | null;
  woreda: string | null;
  geofence_result: Geofence;
  geofence_reason: string | null;
}

export interface MyAssignment extends ApiAssignmentRow {
  history: AssignmentRecord[];
}

const query = (params: Record<string, string | number | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : "";
};

/**
 * GET /assignments: DAs of a Woreda with their Kebele posting. A Supervisor's own Woreda is used when `woreda`
 * is left out; an Admin without one gets every DA.
 */
export async function listAssignments(p: { woreda?: string; q?: string; limit?: number; start?: number } = {}): Promise<{ rows: ApiAssignmentRow[]; total: number; summary: AssignmentSummary }> {
  const res = await authRequest<{ data: ApiAssignmentRow[]; meta: { total: number; summary: AssignmentSummary } }>(`/da-services/assignments${query({ limit: 500, ...p })}`);
  return { rows: res.data, total: res.meta.total, summary: res.meta.summary };
}

/** GET /assignments/coverage: one tile per Kebele of the Woreda (a Supervisor's own when left out). */
export async function fetchCoverage(woreda?: string): Promise<CoverageResponse> {
  const res = await authRequest<{ data: CoverageResponse }>(`/da-services/assignments/coverage${query({ woreda })}`);
  return res.data;
}

/** GET /assignments/me: the signed-in DA's current Kebele and their assignment history. */
export async function fetchMyAssignment(): Promise<MyAssignment> {
  const res = await authRequest<{ data: MyAssignment }>("/da-services/assignments/me");
  return res.data;
}

/** GET /master/areas: administrative areas for dropdowns, by level and/or parent. */
export async function listAreas(p: { level?: AdminArea["level"]; parent?: string; q?: string } = {}): Promise<AdminArea[]> {
  const res = await authRequest<{ data: AdminArea[] }>(`/da-services/master/areas${query(p)}`);
  return res.data;
}

/** GET /master/kebeles: the Kebeles of one Woreda (code), for the assign form. */
export async function listKebeles(woreda: string): Promise<AdminArea[]> {
  const res = await authRequest<{ data: AdminArea[] }>(`/da-services/master/kebeles${query({ woreda })}`);
  return res.data;
}

export interface AssignRequest {
  da_id: string;
  /** Kebele code. */
  kebele: string;
  /** ISO date. */
  effective_date: string;
  reason: string;
  mode: AssociationMode;
  /** The DA's position for the geofence check; without it the result is "Not checked". */
  da_location?: { lat: number; lng: number };
  /** Same id on a retry returns the decision already made instead of a second one. */
  client_op_id: string;
}

/**
 * POST /assignments: assign or reassign a DA to a Kebele. In-boundary or unchecked → Effective (the prior
 * posting is Superseded); out-of-bounds → Flagged, not in force until a supervisor resolves it.
 */
export async function assignAgent(body: AssignRequest): Promise<AssignmentRecord> {
  const res = await authRequest<{ data: AssignmentRecord }>("/da-services/assignments", { method: "POST", body });
  return res.data;
}

/** "2026-10-20" → "20 Oct 2026"; "—" for none. */
export const formatAssignmentDate = (iso: string | null) =>
  iso ? new Date(`${iso.slice(0, 10)}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—";

/**
 * An API row in the table's shape. Kebele and Woreda show by name (`woredaNames` from the area master), and keep
 * their codes for the assign form.
 */
export function toAgentAssignment(r: ApiAssignmentRow, woredaNames: Record<string, string> = {}): AgentAssignment {
  return {
    daId: r.da_id,
    agent: r.agent,
    woreda: (r.woreda && woredaNames[r.woreda]) || r.woreda || "—",
    woredaCode: r.woreda ?? undefined,
    kebele: r.kebele ? (r.kebele_name ?? r.kebele) : null,
    kebeleCode: r.kebele ?? undefined,
    farmers: r.farmers ?? 0,
    status: r.status,
    assignmentStatus: r.assignment_status,
    effectiveDate: formatAssignmentDate(r.effective_date),
    geofence: r.geofence,
    geofenceReason: r.flagged?.reason ?? r.geofence_reason ?? undefined,
    mode: r.mode,
    assignedBy: r.assigned_by ?? undefined,
  };
}

/** Id for one device operation (client_op_id). randomUUID needs https or localhost; plain http falls back to time + random. */
export const newClientOpId = () => (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

// ---- Scope pickers (Users & Roles) ------------------------------------------------------------------------------

/** The Regions and Woredas of the area master, each sorted by English name, for the RBAC scope dropdowns. */
export interface ScopeAreas {
  regions: AdminArea[];
  woredas: AdminArea[];
}

const byName = (a: AdminArea, b: AdminArea) => a.name_en.localeCompare(b.name_en);

let scopeAreasCache: Promise<ScopeAreas> | null = null;

/**
 * Regions and Woredas in one go, loaded once per page load and shared by the Users table and its form. The
 * tree rarely changes (synced daily from Master Data), and a dropdown over ~1,400 Woredas is fine.
 */
export function loadScopeAreas(): Promise<ScopeAreas> {
  scopeAreasCache ??= Promise.all([listAreas({ level: "Region" }), listAreas({ level: "Woreda" })])
    .then(([regions, woredas]) => ({ regions: [...regions].sort(byName), woredas: [...woredas].sort(byName) }))
    .catch((err: unknown) => {
      scopeAreasCache = null;
      throw err;
    });
  return scopeAreasCache;
}

/**
 * The Woredas of one Region. P-codes nest by prefix (Region ET01 → Zone ET0101 → Woreda ET010101), and the
 * master only links a Woreda to its Zone, so the prefix is the way to go from a Region straight to its Woredas.
 */
export const woredasInRegion = (woredas: AdminArea[], regionCode: string): AdminArea[] =>
  regionCode ? woredas.filter((w) => w.code.startsWith(regionCode)) : [];

/** "Oromia (ET04)" for a known code; the value itself otherwise (older rows hold names); "—" for none. */
export function areaLabel(names: Record<string, string>, code: string | null | undefined): string {
  if (!code) return "—";
  const name = names[code];
  return name ? `${name} (${code})` : code;
}

/** code → English name, for showing stored scopes. */
export const areaNameMap = ({ regions, woredas }: ScopeAreas): Record<string, string> =>
  Object.fromEntries([...regions, ...woredas].map((a) => [a.code, a.name_en]));
