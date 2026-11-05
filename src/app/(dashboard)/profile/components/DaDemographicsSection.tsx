"use client";

import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Select } from "@/components/ui/Select";
import { ProfilePhotoUpload } from "@/features/farmers";
import { EDUCATION_TIER_OPTIONS, describeProfileError, type DaProfile, type ProfileChanges } from "@/features/profile";
import { ETHIOPIAN_MONTHS } from "@/lib/ethiopian";
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
// posting and location. Edits go to the Woreda supervisor as a change request.
export function DaDemographicsSection({ editing, profile, editableFields, onEdit, onCancel, onSubmit }: Props) {
  const p = valuesOf(profile);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const avatar = <PersonAvatar label={`${profile.full_name} avatar`} />;
  const canChange = (change: keyof ProfileChanges | undefined): change is keyof ProfileChanges => !!change && editableFields.includes(change);
  const educationOptions = p.education && !(EDUCATION_TIER_OPTIONS as readonly string[]).includes(p.education) ? [p.education, ...EDUCATION_TIER_OPTIONS] : [...EDUCATION_TIER_OPTIONS];

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

  const header = (
    <div className="flex flex-col gap-3 border-b border-line px-6 py-3.5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h2 className="text-[15px] font-semibold text-ink">Demographics &amp; personal details</h2>
        <p className="mt-1 text-[12.5px] text-ink-soft">{editing ? "Editing - changes are sent to your Woreda supervisor for approval" : "Your identity details, as the DA Registry holds them"}</p>
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
              <ProfilePhotoUpload name="photo" showActions={false} fallback={avatar} />
              <div className="grid grid-cols-1 content-start gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
                {FIELDS.map((f) => {
                  const id = `da-${f.key}`;
                  if (!canChange(f.change)) {
                    return (
                      <FormField key={f.key} label={f.label} htmlFor={id}>
                        <Input id={id} value={p[f.key] || EMPTY} readOnly disabled title={f.hint || "Not editable from the portal"} className={LOCKED} />
                      </FormField>
                    );
                  }
                  return (
                    <FormField key={f.key} label={f.label} htmlFor={id} hint={f.key === "mobile" ? "Ethiopian mobile number, e.g. +251 91 234 5678." : f.key === "email" ? "If given, a valid email address." : undefined}>
                      {f.key === "education" ? (
                        <Select id={id} name={f.key} defaultValue={p.education} className="h-11">
                          {educationOptions.map((l) => <option key={l}>{l}</option>)}
                        </Select>
                      ) : (
                        <Input id={id} name={f.key} type={f.key === "mobile" ? "tel" : f.key === "email" ? "email" : "text"} defaultValue={p[f.key]} className="h-11" />
                      )}
                    </FormField>
                  );
                })}
              </div>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-3 border-t border-line pt-4 sm:flex-row sm:items-center sm:justify-end">
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button type="button" variant="outline" disabled={saving} onClick={() => { setError(null); onCancel(); }}>Cancel</Button>
            <Button type="submit" variant="brand" disabled={saving}>{saving ? "Sending…" : "Save Changes"}</Button>
          </div>
        </div>
      </form>
    );
  }

  return (
    <Card className="p-0 shadow-card">
      {header}
      <div className="grid animate-fade-in grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-[215px_1fr] lg:gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-medium text-ink">Profile Photo</span>
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-center">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-zinc-200">{avatar}</div>
            <p className="text-[13px] text-muted">Change your photo from Edit profile. JPG or PNG up to 5MB.</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 content-start gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
          {FIELDS.map((f) => (
            <ReadOnlyField key={f.key} label={f.label}>
              <div className={`${READ} truncate`}>{p[f.key] || <span className="text-subtle">{EMPTY}</span>}</div>
            </ReadOnlyField>
          ))}
        </dl>
      </div>
    </Card>
  );
}
