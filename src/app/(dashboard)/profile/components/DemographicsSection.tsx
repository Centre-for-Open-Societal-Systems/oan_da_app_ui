"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { ProfilePhotoUpload } from "@/features/farmers";
import { AGENT_PROFILE } from "@/features/farmers";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { cn } from "@/lib/utils";

const [FIRST_NAME, ...REST] = AGENT_PROFILE.name.split(" ");

// Person avatar in place of a photo.
const AVATAR = <PersonAvatar label={`${AGENT_PROFILE.name} avatar`} />;

// Pre-filled with the signed-in agent's current profile until the profile API lands
const CURRENT_PROFILE = {
  firstName: FIRST_NAME,
  lastName: REST.join(" "),
  mobile: AGENT_PROFILE.phone,
  email: AGENT_PROFILE.email,
  dob: "1998-05-15",
  gender: "male",
  idType: "national_id",
  idNumber: "3512 4498 7712",
  language: "en",
  lastUpdated: "2026-07-12",
};

const GENDERS: Record<string, string> = { male: "Male", female: "Female", other: "Other" };
const ID_TYPES: Record<string, string> = { national_id: "National ID (Fayda)", kebele_id: "Kebele ID", passport: "Passport", driving_license: "Driving License" };
const LANGUAGES: Record<string, string> = { en: "English", am: "Amharic", om: "Afaan Oromo", ti: "Tigrinya" };

// Identity fields come from Fayda and change only through re-verification; the rest can be requested here.
const EDITABLE = [
  { key: "mobile", label: "Mobile Phone" },
  { key: "email", label: "Email ID" },
  { key: "language", label: "Language" },
] as const;

type EditableKey = (typeof EDITABLE)[number]["key"];

export const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// Identity fields are verified via Fayda and can't be edited here — shown greyed out.
export const LOCKED = "h-11 cursor-not-allowed border-zinc-200 bg-surface text-ink disabled:opacity-100";

export function LockedField({ label, value, required }: { label: string; value: string; required?: boolean }) {
  const id = `locked-${label.toLowerCase().replace(/\s+/g, "-")}`;
  return (
    <FormField label={label} htmlFor={id} required={required}>
      <Input id={id} value={value} readOnly disabled title="Verified via Fayda — changes need re-verification" className={LOCKED} />
    </FormField>
  );
}

// Read-only view: the same field boxes as the form, filled and greyed, per the profile mockup.
export const READ = "flex h-11 items-center gap-2 rounded-md border border-zinc-200 bg-surface px-3 text-[14px] text-ink";

const Chevron = () => (
  <svg className="ml-auto h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export function ReadOnlyField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-2">
      <dt className="text-[14px] font-medium text-ink">
        {label}
        {required && <span className="ml-0.5 text-danger">*</span>}
      </dt>
      <dd>{children}</dd>
    </div>
  );
}

interface DemographicsSectionProps {
  editing: boolean;
  /** Opens the edit form (read-only view only). */
  onEdit?: () => void;
  onCancel: () => void;
  /** Called with the labels of the fields that changed. */
  onSubmit: (changed: string[]) => void;
}

export function DemographicsSection({ editing, onEdit, onCancel, onSubmit }: DemographicsSectionProps) {
  const p = CURRENT_PROFILE;
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    const value = (k: EditableKey) => String(data.get(k) ?? "").trim();
    const changed = EDITABLE.filter(({ key }) => value(key) !== p[key]).map(({ label }) => label);
    const photoChanged = (data.get("photo") as File | null)?.size ? ["Profile photo"] : [];
    const all = [...changed, ...photoChanged];

    if (all.length === 0) return setError("Change at least one field before submitting.");
    if (!/^\+?251\s?9\d(\s?\d){7}$/.test(value("mobile"))) return setError("Use an Ethiopian mobile number, e.g. +251 91 234 5678.");
    if (value("email") && !/^\S+@\S+\.\S+$/.test(value("email"))) return setError("Enter a valid email address.");

    setError(null);
    onSubmit(all);
  };

  const header = (
    <div className="flex flex-col gap-3 border-b border-line px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Demographics &amp; personal details</h2>
        <p className="mt-1 text-[12.5px] text-ink-soft">
          {editing ? "Editing - changes are sent to your Woreda supervisor for approval" : "Your identity details"}
        </p>
      </div>
      {!editing && onEdit && (
        <Button type="button" variant="brand" size="md" className="w-fit" onClick={onEdit}>
          Edit profile
        </Button>
      )}
    </div>
  );

  if (editing) {
    return (
      <form className="flex animate-fade-in flex-col gap-6" onSubmit={submit} onChange={() => setError(null)}>
        <Card className="p-0 shadow-card">
          {header}
          <div className="flex flex-col gap-6 px-6 py-5">
            {error && <Banner tone="error">{error}</Banner>}

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[215px_1fr] lg:gap-10">
              <ProfilePhotoUpload name="photo" showActions={false} fallback={AVATAR} />

              <div className="grid grid-cols-1 content-start gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                <LockedField label="First Name" value={p.firstName} required />
                <LockedField label="Last Name" value={p.lastName} required />
                <FormField label="Mobile Phone" htmlFor="mobile">
                  <Input id="mobile" name="mobile" type="tel" defaultValue={p.mobile} className="h-11" />
                </FormField>

                <FormField label="Email ID" htmlFor="email">
                  <Input id="email" name="email" type="email" defaultValue={p.email} className="h-11" />
                </FormField>
                <LockedField label="Date of Birth" value={formatDate(p.dob)} required />
                <FormField label="Gender" htmlFor="locked-gender" required>
                  <Select id="locked-gender" value={p.gender} disabled title="Verified via Fayda — changes need re-verification" className={LOCKED}>
                    {Object.entries(GENDERS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </FormField>

                <LockedField label="ID Type" value={ID_TYPES[p.idType]} />
                <LockedField label="ID Number" value={p.idNumber} />
                <FormField label="Language" htmlFor="language">
                  <Select id="language" name="language" defaultValue={p.language} className="h-11">
                    {Object.entries(LANGUAGES).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </Select>
                </FormField>
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13px] text-muted">Last updated profile changes: {formatDate(p.lastUpdated).replace(/^0/, "")}</p>
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="outline" onClick={() => { setError(null); onCancel(); }}>Cancel</Button>
            <Button type="submit" variant="brand">Save Changes</Button>
          </div>
        </div>
      </form>
    );
  }

  const [dialCode, ...number] = p.mobile.split(" ");

  return (
    <Card className="p-0 shadow-card">
      {header}
      <div className="grid animate-fade-in grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-[215px_1fr] lg:gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-medium text-ink">Profile Photo</span>
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-center">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-zinc-200">
              {AVATAR}
            </div>
            <p className="text-[13px] text-muted">Change your photo from Edit profile. JPG or PNG up to 5MB.</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 content-start gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
          <ReadOnlyField label="First Name" required><div className={READ}>{p.firstName}</div></ReadOnlyField>
          <ReadOnlyField label="Last Name" required><div className={READ}>{p.lastName}</div></ReadOnlyField>
          <ReadOnlyField label="Mobile No." required>
            <div className="flex gap-3">
              <div className={cn(READ, "w-[84px] shrink-0")}>{dialCode}<Chevron /></div>
              <div className={cn(READ, "min-w-0 flex-1")}>{number.join(" ")}</div>
            </div>
          </ReadOnlyField>
          <ReadOnlyField label="Email ID" required><div className={cn(READ, "truncate")}>{p.email}</div></ReadOnlyField>
          <ReadOnlyField label="Date of Birth" required>
            <div className={READ}>
              <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" />
              </svg>
              {formatDate(p.dob)}
            </div>
          </ReadOnlyField>
          <ReadOnlyField label="Gender" required><div className={READ}>{GENDERS[p.gender]}<Chevron /></div></ReadOnlyField>
          <ReadOnlyField label="ID Type"><div className={READ}>{ID_TYPES[p.idType]}</div></ReadOnlyField>
          <ReadOnlyField label="ID Number"><div className={READ}>{p.idNumber}</div></ReadOnlyField>
          <ReadOnlyField label="Language"><div className={READ}>{LANGUAGES[p.language]}<Chevron /></div></ReadOnlyField>
        </dl>
      </div>
    </Card>
  );
}
