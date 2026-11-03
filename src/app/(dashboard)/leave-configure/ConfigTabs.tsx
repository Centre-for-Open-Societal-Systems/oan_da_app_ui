"use client";

import { Fragment, useState, type ReactNode } from "react";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { AdvancedFiltersDrawer, type FilterFieldConfig } from "@/components/ui/AdvancedFiltersDrawer";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { matchesQuery } from "@/lib/search";
import { Icon } from "../lifecycle/components/shared";
import { HelpDot, has, optionsOf } from "../leave-admin/shared";
import {
  AGENTS, ANNUAL_BASE, ASSIGN_COUNT, CHAINS, LEAVE_YEAR_OPTIONS, allowanceOf, effectLabel, overrideChange, serviceLabel,
  type AgentRow, type ChainRow, type LeaveTypeRow, type OverrideRow, type RuleRow,
} from "./data";

const PENCIL = "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z";
const CHECK_CIRCLE = "M12 22a10 10 0 100-20 10 10 0 000 20zM8 12l3 3 5-6";
const CHEVRON = "M9 6l6 6-6 6";

function EditButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button type="button" aria-label={label} onClick={onClick} className="inline-flex items-center gap-1 rounded-full border border-brand-border bg-brand-mint px-2.5 py-0.5 text-[12.5px] font-semibold text-brand-green transition-colors hover:bg-brand-wash">
      <Icon d={PENCIL} className="h-3.5 w-3.5" />
      Edit
    </button>
  );
}

/** The bordered card inside a tab: title, search, Advanced Filters and an optional main action over the table. */
function TableCard({ title, placeholder, query, onQuery, activeCount, onFilters, action, className, children }: {
  title: string; placeholder: string; query: string; onQuery: (q: string) => void; activeCount: number; onFilters: () => void; action?: ReactNode; className?: string; children: ReactNode;
}) {
  return (
    <Card className={`overflow-hidden p-0 ${className ?? ""}`}>
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <h3 className="text-[17px] font-bold text-ink">{title}</h3>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <SearchInput value={query} onChange={onQuery} placeholder={placeholder} className="sm:[&_input]:w-[250px]" />
          <AdvancedFiltersButton activeCount={activeCount} onClick={onFilters} />
          {action}
        </div>
      </div>
      {children}
    </Card>
  );
}

type FilterSets<K extends string> = Record<K, Set<string>>;
const emptyFilters = <K extends string>(keys: K[]) => Object.fromEntries(keys.map((k) => [k, new Set<string>()])) as FilterSets<K>;
const countActive = (f: Record<string, Set<string>>) => Object.values(f).filter((s) => s.size > 0).length;

// ---- Leave types ---------------------------------------------------------------------------------------------------

type TypeKey = "type" | "counts" | "who" | "status";

export function LeaveTypesTab({ rows, onAdd, onEdit }: { rows: LeaveTypeRow[]; onAdd: () => void; onEdit: (row: LeaveTypeRow) => void }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(() => emptyFilters<TypeKey>(["type", "counts", "who", "status"]));
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const options = { type: optionsOf(rows.map((r) => r.type)), counts: optionsOf(rows.map((r) => r.counts)), who: optionsOf(rows.map((r) => r.who)), status: optionsOf(rows.map((r) => r.status)) };
  const fields: FilterFieldConfig[] = [
    { key: "type", label: "Leave Type", allLabel: "All Leave Type", placeholder: "All Leave Type", options: options.type },
    { key: "counts", label: "Counts", allLabel: "All Counts", placeholder: "All Counts", options: options.counts },
    { key: "who", label: "Who", allLabel: "All", placeholder: "All", options: options.who },
    { key: "status", label: "Status", allLabel: "All Status", placeholder: "All Status", options: options.status },
  ];
  const header = (key: TypeKey, label: string, all: string) => (
    <FilterDropdown label={label} allLabel={all} options={options[key]} selected={filters[key]} onApply={(next) => setFilters((p) => ({ ...p, [key]: next }))} />
  );
  const shown = rows.filter((r) => has(filters.type, r.type) && has(filters.counts, r.counts) && has(filters.who, r.who) && has(filters.status, r.status) && matchesQuery(query, r.type, r.counts, r.who, r.document, r.status));

  const columns: Column<LeaveTypeRow>[] = [
    { key: "type", header: header("type", "Leave Type", "All Leave Type"), cell: (r) => <span className="flex items-center gap-1.5 font-semibold text-ink">{r.type}<HelpDot title={r.type} text={`${r.baseDays} base days, counted in ${r.counts.toLowerCase()} days. Notice: ${r.notice}. Document: ${r.document.toLowerCase()}.`} /></span> },
    { key: "baseDays", header: "Base days", cell: (r) => r.baseDays },
    { key: "counts", header: header("counts", "Counts", "All Counts"), cell: (r) => r.counts },
    { key: "who", header: header("who", "Who", "All"), cell: (r) => r.who },
    { key: "rule", header: "Rules", align: "center", cell: (r) => (r.rule ? <Pill tone="blue" className="px-2.5 py-0.5">{r.rule}</Pill> : "-") },
    { key: "document", header: "Document", cell: (r) => r.document },
    { key: "status", header: header("status", "Status", "All Status"), cell: (r) => <Pill tone="amber" className="px-2.5 py-0.5">{r.status}</Pill> },
    { key: "action", header: "Action", align: "center", cell: (r) => <EditButton label={`Edit ${r.type}`} onClick={() => onEdit(r)} /> },
  ];

  return (
    <TableCard title="All Leaves" placeholder="Search by Leave type, Counts..." query={query} onQuery={setQuery} activeCount={countActive(filters)} onFilters={() => setIsFiltersOpen(true)} action={<Button variant="brand" className="h-10" onClick={onAdd}>Add leave type</Button>}>
      <DataTable columns={columns} rows={shown} rowKey={(r) => r.id} itemLabel="leave types" minWidth="900px" emptyTitle="No leave types match these filters" emptyHint="Clear a filter or search for another leave type." />
      <AdvancedFiltersDrawer isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} fields={fields} filters={filters} onApply={(next) => setFilters({ type: next.type ?? new Set(), counts: next.counts ?? new Set(), who: next.who ?? new Set(), status: next.status ?? new Set() })} />
    </TableCard>
  );
}

// ---- Rules ---------------------------------------------------------------------------------------------------------

type RuleKey = "type" | "condition" | "when" | "scope";

function TryOnAgent() {
  const [agentId, setAgentId] = useState(AGENTS[0].id);
  const agent = AGENTS.find((a) => a.id === agentId)!;
  const a = allowanceOf(agent);
  return (
    <Card className="p-0">
      <div className="flex items-center gap-2 border-b border-line-soft px-5 py-4">
        <h3 className="text-[17px] font-bold text-ink">Try it on an agent</h3>
        <HelpDot title="Try it on an agent" text="Pick an agent to see how the current rules work out their annual leave." />
      </div>
      <div className="flex flex-col gap-3 px-5 py-4">
        <Select value={agentId} onChange={(e) => setAgentId(e.target.value)} className="h-10">
          {AGENTS.slice(0, 6).map((x) => <option key={x.id} value={x.id}>{`${x.name} · ${x.kebele}`}</option>)}
        </Select>
        <dl className="flex flex-col gap-3 text-[13.5px] text-ink-soft">
          <div className="flex justify-between"><dt>Annual leave base</dt><dd className="font-semibold text-ink">{ANNUAL_BASE}</dd></div>
          <div className="flex justify-between"><dt>Years of service: {a.years}</dt><dd className="font-semibold text-ink">+ {a.bonus}</dd></div>
          <div className="flex justify-between"><dt>Hardship woreda</dt><dd className="font-semibold text-ink">No</dd></div>
          <div className="flex justify-between text-[14px] font-semibold text-ink"><dt>Allowance this year</dt><dd className="text-brand-green">{a.days} days</dd></div>
        </dl>
      </div>
    </Card>
  );
}

export function RulesTab({ rows, onAdd, onEdit }: { rows: RuleRow[]; onAdd: () => void; onEdit: (row: RuleRow) => void }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(() => emptyFilters<RuleKey>(["type", "condition", "when", "scope"]));
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const options = { type: optionsOf(rows.map((r) => r.type)), condition: optionsOf(rows.map((r) => r.condition)), when: optionsOf(rows.map((r) => r.when)), scope: optionsOf(rows.map((r) => r.scope)) };
  const fields: FilterFieldConfig[] = [
    { key: "type", label: "Leave Type", allLabel: "All Leave Type", placeholder: "All Leave Type", options: options.type },
    { key: "condition", label: "Condition", allLabel: "All Conditions", placeholder: "All Conditions", options: options.condition },
    { key: "when", label: "When", allLabel: "All", placeholder: "All", options: options.when },
    { key: "scope", label: "Scope", allLabel: "All Scopes", placeholder: "All Scopes", options: options.scope },
  ];
  const header = (key: RuleKey, label: string, all: string) => (
    <FilterDropdown label={label} allLabel={all} options={options[key]} selected={filters[key]} onApply={(next) => setFilters((p) => ({ ...p, [key]: next }))} />
  );
  const shown = rows.filter((r) => has(filters.type, r.type) && has(filters.condition, r.condition) && has(filters.when, r.when) && has(filters.scope, r.scope) && matchesQuery(query, r.type, r.condition, r.when, r.effect, r.scope));

  const columns: Column<RuleRow>[] = [
    { key: "type", header: header("type", "Leave Type", "All Leave Type"), cell: (r) => <span className="font-semibold text-ink">{r.type}</span> },
    { key: "condition", header: header("condition", "Condition", "All Conditions"), cell: (r) => r.condition },
    { key: "when", header: header("when", "When", "All"), cell: (r) => r.when.charAt(0).toUpperCase() + r.when.slice(1) },
    { key: "effect", header: "Effect", cell: (r) => effectLabel(r) },
    { key: "limit", header: "Limit", cell: (r) => (r.cap ? `Cap ${r.cap}` : "-") },
    { key: "scope", header: header("scope", "Scope", "All Scopes"), cell: (r) => <Pill tone={r.scope === "Federal" ? "slate" : "blue"} className="px-2.5 py-0.5">{r.scope}</Pill> },
    { key: "action", header: "Action", align: "center", cell: (r) => <EditButton label={`Edit rule for ${r.type}`} onClick={() => onEdit(r)} /> },
  ];

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
      <TableCard title="All Rules" placeholder="Search Leave type, Counts..." query={query} onQuery={setQuery} activeCount={countActive(filters)} onFilters={() => setIsFiltersOpen(true)} action={<Button variant="brand" className="h-10" onClick={onAdd}>Add rule</Button>}>
        <DataTable columns={columns} rows={shown} rowKey={(r) => r.id} itemLabel="rules" minWidth="780px" paginate={false} emptyTitle="No rules match these filters" emptyHint="Clear a filter or search for another rule." />
        <AdvancedFiltersDrawer isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} fields={fields} filters={filters} onApply={(next) => setFilters({ type: next.type ?? new Set(), condition: next.condition ?? new Set(), when: next.when ?? new Set(), scope: next.scope ?? new Set() })} />
      </TableCard>
      <TryOnAgent />
    </div>
  );
}

// ---- Regional overrides --------------------------------------------------------------------------------------------

const CHANGE_TONE: Record<string, PillTone> = { Same: "slate", Added: "blue", Changed: "amber" };
const CELL_INPUT = "h-10 w-full rounded-lg border border-line bg-white px-3 text-[14px] text-ink outline-none focus:border-brand-green focus:ring-2 focus:ring-brand-green/20";

export function OverridesTab({ rows, region, onChange }: { rows: OverrideRow[]; region: string; onChange: (id: string, value: string) => void }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(() => emptyFilters<"setting" | "change">(["setting", "change"]));
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const options = { setting: optionsOf(rows.map((r) => r.setting)), change: optionsOf(rows.map(overrideChange)) };
  const fields: FilterFieldConfig[] = [
    { key: "setting", label: "Setting", allLabel: "All Settings", placeholder: "All Settings", options: options.setting },
    { key: "change", label: "Change", allLabel: "All Changes", placeholder: "All Changes", options: options.change },
  ];
  const shown = rows.filter((r) => has(filters.setting, r.setting) && has(filters.change, overrideChange(r)) && matchesQuery(query, r.setting, r.federal, r.value));

  const columns: Column<OverrideRow>[] = [
    { key: "setting", header: <FilterDropdown label="Setting" allLabel="All Settings" options={options.setting} selected={filters.setting} onApply={(next) => setFilters((p) => ({ ...p, setting: next }))} />, cell: (r) => <span className="font-semibold text-ink">{r.setting}</span> },
    { key: "federal", header: "Federal Base", cell: (r) => r.federal || "-" },
    {
      key: "value",
      header: region,
      cell: (r) =>
        r.kind === "select" ? (
          <Select value={r.value} onChange={(e) => onChange(r.id, e.target.value)} className="h-10 w-[200px]">
            {LEAVE_YEAR_OPTIONS.map((o) => <option key={o}>{o}</option>)}
          </Select>
        ) : r.kind === "days" ? (
          <div className="relative w-[200px]">
            <input aria-label={`${r.setting} for ${region}`} type="number" min={0} value={r.value} onChange={(e) => onChange(r.id, e.target.value)} className={CELL_INPUT} />
            <span className="pointer-events-none absolute right-8 top-1/2 -translate-y-1/2 text-[14px] text-ink-soft">days</span>
          </div>
        ) : (
          <input aria-label={`${r.setting} for ${region}`} value={r.value} onChange={(e) => onChange(r.id, e.target.value)} className={`${CELL_INPUT} w-[200px]`} />
        ),
    },
    { key: "change", header: <FilterDropdown label="Change" allLabel="All Changes" options={options.change} selected={filters.change} onApply={(next) => setFilters((p) => ({ ...p, change: next }))} />, align: "center", cell: (r) => <Pill tone={CHANGE_TONE[overrideChange(r)]} className="px-2.5 py-0.5">{overrideChange(r)}</Pill> },
  ];

  return (
    <TableCard title="All Regional Override" placeholder="Search by setting, federal base..." query={query} onQuery={setQuery} activeCount={countActive(filters)} onFilters={() => setIsFiltersOpen(true)}>
      <DataTable columns={columns} rows={shown} rowKey={(r) => r.id} itemLabel="settings" minWidth="760px" paginate={false} emptyTitle="No settings match these filters" emptyHint="Clear a filter or search for another setting." />
      <AdvancedFiltersDrawer isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} fields={fields} filters={filters} onApply={(next) => setFilters({ setting: next.setting ?? new Set(), change: next.change ?? new Set() })} />
    </TableCard>
  );
}

// ---- Approval chains -----------------------------------------------------------------------------------------------

function Note({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-lg bg-surface px-3.5 py-2 text-[13.5px] text-ink-soft">
      <Icon d={CHECK_CIRCLE} className="h-4 w-4 shrink-0 text-brand-green" />
      {children}
    </span>
  );
}

export function ChainsTab() {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(() => emptyFilters<"type" | "delegation">(["type", "delegation"]));
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const options = { type: optionsOf(CHAINS.map((r) => r.type)), delegation: optionsOf(CHAINS.map((r) => r.delegation)) };
  const fields: FilterFieldConfig[] = [
    { key: "type", label: "Leave Type", allLabel: "All Leave Type", placeholder: "All Leave Type", options: options.type },
    { key: "delegation", label: "Delegation", allLabel: "All", placeholder: "All", options: options.delegation },
  ];
  const shown = CHAINS.filter((r) => has(filters.type, r.type) && has(filters.delegation, r.delegation) && matchesQuery(query, r.type, r.length, r.steps.join(" "), r.delegation));

  const columns: Column<ChainRow>[] = [
    { key: "type", header: <FilterDropdown label="Leave Type" allLabel="All Leave Type" options={options.type} selected={filters.type} onApply={(next) => setFilters((p) => ({ ...p, type: next }))} />, cell: (r) => <span className="font-semibold text-ink">{r.type}</span> },
    { key: "length", header: "Length", cell: (r) => r.length },
    {
      key: "steps",
      header: "Steps",
      cell: (r) => (
        <span className="flex items-center gap-1.5">
          {r.steps.map((s, i) => (
            <Fragment key={s}>
              {i > 0 && <Icon d={CHEVRON} className="h-3.5 w-3.5 text-muted" />}
              <Pill tone="slate" className="whitespace-nowrap px-2.5 py-0.5">{s}</Pill>
            </Fragment>
          ))}
        </span>
      ),
    },
    { key: "delegation", header: <FilterDropdown label="Delegation" allLabel="All" options={options.delegation} selected={filters.delegation} onApply={(next) => setFilters((p) => ({ ...p, delegation: next }))} />, cell: (r) => <Pill tone={r.delegation === "Allowed" ? "green" : "red"} className="px-2.5 py-0.5">{r.delegation}</Pill> },
  ];

  return (
    <div className="flex flex-col gap-4">
      <TableCard title="All Approval Chains" placeholder="Search by leave type, length..." query={query} onQuery={setQuery} activeCount={countActive(filters)} onFilters={() => setIsFiltersOpen(true)}>
        <DataTable columns={columns} rows={shown} rowKey={(r) => r.id} itemLabel="chains" minWidth="760px" paginate={false} emptyTitle="No chains match these filters" emptyHint="Clear a filter or search for another leave type." />
        <AdvancedFiltersDrawer isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} fields={fields} filters={filters} onApply={(next) => setFilters({ type: next.type ?? new Set(), delegation: next.delegation ?? new Set() })} />
      </TableCard>
      <div className="flex flex-wrap gap-3">
        <Note>Approver replies within 3 days, then it moves to their delegate</Note>
        <Note>Supervisors can apply for agents without network</Note>
      </div>
    </div>
  );
}

// ---- Assign to agents ----------------------------------------------------------------------------------------------

type AgentKey = "name" | "kebele" | "designation";

export function AssignTab({ assigned, onAssign }: { assigned: boolean; onAssign: () => void }) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(() => emptyFilters<AgentKey>(["name", "kebele", "designation"]));
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const options = { name: optionsOf(AGENTS.map((a) => a.name)), kebele: optionsOf(AGENTS.map((a) => a.kebele)), designation: optionsOf(AGENTS.map((a) => a.designation)) };
  const fields: FilterFieldConfig[] = [
    { key: "name", label: "Agent", allLabel: "All Agents", placeholder: "All Agents", options: options.name },
    { key: "kebele", label: "Kebele", allLabel: "All Kebeles", placeholder: "All Kebeles", options: options.kebele },
    { key: "designation", label: "Designation", allLabel: "All Designations", placeholder: "All Designations", options: options.designation },
  ];
  const header = (key: AgentKey, label: string, all: string) => (
    <FilterDropdown label={label} allLabel={all} options={options[key]} selected={filters[key]} onApply={(next) => setFilters((p) => ({ ...p, [key]: next }))} />
  );
  const shown = AGENTS.filter((a) => has(filters.name, a.name) && has(filters.kebele, a.kebele) && has(filters.designation, a.designation) && matchesQuery(query, a.name, a.kebele, a.designation));

  const columns: Column<AgentRow>[] = [
    { key: "name", header: header("name", "Agent", "All Agents"), cell: (a) => <span className="font-semibold text-ink">{a.name}</span> },
    { key: "kebele", header: header("kebele", "Kebele", "All Kebeles"), cell: (a) => a.kebele },
    { key: "designation", header: header("designation", "Designation", "All Designations"), cell: (a) => a.designation },
    { key: "service", header: "Service", cell: (a) => serviceLabel(a.months) },
    { key: "allowance", header: "Annual Leave", cell: (a) => allowanceOf(a).days },
    {
      key: "rule",
      header: "Rules applied",
      align: "center",
      cell: (a) => {
        const { rule } = allowanceOf(a);
        return rule === "-" ? "-" : <Pill tone={rule === "Under 6 months" ? "amber" : "blue"} className="whitespace-nowrap px-2.5 py-0.5">{rule}</Pill>;
      },
    },
  ];

  return (
    <div className="flex flex-col gap-4">
      {assigned && <Banner tone="success" title={`Policy assigned to ${ASSIGN_COUNT} agents`}>Their allowances are being worked out from the rules.</Banner>}
      <TableCard title="All Agents" placeholder="Search by leave type, length..." query={query} onQuery={setQuery} activeCount={countActive(filters)} onFilters={() => setIsFiltersOpen(true)} action={<Button variant="brand" className="h-10" onClick={onAssign}>Assign policy to {ASSIGN_COUNT} agents</Button>}>
        <DataTable columns={columns} rows={shown} rowKey={(a) => a.id} itemLabel="agents" minWidth="840px" emptyTitle="No agents match these filters" emptyHint="Clear a filter or search for another agent." />
        <AdvancedFiltersDrawer isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} fields={fields} filters={filters} onApply={(next) => setFilters({ name: next.name ?? new Set(), kebele: next.kebele ?? new Set(), designation: next.designation ?? new Set() })} />
      </TableCard>
      <Banner tone="success">Allowances are recalculated each Hamle 1 and whenever a rule changes. Agents see how their days were worked out.</Banner>
    </div>
  );
}
