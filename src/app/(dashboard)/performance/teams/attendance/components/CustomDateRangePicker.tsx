"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import {
  formatIsoDate,
  getCurrentWeekStartIso,
  getTodayDate,
  getTodayIso,
  type AttendanceTab,
} from "./attendanceData";

const emptySubscribe = () => () => { };

function computeInitialPickerState(
  activeTab: AttendanceTab,
  startDate?: string,
  endDate?: string
): {
  quick: QuickRangeKey;
  start: string;
  end: string;
  viewYear: number;
  viewMonth: number;
} {
  const tDate = getTodayDate();
  const tIso = formatIsoDate(tDate);
  const weekStart = getCurrentWeekStartIso();
  const monthStart = formatIsoDate(new Date(tDate.getFullYear(), tDate.getMonth(), 1));

  let quick: QuickRangeKey = "custom";
  let s = startDate && startDate <= tIso ? startDate : "2026-11-09";
  let e = endDate && endDate <= tIso ? endDate : tIso;

  if (activeTab === "today") {
    quick = "today";
    s = startDate && startDate <= tIso ? startDate : tIso;
    e = s;
  } else if (activeTab === "week") {
    quick = "thisWeek";
    s = startDate && startDate <= tIso ? startDate : weekStart;
    e = endDate && endDate <= tIso ? endDate : tIso;
  } else if (activeTab === "month") {
    quick = "thisMonth";
    s = startDate && startDate <= tIso ? startDate : monthStart;
    e = endDate && endDate <= tIso ? endDate : tIso;
  }

  const [y, m] = s.split("-").map(Number);
  return { quick, start: s, end: e, viewYear: y, viewMonth: m - 1 };
}

export const CURRENT_TODAY_ISO = getTodayIso();

export type QuickRangeKey =
  | "today"
  | "yesterday"
  | "last7"
  | "thisWeek"
  | "lastWeek"
  | "thisMonth"
  | "lastMonth"
  | "custom";

interface CustomDateRangePickerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab?: AttendanceTab;
  startDate?: string;
  endDate?: string;
  onApply: (
    start: string,
    end: string,
    daysCount: number,
    workingDaysCount: number,
    quickKey?: QuickRangeKey
  ) => void;
}

const QUICK_RANGES: { key: QuickRangeKey; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "yesterday", label: "Yesterday" },
  { key: "last7", label: "Last 7 days" },
  { key: "thisWeek", label: "This week" },
  { key: "lastWeek", label: "Last week" },
  { key: "thisMonth", label: "This month" },
  { key: "lastMonth", label: "Last month" },
  { key: "custom", label: "Custom range" },
];

const WEEKDAY_NAMES = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

  export function CustomDateRangePicker(props: CustomDateRangePickerProps) {
    const mounted = useSyncExternalStore(
      emptySubscribe,
      () => true,
      () => false
    );

    if (!props.isOpen || !mounted) return null;
    const initial = computeInitialPickerState(
      props.activeTab ?? "today",
      props.startDate,
      props.endDate
    );
    return <CustomDateRangePickerDialog {...props} initial={initial} />;
  }

function CustomDateRangePickerDialog({
  onClose,
  onApply,
  initial,
}: CustomDateRangePickerProps & {
  initial: ReturnType<typeof computeInitialPickerState>;
}) {
  const todayDate = getTodayDate();
  const todayIso = formatIsoDate(todayDate);

  const [selectedQuick, setSelectedQuick] = useState<QuickRangeKey>(initial.quick);
  const [start, setStart] = useState<string>(initial.start);
  const [end, setEnd] = useState<string>(initial.end);

  // Which input field is currently active for date selection: "start" | "end"
  const [activeInput, setActiveInput] = useState<"start" | "end">("start");
  // Hover preview date for animated range expansion
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Month navigation: starts on the selected start date's month
  const [viewYear, setViewYear] = useState(initial.viewYear);
  const [viewMonth, setViewMonth] = useState(initial.viewMonth);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
}, [onClose]);

// Format date helper: "Mon, 09 Nov 2026"
const formatDateDisplay = (isoStr: string) => {
  if (!isoStr) return "Select date";
  const [y, m, d] = isoStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
  ];
  return `${days[date.getDay()]}, ${String(d).padStart(2, "0")} ${months[m - 1]} ${y}`;
};

// Compute days count & working days
const { totalDays, workingDays } = useMemo(() => {
  if (!start) return { totalDays: 0, workingDays: 0 };
  const effectiveEnd = end || start;
  const [sy, sm, sd] = start.split("-").map(Number);
  const [ey, em, ed] = effectiveEnd.split("-").map(Number);
  const sDate = new Date(sy, sm - 1, sd);
  const eDate = new Date(ey, em - 1, ed);

  if (sDate > eDate) return { totalDays: 0, workingDays: 0 };

  let total = 0;
  let working = 0;
  const cur = new Date(sDate);

  while (cur <= eDate) {
    total++;
    const day = cur.getDay();
    if (day !== 0 && day !== 6) {
      working++;
    }
    cur.setDate(cur.getDate() + 1);
  }
  return { totalDays: total, workingDays: working };
}, [start, end]);

// Click on a day in calendar
const handleDayClick = (year: number, month: number, day: number) => {
  const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  // Reject future dates strictly!
  if (iso > todayIso) {
    return;
  }
  setSelectedQuick("custom");

  if (activeInput === "start") {
    setStart(iso);
    if (end && iso > end) {
      setEnd(iso);
    }
    setActiveInput("end");
  } else {
    // activeInput === "end"
    if (!start || iso < start) {
      setStart(iso);
      setEnd(start || iso);
      setActiveInput("end");
    } else {
      setEnd(iso);
      setActiveInput("start");
    }
  }
};

const handleQuickSelect = (key: QuickRangeKey) => {
  setSelectedQuick(key);
  setActiveInput("start");
  setHoverDate(null);

  const tDate = getTodayDate();
  const tIso = formatIsoDate(tDate);
  const yesterdayDate = new Date(tDate);
  yesterdayDate.setDate(tDate.getDate() - 1);
  const yesterdayIso = formatIsoDate(yesterdayDate);

  const last7Start = new Date(tDate);
  last7Start.setDate(tDate.getDate() - 6);

  const thisWeekStartIso = getCurrentWeekStartIso();
  const lastWeekStart = new Date(
    Number(thisWeekStartIso.slice(0, 4)),
    Number(thisWeekStartIso.slice(5, 7)) - 1,
    Number(thisWeekStartIso.slice(8, 10)) - 7
  );
  const lastWeekEnd = new Date(lastWeekStart);
  lastWeekEnd.setDate(lastWeekStart.getDate() + 6);

  const thisMonthStart = formatIsoDate(new Date(tDate.getFullYear(), tDate.getMonth(), 1));
  const prevMonthStartDate = new Date(tDate.getFullYear(), tDate.getMonth() - 1, 1);
  const prevMonthEndDate = new Date(tDate.getFullYear(), tDate.getMonth(), 0);

  switch (key) {
    case "today":
      setStart(tIso);
      setEnd(tIso);
      setViewYear(tDate.getFullYear());
      setViewMonth(tDate.getMonth());
      break;
    case "yesterday":
      setStart(yesterdayIso);
      setEnd(yesterdayIso);
      setViewYear(yesterdayDate.getFullYear());
      setViewMonth(yesterdayDate.getMonth());
      break;
    case "last7":
      setStart(formatIsoDate(last7Start));
      setEnd(tIso);
      setViewYear(tDate.getFullYear());
      setViewMonth(tDate.getMonth());
      break;
    case "thisWeek":
      setStart(thisWeekStartIso);
      setEnd(tIso);
      setViewYear(tDate.getFullYear());
      setViewMonth(tDate.getMonth());
      break;
    case "lastWeek":
      setStart(formatIsoDate(lastWeekStart));
      setEnd(formatIsoDate(lastWeekEnd));
      setViewYear(lastWeekStart.getFullYear());
      setViewMonth(lastWeekStart.getMonth());
      break;
    case "thisMonth":
      setStart(thisMonthStart);
      setEnd(tIso);
      setViewYear(tDate.getFullYear());
      setViewMonth(tDate.getMonth());
      break;
    case "lastMonth":
      setStart(formatIsoDate(prevMonthStartDate));
      setEnd(formatIsoDate(prevMonthEndDate));
      setViewYear(prevMonthStartDate.getFullYear());
      setViewMonth(prevMonthStartDate.getMonth());
      break;
    case "custom":
      break;
  }
};

const handleApply = () => {
  if (!start) return;
  const finalEnd = end || start;
  onApply(start, finalEnd, totalDays || 1, workingDays || 1, selectedQuick);
  onClose();
};

// Generate calendar grid for a given year and month (Monday first)
const getMonthDays = (year: number, month: number) => {
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // 0 = Mon, 6 = Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  return { firstDayIndex, daysInMonth };
};

const currentMonthData = getMonthDays(viewYear, viewMonth);
const nextMonthYear = viewMonth === 11 ? viewYear + 1 : viewYear;
const nextMonthIndex = viewMonth === 11 ? 0 : viewMonth + 1;
const nextMonthData = getMonthDays(nextMonthYear, nextMonthIndex);

const monthNames = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const isDaySelected = (year: number, month: number, day: number) => {
  const iso = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
  const effectiveEnd = end || (activeInput === "end" && hoverDate && hoverDate >= start ? hoverDate : start);
  const isStart = iso === start;
  const isEnd = iso === (end || start);
  const inRange = start && effectiveEnd && iso > start && iso < effectiveEnd;
  const isHoverRange = Boolean(
    start && !end && hoverDate && hoverDate >= start && iso > start && iso <= hoverDate
  );
  const isToday = iso === todayIso;
  return { isStart, isEnd, inRange, isHoverRange, isToday, iso };
};

return createPortal(
  <div
    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-fade-in"
    onClick={onClose}
  >
    <div
      className="flex w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl animate-pop-in transition-all duration-200"
      onClick={(e) => e.stopPropagation()}
    >
      {/* Left Sidebar: Quick Ranges */}
      <div className="w-48 shrink-0 border-r border-slate-100 bg-slate-50/50 p-4">
        <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2 px-2.5">
          Quick Ranges
        </p>
        <div className="flex flex-col gap-1 text-[13px]">
          {QUICK_RANGES.map((qr) => (
            <button
              key={qr.key}
              type="button"
              onClick={() => handleQuickSelect(qr.key)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl font-medium transition-all duration-150 flex items-center justify-between group cursor-pointer",
                selectedQuick === qr.key
                  ? "bg-emerald-50 font-bold text-brand-green border-l-3 border-brand-green shadow-2xs"
                  : "text-slate-700 hover:bg-slate-100 hover:text-slate-900 hover:translate-x-0.5"
              )}
            >
              <span>{qr.label}</span>
              {selectedQuick === qr.key && (
                <span className="h-1.5 w-1.5 rounded-full bg-brand-green animate-pulse" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Right Area: Dual Month Picker */}
      <div className="flex min-w-0 flex-1 flex-col p-6">
        {/* Top Row: Interactive Date Display Pills (matching user images) */}
        <div className="flex flex-wrap items-center gap-3 pb-5 border-b border-slate-100">
          {/* Start Date Button */}
          <button
            type="button"
            onClick={() => {
              setActiveInput("start");
              if (start) {
                const [y, m] = start.split("-").map(Number);
                setViewYear(y);
                setViewMonth(m - 1);
              }
            }}
            className={cn(
              "flex h-10 items-center gap-2 rounded-xl border px-3.5 text-[13.5px] font-semibold transition-all duration-200 cursor-pointer shadow-2xs",
              activeInput === "start"
                ? "border-brand-green bg-emerald-50/80 text-brand-green ring-2 ring-brand-green/20 shadow-xs scale-[1.02]"
                : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <svg className="h-4 w-4 text-brand-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{formatDateDisplay(start)}</span>
            {activeInput === "start" && (
              <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse ml-0.5" />
            )}
          </button>

          {/* Arrow Divider */}
          <svg className="h-4 w-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M5 12h14M12 5l7 7-7 7" />
          </svg>

          {/* End Date Button */}
          <button
            type="button"
            onClick={() => {
              setActiveInput("end");
              if (end) {
                const [y, m] = end.split("-").map(Number);
                setViewYear(y);
                setViewMonth(m - 1);
              }
            }}
            className={cn(
              "flex h-10 items-center gap-2 rounded-xl border px-3.5 text-[13.5px] font-semibold transition-all duration-200 cursor-pointer shadow-2xs",
              activeInput === "end"
                ? "border-brand-green bg-emerald-50/80 text-brand-green ring-2 ring-brand-green/20 shadow-xs scale-[1.02]"
                : "border-slate-200 bg-white text-slate-800 hover:border-slate-300 hover:bg-slate-50"
            )}
          >
            <svg className="h-4 w-4 text-brand-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>{formatDateDisplay(end || start)}</span>
            {activeInput === "end" && (
              <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse ml-0.5" />
            )}
          </button>

          {/* Duration Tag */}
          <div className="flex items-center gap-1.5 text-[13.5px] text-slate-500 font-medium ml-1">
            <svg className="h-4 w-4 text-slate-400 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
            <span className="font-semibold text-slate-800">{totalDays} {totalDays === 1 ? "day" : "days"}</span>
            <span className="text-slate-400 font-normal">({workingDays} working)</span>
          </div>
        </div>

        {/* Month Navigation Headers */}
        <div className="flex items-center justify-between pt-4 pb-2">
          <button
            type="button"
            onClick={() => {
              if (viewMonth === 0) {
                setViewMonth(11);
                setViewYear((y) => y - 1);
              } else {
                setViewMonth((m) => m - 1);
              }
            }}
            className="flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:scale-105 active:scale-95 transition-all cursor-pointer"
            aria-label="Previous month"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          <div className="grid grid-cols-2 flex-1 text-center font-bold text-slate-900 text-[15.5px]">
            <div>{monthNames[viewMonth]} {viewYear}</div>
            <div>{monthNames[nextMonthIndex]} {nextMonthYear}</div>
          </div>

          <button
            type="button"
            disabled={viewYear >= 2026 && viewMonth >= 10}
            onClick={() => {
              if (viewMonth === 11) {
                setViewMonth(0);
                setViewYear((y) => y + 1);
              } else {
                setViewMonth((m) => m + 1);
              }
            }}
            className={cn(
              "flex h-8.5 w-8.5 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-all",
              viewYear >= 2026 && viewMonth >= 10
                ? "opacity-30 cursor-not-allowed text-slate-300"
                : "shadow-2xs hover:bg-slate-50 hover:border-slate-300 hover:scale-105 active:scale-95 cursor-pointer"
            )}
            aria-label="Next month"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Dual Month Calendar Grids */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 py-3">
          {/* Month 1 (Left Month) */}
          <div>
            <div className="grid grid-cols-7 text-center text-[11.5px] font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">
              {WEEKDAY_NAMES.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1.5 text-center text-[13px]">
              {Array.from({ length: currentMonthData.firstDayIndex }).map((_, i) => (
                <div key={`blank1-${i}`} className="h-9" />
              ))}
              {Array.from({ length: currentMonthData.daysInMonth }).map((_, i) => {
                const day = i + 1;
                const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isFuture = iso > todayIso;
                const { isStart, isEnd, inRange, isHoverRange, isToday } = isDaySelected(viewYear, viewMonth, day);
                const isWeekend = (currentMonthData.firstDayIndex + i) % 7 >= 5;

                const hasRangeBg = !isFuture && (inRange || isHoverRange);
                const isRangeStart = !isFuture && isStart && end && start !== end;
                const isRangeEnd = !isFuture && isEnd && start && start !== end;

                return (
                  <div
                    key={`day1-${day}`}
                    onClick={() => !isFuture && handleDayClick(viewYear, viewMonth, day)}
                    onMouseEnter={() => !isFuture && setHoverDate(iso)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={cn(
                      "relative flex h-9 items-center justify-center transition-all duration-150 text-[13px]",
                      isFuture ? "cursor-not-allowed opacity-30 select-none pointer-events-none" : "cursor-pointer",
                      hasRangeBg && "bg-emerald-100/70",
                      isRangeStart && "rounded-l-full bg-emerald-100/70",
                      isRangeEnd && "rounded-r-full bg-emerald-100/70"
                    )}
                  >
                    <span
                      className={cn(
                        "relative flex h-8.5 w-8.5 items-center justify-center rounded-full font-medium transition-all duration-200 transform",
                        isFuture && "text-slate-300",
                        !isFuture && (isStart || isEnd) && "bg-brand-green font-bold text-white shadow-md shadow-brand-green/30 scale-105 ring-2 ring-brand-green/30 ring-offset-1 animate-pop-in",
                        !isFuture && !isStart && !isEnd && hasRangeBg && "text-emerald-950 font-semibold",
                        !isFuture && !isStart && !isEnd && !hasRangeBg && isWeekend && "text-slate-400 hover:bg-slate-100 hover:scale-110 active:scale-95",
                        !isFuture && !isStart && !isEnd && !hasRangeBg && !isWeekend && "text-slate-800 hover:bg-slate-100 hover:scale-110 active:scale-95"
                      )}
                    >
                      {day}
                      {isToday && !isStart && !isEnd && (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-green" />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Month 2 (Right Month) */}
          <div>
            <div className="grid grid-cols-7 text-center text-[11.5px] font-semibold text-slate-400 mb-2.5 uppercase tracking-wider">
              {WEEKDAY_NAMES.map((w) => (
                <div key={w}>{w}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-y-1.5 text-center text-[13px]">
              {Array.from({ length: nextMonthData.firstDayIndex }).map((_, i) => (
                <div key={`blank2-${i}`} className="h-9" />
              ))}
              {Array.from({ length: nextMonthData.daysInMonth }).map((_, i) => {
                const day = i + 1;
                const iso = `${nextMonthYear}-${String(nextMonthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
                const isFuture = iso > todayIso;
                const { isStart, isEnd, inRange, isHoverRange, isToday } = isDaySelected(nextMonthYear, nextMonthIndex, day);
                const isWeekend = (nextMonthData.firstDayIndex + i) % 7 >= 5;

                const hasRangeBg = !isFuture && (inRange || isHoverRange);
                const isRangeStart = !isFuture && isStart && end && start !== end;
                const isRangeEnd = !isFuture && isEnd && start && start !== end;

                return (
                  <div
                    key={`day2-${day}`}
                    onClick={() => !isFuture && handleDayClick(nextMonthYear, nextMonthIndex, day)}
                    onMouseEnter={() => !isFuture && setHoverDate(iso)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={cn(
                      "relative flex h-9 items-center justify-center transition-all duration-150 text-[13px]",
                      isFuture ? "cursor-not-allowed opacity-30 select-none pointer-events-none" : "cursor-pointer",
                      hasRangeBg && "bg-emerald-100/70",
                      isRangeStart && "rounded-l-full bg-emerald-100/70",
                      isRangeEnd && "rounded-r-full bg-emerald-100/70"
                    )}
                  >
                    <span
                      className={cn(
                        "relative flex h-8.5 w-8.5 items-center justify-center rounded-full font-medium transition-all duration-200 transform",
                        isFuture && "text-slate-300",
                        !isFuture && (isStart || isEnd) && "bg-brand-green font-bold text-white shadow-md shadow-brand-green/30 scale-105 ring-2 ring-brand-green/30 ring-offset-1 animate-pop-in",
                        !isFuture && !isStart && !isEnd && hasRangeBg && "text-emerald-950 font-semibold",
                        !isFuture && !isStart && !isEnd && !hasRangeBg && isWeekend && "text-slate-400 hover:bg-slate-100 hover:scale-110 active:scale-95",
                        !isFuture && !isStart && !isEnd && !hasRangeBg && !isWeekend && "text-slate-800 hover:bg-slate-100 hover:scale-110 active:scale-95"
                      )}
                    >
                      {day}
                      {isToday && !isStart && !isEnd && (
                        <span className="absolute bottom-1 h-1 w-1 rounded-full bg-brand-green" />
                      )}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-5 border-t border-slate-100 mt-2">
          <div className="text-[12.5px] font-medium">
            {activeInput === "start" ? (
              <span className="inline-flex items-center gap-1.5 text-brand-green">
                <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
                Click a date to select <strong className="font-bold">Start date</strong>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-brand-green">
                <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
                Click a date to select <strong className="font-bold">End date</strong>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50 transition-all active:scale-95 shadow-2xs cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="rounded-lg bg-brand-green px-5 py-2 text-[13.5px] font-semibold text-white shadow-sm hover:bg-emerald-700 transition-all active:scale-95 shadow-brand-green/20 cursor-pointer"
            >
              Apply range
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>,
  document.body
);
}
