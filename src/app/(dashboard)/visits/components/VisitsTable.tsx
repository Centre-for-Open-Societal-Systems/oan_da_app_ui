"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useAuthStore } from "@/store/useAuthStore";
import { Card } from "@/components/ui/Card";
import { tabClass } from "@/components/ui/PageTabs";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { SearchInput } from "@/components/ui/SearchInput";
import { DatePicker } from "@/components/ui/DatePicker";
import { EmptyState } from "@/components/ui/EmptyState";
import { RowAction } from "@/components/ui/RowAction";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { AdvancedFiltersDrawer, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { FarmerAvatar } from "@/features/farmers";
import { VisitStatusPill } from "@/features/visits";
import { VisitDetailsModal } from "@/features/visits";
import { RescheduleVisitModal } from "@/features/visits";
import { CancelVisitModal, canActOnVisit, canCancel, canLogOutcome, canReschedule, canStartVisit, listVisits, LogOutcomeModal, StartVisitModal, toVisitRecord, visitStatusLabel } from "@/features/visits";
import { Banner } from "@/components/ui/Banner";
import { cn } from "@/lib/utils";
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

// physical_status values in the order the Status filter lists them; any other value follows.
const STATUS_ORDER = ["Planned", "Confirmed", "In progress", "Physical Visit Complete", "Missed", "Rescheduled", "Cancelled", "Superseded"];


/** Filter options with counts from the loaded rows; `order` fixes the list (status), otherwise first-seen order. */
const optionsOf = (values: string[], order?: string[]): FilterOption[] =>
  (order ?? [...new Set(values)]).map((value) => ({ value, label: value, count: values.filter((v) => v === value).length }));

const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// With no day picked the table asks for everything the caller may see, up to the API maximum.
const ALL_DATES_LIMIT = 500;

interface VisitActionMenuProps {
  farmerName: string;
  onReschedule?: () => void;
  onCancel?: () => void;
}

function VisitActionMenu({ farmerName, onReschedule, onCancel }: VisitActionMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const onScrollOrResize = (e: Event) => {
      if (menuRef.current?.contains(e.target as Node)) return;
      setIsOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScrollOrResize, true);
    window.addEventListener("resize", onScrollOrResize);

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScrollOrResize, true);
      window.removeEventListener("resize", onScrollOrResize);
    };
  }, [isOpen]);

  if (!onReschedule && !onCancel) return null;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUpward = spaceBelow < 120 && rect.top > spaceBelow;
      const right = window.innerWidth - rect.right;

      setMenuStyle({
        position: "fixed",
        right: Math.max(12, right),
        minWidth: 165,
        zIndex: 120,
        ...(openUpward
          ? { bottom: window.innerHeight - rect.top + 4 }
          : { top: rect.bottom + 4 }),
      });
    }
    setIsOpen(true);
  };

  return (
    <div className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        aria-label={`More actions for visit with ${farmerName}`}
        title="More actions"
        className={cn(
          "inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-2xs transition-all duration-150 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus:ring-2 focus:ring-brand-green/30",
          isOpen && "border-brand-green bg-emerald-50 text-brand-green ring-2 ring-brand-green/20"
        )}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.75" />
          <circle cx="12" cy="12" r="1.75" />
          <circle cx="19" cy="12" r="1.75" />
        </svg>
      </button>

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={menuStyle}
            role="menu"
            aria-orientation="vertical"
            className="rounded-xl border border-slate-200/90 bg-white p-1 shadow-lg ring-1 ring-black/5 animate-dropdown-in"
          >
            {onReschedule && (
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onReschedule();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-slate-700 transition-colors hover:bg-slate-50 hover:text-ink text-left"
              >
                <svg
                  className="h-3.5 w-3.5 text-slate-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="5" width="18" height="16" rx="2" />
                  <path d="M8 3v4M16 3v4M3 10h18" />
                </svg>
                <span>Reschedule visit</span>
              </button>
            )}
            {onReschedule && onCancel && <div className="my-0.5 border-t border-slate-100" />}
            {onCancel && (
              <button
                type="button"
                role="menuitem"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                  onCancel();
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-1.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 text-left"
              >
                <svg
                  className="h-3.5 w-3.5 text-red-500"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
                <span>Cancel visit</span>
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}

export function VisitsTable() {
  // GET /visits is scoped by the backend: a DA gets every visit in their Kebeles, officers those in their scope.
  // A DA's list is narrowed to their own with da_id from /me.
  const isDA = useAuthStore((s) => s.role === "DA");
  const ownDaId = useAuthStore((s) => s.profile?.daId ?? null);
  const ownUser = useAuthStore((s) => s.user?.id ?? null);
  const me = { user: ownUser, daId: ownDaId };
  const daFilter = (isDA ? ownDaId : null) ?? undefined;
  const [date, setDate] = useState(isoToday);
  const [selectedDate, setSelectedDate] = useState(isoToday);
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
  const statuses = source.map(visitStatusLabel);
  const statusOptions = optionsOf(statuses, [...STATUS_ORDER.filter((s) => statuses.includes(s)), ...new Set(statuses.filter((s) => !STATUS_ORDER.includes(s)))]);
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
      (filters.status.size === 0 || filters.status.has(visitStatusLabel(v))) &&
      matchesQuery(query, v),
  );

  const { pageRows, paginationProps } = usePagination(rows);

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)} className="m-4 mb-0">{notice}</Banner>}

      {/* Top Filter Tabs (Today / All dates) styled identically to PageTabs */}
      <div role="tablist" aria-label="Visit date filters" className="flex w-full items-center border-b border-line bg-white overflow-x-auto no-scrollbar">
        <button
          type="button"
          role="tab"
          aria-selected={date === isoToday()}
          onClick={() => {
            setDate(isoToday());
            setSelectedDate(isoToday());
          }}
          className={tabClass(date === isoToday())}
        >
          Today
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={date === ""}
          onClick={() => setDate("")}
          className={tabClass(date === "")}
        >
          All dates
        </button>
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-2.5 sm:gap-3 p-3.5 sm:p-4 lg:flex-row lg:items-center lg:justify-between border-b border-line-soft">
        <div className="flex w-full items-center justify-between gap-2.5 sm:w-auto sm:justify-start sm:gap-3">
          <div className="flex items-center gap-2 shrink-0">
            <h2 className="text-[14px] sm:text-[15px] font-semibold text-ink">Visits</h2>
            {loaded && !loaded.error && (
              <span className="text-[12px] sm:text-[13px] text-muted">{loaded.total.toLocaleString()} total</span>
            )}
          </div>

          {/* Modern Animated Calendar Popover */}
          <DatePicker
            value={date}
            fallbackDate={selectedDate || isoToday()}
            onChange={(newDate) => {
              setDate(newDate);
              if (newDate) setSelectedDate(newDate);
            }}
            className="h-9 sm:h-10 min-w-[145px] sm:min-w-[160px]"
          />
        </div>

        <div className="flex w-full items-center gap-2 sm:gap-2.5 lg:w-auto lg:justify-end">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder={SEARCH_PLACEHOLDER}
            className="flex-1 min-w-0 sm:w-auto lg:w-[260px] xl:w-[280px] lg:flex-initial [&_input]:w-full"
          />

          <AdvancedFiltersButton
            activeCount={activeFilterCount}
            onClick={() => setIsFiltersOpen(true)}
            className="shrink-0 h-9 sm:h-10"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto green-scrollbar">
        <table className="w-full min-w-[880px] border-collapse text-left">
          <thead>
            <tr className="border-y border-line bg-surface text-[13.5px] sm:text-[14px] font-semibold text-slate-500">
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Date &amp; time</th>
              {/* A DA's own visits: no Agent column (it is always them); who assigned them lives on the Assignments page. */}
              {!isDA && (
                <th className="whitespace-nowrap px-4 py-3 font-semibold">
                  <FilterDropdown label="Agent" allLabel="All agents" options={agentOptions} selected={filters.agent} onApply={setFilter("agent")} />
                </th>
              )}
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Farmer</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">
                <FilterDropdown label="Kebele" allLabel="All kebeles" options={kebeleOptions} selected={filters.kebele} onApply={setFilter("kebele")} />
              </th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Visit type</th>
              <th className="whitespace-nowrap px-4 py-3 font-semibold">Purpose</th>
              <th className="whitespace-nowrap px-4 py-3 text-center font-semibold">
                <FilterDropdown label="Status" allLabel="All Status" options={statusOptions} selected={filters.status} onApply={setFilter("status")} />
              </th>
              <th className="whitespace-nowrap px-4 py-3 text-right font-semibold">Actions</th>
            </tr>
          </thead>
          <tbody className="text-[14px] text-slate-700">
            {loading && (
              <tr>
                <td colSpan={isDA ? 7 : 8} className="px-4 py-8 text-center text-[13.5px] text-muted">Loading visits…</td>
              </tr>
            )}
            {error && (
              <tr>
                <td colSpan={isDA ? 7 : 8} className="px-4 py-6"><EmptyState tone="error" title="Could not load visits" hint={error} /></td>
              </tr>
            )}
            {!loading && !error && rows.length === 0 && (
              <tr>
                <td colSpan={isDA ? 7 : 8} className="px-4 py-6">
                  {source.length === 0 ? (
                    <EmptyState title={date ? "No visits on this day" : "No visits yet"} hint={date ? "Pick another date, or plan a visit." : "Planned visits will show up here."} />
                  ) : (
                    <EmptyState title="No visits match the selected filters" hint="Clear a filter or try a different search." />
                  )}
                </td>
              </tr>
            )}
            {pageRows.map((v) => {
              const showLogOutcome = canLogOutcome(v);
              const showStart = canStartVisit(v) && canActOnVisit(v, isDA, me);
              const canResched = v.physicalStatus === undefined || canReschedule(v);
              const canCanc = canCancel(v) && canActOnVisit(v, isDA, me);
              const hasMoreActions = canResched || canCanc;

              return (
                <tr key={v.id} className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface">
                  <td className="whitespace-nowrap px-4 py-3.5 leading-tight">
                    <span className="font-medium text-ink">{v.date}</span>
                    <br />
                    <span className="text-[13px] text-slate-500">- {v.time}</span>
                  </td>
                  {!isDA && <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">{v.agent}</td>}
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-2.5">
                      <FarmerAvatar name={v.farmerName} avatar={v.farmerAvatar} />
                      <div className="min-w-0 leading-tight">
                        <p className="max-w-[150px] sm:max-w-[200px] truncate font-medium text-ink" title={v.farmerName}>{v.farmerName}</p>
                        {v.farmerEmail && <p className="mt-0.5 max-w-[150px] sm:max-w-[200px] truncate text-[13px] text-muted" title={v.farmerEmail}>{v.farmerEmail}</p>}
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">{v.kebele}</td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-slate-700">{v.visitType ?? "—"}</td>
                  <td className="px-4 py-3.5 max-w-[220px] sm:max-w-[280px]">
                    <p className="line-clamp-2 text-[13.5px] leading-snug text-slate-700" title={v.purpose}>
                      {v.purpose}
                    </p>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-center">
                    <VisitStatusPill status={visitStatusLabel(v)} />
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1.5 sm:gap-2">
                      {showLogOutcome && (
                        <RowAction tone="solid" icon="edit" onClick={() => setModal({ type: "outcome", visit: v })}>
                          Log outcome
                        </RowAction>
                      )}
                      {showStart && (
                        <RowAction tone="solid" icon="check" onClick={() => setModal({ type: "start", visit: v })}>
                          Start
                        </RowAction>
                      )}
                      <RowAction onClick={() => setModal({ type: "view", visit: v })} icon="view">
                        View
                      </RowAction>
                      {hasMoreActions && (
                        <VisitActionMenu
                          farmerName={v.farmerName}
                          onReschedule={canResched ? () => setModal({ type: "reschedule", visit: v }) : undefined}
                          onCancel={canCanc ? () => setModal({ type: "cancel", visit: v }) : undefined}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
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
          canReschedule={modal.visit.physicalStatus === undefined || canReschedule(modal.visit)}
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
