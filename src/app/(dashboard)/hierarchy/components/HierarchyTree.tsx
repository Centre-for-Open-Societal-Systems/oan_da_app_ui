"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import {
  EMPLOYEE_ROLE_LABELS,
  agentsUnder,
  canManageTeams,
  chainAbove,
  employeeMatches,
  selfIn,
  treeRootFor,
  type Employee,
  type Viewer,
} from "@/features/hierarchy";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

/** Names from the login that place the user in the sample tree (no API call). */
export function useViewer(): Viewer {
  const user = useAuthStore((s) => s.user);
  const loc = useAuthStore((s) => s.profile?.location);
  return { name: user?.name, region: loc?.region?.name, woreda: loc?.woreda?.name, kebele: loc?.kebele?.name };
}

const initials = (name: string) =>
  name
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();

const AVATAR: Record<Employee["role"], string> = {
  Admin: "bg-slate-100 text-slate-800 border-slate-200/80",
  Executive: "bg-violet-100 text-violet-800 border-violet-200/80",
  WoredaHead: "bg-blue-100 text-blue-800 border-blue-200/80",
  Supervisor: "bg-emerald-100 text-emerald-800 border-emerald-200/80",
  DA: "bg-teal-50 text-teal-800 border-teal-200/80",
};

export const SPECIALISM_TAG_MAP: Record<string, { icon: string; label: string; className: string }> = {
  "crop production": {
    icon: "🌾",
    label: "Crop production",
    className: "border-[#a3e6b5] bg-[#ebf8ef] text-[#15803d]",
  },
  "pest & disease": {
    icon: "🐛",
    label: "Pest & disease",
    className: "border-[#fbcba8] bg-[#fff2e8] text-[#c2410c]",
  },
  "livestock": {
    icon: "🐄",
    label: "Livestock",
    className: "border-[#fcd34d] bg-[#fff9db] text-[#854d0e]",
  },
  "natural resources": {
    icon: "🌿",
    label: "Natural resources",
    className: "border-[#a7f3d0] bg-[#ecfdf5] text-[#047857]",
  },
  "soil & water": {
    icon: "💧",
    label: "Soil & water",
    className: "border-[#9ee0ff] bg-[#e6f6ff] text-[#0284c7]",
  },
  "markets & credit": {
    icon: "📊",
    label: "Markets & credit",
    className: "border-[#d8b4fe] bg-[#f3e8ff] text-[#6d28d9]",
  },
};

export function SpecialismTag({ specialism, className }: { specialism: string; className?: string }) {
  const norm = specialism.toLowerCase().trim();
  const config = SPECIALISM_TAG_MAP[norm] ?? {
    icon: "🏷️",
    label: specialism,
    className: "border-slate-200 bg-slate-50 text-slate-700",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[11px] sm:text-[11.5px] font-semibold tracking-tight shadow-2xs",
        config.className,
        className,
      )}
    >
      <span className="text-[11.5px] leading-none select-none">{config.icon}</span>
      <span>{config.label}</span>
    </span>
  );
}

function RowActions({ name }: { name: string }) {
  const base = "inline-flex h-7 w-7 sm:h-7.5 sm:w-7.5 items-center justify-center rounded-lg transition-all duration-150 active:scale-95 shadow-2xs cursor-pointer";
  return (
    <div className="flex shrink-0 items-center gap-1 sm:gap-1.5">
      <button
        type="button"
        title={`Add a report under ${name}`}
        aria-label={`Add a report under ${name}`}
        className={cn(base, "bg-brand-mint/60 text-brand-green border border-brand-green/20 hover:bg-brand-mint hover:scale-105")}
      >
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <button
        type="button"
        title={`Change who ${name} reports to`}
        aria-label={`Change who ${name} reports to`}
        className={cn(base, "bg-white text-ink-soft border border-line hover:text-ink hover:border-slate-300 hover:scale-105")}
      >
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
        </svg>
      </button>
      <button
        type="button"
        title={`Remove ${name}`}
        aria-label={`Remove ${name}`}
        className={cn(base, "bg-white text-red-600 border border-line hover:bg-red-50 hover:border-red-200 hover:text-red-700 hover:scale-105")}
      >
        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M3 6h18M8 6V4h8v2M6 6l1 14h10l1-14M10 11v6M14 11v6" />
        </svg>
      </button>
    </div>
  );
}

interface TreeCtx {
  open: Set<string>;
  toggle: (id: string) => void;
  query: string;
  setQuery: (q: string) => void;
  editable: boolean;
  selfId: string | null;
}

function TreeRow({ person, depth, ctx }: { person: Employee; depth: number; ctx: TreeCtx }) {
  const reports = (person.reports ?? []).filter((r) => employeeMatches(r, ctx.query));
  const hasReports = (person.reports ?? []).length > 0;
  // A search keeps matching branches open so the hit is visible.
  const isOpen = ctx.open.has(person.id) || (!!ctx.query.trim() && reports.length > 0);
  const agents = person.role === "DA" ? 0 : agentsUnder(person);
  const isSelf = person.id === ctx.selfId;

  // Responsive tree indentation: 12px on mobile, 24px on sm+
  const indentStyle = {
    paddingLeft: `calc(${depth} * var(--tree-indent, 12px))`,
  } as React.CSSProperties;

  return (
    <>
      <div
        className={cn(
          "group border-b border-line-soft px-3 sm:px-5 py-2.5 sm:py-3 transition-colors [--tree-indent:12px] sm:[--tree-indent:24px]",
          isSelf ? "bg-emerald-50/50 border-l-[3.5px] border-l-brand-green" : "hover:bg-slate-50/80 bg-white",
        )}
      >
        <div className="flex items-start justify-between gap-2 sm:gap-3" style={indentStyle}>
          {/* Left section: Connector + Expand + Avatar + Details */}
          <div className="flex min-w-0 flex-1 items-start gap-1.5 sm:gap-2.5">
            {/* Tree connector hook for child levels */}
            {depth > 0 && (
              <div className="-ml-2 sm:-ml-3 flex items-center justify-center w-2.5 sm:w-3 shrink-0 text-slate-300 mt-1 sm:mt-1.5" aria-hidden="true">
                <svg className="w-3 sm:w-3.5 h-5 stroke-slate-300 fill-none" viewBox="0 0 14 24">
                  <path d="M0 0 v12 a 3 3 0 0 0 3 3 h 11" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </div>
            )}

            {/* Expand / Collapse Button */}
            {hasReports ? (
              <button
                type="button"
                onClick={() => ctx.toggle(person.id)}
                aria-expanded={isOpen}
                aria-label={`${isOpen ? "Collapse" : "Expand"} ${person.name}`}
                className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center rounded-lg border border-line-soft bg-white text-slate-600 hover:border-brand-green hover:text-brand-green hover:bg-emerald-50 transition-all duration-150 active:scale-95 shadow-2xs cursor-pointer mt-0.5 sm:mt-1"
              >
                <svg
                  className={cn("h-3.5 w-3.5 transition-transform duration-200", isOpen && "rotate-90 text-brand-green")}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M9 18l6-6-6-6" />
                </svg>
              </button>
            ) : depth === 0 ? (
              <span className="flex h-6 w-6 sm:h-7 sm:w-7 shrink-0 items-center justify-center mt-0.5 sm:mt-1" aria-hidden="true">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
              </span>
            ) : null}

            {/* Avatar with initials */}
            <span
              className={cn(
                "flex h-7.5 w-7.5 sm:h-8.5 sm:w-8.5 shrink-0 items-center justify-center rounded-full text-[11px] sm:text-[12px] font-bold shadow-2xs ring-2 ring-white border mt-0.5",
                AVATAR[person.role],
              )}
            >
              {initials(person.name)}
            </span>

            {/* Employee Details (flex-1 with min-w-0 ensures clean text wrapping without overflowing into actions) */}
            <div className="flex min-w-0 flex-1 flex-col gap-0.5 sm:gap-1">
              {/* Line 1: Name + Status badges */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
                <span className="font-semibold text-ink text-[13.5px] sm:text-[14.5px] leading-tight">
                  {person.name}
                </span>
                {isSelf && <Pill tone="green" dot>You</Pill>}
                {person.individual && <Pill tone="blue">Individual</Pill>}
              </div>

              {/* Line 2: Role · Place + Tag + Agents */}
              <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[11.5px] sm:text-[12px] text-ink-soft">
                <span className="font-medium text-ink-soft">
                  <span className="text-slate-700 font-semibold">{EMPLOYEE_ROLE_LABELS[person.role]}</span>
                  <span className="text-slate-400"> · </span>
                  <span>{person.role === "DA" ? `${person.place} kebele` : person.place}</span>
                </span>

                {/* Specialism Tag Pill */}
                {person.specialism && <SpecialismTag specialism={person.specialism} />}

                {/* Agents count */}
                {agents > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 sm:px-2.5 py-0.5 text-[10.5px] sm:text-[11.5px] font-semibold text-emerald-700 border border-emerald-200/60 shadow-2xs whitespace-nowrap">
                    <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                    </svg>
                    <span>{agents} agents</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right section: Row actions (pinned to top-right so text never collides!) */}
          {ctx.editable && (
            <div className="shrink-0 mt-0.5 pl-1">
              <RowActions name={person.name} />
            </div>
          )}
        </div>
      </div>
      {isOpen && reports.map((r) => <TreeRow key={r.id} person={r} depth={depth + 1} ctx={ctx} />)}
    </>
  );
}

/** Opens the root and every manager down to the user's own row, so it is in view. */
function initiallyOpen(root: Employee, selfId: string | null): Set<string> {
  const open = new Set([root.id]);
  const walk = (e: Employee): boolean => {
    if (e.id === selfId) return true;
    const below = (e.reports ?? []).some(walk);
    if (below) open.add(e.id);
    return below;
  };
  walk(root);
  // With no own row (Admin / Comms), open the first branch down to its first team.
  if (!selfId) for (let e: Employee | undefined = root; e && e.role !== "Supervisor"; e = e.reports?.[0]) open.add(e.id);
  return open;
}

/** Collects all employee IDs recursively in the tree. */
function collectAllIds(e: Employee): string[] {
  return [e.id, ...(e.reports ?? []).flatMap(collectAllIds)];
}

/** Counts total employees under a node including self. */
function countEmployees(e: Employee): number {
  return 1 + (e.reports ?? []).reduce((sum, r) => sum + countEmployees(r), 0);
}

// Employee hierarchy: who reports to whom, from the signed-in user's place down (see treeRootFor). UI only.
export function HierarchyTree({ initialQuery = "", query: externalQuery, onQueryChange }: { initialQuery?: string; query?: string; onQueryChange?: (q: string) => void }) {
  const role = useAuthStore((s) => s.role);
  const viewer = useViewer();
  const root = treeRootFor(role, viewer);
  const selfId = selfIn(role, viewer)?.id ?? null;

  const [internalQuery, setInternalQuery] = useState(initialQuery);
  const query = externalQuery !== undefined ? externalQuery : internalQuery;
  const setQuery = onQueryChange ?? setInternalQuery;

  const [open, setOpen] = useState<Set<string>>(() => initiallyOpen(root, selfId));

  const allIds = useMemo(() => collectAllIds(root), [root]);
  const totalEmployees = useMemo(() => countEmployees(root), [root]);
  const isAllExpanded = allIds.every((id) => open.has(id));

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () => {
    if (isAllExpanded) {
      setOpen(new Set([root.id]));
    } else {
      setOpen(new Set(allIds));
    }
  };

  const ctx: TreeCtx = { open, toggle, query, setQuery, editable: canManageTeams(role), selfId };
  const above = chainAbove(root);
  const visible = employeeMatches(root, query);

  return (
    <Card className="overflow-hidden rounded-2xl border border-line bg-white p-0 shadow-card">
      {/* Card Header & Search Toolbar */}
      <div className="flex flex-col gap-3 border-b border-line px-3.5 py-3 sm:px-5 sm:py-4 lg:flex-row lg:items-center lg:justify-between bg-white">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[16px] sm:text-[18px] font-bold tracking-tight text-ink">
              Reporting Structure
            </h2>
            <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] sm:text-[11.5px] font-semibold text-slate-600 border border-slate-200/60">
              {totalEmployees} {totalEmployees === 1 ? "member" : "members"} in tree
            </span>
            {query.trim() && (
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] sm:text-[11.5px] font-semibold text-brand-green border border-emerald-200/80">
                Filtered: &quot;{query.trim()}&quot;
                <button
                  type="button"
                  onClick={() => setQuery("")}
                  className="rounded-full hover:bg-emerald-100/80 px-1 text-brand-green transition-colors cursor-pointer"
                  aria-label="Clear filter"
                >
                  ✕
                </button>
              </span>
            )}
          </div>

          {above.length > 0 ? (
            <div className="mt-1 flex flex-wrap items-center gap-1 text-[11.5px] sm:text-[12.5px] text-ink-soft leading-normal">
              <span className="font-semibold text-ink mr-0.5">Reports up to:</span>
              {above.map((p, i) => (
                <span key={p.id} className="inline-flex items-center gap-1">
                  {i > 0 && <span className="text-slate-400 font-semibold px-0.5 select-none">›</span>}
                  <span className="font-medium text-slate-700">
                    {p.name}{" "}
                    <span className="text-muted font-normal">({EMPLOYEE_ROLE_LABELS[p.role]})</span>
                  </span>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-1 text-[11.5px] sm:text-[12.5px] text-ink-soft">
              Organizational reporting hierarchy and delegation lines.
            </p>
          )}
        </div>

        {/* Compact search input + Expand/Collapse All toggle */}
        <div className="flex items-center gap-2 shrink-0 w-full lg:w-auto">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search employees..."
            className="flex-1 min-w-0 lg:w-68 [&_input]:h-10 [&_input]:rounded-xl font-medium"
          />
          <Button
            variant="outline"
            size="sm"
            onClick={toggleAll}
            className="h-10 gap-1.5 whitespace-nowrap rounded-xl font-semibold border-line hover:border-brand-green hover:text-brand-green px-3 sm:px-3.5 cursor-pointer shadow-2xs shrink-0"
          >
            {isAllExpanded ? (
              <>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 14 12 6 20 14" />
                  <polyline points="4 20 12 12 20 20" />
                </svg>
                <span className="text-[12.5px]">Collapse all</span>
              </>
            ) : (
              <>
                <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="4 6 12 14 20 6" />
                  <polyline points="4 12 12 20 20 12" />
                </svg>
                <span className="text-[12.5px]">Expand all</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-full">
          <div className="flex items-center justify-between border-b border-line bg-surface/60 px-3 sm:px-5 py-2 sm:py-2.5 text-[11px] sm:text-[12px] font-semibold uppercase tracking-wider text-slate-500">
            <span>Employee & Role</span>
            {ctx.editable && <span>Actions</span>}
          </div>
          {visible ? (
            <TreeRow person={root} depth={0} ctx={ctx} />
          ) : (
            <div className="p-8">
              <EmptyState
                title="No matching employees found"
                hint={query ? `No employees found matching "${query}". Try searching by another name, role, woreda or kebele.` : "Try a name, role, woreda or kebele."}
                onAction={query ? () => setQuery("") : undefined}
                actionLabel="Clear search"
              />
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}
