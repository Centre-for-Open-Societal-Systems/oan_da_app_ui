"use client";

import { useState, type FormEvent } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Select } from "@/components/ui/Select";
import { AGENT_PROFILE, ProfilePhotoUpload } from "@/features/farmers";
import { ETHIOPIAN_MONTHS, toEthiopian } from "@/lib/ethiopian";
import { LOCKED, READ, ReadOnlyField, formatDate } from "./DemographicsSection";

const [FIRST_NAME, ...REST] = AGENT_PROFILE.name.split(" ");
const AVATAR = <PersonAvatar label={`${AGENT_PROFILE.name} avatar`} />;
const BIRTH = toEthiopian("1998-05-15");

// The signed-in DA's profile until the profile API lands. Identity comes from Fayda, the posting from the Woreda office.
const DA_PROFILE = {
  salutation: "Mr.",
  name: FIRST_NAME,
  fatherName: REST.join(" "),
  fan: "3512 4498 7712 0345",
  gender: "Male",
  maritalStatus: "Married",
  birthMonth: ETHIOPIAN_MONTHS[BIRTH.month - 1],
  birthYear: String(BIRTH.year),
  mobile: AGENT_PROFILE.phone,
  email: AGENT_PROFILE.email,
  education: "Bachelor's degree",
  position: "Development Agent",
  specialisation: "Crop production",
  country: "Ethiopia",
  region: "Oromia",
  zone: "West Shewa",
  woreda: "Bako Tibe",
  kebele: "Bako Tibe",
  lastUpdated: "2026-07-12",
};

const EDUCATION_LEVELS = ["Certificate", "Diploma (Level IV)", "Bachelor's degree", "Master's degree", "PhD"];

// What the agent can change; each change is sent to the Woreda supervisor. Everything else is locked.
const EDITABLE = [
  { key: "mobile", label: "Phone number" },
  { key: "email", label: "Email" },
  { key: "education", label: "Education level" },
  { key: "specialisation", label: "Specialisation" },
] as const;
type EditableKey = (typeof EDITABLE)[number]["key"];

const VERIFIED = "Verified via Fayda; changes need re-verification";
const ASSIGNED = "Set by your Woreda office";

/** Section fields in display order. `locked` ones are shown greyed out on the form. */
const FIELDS: { key: keyof typeof DA_PROFILE; label: string; hint: string }[] = [
  { key: "salutation", label: "Salutation", hint: VERIFIED },
  { key: "name", label: "Name", hint: VERIFIED },
  { key: "fatherName", label: "Father's name", hint: VERIFIED },
  { key: "fan", label: "Fayda ID (FAN)", hint: VERIFIED },
  { key: "gender", label: "Gender", hint: VERIFIED },
  { key: "maritalStatus", label: "Marital status", hint: VERIFIED },
  { key: "birthMonth", label: "Month of birth (Ethiopian calendar)", hint: VERIFIED },
  { key: "birthYear", label: "Year of birth (Ethiopian calendar)", hint: VERIFIED },
  { key: "mobile", label: "Phone number", hint: "" },
  { key: "email", label: "Email", hint: "" },
  { key: "education", label: "Education level", hint: "" },
  { key: "position", label: "Position", hint: ASSIGNED },
  { key: "specialisation", label: "Specialisation", hint: "" },
  { key: "country", label: "Country", hint: ASSIGNED },
  { key: "region", label: "Region", hint: ASSIGNED },
  { key: "zone", label: "Zone", hint: ASSIGNED },
  { key: "woreda", label: "Woreda", hint: ASSIGNED },
  { key: "kebele", label: "Kebele", hint: ASSIGNED },
];

const isEditable = (key: string): key is EditableKey => EDITABLE.some((e) => e.key === key);

interface Props {
  editing: boolean;
  onEdit?: () => void;
  onCancel: () => void;
  /** Called with the labels of the fields that changed. */
  onSubmit: (changed: string[]) => void;
}

// Demographics & personal details as the DA sees it: identity, contact, education, posting and location.
export function DaDemographicsSection({ editing, onEdit, onCancel, onSubmit }: Props) {
  const p = DA_PROFILE;
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
        <p className="mt-1 text-[12.5px] text-ink-soft">{editing ? "Editing - changes are sent to your Woreda supervisor for approval" : "Your identity details"}</p>
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
                {FIELDS.map((f) => {
                  const id = `da-${f.key}`;
                  if (!isEditable(f.key)) {
                    return (
                      <FormField key={f.key} label={f.label} htmlFor={id} required>
                        <Input id={id} value={p[f.key]} readOnly disabled title={f.hint} className={LOCKED} />
                      </FormField>
                    );
                  }
                  return (
                    <FormField key={f.key} label={f.label} htmlFor={id} required>
                      {f.key === "education" ? (
                        <Select id={id} name={f.key} defaultValue={p.education} className="h-11">
                          {EDUCATION_LEVELS.map((l) => <option key={l}>{l}</option>)}
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

  return (
    <Card className="p-0 shadow-card">
      {header}
      <div className="grid animate-fade-in grid-cols-1 gap-6 px-6 py-5 lg:grid-cols-[215px_1fr] lg:gap-8">
        <div className="flex flex-col gap-2">
          <span className="text-[14px] font-medium text-ink">Profile Photo</span>
          <div className="flex flex-col items-center gap-3 rounded-lg border-2 border-dashed border-gray-300 px-4 py-6 text-center">
            <div className="h-20 w-20 overflow-hidden rounded-full bg-zinc-200">{AVATAR}</div>
            <p className="text-[13px] text-muted">Change your photo from Edit profile. JPG or PNG up to 5MB.</p>
          </div>
        </div>

        <dl className="grid grid-cols-1 content-start gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-3">
          {FIELDS.map((f) => (
            <ReadOnlyField key={f.key} label={f.label} required>
              <div className={`${READ} truncate`}>{p[f.key]}</div>
            </ReadOnlyField>
          ))}
        </dl>
      </div>
    </Card>
  );
}
