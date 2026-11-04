"use client";

import { useEffect, useState } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { Card } from "@/components/ui/Card";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowAction } from "@/components/ui/RowAction";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { AdvancedFiltersDrawer, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { Input } from "@/components/ui/Input";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { FarmerAvatar } from "@/features/farmers";
import { VisitStatusPill } from "@/features/visits";
import { VisitDetailsModal } from "@/features/visits";
import { RescheduleVisitModal } from "@/features/visits";
import { CancelVisitModal, canActOnVisit, canCancel, canLogOutcome, canReschedule, canStartVisit, listVisits, LogOutcomeModal, StartVisitModal, toVisitRecord } from "@/features/visits";
import { Banner } from "@/components/ui/Banner";
import type { VisitRecord } from "@/features/visits";
import type { FilterFieldConfig } from "@/components/ui/AdvancedFiltersDrawer";

const SEARCH_PLACEHOLDER = searchPlaceholder(["Date & time", "Agent", "Farmer", "Kebele", "Purpose", "Status"]);

interface VisitFilters extends FilterSelection {
  agent: Set<string>;
  kebele: Set<string>;
  status: Set<string>;
}

const EMPTY: VisitFilters = { agent: new Set(), kebele: new Set(), status: new Set() };

type ActiveModal = { type: "view" | "reschedule" | "start" | "outcome" | "cancel"; visit: VisitRecord } | null;

const STATUS_ORDER = ["Confirmed", "Planned", "Completed", "Missed"];

/** Filter options with counts from the loaded rows; `order` fixes the list (status), otherwise first-seen order. */
const optionsOf = (values: string[], order?: string[]): FilterOption[] =>
  (order ?? [...new Set(values)]).map((value) => ({ value, label: value, count: values.filter((v) => v === value).length }));

const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// With no day picked the table asks for everything the caller may see, up to the API maximum.
const ALL_DATES_LIMIT = 500;

export function VisitsTable() {
  // GET /visits is scoped by the backend: a DA gets every visit in their Kebeles, officers those in their scope.
  // A DA's list is narrowed to their own with da_id from /me.
  const isDA = useAuthStore((s) => s.role === "DA");
  const ownDaId = useAuthStore((s) => s.profile?.daId ?? null);
  const daFilter = (isDA ? ownDaId : null) ?? undefined;
  const [date, setDate] = useState(isoToday);
  // Rows and the day they were loaded for; a mismatch means a newer day is loading.
  // Bumped after a reschedule: the new visit may be on another day, so the list is read again.
  const [reload, setReload] = useState(0);
  const key = `${date}:${reload}`;
  const [loaded, setLoaded] = useState<{ key: string; rows: VisitRecord[]; total: number; error: string | null } | null>(null);

  useEffect(() => {
    let current = true;
    listVisits(date ? { date, da_id: daFilter } : { da_id: daFilter, limit: ALL_DATES_LIMIT })
      .then(({ items, total }) => current && setLoaded({ key, rows: items.map(toVisitRecord), total, error: null }))
      .catch((err: unknown) => current && setLoaded({ key, rows: [], total: 0, error: err instanceof Error ? err.message : "Could not load visits." }));
    return () => {
      current = false;
    };
  }, [date, key, daFilter]);

  // Swap in the backend's copy of a visit after an action on it, and close the dialog.
  const replaceRow = (visit: Parameters<typeof toVisitRecord>[0]) => {
    const row = toVisitRecord(visit);
    setLoaded((prev) => (prev ? { ...prev, rows: prev.rows.map((r) => (r.id === row.id ? row : r)) } : prev));
    setModal(null);
    return row;
  };

  // A reload keeps the rows on screen until the fresh list arrives.
  const loading = !loaded || (loaded.key !== key && !loaded.key.startsWith(`${date}:`));
  const source = loading ? [] : loaded.rows;
  const error = loading ? null : loaded.error;
  const agentOptions = optionsOf(source.map((v) => v.agent));
  const kebeleOptions = optionsOf(source.map((v) => v.kebele));
  const statusOptions = optionsOf(source.map((v) => v.status), STATUS_ORDER);
  const filterFields: FilterFieldConfig[] = [
    ...(isDA ? [] : [{ key: "agent", label: "Agent", allLabel: "All agents", placeholder: "All Agent", options: agentOptions }]),
    { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All Kebele", options: kebeleOptions },
    { key: "status", label: "Status", allLabel: "All Status", placeholder: "All", options: statusOptions },
  ];
  const [filters, setFilters] = useState<VisitFilters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [modal, setModal] = useState<ActiveModal>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;

  const setFilter = (key: keyof VisitFilters) => (next: Set<string>) =>
    setFilters((prev) => ({ ...prev, [key]: next }));

  const rows = source.filter(
    (v) =>
      (filters.agent.size === 0 || filters.agent.has(v.agent)) &&
      (filters.kebele.size === 0 || filters.kebele.has(v.kebele)) &&
      (filters.status.size === 0 || filters.status.has(v.status)) &&
      matchesQuery(query, v),
  );

  const { pageRows, paginationProps } = usePagination(rows);

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)} className="m-4 mb-0">{notice}</Banner>}
      {/* Toolbar */}
      <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-3">
          <h2 className="text-[15px] font-semibold text-ink">Visits</h2>
          <Input type="date" aria-label="Visit date" value={date} onChange={(e) => setDate(e.target.value)} className="h-9 w-[160px] text-[13.5px]" />
          {date ? (
            <button type="button" onClick={() => setDate("")} className="text-[13px] font-semibold text-brand-green hover:underline">All dates</button>
          ) : (
            <button type="button" onClick={() => setDate(isoToday())} className="text-[13px] font-semibold text-brand-green hover:underline">Today</button>
          )}
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />

          <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead>
            <tr className="border-y border-line bg-surface text-[14px] font-semibold text-slate-500">
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Date &amp; time</th>
              {/* A DA's own visits: no Agent column (it is always them); who assigned them lives on the Assignments page. */}
              {!isDA && (
                <th className="px-4 py-3 font-semibold">
                  <FilterDropdown label="Agent" allLabel="All agents" options={agentOptions} selected={filters.agent} onApply={setFilter("agent")} />
                </th>
              )}
              <th className="px-4 py-3 font-semibold">Farmer</th>
              <th className="px-4 py-3 font-semibold">
                <FilterDropdown label="Kebele" allLabel="All kebeles" options={kebeleOptions} selected={filters.kebele} onApply={setFilter("kebele")} />
              </th>
              <th className="px-4 py-3 font-semibold">Purpose</th>
              <th className="px-4 py-3 text-center font-semibold">
                <FilterDropdown label="Status" allLabel="All Status" options={statusOptions} selected={filters.status} onApply={setFilter("status")} />
              </th>
              <th className="px-4 py-3 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="text-[14px] text-slate-700">
            {loading && (
              <tr>
                <td colSpan={isDA ? 6 : 7} className="px-4 py-8 text-center text-[13.5px] text-muted">Loading visits…</td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={isDA ? 6 : 7} className="px-4 py-6"><EmptyState tone="error" title="Could not load visits" hint={error} /></td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={isDA ? 6 : 7} className="px-4 py-6">
                  {source.length === 0 ? (
                    <EmptyState title={date ? "No visits on this day" : "No visits yet"} hint={date ? "Pick another date, or plan a visit." : "Planned visits will show up here."} />
                  ) : (
                    <EmptyState title="No visits match the selected filters" hint="Clear a filter or try a different search." />
                  )}
                </td>
              </tr>
            )}
            {pageRows.map((v) => (
              <tr key={v.id} className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface">
                <td className="px-4 py-3.5 leading-tight">
                  {v.date}
                  <br />
                  <span className="text-slate-600">- {v.time}</span>
                </td>
                {!isDA && <td className="px-4 py-3.5">{v.agent}</td>}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <FarmerAvatar name={v.farmerName} avatar={v.farmerAvatar} />
                    <div className="leading-tight">
                      <p className="font-medium text-ink">{v.farmerName}</p>
                      {v.farmerEmail && <p className="mt-0.5 text-[13px] text-muted">{v.farmerEmail}</p>}
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3.5">{v.kebele}</td>
                <td className="px-4 py-3.5">{v.purpose}</td>
                <td className="px-4 py-3.5 text-center">
                  <VisitStatusPill status={v.status} />
                  {v.physicalStatus === "In progress" && <p className="mt-1 text-[12px] font-medium text-blue-600">In progress</p>}
                  {(v.physicalStatus === "Cancelled" || v.physicalStatus === "Rescheduled") && <p className="mt-1 text-[12px] font-medium text-muted">{v.physicalStatus}</p>}
                </td>
                <td className="px-4 py-3.5">
                  <div className="flex items-center justify-center gap-2">
                    {canLogOutcome(v) && (
                      <RowAction tone="solid" icon="edit" onClick={() => setModal({ type: "outcome", visit: v })}>Log outcome</RowAction>
                    )}
                    {canStartVisit(v) && canActOnVisit(v, isDA, ownDaId) && (
                      <RowAction tone="solid" icon="check" onClick={() => setModal({ type: "start", visit: v })}>Start</RowAction>
                    )}
                    <RowAction onClick={() => setModal({ type: "view", visit: v })} icon="view">View</RowAction>
                    {(v.physicalStatus === undefined || canReschedule(v)) && (
                      <RowAction tone="neutral" icon="calendar" onClick={() => setModal({ type: "reschedule", visit: v })}>Reschedule</RowAction>
                    )}
                    {canCancel(v) && canActOnVisit(v, isDA, ownDaId) && (
                      <RowAction tone="danger" icon="remove" onClick={() => setModal({ type: "cancel", visit: v })}>Cancel</RowAction>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <TablePagination {...paginationProps} itemLabel="visits" />

      <AdvancedFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        fields={filterFields}
        filters={filters}
        onApply={(next) =>
          setFilters({
            agent: next.agent ?? new Set(),
            kebele: next.kebele ?? new Set(),
            status: next.status ?? new Set(),
          })
        }
      />

      {modal?.type === "view" && (
        <VisitDetailsModal
          visit={modal.visit}
          onClose={() => setModal(null)}
          onReschedule={(visit) => setModal({ type: "reschedule", visit })}
        />
      )}
      {modal?.type === "reschedule" && (
        <RescheduleVisitModal
          visit={modal.visit}
          onClose={() => setModal(null)}
          onRescheduled={(moved) => {
            const row = toVisitRecord(moved);
            setModal(null);
            setReload((r) => r + 1);
            setNotice(`Visit moved to ${row.date}, ${row.time} as ${row.id}. The old visit is kept as Rescheduled.`);
          }}
        />
      )}
      {modal?.type === "cancel" && (
        <CancelVisitModal
          visit={modal.visit}
          onClose={() => setModal(null)}
          onCancelled={(cancelled) => {
            const row = replaceRow(cancelled);
            setNotice(`Visit ${row.id} with ${row.farmerName} is cancelled.`);
          }}
        />
      )}
      {modal?.type === "start" && (
        <StartVisitModal
          visit={modal.visit}
          onClose={() => setModal(null)}
          onStarted={(started) => {
            const row = replaceRow(started);
            setNotice(`Checked in for ${row.farmerName} (${row.id}). The visit is now in progress; log the outcome when you are done.`);
          }}
        />
      )}
      {modal?.type === "outcome" && (
        <LogOutcomeModal
          visit={modal.visit}
          onClose={() => setModal(null)}
          onSubmitted={(closed) => {
            const row = replaceRow(closed);
            setNotice(`Outcome submitted for ${row.farmerName} (${row.id}). The visit is complete.`);
          }}
        />
      )}
    </Card>
  );
}
