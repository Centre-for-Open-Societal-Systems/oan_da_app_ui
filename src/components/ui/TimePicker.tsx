"use client";

import { useEffect, useId, useRef, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

interface TimePickerProps {
  /** 24-hour time string "HH:MM", e.g. "09:00", "14:30" */
  value: string;
  onChange: (time: string) => void;
  id?: string;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  required?: boolean;
  className?: string;
}

const HOURS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];
const MINUTES = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];
const PRESETS = ["08:00 AM", "09:00 AM", "10:30 AM", "01:30 PM", "02:30 PM", "04:00 PM"];

const POPUP_WIDTH = 280;

function to24Hour(h: number, m: number, period: "AM" | "PM"): string {
  let hour24 = h;
  if (period === "AM") {
    if (h === 12) hour24 = 0;
  } else {
    if (h !== 12) hour24 = h + 12;
  }
  return `${String(hour24).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

function from24Hour(str: string): { hour12: number; minute: number; period: "AM" | "PM" } {
  if (!str || !str.includes(":")) return { hour12: 9, minute: 0, period: "AM" };
  const [hStr, mStr] = str.split(":");
  let h = parseInt(hStr, 10) || 0;
  const m = parseInt(mStr, 10) || 0;
  let period: "AM" | "PM" = "AM";
  if (h >= 12) {
    period = "PM";
    if (h > 12) h -= 12;
  } else if (h === 0) {
    h = 12;
  }
  return { hour12: h, minute: m, period };
}

function formatDisplay(h: number, m: number, period: "AM" | "PM"): string {
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")} ${period}`;
}

export function TimePicker({
  value = "09:00",
  onChange,
  id,
  name,
  placeholder = "Select time",
  disabled,
  required,
  className,
}: TimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [popStyle, setPopStyle] = useState<CSSProperties>({});
  const [animatingTag, setAnimatingTag] = useState<string | null>(null);

  const parsedCurrent = from24Hour(value);
  const [prevValue, setPrevValue] = useState(value);
  const [selectedH, setSelectedH] = useState(parsedCurrent.hour12);
  const [selectedM, setSelectedM] = useState(parsedCurrent.minute);
  const [selectedPeriod, setSelectedPeriod] = useState<"AM" | "PM">(parsedCurrent.period);

  if (value !== prevValue) {
    setPrevValue(value);
    setSelectedH(parsedCurrent.hour12);
    setSelectedM(parsedCurrent.minute);
    setSelectedPeriod(parsedCurrent.period);
  }

  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const popupId = useId();

  // Click outside, escape key, scroll close
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

  const openPicker = () => {
    if (disabled) return;
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const openUp = spaceBelow < 360 && spaceAbove > spaceBelow;
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

  const commitTime = (h: number, m: number, p: "AM" | "PM") => {
    const time24 = to24Hour(h, m, p);
    onChange(time24);
  };

  const handleHourSelect = (h: number) => {
    setSelectedH(h);
    setAnimatingTag(`h-${h}`);
    commitTime(h, selectedM, selectedPeriod);
    setTimeout(() => setAnimatingTag(null), 180);
  };

  const handleMinuteSelect = (m: number) => {
    setSelectedM(m);
    setAnimatingTag(`m-${m}`);
    commitTime(selectedH, m, selectedPeriod);
    setTimeout(() => setAnimatingTag(null), 180);
  };

  const handlePeriodSelect = (p: "AM" | "PM") => {
    setSelectedPeriod(p);
    setAnimatingTag(`p-${p}`);
    commitTime(selectedH, selectedM, p);
    setTimeout(() => setAnimatingTag(null), 180);
  };

  const handlePresetSelect = (preset: string) => {
    setAnimatingTag(`preset-${preset}`);
    const [tPart, pPart] = preset.split(" ");
    const [hP, mP] = tPart.split(":").map(Number);
    const p = pPart as "AM" | "PM";
    setSelectedH(hP);
    setSelectedM(mP);
    setSelectedPeriod(p);
    commitTime(hP, mP, p);
    setTimeout(() => {
      setAnimatingTag(null);
      setIsOpen(false);
    }, 220);
  };

  const handleNow = () => {
    const now = new Date();
    let h = now.getHours();
    let m = Math.round(now.getMinutes() / 5) * 5;
    if (m === 60) {
      m = 0;
      h += 1;
    }
    const p: "AM" | "PM" = h >= 12 ? "PM" : "AM";
    let h12 = h >= 12 ? h - 12 : h;
    if (h12 === 0) h12 = 12;
    setSelectedH(h12);
    setSelectedM(m);
    setSelectedPeriod(p);
    commitTime(h12, m, p);
  };

  const displayString = value
    ? formatDisplay(parsedCurrent.hour12, parsedCurrent.minute, parsedCurrent.period)
    : placeholder;

  return (
    <>
      {(id || name) && (
        <input type="hidden" id={id} name={name ?? id} value={value} required={required} />
      )}

      <button
        ref={triggerRef}
        type="button"
        disabled={disabled}
        onClick={() => (isOpen ? setIsOpen(false) : openPicker())}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        aria-controls={isOpen ? popupId : undefined}
        className={cn(
          "inline-flex h-9 sm:h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 sm:px-3.5 text-xs sm:text-[13px] font-medium transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-brand-green/20",
          value
            ? "border-gray-200 text-ink shadow-xs hover:border-gray-300"
            : "border-gray-200 text-slate-400 hover:border-gray-300",
          isOpen && "border-brand-green ring-2 ring-brand-green/20",
          disabled && "cursor-not-allowed opacity-50 bg-slate-50",
          className
        )}
      >
        <span className="flex items-center gap-2 min-w-0 truncate">
          <svg
            className={cn("h-4 w-4 shrink-0 transition-colors", isOpen ? "text-brand-green" : "text-slate-400")}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          <span className="truncate font-semibold text-ink">
            {displayString}
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

      {isOpen &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={popoverRef}
            id={popupId}
            role="dialog"
            aria-label="Choose time"
            style={popStyle}
            className="overflow-hidden rounded-xl border border-line bg-white p-3.5 shadow-[0_16px_40px_-12px_rgba(0,0,0,0.22)] animate-dropdown-in select-none"
          >
            {/* Header: Title and Live Badge */}
            <div className="flex items-center justify-between pb-2.5 border-b border-line-soft">
              <span className="text-[13px] font-semibold text-slate-800">Select Time</span>
              <span className="rounded-md bg-emerald-50 px-2 py-0.5 text-[12px] font-bold text-brand-green ring-1 ring-brand-green/20">
                {formatDisplay(selectedH, selectedM, selectedPeriod)}
              </span>
            </div>

            {/* Quick Presets */}
            <div className="pt-2.5 pb-2">
              <span className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
                Quick Slots
              </span>
              <div className="grid grid-cols-3 gap-1">
                {PRESETS.map((p) => {
                  const isCurrent = formatDisplay(selectedH, selectedM, selectedPeriod) === p;
                  const isAnimating = animatingTag === `preset-${p}`;
                  return (
                    <button
                      key={p}
                      type="button"
                      onClick={() => handlePresetSelect(p)}
                      className={cn(
                        "rounded-md px-1.5 py-1 text-[11px] font-medium transition-all text-center",
                        isCurrent
                          ? "bg-brand-green text-white font-bold shadow-xs scale-100"
                          : "bg-surface text-slate-600 hover:bg-emerald-50 hover:text-brand-green",
                        isAnimating && "scale-105 ring-2 ring-brand-green/40 bg-emerald-600 text-white animate-pulse"
                      )}
                    >
                      {p}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Time Columns: Hour, Minute, Period */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-line-soft">
              {/* Hour Column */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 text-center mb-1">Hour</span>
                <div className="h-36 overflow-y-auto green-scrollbar pr-0.5 flex flex-col gap-1">
                  {HOURS.map((h) => {
                    const isSelected = selectedH === h;
                    const isAnim = animatingTag === `h-${h}`;
                    return (
                      <button
                        key={h}
                        type="button"
                        onClick={() => handleHourSelect(h)}
                        className={cn(
                          "h-7 w-full rounded-md text-[12px] font-medium transition-all text-center",
                          isSelected
                            ? "bg-brand-green text-white font-bold shadow-xs scale-100"
                            : "text-slate-700 hover:bg-slate-100 hover:text-ink",
                          isAnim && "scale-105 ring-2 ring-brand-green/40 bg-emerald-600 text-white animate-pulse"
                        )}
                      >
                        {String(h).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Minute Column */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 text-center mb-1">Minute</span>
                <div className="h-36 overflow-y-auto green-scrollbar pr-0.5 flex flex-col gap-1">
                  {MINUTES.map((m) => {
                    const isSelected = selectedM === m;
                    const isAnim = animatingTag === `m-${m}`;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => handleMinuteSelect(m)}
                        className={cn(
                          "h-7 w-full rounded-md text-[12px] font-medium transition-all text-center",
                          isSelected
                            ? "bg-brand-green text-white font-bold shadow-xs scale-100"
                            : "text-slate-700 hover:bg-slate-100 hover:text-ink",
                          isAnim && "scale-105 ring-2 ring-brand-green/40 bg-emerald-600 text-white animate-pulse"
                        )}
                      >
                        {String(m).padStart(2, "0")}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Period Column */}
              <div>
                <span className="block text-[11px] font-semibold text-slate-400 text-center mb-1">Period</span>
                <div className="flex flex-col gap-1.5 pt-1">
                  {(["AM", "PM"] as const).map((p) => {
                    const isSelected = selectedPeriod === p;
                    const isAnim = animatingTag === `p-${p}`;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePeriodSelect(p)}
                        className={cn(
                          "h-9 w-full rounded-md text-[12.5px] font-semibold transition-all text-center",
                          isSelected
                            ? "bg-brand-green text-white shadow-xs"
                            : "bg-surface text-slate-600 hover:bg-slate-100 hover:text-ink",
                          isAnim && "scale-105 ring-2 ring-brand-green/40 bg-emerald-600 text-white animate-pulse"
                        )}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between pt-3 mt-2 border-t border-line-soft">
              <button
                type="button"
                onClick={handleNow}
                className="text-[12px] font-semibold text-slate-500 hover:text-brand-green transition-colors px-2 py-1 rounded hover:bg-emerald-50"
              >
                Now
              </button>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="rounded-lg bg-brand-green px-3 py-1 text-[12px] font-bold text-white shadow-xs hover:bg-brand-green-dark transition-colors cursor-pointer"
              >
                Done
              </button>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
