"use client";

import type { ReactNode } from "react";
import type { FieldOptions } from "@/features/farmers";
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

function Block({ title, step, onEdit, problems, children }: { title: string; step: StepKey; onEdit: (step: number) => void; problems: number; children: ReactNode }) {
  return (
    <section className="rounded-xl border border-line">
      <header className="flex items-center justify-between border-b border-line-soft px-4 py-3">
        <h3 className="text-[14.5px] font-semibold text-ink">
          {title}
          {problems > 0 && <span className="ml-2 text-[12.5px] font-semibold text-danger">{problems} to fix</span>}
        </h3>
        <button type="button" onClick={() => onEdit(stepNumber(step))} className="text-[13px] font-semibold text-brand-green hover:underline">
          Edit
        </button>
      </header>
      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 px-4 py-3 text-[13.5px] sm:grid-cols-2 lg:grid-cols-3">{children}</dl>
    </section>
  );
}

function Item({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-muted">{label}</dt>
      <dd className="mt-0.5 truncate font-medium text-ink">{value || "—"}</dd>
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
