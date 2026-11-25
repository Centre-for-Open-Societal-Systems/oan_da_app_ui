"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { AdvancedFiltersDrawer, type FilterFieldConfig } from "@/components/ui/AdvancedFiltersDrawer";
import { ExportButton } from "@/components/ui/ExportButton";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { Modal } from "@/components/ui/Modal";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { fileDate, type CsvColumn } from "@/lib/download";
import { downloadTable } from "@/lib/export";
import { matchesQuery } from "@/lib/search";
import { KeyDates } from "./KeyDates";
import { LeaveRequestModal } from "./LeaveRequestModal";
import { LEAVE_YEAR, dateRange, leaveBalance, leaveRecords, type LeaveRecord, type LeaveStatus } from "./leave";
import { LIFECYCLE_DA, formatDate } from "./lifecycle";
import { DetailRows, ICONS, Icon } from "./shared";
import { useLifecycleHistory } from "./useLifecycleHistory";
import { useAuthStore } from "@/store/useAuthStore";

const STATUS_TONE: Record<LeaveStatus, PillTone> = { "Pending approval": "amber", Approved: "green", Completed: "slate", Rejected: "red", Withdrawn: "slate" };
// The table says "Waiting" / "Taken" where the request record says "Pending approval" / "Completed".
const STATUS_LABEL: Partial<Record<LeaveStatus, string>> = { "Pending approval": "Waiting", Completed: "Taken" };
const statusLabel = (s: LeaveStatus) => STATUS_LABEL[s] ?? s;

const optionsOf = (values: string[]): FilterOption[] =>
  [...new Set(values)].sort().map((value) => ({ value, label: value, count: values.filter((v) => v === value).length }));

const EXPORT_COLUMNS: CsvColumn<LeaveRecord>[] = [
  { header: "Request ID", value: (r) => r.id },
  { header: "Type", value: (r) => r.type },
  { header: "Start", value: (r) => formatDate(r.start) },
  { header: "End", value: (r) => formatDate(r.end) },
  { header: "Working days", value: (r) => String(r.days) },
  { header: "Status", value: (r) => statusLabel(r.status) },
  { header: "Approver", value: (r) => r.approver },
  { header: "Cover", value: (r) => r.cover ?? "" },
  { header: "Submitted", value: (r) => formatDate(r.submitted) },
  { header: "Reason", value: (r) => r.reason },
];

const EMPTY_FILTERS = { type: new Set<string>(), status: new Set<string>() };
const NO_RANGE = { from: "", to: "" };

export type Accent = "emerald" | "blue" | "amber" | "violet";
export const ACCENTS: Record<Accent,{ border: string; bar: string; icon: string }> = {
  emerald: { border: "border-l-emerald-600", bar: "bg-emerald-600", icon: "bg-emerald-100 text-emerald-700" },
  blue: { border: "border-l-blue-500", bar: "bg-blue-500", icon: "bg-blue-100 text-blue-600" },
  amber: { border: "border-l-amber-600", bar: "bg-amber-600", icon: "bg-amber-100 text-amber-700" },
  violet: { border: "border-l-violet-600", bar: "bg-violet-600", icon: "bg-violet-100 text-violet-700" },
};

interface BalanceTileProps {
  label: string;
  value: number;
  total: number;
  /** Space-separated unit after the total, e.g. "days left". */
  note: string;
  footnote: string;
  accent: Accent;
  icon: string;
}

function BalanceTile({ label, value, total, note, footnote, accent, icon }: BalanceTileProps) {
  const a = ACCENTS[accent];
  const pct = total > 0 ? Math.max(0, Math.min(100, (value / total) * 100)) : 0;
  return (
    <Card className={`flex flex-col gap-2 border-l-4 px-4 py-3.5 ${a.border}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[13.5px] font-medium text-ink-soft">{label}</p>
          <p className="mt-1 flex items-baseline gap-1.5">
            <span className="text-[22px] font-bold leading-none text-ink">{value}</span>
            <span className="text-[12.5px] text-ink-soft">of {total} {note}</span>
          </p>
        </div>
        <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${a.icon}`}>
          <Icon d={icon} className="h-6 w-6" />
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-200">
        <div className={`h-full rounded-full ${a.bar}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[12px] text-ink-soft">{footnote}</p>
    </Card>
  );
}

// My Leave: balances, every leave and suspension request (this session's first) with filters, and the key dates.
export function LeaveHistory() {
  const router = useRouter();
  const requests = Object.values(useLifecycleHistory((s) => s.requests));
  const withdraw = useLifecycleHistory((s) => s.withdraw);
  const role = useAuthStore((s) => s.role);
  const canAct = role === "DA" || role === "Supervisor";
  // Supervisors and DAs can cancel their own request while it is waiting for approval, or approved and not yet started.
  const today = new Date().toLocaleDateString("en-CA");
  const canCancel = (r: LeaveRecord) => canAct && !!r.hasPage && (r.status === "Pending approval" || (r.status === "Approved" && r.start > today));
  const records = leaveRecords(requests);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [range, setRange] = useState(NO_RANGE);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [viewing, setViewing] = useState<LeaveRecord | null>(null);
  const [cancelling, setCancelling] = useState<LeaveRecord | null>(null);

  const annual = leaveBalance("Annual leave", requests)!;
  const sick = leaveBalance("Sick leave", requests)!;
  const special = leaveBalance("Special leave", requests)!;
  const pending = records.filter((r) => r.status === "Pending approval");
  const taken = records.filter((r) => r.status === "Completed" && r.start.startsWith(String(LEAVE_YEAR)));

  const typeOptions = optionsOf(records.map((r) => r.type));
  const statusOptions = optionsOf(records.map((r) => statusLabel(r.status)));
  const filterFields: FilterFieldConfig[] = [
    { key: "type", label: "Leave", allLabel: "All Leave", placeholder: "All Leave", options: typeOptions },
    { key: "status", label: "Status", allLabel: "All Status", placeholder: "All Status", options: statusOptions },
  ];
  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length + (range.from || range.to ? 1 : 0);
  const setFilter = (key: keyof typeof EMPTY_FILTERS) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [key]: next }));
  const has = (set: Set<string>, value: string) => set.size === 0 || set.has(value);

  // A request is in the date range when its leave window overlaps it.
  const shown = records.filter(
    (r) =>
      has(filters.type, r.type) &&
      has(filters.status, statusLabel(r.status)) &&
      (!range.from || r.end >= range.from) &&
      (!range.to || r.start <= range.to) &&
      matchesQuery(query, r.id, r.type, r.cover ?? "", statusLabel(r.status)),
  );

  const columns: Column<LeaveRecord>[] = [
    {
      key: "type",
      header: <FilterDropdown label="Leave" allLabel="All Leave" options={typeOptions} selected={filters.type} onApply={setFilter("type")} />,
      cell: (r) => <span className="font-semibold text-ink">{r.type}</span>,
    },
    { key: "dates", header: "Dates", cell: (r) => <span className="whitespace-nowrap">{dateRange(r.start, r.end)}</span> },
    { key: "days", header: "Days", cell: (r) => r.days },
    {
      key: "status",
      header: <FilterDropdown label="Status" allLabel="All Status" options={statusOptions} selected={filters.status} onApply={setFilter("status")} />,
      cell: (r) => <Pill tone={STATUS_TONE[r.status]} className="px-2.5 py-0.5">{statusLabel(r.status)}</Pill>,
    },
    { key: "cover", header: "Cover", cell: (r) => <span className="whitespace-nowrap">{r.cover ?? "-"}</span> },
    ...(canAct
      ? [
          {
            key: "action",
            header: "Action",
            cell: (r) =>
              canCancel(r) ? (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setCancelling(r);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-full border border-danger-border bg-danger-wash px-3 py-1 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger-border/40"
                >
                  <Icon d={ICONS.close} className="h-3.5 w-3.5" />
                  Cancel
                </button>
              ) : (
                "-"
              ),
          } satisfies Column<LeaveRecord>,
        ]
      : []),
  ];

  return (
    <div className="flex w-full flex-col gap-5">
      <Card className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[26px] font-bold tracking-tight text-ink">My Leave</h2>
          <p className="mt-1 text-[14px] text-ink-soft">View and manage your leave requests, track approval status, and check your leave history in one place.</p>
        </div>
        <Button variant="brand" size="lg" onClick={() => setIsRequesting(true)} className="shrink-0">Request leave</Button>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <BalanceTile label="Annual leave" value={annual.left} total={annual.total} note="days left" footnote={annual.held > 0 ? `${annual.held} days held by a pending request` : `${annual.taken} days used this year`} accent="emerald" icon={ICONS.calendar} />
        <BalanceTile label="Sick leave" value={sick.left} total={sick.total} note="days left" footnote={`${sick.taken} days used this year`} accent="blue" icon="M12 2.7l5.7 5.7a8 8 0 11-11.4 0z" />
        <BalanceTile label="Special leave" value={special.left} total={special.total} note="days left" footnote={`${special.taken} days used this year`} accent="amber" icon={ICONS.calendar} />
        <BalanceTile label="Pending requests" value={pending.length} total={Math.max(pending.length, taken.length + pending.length)} note="awaiting approval" footnote={pending.length === 0 ? "Nothing awaiting approval" : `${pending[0].id} is awaiting approval`} accent="violet" icon={ICONS.file} />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Card className="overflow-hidden p-0">
          <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <h3 className="text-[17px] font-bold text-ink">All leaves</h3>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <SearchInput value={query} onChange={setQuery} placeholder="Search Leave, cover..." className="sm:[&_input]:w-[200px]" />
              <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
              <ExportButton label="Export file" disabled={shown.length === 0} onExport={(format) => downloadTable(format, `leave-history-${LIFECYCLE_DA.name.toLowerCase().replace(/\s+/g, "-")}-${fileDate()}`, shown, EXPORT_COLUMNS, "Leave")} />
            </div>
          </div>
          <DataTable
            columns={columns}
            rows={shown}
            rowKey={(r) => r.id}
            onRowClick={(r) => (r.hasPage ? router.push(`/lifecycle/requests/${r.id}`) : setViewing(r))}
            itemLabel="requests"
            minWidth="640px"
            emptyTitle="No leave requests match these filters"
            emptyHint="Clear a filter or search for another leave."
          />
          <AdvancedFiltersDrawer
            isOpen={isFiltersOpen}
            onClose={() => setIsFiltersOpen(false)}
            fields={filterFields}
            filters={filters}
            onApply={(next, nextRange) => {
              setFilters({ type: next.type ?? new Set(), status: next.status ?? new Set() });
              setRange(nextRange);
            }}
          />
        </Card>

        <KeyDates />
      </div>

      {isRequesting && <LeaveRequestModal onClose={() => setIsRequesting(false)} />}

      {cancelling && (
        <Modal
          isOpen
          onClose={() => setCancelling(null)}
          title={`Cancel your ${cancelling.type.toLowerCase()} request?`}
          subtitle={`${cancelling.approver} ${cancelling.status === "Approved" ? "has approved it" : "hasn't decided yet"}. They are told you no longer need it${cancelling.cover ? `, and ${cancelling.cover} is no longer asked to cover` : ""}.`}
          size="md"
          bodyClassName="p-4 sm:px-6 sm:py-5"
          footer={
            <>
              <Button variant="outline" onClick={() => setCancelling(null)}>Cancel</Button>
              <Button
                variant="brand"
                onClick={() => {
                  withdraw(cancelling.id);
                  setCancelling(null);
                }}
              >
                Send
              </Button>
            </>
          }
        >
          <DetailRows
            boxed
            rows={[
              { label: "Leave", value: `${cancelling.type.replace(/ leave$/, "")} · ${cancelling.days} working days` },
              { label: "Dates", value: dateRange(cancelling.start, cancelling.end, true) },
              ...(leaveBalance(cancelling.type, requests, { excludeId: cancelling.id })
                ? [{ label: "Balance", value: `Stays at ${leaveBalance(cancelling.type, requests, { excludeId: cancelling.id })!.left} days` }]
                : []),
              { label: "Told", value: [cancelling.approver, cancelling.cover].filter(Boolean).join(" - ") },
            ]}
          />
        </Modal>
      )}

      {viewing && (
        <Modal
          isOpen
          onClose={() => setViewing(null)}
          title={`${viewing.type} · ${viewing.id}`}
          subtitle={`${dateRange(viewing.start, viewing.end, true)} · ${viewing.days} working days`}
          size="lg"
          bodyClassName="p-4 sm:px-6 sm:py-5"
          footer={<Button variant="outline" onClick={() => setViewing(null)}>Close</Button>}
        >
          <DetailRows
            boxed
            rows={[
              { label: "Status", value: <Pill tone={STATUS_TONE[viewing.status]} className="px-2.5 py-0.5">{statusLabel(viewing.status)}</Pill> },
              { label: "Reason", value: viewing.reason },
              { label: "Approver", value: viewing.approver },
              { label: "Cover", value: viewing.cover ?? "-" },
              { label: "Submitted", value: formatDate(viewing.submitted) },
            ]}
          />
        </Modal>
      )}
    </div>
  );
}
