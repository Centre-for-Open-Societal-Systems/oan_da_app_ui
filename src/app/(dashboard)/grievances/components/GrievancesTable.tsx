"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowAction } from "@/components/ui/RowAction";
import { AdvancedFiltersDrawer, type FilterFieldConfig, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { TablePagination } from "@/components/ui/TablePagination";
import { fetchGrievanceSummary, GRIEVANCE_PAGE_MAX, listGrievances, toGrievance, type GrievanceSummaryCard } from "@/features/grievances";
import { GrievanceStatusPill } from "@/features/grievances";
import { GrievanceDetailModal } from "@/features/grievances";
import type { Grievance } from "@/features/grievances";
import { GrievanceStats, type GrievanceStatCard } from "./GrievanceStats";
import { RaiseGrievanceButton } from "./RaiseGrievanceButton";
import { ServiceStatusBanner } from "./ServiceStatusBanner";
import { matchesQuery, searchPlaceholder } from "@/lib/search";

const SEARCH_PLACEHOLDER = searchPlaceholder(["Ticket ID", "Details", "Category", "Status", "Location"]);

interface Filters extends FilterSelection {
  category: Set<string>;
  status: Set<string>;
  location: Set<string>;
}

const EMPTY: Filters = { category: new Set(), status: new Set(), location: new Set() };

/** Count by key over a list → filter-dropdown options (value = label). */
function toOptions(values: string[]): FilterOption[] {
  const counts = new Map<string, number>();
  for (const v of values) if (v) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([value, count]) => ({ value, label: value, count }));
}

type Loaded = { reload: number; rows: Grievance[]; total: number; cards: GrievanceSummaryCard[]; error: string | null; at: Date };

export function GrievancesTable() {
  // GET /grievances is scoped by DA Services: a DA gets their own tickets, a Supervisor their Woreda's.
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let current = true;
    // One page at the API's maximum; the table searches, filters and pages it here. Stat cards come from the
    // summary endpoint (whole-dataset counts), falling back to the fetched page's counts if that call fails.
    Promise.all([listGrievances({ page: 1, pageSize: GRIEVANCE_PAGE_MAX }), fetchGrievanceSummary().catch(() => [] as GrievanceSummaryCard[])])
      .then(([list, cards]) => current && setLoaded({ reload, rows: list.items.map(toGrievance), total: list.total, cards, error: null, at: new Date() }))
      .catch((err: unknown) => current && setLoaded((prev) => ({ reload, rows: prev?.rows ?? [], total: prev?.total ?? 0, cards: prev?.cards ?? [], error: err instanceof Error ? err.message : "Could not load grievances.", at: new Date() })));
    return () => {
      current = false;
    };
  }, [reload]);

  const loading = loaded?.reload !== reload;
  const all = loaded?.rows ?? [];
  const refresh = () => setReload((r) => r + 1);

  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [query, setQuery] = useState("");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [selected, setSelected] = useState<Grievance | null>(null);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;

  const setFilter = (key: keyof Filters) => (next: Set<string>) => {
    setFilters((prev) => ({ ...prev, [key]: next }));
    setPage(1);
  };

  // Filter options: statuses from the summary cards (the service's own vocabulary); category / location from rows.
  const categoryOptions = toOptions(all.map((g) => g.category));
  const locationOptions = toOptions(all.map((g) => g.location ?? "").filter(Boolean));
  const statusOptions: FilterOption[] = (loaded?.cards ?? [])
    .filter((c) => c.status !== "All")
    .map((c) => ({ value: c.status, label: c.label, count: c.count }));
  const filterFields: FilterFieldConfig[] = [
    { key: "category", label: "Category", allLabel: "All categories", placeholder: "All Categories", options: categoryOptions },
    ...(statusOptions.length > 0 ? [{ key: "status", label: "Status", allLabel: "All statuses", placeholder: "All Statuses", options: statusOptions }] : []),
    ...(locationOptions.length > 0 ? [{ key: "location", label: "Location", allLabel: "All locations", placeholder: "All Locations", options: locationOptions }] : []),
  ];

  // Every filter except status: so each stat card's number matches the table once that status is picked.
  const scoped = all.filter(
    (g) =>
      (filters.category.size === 0 || filters.category.has(g.category)) &&
      (filters.location.size === 0 || filters.location.has(g.location ?? "")) &&
      matchesQuery(query, g),
  );
  const rows = scoped.filter((g) => filters.status.size === 0 || filters.status.has(g.status));

  // Cards: the summary endpoint when it answered, else counts of the fetched rows with a leading "All".
  const cards: GrievanceStatCard[] =
    (loaded?.cards ?? []).length > 0
      ? (loaded?.cards ?? []).map((c) => ({ status: c.status, label: c.label, count: c.count }))
      : [{ status: "All", label: "All", count: all.length }, ...toOptions(all.map((g) => g.status)).map((o) => ({ status: o.value, label: o.label, count: o.count ?? 0 }))];
  const activeCard = filters.status.size === 1 ? [...filters.status][0] : "All";

  const totalPages = Math.max(1, Math.ceil(rows.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const pageRows = rows.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <>
      <PageHeader
        title="Grievances"
        description="Raise and track grievances for yourself or on behalf of a farmer. Triage and resolution happen in the external Grievance Service - this surface is read-only for case handling."
        actions={<RaiseGrievanceButton onSubmitted={refresh} className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md bg-brand-green px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-green-dark" />}
      />
      <ServiceStatusBanner loading={loading} error={loaded?.error ?? null} lastLoaded={loaded?.at ?? null} total={loaded?.total ?? 0} shown={all.length} onRetry={refresh} />
      <GrievanceStats
        cards={cards}
        active={activeCard}
        onSelect={(status) => setFilter("status")(status === "All" ? new Set() : new Set([status]))}
      />

      <Card className="overflow-hidden p-0 shadow-card">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">All Grievances</h2>
            <p className="mt-0.5 text-[13px] text-ink-soft">Track and manage all reported grievances.</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <SearchInput value={query} onChange={(value) => { setQuery(value); setPage(1); }} placeholder={SEARCH_PLACEHOLDER} />
            <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] table-fixed border-collapse text-left">
            <colgroup>
              <col className="w-[190px]" />
              <col />
              <col className="w-[150px]" />
              <col className="w-[180px]" />
              <col className="w-[150px]" />
              <col className="w-[150px]" />
              <col className="w-[110px]" />
            </colgroup>
            <thead>
              <tr className="border-y border-line bg-surface text-[14px] font-semibold text-slate-500">
                <th className="whitespace-nowrap px-4 py-3 font-semibold">Ticket ID</th>
                <th className="px-4 py-3 font-semibold">Details</th>
                <th className="px-4 py-3 font-semibold">
                  <FilterDropdown label="Category" allLabel="All categories" options={categoryOptions} selected={filters.category} onApply={setFilter("category")} />
                </th>
                <th className="px-4 py-3 font-semibold">Location</th>
                <th className="px-4 py-3 font-semibold">Submitted</th>
                <th className="px-4 py-3 font-semibold">
                  <FilterDropdown label="Status" allLabel="All statuses" options={statusOptions} selected={filters.status} onApply={setFilter("status")} />
                </th>
                <th className="px-4 py-3 text-center font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="text-[14px] text-slate-700">
              {loading && all.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-[13.5px] text-muted">Loading grievances…</td>
                </tr>
              )}
              {!loading && pageRows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6">
                    {all.length === 0 ? (
                      <EmptyState title={loaded?.error ? "Could not load grievances" : "No grievances yet"} hint={loaded?.error ?? "Grievances you raise show up here."} tone={loaded?.error ? "error" : "muted"} />
                    ) : (
                      <EmptyState title="No grievances match the selected filters" hint="Clear a filter or try a different search." />
                    )}
                  </td>
                </tr>
              )}
              {pageRows.map((g) => (
                <tr key={g.ticketId} className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface">
                  <td className="whitespace-nowrap px-3 py-4 text-[13px] font-semibold text-ink">{g.ticketId}</td>
                  <td className="px-4 py-4">
                    <p className="truncate text-[14.5px] font-semibold text-ink" title={g.title}>{g.title}</p>
                    {g.submitter && <p className="mt-1 truncate text-[13px] text-muted" title={g.submitter}>{g.submitter}</p>}
                    {g.type && <p className="mt-0.5 text-[13px] text-muted">{g.type}</p>}
                  </td>
                  <td className="px-4 py-4 text-[13.5px]">{g.category || "-"}</td>
                  <td className="px-4 py-4 text-[13px] leading-snug text-slate-700">{g.location || <span className="text-muted">-</span>}</td>
                  <td className="whitespace-nowrap px-4 py-4 text-[13px] leading-snug text-slate-700">
                    {g.submittedAt.split(", ").slice(0, 2).join(", ")},
                    <br />
                    {g.submittedAt.split(", ")[2]}
                  </td>
                  <td className="px-4 py-4">
                    <GrievanceStatusPill status={g.status} />
                  </td>
                  <td className="px-4 py-4 text-center">
                    <RowAction onClick={() => setSelected(g)} icon="view">View</RowAction>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination
          itemLabel="grievances"
          page={currentPage}
          pageSize={pageSize}
          total={rows.length}
          onPageChange={setPage}
          onPageSizeChange={(size) => { setPageSize(size); setPage(1); }}
        />
      </Card>

      <AdvancedFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        fields={filterFields}
        filters={filters}
        onApply={(next) => {
          setFilters({
            category: next.category ?? new Set(),
            status: next.status ?? new Set(),
            location: next.location ?? new Set(),
          });
          setPage(1);
        }}
      />

      {selected && <GrievanceDetailModal key={selected.ticketId} grievance={selected} onClose={() => setSelected(null)} />}
    </>
  );
}
