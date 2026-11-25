"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { RowAction } from "@/components/ui/RowAction";
import { SearchInput } from "@/components/ui/SearchInput";
import { Switch } from "@/components/ui/Switch";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { AdvancedFiltersDrawer, type FilterFieldConfig, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { DEPARTMENTS, DEPARTMENT_TYPES, type Department } from "@/features/superadmin";
import { matchesQuery } from "@/lib/search";
import { DepartmentFormModal, type DepartmentFormValues } from "./DepartmentFormModal";
import { DepartmentViewModal } from "./DepartmentViewModal";
import { useScopeAreaNames } from "@/features/geo";

type FilterKey = "name" | "type" | "status" | "region";
type Filters = Record<FilterKey, Set<string>>;
const EMPTY: Filters = { name: new Set(), type: new Set(), status: new Set(), region: new Set() };

const statusLabel = (d: Department) => (d.active ? "Active" : "Inactive");

const optionsOf = (values: string[], order?: readonly string[]): FilterOption[] =>
  (order ?? [...new Set(values)]).map((value) => ({ value, label: value, count: values.filter((v) => v === value).length }));

type Dialog = { kind: "add" } | { kind: "view" | "edit" | "delete"; dept: Department } | null;

// Super Admin → Department: the directory of every department across all regions (mock data, held in local state).
export function DepartmentDirectory() {
  const [departments, setDepartments] = useState<Department[]>(DEPARTMENTS);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const setFilter = (key: FilterKey) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [key]: next }));
  const activeFilterCount = Object.values(filters).filter((s) => s.size > 0).length;

  const nameOptions = optionsOf(departments.map((d) => d.name));
  const typeOptions = optionsOf(departments.map((d) => d.type), DEPARTMENT_TYPES);
  const statusOptions = optionsOf(departments.map(statusLabel), ["Active", "Inactive"]);
  // Every Region from the geo Master Data, then those the rows hold.
  const regionNames = useScopeAreaNames("region", departments.map((d) => d.region));
  const regionOptions = optionsOf(departments.map((d) => d.region), regionNames);

  const rows = departments.filter(
    (d) =>
      matchesQuery(query, d) &&
      (filters.name.size === 0 || filters.name.has(d.name)) &&
      (filters.type.size === 0 || filters.type.has(d.type)) &&
      (filters.status.size === 0 || filters.status.has(statusLabel(d))) &&
      (filters.region.size === 0 || filters.region.has(d.region)),
  );

  const filterFields: FilterFieldConfig[] = [
    { key: "type", label: "Department type", allLabel: "All types", placeholder: "All Types", options: typeOptions },
    { key: "status", label: "Status", allLabel: "All statuses", placeholder: "All", options: statusOptions },
    { key: "region", label: "Region", allLabel: "All regions", placeholder: "All Regions", options: regionOptions },
  ];

  const nextCode = () => {
    const max = Math.max(...departments.map((d) => Number(d.code.slice(4)) || 0), 5316);
    return `DPT-${String(max + 1).padStart(5, "0")}`;
  };

  const add = (values: DepartmentFormValues) => {
    setDepartments((prev) => [{ id: `d${Date.now()}`, ...values }, ...prev]);
    setDialog(null);
    setNotice(`${values.name} was added.`);
  };
  const edit = (id: string, values: DepartmentFormValues) => {
    setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, ...values } : d)));
    setDialog(null);
    setNotice(`${values.name} was updated.`);
  };
  const toggle = (id: string, active: boolean) => setDepartments((prev) => prev.map((d) => (d.id === id ? { ...d, active } : d)));
  const remove = (dept: Department) => {
    setDepartments((prev) => prev.filter((d) => d.id !== dept.id));
    setDialog(null);
    setNotice(`${dept.name} was deleted.`);
  };

  const columns: Column<Department>[] = [
    { key: "name", header: <FilterDropdown label="Department Name" allLabel="All departments" options={nameOptions} selected={filters.name} onApply={setFilter("name")} />, cell: (d) => <span className="block max-w-[170px] py-4 font-semibold text-ink">{d.name}</span> },
    { key: "type", header: <FilterDropdown label="Department Type" allLabel="All types" options={typeOptions} selected={filters.type} onApply={setFilter("type")} />, cell: (d) => d.type },
    { key: "code", header: <span className="text-ink">Department Code</span>, cell: (d) => d.code },
    { key: "status", header: <FilterDropdown label="Status" allLabel="All statuses" options={statusOptions} selected={filters.status} onApply={setFilter("status")} />, cell: (d) => <Pill tone={d.active ? "green" : "red"}>{statusLabel(d)}</Pill>, align: "center" },
    {
      key: "action",
      header: <span className="text-ink">Action</span>,
      align: "center",
      cell: (d) => (
        <div className="flex items-center justify-center gap-2">
          <RowAction icon="view" onClick={() => setDialog({ kind: "view", dept: d })}>View</RowAction>
          <RowAction icon="edit" onClick={() => setDialog({ kind: "edit", dept: d })}>Edit</RowAction>
          <RowAction tone="danger" onClick={() => setDialog({ kind: "delete", dept: d })}>Delete</RowAction>
          <Switch checked={d.active} onChange={(v) => toggle(d.id, v)} label={`${d.active ? "Deactivate" : "Activate"} ${d.name}`} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Department"
        description="Manage departments across all regions"
        showDescription
        actions={
          <button
            type="button"
            onClick={() => setDialog({ kind: "add" })}
            className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-md bg-brand-green px-3.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-green-dark"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add Department
          </button>
        }
      />
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-ink">Department directory</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">View and manage departments across all regions.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
            <SearchInput value={query} onChange={setQuery} placeholder="Search Department name, code..." />
            <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
          </div>
        </div>
        <DataTable itemLabel="departments" columns={columns} rows={rows} rowKey={(d) => d.id} minWidth="900px" emptyTitle="No departments match" emptyHint="Clear a filter or try a different search." />
        <AdvancedFiltersDrawer
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          fields={filterFields}
          filters={filters as FilterSelection}
          onApply={(next) => setFilters({ name: filters.name, type: next.type ?? new Set(), status: next.status ?? new Set(), region: next.region ?? new Set() })}
        />
      </Card>

      {dialog?.kind === "add" && <DepartmentFormModal mode="add" suggestedCode={nextCode()} onClose={() => setDialog(null)} onSave={add} />}
      {dialog?.kind === "view" && <DepartmentViewModal department={dialog.dept} onClose={() => setDialog(null)} onEdit={() => setDialog({ kind: "edit", dept: dialog.dept })} />}
      {dialog?.kind === "edit" && <DepartmentFormModal mode="edit" initial={dialog.dept} suggestedCode="" onClose={() => setDialog(null)} onSave={(v) => edit(dialog.dept.id, v)} />}
      {dialog?.kind === "delete" && (
        <Modal
          isOpen
          onClose={() => setDialog(null)}
          title="Delete Department?"
          subtitle={`${dialog.dept.name} · ${dialog.dept.type} · ${dialog.dept.code}`}
          size="lg"
          bodyClassName="px-4 py-5 sm:px-6"
          footer={
            <>
              <Button variant="outline" onClick={() => setDialog(null)} className="px-6">Cancel</Button>
              <Button variant="danger" onClick={() => remove(dialog.dept)} className="px-6">Delete department</Button>
            </>
          }
        >
          <p className="text-[15px] leading-relaxed text-ink-soft">
            Are you sure you want to delete {dialog.dept.name} ({dialog.dept.code}) from the department directory?
          </p>
        </Modal>
      )}
    </>
  );
}
