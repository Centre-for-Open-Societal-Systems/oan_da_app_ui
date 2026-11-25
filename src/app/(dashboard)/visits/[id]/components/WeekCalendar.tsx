"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { plannerVisitsByDate } from "@/features/visits";
import { isoOf } from "./calendar";
import { CalendarToolbar } from "./CalendarToolbar";
import { MonthView } from "./MonthView";
import { usePlannerVisits } from "./usePlannerVisits";
import { useWeekCalendar } from "./useWeekCalendar";
import { NoVisits, VisitCard } from "./VisitCard";
import { WeekView } from "./WeekView";

// The API's maximum for one list call.
const CALENDAR_LIMIT = 500;

export function WeekCalendar({ daId, reload }: { daId?: string; reload: number }) {
  const c = useWeekCalendar();
  const { items, error } = usePlannerVisits({ from: c.from, to: c.to, da_id: daId, limit: CALENDAR_LIMIT }, reload);
  const byDate = useMemo(() => plannerVisitsByDate(items), [items]);
  const visitsOn = (day: number) => byDate[isoOf(day)] ?? [];
  const dayVisits = visitsOn(c.cursor);

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <CalendarToolbar label={c.label} unit={c.unit} onCurrent={c.onCurrent} onStep={c.step} onToday={c.goToday} view={c.view} onViewChange={c.changeView} />

      {error && <div className="px-5 pt-4"><ErrorAlert message={error} /></div>}

      {c.view === "Week" && (
        <WeekView visitsOn={visitsOn} weekStart={c.weekStart} selectedDay={c.selectedDay} selectedVisit={c.selectedVisit} onSelectDay={c.selectDay} onClearSelection={c.clearSelection} />
      )}

      {c.view === "Day" && (
        <div className="flex flex-col gap-2.5 p-4 sm:p-6">
          {dayVisits.length === 0 ? (
            <NoVisits />
          ) : (
            dayVisits.map((v) => <VisitCard key={v.id} visit={v} active={c.selectedVisit === v.id} onClick={() => c.setSelectedVisit(v.id)} />)
          )}
        </div>
      )}

      {c.view === "Month" && (
        <MonthView
          visitsOn={visitsOn}
          cursor={c.cursor}
          selectedDay={c.selectedDay}
          onPickDay={(day) => {
            c.selectDay(day);
            c.setView("Week");
          }}
        />
      )}
    </Card>
  );
}
