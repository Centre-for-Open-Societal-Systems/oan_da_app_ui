"use client";

import { useState } from "react";
import { Checkbox } from "@/components/ui/Checkbox";
import { ETHIOPIAN_MONTHS, addDays, ethiopianMonthLength, fromEthiopian, toEthiopian, weekdayOf } from "@/lib/ethiopian";
import { cn } from "@/lib/utils";
import { PUBLIC_HOLIDAYS, isWorkingDay } from "./leave";

export type CalendarMode = "ethiopian" | "gregorian";

const GREGORIAN_MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];
const WEEKDAY_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

interface View {
  year: number;
  /** 1-based; 1–13 in the Ethiopian calendar. */
  month: number;
}

const todayIso = () => new Date().toISOString().slice(0, 10);

function viewOf(iso: string, mode: CalendarMode): View {
  if (mode === "ethiopian") {
    const e = toEthiopian(iso);
    return { year: e.year, month: e.month };
  }
  return { year: Number(iso.slice(0, 4)), month: Number(iso.slice(5, 7)) };
}

function monthDays(view: View, mode: CalendarMode) {
  const first = mode === "ethiopian" ? fromEthiopian({ ...view, day: 1 }) : `${view.year}-${String(view.month).padStart(2, "0")}-01`;
  const length = mode === "ethiopian" ? ethiopianMonthLength(view.year, view.month) : new Date(view.year, view.month, 0).getDate();
  return { first, last: addDays(first, length - 1), length };
}

function shiftView(view: View, by: number, mode: CalendarMode): View {
  const months = mode === "ethiopian" ? 13 : 12;
  const index = view.year * months + (view.month - 1) + by;
  return { year: Math.floor(index / months), month: (index % months) + 1 };
}

/** "Mon 5 Tahsas" / "Mon 14 Dec" — the date as the person reads it in the chosen calendar. */
export function dayLabel(iso: string, mode: CalendarMode) {
  const weekday = WEEKDAY_SHORT[weekdayOf(iso)];
  if (mode === "ethiopian") {
    const e = toEthiopian(iso);
    return `${weekday} ${e.day} ${ETHIOPIAN_MONTHS[e.month - 1]}`;
  }
  return `${weekday} ${Number(iso.slice(8, 10))} ${GREGORIAN_MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)}`;
}

/** The month's name in the other calendar, as a range when it straddles two ("Dec 2026 – Jan 2027"). */
function otherCalendarRange(first: string, last: string, mode: CalendarMode) {
  if (mode === "ethiopian") {
    const short = (iso: string) => `${GREGORIAN_MONTHS[Number(iso.slice(5, 7)) - 1].slice(0, 3)} ${iso.slice(0, 4)}`;
    return short(first) === short(last) ? short(first) : `${short(first)} – ${short(last)}`;
  }
  const a = toEthiopian(first);
  const b = toEthiopian(last);
  return a.month === b.month ? `${ETHIOPIAN_MONTHS[a.month - 1]} ${a.year}` : `${ETHIOPIAN_MONTHS[a.month - 1]} – ${ETHIOPIAN_MONTHS[b.month - 1]} ${b.year}`;
}

interface LeaveCalendarProps {
  start: string;
  end: string;
  halfStart: boolean;
  halfEnd: boolean;
  mode: CalendarMode;
  onModeChange: (mode: CalendarMode) => void;
  onRangeChange: (start: string, end: string) => void;
  onHalfChange: (which: "start" | "end", value: boolean) => void;
}

// Month grid for picking a leave range: click the first day, then the last. Weekends and public holidays are
// shown but cannot be picked, and the calendar can be read in the Ethiopian or the Gregorian calendar.
export function LeaveCalendar({ start, end, halfStart, halfEnd, mode, onModeChange, onRangeChange, onHalfChange }: LeaveCalendarProps) {
  const [view, setView] = useState<View>(() => viewOf(start || todayIso(), mode));
  const { first, last, length } = monthDays(view, mode);
  const lead = (weekdayOf(first) + 6) % 7;
  const title = mode === "ethiopian" ? `${ETHIOPIAN_MONTHS[view.month - 1]} ${view.year}` : `${GREGORIAN_MONTHS[view.month - 1]} ${view.year}`;

  const changeMode = (next: CalendarMode) => {
    if (next === mode) return;
    onModeChange(next);
    setView(viewOf(start || first, next));
  };

  const pick = (iso: string) => {
    if (!start || end) onRangeChange(iso, "");
    else if (iso < start) onRangeChange(iso, "");
    else onRangeChange(start, iso);
  };

  const days = Array.from({ length }, (_, i) => addDays(first, i));
  const holidays = days.filter((iso) => PUBLIC_HOLIDAYS[iso]);
  const primary = (iso: string) => (mode === "ethiopian" ? toEthiopian(iso).day : Number(iso.slice(8, 10)));
  const secondary = (iso: string) => (mode === "ethiopian" ? Number(iso.slice(8, 10)) : toEthiopian(iso).day);
  const tab = (value: CalendarMode, label: string) => (
    <button
      type="button"
      onClick={() => changeMode(value)}
      aria-pressed={mode === value}
      className={cn("rounded-md px-3 py-1 text-[13px] font-semibold transition-colors", mode === value ? "bg-white text-brand-green shadow-sm" : "text-ink-soft hover:text-ink")}
    >
      {label}
    </button>
  );
  const arrow = (by: number, label: string, d: string) => (
    <button type="button" onClick={() => setView((v) => shiftView(v, by, mode))} aria-label={label} className="flex h-8 w-8 items-center justify-center rounded-full border border-line bg-white text-ink transition-colors hover:bg-zinc-50">
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
    </button>
  );

  return (
    <div className="flex min-w-0 flex-col gap-3 rounded-xl border border-line bg-surface p-4">
      <div className="flex flex-col gap-3">
        <div className="flex w-fit rounded-lg bg-zinc-100 p-0.5">{tab("ethiopian", "Ethiopian")}{tab("gregorian", "Gregorian")}</div>
        <div className="flex items-center justify-between gap-2">
          {arrow(-1, "Previous month", "M15 6l-6 6 6 6")}
          <div className="min-w-0 text-center">
            <p className="text-[15px] font-bold leading-tight text-brand-green">{title}</p>
            <p className="truncate text-[12px] text-ink-soft">{otherCalendarRange(first, last, mode)}</p>
          </div>
          {arrow(1, "Next month", "M9 6l6 6-6 6")}
        </div>
      </div>

      <div className="grid grid-cols-7 text-center text-[12.5px] font-semibold">
        {WEEKDAYS.map((d, i) => <span key={d} className={cn("py-1", i > 4 ? "text-zinc-400" : "text-ink-soft")}>{d}</span>)}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {Array.from({ length: lead }, (_, i) => <span key={`blank-${i}`} />)}
        {days.map((iso) => {
          const working = isWorkingDay(iso);
          const holiday = PUBLIC_HOLIDAYS[iso];
          const isEdge = iso === start || iso === end;
          const inRange = !!start && !!end && iso > start && iso < end;
          return (
            <button
              key={iso}
              type="button"
              disabled={!working}
              onClick={() => pick(iso)}
              aria-label={`${dayLabel(iso, mode)}${holiday ? ` — ${holiday}` : ""}`}
              aria-pressed={isEdge}
              className={cn(
                "flex h-11 flex-col items-center justify-center text-[14px] font-medium leading-none transition-colors",
                isEdge && "rounded-lg bg-brand-green text-white",
                inRange && "bg-emerald-100 text-emerald-800",
                !isEdge && !inRange && working && "rounded-lg text-ink hover:bg-emerald-50",
                !working && !holiday && "cursor-not-allowed text-zinc-400",
                !!holiday && "cursor-not-allowed text-amber-600",
              )}
            >
              <span>{primary(iso)}</span>
              <span className={cn("mt-1 text-[10px] font-normal", isEdge ? "text-white/80" : "text-zinc-400")}>{holiday ? "•" : secondary(iso)}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12.5px] text-ink-soft">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-brand-green" />Your leave</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-full bg-amber-600" />Public holiday</span>
        <span className="text-zinc-400">Sat &amp; Sun not counted</span>
      </div>

      {holidays.map((iso) => (
        <p key={iso} className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[13px] text-amber-800">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-600" />
          {mode === "ethiopian" ? `${toEthiopian(iso).day} ${ETHIOPIAN_MONTHS[toEthiopian(iso).month - 1]}` : dayLabel(iso, mode).slice(4)} · {PUBLIC_HOLIDAYS[iso]}
        </p>
      ))}

      <div className="flex flex-wrap gap-2">
        {([["start", "Half day at start", halfStart], ["end", "Half day at end", halfEnd]] as const).map(([which, label, checked]) => (
          <label key={which} className={cn("flex items-center gap-2 rounded-full border border-line bg-white px-3.5 py-2 text-[13.5px] text-ink", !start || !end ? "cursor-not-allowed opacity-50" : "cursor-pointer hover:bg-zinc-50")}>
            <Checkbox checked={checked} disabled={!start || !end} onChange={(e) => onHalfChange(which, e.target.checked)} aria-label={label} />
            {label}
          </label>
        ))}
      </div>
    </div>
  );
}
