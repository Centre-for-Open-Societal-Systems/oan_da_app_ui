"use client";

import { useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { ADVISOR_REGIONS, EXPERTISE_AREAS, nextAdvisorId, useAdvisorsStore, type Advisor, type AdvisorStatus, type ExpertiseArea } from "@/features/communication";

const STATUSES: AdvisorStatus[] = ["Active", "On leave", "Inactive"];

interface Form {
  name: string;
  expertise: ExpertiseArea;
  unit: string;
  region: string;
  woreda: string;
  phone: string;
  email: string;
  status: AdvisorStatus;
  availability: string;
}

const EMPTY: Form = { name: "", expertise: EXPERTISE_AREAS[0], unit: "", region: ADVISOR_REGIONS[0], woreda: "", phone: "", email: "", status: "Active", availability: "" };

type ErrorKey = "name" | "unit" | "woreda" | "phone" | "email";
type Errors = Partial<Record<ErrorKey, string>>;

// Compact field: 13px semibold label, h-9 control (matches the Add user design).
const FIELD = "gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold";
const CONTROL = "h-9 border-zinc-200 text-[13.5px]";

/** A rule as the field's visible note; red on a failed save, or once what is typed breaks it. */
const note = (rule: string, error?: string, broken = false) => ({ hint: error ?? rule, hintTone: error || broken ? ("error" as const) : ("muted" as const) });
const tooShort = (value: string, min: number) => value.trim().length > 0 && value.trim().length < min;
const breaks = (value: string, rule: RegExp) => value.trim().length > 0 && !rule.test(value.trim());

/** "12 Oct 2026, 15:20" — same shape as the seeded `updatedAt`. */
const nowStamp = () => {
  const d = new Date();
  const date = d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return `${date}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
};

function Section({ title, children, first }: { title: string; children: ReactNode; first?: boolean }) {
  return (
    <section className={cn("px-4 py-5 sm:px-6", !first && "border-t border-line")}>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

// Admin adds an MoA subject-matter expert to the directory DAs reference.
export function AddAdvisorModal({ onClose, onAdded }: { onClose: () => void; onAdded: (advisor: Advisor) => void }) {
  const rows = useAdvisorsStore((s) => s.rows);
  const add = useAdvisorsStore((s) => s.add);
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = () => {
    const next: Errors = {};
    if (form.name.trim().length < 3) next.name = "Enter the advisor's full name";
    if (!form.unit.trim()) next.unit = "Enter the MoA unit or directorate";
    if (!form.woreda.trim()) next.woreda = "Enter the woreda";
    if (!/^\+?251\s?9\d(\s?\d){7}$/.test(form.phone.trim())) next.phone = "Use an Ethiopian mobile number, e.g. +251 91 234 5678";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    const advisor: Advisor = {
      id: nextAdvisorId(rows),
      name: form.name.trim(),
      expertise: form.expertise,
      unit: form.unit.trim(),
      region: form.region,
      woreda: form.woreda.trim(),
      phone: form.phone.trim(),
      email: form.email.trim(),
      status: form.status,
      updatedAt: nowStamp(),
      availability: form.availability.trim() || (form.status === "Active" ? "Mon–Fri, 08:30–17:00" : "Not taking requests"),
    };
    add(advisor);
    onAdded(advisor);
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Add Advisor"
      subtitle="Add an MoA subject-matter expert to the directory DAs reference"
      className="max-w-[544px]"
      bodyClassName="p-0"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={submit} className="px-6">Save</Button>
        </>
      }
    >
      <Section title="Advisor details" first>
        <FormField label="Full name" htmlFor="adv-name" required {...note("At least 3 characters.", errors.name, tooShort(form.name, 3))} className={cn(FIELD, "sm:col-span-2")}>
          <Input id="adv-name" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Dr. Hanna Girma" className={CONTROL} />
        </FormField>
        <FormField label="Expertise area" htmlFor="adv-expertise" required className={FIELD}>
          <Select id="adv-expertise" value={form.expertise} onChange={(e) => set("expertise", e.target.value as ExpertiseArea)} className={CONTROL}>
            {EXPERTISE_AREAS.map((x) => <option key={x} value={x}>{x}</option>)}
          </Select>
        </FormField>
        <FormField label="Status" htmlFor="adv-status" required className={FIELD}>
          <Select id="adv-status" value={form.status} onChange={(e) => set("status", e.target.value as AdvisorStatus)} className={CONTROL}>
            {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
        <FormField label="MoA unit / directorate" htmlFor="adv-unit" required hint={errors.unit} hintTone="error" className={cn(FIELD, "sm:col-span-2")}>
          <Input id="adv-unit" value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="e.g. Plant Protection Directorate" className={CONTROL} />
        </FormField>
      </Section>

      <Section title="Location">
        <FormField label="Region" htmlFor="adv-region" required className={FIELD}>
          <Select id="adv-region" value={form.region} onChange={(e) => set("region", e.target.value)} className={CONTROL}>
            {ADVISOR_REGIONS.map((r) => <option key={r} value={r}>{r}</option>)}
          </Select>
        </FormField>
        <FormField label="Woreda" htmlFor="adv-woreda" required hint={errors.woreda} hintTone="error" className={FIELD}>
          <Input id="adv-woreda" value={form.woreda} onChange={(e) => set("woreda", e.target.value)} placeholder="e.g. Bako Tibe" className={CONTROL} />
        </FormField>
      </Section>

      <Section title="Contact">
        <FormField label="Mobile number" htmlFor="adv-phone" required {...note("Ethiopian mobile number, e.g. +251 91 234 5678.", errors.phone, breaks(form.phone, /^\+?251\s?9\d(\s?\d){7}$/))} className={FIELD}>
          <Input id="adv-phone" type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="+251 91 234 5678" className={CONTROL} />
        </FormField>
        <FormField label="Email" htmlFor="adv-email" required {...note("A valid email address.", errors.email, breaks(form.email, /^\S+@\S+\.\S+$/))} className={FIELD}>
          <Input id="adv-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="name@moa.gov.et" className={CONTROL} />
        </FormField>
        <FormField label="Availability" htmlFor="adv-availability" className={cn(FIELD, "sm:col-span-2")}>
          <Input id="adv-availability" value={form.availability} onChange={(e) => set("availability", e.target.value)} placeholder="e.g. Mon–Fri, 08:30–17:00" className={CONTROL} />
        </FormField>
      </Section>
    </Modal>
  );
}
