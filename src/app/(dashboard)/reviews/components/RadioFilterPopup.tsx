"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export interface RadioOption {
  value: string;
  label: string;
  /** Small tag at the right end of the row, e.g. "Current" or "YTD". */
  badge?: string;
}

interface RadioFilterPopupProps {
  label: string;
  value: string;
  options: RadioOption[];
  onChange: (value: string) => void;
  /** Pick, then confirm with an Apply button; without it a pick applies immediately. */
  withApply?: boolean;
  /** Trigger text (defaults to the selected option's label). */
  triggerLabel?: string;
  className?: string;
  menuClassName?: string;
}

const CHECK = "M5 13l4 4L19 7";
const Svg = ({ d, className }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

// Calendar-button trigger that opens a radio list (the date / type filters of the Reviews pages).
export function RadioFilterPopup({ label, value, options, onChange, withApply, triggerLabel, className, menuClassName }: RadioFilterPopupProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(value);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", close);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("mousedown", close);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);

  const pick = (v: string) => {
    if (withApply) return setDraft(v);
    onChange(v);
    setOpen(false);
  };
  const current = withApply ? draft : value;

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => {
          setDraft(value);
          setOpen((o) => !o);
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={cn("inline-flex h-11 items-center justify-between gap-2 rounded-lg border border-line bg-white px-3.5 text-[14px] text-ink transition-colors hover:bg-surface", className)}
      >
        <span className="flex items-center gap-2.5">
          <Svg d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z" className="h-[18px] w-[18px] text-slate-500" />
          {triggerLabel ?? options.find((o) => o.value === value)?.label ?? value}
        </span>
        <Svg d="M6 9l6 6 6-6" className={cn("h-4 w-4 text-slate-500 transition-transform", open && "rotate-180")} />
      </button>
      {open && (
        <div role="dialog" aria-label={label} className={cn("absolute right-0 top-full z-40 mt-1.5 w-[240px] overflow-hidden rounded-xl border border-line bg-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]", menuClassName)}>
          <div role="radiogroup" aria-label={label}>
            {options.map((o) => {
              const on = current === o.value;
              return (
                <label key={o.value} className={cn("flex cursor-pointer items-center gap-3 border-b border-line-soft px-4 py-3 text-[14px] last:border-b-0", on ? "bg-brand-wash font-semibold text-brand-green" : "text-ink hover:bg-surface")}>
                  <input type="radio" name={`radio-${label}`} checked={on} onChange={() => pick(o.value)} className="h-4 w-4 accent-brand-green" />
                  <span className="flex-1">{o.label}</span>
                  {on && !o.badge && <Svg d={CHECK} className="h-4 w-4 text-brand-green" />}
                  {on && o.badge && <Svg d={CHECK} className="h-4 w-4 text-brand-green" />}
                  {o.badge && (
                    <span className={cn("rounded-md px-2.5 py-0.5 text-[12.5px] font-semibold", on ? "border border-brand-border bg-brand-mint text-brand-green" : "bg-slate-100 text-slate-600")}>{o.badge}</span>
                  )}
                </label>
              );
            })}
          </div>
          {withApply && (
            <div className="flex justify-end bg-surface px-3 py-3">
              <button
                type="button"
                onClick={() => {
                  onChange(draft);
                  setOpen(false);
                }}
                className="h-9 rounded-md bg-brand-green px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-green-dark"
              >
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
