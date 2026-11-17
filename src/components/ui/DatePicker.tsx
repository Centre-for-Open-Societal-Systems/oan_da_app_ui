"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  /** ISO date string: "YYYY-MM-DD" or "" for no date. */
  value: string;
  onChange: (date: string) => void;
  /** Fallback date to display when value is empty (defaults to today's date). */
  fallbackDate?: string;
  placeholder?: string;
  className?: string;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const POPUP_WIDTH = 280;

function parseIso(iso: string) {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  return { year: y, month: m - 1, day: d };
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDisplayDate(iso: string): string {
  const parsed = parseIso(iso);
  if (!parsed) return "";
  const d = new Date(parsed.year, parsed.month, parsed.day);
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function DatePicker({ value, onChange, fallbackDate, placeholder, className }: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popStyle, setPopStyle] = useState<CSSProperties>({});
  const [animatingDay, setAnimatingDay] = useState<string | null>(null);

  const now = new Date();
  const todayIso = toIso(now.getFullYear(), now.getMonth(), now.getDate());
  const effectiveIso = value || fallbackDate || todayIso;
  const displayDateText = formatDisplayDate(effectiveIso) || placeholder || "Pick date";

  const parsedValue = parseIso(effectiveIso);
  const [viewYear, setViewYear] = useState(parsedValue?.year ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedValue?.month ?? now.getMonth());

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popupId = useId();

  // Outside click & keyboard escape
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onScroll = (e: Event) => {
      if (!popoverRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const onResize = () => setIsOpen(false);

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [isOpen]);

  const openCalendar = () => {
    const parsed = parseIso(effectiveIso);
    setViewYear(parsed?.year ?? now.getFullYear());
    setViewMonth(parsed?.month ?? now.getMonth());
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = spaceBelow < 340 && spaceAbove > spaceBelow;
      const left = Math.max(12, Math.min(rect.left, window.innerWidth - POPUP_WIDTH - 12));
      setPopStyle({
        position: "fixed",
        left,
        width: POPUP_WIDTH,
        zIndex: 110,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      });
    }
    setIsOpen(true);
  };

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDaySelect = (iso: string) => {
    setAnimatingDay(iso);
    onChange(iso);
    // Smooth animation before popover dismiss
    setTimeout(() => {
      setAnimatingDay(null);
      setIsOpen(false);
    }, 220);
  };

  const selectToday = () => {
    handleDaySelect(todayIso);
  };

  const clearDate = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange("");
    setIsOpen(false);
  };

  // Build the 42-day calendar grid (6 weeks x 7 days)
  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sunday
  const daysInCurrentMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const daysInPrevMonth = new Date(viewYear, viewMonth, 0).getDate();

  const calendarDays = [];

  // Trailing days from prev month
  for (let i = firstDayOfWeek - 1; i >= 0; i--) {
    const d = daysInPrevMonth - i;
    const m = viewMonth === 0 ? 11 : viewMonth - 1;
    const y = viewMonth === 0 ? viewYear - 1 : viewYear;
    calendarDays.push({ day: d, month: m, year: y, isCurrentMonth: false, iso: toIso(y, m, d) });
  }

  // Current month days
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    calendarDays.push({ day: d, month: viewMonth, year: viewYear, isCurrentMonth: true, iso: toIso(viewYear, viewMonth, d) });
  }

  // Leading days from next month to complete 42 cells
  const remaining = 42 - calendarDays.length;
  for (let d = 1; d <= remaining; d++) {
    const m = viewMonth === 11 ? 0 : viewMonth + 1;
    const y = viewMonth === 11 ? viewYear + 1 : viewYear;
    calendarDays.push({ day: d, month: m, year: y, isCurrentMonth: false, iso: toIso(y, m, d) });
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => (isOpen ? setIsOpen(false) : openCalendar())}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popupId : undefined}
        className={cn(
          "inline-flex h-9 sm:h-10 shrink-0 items-center justify-between gap-2.5 rounded-lg border bg-white px-3 sm:px-3.5 text-xs sm:text-[13px] font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-green/20",
          value
            ? "border-brand-green/70 text-ink shadow-xs"
            : "border-gray-200 text-slate-700 hover:border-gray-300",
          isOpen && "border-brand-green ring-2 ring-brand-green/20",
          className
        )}
      >
        <span className="flex items-center gap-2 whitespace-nowrap">
          <svg className={cn("h-4 w-4 shrink-0 transition-colors", value ? "text-brand-green" : "text-slate-500")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className="whitespace-nowrap text-xs sm:text-[13px] font-semibold text-ink">
            {displayDateText}
          </span>
        </span>

        <svg
          className={cn("h-3.5 w-3.5 text-muted transition-transform duration-200 shrink-0", isOpen && "rotate-180")}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M6 9l6 6 6-6" />
        </svg>
      </button>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          id={popupId}
          role="dialog"
          aria-label="Choose date"
          style={popStyle}
          className="overflow-hidden rounded-xl border border-line bg-white p-3.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.22)] animate-dropdown-in select-none"
        >
          {/* Header: Month & Year navigation */}
          <div className="flex items-center justify-between pb-3 border-b border-line-soft">
            <button
              type="button"
              onClick={prevMonth}
              title="Previous month"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <span className="text-[13.5px] font-bold text-ink tracking-tight">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>

            <button
              type="button"
              onClick={nextMonth}
              title="Next month"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink transition-colors"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 pt-2.5 pb-1 text-center">
            {WEEKDAY_NAMES.map((d) => (
              <span key={d} className="text-[11px] font-semibold text-slate-400">
                {d}
              </span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-y-1 gap-x-1">
            {calendarDays.map((cell) => {
              const isSelected = cell.iso === value;
              const isTodayCell = cell.iso === todayIso;
              const isAnimating = animatingDay === cell.iso;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  onClick={() => handleDaySelect(cell.iso)}
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] transition-all duration-150 mx-auto",
                    cell.isCurrentMonth ? "text-slate-800" : "text-slate-300",
                    !isSelected && cell.isCurrentMonth && "hover:bg-brand-wash hover:text-brand-green font-medium",
                    isTodayCell && !isSelected && "ring-1.5 ring-brand-green/60 font-bold text-brand-green",
                    isSelected && "bg-brand-green text-white font-bold shadow-sm shadow-brand-green/30 scale-100",
                    isAnimating && "scale-110 ring-4 ring-brand-green/30 bg-brand-green-dark text-white shadow-md animate-pulse"
                  )}
                >
                  {cell.day}
                  {isTodayCell && (
                    <span
                      className={cn(
                        "absolute bottom-0.5 h-1 w-1 rounded-full",
                        isSelected ? "bg-white" : "bg-brand-green"
                      )}
                    />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer Shortcuts */}
          <div className="flex items-center justify-between pt-3 mt-2 border-t border-line-soft">
            <button
              type="button"
              onClick={() => clearDate()}
              className="text-[12px] font-semibold text-slate-500 hover:text-ink transition-colors px-1.5 py-0.5 rounded hover:bg-slate-100"
            >
              All dates
            </button>
            <button
              type="button"
              onClick={selectToday}
              className="text-[12px] font-semibold text-brand-green hover:text-brand-green-dark hover:underline transition-colors px-1.5 py-0.5 rounded"
            >
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
