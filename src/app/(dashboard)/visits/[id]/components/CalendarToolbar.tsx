"use client";

import { Dropdown } from "@/components/ui/Dropdown";
import { cn } from "@/lib/utils";
import { LEGEND, VIEWS } from "./calendar";

interface CalendarToolbarProps {
  label: string;
  unit: string;
  onCurrent: boolean;
  onStep: (dir: -1 | 1) => void;
  onToday: () => void;
  view: string;
  onViewChange: (view: string) => void;
}

export function CalendarToolbar({ label, unit, onCurrent, onStep, onToday, view, onViewChange }: CalendarToolbarProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-y-2.5 gap-x-3 border-b border-line px-3.5 py-3 sm:px-5 sm:py-3.5 lg:flex-nowrap lg:gap-4">
      {/* 1. Month / Period Navigation: Order 1 on all screens */}
      <div className="order-1 flex min-w-0 items-center gap-1.5 sm:gap-2">
        <button
          type="button"
          onClick={() => onStep(-1)}
          aria-label={`Previous ${unit}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-slate-600 transition-colors hover:bg-zinc-50 active:bg-zinc-100"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        <span className="px-1 text-[14px] sm:text-[15px] font-semibold text-ink whitespace-nowrap truncate" aria-live="polite">
          {label}
        </span>
        <button
          type="button"
          onClick={() => onStep(1)}
          aria-label={`Next ${unit}`}
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 text-slate-600 transition-colors hover:bg-zinc-50 active:bg-zinc-100"
        >
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 6l6 6-6 6" />
          </svg>
        </button>
        {!onCurrent && (
          <button
            type="button"
            onClick={onToday}
            className="ml-0.5 sm:ml-1 shrink-0 rounded-md px-1.5 py-0.5 text-[12px] sm:text-[13px] font-semibold text-brand-green hover:bg-brand-wash transition-colors"
          >
            Today
          </button>
        )}
      </div>

      {/* 2. Dropdown: Order 2 on mobile/tablet (aligns right opposite Month Nav), Order 3 on desktop */}
      <div className="order-2 shrink-0 lg:order-3">
        <label htmlFor="calendar-view" className="sr-only">Calendar view</label>
        <Dropdown
          id="calendar-view"
          value={view}
          onChange={onViewChange}
          options={VIEWS}
          align="right"
          className="w-[105px] sm:w-[115px] [&>button]:h-8 sm:[&>button]:h-8.5 [&>button]:text-[13px] sm:[&>button]:text-[13.5px]"
        />
      </div>

      {/* 3. Legend: Order 3 (full-width row 2) on mobile/tablet, Order 2 (center/pushed right) on desktop */}
      <div className="order-3 w-full lg:order-2 lg:w-auto lg:basis-auto lg:ml-auto">
        <ul className="flex flex-wrap items-center gap-x-3.5 sm:gap-x-4 gap-y-1 text-[12px] sm:text-[13px] text-slate-600">
          {LEGEND.map((item) => (
            <li key={item.status} className="flex items-center gap-1.5 whitespace-nowrap">
              <span className={cn("h-2 w-2 rounded-full shrink-0", item.dot)} />
              {item.label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
