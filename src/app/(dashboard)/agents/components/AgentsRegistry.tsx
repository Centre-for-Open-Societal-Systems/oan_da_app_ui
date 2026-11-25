"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { RowAction } from "@/components/ui/RowAction";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { Switch } from "@/components/ui/Switch";
import { Banner } from "@/components/ui/Banner";
import { ExportButton } from "@/components/ui/ExportButton";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { AdvancedFiltersDrawer, type FilterFieldConfig, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { PAGE_SIZES, TablePagination } from "@/components/ui/TablePagination";
import { useAuthStore } from "@/store/useAuthStore";
import { ACTIVE_TONE, APPROVAL_TONE, BulkImportsPanel, apiAgentToAgent, describeAgentError, importStatusLabel, listMyTeam, type Agent, type AgentFacets, type AgentFilterField, type AgentFilters, type AgentImport, type TeamScope } from "@/features/agents";
import { searchPlaceholder } from "@/lib/search";
import { fileDate, type CsvColumn } from "@/lib/download";
import { downloadTable, formatLabel } from "@/lib/export";
import { ImportAgentsModal } from "./ImportAgentsModal";

const SEARCH_DEBOUNCE_MS = 400;
const UNASSIGNED = "—";

// The registry columns in table order — used by Export.
const CSV_COLUMNS: CsvColumn<Agent>[] = [
  { header: "DA-ID", value: (a) => a.daId },
  { header: "Full Name", value: (a) => a.fullName },
  { header: "Fayda ID", value: (a) => a.faydaId },
  { header: "Active Status", value: (a) => a.activeStatus },
  { header: "Education Tier", value: (a) => a.educationTier },
  { header: "Assigned Kebele", value: (a) => (a.kebele === UNASSIGNED ? "Unassigned" : a.kebele) },
  { header: "Woreda", value: (a) => a.woreda },
  { header: "Farmer Count", value: (a) => a.farmerCount },
  { header: "Approval Status", value: (a) => a.approvalStatus },
  { header: "Last Updated", value: (a) => a.updatedAt },
];

const importNotice = (imported: AgentImport) =>
  `${imported.file_name ?? "The file"} was handed to the DA Registry (${imported.rows ?? "?"} agents, ${importStatusLabel(imported.status).toLowerCase()}${imported.registry_import_id ? `, registry import ${imported.registry_import_id}` : ""}). Rows it accepts wait for its two-stage approval; rows it refuses appear under Import exceptions.`;

// The backend searches DA-ID and name and applies every filter, so filters reach every page, not just this one.
const SEARCH_PLACEHOLDER = searchPlaceholder(["DA-ID", "Full Name"]);

interface Filters extends FilterSelection {
  region: Set<string>;
  woreda: Set<string>;
  kebele: Set<string>;
  active: Set<string>;
  tier: Set<string>;
  fayda: Set<string>;
  approval: Set<string>;
}
const EMPTY: Filters = { region: new Set(), woreda: new Set(), kebele: new Set(), active: new Set(), tier: new Set(), fayda: new Set(), approval: new Set() };
// The API field each filter sends.
const FIELD: Record<keyof Filters, AgentFilterField> = {
  region: "region",
  woreda: "woreda",
  kebele: "kebele",
  active: "active_status",
  tier: "education_tier",
  fayda: "fayda_status",
  approval: "approval_status",
};
// Picking a Region resets the Woredas and Kebeles under it; picking a Woreda resets the Kebeles.
const DEPENDENTS: Partial<Record<keyof Filters, (keyof Filters)[]>> = { region: ["woreda", "kebele"], woreda: ["kebele"] };

const toApiFilters = (filters: Filters): AgentFilters =>
  Object.fromEntries((Object.keys(FIELD) as (keyof Filters)[]).map((key) => [FIELD[key], [...filters[key]].sort()]));

/** A filter's options from the facets; a chosen value the facets no longer list stays, with a count of 0. */
const optionsFor = (facets: AgentFacets, key: keyof Filters, selected: Set<string>): FilterOption[] => {
  const options: FilterOption[] = (facets[FIELD[key]] ?? []).map(({ value, label, count }) => ({ value, label, count }));
  for (const value of selected) if (!options.some((o) => o.value === value)) options.push({ value, label: value, count: 0 });
  return options;
};

// "14 Sep 2026, 09:12" → ["14 Sep 2026,", "09:12 AM"] for the two-line Last Updated cell.
const splitStamp = (stamp: string): [string, string] => {
  const [date, time = ""] = stamp.split(", ");
  const [h, m] = time.split(":").map(Number);
  if (!time || Number.isNaN(h) || Number.isNaN(m)) return [date, time];
  return [`${date},`, `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`];
};

// FR-02 §3.2.1–3.2.2: 11 literal columns, combinable/resettable filters, search by DA-ID or name. Rows come from
// the DA Registry through GET /da-services/agents/my-team, scoped by role on the backend (Admin: every DA, Executive:
// their Region, Supervisor: their Woreda). Search, filters and paging run on the server; the filter menus list the
// backend's facets, counted over the whole team.
export function AgentsRegistry() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const canEdit = role === "Supervisor" || role === "Admin";
  // Bulk import needs the registry's Intake Officer role, which only the OAN Administrator holds.
  const canImport = role === "Admin";
  const [query, setQuery] = useState("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[PAGE_SIZES.length - 1]);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; rows: Agent[]; total: number; error: string | null } | null>(null);
  // The last facets the backend sent; kept while the next page loads so the filter menus do not empty.
  const [facets, setFacets] = useState<AgentFacets>({});
  // The team scope the backend chose for the signed-in role; "all" until the first answer.
  const [scope, setScope] = useState<TeamScope>("all");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  /** Bumped after each import so the imports and exceptions panels below reload. */
  const [importsVersion, setImportsVersion] = useState(0);
  // Registry access switched off from the Action column (kept in memory until the API exists).
  const [disabledIds, setDisabledIds] = useState<Set<string>>(new Set());

  // One request per pause in typing, not per key press.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchText(query.trim());
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const apiFilters = useMemo(() => toApiFilters(filters), [filters]);
  const filterKey = JSON.stringify(apiFilters);
  const requestKey = `${searchText}|${page}|${pageSize}|${attempt}|${filterKey}`;
  useEffect(() => {
    let current = true;
    // One call for every officer (GET /agents/my-team): the backend scopes it by role (Admin every DA, Executive their
    // Region, Supervisor their Woreda), applies the filters and sends the facets for the filter menus.
    listMyTeam({ search: searchText || undefined, filters: JSON.parse(filterKey) as AgentFilters, limit: pageSize, start: (page - 1) * pageSize })
      .then(({ agents, total, facets: next, scope: nextScope }) => {
        if (!current) return;
        setLoaded({ key: requestKey, rows: agents.map(apiAgentToAgent), total, error: null });
        setFacets(next);
        setScope(nextScope);
      })
      .catch((err: unknown) => current && setLoaded({ key: requestKey, rows: [], total: 0, error: describeAgentError(err) }));
    return () => {
      current = false;
    };
  }, [searchText, page, pageSize, attempt, requestKey, filterKey]);

  // The registry reads every DA's record, so a page can take a few seconds on the first load.
  const loading = loaded === null || loaded.key !== requestKey;
  const source = useMemo(() => (loading || !loaded ? [] : loaded.rows), [loading, loaded]);

  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;

  // Any filter change starts again from page 1; a Region or Woreda change resets the areas under it.
  const applyFilters = (next: Filters, changed: (keyof Filters)[]) => {
    const reset = changed.flatMap((key) => DEPENDENTS[key] ?? []).filter((key) => !changed.includes(key));
    setFilters({ ...next, ...Object.fromEntries(reset.map((key) => [key, new Set<string>()])) });
    setPage(1);
  };
  const setFilter = (key: keyof Filters) => (next: Set<string>) => applyFilters({ ...filters, [key]: next }, [key]);

  const options = (key: keyof Filters) => optionsFor(facets, key, filters[key]);
  const activeOptions = options("active");
  const tierOptions = options("tier");
  const kebeleOptions = options("kebele");
  const approvalOptions = options("approval");
  const woredaOptions = options("woreda");
  const filterFields: FilterFieldConfig[] = [
    // A narrower team hides the levels above it: a Region filter only for every DA (or several Regions), a Woreda
    // filter unless the team is a single Woreda.
    ...(scope === "all" || (scope === "region" && options("region").length > 1) ? [{ key: "region", label: "Region", allLabel: "All regions", placeholder: "All Regions", options: options("region") }] : []),
    ...(scope === "all" || scope === "region" || woredaOptions.length > 1 ? [{ key: "woreda", label: "Woreda", allLabel: "All woredas", placeholder: "All Woredas", options: woredaOptions }] : []),
    { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All Kebeles", options: kebeleOptions },
    { key: "active", label: "Active status", allLabel: "All active statuses", placeholder: "All", options: activeOptions },
    { key: "tier", label: "Education tier", allLabel: "All tiers", placeholder: "All", options: tierOptions },
    { key: "fayda", label: "Fayda status", allLabel: "All Fayda statuses", placeholder: "All", options: options("fayda") },
    { key: "approval", label: "Approval status", allLabel: "All approval statuses", placeholder: "All", options: approvalOptions },
  ];

  // The backend has already applied the filters.
  const rows = source;

  const columns: Column<Agent>[] = [
    { key: "daId", header: "DA-ID", cell: (a) => <span className="font-semibold text-ink">{a.daId.replace(/-(?=d+$)/, "-​")}</span> },
    { key: "name", header: "Full Name", cell: (a) => <Link href={`/agents/${a.daId}`} className="whitespace-nowrap text-ink hover:text-brand-green">{a.fullName}</Link> },
    { key: "fayda", header: "Fayda ID", cell: (a) => <span className="whitespace-nowrap text-ink">{a.faydaId}</span> },
    { key: "active", header: <FilterDropdown label="Active Status" allLabel="All active statuses" options={activeOptions} selected={filters.active} onApply={setFilter("active")} />, align: "center", cell: (a) => <Pill tone={ACTIVE_TONE[a.activeStatus]}>{a.activeStatus}</Pill> },
    { key: "tier", header: <FilterDropdown label="Education Tier" allLabel="All tiers" options={tierOptions} selected={filters.tier} onApply={setFilter("tier")} />, cell: (a) => a.educationTier },
    { key: "kebele", header: <FilterDropdown label="Assigned Kebele" allLabel="All kebeles" options={kebeleOptions} selected={filters.kebele} onApply={setFilter("kebele")} />, cell: (a) => (a.kebele === UNASSIGNED ? <span className="text-subtle">Unassigned</span> : <span className="whitespace-nowrap">{a.kebele}<span className="block text-[12px] text-muted">{a.woreda}</span></span>) },
    { key: "farmers", header: "Farmer Count", cell: (a) => a.farmerCount.toLocaleString() },
    { key: "approval", header: <FilterDropdown label="Approval Status" allLabel="All approval statuses" options={approvalOptions} selected={filters.approval} onApply={setFilter("approval")} />, align: "center", cell: (a) => <Pill tone={APPROVAL_TONE[a.approvalStatus]}>{a.approvalStatus}</Pill> },
    { key: "updated", header: "Last Updated", cell: (a) => { const [date, time] = splitStamp(a.updatedAt); return <span className="block whitespace-nowrap leading-snug text-ink">{date}<span className="block">{time}</span></span>; } },
    {
      key: "actions", header: "Action", align: "center",
      cell: (a) => {
        const enabled = !disabledIds.has(a.daId);
        return (
          <div className="flex items-center justify-center gap-2.5" onClick={(e) => e.stopPropagation()}>
            <RowAction href={`/agents/${a.daId}`} icon="view">View</RowAction>
            <RowAction href={`/performance/teams/attendance?agent=${encodeURIComponent(a.daId)}`} icon="calendar">
              View Attendance
            </RowAction>
            <Switch
              checked={enabled}
              disabled={!canEdit}
              label={`${enabled ? "Deactivate" : "Activate"} ${a.fullName}`}
              onChange={(on) => {
                setDisabledIds((prev) => {
                  const next = new Set(prev);
                  if (on) next.delete(a.daId);
                  else next.add(a.daId);
                  return next;
                });
                setNotice(`${a.fullName} (${a.daId}) ${on ? "activated" : "deactivated"} in the registry.`);
              }}
            />
          </div>
        );
      },
    },
  ];

  return (
    <>
      <Card className="overflow-hidden p-0 shadow-card">
        {/* Toolbar — the title never wraps; the controls stay one group that sits beside it when it fits and drops below as a whole when it doesn't. */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-4">
          <div className="flex shrink-0 items-center gap-2.5">
            <h2 className="whitespace-nowrap text-[16px] font-semibold text-ink">Master registry</h2>
            {loaded && !loaded.error && !loading && <span className="text-[13px] text-muted">{loaded.total.toLocaleString()} in your scope</span>}
          </div>
          <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
            <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />

            <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />

            {canImport && (
              <button type="button" onClick={() => setImportOpen(true)} className="inline-flex shrink-0 whitespace-nowrap h-9 items-center gap-2 rounded-md bg-brand-green px-3.5 text-[13.5px] font-semibold text-white hover:bg-brand-green-dark">
                Import agents
              </button>
            )}
            {canEdit && (
              <button type="button" onClick={() => setNotice("Sync from MoA queued — inbound batch will appear in Registry Sync with its receipt.")} className="inline-flex shrink-0 whitespace-nowrap h-9 items-center gap-2 rounded-md border border-brand-green bg-white px-3.5 text-[13.5px] font-semibold text-brand-green hover:bg-brand-wash">
                Sync from MoA
              </button>
            )}
            <ExportButton
              label="Export"
              icon={false}
              disabled={rows.length === 0}
              onExport={(format) => {
                downloadTable(format, `da-registry-${fileDate()}`, rows, CSV_COLUMNS, "DA master registry");
                setNotice(`Exported ${rows.length} agent${rows.length === 1 ? "" : "s"} matching the current filters (${formatLabel(format)}).`);
              }}
            />
          </div>
        </div>

        {loaded?.error && !loading && (
          <Banner tone="error" title="Agents could not be loaded" className="mx-4 mb-3">
            {loaded.error}
          </Banner>
        )}
        {notice && <Banner tone="success" className="mx-4 mb-3" onDismiss={() => setNotice(null)}>{notice}</Banner>}

        <div>
          <DataTable
            itemLabel="DA identifiers"
            columns={columns}
            rows={rows}
            rowKey={(a) => a.daId}
            minWidth="1380px"
            paginate={false}
            state={loading ? "loading" : loaded?.error ? "error" : "ready"}
            onRetry={() => setAttempt((n) => n + 1)}
            onRowClick={(a) => router.push(`/agents/${a.daId}`)}
            emptyTitle={searchText || activeFilterCount > 0 ? "No agents match the search or filters" : "No agents in your scope"}
            emptyHint={searchText || activeFilterCount > 0 ? "Clear a filter or try a different search." : "Agents appear here once the DA Registry publishes records in your Region or Woreda."}
          />
          {!loading && !loaded?.error && loaded && loaded.total > 0 && (
            <TablePagination
              page={page}
              pageSize={pageSize}
              total={loaded.total}
              itemLabel="agents"
              onPageChange={setPage}
              onPageSizeChange={(size: number) => {
                setPageSize(size);
                setPage(1);
              }}
            />
          )}
        </div>

        <AdvancedFiltersDrawer
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          fields={filterFields}
          filters={filters}
          onApply={(next) => {
            const picked = Object.fromEntries((Object.keys(EMPTY) as (keyof Filters)[]).map((key) => [key, next[key] ?? new Set<string>()])) as Filters;
            const sameSet = (a: Set<string>, b: Set<string>) => a.size === b.size && [...a].every((v) => b.has(v));
            applyFilters(picked, (Object.keys(EMPTY) as (keyof Filters)[]).filter((key) => !sameSet(picked[key], filters[key])));
          }}
        />
      </Card>

      {/* What this portal sent to the registry and what the registry refused; reloads after an import. */}
      <BulkImportsPanel refreshKey={importsVersion} />

      {/* §4.1 Intake — bulk import is one of only two entry paths (no manual Add DA). */}
      <ImportAgentsModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        onImported={(imported) => {
          setNotice(importNotice(imported));
          setAttempt((n) => n + 1);
          setImportsVersion((n) => n + 1);
        }}
      />
    </>
  );
}
