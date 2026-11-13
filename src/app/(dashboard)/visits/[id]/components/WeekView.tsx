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
    <div className="overflow-x-auto p-4 sm:p-6">
      <div className="grid min-w-[900px] grid-cols-7 gap-2.5">
        {weekDays.map((day) => {
          const today = isToday(day);
          const selected = selectedDay === day;
          const visits = visitsOn(day);
          return (
            <div
              key={day}
              className={cn(
                "flex min-h-[310px] flex-col gap-2.5 rounded-lg p-2.5",
                today ? "border border-line bg-surface" : "",
                selected && "border border-brand-green/50 bg-brand-wash",
              )}
            >
              <button
                type="button"
                onClick={() => onSelectDay(day)}
                aria-pressed={selected}
                aria-label={`Select ${longDate(day)}`}
                className="flex flex-col items-center gap-1 rounded-md py-1 transition-colors hover:bg-white/70"
              >
                <span className={cn("text-[12px] font-semibold tracking-wide", today || selected ? "text-brand-green" : "text-slate-600")}>
                  {weekdayLabel(day)}
                </span>
                <span
                  className={cn(
                    "flex h-6 min-w-6 items-center justify-center rounded-full px-1.5 text-[13.5px] font-semibold",
                    today ? "bg-brand-green text-white" : selected ? "bg-green-100 text-brand-green" : "text-ink",
                  )}
                >
                  {dateOf(day).getUTCDate()}
                </span>
              </button>

              {visits.length === 0 ? (
                <NoVisits />
              ) : (
                visits.map((v) => <VisitCard key={v.id} visit={v} active={selectedVisit === v.id} onClick={() => onSelectDay(day, v.id)} />)
              )}
            </div>
          );
        })}
      </div>

      {selectedDay != null && <SelectedDayPanel visits={visitsOn(selectedDay)} day={selectedDay} selectedVisit={selectedVisit} onClear={onClearSelection} />}
    </div>
  );
}
