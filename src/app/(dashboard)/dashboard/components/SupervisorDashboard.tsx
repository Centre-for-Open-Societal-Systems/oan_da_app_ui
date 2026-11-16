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

const COVERAGE_STATES: KebeleCoverage["coverage"][] = ["Full", "Agent on leave", "Flagged", "Uncovered"];
const COVERAGE_TONE: Record<KebeleCoverage["coverage"], PillTone> = { Full: "green", "Agent on leave": "amber", Flagged: "amber", Uncovered: "red" };

const icon = (d: string) => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const TH = "whitespace-nowrap px-4 py-3 font-semibold";
const SEARCH_PLACEHOLDER = searchPlaceholder(["Kebele", "Farmers", "Agents", "Coverage"]);

interface Loaded {
  coverage: CoverageResponse | null;
  woredaName: string | null;
  error: string | null;
}

// Supervisor home: the Kebeles of their own Woreda with agents, linked farmers and coverage, from
// GET /assignments/coverage (the backend picks the Supervisor's Woreda). Names come from the area master.
export function SupervisorDashboard() {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [kebeleFilter, setKebeleFilter] = useState<Set<string>>(new Set());
  const [coverageFilter, setCoverageFilter] = useState<Set<string>>(new Set());
  const [agentsFilter, setAgentsFilter] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    let current = true;
    fetchCoverage()
      .then(async (coverage) => {
        // The Woreda's name is a nicety: without the area master the heading falls back to the code.
        const names = await loadScopeAreas().catch(() => null);
        const woredaName = names?.woredas.find((w) => w.code === coverage.woreda)?.name_en ?? null;
        if (current) setLoaded({ coverage, woredaName, error: null });
      })
      .catch((err: unknown) => current && setLoaded({ coverage: null, woredaName: null, error: err instanceof Error ? err.message : "Could not load the kebele breakdown." }));
    return () => {
      current = false;
    };
  }, []);

  const kebeles = useMemo(() => loaded?.coverage?.kebeles ?? [], [loaded]);
  const woreda = loaded?.woredaName ?? loaded?.coverage?.woreda ?? "";
  const woredaTitle = woreda ? `${woreda} Woreda` : "Your Woreda";

  const kebeleOptions: FilterOption[] = kebeles.map((k) => ({ value: k.kebele, label: k.kebele_name || k.kebele, count: 1 }));
  const coverageOptions: FilterOption[] = COVERAGE_STATES.map((s) => ({ value: s, label: s, count: kebeles.filter((k) => k.coverage === s).length }));
  const agentsOptions: FilterOption[] = [...new Set(kebeles.map((k) => k.agents))]
    .sort((a, b) => a - b)
    .map((n) => ({ value: String(n), label: `${n} ${n === 1 ? "agent" : "agents"}`, count: kebeles.filter((k) => k.agents === n).length }));

  const filterFields: FilterFieldConfig[] = [
    { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All Kebeles", options: kebeleOptions },
    { key: "coverage", label: "Coverage", allLabel: "All coverage states", placeholder: "All Coverage States", options: coverageOptions },
    { key: "agents", label: "Agents", allLabel: "Any number of agents", placeholder: "Any Number Of Agents", options: agentsOptions },
  ];
  const activeFilterCount = [kebeleFilter, coverageFilter, agentsFilter].filter((set) => set.size > 0).length;

  const rows = useMemo(
    () =>
      kebeles.filter(
        (k) =>
          (kebeleFilter.size === 0 || kebeleFilter.has(k.kebele)) &&
          (coverageFilter.size === 0 || coverageFilter.has(k.coverage)) &&
          (agentsFilter.size === 0 || agentsFilter.has(String(k.agents))) &&
          matchesQuery(query, { kebele: k.kebele_name, farmers: k.farmers, agents: k.agents, coverage: k.coverage }),
      ),
    [kebeles, kebeleFilter, coverageFilter, agentsFilter, query],
  );

  const { pageRows, paginationProps } = usePagination(rows);
  const firstIndex = (paginationProps.page - 1) * paginationProps.pageSize;

  const summary = loaded?.coverage?.summary;
  const totalFarmers = kebeles.reduce((sum, k) => sum + (k.farmers ?? 0), 0);
  const totalAgents = kebeles.reduce((sum, k) => sum + k.agents, 0);
  const tile = (n: number | undefined) => (loaded === null ? "…" : n === undefined ? "—" : n.toLocaleString());

  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader title={`${woredaTitle} - Programme Health`} description={summary ? `Kebele coverage across ${summary.kebeles} kebeles` : "Kebele coverage of your Woreda"} />

      {loaded?.error && <ErrorAlert message={loaded.error} />}

      {/* KPI tiles, all from the coverage summary */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Kebeles" value={tile(summary?.kebeles)} accent="border-l-blue-600" tile="bg-blue-50 text-blue-600" icon={icon("M17.657 16.657L13.414 20.9a2 2 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0zM15 11a3 3 0 11-6 0 3 3 0 016 0z")} />
        <StatCard label="Linked farmers" value={tile(loaded?.coverage ? totalFarmers : undefined)} accent="border-l-brand-green" tile="bg-brand-tint text-brand-green" icon={icon("M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z")} />
        <StatCard label="Posted agents" value={tile(loaded?.coverage ? totalAgents : undefined)} accent="border-l-violet-600" tile="bg-violet-50 text-violet-600" icon={icon("M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0")} />
        <StatCard label="Uncovered kebeles" value={tile(summary?.uncovered)} accent="border-l-danger" tile="bg-danger-wash text-danger" icon={icon("M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01")} />
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
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px] border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-surface text-[14px] font-semibold text-slate-500">
                <th className={cn(TH, "w-16 text-center")}>S.No.</th>
                <th className={TH}><FilterDropdown label="KEBELE" allLabel="All kebeles" options={kebeleOptions} selected={kebeleFilter} onApply={setKebeleFilter} /></th>
                <th className={cn(TH, "text-center")}>Linked farmers</th>
                <th className={cn(TH, "text-center")}>Agents</th>
                <th className={cn(TH, "text-center")}><FilterDropdown label="COVERAGE" allLabel="All coverage states" options={coverageOptions} selected={coverageFilter} onApply={setCoverageFilter} /></th>
              </tr>
            </thead>
            <tbody className="text-[14px] text-slate-700">
              {loaded === null && (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-[13.5px] text-muted">Loading kebeles…</td></tr>
              )}
              {loaded && !loaded.error && kebeles.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6"><EmptyState title="No kebeles in your Woreda yet" hint="Kebeles appear here once the area master lists them." /></td></tr>
              )}
              {kebeles.length > 0 && rows.length === 0 && (
                <tr><td colSpan={5} className="px-4 py-6"><EmptyState title="No kebeles match the selected filters" hint="Clear a filter or try a different search." /></td></tr>
              )}
              {pageRows.map((k, i) => (
                <tr key={k.kebele} className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface">
                  <td className="px-4 py-3 text-center">{firstIndex + i + 1}</td>
                  <td className="px-4 py-3 text-ink">{k.kebele_name || k.kebele}</td>
                  <td className="px-4 py-3 text-center">{(k.farmers ?? 0).toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">{k.agents}</td>
                  <td className="px-4 py-3 text-center"><Pill tone={COVERAGE_TONE[k.coverage] ?? "slate"}>{k.coverage}</Pill></td>
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
          filters={{ kebele: kebeleFilter, coverage: coverageFilter, agents: agentsFilter }}
          onApply={(next) => {
            setKebeleFilter(next.kebele ?? new Set());
            setCoverageFilter(next.coverage ?? new Set());
            setAgentsFilter(next.agents ?? new Set());
          }}
        />
      </Card>
    </div>
  );
}
