"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill } from "@/components/ui/Pill";
import { RowAction } from "@/components/ui/RowAction";
import { SearchInput } from "@/components/ui/SearchInput";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { AdvancedFiltersDrawer, type FilterFieldConfig, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { advisorUpdatedDate, type Advisor } from "@/features/communication";
import { Banner } from "@/components/ui/Banner";
import { ExportButton } from "@/components/ui/ExportButton";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { fileDate, type CsvColumn } from "@/lib/download";
import { downloadTable, formatLabel } from "@/lib/export";

const SEARCH_PLACEHOLDER = searchPlaceholder(["Name", "Expertise Area", "MoA Unit", "Region", "Woreda"]);

const EXPORT_COLUMNS: CsvColumn<Advisor>[] = [
  { header: "Advisor ID", value: (a) => a.id },
  { header: "Name", value: (a) => a.name },
  { header: "Expertise Area", value: (a) => a.expertise },
  { header: "MoA Unit / Directorate", value: (a) => a.unit },
  { header: "Region", value: (a) => a.region },
  { header: "Woreda", value: (a) => a.woreda },
  { header: "Phone", value: (a) => a.phone },
  { header: "Email", value: (a) => a.email },
  { header: "Availability", value: (a) => a.availability },
  { header: "Last Updated", value: (a) => a.updatedAt },
];

const optionsOf = (values: string[]): FilterOption[] =>
  [...new Set(values)].sort().map((value) => ({ value, label: value, count: values.filter((v) => v === value).length }));

interface AdvisorFilters extends FilterSelection {
  expertise: Set<string>;
  region: Set<string>;
  woreda: Set<string>;
}
const EMPTY: AdvisorFilters = { expertise: new Set(), region: new Set(), woreda: new Set() };

// MoA subject-matter experts the DA can reach out to. Read-only reference list; View opens the advisor page.
export function AdvisorDirectory({ advisors }: { advisors: Advisor[] }) {
  const [filters, setFilters] = useState<AdvisorFilters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<string | null>(null);

  const expertiseOptions = optionsOf(advisors.map((a) => a.expertise));
  const regionOptions = optionsOf(advisors.map((a) => a.region));
  const woredaOptions = optionsOf(advisors.map((a) => a.woreda));
  const filterFields: FilterFieldConfig[] = [
    { key: "expertise", label: "Expertise Area", allLabel: "All expertise areas", placeholder: "All Expertise Areas", options: expertiseOptions },
    { key: "region", label: "Region", allLabel: "All regions", placeholder: "All Regions", options: regionOptions },
    { key: "woreda", label: "Woreda", allLabel: "All woredas", placeholder: "All Woredas", options: woredaOptions },
  ];

  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;
  const setFilter = (key: keyof AdvisorFilters) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [key]: next }));
  const has = (set: Set<string>, value: string) => set.size === 0 || set.has(value);

  const rows = advisors.filter(
    (a) =>
      has(filters.expertise, a.expertise) &&
      has(filters.region, a.region) &&
      has(filters.woreda, a.woreda) &&
      matchesQuery(query, a.name, a.id, a.expertise, a.unit, a.region, a.woreda, a.phone, a.email),
  );

  const columns: Column<Advisor>[] = [
    {
      key: "advisor",
      header: "Advisor",
      cell: (a) => (
        <span className="flex flex-col">
          <span className="whitespace-nowrap font-semibold text-ink">{a.name}</span>
          <span className="text-[12.5px] text-muted">{a.id}</span>
        </span>
      ),
    },
    {
      key: "expertise",
      header: <FilterDropdown label="Expertise Area" allLabel="All expertise areas" options={expertiseOptions} selected={filters.expertise} onApply={setFilter("expertise")} />,
      cell: (a) => <Pill tone="blue" className="px-2.5 py-0.5 text-[12.5px]">{a.expertise}</Pill>,
    },
    { key: "unit", header: "MoA Unit / Directorate", cell: (a) => <span className="block min-w-[200px]">{a.unit}</span> },
    {
      key: "location",
      header: (
        <span className="flex items-center gap-1">
          <FilterDropdown label="Region" allLabel="All regions" options={regionOptions} selected={filters.region} onApply={setFilter("region")} />
          <span className="text-muted">/</span>
          <FilterDropdown label="Woreda" allLabel="All woredas" options={woredaOptions} selected={filters.woreda} onApply={setFilter("woreda")} />
        </span>
      ),
      cell: (a) => (
        <span className="flex flex-col">
          <span className="text-ink">{a.region}</span>
          <span className="text-[12.5px] text-muted">{a.woreda}</span>
        </span>
      ),
    },
    {
      key: "contact",
      header: "Contact",
      cell: (a) => (
        <span className="flex flex-col whitespace-nowrap">
          <a href={`tel:${a.phone.replace(/\s/g, "")}`} className="text-ink hover:text-brand-green">{a.phone}</a>
          <a href={`mailto:${a.email}`} className="text-[12.5px] text-muted hover:text-brand-green">{a.email}</a>
        </span>
      ),
    },
    { key: "updated", header: "Last Updated", cell: (a) => <span className="whitespace-nowrap">{advisorUpdatedDate(a)}</span> },
    { key: "action", header: "Action", align: "center", cell: (a) => <RowAction icon="view" href={`/advisors/${a.id}`}>View</RowAction> },
  ];

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[16px] font-semibold text-ink">Advisor directory</h2>
          {rows.length !== advisors.length && <span className="text-[13px] text-muted">{rows.length} of {advisors.length} advisors</span>}
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />
          <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
          <ExportButton
            disabled={rows.length === 0}
            onExport={(format) => {
              downloadTable(format, `advisors-report-${fileDate()}`, rows, EXPORT_COLUMNS, "Advisors report");
              setNotice(`Exported ${rows.length} advisor${rows.length === 1 ? "" : "s"} matching the current search and filters (${formatLabel(format)}).`);
            }}
          />
        </div>
      </div>

      {notice && <Banner tone="success" className="mx-4 mb-3" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <DataTable
        itemLabel="advisors"
        columns={columns}
        rows={rows}
        rowKey={(a) => a.id}
        minWidth="1100px"
        emptyTitle={advisors.length === 0 ? "No advisors listed yet" : "No advisors match the selected filters"}
        emptyHint={advisors.length === 0 ? "MoA subject-matter experts will appear here once the directory is published." : "Clear a filter or try a different search."}
      />

      <AdvancedFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        fields={filterFields}
        filters={filters}
        onApply={(next) =>
          setFilters({
            expertise: next.expertise ?? new Set(),
            region: next.region ?? new Set(),
            woreda: next.woreda ?? new Set(),
          })
        }
      />

    </Card>
  );
}
