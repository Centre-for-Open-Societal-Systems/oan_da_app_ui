"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { RowAction } from "@/components/ui/RowAction";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { StatCard } from "@/components/ui/StatCard";
import { Banner } from "@/components/ui/Banner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import { Select } from "@/components/ui/Select";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { AdvancedFiltersDrawer, type FilterFieldConfig, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { ISSUE_CATEGORIES, ISSUE_SEVERITIES, type IssueCategory, type IssueSeverity } from "../types";

// FR-13a queue row: Ref · Subject · Category/Severity · Reporter · Assignee · SLA · Status
type QueueStatus = "New" | "In Review" | "Assigned" | "In Progress" | "Needs more info" | "Resolved" | "Closed" | "Reopened" | "Rejected";
interface QueueIssue {
  ref: string;
  subject: string;
  category: IssueCategory;
  severity: IssueSeverity;
  reporter: string;
  woreda: string;
  assignee: string;
  slaDue: string;
  slaBreached: boolean;
  status: QueueStatus;
  history: { at: string; text: string }[];
}

const STATUS_TONE: Record<QueueStatus, PillTone> = { New: "slate", "In Review": "blue", Assigned: "blue", "In Progress": "amber", "Needs more info": "purple", Resolved: "green", Closed: "slate", Reopened: "amber", Rejected: "red" };
const SEV_TONE: Record<IssueSeverity, PillTone> = { Low: "slate", Medium: "amber", High: "red" };
const ASSIGNEES = ["Unassigned", "Kebede Alemu (Supervisor)", "IT support desk", "Finance desk", "Logistics — Bako Tibe"];

const SEED: QueueIssue[] = [
  { ref: "ISS-2041", subject: "Motorcycle repair delayed 2+ weeks", category: "Equipment / supplies", severity: "High", reporter: "Tadesse Alemu", woreda: "Bako Tibe", assignee: "Unassigned", slaDue: "16 Sep", slaBreached: false, status: "New", history: [{ at: "14 Sep 2026, 09:20", text: "Submitted by reporter (synced from device)" }] },
  { ref: "ISS-2038", subject: "Incentive payment for May not received", category: "Payment / incentive", severity: "High", reporter: "Tadesse Alemu", woreda: "Bako Tibe", assignee: "Finance desk", slaDue: "13 Sep", slaBreached: true, status: "In Progress", history: [{ at: "12 Sep 2026, 10:02", text: "Assigned to Finance desk by Kebede Alemu" }, { at: "12 Sep 2026, 09:40", text: "Submitted" }] },
  { ref: "ISS-2036", subject: "Tablet GPS drifts >50 m in Dambi Gobu", category: "Data / system", severity: "Medium", reporter: "Hana Girma", woreda: "Bako Tibe", assignee: "IT support desk", slaDue: "18 Sep", slaBreached: false, status: "Needs more info", history: [{ at: "13 Sep 2026, 11:15", text: "Requested more information: device model and app version" }] },
  { ref: "ISS-2033", subject: "ODK form rejects a valid Fayda ID", category: "Data / system", severity: "Medium", reporter: "Tadesse Alemu", woreda: "Bako Tibe", assignee: "Kebede Alemu (Supervisor)", slaDue: "17 Sep", slaBreached: false, status: "In Review", history: [{ at: "10 Sep 2026, 15:00", text: "Picked up for review" }] },
  { ref: "ISS-2027", subject: "Field tablet screen cracked", category: "Equipment / supplies", severity: "Medium", reporter: "Tadesse Alemu", woreda: "Bako Tibe", assignee: "IT support desk", slaDue: "15 Sep", slaBreached: false, status: "Assigned", history: [{ at: "09 Sep 2026, 08:30", text: "Assigned to IT support desk" }] },
  { ref: "ISS-2022", subject: "Unsafe footbridge on route to Koye Feche", category: "Safety", severity: "High", reporter: "Selamawit Haile", woreda: "Bako Tibe", assignee: "Logistics — Bako Tibe", slaDue: "11 Sep", slaBreached: true, status: "In Progress", history: [{ at: "08 Sep 2026, 14:10", text: "Assigned to Logistics" }] },
  { ref: "ISS-2015", subject: "Transfer request to Gedo kebele not actioned", category: "HR", severity: "Low", reporter: "Selamawit Haile", woreda: "Bako Tibe", assignee: "Kebede Alemu (Supervisor)", slaDue: "19 Sep", slaBreached: false, status: "Reopened", history: [{ at: "11 Sep 2026, 10:30", text: "Reopened by reporter: transfer letter still not issued" }, { at: "29 Aug 2026, 14:00", text: "Resolved: forwarded to Woreda HR" }] },
  { ref: "ISS-2009", subject: "Second power bank for field tablet", category: "Equipment / supplies", severity: "Low", reporter: "Hana Girma", woreda: "Bako Tibe", assignee: "Logistics — Bako Tibe", slaDue: "—", slaBreached: false, status: "Rejected", history: [{ at: "04 Sep 2026, 11:20", text: "Rejected: one power bank per DA under current supply plan" }] },
  { ref: "ISS-2004", subject: "Duplicate farmer records in Koye Feche", category: "Data / system", severity: "Low", reporter: "Tadesse Alemu", woreda: "Bako Tibe", assignee: "IT support desk", slaDue: "—", slaBreached: false, status: "Resolved", history: [{ at: "02 Sep 2026, 16:45", text: "Resolved: records merged by data team" }] },
  { ref: "ISS-1987", subject: "Fuel allowance form unavailable", category: "Operational", severity: "Low", reporter: "Hana Girma", woreda: "Bako Tibe", assignee: "Kebede Alemu (Supervisor)", slaDue: "—", slaBreached: false, status: "Closed", history: [{ at: "20 Aug 2026, 09:00", text: "Closed: form restored" }] },
];

type Action = "assign" | "info" | "resolve" | "reopen";
const OPEN: QueueStatus[] = ["New", "In Review", "Assigned", "In Progress", "Needs more info", "Reopened"];

const STATUSES: QueueStatus[] = ["New", "In Review", "Assigned", "In Progress", "Needs more info", "Reopened", "Resolved", "Closed", "Rejected"];
const WOREDAS = ["Bako Tibe"];

const SEARCH_PLACEHOLDER = searchPlaceholder(["Ref", "Subject", "Category", "Severity", "Reporter", "Assignee", "Status"]);

const icon = (d: string) => <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;

const optionsOf = (values: string[], order: readonly string[]): FilterOption[] =>
  order.map((value) => ({ value, label: value, count: values.filter((v) => v === value).length }));

interface IssueFilters extends FilterSelection {
  category: Set<string>;
  severity: Set<string>;
  status: Set<string>;
  assignee: Set<string>;
  woreda: Set<string>;
}
const EMPTY: IssueFilters = { category: new Set(), severity: new Set(), status: new Set(), assignee: new Set(), woreda: new Set() };

// FR-13a — Supervisor-owned internal-issue queue (not the external grievance triage; no separate support-desk role).
export function IssueQueue() {
  const [issues, setIssues] = useState<QueueIssue[]>(SEED);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<IssueFilters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [action, setAction] = useState<{ type: Action; issue: QueueIssue } | null>(null);
  const [note, setNote] = useState("");
  const [target, setTarget] = useState(ASSIGNEES[1]);
  const [notice, setNotice] = useState<string | null>(null);

  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;
  const setFilter = (key: keyof IssueFilters) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [key]: next }));

  const categoryOptions = optionsOf(issues.map((i) => i.category), ISSUE_CATEGORIES);
  const severityOptions = optionsOf(issues.map((i) => i.severity), ISSUE_SEVERITIES);
  const statusOptions = optionsOf(issues.map((i) => i.status), STATUSES);
  const assigneeOptions = optionsOf(issues.map((i) => i.assignee), ASSIGNEES);
  const woredaOptions = optionsOf(issues.map((i) => i.woreda), WOREDAS);
  const filterFields: FilterFieldConfig[] = [
    { key: "category", label: "Category", allLabel: "All categories", placeholder: "All Categories", options: categoryOptions },
    { key: "severity", label: "Severity", allLabel: "All severities", placeholder: "All Severities", options: severityOptions },
    { key: "status", label: "Status", allLabel: "All Status", placeholder: "All Status", options: statusOptions },
    { key: "assignee", label: "Assignee", allLabel: "All assignees", placeholder: "All Assignees", options: assigneeOptions },
    { key: "woreda", label: "Woreda", allLabel: "All woredas", placeholder: "All Woredas", options: woredaOptions },
  ];

  const rows = useMemo(() => {
    const has = (set: Set<string>, value: string) => set.size === 0 || set.has(value);
    return issues.filter(
      (i) =>
        has(filters.category, i.category) &&
        has(filters.severity, i.severity) &&
        has(filters.status, i.status) &&
        has(filters.assignee, i.assignee) &&
        has(filters.woreda, i.woreda) &&
        matchesQuery(query, i, i.slaBreached ? "Breached" : ""),
    );
  }, [issues, query, filters]);

  const open = issues.filter((i) => OPEN.includes(i.status));
  const stats = {
    open: open.length,
    unassigned: open.filter((i) => i.assignee === "Unassigned").length,
    breaching: open.filter((i) => i.slaBreached).length,
    resolved30: issues.filter((i) => i.status === "Resolved" || i.status === "Closed").length,
  };

  const commit = () => {
    if (!action) return;
    const { type, issue } = action;
    const stamp = "Just now";
    setIssues((prev) =>
      prev.map((i) => {
        if (i.ref !== issue.ref) return i;
        if (type === "assign") return { ...i, assignee: target, status: "Assigned", history: [{ at: stamp, text: `Assigned to ${target} by Kebede Alemu${note ? ` — ${note}` : ""}` }, ...i.history] };
        if (type === "info") return { ...i, status: "Needs more info", history: [{ at: stamp, text: `Requested more information: ${note}` }, ...i.history] };
        if (type === "resolve") return { ...i, status: "Resolved", slaBreached: false, slaDue: "—", history: [{ at: stamp, text: `Resolved: ${note}` }, ...i.history] };
        return { ...i, status: "Reopened", history: [{ at: stamp, text: `Reopened: ${note}` }, ...i.history] };
      }),
    );
    const msg: Record<Action, string> = {
      assign: `${issue.ref} assigned to ${target}. Reporter notified by app/SMS.`,
      info: `${issue.ref} returned to the reporter as Needs more info. Reporter notified by app/SMS.`,
      resolve: `${issue.ref} resolved. Reporter notified; they can reopen if the fix didn't hold.`,
      reopen: `${issue.ref} reopened and back in the queue.`,
    };
    setNotice(msg[type]);
    setAction(null);
    setNote("");
  };

  const columns: Column<QueueIssue>[] = [
    { key: "ref", header: "Ref", cell: (i) => <span className="whitespace-nowrap font-mono text-[13px] font-medium text-ink">{i.ref}</span> },
    { key: "subject", header: "Subject", cell: (i) => <span className="block min-w-[200px] font-medium text-ink">{i.subject}</span> },
    {
      key: "cat",
      header: (
        <span className="inline-flex items-center gap-1.5">
          <FilterDropdown label="Category" allLabel="All categories" options={categoryOptions} selected={filters.category} onApply={setFilter("category")} />
          <span className="text-subtle">/</span>
          <FilterDropdown label="Severity" allLabel="All severities" options={severityOptions} selected={filters.severity} onApply={setFilter("severity")} />
        </span>
      ),
      cell: (i) => <div className="flex flex-col gap-1"><span className="text-[13px]">{i.category}</span><Pill tone={SEV_TONE[i.severity]}>{i.severity}</Pill></div> },
    { key: "reporter", header: "Reporter", cell: (i) => <span>{i.reporter}<span className="block text-[12px] text-muted">{i.woreda}</span></span> },
    { key: "assignee", header: <FilterDropdown label="Assignee" allLabel="All assignees" options={assigneeOptions} selected={filters.assignee} onApply={setFilter("assignee")} />, cell: (i) => (i.assignee === "Unassigned" ? <span className="text-danger">Unassigned</span> : i.assignee) },
    { key: "sla", header: "SLA", cell: (i) => (i.slaBreached ? <Pill tone="red" dot>Breached · {i.slaDue}</Pill> : <span className="text-[13px] text-ink-soft">{i.slaDue}</span>) },
    { key: "status", header: <FilterDropdown label="Status" allLabel="All Status" options={statusOptions} selected={filters.status} onApply={setFilter("status")} />, cell: (i) => <Pill tone={STATUS_TONE[i.status]} dot>{i.status}</Pill> },
    {
      key: "actions", header: "Actions", align: "center",
      cell: (i) => (
        <div className="flex items-center justify-center gap-1.5">
          {OPEN.includes(i.status) && (
            <>
              <RowAction onClick={() => setAction({ type: "assign", issue: i })}>Assign</RowAction>
              <RowAction tone="neutral" onClick={() => setAction({ type: "info", issue: i })}>Request info</RowAction>
              <RowAction tone="solid" icon="check" onClick={() => setAction({ type: "resolve", issue: i })}>Resolve</RowAction>
            </>
          )}
          {(i.status === "Resolved" || i.status === "Closed") && (
            <RowAction tone="neutral" icon="retry" onClick={() => setAction({ type: "reopen", issue: i })}>Reopen</RowAction>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Open" value={String(stats.open)} accent="border-l-blue-600" tile="bg-blue-50 text-blue-600" icon={icon("M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z")} />
        <StatCard label="Unassigned" value={String(stats.unassigned)} accent="border-l-amber-600" tile="bg-warning-wash text-amber-600" icon={icon("M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 11l-4 4M18 11l4 4")} />
        <StatCard label="Breaching SLA" value={String(stats.breaching)} accent="border-l-danger" tile="bg-danger-wash text-danger" icon={icon("M12 8v4M12 16h.01M12 22a10 10 0 100-20 10 10 0 000 20z")} />
        <StatCard label="Resolved (30d)" value={String(stats.resolved30)} accent="border-l-brand-green" tile="bg-brand-tint text-brand-green" icon={icon("M20 6L9 17l-5-5")} />
      </div>

      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Issue queue — Bako Tibe</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">Internal operational issues routed to you as the responsible Supervisor. Farmer grievances are triaged in the external Grievance Service, not here.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />

            <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
          </div>
        </div>
        {notice && <Banner tone="success" className="mx-4 mb-3" onDismiss={() => setNotice(null)}>{notice}</Banner>}
        <div>
          <DataTable itemLabel="issues" columns={columns} rows={rows} rowKey={(i) => i.ref} minWidth="1200px" emptyTitle="No issues match the selected filters" emptyHint="Clear a filter or try a different search." />
        </div>

        <AdvancedFiltersDrawer
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          fields={filterFields}
          filters={filters}
          onApply={(next) =>
            setFilters({
              category: next.category ?? new Set(),
              severity: next.severity ?? new Set(),
              status: next.status ?? new Set(),
              assignee: next.assignee ?? new Set(),
              woreda: next.woreda ?? new Set(),
            })
          }
        />
      </Card>

      {action && (
        <Modal
          isOpen
          onClose={() => setAction(null)}
          title={{ assign: "Assign Issue", info: "Request More Information", resolve: "Resolve Issue", reopen: "Reopen Issue" }[action.type]}
          subtitle={`${action.issue.ref} · ${action.issue.subject}`}
          footer={<><Button variant="outline" onClick={() => setAction(null)}>Cancel</Button><Button variant="brand" disabled={action.type !== "assign" && note.trim().length < 3} onClick={commit}>{{ assign: "Assign", info: "Send request", resolve: "Mark resolved", reopen: "Reopen" }[action.type]}</Button></>}
        >
          <div className="flex flex-col gap-4">
            {action.type === "assign" && (
              <FormField label="Assign to" htmlFor="assignee" required hint="Within your Woreda scope; the assignee and the reporter are both notified.">
                <Select id="assignee" value={target} onChange={(e) => setTarget(e.target.value)}>
                  {ASSIGNEES.filter((a) => a !== "Unassigned").map((a) => <option key={a}>{a}</option>)}
                </Select>
              </FormField>
            )}
            <FormField label={action.type === "assign" ? "Note (optional)" : action.type === "info" ? "What do you need from the reporter?" : action.type === "resolve" ? "Resolution note" : "Why is this being reopened?"} htmlFor="note" required={action.type !== "assign"} hint={`${action.type === "assign" ? "" : "At least 3 characters. "}Added to the audit history and sent to the reporter by app/SMS.`} hintTone={action.type !== "assign" && note.trim().length > 0 && note.trim().length < 3 ? "error" : "muted"}>
              <Textarea id="note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
            </FormField>
            {action.type !== "assign" && note.trim().length < 3 && <p className="text-[12.5px] text-muted">Complete every field marked * to enable {{ assign: "Assign", info: "Send request", resolve: "Mark resolved", reopen: "Reopen" }[action.type]}.</p>}
            <div className="rounded-lg border border-line bg-surface p-3">
              <p className="text-[12px] font-semibold uppercase tracking-wider text-muted">History</p>
              <ul className="mt-1.5 space-y-1 text-[12.5px] text-ink-soft">
                {action.issue.history.map((h) => <li key={`${h.at}-${h.text}`}><span className="text-subtle">{h.at}</span> — {h.text}</li>)}
              </ul>
            </div>
          </div>
        </Modal>
      )}
    </>
  );
}
