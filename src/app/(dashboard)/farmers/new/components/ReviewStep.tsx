"use client";

import type { ReactNode } from "react";
import type { FieldOptions } from "@/features/farmers";
import { cn } from "@/lib/utils";
import { farmerFullName, placeTrail, stepOfField, type FormErrors, type RegistrationForm } from "../registration";
import { WIZARD_STEPS, type StepKey } from "../registrySpec";
import { labelOf } from "./fields";

interface ReviewStepProps {
  form: RegistrationForm;
  options: FieldOptions | null;
  /** Problems found by the checks (and a 400's details), by field. */
  errors: FormErrors;
  onEditStep: (step: number) => void;
}

const stepNumber = (key: StepKey) => WIZARD_STEPS.findIndex((s) => s.key === key) + 1;

function StepIcon({ step }: { step: StepKey }) {
  const cls = "h-4 w-4 text-brand-green";
  switch (step) {
    case "farmer":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
          <circle cx="12" cy="7" r="4" />
        </svg>
      );
    case "location":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "household":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "holdings":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 2a10 10 0 0 1 10 10c0 5.523-4.477 10-10 10S2 17.523 2 12A10 10 0 0 1 12 2z" />
          <path d="M12 6v6l4 2" />
        </svg>
      );
    case "document":
      return (
        <svg className={cls} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
        </svg>
      );
    default:
      return null;
  }
}

function Block({ title, step, onEdit, problems, children }: { title: string; step: StepKey; onEdit: (step: number) => void; problems: number; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white shadow-2xs transition-all hover:border-slate-300">
      <header className="flex items-center justify-between border-b border-line-soft bg-slate-50/80 px-4 py-2.5 sm:px-5">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 border border-brand-green/20">
            <StepIcon step={step} />
          </div>
          <h3 className="text-sm sm:text-[14.5px] font-bold text-ink">
            {title}
            {problems > 0 && (
              <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[11px] font-bold text-rose-700 border border-rose-200">
                {problems} to fix
              </span>
            )}
          </h3>
        </div>
        <button
          type="button"
          onClick={() => onEdit(stepNumber(step))}
          className="group inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 hover:text-brand-green hover:border-brand-green hover:bg-emerald-50/40 transition-all shadow-2xs cursor-pointer"
        >
          <svg className="h-3 w-3 text-slate-400 group-hover:text-brand-green transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          <span>Edit</span>
        </button>
      </header>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3.5 p-4 sm:p-5 text-[13.5px] sm:grid-cols-2 lg:grid-cols-3">
        {children}
      </dl>
    </section>
  );
}

function Item({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("min-w-0", className)}>
      <dt className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</dt>
      <dd className="mt-0.5 text-[13.5px] font-semibold text-ink break-words">
        {value || <span className="text-slate-300 font-normal">—</span>}
      </dd>
    </div>
  );
}

/** Counts of the problems per step, for the review and the submit popup. */
export function problemsByStep(errors: FormErrors, stepOf: (field: string) => StepKey | null): Partial<Record<StepKey, number>> {
  const out: Partial<Record<StepKey, number>> = {};
  for (const field of Object.keys(errors)) {
    const step = stepOf(field);
    if (step) out[step] = (out[step] ?? 0) + 1;
  }
  return out;
}

export function ReviewStep({ form, options, errors, onEditStep }: ReviewStepProps) {
  const label = labelOf.bind(null, options);
  const problems = problemsByStep(errors, stepOfField);
  const rows = <T,>(list: T[], show: (row: T) => string) => list.map(show).filter(Boolean).join("; ");

  return (
    <div className="flex flex-col gap-4">
      <Block title="Farmer" step="farmer" onEdit={onEditStep} problems={problems.farmer ?? 0}>
        <Item label="Name" value={farmerFullName(form)} />
        <Item label="Gender" value={label("gender", form.gender)} />
        <Item label="Date of birth" value={form.date_of_birth} />
        <Item label="Phone" value={form.phone} />
        <Item label="National ID" value={form.national_id} />
        <Item label="Marital status" value={label("marital_status", form.marital_status)} />
        <Item label="Education" value={label("education_level", form.education_level)} />
        <Item label="Income sources" value={form.income_sources.map((v) => label("income_sources", v)).join(", ")} />
      </Block>

      <Block title="Location" step="location" onEdit={onEditStep} problems={problems.location ?? 0}>
        <Item label="Place" value={placeTrail(form)} />
        <Item label="Kebele id" value={form.places.kebele} />
        <Item label="GPS" value={form.location} />
      </Block>

      <Block title="Household" step="household" onEdit={onEditStep} problems={problems.household ?? 0}>
        <Item label="Size" value={form.household_size} />
        <Item label="Members" value={rows(form.members, (m) => [m.first_name, label("relationship", m.relationship)].filter(Boolean).join(", "))} />
      </Block>

      <Block title="Land, crops and livestock" step="holdings" onEdit={onEditStep} problems={problems.holdings ?? 0}>
        <Item label="Land" value={rows(form.lands, (l) => (l.area_hectare ? `${l.area_hectare} ha ${label("ownership", l.ownership)}`.trim() : ""))} />
        <Item label="Crops" value={rows(form.crops, (c) => [label("crop", c.name), label("season", c.season)].filter(Boolean).join(", "))} />
        <Item label="Livestock" value={rows(form.livestock, (a) => (a.animal ? `${a.count} ${label("animal", a.animal)}` : ""))} />
      </Block>

      <Block title="Identity document" step="document" onEdit={onEditStep} problems={problems.document ?? 0}>
        <Item label="File" value={form.document?.name} />
        <Item label="Document id" value={form.document?.id} />
      </Block>

      {Object.keys(errors).length > 0 && (
        <ul className="rounded-xl border border-danger/30 bg-danger-wash px-4 py-3 text-[13px] text-danger">
          {Object.entries(errors).map(([field, message]) => (
            <li key={field}>
              <span className="font-semibold">{field}</span>: {message}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
