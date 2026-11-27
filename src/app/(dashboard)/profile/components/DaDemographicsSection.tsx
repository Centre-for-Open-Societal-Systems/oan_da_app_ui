"use client";

import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { ProfilePhotoUpload, getInitials } from "@/features/farmers";
import { EDUCATION_TIER_OPTIONS, describeProfileError, type DaProfile, type ProfileChanges } from "@/features/profile";
import { ETHIOPIAN_MONTHS } from "@/lib/ethiopian";
import { cn } from "@/lib/utils";
import { LOCKED, READ, ReadOnlyField } from "./DemographicsSection";

const EMPTY = "—";

/** Section fields in display order. Editable ones map to a change-request field; the rest are locked. */
type FieldKey =
  | "salutation" | "name" | "fatherName" | "grandfatherName" | "fan" | "gender" | "maritalStatus" | "dateOfBirth"
  | "mobile" | "telegram" | "alternate" | "email" | "homeAddress"
  | "position" | "specialisation" | "education" | "joinedAt" | "reportsTo"
  | "region" | "zone" | "woreda" | "kebele";

const VERIFIED = "Verified via Fayda; changes need re-verification";
const ASSIGNED = "Set by your Woreda office";

/** The groups of the DA Registry's own form (da_details_tab), in its order and with its titles. */
const GROUPS = ["Personal details", "Contact details and home address", "Position and reporting", "Work location"] as const;
type Group = (typeof GROUPS)[number];

const FIELDS: { key: FieldKey; label: string; hint: string; group: Group; change?: keyof ProfileChanges }[] = [
  { key: "salutation", label: "Salutation", hint: VERIFIED, group: "Personal details" },
  { key: "name", label: "Name", hint: VERIFIED, group: "Personal details" },
  { key: "fatherName", label: "Father's name", hint: VERIFIED, group: "Personal details" },
  { key: "grandfatherName", label: "Grandfather's name", hint: VERIFIED, group: "Personal details" },
  { key: "fan", label: "Fayda ID (FAN)", hint: VERIFIED, group: "Personal details" },
  { key: "gender", label: "Gender", hint: VERIFIED, group: "Personal details" },
  { key: "maritalStatus", label: "Marital status", hint: VERIFIED, group: "Personal details" },
  { key: "dateOfBirth", label: "Date of birth", hint: VERIFIED, group: "Personal details" },
  { key: "mobile", label: "Phone number", hint: "", group: "Contact details and home address", change: "mobile" },
  { key: "telegram", label: "Telegram number", hint: "", group: "Contact details and home address", change: "telegram" },
  { key: "alternate", label: "Other phone number", hint: "", group: "Contact details and home address", change: "alternate_mobile" },
  { key: "email", label: "Email", hint: "", group: "Contact details and home address", change: "email" },
  { key: "homeAddress", label: "Home address", hint: ASSIGNED, group: "Contact details and home address" },
  { key: "position", label: "Position", hint: ASSIGNED, group: "Position and reporting" },
  { key: "specialisation", label: "Specialisation", hint: "", group: "Position and reporting", change: "specialisation" },
  { key: "education", label: "Education level", hint: "", group: "Position and reporting", change: "education_tier" },
  { key: "joinedAt", label: "Joining date", hint: ASSIGNED, group: "Position and reporting" },
  { key: "reportsTo", label: "Reports to (ID)", hint: ASSIGNED, group: "Position and reporting" },
  { key: "region", label: "Region", hint: ASSIGNED, group: "Work location" },
  { key: "zone", label: "Zone", hint: ASSIGNED, group: "Work location" },
  { key: "woreda", label: "Woreda", hint: ASSIGNED, group: "Work location" },
  { key: "kebele", label: "Kebele", hint: ASSIGNED, group: "Work location" },
];

/** Contact fields go in one change request, Qualifications fields in another (the backend takes one section each). */
const CONTACT_CHANGES: (keyof ProfileChanges)[] = ["mobile", "telegram", "alternate_mobile", "email"];
const PHONE_CHANGES: (keyof ProfileChanges)[] = ["mobile", "telegram", "alternate_mobile"];
const PHONE = /^(\+?251|0)\s?9\d(\s?\d){7}$/;

const text = (v: unknown) => (v == null || v === "" ? "" : String(v));
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "2023-11-11" -> "11 Nov 2023"; anything else as sent. */
function formatDate(v: unknown): string {
  const s = text(v);
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  return m ? `${Number(m[3])} ${MONTHS[Number(m[2]) - 1]} ${m[1]}` : s;
}

/** The registry profile as the section shows it: names over codes, dates in words. */
function valuesOf(p: DaProfile): Record<FieldKey, string> {
  const month = p.birth_month_name || (p.birth_month_ec ? ETHIOPIAN_MONTHS[p.birth_month_ec - 1] : "");
  // The registry form keeps the Gregorian date of birth; my_profile sends only the Ethiopian month and year so far.
  const ecBirth = [month, text(p.birth_year_ec)].filter(Boolean).join(" ");
  return {
    salutation: text(p.salutation),
    name: text(p.first_name) || text(p.full_name),
    fatherName: text(p.father_name),
    grandfatherName: text(p.grandfather_name),
    fan: text(p.fayda_id),
    gender: text(p.gender),
    maritalStatus: text(p.marital_status),
    dateOfBirth: formatDate(p.birth_date) || (ecBirth ? `${ecBirth} (Ethiopian calendar)` : ""),
    mobile: text(p.mobile),
    telegram: text(p.telegram_number),
    alternate: text(p.alternate_number),
    email: text(p.email),
    homeAddress: text(p.home_address),
    position: text(p.position),
    specialisation: text(p.specialisation),
    education: text(p.education_tier),
    joinedAt: formatDate(p.joined_at),
    reportsTo: text(p.reports_to),
    region: text(p.region_name) || text(p.region),
    zone: text(p.zone_name) || text(p.zone),
    woreda: text(p.woreda_name) || text(p.woreda),
    kebele: text(p.kebele_name) || text(p.kebele),
  };
}

interface Props {
  editing: boolean;
  profile: DaProfile;
  onEdit?: () => void;
  onCancel: () => void;
  /** The changed fields as a change request, plus their labels for the confirmation. Rejects with the backend's message. */
  onSubmit: (changes: ProfileChanges, labels: string[]) => Promise<void> | void;
}

// Demographics & personal details as the DA Registry holds them: identity (Fayda, locked), contact, education,
// posting and location. Edits open in a popup and go to the Woreda supervisor as a change request.
// The editable fields are the fixed list in FIELDS (those with a `change`): GET /profile/my_profile no longer says
// which fields may change, and POST /profile/change-requests still refuses a locked field with 400.
export function DaDemographicsSection({ editing, profile, onEdit, onCancel, onSubmit }: Props) {
  const p = valuesOf(profile);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canChange = (change: keyof ProfileChanges | undefined): change is keyof ProfileChanges => !!change;
  // The backend sends what the user's own registry record holds, so a field that is empty for this person (e.g. no
  // location for an administrator) is left out. Editable fields always show, so an empty one can be filled in.
  const shown = FIELDS.filter((f) => canChange(f.change) || p[f.key] !== "");
  const educationOptions = p.education && !(EDUCATION_TIER_OPTIONS as readonly string[]).includes(p.education) ? [p.education, ...EDUCATION_TIER_OPTIONS] : [...EDUCATION_TIER_OPTIONS];

  const fullName = profile.full_name || profile.da_id || "DA";
  const initials = getInitials(fullName) || "DA";

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (saving) return;
    const data = new FormData(e.currentTarget);
    const changes: ProfileChanges = {};
    const labels: string[] = [];
    for (const f of FIELDS) {
      if (!canChange(f.change)) continue;
      const value = String(data.get(f.key) ?? "").trim();
      if (value !== p[f.key]) {
        changes[f.change] = value;
        labels.push(f.label);
      }
    }
    if (labels.length === 0) return setError("Change at least one field before submitting.");
    const keys = Object.keys(changes) as (keyof ProfileChanges)[];
    if (keys.some((k) => CONTACT_CHANGES.includes(k)) && keys.some((k) => !CONTACT_CHANGES.includes(k))) {
      return setError("Send contact details and education / specialisation as separate requests: change one group, save, then the other.");
    }
    if (PHONE_CHANGES.some((k) => changes[k] && !PHONE.test(changes[k]!))) return setError("Use an Ethiopian mobile number, e.g. +251 91 234 5678 or 0912345678.");
    if (changes.email && !/^\S+@\S+\.\S+$/.test(changes.email)) return setError("Enter a valid email address.");

    setError(null);
    setSaving(true);
    try {
      await onSubmit(changes, labels);
    } catch (err) {
      setError(describeProfileError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      {/* Read-Only Card on the main page */}
      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 border-b border-line bg-surface/40 px-5 py-4 sm:px-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">Demographics &amp; personal details</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              Your identity details, as the DA Registry holds them
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
          {/* Profile Photo Tile */}
          <div className="flex flex-col gap-2.5">
            <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">Profile Photo</span>
            {/* The photo fills the whole tile; a short-lived signed link, used straight from the response, never stored. */}
            <div className="flex aspect-square w-full max-w-[220px] items-center justify-center overflow-hidden rounded-2xl border border-line bg-gradient-to-br from-brand-green to-emerald-700 text-[48px] font-bold text-white shadow-xs">
              {profile.photo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={profile.photo} alt={fullName} className="h-full w-full object-cover" />
              ) : (
                initials
              )}
            </div>
          </div>

          {/* Details, grouped as in the DA Registry form; a group with nothing to show is left out */}
          <div className="flex flex-col gap-6">
          {GROUPS.map((group) => {
            const fields = shown.filter((f) => f.group === group);
            if (fields.length === 0) return null;
            return (
          <section key={group} className="flex flex-col gap-3">
          <h3 className="text-[12px] font-semibold uppercase tracking-wider text-muted">{group}</h3>
          <dl className="grid grid-cols-1 content-start gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            {fields.map((f) => {
              const isLocked = !canChange(f.change);
              const val = p[f.key];
              return (
                <ReadOnlyField key={f.key} label={f.label}>
                  <div className={cn(READ, "justify-between")}>
                    <span className={cn("truncate", !val && "text-subtle font-normal")}>{val || EMPTY}</span>
                    {isLocked ? (
                      <span className="shrink-0 text-muted/60" title={f.hint || "Verified via Fayda / Assigned by office"}>
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </span>
                    ) : (
                      <span className="shrink-0 text-brand-green/70" title="Editable via Edit profile">
                        <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                      </span>
                    )}
                  </div>
                </ReadOnlyField>
              );
            })}
          </dl>
          </section>
            );
          })}
          </div>
        </div>
      </Card>

      {/* Edit Profile Popup / Modal */}
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
              <span className="font-semibold text-slate-700">Note:</span> Locked fields are verified by Fayda or set by Woreda office.
            </p>
            <div className="flex items-center justify-end gap-2.5">
              <Button
                type="button"
                variant="outline"
                disabled={saving}
                onClick={() => {
                  setError(null);
                  onCancel();
                }}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                form="da-edit-profile-form"
                variant="brand"
                disabled={saving}
                className="gap-2"
              >
                {saving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin text-white" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Sending…</span>
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        }
      >
        <form
          id="da-edit-profile-form"
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
              You can edit your contact details (phone, Telegram, other phone, email), education level and specialisation. Send contact changes and education / specialisation changes as separate requests. Identity and location details are verified and managed by the DA Registry.
            </span>
          </div>

          <div className="grid grid-cols-1 gap-6 lg:grid-cols-[220px_1fr] lg:gap-8">
            <div className="flex flex-col gap-2">
              <ProfilePhotoUpload
                name="photo"
                showActions={true}
                allowRemove={true}
                initialPreview={profile.photo ?? null}
                fallback={
                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-brand-green to-emerald-700 text-[24px] font-bold text-white">
                    {initials}
                  </div>
                }
              />
            </div>

            <div className="grid grid-cols-1 content-start gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
              {shown.map((f) => {
                const id = `da-edit-${f.key}`;
                if (!canChange(f.change)) {
                  return (
                    <FormField
                      key={f.key}
                      label={
                        <span className="min-h-[38px] flex items-end pb-1 text-[13px] font-medium text-ink leading-tight">
                          {f.label}
                        </span>
                      }
                      htmlFor={id}
                    >
                      <div className="relative">
                        <Input
                          id={id}
                          value={p[f.key] || EMPTY}
                          readOnly
                          disabled
                          title={f.hint || "Not editable from the portal"}
                          className={cn(LOCKED, "pr-8 text-slate-600 bg-slate-50 border-slate-200/90 cursor-not-allowed")}
                        />
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
                return (
                  <FormField
                    key={f.key}
                    label={
                      <span className="min-h-[38px] flex flex-wrap items-end pb-1 gap-1.5 text-[13px] font-semibold text-slate-800 leading-tight">
                        <span>{f.label}</span>
                        <span className="inline-flex items-center rounded-[12px] border border-emerald-300 bg-emerald-50 px-3 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700 shadow-2xs">
                          Editable
                        </span>
                        {f.key === "mobile" && (
                          <span title="Ethiopian mobile number, e.g. +251 91 234 5678" className="cursor-help text-muted hover:text-ink transition-colors">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                            </svg>
                          </span>
                        )}
                        {f.key === "email" && (
                          <span title="Valid email address, e.g. name@example.org" className="cursor-help text-muted hover:text-ink transition-colors">
                            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                              <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
                            </svg>
                          </span>
                        )}
                      </span>
                    }
                    htmlFor={id}
                  >
                    {f.key === "education" ? (
                      <Select
                        id={id}
                        name={f.key}
                        defaultValue={p.education}
                        className="h-11 border-slate-300 focus:border-brand-green focus:ring-brand-green/20"
                      >
                        {educationOptions.map((l) => (
                          <option key={l}>{l}</option>
                        ))}
                      </Select>
                    ) : (
                      <Input
                        id={id}
                        name={f.key}
                        type={f.change && PHONE_CHANGES.includes(f.change) ? "tel" : f.key === "email" ? "email" : "text"}
                        defaultValue={p[f.key]}
                        placeholder={f.change && PHONE_CHANGES.includes(f.change) ? "+251 91 234 5678" : f.key === "email" ? "name@example.org" : undefined}
                        className="h-11 border-slate-300 focus:border-brand-green focus:ring-brand-green/20"
                      />
                    )}
                  </FormField>
                );
              })}
            </div>
          </div>
        </form>
      </Modal>
    </>
  );
}
