"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { AdvancedFiltersDrawer, type FilterFieldConfig, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { ACTIVE_TONE, type TeamMember } from "@/features/agents";
import { matchesQuery, searchPlaceholder } from "@/lib/search";

const SEARCH_PLACEHOLDER = searchPlaceholder(["Name", "DA-ID", "Kebele", "Specialisation", "Phone"]);

const optionsOf = (values: string[]): FilterOption[] =>
  [...new Set(values)].sort().map((value) => ({ value, label: value, count: values.filter((v) => v === value).length }));

interface TeamFilters extends FilterSelection {
  specialisation: Set<string>;
  status: Set<string>;
}
const EMPTY: TeamFilters = { specialisation: new Set(), status: new Set() };

// The DA's Woreda team (GET /da-services/experts). Read-only: DAs see their colleagues' work contacts, not
// registry records (no row links). Farmer counts and joining dates are known for the DA's own record only.
export function TeamTable({ team, myDaId, loading = false }: { team: TeamMember[]; myDaId: string; loading?: boolean }) {
  const [filters, setFilters] = useState<TeamFilters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");

  const specialisationOptions = optionsOf(team.map((a) => a.specialisation));
  const statusOptions = optionsOf(team.map((a) => a.activeStatus));
  const filterFields: FilterFieldConfig[] = [
    { key: "specialisation", label: "Specialisation", allLabel: "All specialisations", placeholder: "All Specialisations", options: specialisationOptions },
    { key: "status", label: "Status", allLabel: "All Status", placeholder: "All Status", options: statusOptions },
  ];

  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;
  const setFilter = (key: keyof TeamFilters) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [key]: next }));
  const has = (set: Set<string>, value: string) => set.size === 0 || set.has(value);

  const rows = team.filter(
    (a) =>
      has(filters.specialisation, a.specialisation) &&
      has(filters.status, a.activeStatus) &&
      matchesQuery(query, a.fullName, a.daId, a.kebele, a.specialisation, a.activeStatus, a.phone, a.email, a.joinedAt),
  );

  const columns: Column<TeamMember>[] = [
    {
      key: "name",
      header: "Name",
      cell: (a) => (
        <span className="flex flex-col">
          <span className="flex items-center gap-2 font-medium text-ink">
            {a.fullName}
            {a.daId === myDaId && <Pill tone="green">You</Pill>}
          </span>
          <span className="font-mono text-[12px] text-muted">{a.daId}</span>
        </span>
      ),
    },
    {
      key: "kebele",
      header: "Kebele",
      cell: (a) => a.kebele,
    },
    {
      key: "specialisation",
      header: <FilterDropdown label="Specialisation" allLabel="All specialisations" options={specialisationOptions} selected={filters.specialisation} onApply={setFilter("specialisation")} />,
      cell: (a) => a.specialisation,
    },
    { key: "farmers", header: "Farmers", align: "right", cell: (a) => (a.farmerCount != null ? a.farmerCount.toLocaleString() : <span className="text-subtle">—</span>) },
    {
      key: "status",
      header: <FilterDropdown label="Status" allLabel="All Status" options={statusOptions} selected={filters.status} onApply={setFilter("status")} />,
      cell: (a) => <Pill tone={ACTIVE_TONE[a.activeStatus]} dot>{a.activeStatus}</Pill>,
    },
    {
      key: "phone",
      header: "Phone",
      cell: (a) => (a.phone === "—" ? <span className="text-subtle">—</span> : <a href={`tel:${a.phone.replace(/\s/g, "")}`} className="whitespace-nowrap text-ink-soft hover:text-brand-green">{a.phone}</a>),
    },
    { key: "joined", header: "Joined", cell: (a) => <span className="whitespace-nowrap text-[13px] text-muted">{a.joinedAt ?? "—"}</span> },
  ];

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-semibold text-ink">Team members</h2>
          {!loading && <span className="text-[13px] text-muted">{rows.length === team.length ? `${team.length} agents` : `${rows.length} of ${team.length} agents`}</span>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />
          <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
        </div>
      </div>

      <DataTable
        itemLabel="agents"
        columns={columns}
        rows={rows}
        rowKey={(a) => a.daId}
        minWidth="960px"
        state={loading ? "loading" : "ready"}
        emptyTitle={team.length === 0 ? "No team members yet" : "No team members match the selected filters"}
        emptyHint={team.length === 0 ? "You will see your Woreda colleagues here once the DA Registry lists them in your Woreda." : "Clear a filter or try a different search."}
      />

      <AdvancedFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        fields={filterFields}
        filters={filters}
        onApply={(next) =>
          setFilters({
            specialisation: next.specialisation ?? new Set(),
            status: next.status ?? new Set(),
          })
        }
      />
    </Card>
  );
}
