"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { cn } from "@/lib/utils";
import { optionsFor, type FieldOption, type FieldOptions } from "@/features/farmers";
import { FALLBACK_CHOICES, OPTION_LISTS, type OptionList } from "../registrySpec";

// The inputs the Register Farmer steps are made of. Choices come from the registry's field-options lists only.

/** The registry's choices for a list, trying the body's field name first; the fallback, if any, when no register has it. */
export function choicesFor(options: FieldOptions | null, list: OptionList): FieldOption[] | undefined {
  for (const field of OPTION_LISTS[list]) {
    const found = optionsFor(options, field);
    // The farmer is always the head of the household, so a member is never "Head of household" (SELF).
    if (found) return list === "relationship" ? found.filter((o) => o.value.toUpperCase() !== "SELF") : found;
  }
  return FALLBACK_CHOICES[list];
}

/** The label of a stored code, for the review; the code itself when the list does not have it. */
export const labelOf = (options: FieldOptions | null, list: OptionList, value: string) =>
  value ? (choicesFor(options, list)?.find((o) => o.value === value)?.label ?? value) : "";

export function StepCard({ title, description, children }: { title: string; description: string; children: ReactNode }) {
  return (
    <Card className="p-0 shadow-card overflow-hidden">
      <div className="border-b border-line px-4 py-4 sm:px-6 sm:py-4.5 bg-white">
        <h2 className="text-[17px] font-bold text-ink">{title}</h2>
        <p className="mt-1 text-[13.5px] text-muted">{description}</p>
      </div>
      <div className="p-4 sm:p-6 flex flex-col gap-6">{children}</div>
    </Card>
  );
}

export function Grid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-3 sm:gap-x-6 sm:gap-y-5", className)}>{children}</div>;
}

export interface DateFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  minDate?: string;
  maxDate?: string;
  placeholder?: string;
}

export function DateField({
  id,
  label,
  value,
  onChange,
  error,
  required,
  hint,
  minDate,
  maxDate,
  placeholder,
}: DateFieldProps) {
  return (
    <FormField label={label} htmlFor={id} required={required} hint={error ?? hint} hintTone={error ? "error" : "muted"}>
      <DatePicker
        id={id}
        name={id}
        value={value}
        onChange={onChange}
        minDate={minDate}
        maxDate={maxDate}
        clearable={false}
        placeholder={placeholder ?? `Select ${label.toLowerCase()}`}
        className={cn("w-full h-10", error && "border-danger ring-1 ring-danger/20")}
        required={required}
      />
    </FormField>
  );
}

interface TextFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  hint?: string;
  type?: "text" | "date" | "tel" | "number";
  placeholder?: string;
  inputMode?: "numeric" | "decimal" | "tel";
  minDate?: string;
  maxDate?: string;
}

export function TextField({ id, label, value, onChange, error, required, hint, type = "text", placeholder, inputMode, minDate, maxDate }: TextFieldProps) {
  if (type === "date") {
    return (
      <DateField
        id={id}
        label={label}
        value={value}
        onChange={onChange}
        error={error}
        required={required}
        hint={hint}
        minDate={minDate}
        maxDate={maxDate}
        placeholder={placeholder}
      />
    );
  }

  return (
    <FormField label={label} htmlFor={id} required={required} hint={error ?? hint} hintTone={error ? "error" : "muted"}>
      <Input
        id={id}
        type={type}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? `Enter ${label.toLowerCase()}`}
        aria-invalid={error ? true : undefined}
        className={cn(error && "border-danger")}
      />
    </FormField>
  );
}

interface OptionFieldProps {
  id: string;
  label: string;
  list: OptionList;
  options: FieldOptions | null;
  loading: boolean;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
}

/** A select over a field-options list: shows `label`, keeps `value`. Says so when the registry has no such list. */
export function OptionField({ id, label, list, options, loading, value, onChange, error, required }: OptionFieldProps) {
  const choices = choicesFor(options, list);
  const missing = !loading && options !== null && !choices;
  const hint = error ?? (loading ? "Loading the registry's list…" : missing ? `The registry sent no list for ${OPTION_LISTS[list][0]}.` : undefined);
  return (
    <FormField label={label} htmlFor={id} required={required} hint={hint} hintTone={error || missing ? "error" : "muted"}>
      <Select id={id} value={value} onChange={(e) => onChange(e.target.value)} disabled={loading || !choices} aria-invalid={error ? true : undefined} className={cn(error && "border-danger")}>
        <option value="">{loading ? "Loading…" : `Select ${label.toLowerCase()}`}</option>
        {choices?.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </Select>
    </FormField>
  );
}

/** Several choices of one list (income sources) rendered as a modern multi-select dropdown. */
export function MultiOptionField({
  id,
  label,
  list,
  options,
  loading,
  values,
  onChange,
  error,
  className,
}: Omit<OptionFieldProps, "value" | "onChange" | "required"> & {
  values: string[];
  onChange: (values: string[]) => void;
  className?: string;
}) {
  const choices = choicesFor(options, list) ?? [];
  const missing = !loading && options !== null && choices.length === 0;
  const [isOpen, setIsOpen] = useState(false);
  const [menuStyle, setMenuStyle] = useState<CSSProperties>({});
  const triggerRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // Click outside, escape key, scroll close
  useEffect(() => {
    if (!isOpen) return;

    const onPointerDown = (e: MouseEvent) => {
      const target = e.target as Node;
      if (!triggerRef.current?.contains(target) && !menuRef.current?.contains(target)) {
        setIsOpen(false);
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };

    const onScroll = (e: Event) => {
      if (!menuRef.current?.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    window.addEventListener("scroll", onScroll, true);
    window.addEventListener("resize", () => setIsOpen(false));

    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("scroll", onScroll, true);
      window.removeEventListener("resize", () => setIsOpen(false));
    };
  }, [isOpen]);

  const toggleOpen = () => {
    if (loading || choices.length === 0) return;
    if (isOpen) {
      setIsOpen(false);
      return;
    }
    const rect = triggerRef.current?.getBoundingClientRect();
    if (rect) {
      const spaceBelow = window.innerHeight - rect.bottom - 14;
      const spaceAbove = rect.top - 14;
      const up = spaceBelow < 220 && spaceAbove > spaceBelow;
      setMenuStyle({
        position: "fixed",
        width: Math.max(rect.width, 280),
        minWidth: rect.width,
        maxHeight: Math.min(280, Math.max(140, up ? spaceAbove : spaceBelow)),
        zIndex: 120,
        left: Math.max(12, Math.min(rect.left, window.innerWidth - Math.max(rect.width, 280) - 12)),
        ...(up ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
      });
    }
    setIsOpen(true);
  };

  const toggleOption = (val: string) => {
    if (values.includes(val)) {
      onChange(values.filter((v) => v !== val));
    } else {
      onChange([...values, val]);
    }
  };

  const selectedLabels = values
    .map((v) => choices.find((c) => c.value === v)?.label ?? v)
    .filter(Boolean);

  const displaySummary =
    selectedLabels.length === 0
      ? `Select ${label.toLowerCase()}…`
      : selectedLabels.length <= 2
      ? selectedLabels.join(", ")
      : selectedLabels.slice(0, 2).join(", ");

  const hint =
    error ??
    (loading
      ? "Loading the registry's list…"
      : missing
      ? `The registry sent no list for ${OPTION_LISTS[list][0]}.`
      : undefined);

  return (
    <FormField
      label={label}
      htmlFor={id}
      hint={hint}
      hintTone={error || missing ? "error" : "muted"}
      className={className}
    >
      <div className="relative w-full">
        <button
          ref={triggerRef}
          id={id}
          type="button"
          disabled={loading || choices.length === 0}
          onClick={toggleOpen}
          aria-haspopup="listbox"
          aria-expanded={isOpen}
          className={cn(
            "flex h-10 w-full items-center justify-between gap-2.5 rounded-lg border bg-white px-3.5 text-left text-[13.5px] transition-all duration-150 outline-none cursor-pointer disabled:cursor-not-allowed disabled:bg-zinc-50",
            isOpen
              ? "border-brand-green ring-2 ring-brand-green/20"
              : error
              ? "border-danger"
              : "border-gray-200 hover:border-gray-300 focus:border-brand-green focus:ring-2 focus:ring-brand-green/20"
          )}
        >
          <span
            className={cn(
              "min-w-0 flex-1 truncate",
              selectedLabels.length > 0 ? "font-medium text-ink" : "font-normal text-slate-400"
            )}
          >
            {loading ? "Loading…" : displaySummary}
          </span>

          <div className="flex shrink-0 items-center gap-2">
            {selectedLabels.length > 2 && (
              <span
                className="inline-flex items-center justify-center rounded-md border border-brand-green/30 bg-emerald-50 px-1.5 py-0.5 text-[11px] font-bold text-brand-green shadow-2xs"
                title={selectedLabels.slice(2).join(", ")}
              >
                +{selectedLabels.length - 2}
              </span>
            )}
            <svg
              className={cn("h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M6 9l6 6 6-6" />
            </svg>
          </div>
        </button>

        {isOpen &&
          typeof document !== "undefined" &&
          createPortal(
            <div
              ref={menuRef}
              style={menuStyle}
              role="listbox"
              aria-multiselectable="true"
              className="flex animate-dropdown-in flex-col overflow-hidden rounded-xl border border-line bg-white shadow-[0_12px_40px_-12px_rgba(0,0,0,0.22)] select-none"
            >
              <div className="divide-y divide-slate-100 overflow-y-auto green-scrollbar flex-1">
                {choices.map((o) => {
                  const isChecked = values.includes(o.value);
                  return (
                    <button
                      key={o.value}
                      type="button"
                      role="option"
                      aria-selected={isChecked}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        toggleOption(o.value);
                      }}
                      className={cn(
                        "flex w-full cursor-pointer select-none items-center gap-3 px-3.5 py-2.5 text-left text-[13px] text-slate-800 transition-colors hover:bg-emerald-50/60 outline-none active:scale-[0.99]",
                        isChecked && "bg-emerald-50/40"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-all duration-150",
                          isChecked
                            ? "border-brand-green bg-brand-green text-white shadow-2xs scale-105"
                            : "border-slate-300 bg-white hover:border-brand-green"
                        )}
                      >
                        {isChecked && (
                          <svg
                            className="h-3 w-3 text-white animate-check-pop"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth={3.5}
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            aria-hidden="true"
                          >
                            <path d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={cn("font-medium", isChecked ? "text-brand-green" : "text-ink")}>
                        {o.label}
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Footer */}
              <div className="flex items-center justify-between border-t border-slate-100 bg-surface px-3 py-2">
                <button
                  type="button"
                  disabled={values.length === 0}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChange([]);
                  }}
                  className="text-[12px] font-semibold text-slate-500 hover:text-danger disabled:opacity-40 disabled:hover:text-slate-500 transition-colors cursor-pointer"
                >
                  Clear all
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(false);
                  }}
                  className="rounded-lg bg-brand-green px-3 py-1 text-[12px] font-bold text-white shadow-xs hover:bg-brand-green-dark transition-colors cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>,
            document.body
          )}
      </div>
    </FormField>
  );
}

/** A repeating group of fields (household members, land parcels, crops, animals). */
export function RowList<T>({ title, rows, addLabel, onAdd, onRemove, render, minRows = 0 }: { title: string; rows: T[]; addLabel: string; onAdd: () => void; onRemove: (index: number) => void; render: (row: T, index: number) => ReactNode; minRows?: number }) {
  return (
    <section className="flex flex-col gap-3.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm sm:text-[15px] font-bold text-ink">{title}</h3>
          {rows.length > 0 && (
            <span className="inline-flex items-center rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-brand-green border border-brand-green/20">
              {rows.length}
            </span>
          )}
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onAdd}
          className="gap-1.5 text-xs font-semibold text-slate-700 hover:text-brand-green hover:border-brand-green border-slate-200 transition-all shadow-2xs"
        >
          <svg className="h-3.5 w-3.5 text-brand-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          <span>{addLabel}</span>
        </Button>
      </div>

      {rows.length === 0 && (
        <div className="flex items-center justify-between rounded-xl border border-dashed border-slate-200 bg-slate-50/60 px-4 py-3.5 text-xs sm:text-[13px] text-slate-500">
          <span className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
            No {title.toLowerCase()} added yet.
          </span>
          <button
            type="button"
            onClick={onAdd}
            className="font-semibold text-brand-green hover:underline text-xs sm:text-[13px] cursor-pointer"
          >
            + Add now
          </button>
        </div>
      )}

      {rows.map((row, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-line bg-white shadow-2xs transition-all hover:border-slate-300">
          <div className="flex items-center justify-between border-b border-line-soft bg-slate-50/80 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-100 text-[11px] font-bold text-brand-green">
                {i + 1}
              </span>
              <span className="text-xs sm:text-[13px] font-bold text-ink">
                {title} {i + 1}
              </span>
            </div>
            {rows.length > minRows && (
              <button
                type="button"
                onClick={() => onRemove(i)}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-semibold text-rose-600 transition-colors hover:bg-rose-50 hover:text-rose-700 cursor-pointer"
                title={`Remove ${title} ${i + 1}`}
              >
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                </svg>
                <span>Remove</span>
              </button>
            )}
          </div>
          <div className="p-4 sm:p-5">
            {render(row, i)}
          </div>
        </div>
      ))}
    </section>
  );
}
