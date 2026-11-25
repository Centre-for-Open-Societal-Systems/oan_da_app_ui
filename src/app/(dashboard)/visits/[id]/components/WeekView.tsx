"use client";

import { cn } from "@/lib/utils";
import type { PlannerVisit } from "@/features/visits";
import { SelectedDayPanel } from "./SelectedDayPanel";
import { NoVisits, VisitCard } from "./VisitCard";
import { dateOf, isToday, longDate, weekdayLabel } from "./calendar";

interface WeekViewProps {
  visitsOn: (day: number) => PlannerVisit[];
  weekStart: number;
  selectedDay: number | null;
  selectedVisit: string | null;
  onSelectDay: (day: number, visitKey?: string | null) => void;
  onClearSelection: () => void;
}

export function WeekView({ visitsOn, weekStart, selectedDay, selectedVisit, onSelectDay, onClearSelection }: WeekViewProps) {
  const weekDays = Array.from({ length: 7 }, (_, i) => weekStart + i);
  return (
    <div className="flex flex-col p-3 sm:p-5 md:p-6">
      {/* 7-Day Grid with generous column width and horizontal scroll container */}
      <div className="overflow-x-auto green-scrollbar pb-2.5">
        <div className="grid min-w-[1020px] 2xl:min-w-0 grid-cols-7 gap-2.5">
          {weekDays.map((day) => {
            const today = isToday(day);
            const selected = selectedDay === day;
            const visits = visitsOn(day);
            return (
              <div
                key={day}
                className={cn(
                  "flex min-h-[300px] sm:min-h-[320px] min-w-0 flex-col gap-2 rounded-lg p-1.5 sm:p-2.5 transition-all duration-150",
                  selected
                    ? "border-1 border-brand-green bg-emerald-50/80 shadow-xs"
                    : today
                      ? "border border-line bg-surface"
                      : "border border-transparent bg-slate-50/40 sm:bg-transparent hover:bg-slate-50/80",
                )}
              >
                <button
                  type="button"
                  onClick={() => onSelectDay(day)}
                  aria-pressed={selected}
                  aria-label={`Select ${longDate(day)}`}
                  className="flex flex-col items-center gap-0.5 sm:gap-1 rounded-md py-1 transition-colors hover:bg-white/70"
                >
                  <span className={cn("text-[11px] sm:text-[12px] font-semibold tracking-wide", today || selected ? "text-brand-green" : "text-slate-600")}>
                    {weekdayLabel(day)}
                  </span>
                  <span
                    className={cn(
                      "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[12.5px] sm:text-[13.5px] font-semibold transition-colors",
                      today || selected ? "bg-brand-green text-white shadow-xs" : "text-ink",
                    )}
                  >
                    {dateOf(day).getUTCDate()}
                  </span>
                </button>

                <div className="flex flex-col gap-2 min-w-0">
                  {visits.length === 0 ? (
                    <NoVisits />
                  ) : (
                    visits.map((v) => <VisitCard key={v.id} visit={v} active={selectedVisit === v.id} onClick={() => onSelectDay(day, v.id)} />)
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Panel: positioned at full card width */}
      {selectedDay != null && (
        <SelectedDayPanel
          visits={visitsOn(selectedDay)}
          day={selectedDay}
          selectedVisit={selectedVisit}
          onClear={onClearSelection}
        />
      )}
    </div>
  );
}
