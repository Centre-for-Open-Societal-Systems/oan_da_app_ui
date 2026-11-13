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
import { ACTIVE_TONE, APPROVAL_TONE, BulkImportsPanel, FAYDA_TONE, apiAgentToAgent, describeAgentError, importStatusLabel, listAgents, type Agent, type AgentImport } from "@/features/agents";
import { searchPlaceholder } from "@/lib/search";
import { fileDate, type CsvColumn } from "@/lib/download";
import { downloadTable, formatLabel } from "@/lib/export";
import { ImportAgentsModal } from "./ImportAgentsModal";

const SEARCH_DEBOUNCE_MS = 400;
const FAYDA = ["Verified", "Pending", "Mismatch"];
const ACTIVE = ["Active", "On-leave", "Separated", "Unassigned"];
const TIERS = ["Certificate", "Diploma", "Degree", "Masters", "MSc", "PhD"];
const APPROVALS = ["Draft", "Awaiting review", "Changes requested", "Approved", "Published", "Rejected"];
const UNASSIGNED = "—";

// The registry columns in table order — used by Export.
const CSV_COLUMNS: CsvColumn<Agent>[] = [
  { header: "DA-ID", value: (a) => a.daId },
  { header: "Full Name", value: (a) => a.fullName },
  { header: "Fayda ID", value: (a) => a.faydaId },
  { header: "Fayda Status", value: (a) => a.faydaStatus },
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
  fayda: Set<string>;
  active: Set<string>;
  tier: Set<string>;
  approval: Set<string>;
}
const EMPTY: Filters = { woreda: new Set(), kebele: new Set(), fayda: new Set(), active: new Set(), tier: new Set(), approval: new Set() };

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
  const kebelesFor = (woredas: Set<string>) => [
    ...unique(source.filter((a) => woredas.size === 0 || woredas.has(a.woreda)).map((a) => a.kebele)).filter((k) => k !== UNASSIGNED),
    UNASSIGNED,
  ];
  // Drops kebele selections that no longer belong to the chosen woredas.
  const pruneKebeles = (next: Filters): Filters => {
    const allowed = new Set(kebelesFor(next.woreda));
    return { ...next, kebele: new Set([...next.kebele].filter((k) => allowed.has(k))) };
  };
  const setFilter = (key: keyof Filters) => (next: Set<string>) => setFilters((prev) => pruneKebeles({ ...prev, [key]: next }));

  const woredaOptions = optionsOf(source.map((a) => a.woreda), unique(source.map((a) => a.woreda)));
  const faydaOptions = optionsOf(source.map((a) => a.faydaStatus), FAYDA);
  const activeOptions = optionsOf(source.map((a) => a.activeStatus), ACTIVE);
  const tierOptions = optionsOf(source.map((a) => a.educationTier), unique([...TIERS, ...source.map((a) => a.educationTier)]));
  const approvalOptions = optionsOf(source.map((a) => a.approvalStatus), APPROVALS);
  const inWoredas = source.filter((a) => filters.woreda.size === 0 || filters.woreda.has(a.woreda));
  const kebeleOptions = optionsOf(inWoredas.map((a) => a.kebele), kebelesFor(filters.woreda), (k) => (k === UNASSIGNED ? "Unassigned" : k));
  const filterFields: FilterFieldConfig[] = [
    { key: "woreda", label: "Woreda", allLabel: "All woredas", placeholder: "All Woredas", options: woredaOptions },
    { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All Kebeles", options: kebeleOptions },
    { key: "fayda", label: "Fayda status", allLabel: "All Fayda statuses", placeholder: "All", options: faydaOptions },
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
        has(filters.fayda, a.faydaStatus) &&
        has(filters.active, a.activeStatus) &&
        has(filters.tier, a.educationTier) &&
        has(filters.approval, a.approvalStatus),
    );
  }, [source, filters]);

  const columns: Column<Agent>[] = [
    { key: "daId", header: "DA-ID", cell: (a) => <span className="font-semibold text-ink">{a.daId.replace(/-(?=d+$)/, "-​")}</span> },
    { key: "name", header: "Full Name", cell: (a) => <Link href={`/agents/${a.daId}`} className="whitespace-nowrap text-ink hover:text-brand-green">{a.fullName}</Link> },
    { key: "fayda", header: "Fayda ID", cell: (a) => <span className="whitespace-nowrap text-ink">{a.faydaId}</span> },
    { key: "faydaStatus", header: <FilterDropdown label="Fayda Status" allLabel="All Fayda statuses" options={faydaOptions} selected={filters.fayda} onApply={setFilter("fayda")} />, align: "center", cell: (a) => <Pill tone={FAYDA_TONE[a.faydaStatus]}>{a.faydaStatus}</Pill> },
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
            minWidth="1280px"
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
                fayda: next.fayda ?? new Set(),
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
