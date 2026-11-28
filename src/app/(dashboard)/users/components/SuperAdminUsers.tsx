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
import { DEFAULT_ROLE_NAMES, SA_USERS, coverageOf, type SuperAdminUser } from "@/features/superadmin";
import { matchesQuery } from "@/lib/search";
import { SuperAdminUserFormModal, type UserFormValues } from "./SuperAdminUserFormModal";
import { SuperAdminUserViewModal } from "./SuperAdminUserViewModal";
import { useScopeAreaNames } from "@/features/geo";

type FilterKey = "role" | "status" | "region";
type Filters = Record<FilterKey, Set<string>>;
const EMPTY: Filters = { role: new Set(), status: new Set(), region: new Set() };

const statusLabel = (u: SuperAdminUser) => (u.active ? "Active" : "Inactive");

const optionsOf = (values: string[], order?: readonly string[]): FilterOption[] =>
  (order ?? [...new Set(values)]).map((value) => ({ value, label: value, count: values.filter((v) => v === value).length }));

type Dialog = { kind: "add" } | { kind: "view" | "edit" | "delete"; user: SuperAdminUser } | null;

// Super Admin → Users: every portal user with their role and coverage (mock data, held in local state).
export function SuperAdminUsers() {
  const [users, setUsers] = useState<SuperAdminUser[]>(SA_USERS);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<Filters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [dialog, setDialog] = useState<Dialog>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const setFilter = (key: FilterKey) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [key]: next }));
  const activeFilterCount = Object.values(filters).filter((s) => s.size > 0).length;

  const roleOptions = optionsOf(users.map((u) => u.role), DEFAULT_ROLE_NAMES);
  const statusOptions = optionsOf(users.map(statusLabel), ["Active", "Inactive"]);
  // Every Region from the geo Master Data, then those the rows hold.
  const regionNames = useScopeAreaNames("region", users.map((u) => u.region));
  const regionOptions = optionsOf(users.map((u) => u.region), regionNames);

  const rows = users.filter(
    (u) =>
      matchesQuery(query, { ...u, coverage: coverageOf(u) }) &&
      (filters.role.size === 0 || filters.role.has(u.role)) &&
      (filters.status.size === 0 || filters.status.has(statusLabel(u))) &&
      (filters.region.size === 0 || filters.region.has(u.region)),
  );

  const filterFields: FilterFieldConfig[] = [
    { key: "role", label: "Organizational role", allLabel: "All roles", placeholder: "All Roles", options: roleOptions },
    { key: "status", label: "Status", allLabel: "All statuses", placeholder: "All", options: statusOptions },
    { key: "region", label: "Region", allLabel: "All regions", placeholder: "All Regions", options: regionOptions },
  ];

  const nextCode = () => {
    const max = Math.max(...users.map((u) => Number(u.code.slice(7)) || 0), 0);
    return `USR-ET-${String(max + 1).padStart(4, "0")}`;
  };

  const add = (values: UserFormValues) => {
    setUsers((prev) => [{ id: `u${Date.now()}`, ...values }, ...prev]);
    setDialog(null);
    setNotice(`${values.name} was added.`);
  };
  const edit = (id: string, values: UserFormValues) => {
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, ...values } : u)));
    setDialog(null);
    setNotice(`${values.name} was updated.`);
  };
  const toggle = (id: string, active: boolean) => setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, active } : u)));
  const remove = (user: SuperAdminUser) => {
    setUsers((prev) => prev.filter((u) => u.id !== user.id));
    setDialog(null);
    setNotice(`${user.name} was deleted.`);
  };

  const columns: Column<SuperAdminUser>[] = [
    { key: "name", header: <span className="text-ink">User Name</span>, cell: (u) => <span className="whitespace-nowrap font-semibold text-ink">{u.name}</span> },
    { key: "code", header: <span className="text-ink">User Code</span>, cell: (u) => <span className="whitespace-nowrap">{u.code}</span> },
    { key: "role", header: <FilterDropdown label="Organizational Role" allLabel="All roles" options={roleOptions} selected={filters.role} onApply={setFilter("role")} />, cell: (u) => u.role },
    { key: "coverage", header: <span className="text-ink">Coverage</span>, cell: (u) => <span className="block max-w-[230px] py-2">{coverageOf(u)}</span> },
    { key: "status", header: <FilterDropdown label="Status" allLabel="All statuses" options={statusOptions} selected={filters.status} onApply={setFilter("status")} />, cell: (u) => <Pill tone={u.active ? "green" : "red"}>{statusLabel(u)}</Pill>, align: "center" },
    {
      key: "action",
      header: <span className="text-ink">Action</span>,
      align: "center",
      cell: (u) => (
        <div className="flex items-center justify-center gap-2">
          <RowAction icon="view" onClick={() => setDialog({ kind: "view", user: u })}>View</RowAction>
          <RowAction icon="edit" onClick={() => setDialog({ kind: "edit", user: u })}>Edit</RowAction>
          <RowAction tone="danger" onClick={() => setDialog({ kind: "delete", user: u })}>Delete</RowAction>
          <Switch checked={u.active} onChange={(v) => toggle(u.id, v)} label={`${u.active ? "Deactivate" : "Activate"} ${u.name}`} />
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        title="Users"
        description="Manage users, roles and access"
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
            Add User
          </button>
        }
      />
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <h2 className="text-[15px] font-semibold text-ink">Users directory</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">View and manage users across all regions.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center lg:shrink-0">
            <SearchInput value={query} onChange={setQuery} placeholder="Search User name, code..." />
            <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
          </div>
        </div>
        <DataTable itemLabel="users" columns={columns} rows={rows} rowKey={(u) => u.id} minWidth="1000px" emptyTitle="No users match" emptyHint="Clear a filter or try a different search." />
        <AdvancedFiltersDrawer
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          fields={filterFields}
          filters={filters as FilterSelection}
          onApply={(next) => setFilters({ role: next.role ?? new Set(), status: next.status ?? new Set(), region: next.region ?? new Set() })}
        />
      </Card>

      {dialog?.kind === "add" && <SuperAdminUserFormModal mode="add" suggestedCode={nextCode()} onClose={() => setDialog(null)} onSave={add} />}
      {dialog?.kind === "view" && <SuperAdminUserViewModal user={dialog.user} onClose={() => setDialog(null)} onEdit={() => setDialog({ kind: "edit", user: dialog.user })} />}
      {dialog?.kind === "edit" && <SuperAdminUserFormModal mode="edit" initial={dialog.user} suggestedCode="" onClose={() => setDialog(null)} onSave={(v) => edit(dialog.user.id, v)} />}
      {dialog?.kind === "delete" && (
        <Modal
          isOpen
          onClose={() => setDialog(null)}
          title="Delete User?"
          subtitle={`${dialog.user.name} · ${dialog.user.role} · ${dialog.user.code}`}
          size="lg"
          bodyClassName="px-4 py-5 sm:px-6"
          footer={
            <>
              <Button variant="outline" onClick={() => setDialog(null)} className="px-6">Cancel</Button>
              <Button variant="danger" onClick={() => remove(dialog.user)} className="px-6">Delete user</Button>
            </>
          }
        >
          <p className="text-[15px] leading-relaxed text-ink-soft">
            Are you sure you want to delete {dialog.user.name} ({dialog.user.code}) from the users directory?
          </p>
        </Modal>
      )}
    </>
  );
}
