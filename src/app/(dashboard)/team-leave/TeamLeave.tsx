"use client";

import { useState } from "react";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { AdvancedFiltersDrawer, type FilterFieldConfig } from "@/components/ui/AdvancedFiltersDrawer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Dropdown } from "@/components/ui/Dropdown";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { ETHIOPIAN_MONTHS, addDays, ethiopianDay, ethiopianMonthLength, ethiopianRange, fromEthiopian, toEthiopian } from "@/lib/ethiopian";
import { matchesQuery } from "@/lib/search";
import { useAuthStore } from "@/store/useAuthStore";
import { ACCENTS, type Accent } from "../lifecycle/components/LeaveHistory";
import { KeyDates } from "../lifecycle/components/KeyDates";
import { ICONS, Icon } from "../lifecycle/components/shared";
import { HelpDot, PageIntro } from "../leave-admin/shared";
import { returnDate } from "../lifecycle/components/leave";
import { TEAM_SIZE, mockTeam, type TeamLeaveRow, type WaitingRequest } from "./data";
import { ApproveDialog, CoverDialog, SuggestDatesDialog } from "./TeamLeaveDialogs";

/** An agent this close to their last day of leave counts as returning. */
const RETURNING_WITHIN_DAYS = 3;

type StatusKind = "On leave" | "Returning" | "Upcoming" | "Returned";
const STATUS_TONE: Record<StatusKind, PillTone> = { "On leave": "amber", Returning: "blue", Upcoming: "green", Returned: "slate" };

function statusOf(row: TeamLeaveRow, today: string): { kind: StatusKind; label: string } {
  if (row.end < today) return { kind: "Returned", label: "Returned" };
  if (row.start > today) return { kind: "Upcoming", label: "Upcoming" };
  if (row.end <= addDays(today, RETURNING_WITHIN_DAYS)) return { kind: "Returning", label: `Returning ${ethiopianDay(returnDate(row.end))}` };
  return { kind: "On leave", label: "On leave" };
}

const optionsOf = (values: string[]): FilterOption[] =>
  [...new Set(values)].sort().map((value) => ({ value, label: value, count: values.filter((v) => v === value).length }));

interface Month {
  key: string;
  label: string;
  first: string;
  last: string;
}

function monthsAround(today: string): Month[] {
  const current = toEthiopian(today);
  return Array.from({ length: 6 }, (_, i) => {
    const index = current.year * 13 + (current.month - 1) + i - 2;
    const year = Math.floor(index / 13);
    const month = (index % 13) + 1;
    const first = fromEthiopian({ year, month, day: 1 });
    return { key: `${year}-${month}`, label: `${ETHIOPIAN_MONTHS[month - 1]} ${year}`, first, last: addDays(first, ethiopianMonthLength(year, month) - 1) };
  });
}

function StatTile({ label, value, note, accent, icon }: { label: string; value: number; note: string; accent: Accent; icon: string }) {
  const a = ACCENTS[accent];
  return (
    <Card className={`flex items-start justify-between gap-3 border-l-4 px-4 py-3.5 ${a.border}`}>
      <div className="min-w-0">
        <p className="text-[13.5px] font-medium text-ink-soft">{label}</p>
        <p className="mt-1 text-[26px] font-bold leading-none text-ink">{value}</p>
        <p className="mt-2 truncate text-[12.5px] text-ink-soft">{note}</p>
      </div>
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl ${a.icon}`}>
        <Icon d={icon} className="h-6 w-6" />
      </span>
    </Card>
  );
}

const coverLine = (cover: string | null) => `Cover: ${cover ?? "not chosen"}`;
const listNames = (names: string[]) => (names.length === 0 ? "None" : names.length === 1 ? names[0] : `${names[0]} +${names.length - 1}`);

const EMPTY_FILTERS = { kebele: new Set<string>(), type: new Set<string>(), status: new Set<string>() };
const NO_RANGE = { from: "", to: "" };

/** The dialog open on the page: approving or suggesting dates on a waiting request, or picking cover for a request / a leave. */
type Dialog =
  | { kind: "approve" | "suggest"; id: string }
  | { kind: "cover-request"; id: string }
  | { kind: "cover-leave"; id: string };

// Team leave overview: who is away this month, requests waiting for the approver, and every agent's leave.
export function TeamLeave() {
  const role = useAuthStore((s) => s.role);
  const canApprove = role === "Supervisor" || role === "Admin";
  // The Waiting Requests section is part of the Team Leave layout for the DA as well as the Supervisor.
  const showWaiting = role === "DA" || canApprove;
  const [today] = useState(() => new Date().toISOString().slice(0, 10));
  const [initial] = useState(() => mockTeam(today));
  const [rows, setRows] = useState<TeamLeaveRow[]>(initial.rows);
  const [waiting, setWaiting] = useState<WaitingRequest[]>(initial.waiting);
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const months = monthsAround(today);
  const [monthKey, setMonthKey] = useState(months[2].key);
  const month = months.find((m) => m.key === monthKey) ?? months[2];
  const monthName = month.label.split(" ")[0];

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [range, setRange] = useState(NO_RANGE);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const dialogRequest = dialog && dialog.kind !== "cover-leave" ? waiting.find((w) => w.id === dialog.id) : undefined;
  const dialogLeave = dialog?.kind === "cover-leave" ? rows.find((r) => r.id === dialog.id) : undefined;

  // Approving moves the request into the agents table as leave on the calendar.
  const approve = (request: WaitingRequest) => {
    setRows((prev) => [...prev, { id: request.id, agent: request.agent, kebele: request.kebele, type: request.type, start: request.start, end: request.end, cover: request.cover }]);
    setWaiting((prev) => prev.filter((w) => w.id !== request.id));
    setDialog(null);
  };
  // A suggestion goes back to the agent, so the request leaves this approver's queue.
  const sendSuggestion = (id: string) => {
    setWaiting((prev) => prev.filter((w) => w.id !== id));
    setDialog(null);
  };
  const setRequestCover =(id: string, cover: string) => setWaiting((prev) => prev.map((w) => (w.id === id ? { ...w, cover } : w)));
  const setLeaveCover = (id: string, cover: string) => setRows((prev) => prev.map((r) => (r.id === id ? { ...r, cover } : r)));
  // A request with nobody covering asks for cover first, then goes on to the approval.
  const startApprove = (request: WaitingRequest) => setDialog({ kind: request.cover ? "approve" : "cover-request", id: request.id });

  const inMonth = rows.filter((r) => r.start <= month.last && r.end >= month.first);
  const returning = rows.filter((r) => {
    const back = returnDate(r.end);
    return back >= month.first && back <= month.last;
  });
  const uncovered = inMonth.filter((r) => !r.cover);
  const oldest = waiting.reduce((max, w) => Math.max(max, w.daysAgo), 0);

  const kebeleOptions = optionsOf(rows.map((r) => r.kebele));
  const typeOptions = optionsOf(rows.map((r) => r.type));
  const statusOptions = optionsOf(rows.map((r) => statusOf(r, today).kind));
  const filterFields: FilterFieldConfig[] = [
    { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All Kebeles", options: kebeleOptions },
    { key: "type", label: "Leave", allLabel: "All Leave", placeholder: "All Leave", options: typeOptions },
    { key: "status", label: "Status", allLabel: "All Status", placeholder: "All Status", options: statusOptions },
  ];
  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length + (range.from || range.to ? 1 : 0);
  const setFilter = (key: keyof typeof EMPTY_FILTERS) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [key]: next }));
  const has = (set: Set<string>, value: string) => set.size === 0 || set.has(value);

  const shown = rows.filter((r) => {
    const status = statusOf(r, today);
    return (
      has(filters.kebele, r.kebele) &&
      has(filters.type, r.type) &&
      has(filters.status, status.kind) &&
      (!range.from || r.end >= range.from) &&
      (!range.to || r.start <= range.to) &&
      matchesQuery(query, r.agent, r.kebele, r.type, status.label, r.cover ?? "")
    );
  });

  const noCover = <Pill tone="red" className="px-2.5 py-0.5">No Cover</Pill>;
  const columns: Column<TeamLeaveRow>[] = [
    { key: "agent", header: "Agent", cell: (r) => <span className="font-semibold text-ink">{r.agent}</span> },
    { key: "kebele", header: <FilterDropdown label="Kebele" allLabel="All kebeles" options={kebeleOptions} selected={filters.kebele} onApply={setFilter("kebele")} />, cell: (r) => r.kebele },
    { key: "type", header: <FilterDropdown label="Leave" allLabel="All Leave" options={typeOptions} selected={filters.type} onApply={setFilter("type")} />, cell: (r) => r.type },
    { key: "dates", header: "Dates", cell: (r) => <span className="whitespace-nowrap">{ethiopianRange(r.start, r.end)}</span> },
    {
      key: "status",
      header: <FilterDropdown label="Status" allLabel="All Status" options={statusOptions} selected={filters.status} onApply={setFilter("status")} />,
      cell: (r) => {
        const s = statusOf(r, today);
        return <Pill tone={STATUS_TONE[s.kind]} className="whitespace-nowrap px-2.5 py-0.5">{s.label}</Pill>;
      },
    },
    {
      key: "cover",
      header: "Cover",
      cell: (r) =>
        r.cover ? (
          <span className="whitespace-nowrap">{r.cover}</span>
        ) : canApprove ? (
          // Approvers can name the cover straight from the table.
          <button type="button" onClick={() => setDialog({ kind: "cover-leave", id: r.id })} title="Choose who covers" className="rounded-full transition-opacity hover:opacity-80">{noCover}</button>
        ) : (
          noCover
        ),
    },
  ];

  return (
    <div className="flex w-full flex-col gap-5">
      <PageIntro title="Team Leave" help="Who in your team is on leave, who is returning, which kebeles have no cover, and the requests waiting for you. Pick a month to change the view." description="View and manage team members' leave requests, availability, and leave schedules in one place.">
        <Dropdown
          value={monthKey}
          onChange={setMonthKey}
          options={months.map((m) => ({ value: m.key, label: m.label }))}
          align="right"
          className="sm:w-[200px]"
          triggerClassName="h-12"
          renderValue={(o) => (
            <span className="flex items-center gap-2.5 text-[14px] font-medium text-ink">
              <Icon d={ICONS.calendar} className="h-4 w-4 text-subtle" />
              {o.label}
            </span>
          )}
        />
      </PageIntro>

      <div className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${showWaiting ? "xl:grid-cols-4" : "xl:grid-cols-3"}`}>
        <StatTile label={`On leave in ${monthName}`} value={inMonth.length} note={`of ${TEAM_SIZE} agents`} accent="emerald" icon={ICONS.calendar} />
        {showWaiting && <StatTile label="Waiting for you" value={waiting.length} note={waiting.length === 0 ? "Nothing waiting" : `Oldest ${oldest} day${oldest === 1 ? "" : "s"}`} accent="blue" icon="M6 2h12M6 22h12M7 2v4a5 5 0 002 4l3 2-3 2a5 5 0 00-2 4v4M17 2v4a5 5 0 01-2 4l-3 2 3 2a5 5 0 012 4v4" />}
        <StatTile label={`Returning in ${monthName}`} value={returning.length} note={listNames(returning.map((r) => r.agent))} accent="amber" icon="M21 12a9 9 0 11-2.64-6.36L21 8M21 3v5h-5" />
        <StatTile label="Kebele without cover" value={uncovered.length} note={listNames(uncovered.map((r) => r.kebele))} accent="violet" icon="M12 2l9 5-9 5-9-5zM3 12l9 5 9-5M3 17l9 5 9-5" />
      </div>

      <div className={`grid grid-cols-1 items-start gap-5 ${showWaiting ? "lg:grid-cols-[minmax(0,1fr)_340px]" : ""}`}>
        {showWaiting ? (
          <Card className="overflow-hidden p-0">
            <h3 className="px-6 py-5 text-[17px] font-bold text-ink">Waiting Requests</h3>
            {waiting.length === 0 ? (
              <p className="border-t border-line-soft px-6 py-8 text-center text-[14px] text-ink-soft">No requests are waiting for you.</p>
            ) : (
              <ul>
                {waiting.map((w) => (
                  <li key={w.id} className="flex flex-col gap-3 border-t border-line-soft px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-[15px] font-semibold text-ink">{w.agent} · {w.kebele}</p>
                      <p className="text-[12.5px] text-ink-soft">{w.type} · {w.days} days · {ethiopianRange(w.start, w.end)} · {coverLine(w.cover)}</p>
                    </div>
                    <div className="flex shrink-0 gap-2.5">
                      <Button variant="outline" onClick={() => setDialog({ kind: "suggest", id: w.id })} className="whitespace-nowrap font-semibold text-brand-green">Suggest other dates</Button>
                      <Button variant="brand" onClick={() => startApprove(w)}>Approve</Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        ) : null}
        <KeyDates />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-[17px] font-bold text-ink">All agents</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={query} onChange={setQuery} placeholder="Search Agent, kebele..." className="sm:[&_input]:w-[210px]" />
            <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
          </div>
        </div>
        <DataTable columns={columns} rows={shown} rowKey={(r) => r.id} itemLabel="agents" minWidth="860px" emptyTitle="No team leave matches these filters" emptyHint="Clear a filter or try another search." />
        <AdvancedFiltersDrawer
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          fields={filterFields}
          filters={filters}
          onApply={(next, nextRange) => {
            setFilters({ kebele: next.kebele ?? new Set(), type: next.type ?? new Set(), status: next.status ?? new Set() });
            setRange(nextRange);
          }}
        />
      </Card>

      {dialog?.kind === "approve" && dialogRequest && <ApproveDialog request={dialogRequest} onClose={() => setDialog(null)} onApprove={() => approve(dialogRequest)} />}
      {dialog?.kind === "suggest" && dialogRequest && <SuggestDatesDialog request={dialogRequest} onClose={() => setDialog(null)} onSend={() => sendSuggestion(dialogRequest.id)} />}
      {dialog?.kind === "cover-request" && dialogRequest && (
        <CoverDialog
          leave={dialogRequest}
          onClose={() => setDialog(null)}
          onSave={(cover) => {
            setRequestCover(dialogRequest.id, cover);
            setDialog({ kind: "approve", id: dialogRequest.id });
          }}
        />
      )}
      {dialog?.kind === "cover-leave" && dialogLeave && (
        <CoverDialog
          leave={dialogLeave}
          onClose={() => setDialog(null)}
          onSave={(cover) => {
            setLeaveCover(dialogLeave.id, cover);
            setDialog(null);
          }}
        />
      )}
    </div>
  );
}
