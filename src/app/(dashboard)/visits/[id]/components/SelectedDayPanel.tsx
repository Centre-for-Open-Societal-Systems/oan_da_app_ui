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
    <div className="mt-4 rounded-lg border border-line bg-white px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[14px] font-semibold text-ink">
          {longDate(day)} · {visits.length === 0 ? "no visits" : `${visits.length} visit${visits.length === 1 ? "" : "s"}`}
        </p>
        <div className="flex items-center gap-3">
          <Link href="/visits" className="text-[13px] font-semibold text-brand-green hover:underline">
            Visits log &rarr;
          </Link>
          <button type="button" onClick={onClear} aria-label="Clear selected day" className="rounded p-0.5 text-muted hover:text-ink">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>
      </div>
      {visits.length === 0 ? (
        <p className="mt-1 text-[13px] text-muted">Nothing planned — use Plan visit to arrange one with a farmer.</p>
      ) : (
        <ul className="mt-2 flex flex-col gap-1.5">
          {visits.map((v) => (
            <li key={v.id} className={cn("flex items-center gap-2.5 rounded-md px-2 py-1 text-[13px] text-slate-700", selectedVisit === v.id && "bg-brand-wash")}>
              <span className={cn("h-2 w-2 rounded-full", VISIT_STYLES[v.status].dot)} />
              <span className={cn("font-semibold", VISIT_STYLES[v.status].time)}>{v.time}</span>
              <span className="font-medium text-ink">{v.farmerName}</span>
              <span className="text-muted">· {v.kebele} kebele · {v.status}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
