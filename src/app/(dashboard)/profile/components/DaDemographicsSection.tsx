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
type FieldKey = "salutation" | "name" | "fatherName" | "fan" | "gender" | "maritalStatus" | "birthMonth" | "birthYear" | "mobile" | "email" | "education" | "position" | "specialisation" | "country" | "region" | "zone" | "woreda" | "kebele";

const VERIFIED = "Verified via Fayda; changes need re-verification";
const ASSIGNED = "Set by your Woreda office";

const FIELDS: { key: FieldKey; label: string; hint: string; change?: keyof ProfileChanges }[] = [
  { key: "salutation", label: "Salutation", hint: VERIFIED },
  { key: "name", label: "Name", hint: VERIFIED },
  { key: "fatherName", label: "Father's name", hint: VERIFIED },
  { key: "fan", label: "Fayda ID (FAN)", hint: VERIFIED },
  { key: "gender", label: "Gender", hint: VERIFIED },
  { key: "maritalStatus", label: "Marital status", hint: VERIFIED },
  { key: "birthMonth", label: "Month of birth (Ethiopian calendar)", hint: VERIFIED },
  { key: "birthYear", label: "Year of birth (Ethiopian calendar)", hint: VERIFIED },
  { key: "mobile", label: "Phone number", hint: "", change: "mobile" },
  { key: "email", label: "Email", hint: "", change: "email" },
  { key: "education", label: "Education level", hint: "", change: "education_tier" },
  { key: "position", label: "Position", hint: ASSIGNED },
  { key: "specialisation", label: "Specialisation", hint: "", change: "specialisation" },
  { key: "country", label: "Country", hint: ASSIGNED },
  { key: "region", label: "Region", hint: ASSIGNED },
  { key: "zone", label: "Zone", hint: ASSIGNED },
  { key: "woreda", label: "Woreda", hint: ASSIGNED },
  { key: "kebele", label: "Kebele", hint: ASSIGNED },
];

const text = (v: unknown) => (v == null || v === "" ? "" : String(v));

/** The registry profile as the section shows it: names over codes, EC month by name. */
function valuesOf(p: DaProfile): Record<FieldKey, string> {
  const month = p.birth_month_name || (p.birth_month_ec ? ETHIOPIAN_MONTHS[p.birth_month_ec - 1] : "");
  return {
    salutation: text(p.salutation),
    name: text(p.first_name) || text(p.full_name),
    fatherName: text(p.father_name),
    fan: text(p.fayda_id),
    gender: text(p.gender),
    maritalStatus: text(p.marital_status),
    birthMonth: text(month),
    birthYear: text(p.birth_year_ec),
    mobile: text(p.mobile),
    email: text(p.email),
    education: text(p.education_tier),
    position: text(p.position) || "Development Agent",
    specialisation: text(p.specialisation),
    country: text(p.country) || "Ethiopia",
    region: text(p.region_name) || text(p.region),
    zone: text(p.zone_name) || text(p.zone),
    woreda: text(p.woreda_name) || text(p.woreda),
    kebele: text(p.kebele_name) || text(p.kebele),
  };
}

interface Props {
  editing: boolean;
  profile: DaProfile;
  /** Change-request fields the backend lets this DA edit (GET /profile/me `editable_fields`). */
  editableFields: string[];
  onEdit?: () => void;
  onCancel: () => void;
  /** The changed fields as a change request, plus their labels for the confirmation. Rejects with the backend's message. */
  onSubmit: (changes: ProfileChanges, labels: string[]) => Promise<void> | void;
}

// Demographics & personal details as the DA Registry holds them: identity (Fayda, locked), contact, education,
// posting and location. Edits open in a popup and go to the Woreda supervisor as a change request.
export function DaDemographicsSection({ editing, profile, editableFields, onEdit, onCancel, onSubmit }: Props) {
  const p = valuesOf(profile);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const canChange = (change: keyof ProfileChanges | undefined): change is keyof ProfileChanges => !!change && editableFields.includes(change);
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
    if (changes.mobile !== undefined && !/^\+?251\s?9\d(\s?\d){7}$/.test(changes.mobile)) return setError("Use an Ethiopian mobile number, e.g. +251 91 234 5678.");
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
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-surface/40 p-5 text-center transition-colors hover:bg-surface">
              <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-2xl bg-gradient-to-br from-brand-green to-emerald-700 text-[24px] font-bold text-white shadow-xs">
                {initials}
              </div>
              <p className="text-[12px] text-muted leading-relaxed">Change your photo from Edit profile. JPG or PNG up to 5MB.</p>
            </div>
          </div>

          {/* Details Grid */}
          <dl className="grid grid-cols-1 content-start gap-x-5 gap-y-4 sm:grid-cols-2 xl:grid-cols-3">
            {FIELDS.map((f) => {
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
              You can edit your contact details (phone, email), education level, and specialisation. Identity and location details are verified and managed by the DA Registry.
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
              {FIELDS.map((f) => {
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
                        type={f.key === "mobile" ? "tel" : f.key === "email" ? "email" : "text"}
                        defaultValue={p[f.key]}
                        placeholder={f.key === "mobile" ? "+251 91 234 5678" : f.key === "email" ? "name@example.org" : undefined}
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
