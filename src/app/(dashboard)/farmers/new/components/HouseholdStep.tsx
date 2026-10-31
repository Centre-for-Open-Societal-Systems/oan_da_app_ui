"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { useFieldOptions, type FieldOption } from "@/features/farmers";
import { memberCount, memberKey, MEMBER_FIELDS, REGISTRY_TABS } from "../registrySpec";
import { RegistryStep, Section } from "./RegistryStep";

const householdTab = REGISTRY_TABS.find((tab) => tab.key === "household")!;

type Member = Record<(typeof MEMBER_FIELDS)[number]["field"], string>;

const emptyMember = (): Member => Object.fromEntries(MEMBER_FIELDS.map(({ field }) => [field, ""])) as Member;

const membersFrom = (initial: Record<string, string>): Member[] =>
  Array.from({ length: memberCount(initial) }, (_, i) => Object.fromEntries(MEMBER_FIELDS.map(({ field }) => [field, initial[memberKey(i, field)] ?? ""])) as Member);

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-line bg-surface px-4 py-3">
      <div className="text-[12.5px] text-ink-soft">{label}</div>
      <div className="mt-1 text-[18px] font-bold text-ink">{value}</div>
    </div>
  );
}

/**
 * Household composition plus its members. The farmer is the head and is not listed again; family size and the
 * male / female counts follow from the members. Rows are stored as member_<i>_<field> with `members_count`.
 */
export function HouseholdStep({ initial = {} }: { initial?: Record<string, string> }) {
  const { options } = useFieldOptions();
  const [members, setMembers] = useState<Member[]>(() => membersFrom(initial));

  const genders: FieldOption[] = options.HouseholdMember?.gender ?? options.Farmer?.gender ?? [];
  // The farmer is the head, so a member cannot be "SELF".
  const relationships: FieldOption[] = (options.HouseholdMember?.relationship_to_the_head ?? []).filter((o) => o.value !== "SELF");
  const choices: Partial<Record<keyof Member, FieldOption[]>> = { gender: genders, relationship: relationships };

  const update = (index: number, field: keyof Member, value: string) => setMembers((list) => list.map((m, i) => (i === index ? { ...m, [field]: value } : m)));
  const remove = (index: number) => setMembers((list) => list.filter((_, i) => i !== index));

  // The head's own gender is on the Farmer step; count it in.
  const headGender = initial.gender ?? "";
  const count = (code: string) => members.filter((m) => m.gender === code).length + (headGender === code ? 1 : 0);

  const membersSection = (
    <Section title="Household Members" description="Everyone else who lives in the farmer's household. Each member needs a name, gender, date of birth and relationship.">
      <input type="hidden" name="members_count" value={String(members.length)} readOnly />
      <div className="mb-5 grid grid-cols-3 gap-3 sm:max-w-md">
        <Stat label="Family size" value={1 + members.length} />
        <Stat label="Male" value={count("MALE")} />
        <Stat label="Female" value={count("FEMALE")} />
      </div>

      <div className="flex flex-col gap-4">
        {members.map((member, i) => (
          <div key={i} className="rounded-lg border border-line p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-[14px] font-semibold text-ink">Member {i + 1}</span>
              <button type="button" onClick={() => remove(i)} className="text-[13px] font-medium text-red-700 hover:underline">
                Remove
              </button>
            </div>
            <div className="grid grid-cols-1 gap-x-6 gap-y-4 md:grid-cols-2 xl:grid-cols-3">
              {MEMBER_FIELDS.map(({ field, label, required }) => {
                const id = memberKey(i, field);
                const list = choices[field];
                return (
                  <FormField key={field} label={label} htmlFor={id} required={required}>
                    {list ? (
                      <Select id={id} name={id} value={member[field]} onChange={(e) => update(i, field, e.target.value)}>
                        <option value="" disabled>{list.length ? `Select ${label}` : "Loading options…"}</option>
                        {member[field] && !list.some((o) => o.value === member[field]) && <option value={member[field]}>{member[field]}</option>}
                        {list.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </Select>
                    ) : (
                      <Input id={id} name={id} type={field === "birth_date" ? "date" : "text"} value={member[field]} onChange={(e) => update(i, field, e.target.value)} placeholder={`Enter ${label}`} />
                    )}
                  </FormField>
                );
              })}
            </div>
          </div>
        ))}
        <div>
          <Button variant="brandOutline" size="md" onClick={() => setMembers((list) => [...list, emptyMember()])} className="gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add member
          </Button>
        </div>
      </div>
    </Section>
  );

  return <RegistryStep tab={householdTab} initial={initial} trailing={membersSection} />;
}
