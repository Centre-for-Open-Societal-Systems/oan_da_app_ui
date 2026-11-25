"use client";

import Link from "next/link";
import { cn } from "@/lib/utils";
import type { PlannerVisit } from "@/features/visits";
import { longDate, VISIT_STYLES } from "./calendar";

interface SelectedDayPanelProps {
  visits: PlannerVisit[];
  day: number;
  selectedVisit: string | null;
  onClear: () => void;
}

// Summary of the day picked in the week grid.
export function SelectedDayPanel({ visits, day, selectedVisit, onClear }: SelectedDayPanelProps) {
  return (
    <div className="mt-4 w-full rounded-lg border border-line bg-white px-3.5 py-3 sm:px-4">
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <p className="text-[13.5px] sm:text-[14px] font-semibold text-ink">
          {longDate(day)} · {visits.length === 0 ? "no visits" : `${visits.length} visit${visits.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex items-center gap-3">
          <Link href="/visits" className="text-[12.5px] sm:text-[13px] font-semibold text-brand-green hover:underline">
            Visits log &rarr;
          </Link>
          <button type="button" onClick={onClear} aria-label="Clear selected day" className="rounded p-1 text-muted hover:text-ink">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>
      {visits.length === 0 ? (
        <p className="mt-1 text-[12.5px] sm:text-[13px] text-muted">Nothing planned — use Plan visit to arrange one with a farmer.</p>
      ) : (
        <ul className="mt-2.5 flex flex-col gap-1.5">
          {visits.map((v) => (
            <li
              key={v.id}
              className={cn(
                "flex flex-wrap items-center justify-between gap-2 rounded-md px-3 py-2 text-[12.5px] sm:text-[13px] text-slate-700 transition-colors",
                selectedVisit === v.id ? "bg-brand-wash ring-1 ring-brand-green/30" : "bg-slate-50/70 hover:bg-slate-50",
              )}
            >
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span className={cn("h-2 w-2 rounded-full shrink-0", VISIT_STYLES[v.status].dot)} />
                <span className={cn("font-semibold shrink-0", VISIT_STYLES[v.status].time)}>{v.time}</span>
                <span className="font-semibold text-ink" title={v.farmerName}>{v.farmerName}</span>
                <span className="text-muted">· {v.kebele} kebele</span>
              </div>
              <span className={cn("shrink-0 rounded-full border px-2.5 py-0.5 text-[11.5px] font-medium capitalize", VISIT_STYLES[v.status].card)}>
                {v.status}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
