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
import { ACTIVE_TONE, APPROVAL_TONE, AgentsPageHeader, BulkImportsPanel, apiAgentToAgent, describeAgentError, importStatusLabel, listMyTeam, type Agent, type AgentFacets, type AgentFilterField, type AgentFilters, type AgentImport, type TeamKind } from "@/features/agents";
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
// the DA Registry through GET /da-services/agents/my-team (Admin: every DA; Supervisor: the DAs posted to their
// Woreda; another manager: everyone who reports to them in the DA Hierarchy; a DA: the DAs posted to their Kebele). Search, filters and paging run on the server; the
// filter menus list the backend's facets, counted over the whole team. A DA (My Teams) gets the same grid, read-only:
// no row links (the /agents pages are closed to DAs), no import, and their own row marked "You".
export function AgentsRegistry() {
  const router = useRouter();
  const role = useAuthStore((s) => s.role);
  const canEdit = role === "Supervisor" || role === "Admin";
  // Bulk import needs the registry's Intake Officer role, which only the OAN Administrator holds.
  const canImport = role === "Admin";
  const isDA = role === "DA";
  const myDaId = useAuthStore((s) => s.profile?.daId ?? null);
  const [query, setQuery] = useState("");
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[PAGE_SIZES.length - 1]);
  const [attempt, setAttempt] = useState(0);
  const [loaded, setLoaded] = useState<{ key: string; rows: Agent[]; total: number; error: string | null } | null>(null);
  // The last facets the backend sent; kept while the next page loads so the filter menus do not empty.
  const [facets, setFacets] = useState<AgentFacets>({});
  // How the backend chose the team ("all" for an Admin); "all" until the first answer.
  const [team, setTeam] = useState<TeamKind>("all");
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
    // One call for every officer (GET /agents/my-team): the backend takes the team from the DA Hierarchy (Admin every
    // DA, a manager their reports), applies the filters and sends the facets for the filter menus.
    listMyTeam({ search: searchText || undefined, filters: JSON.parse(filterKey) as AgentFilters, limit: pageSize, start: (page - 1) * pageSize })
      .then(({ agents, total, facets: next, team: nextTeam }) => {
        if (!current) return;
        setLoaded({ key: requestKey, rows: agents.map(apiAgentToAgent), total, error: null });
        setFacets(next);
        setTeam(nextTeam);
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
    // Region and Woreda filters show for every DA (Admin) or when the team spans more than one.
    ...(team === "all" || options("region").length > 1 ? [{ key: "region", label: "Region", allLabel: "All regions", placeholder: "All Regions", options: options("region") }] : []),
    ...(team === "all" || woredaOptions.length > 1 ? [{ key: "woreda", label: "Woreda", allLabel: "All woredas", placeholder: "All Woredas", options: woredaOptions }] : []),
    { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All Kebeles", options: kebeleOptions },
    { key: "active", label: "Active status", allLabel: "All active statuses", placeholder: "All", options: activeOptions },
    { key: "tier", label: "Education tier", allLabel: "All tiers", placeholder: "All", options: tierOptions },
    { key: "fayda", label: "Fayda status", allLabel: "All Fayda statuses", placeholder: "All", options: options("fayda") },
    { key: "approval", label: "Approval status", allLabel: "All approval statuses", placeholder: "All", options: approvalOptions },
  ];

  // The backend has already applied the filters.
  const rows = source;

  const columns: Column<Agent>[] = [
    {
      key: "sNo",
      header: "S. No.",
      align: "center",
      className: "w-12 sm:w-14 px-2 sm:px-3 text-center whitespace-nowrap",
      cell: (_a, index) => (
        <span className="text-[13px] font-medium text-slate-500">
          {(page - 1) * pageSize + index + 1}
        </span>
      ),
    },
    {
      key: "daId",
      header: "DA-ID",
      className: "whitespace-nowrap px-2.5 sm:px-3.5",
      cell: (a) => <span className="whitespace-nowrap text-[13px] font-semibold text-ink">{a.daId}</span>,
    },
    {
      key: "name",
      header: "Full Name",
      className: "whitespace-nowrap px-2.5 sm:px-3.5",
      cell: (a) =>
        isDA ? (
          <span className="flex items-center gap-2 whitespace-nowrap text-[13.5px] font-medium text-ink">
            {a.fullName}
            {a.daId === myDaId && <Pill tone="green">You</Pill>}
          </span>
        ) : (
          <Link href={`/agents/${a.daId}`} className="whitespace-nowrap text-[13.5px] font-medium text-ink hover:text-brand-green">
            {a.fullName}
          </Link>
        ),
    },
    {
      key: "fayda",
      header: "Fayda ID",
      className: "whitespace-nowrap px-2.5 sm:px-3.5",
      cell: (a) => <span className="whitespace-nowrap font-mono text-[12.5px] text-slate-600">{a.faydaId}</span>,
    },
    {
      key: "active",
      header: <FilterDropdown label="Active Status" allLabel="All active statuses" options={activeOptions} selected={filters.active} onApply={setFilter("active")} />,
      align: "center",
      className: "px-2 sm:px-3 text-center whitespace-nowrap",
      cell: (a) => <Pill tone={ACTIVE_TONE[a.activeStatus]}>{a.activeStatus}</Pill>,
    },
    {
      key: "tier",
      header: <FilterDropdown label="Education Tier" allLabel="All tiers" options={tierOptions} selected={filters.tier} onApply={setFilter("tier")} />,
      align: "center",
      className: "px-2 sm:px-3 text-center whitespace-nowrap",
      cell: (a) => <span className="whitespace-nowrap text-[13px] text-slate-700">{a.educationTier}</span>,
    },
    {
      key: "kebele",
      header: <FilterDropdown label="Assigned Kebele" allLabel="All kebeles" options={kebeleOptions} selected={filters.kebele} onApply={setFilter("kebele")} />,
      className: "px-2.5 sm:px-3.5 whitespace-nowrap",
      cell: (a) => (
        a.kebele === UNASSIGNED ? (
          <span className="text-subtle text-[13px]">Unassigned</span>
        ) : (
          <span className="whitespace-nowrap text-[13px] font-medium text-ink leading-tight">
            {a.kebele}
            <span className="block text-[11.5px] font-normal text-muted">{a.woreda}</span>
          </span>
        )
      ),
    },
    {
      key: "farmers",
      header: "Farmer Count",
      align: "center",
      className: "px-2 sm:px-3 text-center whitespace-nowrap",
      cell: (a) => <span className="text-[13px] text-slate-700">{a.farmerCount.toLocaleString()}</span>,
    },
    {
      key: "approval",
      header: <FilterDropdown label="Approval Status" allLabel="All approval statuses" options={approvalOptions} selected={filters.approval} onApply={setFilter("approval")} />,
      align: "center",
      className: "px-2 sm:px-3 text-center whitespace-nowrap",
      cell: (a) => <Pill tone={APPROVAL_TONE[a.approvalStatus]}>{a.approvalStatus}</Pill>,
    },
    {
      key: "updated",
      header: "Last Updated",
      align: "center",
      className: "px-2 sm:px-3 text-center whitespace-nowrap",
      cell: (a) => {
        if (!a.updatedAt || a.updatedAt === "—") return <span className="text-muted text-[13px]">—</span>;
        const [date, time] = splitStamp(a.updatedAt);
        return (
          <span className="block whitespace-nowrap text-[12px] leading-tight text-slate-600">
            {date}
            <span className="block text-[11px] text-muted">{time}</span>
          </span>
        );
      },
    },
    {
      key: "actions",
      header: "Action",
      align: "center",
      className: "px-2.5 sm:px-4 text-center whitespace-nowrap",
      cell: (a) => {
        const enabled = !disabledIds.has(a.daId);
        return (
          <div className="flex items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
            {!isDA && (
              <RowAction href={`/agents/${a.daId}`} icon="view" className="px-2.5 py-1 text-[12px]">
                View
              </RowAction>
            )}
            {!isDA && (
              <RowAction href={`/performance/teams/attendance?agent=${encodeURIComponent(a.daId)}`} icon="calendar" className="px-2.5 py-1 text-[12px]">
                Attendance
              </RowAction>
            )}
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
      <AgentsPageHeader
        actions={
          <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-2.5">
            {isDA && (
              <Link
                href="/advisors"
                className="inline-flex shrink-0 whitespace-nowrap h-9 sm:h-10 items-center justify-center gap-2 rounded-xl bg-brand-green px-3 sm:px-4 text-[12.5px] sm:text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-green-dark shadow-xs"
              >
                Advisors
              </Link>
            )}
            {canImport && (
              <button
                type="button"
                onClick={() => setImportOpen(true)}
                className="inline-flex shrink-0 whitespace-nowrap h-9 sm:h-10 items-center justify-center gap-2 rounded-xl bg-brand-green px-3 sm:px-4 text-[12.5px] sm:text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-green-dark shadow-xs"
              >
                Import agents
              </button>
            )}
            {canEdit && (
              <button
                type="button"
                onClick={() => setNotice("Sync from MoA queued — inbound batch will appear in Registry Sync with its receipt.")}
                className="inline-flex shrink-0 whitespace-nowrap h-9 sm:h-10 items-center justify-center gap-2 rounded-xl border border-brand-green bg-white px-3 sm:px-4 text-[12.5px] sm:text-[13.5px] font-semibold text-brand-green transition-colors hover:bg-brand-wash shadow-xs"
              >
                Sync from MoA
              </button>
            )}
            <ExportButton
              label="Export"
              icon={false}
              disabled={rows.length === 0}
              className="h-9 sm:h-10 rounded-xl text-[12.5px] sm:text-[13.5px]"
              onExport={(format) => {
                downloadTable(format, `da-registry-${fileDate()}`, rows, CSV_COLUMNS, "DA master registry");
                setNotice(`Exported ${rows.length} agent${rows.length === 1 ? "" : "s"} matching the current filters (${formatLabel(format)}).`);
              }}
            />
          </div>
        }
      />

      <Card className="overflow-hidden p-0 shadow-card">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 px-3.5 py-3 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex shrink-0 items-center gap-2.5">
            <h2 className="whitespace-nowrap text-[15px] sm:text-[17px] font-semibold text-ink">{isDA ? "Team members" : "Master registry"}</h2>
            {loaded && !loaded.error && !loading && (
              <span className="text-[12.5px] sm:text-[13px] text-muted">{loaded.total.toLocaleString()} in your {isDA ? "Kebele" : "scope"}</span>
            )}
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={SEARCH_PLACEHOLDER}
              className="flex-1 min-w-0 md:w-[260px] lg:w-[280px]"
            />
            <AdvancedFiltersButton
              activeCount={activeFilterCount}
              onClick={() => setIsFiltersOpen(true)}
              className="shrink-0 h-10 px-3 sm:px-4"
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
            minWidth="min-w-[1060px] xl:min-w-full"
            paginate={false}
            state={loading ? "loading" : loaded?.error ? "error" : "ready"}
            onRetry={() => setAttempt((n) => n + 1)}
            onRowClick={isDA ? undefined : (a) => router.push(`/agents/${a.daId}`)}
            emptyTitle={searchText || activeFilterCount > 0 ? "No agents match the search or filters" : isDA ? "No agents in your Kebele" : "No agents in your scope"}
            emptyHint={searchText || activeFilterCount > 0 ? "Clear a filter or try a different search." : isDA ? "Your Kebele colleagues appear here once the DA Registry posts you and them to a Kebele." : "Agents appear here once the DA Registry publishes records in your Region or Woreda."}
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
      {!isDA && <BulkImportsPanel refreshKey={importsVersion} />}

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
