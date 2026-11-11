"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { SEGMENTS, segmentName, useBeneficiariesStore } from "@/features/beneficiaries";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuthStore } from "@/store/useAuthStore";
import { ExportButton } from "@/components/ui/ExportButton";
import { cn } from "@/lib/utils";
import { ALL_FARMERS_SEARCH, apiFarmerToFarmer, describeFarmerError, listFarmers, MAX_BATCH_FARMERS, PlanVisitModal } from "@/features/farmers";
import { FarmerAvatar } from "@/features/farmers";
import { farmerActivity, StatusPill } from "@/features/farmers";
import {
  applyFilters,
  countActiveFilters,
  EMPTY_FILTERS,
  type FarmerFilters,
  type FilterOption,
} from "@/features/farmers";
import type { FilterFieldConfig } from "@/components/ui/AdvancedFiltersDrawer";
import { Checkbox } from "@/components/ui/Checkbox";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { AdvancedFiltersDrawer } from "@/components/ui/AdvancedFiltersDrawer";

import { PAGE_SIZES, TablePagination } from "@/components/ui/TablePagination";
import { Spinner } from "@/components/ui/Spinner";
import { RowAction } from "@/components/ui/RowAction";
import { Banner } from "@/components/ui/Banner";
import { fileDate, type CsvColumn } from "@/lib/download";
import { downloadTable, formatLabel } from "@/lib/export";
import type { Farmer } from "@/features/farmers";

const SEARCH_DEBOUNCE_MS = 400;

const STATUS_ORDER = ["Active", "Inactive"];

/** Filter options with counts from the loaded rows; `order` fixes the list, otherwise first-seen order. */
const optionsOf = (values: string[], order?: string[]): FilterOption[] =>
  (order ?? [...new Set(values)]).map((value) => ({ value, label: value, count: values.filter((v) => v === value).length }));

const SEARCH_PLACEHOLDER = "Search name, Farmer-ID or phone…";

// The visible table columns (Farmer Details split into name / email / phone).
const EXPORT_COLUMNS: CsvColumn<Farmer>[] = [
  { header: "Farmer ID", value: (f) => f.id },
  { header: "Name", value: (f) => f.name },
  { header: "Email", value: (f) => f.email },
  { header: "Phone", value: (f) => f.phone },
  { header: "Kebele", value: (f) => f.kebele },
  { header: "Woreda", value: (f) => f.woreda },
  { header: "Crop", value: (f) => f.crop },
  { header: "Land (ha)", value: (f) => (f.landUnknown ? "" : f.landHa) },
  { header: "Livestock", value: (f) => f.livestock },
  { header: "Livestock (heads)", value: (f) => f.livestockHeads },
  { header: "Approved Date", value: (f) => `${f.registeredAt} ${f.registeredTime}` },
  { header: "Status", value: (f) => farmerActivity(f.status) },
  { header: "Status reason", value: (f) => f.statusReason ?? "" },
];

export function FarmersTable() {
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [filters, setFilters] = useState<FarmerFilters>(EMPTY_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [notice, setNotice] = useState<ReactNode>(null);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [segmentId, setSegmentId] = useState(SEGMENTS[0].id);
  const linkBeneficiaries = useBeneficiariesStore((s) => s.link);
  const role = useAuthStore((s) => s.role);
  const isDA = role === "DA";
  // POST /visits is open to DA, Supervisor and Admin; the Executive only reads.
  const canPlanVisit = role === "DA" || role === "Supervisor" || role === "Admin";
  const [isBatchOpen, setIsBatchOpen] = useState(false);
  // GET /farmers is scoped by the backend: a DA gets farmers in their kebele, a supervisor in their woreda, Admin all.
  // Search and paging run on the server; the column filters only narrow the page on screen.
  const [loaded, setLoaded] = useState<{ key: string; rows: Farmer[]; total: number; error: string | null } | null>(null);
  const [searchText, setSearchText] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  // One request per pause in typing, not per key press.
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearchText(query);
      setPage(1);
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    let current = true;
    const key = `${searchText}|${page}|${pageSize}`;
    listFarmers({ searchText, page, pageSize })
      .then(({ items, total }) => current && setLoaded({ key, rows: items.map(apiFarmerToFarmer), total, error: null }))
      .catch((err: unknown) => current && setLoaded({ key, rows: [], total: 0, error: describeFarmerError(err) }));
    return () => {
      current = false;
    };
  }, [searchText, page, pageSize]);

  // The first call after a while can take ~20 s, so the table shows a loading row until the page arrives.
  const loading = loaded === null || loaded.key !== `${searchText}|${page}|${pageSize}`;
  const source = loading ? [] : loaded.rows;

  const kebeleOptions = optionsOf(source.map((f) => f.kebele));
  const statusOptions = optionsOf(source.map((f) => farmerActivity(f.status)), STATUS_ORDER);
  const filterFields: FilterFieldConfig[] = [
    { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All", options: kebeleOptions },
    { key: "status", label: "Status", allLabel: "All Status", placeholder: "All Status", options: statusOptions },
  ];

  const selectedFarmers = source.filter((f) => selected.has(f.id));

  const addToBeneficiaries = () => {
    const { added, skipped } = linkBeneficiaries(selectedFarmers, segmentId);
    const parts = [
      added.length > 0 && `${added.length} farmer${added.length === 1 ? "" : "s"} added to “${segmentName(segmentId)}” — Pending verification.`,
      skipped.length > 0 && `Already in this segment: ${skipped.join(", ")}.`,
    ].filter(Boolean);
    setNotice(
      <>
        {parts.join(" ")}{" "}
        <Link href="/beneficiaries" className="font-semibold underline">View beneficiaries</Link>
      </>,
    );
    setSelected(new Set());
    setIsAddOpen(false);
  };

  const rows = applyFilters(source, filters);
  const activeFilterCount = countActiveFilters(filters);
  const paginationProps = {
    page,
    pageSize,
    total: loaded?.total ?? 0,
    onPageChange: setPage,
    onPageSizeChange: (size: number) => {
      setPageSize(size);
      setPage(1);
    },
  };
  const allSelected = rows.length > 0 && rows.every((f) => selected.has(f.id));

  const setColumnFilter = (key: keyof FarmerFilters) => (next: Set<string>) =>
    setFilters((prev) => ({ ...prev, [key]: next }));

  const toggleAll = () =>
    setSelected(allSelected ? new Set() : new Set(rows.map((f) => f.id)));

  const toggleOne = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-2.5">
          <h2 className="text-[15px] font-semibold text-ink">My Farmers</h2>
          {loaded && !loaded.error && <span className="text-[13px] text-muted">{loaded.total.toLocaleString()} total</span>}
          <span className="flex h-6 min-w-6 items-center justify-center rounded-full bg-brand-green px-1.5 text-[12px] font-semibold text-white">
            {selected.size}
          </span>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />

          <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />

          {canPlanVisit && (
            <Button
              variant="brandOutline"
              size="md"
              disabled={selectedFarmers.length === 0 || selected.size > MAX_BATCH_FARMERS}
              title={selected.size > MAX_BATCH_FARMERS ? `You can select up to ${MAX_BATCH_FARMERS} farmers for a batch visit` : selected.size === 0 ? `Select 1 to ${MAX_BATCH_FARMERS} farmers to plan a batch visit` : undefined}
              onClick={() => setIsBatchOpen(true)}
            >
              Plan a visit (Batch){selected.size > 0 ? ` (${selected.size})` : ""}
            </Button>
          )}

          {selected.size > 0 && (
            <Button variant="brand" size="md" onClick={() => { setSegmentId(SEGMENTS[0].id); setIsAddOpen(true); }}>
              Add to beneficiaries ({selected.size})
            </Button>
          )}

          <ExportButton
            disabled={rows.length === 0}
            onExport={(format) => {
              downloadTable(format, `farmers-report-${fileDate()}`, rows, EXPORT_COLUMNS, "Farmers report");
              setNotice(`Exported ${rows.length} farmer${rows.length === 1 ? "" : "s"} matching the current search and filters (${formatLabel(format)}).`);
            }}
          />
        </div>
      </div>

      {loaded?.error && (
        <Banner tone="error" title="Farmers could not be loaded" className="mx-4 mb-3">
          {loaded.error}
        </Banner>
      )}
      {notice && <Banner tone="success" className="mx-4 mb-3" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      {canPlanVisit && selected.size > MAX_BATCH_FARMERS && (
        <Banner tone="warning" className="mx-4 mb-3">You can select up to {MAX_BATCH_FARMERS} farmers for a batch visit. Unselect {selected.size - MAX_BATCH_FARMERS} to plan it.</Banner>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1020px] border-collapse text-left">
          <thead>
            <tr className="border-y border-line bg-surface text-[14px] font-semibold text-slate-500">
              <th className="w-14 px-4 py-3 align-middle">
                <Checkbox checked={allSelected} onChange={toggleAll} aria-label="Select all farmers" />
              </th>
              <th className="px-4 py-3 font-semibold">Farmer Details</th>
              <th className="px-4 py-3 font-semibold">
                <FilterDropdown label="Kebele" allLabel="All kebeles" options={kebeleOptions} selected={filters.kebele} onApply={setColumnFilter("kebele")} />
              </th>
              <th className="px-4 py-3 font-semibold">Land</th>
              <th className="px-4 py-3 text-center font-semibold">Plots</th>
              <th className="px-4 py-3 text-center font-semibold">Approved Date</th>
              <th className="px-4 py-3 text-center font-semibold">
                <FilterDropdown label="Status" allLabel="All Status" options={statusOptions} selected={filters.status} onApply={setColumnFilter("status")} />
              </th>
              <th className="px-4 py-3 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="text-[14px] text-slate-700">
            {loading && (
              <tr>
                <td colSpan={8} className="px-4 py-10 text-center text-[13.5px] text-muted">
                  <Spinner className="mx-auto mb-2 h-5 w-5" />
                  Loading farmers… the first load can take up to 20 seconds.
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && !loaded?.error && (
              <tr>
                <td colSpan={8} className="px-4 py-6">
                  {source.length === 0 ? (
                    <EmptyState title={searchText && searchText !== ALL_FARMERS_SEARCH ? "No farmers match your search" : isDA ? "No farmer assigned" : "No farmers in your area yet"} hint={searchText && searchText !== ALL_FARMERS_SEARCH ? "Try a name, a Farmer-ID or a phone number." : isDA ? "Farmers your supervisor assigns to you appear here." : "Approved farmers in your scope appear here."} />
                  ) : (
                    <EmptyState title="No farmers match the selected filters" hint="Clear a filter or try a different search." />
                  )}
                </td>
              </tr>
            )}
            {rows.map((farmer) => {
              const isSelected = selected.has(farmer.id);
              return (
                <tr
                  key={farmer.id}
                  className={cn(
                    "border-b border-line-soft transition-colors last:border-0",
                    isSelected ? "bg-brand-wash" : "hover:bg-surface",
                  )}
                >
                  <td className="w-14 px-4 py-3.5 align-middle">
                    <Checkbox
                      checked={isSelected}
                      onChange={() => toggleOne(farmer.id)}
                      aria-label={`Select ${farmer.name}`}
                    />
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <FarmerAvatar name={farmer.name} avatar={farmer.avatar} />
                      <div className="leading-tight">
                        <p className="font-medium text-ink">{farmer.name}</p>
                        <p className="mt-0.5 text-[13px] text-muted">{[farmer.regId, farmer.phone || "—"].filter(Boolean).join(" · ")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3.5 leading-tight">
                    {farmer.kebele}
                    <p className="mt-0.5 text-[13px] text-muted">{[farmer.woreda, farmer.region].filter(Boolean).join(", ")}</p>
                  </td>
                  <td className="px-4 py-3.5">{farmer.landUnknown ? "—" : `${farmer.landHa} ha`}</td>
                  <td className="px-4 py-3.5 text-center">{farmer.plotsUnknown ? "—" : farmer.totalPlots}</td>
                  <td className="px-4 py-3.5 text-center leading-tight">
                    {farmer.registeredAt}
                    <br />
                    {farmer.registeredTime && <span className="text-slate-600">- {farmer.registeredTime}</span>}
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <StatusPill status={farmerActivity(farmer.status)} reason={farmer.statusReason} />
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <RowAction href={`/farmers/${farmer.regId ?? farmer.id}`} icon="view">View</RowAction>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TablePagination {...paginationProps} itemLabel="farmers" />

      <AdvancedFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        fields={filterFields}
        filters={filters}
        onApply={(next) =>
          setFilters({
            ...EMPTY_FILTERS,
            kebele: next.kebele ?? new Set(),
            status: next.status ?? new Set(),
          })
        }
      />

      {isBatchOpen && <PlanVisitModal farmers={selectedFarmers} isOpen onClose={() => setIsBatchOpen(false)} />}

      <Modal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        title="Add to Beneficiaries"
        subtitle={`${selectedFarmers.length} farmer${selectedFarmers.length === 1 ? "" : "s"} selected`}
        footer={<><Button variant="outline" onClick={() => setIsAddOpen(false)}>Cancel</Button><Button variant="brand" onClick={addToBeneficiaries}>Add</Button></>}
      >
        <div className="flex flex-col gap-4">
          <FormField label="Segment" htmlFor="bulk-segment" required hint="Membership is verified against the segment rule before enrolment.">
            <Select id="bulk-segment" value={segmentId} onChange={(e) => setSegmentId(e.target.value)}>
              {SEGMENTS.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </Select>
          </FormField>
          <div>
            <p className="text-[14px] font-medium text-ink">Farmers</p>
            <ul className="mt-2 flex max-h-[220px] flex-col gap-2 overflow-y-auto">
              {selectedFarmers.map((f) => (
                <li key={f.id} className="flex items-center gap-2.5 text-[14px]">
                  <FarmerAvatar name={f.name} avatar={f.avatar} />
                  <span className="text-ink">{f.name}</span>
                  <span className="text-[13px] text-muted">{f.kebele} · {f.crop} · {f.livestock}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Modal>
    </Card>
  );
}
