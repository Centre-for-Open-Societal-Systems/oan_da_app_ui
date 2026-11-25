"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowAction } from "@/components/ui/RowAction";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { AdvancedFiltersDrawer, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import {
  PENDING_REGISTRATIONS,
  REGISTRATION_AGENT_OPTIONS,
  REGISTRATION_FILTER_FIELDS,
  REGISTRATION_STATUS_OPTIONS,
  REGISTRATION_STATUS_TONE,
  REGISTRATION_TYPE_OPTIONS,
} from "@/features/dashboard";
import { useAreaFilterOptions, withFieldOptions } from "@/features/geo";

const SEARCH_PLACEHOLDER = searchPlaceholder(["Agent", "Type", "Kebele", "Last Updated", "Status"]);

interface RegistrationFilters extends FilterSelection {
  agent: Set<string>;
  type: Set<string>;
  kebele: Set<string>;
  status: Set<string>;
}

const EMPTY: RegistrationFilters = { agent: new Set(), type: new Set(), kebele: new Set(), status: new Set() };

export function PendingRegistrations() {
  const [filters, setFilters] = useState<RegistrationFilters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  // Every Kebele of the user's own area from the geo Master Data, then those the rows hold.
  const kebeleOptions = useAreaFilterOptions("kebele", PENDING_REGISTRATIONS.map((r) => r.kebele));
  const filterFields = withFieldOptions(REGISTRATION_FILTER_FIELDS, { kebele: kebeleOptions });
  const [query, setQuery] = useState("");
  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;

  const setFilter = (key: keyof RegistrationFilters) => (next: Set<string>) =>
    setFilters((prev) => ({ ...prev, [key]: next }));

  const rows = PENDING_REGISTRATIONS.filter(
    (r) =>
      (filters.agent.size === 0 || filters.agent.has(r.agent)) &&
      (filters.type.size === 0 || filters.type.has(r.type)) &&
      (filters.kebele.size === 0 || filters.kebele.has(r.kebele)) &&
      (filters.status.size === 0 || filters.status.has(r.status)) &&
      matchesQuery(query, r),
  );

  const { pageRows, paginationProps } = usePagination(rows);

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="flex flex-col gap-3 px-4 py-4 md:flex-row md:items-center md:justify-between">
        <h2 className="text-[15px] font-semibold text-ink">Pending Registration</h2>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />
          <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[900px] border-collapse text-left">
          <thead>
            <tr className="border-y border-line bg-surface text-[14px] font-semibold text-slate-500">
              <th className="whitespace-nowrap px-4 py-3 font-semibold">
                <FilterDropdown label="Agent" allLabel="All agents" options={REGISTRATION_AGENT_OPTIONS} selected={filters.agent} onApply={setFilter("agent")} />
              </th>
              <th className="px-4 py-3 font-semibold">
                <FilterDropdown label="Type" allLabel="All types" options={REGISTRATION_TYPE_OPTIONS} selected={filters.type} onApply={setFilter("type")} />
              </th>
              <th className="px-4 py-3 font-semibold">
                <FilterDropdown label="Kebele" allLabel="All kebeles" options={kebeleOptions} selected={filters.kebele} onApply={setFilter("kebele")} />
              </th>
              <th className="px-4 py-3 font-semibold">Last Updated</th>
              <th className="px-4 py-3 text-center font-semibold">
                <FilterDropdown label="Status" allLabel="All Status" options={REGISTRATION_STATUS_OPTIONS} selected={filters.status} onApply={setFilter("status")} />
              </th>
              <th className="px-4 py-3 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="text-[14px] text-slate-700">
            {rows.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6"><EmptyState title="No registrations match the selected filters" hint="Clear a filter or try a different search." /></td>
              </tr>
            )}
            {pageRows.map((r) => (
              <tr key={r.id} className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface">
                <td className="px-4 py-3.5 font-semibold text-slate-700">{r.agent}</td>
                <td className="px-4 py-3.5 text-[13.5px] text-ink-soft">{r.type}</td>
                <td className="px-4 py-3.5">{r.kebele}</td>
                <td className="px-4 py-3.5">{r.updatedAt}</td>
                <td className="px-4 py-3.5 text-center">
                  <Pill tone={REGISTRATION_STATUS_TONE[r.status]}>{r.status}</Pill>
                </td>
                <td className="px-4 py-3.5 text-center">
                  <RowAction href="/approvals" icon="view">Review</RowAction>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {rows.length > 0 && <TablePagination {...paginationProps} itemLabel="registrations" />}

      <AdvancedFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        fields={filterFields}
        filters={filters}
        onApply={(next) =>
          setFilters({
            agent: next.agent ?? new Set(),
            type: next.type ?? new Set(),
            kebele: next.kebele ?? new Set(),
            status: next.status ?? new Set(),
          })
        }
      />
    </Card>
  );
}
