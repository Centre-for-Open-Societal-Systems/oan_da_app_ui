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
import { ACTIVE_TONE, APPROVAL_TONE, AgentsPageHeader, BulkImportsPanel, apiAgentToAgent, describeAgentError, importStatusLabel, listAgents, type Agent, type AgentImport } from "@/features/agents";
import { searchPlaceholder } from "@/lib/search";
import { fileDate, type CsvColumn } from "@/lib/download";
import { downloadTable, formatLabel } from "@/lib/export";
import { ImportAgentsModal } from "./ImportAgentsModal";
import { useScopeAreaNames } from "@/features/geo";

const SEARCH_DEBOUNCE_MS = 400;
const ACTIVE = ["Active", "On-leave", "Separated", "Unassigned"];
const TIERS = ["Certificate", "Diploma", "Degree", "Masters", "MSc", "PhD"];
const APPROVALS = ["Draft", "Awaiting review", "Changes requested", "Approved", "Published", "Rejected"];
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

// The backend searches DA-ID and name; the column filters narrow the loaded page on screen.
const SEARCH_PLACEHOLDER = searchPlaceholder(["DA-ID", "Full Name"]);

const unique = (values: string[]) => [...new Set(values.filter((v) => v !== ""))].sort();

const optionsOf = (values: string[], order: readonly string[], label?: (v: string) => string): FilterOption[] =>
  order.map((value) => ({ value, label: label ? label(value) : value, count: values.filter((v) => v === value).length }));

interface Filters extends FilterSelection {
  woreda: Set<string>;
  kebele: Set<string>;
  active: Set<string>;
  tier: Set<string>;
  approval: Set<string>;
}
const EMPTY: Filters = { woreda: new Set(), kebele: new Set(), active: new Set(), tier: new Set(), approval: new Set() };

// "14 Sep 2026, 09:12" → ["14 Sep 2026,", "09:12 AM"] for the two-line Last Updated cell.
const splitStamp = (stamp: string): [string, string] => {
  const [date, time = ""] = stamp.split(", ");
  const [h, m] = time.split(":").map(Number);
  if (!time || Number.isNaN(h) || Number.isNaN(m)) return [date, time];
  return [`${date},`, `${String(h % 12 || 12).padStart(2, "0")}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`];
};

// FR-02 §3.2.1–3.2.2: 11 literal columns, combinable/resettable filters, search by DA-ID or name. Rows come from
// the DA Registry through GET /da-services/agents, already limited to the caller's scope (Supervisor: Woreda,
// Executive: Region, Admin: all); search and paging run on the server.
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

  const requestKey = `${searchText}|${page}|${pageSize}|${attempt}`;
  useEffect(() => {
    let current = true;
    listAgents({ search: searchText || undefined, limit: pageSize, start: (page - 1) * pageSize })
      .then(({ agents, total }) => current && setLoaded({ key: requestKey, rows: agents.map(apiAgentToAgent), total, error: null }))
      .catch((err: unknown) => current && setLoaded({ key: requestKey, rows: [], total: 0, error: describeAgentError(err) }));
    return () => {
      current = false;
    };
  }, [searchText, page, pageSize, attempt, requestKey]);

  // The registry reads every DA's record, so a page can take a few seconds on the first load.
  const loading = loaded === null || loaded.key !== requestKey;
  const source = useMemo(() => (loading || !loaded ? [] : loaded.rows), [loading, loaded]);

  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;

  // Kebeles under the selected woredas (every kebele when no woreda is picked), from the loaded rows.
  // Kebele and Woreda options: the areas of the user's own area from the geo Master Data, then those the rows hold.
  const scopeKebeleNames = useScopeAreaNames("kebele", []);
  const woredaNames = useScopeAreaNames("woreda", source.map((a) => a.woreda));
  const kebelesFor = (woredas: Set<string>) => [
    ...unique([...(woredas.size === 0 ? scopeKebeleNames : []), ...source.filter((a) => woredas.size === 0 || woredas.has(a.woreda)).map((a) => a.kebele)]).filter((k) => k !== UNASSIGNED),
    UNASSIGNED,
  ];
  // Drops kebele selections that no longer belong to the chosen woredas.
  const pruneKebeles = (next: Filters): Filters => {
    const allowed = new Set(kebelesFor(next.woreda));
    return { ...next, kebele: new Set([...next.kebele].filter((k) => allowed.has(k))) };
  };
  const setFilter = (key: keyof Filters) => (next: Set<string>) => setFilters((prev) => pruneKebeles({ ...prev, [key]: next }));

  const woredaOptions = optionsOf(source.map((a) => a.woreda), woredaNames);
  const activeOptions = optionsOf(source.map((a) => a.activeStatus), ACTIVE);
  const tierOptions = optionsOf(source.map((a) => a.educationTier), unique([...TIERS, ...source.map((a) => a.educationTier)]));
  const approvalOptions = optionsOf(source.map((a) => a.approvalStatus), APPROVALS);
  const inWoredas = source.filter((a) => filters.woreda.size === 0 || filters.woreda.has(a.woreda));
  const kebeleOptions = optionsOf(inWoredas.map((a) => a.kebele), kebelesFor(filters.woreda), (k) => (k === UNASSIGNED ? "Unassigned" : k));
  const filterFields: FilterFieldConfig[] = [
    { key: "woreda", label: "Woreda", allLabel: "All woredas", placeholder: "All Woredas", options: woredaOptions },
    { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All Kebeles", options: kebeleOptions },
    { key: "active", label: "Active status", allLabel: "All active statuses", placeholder: "All", options: activeOptions },
    { key: "tier", label: "Education tier", allLabel: "All tiers", placeholder: "All", options: tierOptions },
    { key: "approval", label: "Approval status", allLabel: "All approval statuses", placeholder: "All", options: approvalOptions },
  ];

  const rows = useMemo(() => {
    const has = (set: Set<string>, value: string) => set.size === 0 || set.has(value);
    return source.filter(
      (a) =>
        has(filters.woreda, a.woreda) &&
        has(filters.kebele, a.kebele) &&
        has(filters.active, a.activeStatus) &&
        has(filters.tier, a.educationTier) &&
        has(filters.approval, a.approvalStatus),
    );
  }, [source, filters]);

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
      cell: (a) => (
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
            <RowAction href={`/agents/${a.daId}`} icon="view" className="px-2.5 py-1 text-[12px]">
              View
            </RowAction>
            <RowAction href={`/performance/teams/attendance?agent=${encodeURIComponent(a.daId)}`} icon="calendar" className="px-2.5 py-1 text-[12px]">
              Attendance
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
      <AgentsPageHeader
        actions={
          <div className="flex items-center flex-wrap sm:flex-nowrap gap-2 sm:gap-2.5">
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
            <h2 className="whitespace-nowrap text-[15px] sm:text-[17px] font-semibold text-ink">Master registry</h2>
            {loaded && !loaded.error && !loading && (
              <span className="text-[12.5px] sm:text-[13px] text-muted">{loaded.total.toLocaleString()} in your scope</span>
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
          onApply={(next) =>
            setFilters(
              pruneKebeles({
                woreda: next.woreda ?? new Set(),
                kebele: next.kebele ?? new Set(),
                active: next.active ?? new Set(),
                tier: next.tier ?? new Set(),
                approval: next.approval ?? new Set(),
              }),
            )
          }
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
