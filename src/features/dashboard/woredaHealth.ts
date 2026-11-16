import { authRequest } from "@/features/auth";
import type { DateRange } from "./agentSummary";
import type { KebeleStatus } from "./supervisor";

// Supervisor programme health: GET /api/v1/da-services/dashboard/summary. The same route serves the DA home; the token's
// role picks the payload, and a Supervisor / Admin without da_id gets view "woreda".

/** The most kebeles the API returns in one page. A woreda has far fewer, so one page holds them all. */
const PAGE_LIMIT = 500;

interface WoredaSummaryResponse {
  view: string;
  woreda: { code: string; name: string | null };
  /** ISO datetime from the server. */
  updated_at: string | null;
  stats: { farmers: number; active_agents: number; data_quality: number; open_grievances: number };
  kebeles: {
    kebele: string;
    kebele_code: string;
    farmers: number;
    agents: number;
    visit_pct: number;
    /** ISO datetime; null before the kebele's first sync. */
    last_sync: string | null;
    status: KebeleStatus;
  }[];
  total: number;
}

export interface WoredaKebele {
  code: string;
  name: string;
  farmers: number;
  agents: number;
  visitPct: number;
  lastSync: string | null;
  status: KebeleStatus;
}

export interface WoredaProgrammeHealth {
  code: string;
  /** Falls back to the code when the backend has no display name. */
  name: string;
  updatedAt: string | null;
  /** Always the whole woreda, whatever the table is filtered to. */
  stats: { farmers: number; activeAgents: number; dataQuality: number; openGrievances: number };
  kebeles: WoredaKebele[];
  total: number;
}

/** Maps the API payload to the screen model; refuses a payload that is not the woreda view (e.g. a DA token's). */
export function toWoredaHealth(data: WoredaSummaryResponse): WoredaProgrammeHealth {
  if (data.view !== "woreda") throw new Error("This account has no woreda programme health view.");
  return {
    code: data.woreda.code,
    name: data.woreda.name || data.woreda.code,
    updatedAt: data.updated_at,
    stats: {
      farmers: data.stats.farmers,
      activeAgents: data.stats.active_agents,
      dataQuality: data.stats.data_quality,
      openGrievances: data.stats.open_grievances,
    },
    kebeles: data.kebeles.map((k) => ({
      code: k.kebele_code,
      name: k.kebele,
      farmers: k.farmers,
      agents: k.agents,
      visitPct: k.visit_pct,
      lastSync: k.last_sync,
      status: k.status,
    })),
    total: data.total,
  };
}

/** The table filters the summary API understands. Each takes one exact value; the woreda itself is read from the token. */
export interface WoredaFilters {
  /** Free text over kebele name and code, farmers, agents, visit %, status and last sync. */
  q?: string;
  /** A kebele code (not its display name). */
  kebele?: string;
  status?: KebeleStatus;
  /** Exact agent count on the row. */
  agents?: number;
}

/** The summary query string for a date range and the table filters; blank filters are left out. */
export function woredaHealthQuery({ from, to }: DateRange, filters: WoredaFilters = {}): URLSearchParams {
  const query = new URLSearchParams({ from, to, limit: String(PAGE_LIMIT) });
  const q = filters.q?.trim();
  if (q) query.set("q", q);
  if (filters.kebele) query.set("kebele", filters.kebele);
  if (filters.status) query.set("status", filters.status);
  if (filters.agents !== undefined) query.set("agents", String(filters.agents));
  return query;
}

/**
 * The signed-in Supervisor's woreda for a date range, with the table filtered by the server. The stats stay the
 * whole woreda whatever the filters say.
 */
export async function fetchWoredaHealth(range: DateRange, filters: WoredaFilters = {}): Promise<WoredaProgrammeHealth> {
  const res = await authRequest<{ data: WoredaSummaryResponse }>(`/da-services/dashboard/summary?${woredaHealthQuery(range, filters)}`);
  return toWoredaHealth(res.data);
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const pad = (n: number) => String(n).padStart(2, "0");

/** "15 Sep 2026" for an ISO datetime; null for no (or an unreadable) timestamp. */
export function formatDate(isoTimestamp: string | null): string | null {
  const d = isoTimestamp ? new Date(isoTimestamp) : null;
  return d && !Number.isNaN(d.getTime()) ? `${pad(d.getDate())} ${MONTHS[d.getMonth()]} ${d.getFullYear()}` : null;
}

/** "15 Sep 2026, 14:30" for an ISO datetime; null for no (or an unreadable) timestamp. */
export function formatDateTime(isoTimestamp: string | null): string | null {
  const date = formatDate(isoTimestamp);
  return date ? `${date}, ${pad(new Date(isoTimestamp as string).getHours())}:${pad(new Date(isoTimestamp as string).getMinutes())}` : null;
}
