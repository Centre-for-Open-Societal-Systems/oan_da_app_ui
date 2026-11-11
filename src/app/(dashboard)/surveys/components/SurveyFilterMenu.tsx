"use client";

import { useEffect, useId, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

export interface FilterMenuOption {
  value: string;
  label: string;
  count?: number;
}

const CheckBadge = () => (
  <svg className="h-4 w-4 shrink-0 text-brand-green" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm4.7 7.7l-5.5 5.5a1 1 0 01-1.4 0l-2.5-2.5a1 1 0 111.4-1.4l1.8 1.8 4.8-4.8a1 1 0 111.4 1.4z" />
  </svg>
);

const Count = ({ n, active }: { n: number; active: boolean }) => (
  <span className={cn("ml-auto rounded-md border px-2 py-0.5 text-[12.5px] font-semibold tabular-nums", active ? "border-brand-border bg-brand-tint text-brand-green" : "border-transparent bg-line-soft text-slate-600")}>
    {n.toLocaleString()}
  </span>
);

const Box = ({ checked }: { checked: boolean }) => (
  <span className={cn("flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border", checked ? "border-brand-green bg-brand-green text-white" : "border-slate-400 bg-white")}>
    {checked && (
      <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>
    )}
  </span>
);

const Radio = ({ checked }: { checked: boolean }) => (
  <span className={cn("flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full border", checked ? "border-brand-green" : "border-slate-400")}>
    {checked && <span className="h-2.5 w-2.5 rounded-full bg-brand-green" />}
  </span>
);

const ROW = "flex w-full items-center gap-3 border-b border-line-soft px-4 py-3 text-left text-[14px] transition-colors last:border-b-0";
const rowTone = (active: boolean) => (active ? "bg-brand-wash font-semibold text-brand-green" : "text-ink hover:bg-surface");

// Field-style trigger + portalled menu (portalled so the overflow-hidden analytics card never clips it).
function MenuShell({ label, value, children }: { label: string; value: string; children: (close: () => void) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const [style, setStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (!triggerRef.current?.contains(t) && !menuRef.current?.contains(t)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    const onScroll = (e: Event) => !menuRef.current?.contains(e.target as Node) && setOpen(false);
    const onResize = () => setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", onResize);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", onResize);
    };
  }, [open]);

  const toggle = () => {
    if (open) return setOpen(false);
    const r = triggerRef.current?.getBoundingClientRect();
    if (r) setStyle({ left: r.left, top: r.bottom + 6, width: Math.max(r.width, 300) });
    setOpen(true);
  };

  return (
    <div className="flex flex-col gap-1.5">
      <span className="text-[12.5px] text-muted">{label}</span>
      <button
        ref={triggerRef}
        type="button"
        onClick={toggle}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        className={cn("flex h-10 w-full items-center justify-between gap-2 rounded-lg border bg-white px-3 text-left text-[14px] text-ink transition-colors", open ? "border-brand-green ring-2 ring-brand-green/20" : "border-line hover:border-slate-300")}
      >
        <span className="truncate">{value}</span>
        <svg className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform", open && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
      </button>
      {open && createPortal(
        <div ref={menuRef} id={menuId} role="dialog" aria-label={label} style={style}
          className="fixed z-[110] animate-dropdown-in overflow-hidden rounded-xl border border-line bg-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]">
          {children(() => setOpen(false))}
        </div>,
        document.body,
      )}
    </div>
  );
}

/** Checkbox list with counts. With `allLabel`, a first "All …" row stands for "no narrowing" (empty selection). */
export function MultiFilterMenu({ label, options, selected, onChange, allLabel, unit }: {
  label: string;
  options: FilterMenuOption[];
  selected: string[];
  onChange: (next: string[]) => void;
  allLabel?: string;
  /** Plural noun for the trigger when several are picked, e.g. "regions". */
  unit: string;
}) {
  const isAll = !!allLabel && (selected.length === 0 || selected.length === options.length);
  const toggle = (v: string) => {
    const base = isAll ? [] : selected;
    const next = base.includes(v) ? base.filter((x) => x !== v) : [...base, v];
    // Without an "All" row at least one option stays picked.
    if (!allLabel && next.length === 0) return;
    onChange(next.length === options.length && allLabel ? [] : next);
  };
  const triggerText = isAll
    ? allLabel!
    : selected.length === 1
      ? options.find((o) => o.value === selected[0])?.label ?? selected[0]
      : `${selected.length} ${unit}`;
  const total = options.reduce((n, o) => n + (o.count ?? 0), 0);

  return (
    <MenuShell label={label} value={triggerText}>
      {() => (
        <div role="group" aria-label={label}>
          {allLabel && (
            <button type="button" role="checkbox" aria-checked={isAll} onClick={() => onChange([])} className={cn(ROW, rowTone(isAll))}>
              <Box checked={isAll} />
              {allLabel}
              {isAll && <CheckBadge />}
              <Count n={total} active={isAll} />
            </button>
          )}
          {options.map((o) => {
            const on = !isAll && selected.includes(o.value);
            return (
              <button key={o.value} type="button" role="checkbox" aria-checked={on} onClick={() => toggle(o.value)} className={cn(ROW, rowTone(on))}>
                <Box checked={on} />
                {o.label}
                {on && <CheckBadge />}
                {o.count !== undefined && <Count n={o.count} active={on} />}
              </button>
            );
          })}
        </div>
      )}
    </MenuShell>
  );
}

export const CUSTOM_RANGE = "custom";

const fmtDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** "01 Jan 2024 – 30 Jun 2024" for a picked custom range. */
export const formatRange = ({ from, to }: { from: string; to: string }) => `${fmtDate(from)} – ${fmtDate(to)}`;

/** Radio list of date presets; "Custom range" reveals from / to inputs and an Apply button. */
export function DateFilterMenu({ label, options, value, onChange, customRange, onCustomRange }: {
  label: string;
  options: FilterMenuOption[];
  value: string;
  onChange: (value: string) => void;
  customRange: { from: string; to: string };
  onCustomRange: (range: { from: string; to: string }) => void;
}) {
  const [draft, setDraft] = useState(customRange);
  const [showCustom, setShowCustom] = useState(value === CUSTOM_RANGE);
  const triggerText = value === CUSTOM_RANGE && customRange.from && customRange.to
    ? formatRange(customRange)
    : options.find((o) => o.value === value)?.label ?? value;
  const draftValid = draft.from !== "" && draft.to !== "" && draft.from <= draft.to;

  return (
    <MenuShell label={label} value={triggerText}>
      {(close) => (
        <div role="radiogroup" aria-label={label}>
          {options.map((o) => {
            const on = o.value === CUSTOM_RANGE ? showCustom : !showCustom && value === o.value;
            return (
              <button key={o.value} type="button" role="radio" aria-checked={on}
                onClick={() => {
                  if (o.value === CUSTOM_RANGE) return setShowCustom(true);
                  setShowCustom(false);
                  onChange(o.value);
                  close();
                }}
                className={cn(ROW, rowTone(on))}>
                <Radio checked={on} />
                {o.label}
                {on && <CheckBadge />}
              </button>
            );
          })}
          {showCustom && (
            <div className="flex flex-col gap-3 border-t border-line bg-surface px-4 py-3">
              <div className="grid grid-cols-2 gap-2">
                <label className="flex flex-col gap-1 text-[12px] text-muted">From
                  <input type="date" value={draft.from} max={draft.to || undefined} onChange={(e) => setDraft((d) => ({ ...d, from: e.target.value }))} className="h-9 rounded-md border border-line bg-white px-2 text-[13px] text-ink focus:border-brand-green focus:outline-none" />
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-muted">To
                  <input type="date" value={draft.to} min={draft.from || undefined} onChange={(e) => setDraft((d) => ({ ...d, to: e.target.value }))} className="h-9 rounded-md border border-line bg-white px-2 text-[13px] text-ink focus:border-brand-green focus:outline-none" />
                </label>
              </div>
              <button type="button" disabled={!draftValid}
                onClick={() => { onCustomRange(draft); onChange(CUSTOM_RANGE); close(); }}
                className="ml-auto inline-flex h-9 items-center rounded-md bg-brand-green px-5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:bg-slate-300">
                Apply
              </button>
            </div>
          )}
        </div>
      )}
    </MenuShell>
  );
}
