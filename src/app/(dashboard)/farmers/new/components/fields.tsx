"use client";

import type { ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
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
    <Card className="p-5 shadow-card sm:p-6">
      <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
      <p className="mt-1 text-[13.5px] text-muted">{description}</p>
      <div className="mt-5 flex flex-col gap-6">{children}</div>
    </Card>
  );
}

export function Grid({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3", className)}>{children}</div>;
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
}

export function TextField({ id, label, value, onChange, error, required, hint, type = "text", placeholder, inputMode }: TextFieldProps) {
  return (
    <FormField label={label} htmlFor={id} required={required} hint={error ?? hint} hintTone={error ? "error" : "muted"}>
      <Input
        id={id}
        type={type}
        value={value}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder ?? (type === "date" ? undefined : `Enter ${label.toLowerCase()}`)}
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

/** Several choices of one list (income sources). */
export function MultiOptionField({ id, label, list, options, loading, values, onChange, error }: Omit<OptionFieldProps, "value" | "onChange" | "required"> & { values: string[]; onChange: (values: string[]) => void }) {
  const choices = choicesFor(options, list);
  const missing = !loading && options !== null && !choices;
  return (
    <FormField label={label} htmlFor={id} hint={error ?? (loading ? "Loading the registry's list…" : missing ? `The registry sent no list for ${OPTION_LISTS[list][0]}.` : undefined)} hintTone={error || missing ? "error" : "muted"} className="col-span-full">
      <div id={id} role="group" aria-label={label} className="flex flex-wrap gap-x-6 gap-y-3">
        {choices?.map((o) => (
          <label key={o.value} className="flex cursor-pointer items-center gap-2 text-[14px] text-ink">
            <Checkbox checked={values.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...values, o.value] : values.filter((v) => v !== o.value))} />
            {o.label}
          </label>
        ))}
      </div>
    </FormField>
  );
}

/** A repeating group of fields (household members, land parcels, crops, animals). */
export function RowList<T>({ title, rows, addLabel, onAdd, onRemove, render, minRows = 0 }: { title: string; rows: T[]; addLabel: string; onAdd: () => void; onRemove: (index: number) => void; render: (row: T, index: number) => ReactNode; minRows?: number }) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
        <Button type="button" variant="outline" size="sm" onClick={onAdd}>
          + {addLabel}
        </Button>
      </div>
      {rows.length === 0 && <p className="text-[13px] text-muted">None added.</p>}
      {rows.map((row, i) => (
        <div key={i} className="rounded-xl border border-line p-4">
          <div className="mb-3 flex items-center justify-between">
            <span className="text-[13px] font-semibold text-ink-soft">
              {title} {i + 1}
            </span>
            {rows.length > minRows && (
              <button type="button" onClick={() => onRemove(i)} className="text-[13px] font-semibold text-danger hover:underline">
                Remove
              </button>
            )}
          </div>
          {render(row, i)}
        </div>
      ))}
    </section>
  );
}
