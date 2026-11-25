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
    <div className="overflow-x-auto green-scrollbar p-3 sm:p-5 md:p-6">
      <div className="grid min-w-[500px] md:min-w-0 grid-cols-7 gap-1 sm:gap-1.5">
        {DAY_LABELS.map((d) => (
          <span key={d} className="py-1 text-center text-[11px] sm:text-[12px] font-semibold tracking-wide text-slate-600">{d}</span>
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
                "flex h-14 sm:h-16 flex-col items-start gap-1 rounded-md border p-1.5 sm:px-2 sm:py-1.5 text-left transition-colors hover:border-brand-green/50",
                selectedDay === day
                  ? "border-2 border-brand-green bg-emerald-50/80 shadow-xs"
                  : today
                    ? "border-line bg-surface"
                    : "border-slate-100 hover:bg-slate-50/60",
              )}
            >
              <span className={cn("flex h-5 w-5 sm:h-6 sm:min-w-6 items-center justify-center rounded-full text-[12px] sm:text-[13px] font-semibold", today || selectedDay === day ? "bg-brand-green text-white" : "text-ink")}>
                {i + 1}
              </span>
              {visits.length > 0 && (
                <span className="flex flex-wrap items-center gap-1">
                  {visits.slice(0, 4).map((v) => <span key={v.id} className={cn("h-1.5 w-1.5 rounded-full shrink-0", VISIT_STYLES[v.status].dot)} />)}
                  {visits.length > 4 && <span className="text-[10px] text-muted">+{visits.length - 4}</span>}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
