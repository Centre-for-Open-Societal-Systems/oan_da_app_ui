import { listVisits } from "@/features/visits";
import { fetchGrievanceSummary } from "@/features/grievances";
import { listAgents } from "@/features/agents";
import { listFarmers } from "@/features/farmers";
import type { DateRange } from "./agentSummary";

// Dashboard KPI tiles, one feature API per tile (not GET /dashboard/summary). See the backend's
// "Dashboard tiles — per-feature APIs" doc. Follow Ups Completed and Advisories Completed have no API yet.

export type KpiKey = "visitsCompleted" | "followUpsCompleted" | "advisoriesCompleted" | "raisedGrievances" | "agents" | "farmers";

/** The tiles each role sees, in order. DA has no Agents / Farmers tile. */
export function kpiTilesFor(role: string | null | undefined): KpiKey[] {
  const shared: KpiKey[] = ["visitsCompleted", "followUpsCompleted", "advisoriesCompleted", "raisedGrievances"];
  return role === "Supervisor" || role === "Executive" || role === "Admin" ? [...shared, "agents", "farmers"] : shared;
}

/** A number, null when the tile has no API yet, or the error text when the call failed. */
export type KpiValue = { value: number | null; error?: string };

const message = (err: unknown) => (err instanceof Error ? err.message : "Could not load");

/** The "All" card of /grievances/summary; without one, the sum of the status cards. */
export async function fetchRaisedGrievances(): Promise<number> {
  const cards = await fetchGrievanceSummary();
  const all = cards.find((c) => c.status === "All");
  return all ? all.count : cards.reduce((sum, c) => sum + (c.count || 0), 0);
}

const FETCHERS: Record<KpiKey, ((range: DateRange) => Promise<number>) | null> = {
  // GET /visits?status=Completed&from&to → meta.total
  visitsCompleted: async ({ from, to }) => (await listVisits({ status: "Completed", from, to, limit: 1 })).total,
  // No public tasks count yet (Done DA Tasks with task_type Follow-up).
  followUpsCompleted: null,
  // No advisories summary yet; /reports/activity is one DA and one week only.
  advisoriesCompleted: null,
  // GET /grievances/summary; not date-ranged.
  raisedGrievances: () => fetchRaisedGrievances(),
  // GET /agents → data.total (DA Registry today; moves to the DA Hierarchy API when it ships).
  agents: async () => (await listAgents({ limit: 1 })).total,
  // GET /farmers → meta.number_of_items, same number as the farmers screen.
  farmers: async () => (await listFarmers({ pageSize: 1 })).total,
};

/** Reads every tile in `keys` at once; one failing call only marks its own tile. */
export async function fetchKpis(keys: KpiKey[], range: DateRange): Promise<Record<KpiKey, KpiValue>> {
  const results = await Promise.allSettled(keys.map((k) => (FETCHERS[k] ? FETCHERS[k](range) : Promise.resolve(null))));
  const out = {} as Record<KpiKey, KpiValue>;
  keys.forEach((k, i) => {
    const r = results[i];
    out[k] = r.status === "fulfilled" ? { value: r.value } : { value: null, error: message(r.reason) };
  });
  return out;
}
