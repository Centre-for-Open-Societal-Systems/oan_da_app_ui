"use client";

import { cn } from "@/lib/utils";
import type { PlannerVisit } from "@/features/visits";
import { VISIT_STYLES } from "./calendar";

export function VisitCard({ visit, onClick, active }: { visit: PlannerVisit; onClick?: () => void; active?: boolean }) {
  const style = VISIT_STYLES[visit.status];
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "group w-full min-w-0 max-w-full overflow-hidden rounded-md border p-2 sm:px-2.5 sm:py-2 text-left transition-all hover:shadow-xs focus-visible:outline-hidden",
        style.card,
        active && "ring-2 ring-brand-green/40 shadow-xs",
      )}
    >
      <div className="flex items-center justify-between gap-1">
        <span className={cn("text-[11.5px] sm:text-[12.5px] font-semibold tracking-tight", style.time)}>{visit.time}</span>
        <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", style.dot)} />
      </div>
      <p
        className="mt-1 text-[11.5px] sm:text-[12px] font-semibold text-ink truncate block"
        title={visit.farmerName}
      >
        {visit.farmerName}
      </p>
      <p className="mt-0.5 flex items-center gap-1 text-[10.5px] sm:text-[11.5px] text-slate-500 min-w-0">
        <svg className="h-3 w-3 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
        </svg>
        <span className="truncate" title={visit.kebele}>{visit.kebele}</span>
      </p>
    </button>
  );
}

export function NoVisits() {
  return (
    <div className="flex h-[66px] sm:h-[72px] items-center justify-center rounded-md border border-dashed border-slate-200 text-[11.5px] sm:text-[12.5px] text-muted">
      No visits
    </div>
  );
}
