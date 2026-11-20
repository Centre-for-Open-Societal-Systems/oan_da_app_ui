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
  id?: string;
  name?: string;
  minDate?: string;
  maxDate?: string;
  clearable?: boolean;
  required?: boolean;
  disabled?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const WEEKDAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

const POPUP_WIDTH = 296;

function parseIso(iso: string) {
  if (!iso) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) {
    const [y, m, d] = iso.split("-").map(Number);
    return { year: y, month: m - 1, day: d };
  }
  if (/^\d{1,2}[/-]\d{1,2}[/-]\d{4}$/.test(iso)) {
    const parts = iso.split(/[/-]/).map(Number);
    const d = parts[0];
    const m = parts[1];
    const y = parts[2];
    return { year: y, month: m - 1, day: d };
  }
  return null;
}

function toIso(year: number, month: number, day: number) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function formatDisplayDate(iso: string): string {
  const parsed = parseIso(iso);
  if (!parsed) return iso || "";
  const d = new Date(parsed.year, parsed.month, parsed.day);
  if (isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

export function DatePicker({
  value,
  onChange,
  fallbackDate,
  placeholder,
  className,
  id,
  name,
  minDate,
  maxDate,
  clearable = true,
  required,
  disabled,
}: DatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popStyle, setPopStyle] = useState<CSSProperties>({});
  const [animatingDay, setAnimatingDay] = useState<string | null>(null);
  const [isMonthOpen, setIsMonthOpen] = useState(false);
  const [isYearOpen, setIsYearOpen] = useState(false);
  const [justSelected, setJustSelected] = useState(false);

  const now = new Date();
  const todayIso = toIso(now.getFullYear(), now.getMonth(), now.getDate());
  const effectiveIso = value || fallbackDate || "";
  const displayDateText = value
    ? formatDisplayDate(value)
    : fallbackDate
      ? formatDisplayDate(fallbackDate)
      : placeholder || "Select date";

  const parsedValue = parseIso(effectiveIso || todayIso);
  const [viewYear, setViewYear] = useState(parsedValue?.year ?? now.getFullYear());
  const [viewMonth, setViewMonth] = useState(parsedValue?.month ?? now.getMonth());

  const minYear = minDate ? parseInt(minDate.slice(0, 4), 10) : 1920;
  const maxYear = maxDate ? parseInt(maxDate.slice(0, 4), 10) : now.getFullYear() + 10;
  const yearOptions: number[] = [];
  for (let y = maxYear; y >= minYear; y--) {
    yearOptions.push(y);
  }

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const monthMenuRef = useRef<HTMLDivElement>(null);
  const yearMenuRef = useRef<HTMLDivElement>(null);
  const selectedYearButtonRef = useRef<HTMLButtonElement>(null);
  const popupId = useId();

  // Scroll current year into view when year dropdown opens
  useEffect(() => {
    if (isYearOpen) {
      const timer = setTimeout(() => {
        selectedYearButtonRef.current?.scrollIntoView({ block: "center", behavior: "auto" });
      }, 30);
      return () => clearTimeout(timer);
    }
  }, [isYearOpen]);

  // Click outside Month/Year dropdown menus inside calendar
  useEffect(() => {
    if (!isMonthOpen && !isYearOpen) return;
    const onPointerDownInside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (isMonthOpen && !monthMenuRef.current?.contains(target)) {
        setIsMonthOpen(false);
      }
      if (isYearOpen && !yearMenuRef.current?.contains(target)) {
        setIsYearOpen(false);
      }
    };
    document.addEventListener("mousedown", onPointerDownInside);
    return () => document.removeEventListener("mousedown", onPointerDownInside);
  }, [isMonthOpen, isYearOpen]);

  // Outside click & keyboard escape
  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !popoverRef.current?.contains(target)) {
        setIsOpen(false);
        setIsMonthOpen(false);
        setIsYearOpen(false);
      }
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isMonthOpen || isYearOpen) {
          setIsMonthOpen(false);
          setIsYearOpen(false);
          return;
        }
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onScroll = (e: Event) => {
      if (!popoverRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
        setIsMonthOpen(false);
        setIsYearOpen(false);
      }
    };
    const onResize = () => {
      setIsOpen(false);
      setIsMonthOpen(false);
      setIsYearOpen(false);
    };

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
  }, [isOpen, isMonthOpen, isYearOpen]);

  const openCalendar = () => {
    if (disabled) return;
    const targetIso = value || fallbackDate || todayIso;
    const parsed = parseIso(targetIso);
    setViewYear(parsed?.year ?? now.getFullYear());
    setViewMonth(parsed?.month ?? now.getMonth());
    setIsMonthOpen(false);
    setIsYearOpen(false);
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
        zIndex: 120,
        ...(openUp
          ? { bottom: window.innerHeight - rect.top + 6 }
          : { top: rect.bottom + 6 }),
      });
    }
    setIsOpen(true);
  };

  const prevMonth = () => {
    setIsMonthOpen(false);
    setIsYearOpen(false);
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const nextMonth = () => {
    setIsMonthOpen(false);
    setIsYearOpen(false);
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const handleDaySelect = (iso: string) => {
    if (minDate && iso < minDate) return;
    if (maxDate && iso > maxDate) return;
    setAnimatingDay(iso);
    onChange(iso);
    setJustSelected(true);
    // Smooth animation before popover dismiss
    setTimeout(() => {
      setAnimatingDay(null);
      setIsOpen(false);
      setIsMonthOpen(false);
      setIsYearOpen(false);
    }, 320);
    setTimeout(() => {
      setJustSelected(false);
    }, 750);
  };

  const selectToday = () => {
    if (minDate && todayIso < minDate) return;
    if (maxDate && todayIso > maxDate) return;
    handleDaySelect(todayIso);
  };

  const clearDate = (e?: React.MouseEvent) => {
    e?.stopPropagation();
    onChange("");
    setIsOpen(false);
    setIsMonthOpen(false);
    setIsYearOpen(false);
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
      {(id || name) && (
        <input type="hidden" id={id} name={name ?? id} value={value} required={required} />
      )}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : openCalendar())}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popupId : undefined}
        className={cn(
          "inline-flex h-11 w-full shrink-0 items-center justify-between gap-2 rounded-lg border bg-white px-3 sm:px-3.5 text-xs sm:text-[13.5px] font-medium transition-all duration-200 focus:outline-none",
          value
            ? "border-brand-green/70 text-ink shadow-xs"
            : "border-gray-200 text-slate-700 hover:border-brand-green hover:ring-1 hover:ring-brand-green/20",
          isOpen && "border-brand-green ring-2 ring-brand-green/20",
          justSelected && "border-brand-green ring-3 ring-brand-green/30 bg-emerald-50/50 shadow-xs",
          disabled && "cursor-not-allowed bg-surface text-ink-soft border-gray-200 opacity-90 hover:border-gray-200 hover:ring-0",
          className
        )}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          <svg className={cn("h-4 w-4 shrink-0 transition-transform duration-200", value ? "text-brand-green" : "text-slate-400", justSelected && "scale-115 text-brand-green")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
            <line x1="16" y1="2" x2="16" y2="6" />
            <line x1="8" y1="2" x2="8" y2="6" />
            <line x1="3" y1="10" x2="21" y2="10" />
          </svg>
          <span className={cn("truncate text-xs sm:text-[13px] transition-colors", value ? "font-semibold text-ink" : "text-muted font-normal")}>
            {displayDateText}
          </span>
        </span>

        <div className="flex items-center gap-1 shrink-0">
          {clearable && value && (
            <span
              role="button"
              tabIndex={0}
              onClick={clearDate}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") clearDate(e as unknown as React.MouseEvent); }}
              title="Clear date"
              className="rounded p-0.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition-colors cursor-pointer"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </span>
          )}
          <svg
            className={cn("h-3.5 w-3.5 text-muted transition-transform duration-200 shrink-0", isOpen && "rotate-180 text-brand-green")}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </button>

      {isOpen && createPortal(
        <div
          ref={popoverRef}
          id={popupId}
          role="dialog"
          aria-label="Choose date"
          style={popStyle}
          className="overflow-visible rounded-xl border border-line bg-white p-3.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.24)] animate-dropdown-in select-none z-[120]"
        >
          {/* Header: Month & Year navigation with Custom Animated Dropdowns */}
          <div className="relative flex items-center justify-between pb-3 border-b border-line-soft gap-1">
            <button
              type="button"
              onClick={prevMonth}
              title="Previous month"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink transition-colors active:scale-90"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>

            <div className="flex items-center gap-1.5 min-w-0">
              {/* Custom Month Dropdown */}
              <div className="relative" ref={monthMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsMonthOpen(!isMonthOpen);
                    setIsYearOpen(false);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-7 rounded-lg border px-2.5 text-[12px] font-semibold transition-all duration-150 cursor-pointer shadow-2xs select-none",
                    isMonthOpen
                      ? "border-brand-green bg-emerald-50 text-brand-green ring-2 ring-brand-green/20"
                      : "border-slate-200 bg-white text-slate-800 hover:border-brand-green hover:text-brand-green hover:bg-emerald-50/40"
                  )}
                  aria-expanded={isMonthOpen}
                  aria-label="Choose month"
                >
                  <span>{MONTH_NAMES[viewMonth]}</span>
                  <svg
                    className={cn("h-3 w-3 text-slate-400 transition-transform duration-200", isMonthOpen && "rotate-180 text-brand-green")}
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

                {/* Animated Month Dropdown Menu */}
                {isMonthOpen && (
                  <div className="absolute left-0 top-full mt-1.5 z-40 w-52 rounded-xl border border-line bg-white p-2 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.25)] animate-dropdown-in">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1 mb-1.5 flex items-center justify-between">
                      <span>Select Month</span>
                      <span className="text-[10px] text-brand-green font-semibold">12 months</span>
                    </div>
                    <div className="grid grid-cols-3 gap-1">
                      {MONTH_NAMES.map((name, i) => {
                        const isSelected = i === viewMonth;
                        return (
                          <button
                            key={name}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewMonth(i);
                              setIsMonthOpen(false);
                            }}
                            className={cn(
                              "flex flex-col items-center justify-center rounded-lg py-1.5 px-1 text-[11px] font-medium transition-all active:scale-95",
                              isSelected
                                ? "bg-brand-green text-white font-bold shadow-xs scale-102"
                                : "text-slate-700 hover:bg-emerald-50 hover:text-brand-green"
                            )}
                          >
                            <span>{name.slice(0, 3)}</span>
                            {isSelected && (
                              <span className="h-1 w-1 rounded-full bg-white mt-0.5" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>

              {/* Custom Year Dropdown */}
              <div className="relative" ref={yearMenuRef}>
                <button
                  type="button"
                  onClick={() => {
                    setIsYearOpen(!isYearOpen);
                    setIsMonthOpen(false);
                  }}
                  className={cn(
                    "inline-flex items-center gap-1.5 h-7 rounded-lg border px-2.5 text-[12px] font-semibold transition-all duration-150 cursor-pointer shadow-2xs select-none",
                    isYearOpen
                      ? "border-brand-green bg-emerald-50 text-brand-green ring-2 ring-brand-green/20"
                      : "border-slate-200 bg-white text-slate-800 hover:border-brand-green hover:text-brand-green hover:bg-emerald-50/40"
                  )}
                  aria-expanded={isYearOpen}
                  aria-label="Choose year"
                >
                  <span>{viewYear}</span>
                  <svg
                    className={cn("h-3 w-3 text-slate-400 transition-transform duration-200", isYearOpen && "rotate-180 text-brand-green")}
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

                {/* Animated Year Dropdown Menu */}
                {isYearOpen && (
                  <div className="absolute right-0 top-full mt-1.5 z-40 w-32 rounded-xl border border-line bg-white p-1.5 shadow-[0_16px_36px_-8px_rgba(0,0,0,0.25)] animate-dropdown-in">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-1.5 pt-0.5 pb-1 flex items-center justify-between border-b border-line-soft">
                      <span>Year</span>
                      <span className="text-[10px] text-brand-green font-semibold">{viewYear}</span>
                    </div>
                    <div className="max-h-52 overflow-y-auto green-scrollbar py-1 space-y-0.5">
                      {yearOptions.map((y) => {
                        const isSelected = y === viewYear;
                        return (
                          <button
                            key={y}
                            ref={isSelected ? selectedYearButtonRef : undefined}
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewYear(y);
                              setIsYearOpen(false);
                            }}
                            className={cn(
                              "flex w-full items-center justify-between rounded-lg px-2.5 py-1.5 text-[12px] font-medium transition-all text-left active:scale-95",
                              isSelected
                                ? "bg-brand-green text-white font-bold shadow-xs scale-102"
                                : "text-slate-700 hover:bg-emerald-50 hover:text-brand-green"
                            )}
                          >
                            <span>{y}</span>
                            {isSelected && (
                              <svg className="h-3.5 w-3.5 text-white shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                                <path d="M20 6L9 17l-5-5" />
                              </svg>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              type="button"
              onClick={nextMonth}
              title="Next month"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-ink transition-colors active:scale-90"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 pt-2.5 pb-1.5 text-center border-b border-line-soft/60 mb-1">
            {WEEKDAY_NAMES.map((d, idx) => (
              <span
                key={d}
                className={cn(
                  "text-[10.5px] font-bold uppercase tracking-wider py-0.5",
                  idx === 0 || idx === 6 ? "text-amber-600/80" : "text-slate-400"
                )}
              >
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
              const isBeforeMin = Boolean(minDate && cell.iso < minDate);
              const isAfterMax = Boolean(maxDate && cell.iso > maxDate);
              const isDisabled = isBeforeMin || isAfterMax;

              return (
                <button
                  key={cell.iso}
                  type="button"
                  disabled={isDisabled}
                  onClick={() => !isDisabled && handleDaySelect(cell.iso)}
                  className={cn(
                    "relative flex h-8 w-8 items-center justify-center rounded-lg text-[12.5px] transition-all duration-150 mx-auto select-none",
                    cell.isCurrentMonth ? "text-slate-800" : "text-slate-300",
                    isDisabled && "opacity-25 cursor-not-allowed hover:bg-transparent hover:text-slate-300 pointer-events-none",
                    !isSelected && !isDisabled && cell.isCurrentMonth && "hover:bg-emerald-50 hover:text-brand-green font-medium hover:scale-110 active:scale-95",
                    isTodayCell && !isSelected && "ring-1.5 ring-brand-green font-bold text-brand-green bg-emerald-50/50",
                    isSelected && !isAnimating && "bg-brand-green text-white font-bold shadow-sm shadow-brand-green/30 scale-100",
                    isAnimating && "scale-120 z-10 bg-emerald-600 text-white font-extrabold ring-4 ring-brand-green/50 ring-offset-1 shadow-lg shadow-brand-green/40 duration-200"
                  )}
                >
                  {/* Ping radiating ring during click animation */}
                  {isAnimating && (
                    <span className="absolute inset-0 rounded-lg bg-brand-green/40 animate-ping pointer-events-none" />
                  )}

                  <span className="relative z-10">{cell.day}</span>

                  {/* Checkmark tag on animation */}
                  {isAnimating && (
                    <span className="absolute -top-1 -right-1 z-20 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-700 text-white shadow-xs animate-check-pop">
                      <svg className="h-2.5 w-2.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3}>
                        <path d="M20 6L9 17l-5-5" />
                      </svg>
                    </span>
                  )}

                  {isTodayCell && !isAnimating && (
                    <span
                      className={cn(
                        "absolute bottom-0.5 h-1 w-1 rounded-full transition-colors",
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
            {clearable ? (
              <button
                type="button"
                onClick={() => clearDate()}
                className="inline-flex items-center gap-1 text-[11.5px] font-semibold text-slate-500 hover:text-rose-600 hover:bg-rose-50 px-2 py-1 rounded-md transition-all active:scale-95"
              >
                Clear
              </button>
            ) : (
              <span className="text-[11px] font-medium text-slate-400">
                {minDate ? "Today or later" : "Select date"}
              </span>
            )}
            <button
              type="button"
              disabled={Boolean(minDate && todayIso < minDate)}
              onClick={selectToday}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-bold text-brand-green hover:text-brand-green-dark bg-emerald-50 hover:bg-emerald-100/80 px-2.5 py-1 rounded-md transition-all active:scale-95 disabled:opacity-40"
            >
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
              Today
            </button>
          </div>
        </div>,
        document.body
      )}
    </>
  );
}
