"use client";

import { EMPTY_MEMBER, type MemberRow } from "../registration";
import type { StepProps } from "./FarmerStep";
import { Grid, OptionField, RowList, TextField } from "./fields";

export function HouseholdStep({ form, update, errors, options, optionsLoading }: StepProps) {
  const setMember = (i: number, patch: Partial<MemberRow>) => update({ members: form.members.map((m, j) => (j === i ? { ...m, ...patch } : m)) });
  return (
    <>
      <Grid>
        <TextField id="household_size" label="Household size" type="number" inputMode="numeric" value={form.household_size} onChange={(v) => update({ household_size: v })} error={errors.household_size} hint="Everyone in the household, the farmer included. It must equal 1 plus the members listed below; leave it empty if you list none." />
      </Grid>
      <RowList
        title="Member"
        rows={form.members}
        addLabel="Add member"
        onAdd={() => update({ members: [...form.members, { ...EMPTY_MEMBER }] })}
        onRemove={(i) => update({ members: form.members.filter((_, j) => j !== i) })}
        render={(m, i) => (
          <Grid>
            <TextField id={`members.${i}.first_name`} label="First name" required value={m.first_name} onChange={(v) => setMember(i, { first_name: v })} error={errors[`members.${i}.first_name`]} />
            <TextField id={`members.${i}.grandfather_name`} label="Grandfather's name" required value={m.grandfather_name} onChange={(v) => setMember(i, { grandfather_name: v })} error={errors[`members.${i}.grandfather_name`]} />
            <OptionField id={`members.${i}.gender`} label="Gender" list="gender" required options={options} loading={optionsLoading} value={m.gender} onChange={(v) => setMember(i, { gender: v })} error={errors[`members.${i}.gender`]} />
            <TextField id={`members.${i}.date_of_birth`} label="Date of birth" type="date" required value={m.date_of_birth} onChange={(v) => setMember(i, { date_of_birth: v })} error={errors[`members.${i}.date_of_birth`]} hint="Cannot be in the future." />
            <OptionField id={`members.${i}.relationship`} label="Relationship" list="relationship" required options={options} loading={optionsLoading} value={m.relationship} onChange={(v) => setMember(i, { relationship: v })} error={errors[`members.${i}.relationship`]} />
          </Grid>
        )}
      />
    </>
  );
}
