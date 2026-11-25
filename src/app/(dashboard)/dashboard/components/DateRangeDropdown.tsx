"use client";

import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

const RANGES = [
  "Last 7 days",
  "Last 30 days",
  "Last 90 days",
  "This quarter",
  "This year",
  "Custom range",
];

interface DateRangeDropdownProps {
  /** Options to pick from; defaults to the dashboard ranges. */
  ranges?: readonly string[];
  defaultValue?: string;
  onChange?: (range: string) => void;
  className?: string;
}

export function DateRangeDropdown({
  ranges = RANGES,
  defaultValue = "Last 30 days",
  onChange,
  className,
}: DateRangeDropdownProps = {}) {
  const [isOpen, setIsOpen] = useState(false);
  const [selected, setSelected] = useState(defaultValue);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Close on Escape key press
  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className={cn("relative w-full sm:w-[230px] md:w-[240px]", className)} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        className={cn(
          "flex h-9 sm:h-10 w-full items-center justify-between gap-2 border border-zinc-200 bg-white px-3 sm:px-3.5 text-[13px] sm:text-[13.5px] font-medium text-ink transition-colors hover:bg-zinc-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green",
          isOpen ? "rounded-t-lg rounded-b-none border-b-zinc-200" : "rounded-lg"
        )}
      >
        <div className="flex items-center gap-2 sm:gap-2.5 truncate">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="shrink-0 text-ink-soft">
            <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
            <line x1="16" y1="2" x2="16" y2="6"></line>
            <line x1="8" y1="2" x2="8" y2="6"></line>
            <line x1="3" y1="10" x2="21" y2="10"></line>
          </svg>
          <span className="truncate">{selected}</span>
        </div>
        <svg className={cn("h-4 w-4 shrink-0 text-ink-soft transition-transform duration-200", isOpen && "rotate-180")} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {isOpen && (
        <div
          role="listbox"
          className="absolute top-full left-0 right-0 w-full bg-white rounded-b-lg border border-zinc-200 border-t-0 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.15)] z-50 overflow-hidden animate-in fade-in duration-150"
        >
          <div className="flex flex-col">
            {ranges.map((range, idx) => {
              const isSelected = selected === range;
              return (
                <button
                  key={range}
                  type="button"
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    setSelected(range);
                    onChange?.(range);
                  }}
                  className={cn(
                    "flex w-full items-center gap-3 sm:gap-3.5 px-3.5 sm:px-4 py-2.5 sm:py-3 text-left text-[13.5px] sm:text-[14px] transition-colors",
                    isSelected ? "bg-brand-mint text-brand-green font-semibold" : "text-ink hover:bg-zinc-50",
                    idx !== ranges.length - 1 && "border-b border-zinc-100"
                  )}
                >
                  {/* Radio Icon */}
                  <div className={cn(
                    "w-4.5 h-4.5 sm:w-5 sm:h-5 rounded-full border-[2px] flex items-center justify-center shrink-0 transition-all duration-200",
                    isSelected ? "border-brand-green" : "border-subtle"
                  )}>
                    <div
                      className={cn(
                        "w-2.5 h-2.5 rounded-full bg-brand-green transition-all duration-200",
                        isSelected ? "scale-100 opacity-100" : "scale-0 opacity-0"
                      )}
                    />
                  </div>

                  <div className="flex items-center gap-2 min-w-0">
                    <span className="truncate">{range}</span>
                    {isSelected && (
                      <svg className="w-[18px] h-[18px] shrink-0 text-brand-green" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                    )}
                  </div>
                </button>
              );
            })}
          </div>

          <div className="p-3 sm:p-3.5 border-t border-zinc-100 flex justify-end bg-surface">
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="inline-flex shrink-0 whitespace-nowrap h-8 sm:h-9 items-center rounded-md bg-brand-green px-3.5 sm:px-4 text-[13px] sm:text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-green-dark focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green"
            >
              Apply
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
