"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";
import { FormField } from "./FormField";
import { Input } from "./Input";
import { FilterDropdown, type FilterOption } from "./FilterDropdown";

export interface FilterFieldConfig {
  key: string;
  label: string;
  allLabel: string;
  placeholder: string;
  options: FilterOption[];
}

/** Map of field key -> selected values (empty set = all). */
export type FilterSelection = Record<string, Set<string>>;

interface AdvancedFiltersDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  fields: FilterFieldConfig[];
  filters: FilterSelection;
  /** `range` is the Date Range (yyyy-mm-dd, empty = open ended); pages without date data ignore it. */
  onApply: (next: FilterSelection, range: { from: string; to: string }) => void;
  /** Hide the Date Range block on pages whose rows have no date to filter. */
  showDateRange?: boolean;
}

type QuickRange = "today" | "yesterday" | "7d" | "30d";

const QUICK_RANGES: { value: QuickRange; label: string }[] = [
  { value: "today", label: "Today" },
  { value: "yesterday", label: "Yesterday" },
  { value: "7d", label: "Last 7 Days" },
  { value: "30d", label: "Last 30 Days" },
];

interface DraftState {
  selections: FilterSelection;
  from: string;
  to: string;
  quickRange: QuickRange | null;
}

const cloneSelection = (fields: FilterFieldConfig[], source: FilterSelection): FilterSelection =>
  Object.fromEntries(fields.map((f) => [f.key, new Set(source[f.key] ?? [])]));

const emptySelection = (fields: FilterFieldConfig[]): FilterSelection =>
  Object.fromEntries(fields.map((f) => [f.key, new Set<string>()]));

const toISODate = (d: Date) => d.toISOString().slice(0, 10);

function rangeFor(quick: QuickRange): { from: string; to: string } {
  const today = new Date();
  const start = new Date(today);
  if (quick === "yesterday") {
    start.setDate(today.getDate() - 1);
    return { from: toISODate(start), to: toISODate(start) };
  }
  if (quick === "7d") start.setDate(today.getDate() - 6);
  if (quick === "30d") start.setDate(today.getDate() - 29);
  return { from: toISODate(start), to: toISODate(today) };
}

export function AdvancedFiltersDrawer({ isOpen, onClose, fields, filters, onApply, showDateRange = true }: AdvancedFiltersDrawerProps) {
  // Unique per drawer so pages with two tables (two drawers) do not repeat element ids.
  const uid = useId();
  const [mounted, setMounted] = useState(false);
  const [draft, setDraft] = useState<DraftState>(() => ({
    selections: cloneSelection(fields, filters),
    from: "",
    to: "",
    quickRange: null,
  }));

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Seed the form from the currently applied column filters each time the drawer opens
  // (state adjusted during render on the isOpen transition, per the React docs pattern).
  const [wasOpen, setWasOpen] = useState(isOpen);
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen);
    if (isOpen) {
      setDraft((prev) => ({ ...prev, selections: cloneSelection(fields, filters) }));
    }
  }

  useEffect(() => {
    if (!isOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!mounted) return null;

  const update = (patch: Partial<DraftState>) => setDraft((prev) => ({ ...prev, ...patch }));

  const setSelection = (key: string, next: Set<string>) =>
    setDraft((prev) => ({ ...prev, selections: { ...prev.selections, [key]: next } }));

  const activeCount =
    fields.filter((f) => (draft.selections[f.key]?.size ?? 0) > 0).length + (draft.from || draft.to ? 1 : 0);

  const apply = () => {
    onApply(cloneSelection(fields, draft.selections), { from: draft.from, to: draft.to });
    onClose();
  };

  const reset = () => {
    setDraft({ selections: emptySelection(fields), from: "", to: "", quickRange: null });
    onApply(emptySelection(fields), { from: "", to: "" });
  };

  return createPortal(
    <div
      className={cn("fixed inset-0 z-[100]", isOpen ? "pointer-events-auto" : "pointer-events-none")}
      aria-hidden={!isOpen}
    >
      {/* Backdrop */}
      <div
        onClick={onClose}
        className={cn(
          "absolute inset-0 bg-ink/30 transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0",
        )}
      />

      {/* Panel */}
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${uid}-title`}
        className={cn(
          "absolute right-0 top-0 flex h-full w-full max-w-[350px] flex-col bg-white shadow-2xl transition-transform duration-300 ease-in-out",
          isOpen ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-tint text-brand-green">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
                <circle cx="9" cy="6" r="2" fill="white" />
                <circle cx="15" cy="12" r="2" fill="white" />
                <circle cx="8" cy="18" r="2" fill="white" />
              </svg>
            </span>
            <h2 id={`${uid}-title`} className="text-[18px] font-semibold text-ink">Advanced Filters</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filters"
            className="rounded-md p-1 text-subtle transition-colors hover:bg-zinc-100 hover:text-ink"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-5 overflow-y-auto px-6 py-6 green-scrollbar">
          {fields.map((field) => (
            <FormField key={field.key} label={field.label} htmlFor={`${uid}-${field.key}`}>
              <FilterDropdown
                id={`${uid}-${field.key}`}
                variant="select"
                label={field.label}
                allLabel={field.allLabel}
                placeholder={field.placeholder}
                options={field.options}
                selected={draft.selections[field.key] ?? new Set()}
                onApply={(next) => setSelection(field.key, next)}
              />
            </FormField>
          ))}

          {showDateRange && (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] font-medium text-ink">Date Range</p>
            <div className="grid grid-cols-2 gap-3">
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${uid}-from`} className="text-[12.5px] text-subtle">From</label>
                <Input
                  id={`${uid}-from`}
                  type="date"
                  value={draft.from}
                  onChange={(e) => update({ from: e.target.value, quickRange: null })}
                  className="h-10 px-2.5 text-[13.5px]"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label htmlFor={`${uid}-to`} className="text-[12.5px] text-subtle">To</label>
                <Input
                  id={`${uid}-to`}
                  type="date"
                  value={draft.to}
                  onChange={(e) => update({ to: e.target.value, quickRange: null })}
                  className="h-10 px-2.5 text-[13.5px]"
                />
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {QUICK_RANGES.map((range) => {
                const active = draft.quickRange === range.value;
                return (
                  <button
                    key={range.value}
                    type="button"
                    onClick={() => update({ quickRange: range.value, ...rangeFor(range.value) })}
                    className={cn(
                      "rounded-md border px-3 py-1.5 text-[13px] transition-colors",
                      active
                        ? "border-brand-green bg-brand-mint font-medium text-brand-green"
                        : "border-line bg-white text-muted hover:border-slate-300 hover:text-ink",
                    )}
                  >
                    {range.label}
                  </button>
                );
              })}
            </div>
          </div>
          )}
        </div>

        <div className="flex items-center gap-3 border-t border-line bg-surface px-6 py-5">
          <button
            type="button"
            onClick={reset}
            className="h-10 shrink-0 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-5 text-[14px] font-semibold text-ink transition-colors hover:bg-zinc-50"
          >
            Reset Filters
          </button>
          <button
            type="button"
            onClick={apply}
            className="inline-flex h-10 flex-1 items-center justify-center gap-2.5 whitespace-nowrap rounded-md bg-brand-green px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-green-dark"
          >
            Apply Filters
            {activeCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-white/25 px-1.5 text-[12px] font-semibold">
                {activeCount}
              </span>
            )}
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
