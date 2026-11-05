"use client";

import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { METRICS, REQUIRED, SELECT_FIELDS, type FormErrors, type ManualForm } from "./kpiEntry";
import { KpiSection } from "./KpiSection";

interface ManualEntryStepsProps {
  form: ManualForm;
  errors: FormErrors;
  setField: (key: keyof ManualForm) => (value: string) => void;
}

export function ManualEntrySteps({ form, errors, setField }: ManualEntryStepsProps) {
  return (
    <>
      <KpiSection title="Step 1: Agent & reporting period">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {SELECT_FIELDS.map(({ key, label, options }) => (
            <FormField key={key} label={label} htmlFor={`kpi-${key}`} required hint={errors[key]} hintTone="error">
              <Select id={`kpi-${key}`} value={form[key]} onChange={(e) => setField(key)(e.target.value)} className="h-10">
                {options.map((o) => (
                  <option key={o} value={o}>{o}</option>
                ))}
              </Select>
            </FormField>
          ))}
        </div>
      </KpiSection>

      <KpiSection title="Step 2: Enter KPIs">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {METRICS.map(({ key, label, unit, hint, max }) => (
            <FormField
              key={key}
              label={label}
              htmlFor={`kpi-${key}`}
              required={REQUIRED.includes(key)}
              hint={errors[key] ?? `${hint} · ${max === undefined ? "0 or more" : `0 to ${max}`}`}
              hintTone={errors[key] || (form[key] !== "" && (Number(form[key]) < 0 || (max !== undefined && Number(form[key]) > max))) ? "error" : "muted"}
            >
              <Input
                id={`kpi-${key}`}
                type="number"
                inputMode="numeric"
                min={0}
                max={max}
                value={form[key]}
                onChange={(e) => setField(key)(e.target.value)}
                className={cn("h-10 pr-20", errors[key] && "border-danger")}
                endAdornment={<span className="text-[13px] font-medium text-ink-soft">{unit}</span>}
              />
            </FormField>
          ))}
          <FormField label="Operational Notes & Observations" htmlFor="kpi-notes" className="sm:col-span-2 xl:col-span-4">
            <Input
              id="kpi-notes"
              value={form.notes}
              onChange={(e) => setField("notes")(e.target.value)}
              placeholder="e.g. Met all agricultural milestones for Kebele 01."
              className="h-10"
            />
          </FormField>
        </div>
      </KpiSection>
    </>
  );
}
