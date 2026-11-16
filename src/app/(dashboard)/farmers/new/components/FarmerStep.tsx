"use client";

import type { FieldOptions } from "@/features/farmers";
import { toEthiopianDate } from "../ethiopianDate";
import type { FormErrors, RegistrationForm } from "../registration";
import { Grid, MultiOptionField, OptionField, TextField } from "./fields";

export interface StepProps {
  form: RegistrationForm;
  update: (patch: Partial<RegistrationForm>) => void;
  errors: FormErrors;
  options: FieldOptions | null;
  optionsLoading: boolean;
}

export function FarmerStep({ form, update, errors, options, optionsLoading }: StepProps) {
  const ec = toEthiopianDate(form.date_of_birth);
  return (
    <>
      <Grid>
        <TextField id="first_name" label="First name" required value={form.first_name} onChange={(v) => update({ first_name: v })} error={errors.first_name} />
        <TextField id="father_name" label="Father's name" required value={form.father_name} onChange={(v) => update({ father_name: v })} error={errors.father_name} />
        <TextField id="grandfather_name" label="Grandfather's name" required value={form.grandfather_name} onChange={(v) => update({ grandfather_name: v })} error={errors.grandfather_name} />
        <OptionField id="gender" label="Gender" list="gender" required options={options} loading={optionsLoading} value={form.gender} onChange={(v) => update({ gender: v })} error={errors.gender} />
        <TextField id="date_of_birth" label="Date of birth" type="date" required value={form.date_of_birth} onChange={(v) => update({ date_of_birth: v })} error={errors.date_of_birth} hint={`${ec ? `Ethiopian calendar: ${ec}. ` : ""}Cannot be in the future.`} />
        <TextField id="phone" label="Phone" type="tel" inputMode="tel" required value={form.phone} onChange={(v) => update({ phone: v })} error={errors.phone} hint="Ethiopian mobile number, for example 0912345678 or +251912345678." placeholder="+251 9…" />
        <TextField id="national_id" label="National ID (Fayda)" inputMode="numeric" required value={form.national_id} onChange={(v) => update({ national_id: v })} error={errors.national_id} hint="12-digit FIN or 16-digit FAN" />
        <OptionField id="marital_status" label="Marital status" list="marital_status" options={options} loading={optionsLoading} value={form.marital_status} onChange={(v) => update({ marital_status: v })} error={errors.marital_status} />
        <OptionField id="education_level" label="Education level" list="education_level" options={options} loading={optionsLoading} value={form.education_level} onChange={(v) => update({ education_level: v })} error={errors.education_level} />
      </Grid>
      <MultiOptionField id="income_sources" label="Income sources" list="income_sources" options={options} loading={optionsLoading} values={form.income_sources} onChange={(v) => update({ income_sources: v })} error={errors.income_sources} />
    </>
  );
}
