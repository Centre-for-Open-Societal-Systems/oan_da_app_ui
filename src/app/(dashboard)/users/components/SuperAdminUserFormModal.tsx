"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dropdown } from "@/components/ui/Dropdown";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import {
  DEFAULT_ROLE_NAMES,
  DEPARTMENTS,
  DEPARTMENT_TYPES,
  GENDERS,
  GEOGRAPHY,
  KEBELES,
  REGISTRIES,
  REGISTRY_ENTITIES,
  SERVICES,
  type DepartmentType,
  type RoleName,
  type SuperAdminUser,
} from "@/features/superadmin";

export type UserFormValues = Omit<SuperAdminUser, "id">;

interface SuperAdminUserFormModalProps {
  mode: "add" | "edit";
  initial?: SuperAdminUser;
  /** Next free code, shown (read-only) on a new user. */
  suggestedCode: string;
  onClose: () => void;
  onSave: (values: UserFormValues) => void;
}

type Field = "name" | "dob" | "gender" | "email" | "mobile" | "department" | "departmentType" | "role" | "region" | "zone" | "woreda" | "kebele" | "service" | "registry" | "entities";
type Errors = Partial<Record<Field, string>>;

const TITLES = { add: "Add User", edit: "Edit User" };
const SUBTITLES = {
  add: "Add a user and define its Personal details, role and department.",
  edit: "Update the user's personal details, role, department and coverage.",
};

const FIELD = "[&>label]:text-[14px] [&>label]:font-medium";
const REQUIRED = "This field is required";

function Section({ title, first, children }: { title: string; first?: boolean; children: ReactNode }) {
  return (
    <section className={first ? undefined : "mt-6"}>
      <h3 className="mb-4 text-[16px] font-semibold text-ink">{title}</h3>
      <div className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2 lg:grid-cols-4">{children}</div>
    </section>
  );
}

function CheckGroup({ idPrefix, options, selected, onToggle, className }: { idPrefix: string; options: string[]; selected: string[]; onToggle: (value: string) => void; className?: string }) {
  return (
    <div role="group" className={cn("grid grid-cols-1 gap-x-4 gap-y-2.5", className)}>
      {options.map((option, i) => (
        <label key={option} htmlFor={`${idPrefix}-${i}`} className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
          <Checkbox id={`${idPrefix}-${i}`} checked={selected.includes(option)} onChange={() => onToggle(option)} />
          {option}
        </label>
      ))}
    </div>
  );
}

const toggleIn = (list: string[], value: string) => (list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);

// One form for Add and Edit, so both always show the same fields. The code is generated, never typed.
export function SuperAdminUserFormModal({ mode, initial, suggestedCode, onClose, onSave }: SuperAdminUserFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [dob, setDob] = useState(initial?.dob ?? "");
  const [dobFocused, setDobFocused] = useState(false);
  const [gender, setGender] = useState<string>(initial?.gender ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [mobile, setMobile] = useState(initial?.mobile ?? "");
  const [department, setDepartment] = useState(initial?.department ?? "");
  const [departmentType, setDepartmentType] = useState<string>(initial?.departmentType ?? "");
  const [role, setRole] = useState<string>(initial?.role ?? "");
  const [region, setRegion] = useState(initial?.region ?? "");
  const [zone, setZone] = useState(initial?.zone ?? "");
  const [woreda, setWoreda] = useState(initial?.woreda ?? "");
  const [kebele, setKebele] = useState(initial?.kebele ?? "");
  const [service, setService] = useState<string[]>(initial?.service ?? []);
  const [registry, setRegistry] = useState<string[]>(initial?.registry ?? []);
  const [entities, setEntities] = useState<string[]>(initial?.entities ?? []);
  const [errors, setErrors] = useState<Errors>({});

  const clear = (key: Field) => setErrors((e) => ({ ...e, [key]: undefined }));
  // The field's rule stays visible as its note; a failed Submit replaces it with the error.
  const err = (key: Field, rule?: string, broken = false) => ({ hint: errors[key] ?? rule, hintTone: errors[key] || broken ? ("error" as const) : ("muted" as const) });
  const today = new Date().toISOString().slice(0, 10);

  const zones = region ? Object.keys(GEOGRAPHY[region] ?? {}) : [];
  const woredas = region && zone ? (GEOGRAPHY[region]?.[zone] ?? []) : [];

  // Picking a department fills in its type (still changeable); a wider coverage choice resets the narrower ones.
  const pickDepartment = (value: string) => {
    setDepartment(value);
    const found = DEPARTMENTS.find((d) => d.name === value);
    if (found) setDepartmentType(found.type);
    setErrors((e) => ({ ...e, department: undefined, departmentType: undefined }));
  };
  const pickRegion = (value: string) => { setRegion(value); setZone(""); setWoreda(""); setKebele(""); clear("region"); };
  const pickZone = (value: string) => { setZone(value); setWoreda(""); setKebele(""); clear("zone"); };
  const pickWoreda = (value: string) => { setWoreda(value); setKebele(""); clear("woreda"); };

  const toggleService = (value: string) => { setService((s) => toggleIn(s, value)); clear("service"); };
  // Ticking a registry adds its Entities field; unticking it drops the field and whatever was picked in it.
  const toggleRegistry = (value: string) => {
    if (registry.includes(value)) {
      const entitiesOf = REGISTRY_ENTITIES[value] ?? [];
      setRegistry((r) => r.filter((v) => v !== value));
      setEntities((e) => e.filter((v) => !entitiesOf.includes(v)));
    } else {
      setRegistry((r) => [...r, value]);
    }
    clear("registry");
    clear("entities");
  };
  const setEntitiesFor = (registryName: string, picked: string[]) => {
    const entitiesOf = REGISTRY_ENTITIES[registryName] ?? [];
    setEntities((e) => [...e.filter((v) => !entitiesOf.includes(v)), ...picked]);
    clear("entities");
  };

  const submit = () => {
    const next: Errors = {};
    if (name.trim().length < 3) next.name = "Enter the user's full name";
    if (!dob) next.dob = REQUIRED;
    if (!gender) next.gender = REQUIRED;
    if (!email.trim()) next.email = REQUIRED;
    else if (!/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email id";
    if (!mobile.trim()) next.mobile = REQUIRED;
    else if (!/^\+?[0-9\s]{9,15}$/.test(mobile.trim())) next.mobile = "Enter a valid mobile number";
    if (!department) next.department = REQUIRED;
    if (!departmentType) next.departmentType = REQUIRED;
    if (!role) next.role = REQUIRED;
    if (!region) next.region = REQUIRED;
    if (!zone) next.zone = REQUIRED;
    if (!woreda) next.woreda = REQUIRED;
    if (!kebele) next.kebele = REQUIRED;
    if (service.length === 0) next.service = "Select at least one service";
    if (registry.length === 0) next.registry = "Select at least one registry or catalogue";
    else if (registry.some((r) => !(REGISTRY_ENTITIES[r] ?? []).some((e) => entities.includes(e)))) next.entities = "Select at least one entity under each registry";
    setErrors(next);
    if (Object.keys(next).length > 0) return;
    onSave({
      name: name.trim(),
      code: initial?.code ?? suggestedCode,
      role: role as RoleName,
      region,
      zone,
      woreda,
      kebele,
      active: initial?.active ?? true,
      dob,
      gender: gender as UserFormValues["gender"],
      email: email.trim(),
      mobile: mobile.trim(),
      department,
      departmentType: departmentType as DepartmentType,
      service,
      registry,
      entities,
    });
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={TITLES[mode]}
      subtitle={SUBTITLES[mode]}
      size="xl"
      className="max-w-[1100px]"
      bodyClassName="px-4 py-5 sm:px-6"
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="px-6">Cancel</Button>
          <Button variant="brand" onClick={submit} className="px-6">Submit</Button>
        </>
      }
    >
      <Section title="Personal details" first>
        <FormField label="User Name" htmlFor="su-name" required {...err("name", "At least 3 characters.", name.trim().length > 0 && name.trim().length < 3)} className={FIELD}>
          <Input id="su-name" value={name} onChange={(e) => { setName(e.target.value); clear("name"); }} placeholder="Enter user name" />
        </FormField>
        <FormField label="User Code" htmlFor="su-code" className={FIELD}>
          <Input id="su-code" value={initial?.code ?? suggestedCode} disabled readOnly />
        </FormField>
        <FormField label="Date of Birth" htmlFor="su-dob" required {...err("dob", "Cannot be in the future.", dob > today)} className={FIELD}>
          {/* Shows the placeholder like the other fields, and turns into the native date picker when clicked. */}
          <Input
            id="su-dob"
            type={dobFocused || dob ? "date" : "text"}
            value={dob}
            max={today}
            placeholder="Select date of birth"
            onFocus={() => setDobFocused(true)}
            onBlur={() => setDobFocused(false)}
            onChange={(e) => { setDob(e.target.value); clear("dob"); }}
            endAdornment={
              <svg className="h-4 w-4 text-ink" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" />
              </svg>
            }
          />
        </FormField>
        <FormField label="Gender" htmlFor="su-gender" required {...err("gender")} className={FIELD}>
          <Dropdown id="su-gender" value={gender} placeholder="Select gender" options={[...GENDERS]} onChange={(v) => { setGender(v); clear("gender"); }} />
        </FormField>
        <FormField label="Email Id" htmlFor="su-email" required {...err("email", "A valid email address.", email.trim().length > 0 && !/^\S+@\S+\.\S+$/.test(email.trim()))} className={FIELD}>
          <Input id="su-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); clear("email"); }} placeholder="Enter email id" />
        </FormField>
        <FormField label="Mobile Number" htmlFor="su-mobile" required {...err("mobile", "9 to 15 digits; may start with +.", mobile.trim().length > 0 && !/^\+?[0-9\s]{9,15}$/.test(mobile.trim()))} className={FIELD}>
          <Input id="su-mobile" type="tel" value={mobile} onChange={(e) => { setMobile(e.target.value); clear("mobile"); }} placeholder="Enter mobile number" />
        </FormField>
      </Section>

      <Section title="Role and department">
        <FormField label="Department" htmlFor="su-department" required {...err("department")} className={FIELD}>
          <Dropdown id="su-department" value={department} placeholder="Select department" options={DEPARTMENTS.map((d) => d.name)} searchable onChange={pickDepartment} />
        </FormField>
        <FormField label="Department Type" htmlFor="su-dept-type" required {...err("departmentType")} className={FIELD}>
          <Dropdown id="su-dept-type" value={departmentType} placeholder="Select department type" options={[...DEPARTMENT_TYPES]} onChange={(v) => { setDepartmentType(v); clear("departmentType"); }} />
        </FormField>
        <FormField label="Organizational Role" htmlFor="su-role" required {...err("role")} className={FIELD}>
          <Dropdown id="su-role" value={role} placeholder="Select organizational role" options={[...DEFAULT_ROLE_NAMES]} onChange={(v) => { setRole(v); clear("role"); }} />
        </FormField>
      </Section>

      <Section title="Coverage details">
        <FormField label="Region" htmlFor="su-region" required {...err("region")} className={FIELD}>
          <Dropdown id="su-region" value={region} placeholder="Select region" options={Object.keys(GEOGRAPHY)} onChange={pickRegion} />
        </FormField>
        <FormField label="Zone" htmlFor="su-zone" required {...err("zone")} className={FIELD}>
          <Dropdown id="su-zone" value={zone} placeholder="Select zone" options={zones} disabled={!region} onChange={pickZone} />
        </FormField>
        <FormField label="Woreda" htmlFor="su-woreda" required {...err("woreda")} className={FIELD}>
          <Dropdown id="su-woreda" value={woreda} placeholder="Select woreda" options={woredas} disabled={!zone} onChange={pickWoreda} />
        </FormField>
        <FormField label="Kebele" htmlFor="su-kebele" required {...err("kebele")} className={FIELD}>
          <Dropdown id="su-kebele" value={kebele} placeholder="Select kebele" options={KEBELES} disabled={!woreda} onChange={(v) => { setKebele(v); clear("kebele"); }} />
        </FormField>
      </Section>

      <Section title="Services and registries">
        {/* Service takes the full row, Registry and Catalogue the one below. */}
        <FormField label="Service" htmlFor="su-service-0" required {...err("service", "Select at least one service.")} className={cn(FIELD, "sm:col-span-2 lg:col-span-4")}>
          <CheckGroup idPrefix="su-service" options={SERVICES} selected={service} onToggle={toggleService} className="sm:grid-cols-2 lg:grid-cols-4" />
        </FormField>
        {/* Each registry is a row: its checkbox on the left; once ticked, its Entities multi-select appears on the right. */}
        <FormField label="Registry and Catalogue" htmlFor="su-registry-0" required hint={errors.registry ?? errors.entities ?? "Select at least one, with at least one entity under each."} hintTone={errors.registry || errors.entities ? "error" : "muted"} className={cn(FIELD, "sm:col-span-2 lg:col-span-4")}>
          <div role="group" className="flex flex-col gap-2">
            {REGISTRIES.map((r, i) => {
              const checked = registry.includes(r);
              const options = REGISTRY_ENTITIES[r] ?? [];
              return (
                <div key={r} className="grid min-h-9 grid-cols-1 items-center gap-x-6 gap-y-1.5 sm:grid-cols-[190px_minmax(0,260px)]">
                  <label htmlFor={`su-registry-${i}`} className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
                    <Checkbox id={`su-registry-${i}`} checked={checked} onChange={() => toggleRegistry(r)} />
                    {r}
                  </label>
                  {checked && (
                    <MultiSelectDropdown
                      id={`su-entity-${r}`}
                      placeholder="Select entities"
                      options={options}
                      selected={entities.filter((e) => options.includes(e))}
                      onChange={(picked) => setEntitiesFor(r, picked)}
                      className="h-9"
                    />
                  )}
                </div>
              );
            })}
          </div>
        </FormField>
      </Section>
    </Modal>
  );
}
