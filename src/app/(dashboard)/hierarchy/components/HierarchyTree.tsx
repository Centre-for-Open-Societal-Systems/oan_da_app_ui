"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill } from "@/components/ui/Pill";
import { EMPLOYEE_ROLE_LABELS, agentsUnder, canManageTeams, chainAbove, employeeMatches, selfIn, treeRootFor, type Employee, type Viewer } from "@/features/hierarchy";
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
  Admin: "bg-slate-100 text-slate-700",
  Executive: "bg-violet-50 text-violet-700",
  WoredaHead: "bg-blue-50 text-blue-700",
  Supervisor: "bg-brand-mint text-brand-green",
  DA: "bg-surface text-ink-soft",
};

function RowActions({ name }: { name: string }) {
  const base = "inline-flex h-7 w-7 items-center justify-center rounded-md transition-colors";
  return (
    <div className="flex shrink-0 items-center gap-1">
      <button type="button" aria-label={`Add a report under ${name}`} className={cn(base, "bg-brand-mint text-brand-green hover:bg-brand-tint")}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
          <path d="M12 5v14M5 12h14" />
        </svg>
      </button>
      <button type="button" aria-label={`Change who ${name} reports to`} className={cn(base, "text-ink hover:bg-surface")}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
        </svg>
      </button>
      <button type="button" aria-label={`Remove ${name}`} className={cn(base, "text-danger hover:bg-danger-wash")}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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

  return (
    <>
      <div className={cn("flex items-center gap-3 border-b border-line-soft px-4 py-3", isSelf && "bg-brand-wash")}>
        <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-2.5 gap-y-1" style={{ paddingLeft: depth * 32 }}>
          {depth > 0 && <span className="-ml-4 h-4 w-3 shrink-0 self-start rounded-bl border-b border-l border-slate-300" aria-hidden="true" />}
          {hasReports ? (
            <button
              type="button"
              onClick={() => ctx.toggle(person.id)}
              aria-expanded={isOpen}
              aria-label={`${isOpen ? "Collapse" : "Expand"} ${person.name}`}
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded text-ink hover:bg-surface"
            >
              <svg className={cn("h-4 w-4 transition-transform", !isOpen && "-rotate-90")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>
          ) : (
            <span className="flex h-6 w-6 shrink-0 items-center justify-center" aria-hidden="true">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-300" />
            </span>
          )}
          <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold", AVATAR[person.role])}>{initials(person.name)}</span>
          <span className="truncate text-[14.5px] font-semibold text-ink">{person.name}</span>
          <span className="shrink-0 text-[12px] font-medium uppercase tracking-wide text-ink-soft">
            {EMPLOYEE_ROLE_LABELS[person.role]} · {person.role === "DA" ? `${person.place} kebele` : person.place}
          </span>
          {person.specialism && <span className="shrink-0 text-[12.5px] text-muted">{person.specialism}</span>}
          {agents > 0 && <span className="shrink-0 rounded-full bg-brand-mint px-2.5 py-0.5 text-[12.5px] font-medium text-brand-green">{agents} agents</span>}
          {person.individual && <Pill tone="blue">Individual</Pill>}
          {isSelf && <Pill tone="green">You</Pill>}
        </div>
        {ctx.editable && <RowActions name={person.name} />}
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

// Employee hierarchy: who reports to whom, from the signed-in user's place down (see treeRootFor). UI only.
export function HierarchyTree({ query }: { query: string }) {
  const role = useAuthStore((s) => s.role);
  const viewer = useViewer();
  const root = treeRootFor(role, viewer);
  const selfId = selfIn(role, viewer)?.id ?? null;
  const [open, setOpen] = useState<Set<string>>(() => initiallyOpen(root, selfId));

  const toggle = (id: string) =>
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const ctx: TreeCtx = { open, toggle, query, editable: canManageTeams(role), selfId };
  const above = chainAbove(root);
  const visible = employeeMatches(root, query);

  return (
    <Card className="overflow-hidden p-0">
      {above.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 border-b border-line-soft px-4 py-2.5 text-[13px] text-ink-soft">
          <span className="font-medium text-ink">Reports up to:</span>
          {above.map((p, i) => (
            <span key={p.id} className="inline-flex items-center gap-1.5">
              {i > 0 && <span aria-hidden="true">›</span>}
              {p.name} <span className="text-muted">({EMPLOYEE_ROLE_LABELS[p.role]})</span>
            </span>
          ))}
        </div>
      )}
      <div className="overflow-x-auto">
        <div className="min-w-[640px]">
          <div className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 text-[12.5px] font-semibold tracking-wide text-slate-500">
            <span>EMPLOYEE</span>
            {ctx.editable && <span>ACTIONS</span>}
          </div>
          {visible ? <TreeRow person={root} depth={0} ctx={ctx} /> : <EmptyState title="No matching employees" hint="Try a name, role, woreda or kebele." />}
        </div>
      </div>
    </Card>
  );
}
