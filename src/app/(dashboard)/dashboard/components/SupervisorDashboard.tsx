"use client";

import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { StatCard } from "@/components/ui/StatCard";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { SearchInput } from "@/components/ui/SearchInput";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { AdvancedFiltersDrawer, type FilterFieldConfig } from "@/components/ui/AdvancedFiltersDrawer";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { cn } from "@/lib/utils";
import { fetchCoverage, loadScopeAreas, type CoverageResponse, type KebeleCoverage } from "@/features/assignments";
import { STATUS_TONE, fetchWoredaHealth, formatDate, formatDateTime, rangeFor, type KebeleStatus, type WoredaFilters, type WoredaProgrammeHealth } from "@/features/dashboard";
import { DateRangeDropdown } from "./DateRangeDropdown";

const STATUSES: KebeleStatus[] = ["On track", "Watch", "At risk"];
const COVERAGE_STATES: KebeleCoverage["coverage"][] = ["Full", "Agent on leave", "Flagged", "Uncovered"];
const COVERAGE_TONE: Record<KebeleCoverage["coverage"], PillTone> = { Full: "green", "Agent on leave": "amber", Flagged: "amber", Uncovered: "red" };
const BAR_COLOUR: Record<KebeleStatus, string> = { "On track": "bg-brand-green", Watch: "bg-orange-600", "At risk": "bg-danger" };
const TRACK_COLOUR: Record<KebeleStatus, string> = { "On track": "bg-green-100", Watch: "bg-yellow-100", "At risk": "bg-red-50" };
const PCT_COLOUR: Record<KebeleStatus, string> = { "On track": "text-brand-green", Watch: "text-orange-600", "At risk": "text-danger" };

const icon = (d: string) => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

// Ranges the summary API can be asked for; a custom range needs a date picker the header does not have yet.
const RANGES = ["Last 7 days", "Last 30 days", "Last 90 days", "This quarter", "This year"] as const;
const DEFAULT_RANGE = "Last 30 days";

// Placeholder while the first answer loads, so the cards keep their size.
const Pending = () => <span className="inline-block h-[22px] w-14 animate-pulse rounded bg-slate-200 align-middle" />;

const TH = "whitespace-nowrap px-4 py-3 font-semibold";
const SEARCH_PLACEHOLDER = searchPlaceholder(["Kebele", "Farmers", "Agents", "Visit %", "Last sync", "Status"]);

/** What a request answered, tagged with the request it was for so a stale answer is never shown as current. */
interface Answer<T> {
  key: string;
  data: T | null;
  error: string | null;
}

/** One table row: programme health (summary API) joined with coverage (assignments API) by kebele code. */
interface Row {
  code: string;
  name: string;
  farmers: number;
  agents: number;
  health: { visitPct: number; lastSync: string | null; status: KebeleStatus } | null;
  coverage: KebeleCoverage["coverage"] | null;
}

const message = (err: unknown) => (err instanceof Error ? err.message : "Please try again in a moment.");

/**
 * The table's rows. The summary answers first: it is the list the server filtered, and it supplies farmers, agents,
 * visit %, last sync and status, so a filter on any of them matches what is shown. Coverage only labels those rows.
 * If the summary failed, the coverage list stands in so the Supervisor still sees their kebeles.
 */
function joinRows(health: WoredaProgrammeHealth | null, coverage: CoverageResponse | null): Row[] {
  const cover = new Map((coverage?.kebeles ?? []).map((k) => [k.kebele, k]));
  if (health) {
    return health.kebeles.map((k) => ({
      code: k.code,
      name: k.name,
      farmers: k.farmers,
      agents: k.agents,
      health: { visitPct: k.visitPct, lastSync: k.lastSync, status: k.status },
      coverage: cover.get(k.code)?.coverage ?? null,
    }));
  }
  return (coverage?.kebeles ?? []).map((c) => ({ code: c.kebele, name: c.kebele_name || c.kebele, farmers: c.farmers ?? 0, agents: c.agents, health: null, coverage: c.coverage }));
}

/** The server takes one exact value per filter: a single pick goes to the API, anything else is left to the screen. */
const onlyOne = <T,>(set: Set<T>): T | undefined => (set.size === 1 ? [...set][0] : undefined);

// Supervisor home: programme health of their own woreda (GET /dashboard/summary: KPI tiles, visit %, last sync, status)
// next to kebele coverage (GET /assignments/coverage: linked farmers, agents, coverage). Role home varies, FSD §2.4 / §3.9.
export function SupervisorDashboard() {
  const [range, setRange] = useState<string>(DEFAULT_RANGE);
  // The last answer of each source; the screen keeps showing it while a newer request loads.
  const [healthAnswer, setHealthAnswer] = useState<Answer<WoredaProgrammeHealth> | null>(null);
  const [coverageAnswer, setCoverageAnswer] = useState<Answer<CoverageResponse> | null>(null);
  const [areaNames, setAreaNames] = useState<Map<string, string> | null>(null);
  // The kebeles of the last request that had no filters: the filter dropdowns list these, whatever the table shows now.
  const [baseline, setBaseline] = useState<WoredaProgrammeHealth["kebeles"] | null>(null);

  const [kebeleFilter, setKebeleFilter] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<Set<string>>(new Set());
  const [coverageFilter, setCoverageFilter] = useState<Set<string>>(new Set());
  const [agentsFilter, setAgentsFilter] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Typing should not send a request per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query.trim()), 350);
    return () => clearTimeout(timer);
  }, [query]);

  // A Supervisor has exactly one woreda, so none is named: the backend takes it from the token. Coverage is not part
  // of the summary API, so it is filtered on the screen only.
  const agentPick = onlyOne(agentsFilter);
  const kebelePick = onlyOne(kebeleFilter);
  const statusPick = onlyOne(statusFilter);
  const serverFilters = useMemo<WoredaFilters>(
    () => ({ q: debouncedQuery || undefined, kebele: kebelePick, status: statusPick as KebeleStatus | undefined, agents: agentPick === undefined ? undefined : Number(agentPick) }),
    [debouncedQuery, kebelePick, statusPick, agentPick],
  );
  const serverFiltered = Object.values(serverFilters).some((v) => v !== undefined);
  const healthKey = JSON.stringify([range, serverFilters]);
  const coverageKey = "";

  useEffect(() => {
    const dates = rangeFor(range);
    if (!dates) return;
    // A slower answer for a request the Supervisor has already moved away from must not overwrite the newer one.
    let current = true;
    fetchWoredaHealth(dates, serverFilters)
      .then((data) => {
        if (!current) return;
        setHealthAnswer({ key: healthKey, data, error: null });
        if (!serverFiltered) setBaseline(data.kebeles);
      })
      .catch((err: unknown) => current && setHealthAnswer((prev) => ({ key: healthKey, data: prev?.data ?? null, error: message(err) })));
    return () => {
      current = false;
    };
  }, [range, serverFilters, serverFiltered, healthKey]);

  useEffect(() => {
    let current = true;
    fetchCoverage()
      .then((data) => current && setCoverageAnswer({ key: coverageKey, data, error: null }))
      .catch((err: unknown) => current && setCoverageAnswer((prev) => ({ key: coverageKey, data: prev?.data ?? null, error: message(err) })));
    return () => {
      current = false;
    };
  }, [coverageKey]);

  // Display names are a nicety: without the area master the screen falls back to the codes.
  useEffect(() => {
    let current = true;
    loadScopeAreas()
      .then((areas) => current && setAreaNames(new Map((areas?.woredas ?? []).map((w) => [w.code, w.name_en]))))
      .catch(() => undefined);
    return () => {
      current = false;
    };
  }, []);

  const health = healthAnswer?.data ?? null;
  const coverage = coverageAnswer?.data ?? null;
  const healthLoading = healthAnswer?.key !== healthKey;
  const coverageLoading = coverageAnswer?.key !== coverageKey;
  const healthError = healthAnswer?.key === healthKey ? healthAnswer.error : null;
  const coverageError = coverageAnswer?.key === coverageKey ? coverageAnswer.error : null;
  // A failed load shows a dash instead of a placeholder that pulses forever.
  const placeholder = healthError ? "—" : <Pending />;

  const woredaCode = health?.code ?? coverage?.woreda ?? "";
  const woredaName = health?.name && health.name !== health.code ? health.name : areaNames?.get(woredaCode) ?? woredaCode;
  const woredaTitle = woredaName ? `${woredaName} Woreda` : "Your Woreda";

  const allRows = useMemo(() => joinRows(health, coverage), [health, coverage]);

  const optionRows = baseline ?? health?.kebeles ?? [];
  const kebeleOptions: FilterOption[] = optionRows.map((k) => ({ value: k.code, label: k.name, count: 1 }));
  const statusOptions: FilterOption[] = STATUSES.map((st) => ({ value: st, label: st, count: optionRows.filter((k) => k.status === st).length }));
  const coverageOptions: FilterOption[] = COVERAGE_STATES.map((st) => ({ value: st, label: st, count: (coverage?.kebeles ?? []).filter((k) => k.coverage === st).length }));
  const agentsOptions: FilterOption[] = [...new Set(optionRows.map((k) => k.agents))]
    .sort((x, y) => x - y)
    .map((n) => ({ value: String(n), label: `${n} ${n === 1 ? "agent" : "agents"}`, count: optionRows.filter((k) => k.agents === n).length }));

  const filterFields: FilterFieldConfig[] = [
    { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All Kebeles", options: kebeleOptions },
    { key: "status", label: "Status", allLabel: "All statuses", placeholder: "All Statuses", options: statusOptions },
    { key: "coverage", label: "Coverage", allLabel: "All coverage states", placeholder: "All Coverage States", options: coverageOptions },
    { key: "agents", label: "Agents", allLabel: "Any number of agents", placeholder: "Any Number Of Agents", options: agentsOptions },
  ];
  const activeFilterCount = [kebeleFilter, statusFilter, coverageFilter, agentsFilter].filter((set) => set.size > 0).length;

  // The server has already applied the search and any single pick. They are applied again here because a multi-pick
  // reaches the server as no filter at all, and Coverage is not a server filter. The search is only re-run on the
  // screen when the summary is missing, since the server matches on more than the shown text (e.g. the kebele code).
  const rows = useMemo(
    () =>
      allRows.filter(
        (r) =>
          (kebeleFilter.size === 0 || kebeleFilter.has(r.code)) &&
          (statusFilter.size === 0 || (r.health !== null && statusFilter.has(r.health.status))) &&
          (coverageFilter.size === 0 || (r.coverage !== null && coverageFilter.has(r.coverage))) &&
          (agentsFilter.size === 0 || agentsFilter.has(String(r.agents))) &&
          (health !== null || matchesQuery(query, { kebele: r.name, farmers: r.farmers, agents: r.agents, coverage: r.coverage })),
      ),
    [allRows, health, kebeleFilter, statusFilter, coverageFilter, agentsFilter, query],
  );

  const { pageRows, paginationProps } = usePagination(rows);
  const firstIndex = (paginationProps.page - 1) * paginationProps.pageSize;

  const loading = healthLoading && coverageLoading && allRows.length === 0;
  const hasFilter = serverFiltered || activeFilterCount > 0 || query.trim() !== "";
  const updated = formatDate(health?.updatedAt ?? null);
  const description =
    allRows.length > 0 || optionRows.length > 0
      ? `Kebele-level performance across ${optionRows.length || allRows.length} kebeles${coverage ? ` · ${coverage.summary.uncovered} uncovered` : ""}${updated ? ` · updated ${updated}` : ""}`
      : "Kebele-level performance across your woreda";

  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader
        title={`${woredaTitle} - Programme Health`}
        description={description}
        actions={<DateRangeDropdown ranges={RANGES} defaultValue={DEFAULT_RANGE} onChange={setRange} />}
      />

      {healthError && <ErrorAlert message={`Could not load programme health: ${healthError}`} />}
      {coverageError && <ErrorAlert message={`Could not load kebele coverage: ${coverageError}`} />}

      {/* Live strip */}
      <div role="status" className="flex items-center gap-2.5 rounded-lg border border-brand-border bg-brand-mint px-4 py-2.5 text-[13px] text-ink-soft">
        <span className="h-2 w-2 shrink-0 rounded-full bg-brand-green" aria-hidden="true" />
        <p>
          <span className="font-semibold text-ink">Live:</span> Programme health metrics are updated in real-time from field agent submissions across all kebeles in {woredaName || "your woreda"}.
        </p>
      </div>

      {/* KPI tiles: always the whole woreda, whatever the table is filtered to */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Farmer registered" value={health ? health.stats.farmers.toLocaleString() : placeholder} accent="border-l-blue-600" tile="bg-blue-50 text-blue-600" icon={icon("M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z")} />
        <StatCard label="Active agents" value={health ? String(health.stats.activeAgents) : placeholder} accent="border-l-violet-600" tile="bg-violet-50 text-violet-600" icon={icon("M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0")} />
        <StatCard label="Avg. data quality" value={health ? `${health.stats.dataQuality}/100` : placeholder} accent="border-l-brand-green" tile="bg-brand-tint text-brand-green" icon={icon("M22 7l-8.5 8.5-5-5L2 17M16 7h6v6")} />
        <StatCard label="Open grievances" value={health ? String(health.stats.openGrievances) : placeholder} accent="border-l-danger" tile="bg-danger-wash text-danger" icon={icon("M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01")} />
      </div>

      {/* Kebele breakdown */}
      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-[16px] font-semibold text-ink">Kebele breakdown - {woredaTitle}</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />
            <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
          </div>
        </div>
        <div className={cn("overflow-x-auto transition-opacity", healthLoading && health && "opacity-60")} aria-busy={healthLoading}>
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-surface text-[14px] font-semibold text-slate-500">
                <th className={cn(TH, "w-16 text-center")}>S.No.</th>
                <th className={TH}><FilterDropdown label="KEBELE" allLabel="All kebeles" options={kebeleOptions} selected={kebeleFilter} onApply={setKebeleFilter} /></th>
                <th className={cn(TH, "text-center")}>Linked farmers</th>
                <th className={cn(TH, "text-center")}>Agents</th>
                <th className={TH}>Visit %</th>
                <th className={cn(TH, "text-center")}>Last sync</th>
                <th className={cn(TH, "text-center")}><FilterDropdown label="STATUS" allLabel="All statuses" options={statusOptions} selected={statusFilter} onApply={setStatusFilter} /></th>
                <th className={cn(TH, "text-center")}><FilterDropdown label="COVERAGE" allLabel="All coverage states" options={coverageOptions} selected={coverageFilter} onApply={setCoverageFilter} /></th>
              </tr>
            </thead>
            <tbody className="text-[14px] text-slate-700">
              {loading && (
                <tr><td colSpan={8} className="px-4 py-8 text-center text-[13.5px] text-muted">Loading kebeles…</td></tr>
              )}
              {!loading && allRows.length === 0 && !hasFilter && !healthError && !coverageError && (
                <tr><td colSpan={8} className="px-4 py-6"><EmptyState title="No kebeles in your Woreda yet" hint="Kebeles appear here once the area master lists them." /></td></tr>
              )}
              {!loading && rows.length === 0 && hasFilter && (
                <tr><td colSpan={8} className="px-4 py-6"><EmptyState title="No kebeles match the selected filters" hint="Clear a filter or try a different search." /></td></tr>
              )}
              {pageRows.map((r, i) => (
                <tr key={r.code} className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-center">{firstIndex + i + 1}</td>
                  <td className="px-4 py-3 text-ink">{r.name}</td>
                  <td className="px-4 py-3 text-center">{r.farmers.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">{r.agents}</td>
                  <td className="px-4 py-3">
                    {r.health ? (
                      <div className="flex items-center gap-3">
                        <div className={cn("h-2 w-28 overflow-hidden rounded-full", TRACK_COLOUR[r.health.status])}>
                          <div className={cn("h-full rounded-full", BAR_COLOUR[r.health.status])} style={{ width: `${r.health.visitPct}%` }} />
                        </div>
                        <span className={cn("text-[13px] font-semibold", PCT_COLOUR[r.health.status])}>{r.health.visitPct}%</span>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-center">{formatDateTime(r.health?.lastSync ?? null) ?? "—"}</td>
                  <td className="px-4 py-3 text-center">{r.health ? <Pill tone={STATUS_TONE[r.health.status]}>{r.health.status}</Pill> : "—"}</td>
                  <td className="px-4 py-3 text-center">{r.coverage ? <Pill tone={COVERAGE_TONE[r.coverage] ?? "slate"}>{r.coverage}</Pill> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && <TablePagination {...paginationProps} itemLabel="Kebeles" />}

        <AdvancedFiltersDrawer
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          fields={filterFields}
          filters={{ kebele: kebeleFilter, status: statusFilter, coverage: coverageFilter, agents: agentsFilter }}
          onApply={(next) => {
            setKebeleFilter(next.kebele ?? new Set());
            setStatusFilter(next.status ?? new Set());
            setCoverageFilter(next.coverage ?? new Set());
            setAgentsFilter(next.agents ?? new Set());
          }}
        />
      </Card>
    </div>
  );
}
