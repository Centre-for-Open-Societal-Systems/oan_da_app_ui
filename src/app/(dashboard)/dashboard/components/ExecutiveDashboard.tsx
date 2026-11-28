"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { Banner } from "@/components/ui/Banner";
import { Pill } from "@/components/ui/Pill";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { AdvancedFiltersDrawer, type FilterFieldConfig, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { cn } from "@/lib/utils";
import { STATUS_TONE, type KebeleStatus } from "@/features/dashboard";
import { REGION_SUMMARY, REGION_WATCHLIST, WOREDA_ROLLUPS } from "@/features/dashboard";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { SearchInput } from "@/components/ui/SearchInput";
import { DateRangeDropdown } from "./DateRangeDropdown";
import { KpiTiles, KPI_RANGES } from "./KpiTiles";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { useAreaFilterOptions, withFieldOptions } from "@/features/geo";

const SEARCH_PLACEHOLDER = searchPlaceholder(["Woreda", "Farmers", "Kebeles", "Agents", "Visit coverage", "Data quality", "Grievances", "Status"]);

const STATUSES: KebeleStatus[] = ["On track", "Watch", "At risk"];
const STATUS_OPTIONS: FilterOption[] = STATUSES.map((s) => ({ value: s, label: s, count: WOREDA_ROLLUPS.filter((w) => w.status === s).length }));
const FILTER_FIELDS: FilterFieldConfig[] = [
  // Filled in by the component from the geo Master Data (useAreaFilterOptions).
  { key: "woreda", label: "Woreda", allLabel: "All woredas", placeholder: "All Woredas", options: [] },
  { key: "status", label: "Status", allLabel: "All statuses", placeholder: "All Statuses", options: STATUS_OPTIONS },
];

interface WoredaFilters extends FilterSelection {
  woreda: Set<string>;
  status: Set<string>;
}
const EMPTY: WoredaFilters = { woreda: new Set(), status: new Set() };

const BAR_COLOUR: Record<KebeleStatus, string> = { "On track": "bg-brand-green", Watch: "bg-orange-600", "At risk": "bg-danger" };
const PCT_COLOUR: Record<KebeleStatus, string> = { "On track": "text-brand-green", Watch: "text-orange-600", "At risk": "text-danger" };


// Executive (Regional) home: read-only regional roll-up with a woreda league table (FSD §2.4).
// The Executive has no write actions in Part 1 — every card links through to a read view.
export function ExecutiveDashboard() {
  const [range, setRange] = useState("Last 30 days");
  const r = REGION_SUMMARY;
  const [sortKey, setSortKey] = useState<"woreda" | "visitPct" | "dataQuality" | "openGrievances">("visitPct");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<WoredaFilters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  // Every Woreda of the user's own area from the geo Master Data, then those the rows hold.
  const woredaOptions = useAreaFilterOptions("woreda", WOREDA_ROLLUPS.map((w) => w.woreda));
  const filterFields = withFieldOptions(FILTER_FIELDS, { woreda: woredaOptions });

  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;
  const setFilter = (key: keyof WoredaFilters) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [key]: next }));

  const rows = WOREDA_ROLLUPS.filter(
    (w) =>
      (filters.woreda.size === 0 || filters.woreda.has(w.woreda)) &&
      (filters.status.size === 0 || filters.status.has(w.status)) &&
      matchesQuery(query, w),
  ).sort((a, b) => {
    if (sortKey === "woreda") return a.woreda.localeCompare(b.woreda);
    if (sortKey === "openGrievances") return b.openGrievances - a.openGrievances;
    return a[sortKey] - b[sortKey];
  });
  const { pageRows, paginationProps } = usePagination(rows);

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Header */}
      <Card className="relative z-50 flex w-full flex-col justify-between gap-4 px-4 py-5 shadow-card md:flex-row md:items-center">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink sm:text-[22px]">{r.region} Region — Programme Overview</h1>
          <p className="hidden mt-1.5 text-[14px] text-ink-soft">
            {r.woredas} woredas · {r.kebeles} kebeles · updated {r.updatedAt}
          </p>
        </div>
        <DateRangeDropdown ranges={KPI_RANGES} defaultValue="Last 30 days" onChange={setRange} />
      </Card>

      {/* Read-only notice */}
      <Banner tone="info" title="Regional view — read only">Figures roll up from the same kebele records supervisors see. Case actions stay with the woreda.</Banner>

      {/* KPI tiles, each from its own feature API */}
      <KpiTiles range={range} />

      {/* Woreda league table */}
      <Card className="overflow-hidden p-0 shadow-card">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
            <h2 className="text-[15px] font-semibold text-ink">Woreda comparison</h2>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[12.5px] text-muted">Sort by</span>
              {([
                ["visitPct", "Coverage"],
                ["dataQuality", "Data quality"],
                ["openGrievances", "Grievances"],
                ["woreda", "Name"],
              ] as const).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSortKey(key)}
                  aria-pressed={sortKey === key}
                  className={cn(
                    "rounded-md border px-2.5 py-1 text-[12.5px] font-medium transition-colors",
                    sortKey === key ? "border-brand-green bg-brand-mint text-brand-green" : "border-slate-200 text-slate-600 hover:bg-surface",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />

            <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[880px] border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-surface text-[14px] font-semibold text-slate-500">
                <th className="whitespace-nowrap px-4 py-3 font-semibold">
                  <FilterDropdown label="Woreda" allLabel="All woredas" options={woredaOptions} selected={filters.woreda} onApply={setFilter("woreda")} />
                </th>
                <th className="px-4 py-3 font-semibold">Farmers</th>
                <th className="px-4 py-3 text-center font-semibold">Kebeles</th>
                <th className="px-4 py-3 text-center font-semibold">Agents</th>
                <th className="px-4 py-3 font-semibold">Visit coverage</th>
                <th className="px-4 py-3 text-center font-semibold">Data quality</th>
                <th className="px-4 py-3 text-center font-semibold">Grievances</th>
                <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">
                  <FilterDropdown label="Status" allLabel="All statuses" options={STATUS_OPTIONS} selected={filters.status} onApply={setFilter("status")} />
                </th>
              </tr>
            </thead>
            <tbody className="text-[14px] text-slate-700">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6"><EmptyState title="No woredas match the selected filters" hint="Clear a filter or try a different search." /></td>
                </tr>
              )}
              {pageRows.map((w) => (
                <tr key={w.woreda} className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface">
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-ink">{w.woreda}</p>
                    <p className="mt-0.5 text-[12.5px] text-muted">
                      {w.atRisk > 0 ? `${w.atRisk} kebele${w.atRisk > 1 ? "s" : ""} at risk` : "No kebeles at risk"} · updated {w.updatedAt}
                    </p>
                  </td>
                  <td className="px-4 py-3.5">{w.farmers.toLocaleString()}</td>
                  <td className="px-4 py-3.5 text-center">{w.kebeles}</td>
                  <td className="px-4 py-3.5 text-center">{w.agents}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2">
                      <span className={cn("w-9 text-[13px] font-semibold", PCT_COLOUR[w.status])}>{w.visitPct}%</span>
                      <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200">
                        <span className={cn("block h-full rounded-full", BAR_COLOUR[w.status])} style={{ width: `${w.visitPct}%` }} />
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 text-center">{w.dataQuality}/100</td>
                  <td className="px-4 py-3.5 text-center">{w.openGrievances}</td>
                  <td className="px-4 py-3.5 text-right"><Pill tone={STATUS_TONE[w.status]}>{w.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {rows.length > 0 && <TablePagination {...paginationProps} itemLabel="woredas" />}

        <AdvancedFiltersDrawer
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          fields={filterFields}
          filters={filters}
          onApply={(next) =>
            setFilters({
              woreda: next.woreda ?? new Set(),
              status: next.status ?? new Set(),
            })
          }
        />
      </Card>

      {/* Watchlist + quick links */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="p-0 shadow-card lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
            <h2 className="text-[15px] font-semibold text-ink">Kebeles needing attention</h2>
            <span className="text-[12.5px] text-muted">{REGION_WATCHLIST.length} of {r.kebeles}</span>
          </div>
          <ul className="divide-y divide-line-soft">
            {REGION_WATCHLIST.slice(0, 6).map((k, i) => (
              <li key={`${k.woreda}-${k.kebele}-${i}`} className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-surface">
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-medium text-ink">{k.kebele}</p>
                  <p className="mt-0.5 text-[12.5px] text-muted">{k.woreda} · {k.farmers.toLocaleString()} farmers · {k.agents} agent{k.agents > 1 ? "s" : ""} · synced {k.lastSync}</p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className={cn("text-[13px] font-semibold", PCT_COLOUR[k.status])}>{k.visitPct}%</span>
                  <Pill tone={STATUS_TONE[k.status]}>{k.status}</Pill>
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card className="p-0 shadow-card">
          <div className="border-b border-line px-5 py-3.5">
            <h2 className="text-[15px] font-semibold text-ink">Go to</h2>
          </div>
          <ul className="divide-y divide-line-soft">
            {[
              { href: "/agents", title: "Agent registry", detail: "Regional DA roster and coverage" },
              { href: "/farmers", title: "Farmers", detail: "Registered farmer records" },
              // Reports (/admin/reports) is hidden for now; the page still opens by URL.
            ].map((l) => (
              <li key={l.href}>
                <Link href={l.href} className="flex items-center justify-between gap-3 px-5 py-4 transition-colors hover:bg-surface">
                  <div>
                    <p className="text-[14px] font-medium text-ink">{l.title}</p>
                    <p className="mt-0.5 text-[12.5px] text-muted">{l.detail}</p>
                  </div>
                  <svg className="h-4 w-4 shrink-0 text-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
