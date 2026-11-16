"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { listAreas, type AdminArea } from "@/features/assignments";
import { EXPERTISE_AREAS, createAdvisor, describeAdvisorError, type Advisor, type AdvisorStatus, type ExpertiseArea } from "@/features/communication";

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

const EMPTY: Form = { name: "", expertise: EXPERTISE_AREAS[0], unit: "", region: "", woreda: "", phone: "", email: "", status: "Active", availability: "" };

type ErrorKey = "name" | "unit" | "region" | "woreda" | "phone" | "email";
type Errors = Partial<Record<ErrorKey, string>>;

// Compact field: 13px semibold label, h-9 control (matches the Add user design).
const FIELD = "gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold";
const CONTROL = "h-9 border-zinc-200 text-[13.5px]";

/** A rule as the field's visible note; red on a failed save, or once what is typed breaks it. */
const note = (rule: string, error?: string, broken = false) => ({ hint: error ?? rule, hintTone: error || broken ? ("error" as const) : ("muted" as const) });
const tooShort = (value: string, min: number) => value.trim().length > 0 && value.trim().length < min;
const breaks = (value: string, rule: RegExp) => value.trim().length > 0 && !rule.test(value.trim());

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
  const [form, setForm] = useState<Form>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  // Region and Woreda come from the administrative master data (GET /master/areas). A Woreda sits under a
  // Zone, and the Zone under a Region, so the Zones are read too. The form keeps the area codes; the names
  // are what is saved, as the directory shows them.
  const [areas, setAreas] = useState<{ regions: AdminArea[]; zones: AdminArea[]; woredas: AdminArea[] } | null>(null);
  const [areasError, setAreasError] = useState(false);
  useEffect(() => {
    let current = true;
    Promise.all([listAreas({ level: "Region" }), listAreas({ level: "Zone" }), listAreas({ level: "Woreda" })])
      .then(([regions, zones, woredas]) => current && setAreas({ regions, zones, woredas }))
      .catch(() => current && setAreasError(true));
    return () => {
      current = false;
    };
  }, []);
  const regionZones = new Set((areas?.zones ?? []).filter((z) => z.parent_area === form.region).map((z) => z.code));
  const regionWoredas = (areas?.woredas ?? []).filter((w) => w.parent_area != null && regionZones.has(w.parent_area));
  const areaName = (list: AdminArea[] | undefined, code: string) => list?.find((a) => a.code === code)?.name_en ?? code;

  const set = <K extends keyof Form>(key: K, value: Form[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => ({ ...e, [key]: undefined }));
  };

  const submit = async () => {
    const next: Errors = {};
    if (form.name.trim().length < 3) next.name = "Enter the advisor's full name";
    if (!form.unit.trim()) next.unit = "Enter the MoA unit or directorate";
    if (!form.region) next.region = "Select the region";
    if (!form.woreda) next.woreda = "Select the woreda";
    if (!/^\+?251\s?9\d(\s?\d){7}$/.test(form.phone.trim())) next.phone = "Use an Ethiopian mobile number, e.g. +251 91 234 5678";
    if (!/^\S+@\S+\.\S+$/.test(form.email.trim())) next.email = "Enter a valid email";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      // A blank availability is filled in by the server from the status.
      const advisor = await createAdvisor({
        name: form.name.trim(),
        expertise: form.expertise,
        unit: form.unit.trim(),
        region: areaName(areas?.regions, form.region),
        woreda: areaName(areas?.woredas, form.woreda),
        phone: form.phone.trim(),
        email: form.email.trim(),
        status: form.status,
        availability: form.availability.trim(),
      });
      onAdded(advisor);
    } catch (err) {
      setSaveError(describeAdvisorError(err));
      setSaving(false);
    }
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
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="brand" onClick={submit} disabled={saving} className="px-6">{saving ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      {saveError && <div className="px-4 pt-4 sm:px-6"><Banner tone="error" onDismiss={() => setSaveError(null)}>{saveError}</Banner></div>}
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
        <FormField label="Region" htmlFor="adv-region" required hint={errors.region ?? (areasError ? "Couldn't load regions. Close the form and try again." : undefined)} hintTone="error" className={FIELD}>
          <Select
            id="adv-region"
            value={form.region}
            disabled={!areas}
            onChange={(e) => {
              setForm((f) => ({ ...f, region: e.target.value, woreda: "" }));
              setErrors((er) => ({ ...er, region: undefined, woreda: undefined }));
            }}
            className={CONTROL}
          >
            <option value="">{areas ? "Select Region…" : areasError ? "Not available" : "Loading…"}</option>
            {areas?.regions.map((r) => <option key={r.code} value={r.code}>{r.name_en}</option>)}
          </Select>
        </FormField>
        <FormField label="Woreda" htmlFor="adv-woreda" required hint={errors.woreda ?? (form.region && regionWoredas.length === 0 ? "No Woreda in this Region yet." : undefined)} hintTone={errors.woreda ? "error" : "muted"} className={FIELD}>
          <Select id="adv-woreda" value={form.woreda} disabled={!form.region} onChange={(e) => set("woreda", e.target.value)} className={CONTROL}>
            <option value="">{form.region ? "Select Woreda…" : "Select a Region first"}</option>
            {regionWoredas.map((w) => <option key={w.code} value={w.code}>{w.name_en}</option>)}
          </Select>
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
