"use client";

import { todayIso } from "@/lib/utils";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { FARMER_PAGE_TABS } from "@/features/farmers";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { RowAction } from "@/components/ui/RowAction";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill } from "@/components/ui/Pill";
import { StatCard } from "@/components/ui/StatCard";
import { Banner } from "@/components/ui/Banner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { AdvancedFiltersDrawer, type FilterFieldConfig, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { useAuthStore } from "@/store/useAuthStore";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import {
  AGENT_STATUS_TONE,
  ASSIGNMENT_TONE,
  assignAgent,
  fetchCoverage,
  fetchMyAssignment,
  listAreas,
  listAssignments,
  listKebeles,
  newClientOpId,
  toAgentAssignment,
  type AdminArea,
  type AgentAssignment,
  type AssignmentSummary,
  type AssociationMode,
  type CoverageResponse,
} from "@/features/assignments";

const icon = (d: string) => <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d={d} /></svg>;

const STATUSES = ["Active", "Unassigned", "On-leave", "Separated"];
const ASSIGNMENT_STATES = ["Proposed", "Validated", "Flagged", "Effective", "Superseded"];
const COVERAGE_STATES = ["Full", "Agent on leave", "Flagged", "Uncovered"];
const NO_KEBELE = "—";

const SEARCH_PLACEHOLDER = searchPlaceholder(["Agent", "DA-ID", "Woreda", "Kebele", "Farmers", "Status"]);
const COVERAGE_SEARCH_PLACEHOLDER = searchPlaceholder(["Kebele", "Woreda", "Agents", "Linked farmers", "Households", "Coverage"]);

const optionsOf = (values: string[], order?: readonly string[], label?: (v: string) => string): FilterOption[] =>
  (order ?? [...new Set(values)]).map((value) => ({ value, label: label ? label(value) : value, count: values.filter((v) => v === value).length }));

const has = (set: Set<string>, value: string) => set.size === 0 || set.has(value);
const countActive = (filters: FilterSelection) => Object.values(filters).filter((set) => set.size > 0).length;
const messageOf = (err: unknown, fallback: string) => (err instanceof Error ? err.message : fallback);

const isoToday = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

interface AgentFilters extends FilterSelection {
  woreda: Set<string>;
  kebele: Set<string>;
  status: Set<string>;
  assignment: Set<string>;
}
const EMPTY_AGENT_FILTERS: AgentFilters = { woreda: new Set(), kebele: new Set(), status: new Set(), assignment: new Set() };

interface CoverageFilters extends FilterSelection {
  woreda: Set<string>;
  coverage: Set<string>;
}
const EMPTY_COVERAGE_FILTERS: CoverageFilters = { woreda: new Set(), coverage: new Set() };

interface Draft {
  daId: string;
  /** Woreda and Kebele codes from the administrative-area master. */
  woreda: string;
  kebele: string;
  effectiveDate: string;
  reason: string;
  mode: AssociationMode | "";
  /** Opened from the header "Assign agent" button — the officer picks the agent in the modal. */
  pickAgent?: boolean;
  /** One id per opened form, so a retried commit is not recorded twice. */
  opId: string;
}

type Loaded<T> = { data: T | null; error: string | null };

// FR-05 Agent Assignment (GET/POST /da-services/assignments): agent list by Kebele + Woreda, coverage tiles,
// Assign / Reassign with effective date, farmer-association mode and the backend's geofence validation.
// Reassignment supersedes the prior assignment. A DA sees their own posting (GET /assignments/me).
export function AssignmentsWorkspace() {
  const role = useAuthStore((s) => s.role);
  const canAssign = role === "Supervisor" || role === "Admin";
  const isDA = role === "DA";
  const [reload, setReload] = useState(0);
  const [list, setList] = useState<Loaded<{ rows: AgentAssignment[]; summary: AssignmentSummary | null }> & { key: number } | null>(null);
  const [coverage, setCoverage] = useState<Loaded<CoverageResponse> | null>(null);
  const [woredaAreas, setWoredaAreas] = useState<AdminArea[]>([]);
  const [kebeles, setKebeles] = useState<{ woreda: string; items: AdminArea[]; error: string | null } | null>(null);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<AgentFilters>(EMPTY_AGENT_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [coverageQuery, setCoverageQuery] = useState("");
  const [coverageFilters, setCoverageFilters] = useState<CoverageFilters>(EMPTY_COVERAGE_FILTERS);
  const [isCoverageFiltersOpen, setIsCoverageFiltersOpen] = useState(false);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [outcome, setOutcome] = useState<{ tone: "success" | "warning"; title: string; body: string } | null>(null);

  const woredaNames = useMemo(() => Object.fromEntries(woredaAreas.map((a) => [a.code, a.name_en])), [woredaAreas]);

  // Woreda names for display and the assign form; rows fall back to codes if the master cannot be read.
  useEffect(() => {
    let current = true;
    listAreas({ level: "Woreda" })
      .then((areas) => current && setWoredaAreas(areas))
      .catch(() => {});
    return () => {
      current = false;
    };
  }, []);

  // Officers: the Woreda's agents, then its coverage tiles. A DA: their own posting.
  useEffect(() => {
    let current = true;
    if (isDA) {
      fetchMyAssignment()
        .then((me) => current && setList({ key: reload, data: { rows: [toAgentAssignment(me)], summary: null }, error: null }))
        .catch((err: unknown) => current && setList({ key: reload, data: null, error: messageOf(err, "Could not load your assignment.") }));
      return () => {
        current = false;
      };
    }
    listAssignments()
      .then(({ rows, summary }) => {
        if (!current) return;
        setList({ key: reload, data: { rows: rows.map((r) => toAgentAssignment(r)), summary }, error: null });
        // A Supervisor's own Woreda is the backend default; other officers see the first Woreda in the list.
        return fetchCoverage(role === "Supervisor" ? undefined : rows.find((r) => r.woreda)?.woreda ?? undefined);
      })
      .then((cov) => current && cov && setCoverage({ data: cov, error: null }))
      .catch((err: unknown) => {
        if (!current) return;
        const message = messageOf(err, "Could not load assignments.");
        setList((prev) => (prev?.key === reload ? prev : { key: reload, data: null, error: message }));
        setCoverage({ data: null, error: message });
      });
    return () => {
      current = false;
    };
  }, [isDA, reload, role]);

  // Kebeles of the Woreda picked in the assign form.
  const draftWoreda = draft?.woreda ?? "";
  useEffect(() => {
    if (!draftWoreda) return;
    let current = true;
    listKebeles(draftWoreda)
      .then((items) => current && setKebeles({ woreda: draftWoreda, items, error: null }))
      .catch((err: unknown) => current && setKebeles({ woreda: draftWoreda, items: [], error: messageOf(err, "Could not load kebeles.") }));
    return () => {
      current = false;
    };
  }, [draftWoreda]);

  const loading = list?.key !== reload;
  const rows = useMemo(
    () => (list?.data?.rows ?? []).map((r) => ({ ...r, woreda: (r.woredaCode && woredaNames[r.woredaCode]) || r.woreda })),
    [list, woredaNames],
  );
  const summary = list?.data?.summary ?? null;
  const listError = loading ? null : (list?.error ?? null);

  const setFilter = (key: keyof AgentFilters) => (next: Set<string>) => setFilters((prev) => pruneKebeles({ ...prev, [key]: next }));
  const setCoverageFilter = (key: keyof CoverageFilters) => (next: Set<string>) => setCoverageFilters((prev) => ({ ...prev, [key]: next }));

  // Kebeles present under the selected woredas, plus the "no kebele yet" bucket.
  const kebelesFor = (woredas: Set<string>) => [...new Set(rows.filter((r) => has(woredas, r.woreda)).map((r) => r.kebele ?? NO_KEBELE))];
  const pruneKebeles = (next: AgentFilters): AgentFilters => {
    const allowed = new Set(kebelesFor(next.woreda));
    return { ...next, kebele: new Set([...next.kebele].filter((k) => allowed.has(k))) };
  };

  const woredaOptions = optionsOf(rows.map((r) => r.woreda));
  const kebeleOptions = optionsOf(
    rows.filter((r) => has(filters.woreda, r.woreda)).map((r) => r.kebele ?? NO_KEBELE),
    undefined,
    (k) => (k === NO_KEBELE ? "No kebele yet" : k),
  );
  const statusOptions = optionsOf(rows.map((r) => r.status), STATUSES);
  const assignmentOptions = optionsOf(rows.map((r) => r.assignmentStatus), ASSIGNMENT_STATES);
  const filterFields: FilterFieldConfig[] = [
    { key: "woreda", label: "Woreda", allLabel: "All woredas", placeholder: "All Woredas", options: woredaOptions },
    { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All Kebeles", options: kebeleOptions },
    { key: "status", label: "Status", allLabel: "All Status", placeholder: "All Status", options: statusOptions },
    { key: "assignment", label: "Assignment", allLabel: "All assignment states", placeholder: "All", options: assignmentOptions },
  ];

  const visible = useMemo(() => {
    return rows.filter(
      (r) =>
        has(filters.woreda, r.woreda) &&
        has(filters.kebele, r.kebele ?? NO_KEBELE) &&
        has(filters.status, r.status) &&
        has(filters.assignment, r.assignmentStatus) &&
        matchesQuery(query, r),
    );
  }, [rows, query, filters]);

  const coverageWoredaName = coverage?.data ? woredaNames[coverage.data.woreda] ?? coverage.data.woreda : "";
  const coverageAll = (coverage?.data?.kebeles ?? []).map((k) => ({
    kebele: k.kebele_name || k.kebele,
    woreda: woredaNames[k.woreda] ?? k.woreda,
    agents: k.agents,
    farmers: k.farmers,
    households: k.households,
    coverage: k.coverage,
  }));
  const coverageWoredaOptions = optionsOf(coverageAll.map((k) => k.woreda));
  const coverageOptions = optionsOf(coverageAll.map((k) => k.coverage), COVERAGE_STATES);
  const coverageFilterFields: FilterFieldConfig[] = [
    { key: "woreda", label: "Woreda", allLabel: "All woredas", placeholder: "All Woredas", options: coverageWoredaOptions },
    { key: "coverage", label: "Coverage", allLabel: "All coverage states", placeholder: "All", options: coverageOptions },
  ];
  const coverageRows = coverageAll.filter(
    (k) => has(coverageFilters.woreda, k.woreda) && has(coverageFilters.coverage, k.coverage) && matchesQuery(coverageQuery, k),
  );

  const mine = isDA ? rows[0] : undefined;
  const kebelesCovered = new Set(rows.filter((r) => r.kebele).map((r) => r.kebele)).size;
  const unassigned = summary?.unassigned ?? rows.filter((r) => r.status === "Unassigned").length;
  const assigned = rows.filter((r) => r.farmers > 0);
  const avgLoad = Math.round(assigned.reduce((s, r) => s + r.farmers, 0) / Math.max(1, assigned.length));

  const openForm = (next: Omit<Draft, "opId">) => {
    setSaveError(null);
    setDraft({ ...next, opId: newClientOpId() });
  };

  const openAssign = (r: AgentAssignment) =>
    openForm({ daId: r.daId, woreda: r.woredaCode ?? "", kebele: r.kebeleCode ?? "", effectiveDate: isoToday(), reason: "", mode: r.mode ?? "Automatic" });

  // Header "Assign agent": every field starts empty and the officer fills it in, agent included.
  const openNewAssign = () => openForm({ daId: "", woreda: rows.find((r) => r.woredaCode)?.woredaCode ?? "", kebele: "", effectiveDate: isoToday(), reason: "", mode: "", pickAgent: true });

  const draftAgent = draft ? rows.find((r) => r.daId === draft.daId) : undefined;
  const draftKebeles = kebeles && kebeles.woreda === draft?.woreda ? kebeles : null;

  const commit = async () => {
    if (!draft || !draft.mode || !draftAgent) return;
    const kebeleName = draftKebeles?.items.find((k) => k.code === draft.kebele)?.name_en ?? draft.kebele;
    const isReassign = Boolean(draftAgent.kebele);
    setSaving(true);
    setSaveError(null);
    try {
      const decision = await assignAgent({
        da_id: draft.daId,
        kebele: draft.kebele,
        effective_date: draft.effectiveDate,
        reason: draft.reason.trim(),
        mode: draft.mode,
        client_op_id: draft.opId,
      });
      const when = new Date(`${draft.effectiveDate}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
      if (decision.state === "Flagged") {
        setOutcome({
          tone: "warning",
          title: `Assignment of ${draftAgent.agent} to ${kebeleName} is Flagged (out-of-bounds).`,
          body: `${decision.geofence_reason ?? "The DA's position is outside the Kebele boundary"}. It is recorded as Flagged and does not become Effective until a supervisor overrides it or the boundary data is corrected.`,
        });
      } else {
        const check = decision.geofence_result === "In-boundary" ? "Validated (in-boundary)" : "geofence not checked (no DA position or Kebele boundary)";
        setOutcome({
          tone: "success",
          title: `${draftAgent.agent} ${isReassign ? "reassigned" : "assigned"} to ${kebeleName} — ${check}, effective ${when}.`,
          body: `${isReassign ? `Prior assignment (${draftAgent.kebele}) is now Superseded. ` : ""}Farmer association: ${draft.mode.toLowerCase()}. The DA has been notified.`,
        });
      }
      setDraft(null);
      setReload((n) => n + 1);
    } catch (err) {
      setSaveError(messageOf(err, "Could not save the assignment. Please try again."));
    } finally {
      setSaving(false);
    }
  };

  const assignedByColumn: Column<AgentAssignment> = { key: "assignedBy", header: "Assigned by", cell: (r) => r.assignedBy ?? <span className="text-subtle">—</span> };

  const daIdColumn: Column<AgentAssignment> = { key: "daId", header: "DA-ID", cell: (r) => <span className="font-mono text-[13px] text-ink-soft">{r.daId}</span> };

  // A DA sees DA-ID then who assigned them, with no Agent column (the agent is always themselves).
  const columns: Column<AgentAssignment>[] = [
    ...(isDA
      ? [daIdColumn, assignedByColumn]
      : [{ key: "agent", header: "Agent", cell: (r: AgentAssignment) => <Link href={`/agents/${r.daId}`} className="font-medium text-ink hover:text-brand-green">{r.agent}</Link> }, daIdColumn]),
    { key: "woreda", header: <FilterDropdown label="Woreda" allLabel="All woredas" options={woredaOptions} selected={filters.woreda} onApply={setFilter("woreda")} />, cell: (r) => r.woreda },
    { key: "kebele", header: <FilterDropdown label="Kebele" allLabel="All kebeles" options={kebeleOptions} selected={filters.kebele} onApply={setFilter("kebele")} />, cell: (r) => (r.kebele ? <span>{r.kebele}<span className="block text-[12px] text-muted">since {r.effectiveDate}</span></span> : <span className="text-subtle">—</span>) },
    { key: "farmers", header: "Farmers", align: "right", cell: (r) => r.farmers.toLocaleString() },
    {
      key: "status",
      header: (
        <span className="inline-flex items-center gap-1.5">
          <FilterDropdown label="Status" allLabel="All Status" options={statusOptions} selected={filters.status} onApply={setFilter("status")} />
          <span className="text-subtle">/</span>
          <FilterDropdown label="Assignment" allLabel="All assignment states" options={assignmentOptions} selected={filters.assignment} onApply={setFilter("assignment")} />
        </span>
      ),
      cell: (r) => <div className="flex flex-col items-start gap-1"><Pill tone={AGENT_STATUS_TONE[r.status]} dot>{r.status}</Pill><Pill tone={ASSIGNMENT_TONE[r.assignmentStatus]}>{r.assignmentStatus}{r.geofence === "Out-of-bounds" ? " · out-of-bounds" : ""}</Pill></div> },
    ...(isDA ? [] : [assignedByColumn]),
    {
      key: "actions", header: "Actions", align: "center",
      cell: (r) => (
        <div className="flex items-center justify-center gap-1.5">
          {canAssign && r.status !== "Separated" && <RowAction tone="solid" onClick={() => openAssign(r)}>{r.kebele ? "Reassign" : "Assign"}</RowAction>}
          <RowAction href={`/agents/${r.daId}`} icon="view">View</RowAction>
        </div>
      ),
    },
  ];

  return (
    <>
      <PageHeader
        tabs={FARMER_PAGE_TABS}
        activeHref="/assignments"
        title="Agent Assignment"
        description="Links a DA to their Kebele of operation and, through it, to the farmers they serve. Assign or reassign with an effective date; geofence validation runs on commit."
        actions={
          canAssign && (
            <button
              type="button"
              onClick={openNewAssign}
              className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md bg-brand-green px-4 text-[14px] font-semibold text-white transition-colors hover:bg-brand-green-dark"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
                <path d="M12 5v14M5 12h14" />
              </svg>
              Assign agent
            </button>
          )
        }
      />

      {isDA ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="My kebele" value={mine?.kebele ?? "—"} hint={mine ? `${mine.woreda} woreda` : "Not assigned yet"} accent="border-l-brand-green" tile="bg-brand-tint text-brand-green" icon={icon("M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z")} />
          <StatCard label="Linked farmers" value={(mine?.farmers ?? 0).toLocaleString()} hint={mine && mine.farmers === 0 ? "No farmer assigned" : undefined} accent="border-l-blue-600" tile="bg-blue-50 text-blue-600" icon={icon("M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z")} />
          <StatCard label="Effective since" value={mine?.effectiveDate ?? "—"} accent="border-l-amber-600" tile="bg-warning-wash text-amber-600" icon={icon("M8 3v4M16 3v4M3 10h18M5 5h14a2 2 0 012 2v12a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2z")} />
          <StatCard label="Assigned by" value={mine?.assignedBy ?? "—"} hint="Woreda supervisor" accent="border-l-violet-600" tile="bg-violet-50 text-violet-600" icon={icon("M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM17 11l2 2 4-4")} />
        </div>
      ) : (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Agents" value={String(summary?.agents ?? rows.length)} accent="border-l-brand-green" tile="bg-brand-tint text-brand-green" icon={icon("M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8z")} />
        <StatCard label="Kebeles covered" value={String(kebelesCovered)} accent="border-l-blue-600" tile="bg-blue-50 text-blue-600" icon={icon("M21 10c0 7-9 13-9 13S3 17 3 10a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z")} />
        <StatCard label="Unassigned" value={String(unassigned)} accent="border-l-amber-600" tile="bg-warning-wash text-amber-600" icon={icon("M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 11l-4 4M18 11l4 4")} />
        <StatCard label="Average load" value={avgLoad.toLocaleString()} hint="farmers per assigned agent" accent="border-l-violet-600" tile="bg-violet-50 text-violet-600" icon={icon("M18 20V10M12 20V4M6 20v-6")} />
      </div>
      )}

      {outcome && <Banner tone={outcome.tone} title={outcome.title} onDismiss={() => setOutcome(null)}>{outcome.body}</Banner>}
      {listError && <Banner tone="error" title={isDA ? "Could not load your assignment" : "Could not load assignments"}>{listError}</Banner>}

      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <h2 className="text-[15px] font-semibold text-ink">{isDA ? "My assignment from supervisor" : "Agents by Kebele and Woreda"}</h2>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />
            <AdvancedFiltersButton activeCount={countActive(filters)} onClick={() => setIsFiltersOpen(true)} />
          </div>
        </div>
        <DataTable
          itemLabel="agents"
          columns={columns}
          rows={visible}
          rowKey={(r) => r.daId}
          minWidth="1000px"
          state={loading ? "loading" : listError ? "error" : "ready"}
          onRetry={() => setReload((n) => n + 1)}
          emptyTitle={rows.length === 0 ? (isDA ? "No assignment yet" : "No agents in this Woreda") : "No agents match the selected filters"}
          emptyHint={rows.length === 0 ? undefined : "Clear a filter or try a different search."}
        />

        <AdvancedFiltersDrawer
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          fields={filterFields}
          filters={filters}
          onApply={(next) =>
            setFilters(
              pruneKebeles({
                woreda: next.woreda ?? new Set(),
                kebele: next.kebele ?? new Set(),
                status: next.status ?? new Set(),
                assignment: next.assignment ?? new Set(),
              }),
            )
          }
        />
      </Card>

      {/* Read-only Kebele coverage summary — managed separately (§3.5); not part of what a DA receives from their supervisor. */}
      {!isDA && (
      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">Kebele coverage summary <Pill tone="slate">Read-only</Pill></h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">Service coverage across kebeles{coverageWoredaName ? ` in ${coverageWoredaName}` : ""}. This reporting view is managed separately and is not edited from the assignment screen.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <SearchInput value={coverageQuery} onChange={setCoverageQuery} placeholder={COVERAGE_SEARCH_PLACEHOLDER} />
            <AdvancedFiltersButton activeCount={countActive(coverageFilters)} onClick={() => setIsCoverageFiltersOpen(true)} />
          </div>
        </div>
        <DataTable itemLabel="kebeles"
          minWidth="720px"
          rowKey={(k) => k.kebele}
          rows={coverageRows}
          state={!coverage ? "loading" : coverage.error ? "error" : "ready"}
          onRetry={() => setReload((n) => n + 1)}
          emptyTitle={coverageAll.length === 0 ? "No kebeles in the area master for this Woreda" : "No kebeles match the selected filters"}
          emptyHint={coverageAll.length === 0 ? undefined : "Clear a filter or try a different search."}
          columns={[
            { key: "kebele", header: "Kebele", cell: (k) => <span className="font-medium text-ink">{k.kebele}</span> },
            { key: "woreda", header: <FilterDropdown label="Woreda" allLabel="All woredas" options={coverageWoredaOptions} selected={coverageFilters.woreda} onApply={setCoverageFilter("woreda")} />, cell: (k) => k.woreda },
            { key: "agents", header: "Agents", align: "right", cell: (k) => k.agents },
            { key: "farmers", header: "Linked farmers", align: "right", cell: (k) => k.farmers.toLocaleString() },
            { key: "hh", header: "Households", align: "right", cell: (k) => (k.households == null ? <span className="text-subtle">—</span> : k.households.toLocaleString()) },
            { key: "cov", header: <FilterDropdown label="Coverage" allLabel="All coverage states" options={coverageOptions} selected={coverageFilters.coverage} onApply={setCoverageFilter("coverage")} />, cell: (k) => <Pill tone={k.coverage === "Full" ? "green" : k.coverage === "Uncovered" ? "red" : "amber"}>{k.coverage}</Pill> },
          ]}
        />

        <AdvancedFiltersDrawer
          isOpen={isCoverageFiltersOpen}
          onClose={() => setIsCoverageFiltersOpen(false)}
          fields={coverageFilterFields}
          filters={coverageFilters}
          onApply={(next) =>
            setCoverageFilters({
              woreda: next.woreda ?? new Set(),
              coverage: next.coverage ?? new Set(),
            })
          }
        />
      </Card>
      )}

      {draft && (
        <Modal isOpen onClose={() => !saving && setDraft(null)} title={draftAgent?.kebele ? "Reassign Agent" : "Assign Agent"} subtitle={draftAgent ? `${draftAgent.agent} · ${draft.daId}` : "Select an agent"} size="lg"
          footer={<><Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>Cancel</Button><Button variant="brand" disabled={saving || !draftAgent || !draft.woreda || !draft.kebele || !draft.mode || !draft.effectiveDate || draft.reason.trim().length < 3} onClick={commit}>{saving ? "Validating…" : <>Validate &amp; commit</>}</Button></>}
        >
          {saveError && <Banner tone="error" title="Assignment not saved" className="mb-4">{saveError}</Banner>}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {draft.pickAgent && (
              <FormField label="Agent" htmlFor="as-agent" required className="sm:col-span-2" hint={draftAgent?.kebele ? `Currently in ${draftAgent.kebele} — committing supersedes that assignment.` : undefined}>
                <Select id="as-agent" value={draft.daId} onChange={(e) => setDraft({ ...draft, daId: e.target.value })}>
                  <option value="">Select agent</option>
                  {rows.filter((r) => r.status !== "Separated").map((r) => <option key={r.daId} value={r.daId}>{r.agent} · {r.daId}{r.kebele ? ` (${r.kebele})` : " (unassigned)"}</option>)}
                </Select>
              </FormField>
            )}
            <FormField label="Woreda" htmlFor="as-woreda" required>
              <Select id="as-woreda" value={draft.woreda} onChange={(e) => setDraft({ ...draft, woreda: e.target.value, kebele: "" })}>
                <option value="">Select woreda</option>
                {woredaAreas.map((w) => <option key={w.code} value={w.code}>{w.name_en}</option>)}
                {draft.woreda && !woredaAreas.some((w) => w.code === draft.woreda) && <option value={draft.woreda}>{draft.woreda}</option>}
              </Select>
            </FormField>
            <FormField label="Kebele" htmlFor="as-kebele" required hint={draftKebeles?.error ?? (draft.woreda && draftKebeles && draftKebeles.items.length === 0 ? "No kebeles in the area master for this Woreda." : undefined)} hintTone={draftKebeles?.error ? "error" : "muted"}>
              <Select id="as-kebele" value={draft.kebele} disabled={!draft.woreda || !draftKebeles} onChange={(e) => setDraft({ ...draft, kebele: e.target.value })}>
                <option value="">{draft.woreda && !draftKebeles ? "Loading kebeles…" : "Select kebele"}</option>
                {draftKebeles?.items.map((k) => <option key={k.code} value={k.code}>{k.name_en}</option>)}
              </Select>
            </FormField>
            <FormField label="Effective date" htmlFor="as-date" required hint="Today or later." hintTone={!!draft.effectiveDate && draft.effectiveDate < todayIso() ? "error" : "muted"}>
              <Input id="as-date" type="date" min={todayIso()} value={draft.effectiveDate} onChange={(e) => setDraft({ ...draft, effectiveDate: e.target.value })} />
            </FormField>
            <FormField label="Farmer association" htmlFor="as-mode" required hint={draft.mode === "Automatic" ? "Farmers in the kebele task list are linked automatically." : draft.mode === "Manual" ? "You select the farmers after commit." : undefined}>
              <Select id="as-mode" value={draft.mode} onChange={(e) => setDraft({ ...draft, mode: e.target.value as AssociationMode | "" })}><option value="">Select farmer association</option><option>Automatic</option><option>Manual</option></Select>
            </FormField>
            <FormField label="Reason" htmlFor="as-reason" required className="sm:col-span-2" hint="At least 3 characters. Recorded with the assignment; reassignment supersedes the prior assignment (effective-dated)." hintTone={draft.reason.trim().length > 0 && draft.reason.trim().length < 3 ? "error" : "muted"}>
              <Input id="as-reason" value={draft.reason} onChange={(e) => setDraft({ ...draft, reason: e.target.value })} placeholder="Enter reason" />
            </FormField>
          </div>
          {!saving && (!draftAgent || !draft.woreda || !draft.kebele || !draft.mode || !draft.effectiveDate || draft.reason.trim().length < 3) && <p className="mt-3 text-[12.5px] text-muted">Complete every field marked * to enable Validate &amp; commit.</p>}
          {draft.kebele && (
            <div className="mt-4 rounded-lg border border-line bg-surface p-3 text-[13px] text-ink-soft">
              Geofence validation runs on commit: <span className="font-semibold text-ink">In-boundary → Validated → Effective</span>, or <span className="font-semibold text-danger">Out-of-bounds → Flagged</span> with the reason.
            </div>
          )}
        </Modal>
      )}
    </>
  );
}
