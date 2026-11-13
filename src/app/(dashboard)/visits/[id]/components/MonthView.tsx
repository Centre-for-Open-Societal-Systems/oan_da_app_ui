"use client";

import { cn } from "@/lib/utils";
import type { PlannerVisit } from "@/features/visits";
import { dateOf, DAY_LABELS, dayOfDate, isToday, longDate, VISIT_STYLES } from "./calendar";

interface MonthViewProps {
  visitsOn: (day: number) => PlannerVisit[];
  cursor: number;
  selectedDay: number | null;
  /** Clicking a date selects it and jumps to its week. */
  onPickDay: (day: number) => void;
}

export function MonthView({ visitsOn, cursor, selectedDay, onPickDay }: MonthViewProps) {
  // Month grid: blanks up to the first day's column, then every day of the month.
  const cursorDate = dateOf(cursor);
  const firstOfMonth = dayOfDate(new Date(Date.UTC(cursorDate.getUTCFullYear(), cursorDate.getUTCMonth(), 1)));
  const daysInMonth = new Date(Date.UTC(cursorDate.getUTCFullYear(), cursorDate.getUTCMonth() + 1, 0)).getUTCDate();
  const leading = ((firstOfMonth % 7) + 7) % 7;

  return (
    <div className="overflow-x-auto p-4 sm:p-6">
      <div className="grid min-w-[560px] grid-cols-7 gap-1.5">
        {DAY_LABELS.map((d) => (
          <span key={d} className="py-1 text-center text-[12px] font-semibold tracking-wide text-slate-600">{d}</span>
        ))}
        {Array.from({ length: leading }, (_, i) => <span key={`blank-${i}`} />)}
        {Array.from({ length: daysInMonth }, (_, i) => {
          const day = firstOfMonth + i;
          const visits = visitsOn(day);
          const today = isToday(day);
          return (
            <button
              key={day}
              type="button"
              onClick={() => onPickDay(day)}
              aria-label={`${longDate(day)}, ${visits.length} visits`}
              className={cn(
                "flex h-16 flex-col items-start gap-1 rounded-md border px-2 py-1.5 text-left transition-colors hover:border-brand-green/50",
                today ? "border-line bg-surface" : "border-slate-100",
                selectedDay === day && "border-brand-green/50 bg-brand-wash",
              )}
            >
              <span className={cn("flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[13px] font-semibold", today ? "bg-brand-green text-white" : "text-ink")}>
                {i + 1}
              </span>
              {visits.length > 0 && (
                <span className="flex items-center gap-1">
                  {visits.map((v) => <span key={v.id} className={cn("h-1.5 w-1.5 rounded-full", VISIT_STYLES[v.status].dot)} />)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
