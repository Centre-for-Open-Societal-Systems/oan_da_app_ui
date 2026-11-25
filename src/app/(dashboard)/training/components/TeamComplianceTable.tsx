"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { AdvancedFiltersDrawer, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { Pill } from "@/components/ui/Pill";
import { RowAction } from "@/components/ui/RowAction";
import { SearchInput } from "@/components/ui/SearchInput";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import {
  COMPLIANCE_AGENT_OPTIONS,
  COMPLIANCE_FILTER_FIELDS,
  COMPLIANCE_INCENTIVE_OPTIONS,
  INCENTIVE_STATUS_TONE,
  MANDATORY_COURSE_COUNT,
  TEAM_COMPLIANCE,
  type TeamComplianceRow,
} from "@/features/performance";
import { ExportButton } from "@/components/ui/ExportButton";
import { fileDate, type CsvColumn } from "@/lib/download";
import { downloadTable, formatLabel } from "@/lib/export";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { cn } from "@/lib/utils";
import { useAreaFilterOptions, withFieldOptions } from "@/features/geo";

const SEARCH_PLACEHOLDER = searchPlaceholder(["Agent name", "DA-ID"]);

const EXPORT_COLUMNS: CsvColumn<TeamComplianceRow>[] = [
  { header: "DA-ID", value: (r) => r.daId },
  { header: "Agent", value: (r) => r.name },
  { header: "Kebele", value: (r) => r.kebele },
  { header: "Woreda", value: (r) => r.woreda },
  { header: "Mandatory done", value: (r) => `${r.mandatoryDone}/${MANDATORY_COURSE_COUNT}` },
  { header: "Compliance (%)", value: (r) => r.compliance },
  { header: "Certificates", value: (r) => r.certificates },
  { header: "Last sync", value: (r) => r.lastSync },
  { header: "Incentive", value: (r) => r.incentive },
];

interface ComplianceFilters extends FilterSelection {
  agent: Set<string>;
  kebele: Set<string>;
  woreda: Set<string>;
  incentive: Set<string>;
}

const EMPTY: ComplianceFilters = { agent: new Set(), kebele: new Set(), woreda: new Set(), incentive: new Set() };

const barTone = (compliance: number) => (compliance >= 80 ? "bg-brand-green" : compliance >= 60 ? "bg-amber-700" : "bg-danger");

function ComplianceBar({ value, className }: { value: number; className?: string }) {
  return (
    <div className={cn("flex items-center gap-3", className)}>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line-soft">
        <div className={cn("h-full rounded-full", barTone(value))} style={{ width: `${value}%` }} />
      </div>
      <span className="text-[12.5px] text-ink-soft">{value}%</span>
    </div>
  );
}

// Supervisor's agent-by-agent Agrilearn compliance with column filters, search, the shared Advanced Filters drawer and export.
export function TeamComplianceTable() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ComplianceFilters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  // Every Kebele and Woreda of the user's own area from the geo Master Data, then those the rows hold.
  const kebeleOptions = useAreaFilterOptions("kebele", TEAM_COMPLIANCE.map((r) => r.kebele));
  const woredaOptions = useAreaFilterOptions("woreda", TEAM_COMPLIANCE.map((r) => r.woreda));
  const filterFields = withFieldOptions(COMPLIANCE_FILTER_FIELDS, { kebele: kebeleOptions, woreda: woredaOptions });
  const [notice, setNotice] = useState<string | null>(null);
  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;

  const setFilter = (key: keyof ComplianceFilters) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [key]: next }));

  const rows = TEAM_COMPLIANCE.filter(
    (r) =>
      (filters.agent.size === 0 || filters.agent.has(r.name)) &&
      (filters.kebele.size === 0 || filters.kebele.has(r.kebele)) &&
      (filters.woreda.size === 0 || filters.woreda.has(r.woreda)) &&
      (filters.incentive.size === 0 || filters.incentive.has(r.incentive)) &&
      matchesQuery(query, r.name, r.daId),
  );
  const { pageRows, paginationProps } = usePagination(rows);

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[18px] font-semibold text-ink">Agent compliance</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">Alphabetically sorted · Active woreda developmental field agents</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />
          <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
          <ExportButton
            label="Export file"
            disabled={rows.length === 0}
            onExport={(format) => {
              downloadTable(format, `team-training-compliance-${fileDate()}`, rows, EXPORT_COLUMNS, "Training compliance");
              setNotice(`Exported ${rows.length} agent${rows.length === 1 ? "" : "s"} matching the current filters (${formatLabel(format)}).`);
            }}
          />
        </div>
      </div>

      {notice && <Banner tone="success" className="mx-4 mb-3" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[1100px] border-collapse text-left">
          <thead>
            <tr className="border-y border-line bg-surface text-[14px] font-semibold text-slate-500">
              <th className="whitespace-nowrap px-4 py-3 font-semibold">DA-ID</th>
              <th className="px-4 py-3 font-semibold">
                <FilterDropdown label="Agent" allLabel="All agents" options={COMPLIANCE_AGENT_OPTIONS} selected={filters.agent} onApply={setFilter("agent")} />
              </th>
              <th className="px-4 py-3 font-semibold">
                <span className="flex items-center gap-1">
                  <FilterDropdown label="Kebele" allLabel="All kebeles" options={kebeleOptions} selected={filters.kebele} onApply={setFilter("kebele")} />
                  <span>/</span>
                  <FilterDropdown label="Woreda" allLabel="All woredas" options={woredaOptions} selected={filters.woreda} onApply={setFilter("woreda")} />
                </span>
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Mandatory Done</th>
              <th className="px-4 py-3 font-semibold">Compliance</th>
              <th className="px-4 py-3 font-semibold">Certificates</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Last Sync</th>
              <th className="px-4 py-3 text-center font-semibold">
                <FilterDropdown label="Incentive" allLabel="All statuses" options={COMPLIANCE_INCENTIVE_OPTIONS} selected={filters.incentive} onApply={setFilter("incentive")} />
              </th>
              <th className="px-4 py-3 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="text-[14px] text-slate-700">
            {rows.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-6"><EmptyState title="No agents match the selected filters" hint="Clear a filter or try a different search." /></td>
              </tr>
            )}
            {pageRows.map((r) => (
              <tr key={r.id} className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface">
                <td className="whitespace-nowrap px-4 py-3.5">{r.daId}</td>
                <td className="px-4 py-3.5 font-semibold text-slate-700">{r.name}</td>
                <td className="px-4 py-3.5">
                  <div>{r.kebele}</div>
                  <div className="text-[12.5px] text-ink-soft">{r.woreda}</div>
                </td>
                <td className="px-4 py-3.5">{r.mandatoryDone}/{MANDATORY_COURSE_COUNT}</td>
                <td className="px-4 py-3.5"><ComplianceBar value={r.compliance} /></td>
                <td className="px-4 py-3.5">{r.certificates}</td>
                <td className="px-4 py-3.5">{r.lastSync}</td>
                <td className="px-4 py-3.5 text-center"><Pill tone={INCENTIVE_STATUS_TONE[r.incentive]}>{r.incentive}</Pill></td>
                <td className="px-4 py-3.5 text-center"><RowAction icon="view" href={`/training/agents/${r.daId}`}>View</RowAction></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination {...paginationProps} itemLabel="DA identifiers" />

      <AdvancedFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        fields={filterFields}
        filters={filters}
        onApply={(next) =>
          setFilters({
            agent: next.agent ?? new Set(),
            kebele: next.kebele ?? new Set(),
            woreda: next.woreda ?? new Set(),
            incentive: next.incentive ?? new Set(),
          })
        }
      />

    </Card>
  );
}
