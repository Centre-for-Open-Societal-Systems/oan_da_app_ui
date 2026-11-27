"use client";

import { useState, type FormEvent, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { ProfilePhotoUpload, getInitials } from "@/features/farmers";
import { AGENT_PROFILE } from "@/features/farmers";
import { cn } from "@/lib/utils";

const [FIRST_NAME, ...REST] = AGENT_PROFILE.name.split(" ");

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
    <FormField
      label={
        <span className="min-h-[38px] flex items-end pb-1 text-[13px] font-medium text-ink leading-tight">
          <span>{label}</span>
          {required && <span className="ml-1 text-danger font-bold">*</span>}
        </span>
      }
      htmlFor={id}
    >
      <div className="relative">
        <Input id={id} value={value} readOnly disabled title="Verified via Fayda — changes need re-verification" className={cn(LOCKED, "pr-8 text-slate-600 bg-slate-50 border-slate-200/90 cursor-not-allowed")} />
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2.5 text-slate-400">
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
      </div>
    </FormField>
  );
}

// Read-only view: polished metadata tile styling with clean borders and comfortable height.
export const READ = "flex min-h-10.5 items-center justify-between gap-2 rounded-xl border border-line-soft bg-surface/50 px-3.5 py-2 text-[13.5px] font-semibold text-ink transition-colors hover:bg-surface";

const Chevron = () => (
  <svg className="ml-auto h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M6 9l6 6 6-6" />
  </svg>
);

export function ReadOnlyField({ label, required, children }: { label: string; required?: boolean; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <dt className="min-h-[34px] flex items-end pb-0.5 text-[11.5px] font-semibold uppercase tracking-wider text-muted">
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
  const initials = getInitials(AGENT_PROFILE.name) || "DA";

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

  const [dialCode, ...number] = p.mobile.split(" ");

  return (
    <>
      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 border-b border-line bg-surface/40 px-5 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Demographics &amp; personal details</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              Your identity details
            </p>
          </div>
          {onEdit && (
            <Button
              type="button"
              variant="brand"
              size="md"
              className="w-fit gap-1.5 shadow-xs"
              onClick={onEdit}
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              <span>Edit profile</span>
            </Button>
          )}
        </div>

        <div className="grid animate-fade-in grid-cols-1 gap-6 p-5 sm:p-6 lg:grid-cols-[220px_1fr] lg:gap-8">
          <div className="flex flex-col gap-2.5">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">Profile Photo</span>
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface/40 p-5 text-center transition-colors hover:bg-surface">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-green to-emerald-700 text-[24px] font-bold text-white shadow-xs">
                {initials}
              </div>
              <p className="text-[12px] text-muted leading-relaxed">Change your photo from Edit profile. JPG or PNG up to 5MB.</p>
            </div>
          </div>

          <dl className="grid grid-cols-1 content-start gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            <ReadOnlyField label="First Name" required><div className={READ}>{p.firstName}</div></ReadOnlyField>
            <ReadOnlyField label="Last Name" required><div className={READ}>{p.lastName}</div></ReadOnlyField>
            <ReadOnlyField label="Mobile No." required>
              <div className="flex gap-2">
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

      {/* Edit Profile Modal */}
      <Modal
        isOpen={editing}
        onClose={() => {
          setError(null);
          onCancel();
        }}
        title="Edit Demographics & Personal Details"
        subtitle="Changes are sent to your Woreda supervisor for approval"
        icon={
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-tint border border-brand-border text-brand-green shadow-xs">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          </div>
        }
        size="xl"
        className="max-w-4xl lg:max-w-5xl"
        bodyClassName="p-4 sm:p-6"
        footer={
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between w-full">
            <p className="text-[12.5px] text-muted">
              Last updated profile changes: {formatDate(p.lastUpdated).replace(/^0/, "")}
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setError(null);
                  onCancel();
                }}
              >
                Cancel
              </Button>
              <Button type="submit" form="sample-edit-profile-form" variant="brand">
                Save Changes
              </Button>
            </div>
          </div>
        }
      >
        <form
          id="sample-edit-profile-form"
          className="flex flex-col gap-5 sm:gap-6"
          onSubmit={submit}
          onChange={() => setError(null)}
        >
          {error && <Banner tone="error">{error}</Banner>}

          <div className="flex items-start gap-2.5 rounded-xl border border-brand-border/60 bg-brand-tint/30 p-3 sm:p-3.5 text-[12.5px] text-brand-green leading-relaxed">
            <svg className="h-4 w-4 shrink-0 mt-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="16" x2="12" y2="12" />
              <line x1="12" y1="8" x2="12.01" y2="8" />
            </svg>
            <span>
              You can update your contact information and language. Identity details are verified via Fayda and require re-verification to modify.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr] lg:gap-8">
            <div className="flex flex-col gap-2">
              <ProfilePhotoUpload
                name="photo"
                showActions={true}
                allowRemove={true}
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-green to-emerald-700 text-[24px] font-bold text-white">
                    {initials}
                  </div>
                }
              />
            </div>

            <div className="grid grid-cols-1 content-start gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              <LockedField label="First Name" value={p.firstName} required />
              <LockedField label="Last Name" value={p.lastName} required />
              <FormField
                label={
                  <span className="min-h-[38px] flex flex-wrap items-end pb-1 gap-1.5 text-[13px] font-semibold text-slate-800 leading-tight">
                    <span>
                      Mobile Phone<span className="ml-1 text-danger font-bold">*</span>
                    </span>
                    <span className="inline-flex items-center rounded-[12px] border border-emerald-300 bg-emerald-50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shadow-2xs">
                      Editable
                    </span>
                    <span title="Ethiopian mobile number, e.g. +251 91 234 5678" className="cursor-help text-muted hover:text-ink transition-colors">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                      </svg>
                    </span>
                  </span>
                }
                htmlFor="mobile"
              >
                <Input
                  id="mobile"
                  name="mobile"
                  type="tel"
                  defaultValue={p.mobile}
                  placeholder="+251 91 234 5678"
                  className="h-11 border-slate-300 focus:border-brand-green focus:ring-brand-green/20"
                />
              </FormField>

              <FormField
                label={
                  <span className="min-h-[38px] flex flex-wrap items-end pb-1 gap-1.5 text-[13px] font-semibold text-slate-800 leading-tight">
                    <span>Email ID</span>
                    <span className="inline-flex items-center rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shadow-2xs">
                      Editable
                    </span>
                    <span title="Valid email address, e.g. name@example.org" className="cursor-help text-muted hover:text-ink transition-colors">
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                        <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                      </svg>
                    </span>
                  </span>
                }
                htmlFor="email"
              >
                <Input
                  id="email"
                  name="email"
                  type="email"
                  defaultValue={p.email}
                  placeholder="name@example.org"
                  className="h-11 border-slate-300 focus:border-brand-green focus:ring-brand-green/20"
                />
              </FormField>
              <LockedField label="Date of Birth" value={formatDate(p.dob)} required />
              <FormField
                label={
                  <span className="min-h-[38px] flex items-end pb-1 text-[13px] font-medium text-ink leading-tight">
                    <span>Gender</span>
                    <span className="ml-1 text-danger font-bold">*</span>
                  </span>
                }
                htmlFor="locked-gender"
              >
                <Select id="locked-gender" value={p.gender} disabled title="Verified via Fayda — changes need re-verification" className={LOCKED}>
                  {Object.entries(GENDERS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </FormField>

              <LockedField label="ID Type" value={ID_TYPES[p.idType]} />
              <LockedField label="ID Number" value={p.idNumber} />
              <FormField
                label={
                  <span className="min-h-[38px] flex flex-wrap items-end pb-1 gap-1.5 text-[13px] font-semibold text-slate-800 leading-tight">
                    <span>Language</span>
                    <span className="inline-flex items-center rounded-md border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shadow-2xs">
                      Editable
                    </span>
                  </span>
                }
                htmlFor="language"
              >
                <Select id="language" name="language" defaultValue={p.language} className="h-11 border-slate-300 focus:border-brand-green focus:ring-brand-green/20">
                  {Object.entries(LANGUAGES).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </Select>
              </FormField>
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
