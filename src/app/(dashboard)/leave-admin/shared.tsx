"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import type { FilterOption } from "@/components/ui/FilterDropdown";
import { ACCENTS, type Accent } from "../lifecycle/components/LeaveHistory";
import { Icon } from "../lifecycle/components/shared";

export const optionsOf = (values: string[]): FilterOption[] =>
  [...new Set(values)].sort().map((value) => ({ value, label: value, count: values.filter((v) => v === value).length }));

export const has = (set: Set<string>, value: string) => set.size === 0 || set.has(value);

/** Small "?" mark beside a title or label; opens a card with the title, a short explanation and "Got it". */
export function HelpDot({ title, text }: { title: string; text: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setIsOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setIsOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [isOpen]);

  return (
    <span ref={ref} className="relative inline-flex">
      <button
        type="button"
        aria-label={`Help: ${title}`}
        aria-expanded={isOpen}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen((open) => !open);
        }}
        className="inline-flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-ink-soft/60 text-[10px] font-semibold leading-none text-ink-soft hover:border-brand-green hover:text-brand-green"
      >
        ?
      </button>
      {isOpen && (
        <div role="dialog" aria-label={title} className="absolute left-0 top-full z-30 mt-2 w-[300px] max-w-[80vw] rounded-xl border border-line bg-white px-4 py-3.5 text-left font-normal shadow-xl">
          <p className="text-[15px] font-bold text-ink">{title}</p>
          <p className="mt-2 text-[14px] leading-snug text-ink-soft">{text}</p>
          <button type="button" onClick={() => setIsOpen(false)} className="mt-2.5 text-[14px] font-semibold text-brand-green hover:underline">
            Got it
          </button>
        </div>
      )}
    </span>
  );
}

/** White card at the top of an admin leave page: title, description and the controls at the right. */
export function PageIntro({ title, description, help, children }: { title: string; description: string; help: string; children?: ReactNode }) {
  return (
    <Card className="flex flex-col gap-3 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="min-w-0">
        <h2 className="flex items-center gap-2.5 text-[26px] font-bold tracking-tight text-ink">
          {title}
          <HelpDot title={title} text={help} />
        </h2>
        <p className="mt-1 max-w-[640px] text-[14px] text-ink-soft">{description}</p>
      </div>
      {children && <div className="flex shrink-0 flex-wrap items-center gap-3">{children}</div>}
    </Card>
  );
}

/** Figure tile with a coloured left edge and an icon chip. */
export function SummaryTile({ label, value, note, accent, icon, help }: { label: string; value: string | number; note: string; accent: Accent; icon: string; help?: string }) {
  const a = ACCENTS[accent];
  return (
    <Card className={`flex items-center justify-between gap-3 border-l-4 px-4 py-3.5 ${a.border}`}>
      <div className="min-w-0">
        <p className="flex items-center gap-1.5 text-[13.5px] font-medium text-ink-soft">
          {label}
          {help && <HelpDot title={label} text={help} />}
        </p>
        <p className="mt-1 text-[22px] font-bold leading-none text-ink">{value}</p>
        <p className="mt-1.5 text-[12px] text-ink-soft">{note}</p>
      </div>
      <span className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${a.icon}`}>
        <Icon d={icon} className="h-7 w-7" />
      </span>
    </Card>
  );
}

export const SELECT_CLASS = "h-10 min-w-[150px] bg-white";
