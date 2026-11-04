"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { cn } from "@/lib/utils";
import { loadScopeAreas, woredasInRegion, type ScopeAreas } from "@/features/assignments";
import { ASSIGNABLE_ROLES } from "@/features/users";
import { delegatedUserId } from "@/lib/delegatedUser";
import { IAM_LOGIN_KEY } from "@/lib/iam";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/rbac";

/** Everything the Add and Edit user forms capture (dates are display strings, e.g. "12 Mar 2019"; "—" = open-ended). */
export interface UserFormValues {
  name: string;
  phone: string;
  email: string;
  role: Role;
  /** DA-ID the Development Agent assignment is bound to; empty for other roles. */
  daId: string;
  /**
   * Set when the role goes to an account that already exists because the person signed in with their staff
   * (SSO) account: the DA Services id (…@iam.internal). No account is registered and no password is issued.
   */
  existingUserId?: string;
  active: boolean;
  /** Area-master P-codes (e.g. "ET04", "ET040301"), as the backend stores and checks scopes; "" when the role has none. */
  regionScope: string;
  woredaScope: string;
  effectiveFrom: string;
  effectiveTo: string;
}

// Region-wide roles are not tied to a single Woreda; what the disabled Woreda field shows for them.
const WIDE_SCOPE: Record<Role, string | null> = { DA: null, Supervisor: null, Executive: "All (read)", Admin: "All", CommsOfficer: null, SuperAdmin: "All" };

// The backend's login option for staff sign-in; part of how it names the accounts it creates for them.

type AccountKind = "new" | "existing";

const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => toIso(new Date());
const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
/** "12 Mar 2019" → "2019-03-12"; anything unparseable ("—") → "". */
export const parseDisplayDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : toIso(d);
};

type ErrorKey = "name" | "phone" | "email" | "staffUserId" | "daId" | "scope" | "effectiveTo";
type Errors = Partial<Record<ErrorKey, string>>;

// Compact field: 13px semibold label, h-9 control (matches the Add user design).
const FIELD = "gap-1.5 [&>label]:text-[13px] [&>label]:font-semibold";
const CONTROL = "h-9 border-zinc-200 text-[13.5px]";

function Section({ title, children, first }: { title: string; children: ReactNode; first?: boolean }) {
  return (
    <section className={cn("px-4 py-5 sm:px-6", !first && "border-t border-line")}>
      <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

interface UserFormModalProps {
  mode: "add" | "edit";
  /** Current values when editing; the Add form starts empty. */
  initial?: UserFormValues;
  /** Shown under the title when editing, e.g. "Tadesse Alemu · U-1001". */
  subtitle?: string;
  onClose: () => void;
  /** A rejected promise keeps the form open and shows its message, so the Admin can fix and save again. */
  onSave: (values: UserFormValues) => void | Promise<void>;
}

// Add and Edit share one form so both always carry the same fields: user details, scope and effective dates.
// Region and Woreda come from the backend's area master (GET /master/areas) and are sent as P-codes: the
// backend compares scopes with the codes the DA Registry puts on every DA's posting, so a name would never match.
export function UserFormModal({ mode, initial, subtitle, onClose, onSave }: UserFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<Role>(initial?.role ?? "DA");
  const [daId, setDaId] = useState(initial?.daId ?? "");
  // "new": register an account with a temporary password. "existing": the person signs in with the staff
  // (SSO) account; only the role and scope are assigned, to the account their first sign-in created.
  const [accountKind, setAccountKind] = useState<AccountKind>("new");
  const [staffUserId, setStaffUserId] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [active, setActive] = useState(initial?.active ?? true);
  const [areas, setAreas] = useState<ScopeAreas | null>(null);
  const [areasError, setAreasError] = useState<string | null>(null);
  // The picked codes; "" means "not picked yet", which resolves to the first option once the areas are loaded.
  const [region, setRegion] = useState(initial?.regionScope ?? "");
  const [woreda, setWoreda] = useState(initial?.woredaScope ?? "");
  const [effectiveFrom, setEffectiveFrom] = useState(initial ? parseDisplayDate(initial.effectiveFrom) : "");
  const [effectiveTo, setEffectiveTo] = useState(initial ? parseDisplayDate(initial.effectiveTo) : "");
  const [errors, setErrors] = useState<Errors>({});

  useEffect(() => {
    let cancelled = false;
    loadScopeAreas()
      .then((loaded) => !cancelled && setAreas(loaded))
      .catch((err: unknown) => !cancelled && setAreasError(err instanceof Error ? err.message : "Could not load the Regions and Woredas."));
    return () => {
      cancelled = true;
    };
  }, []);

  const isEdit = mode === "edit";
  const isExisting = !isEdit && accountKind === "existing";
  const wideScope = WIDE_SCOPE[role];
  // A new account is created on the backend, which signs in by email and hands out four roles (not Admin).
  const roleOptions: readonly Role[] = isEdit ? ROLES.filter((r) => r !== "SuperAdmin") : ASSIGNABLE_ROLES;

  // A stored value that is not a known code (an older row holding a name) falls back to the first option.
  const regions = areas?.regions ?? [];
  const regionCode = regions.some((r) => r.code === region) ? region : (regions[0]?.code ?? "");
  const woredaOptions = areas ? woredasInRegion(areas.woredas, regionCode) : [];
  const woredaCode = woredaOptions.some((w) => w.code === woreda) ? woreda : (woredaOptions[0]?.code ?? "");
  const needsScope = role !== "Admin";
  const needsWoreda = needsScope && !wideScope;

  const submit = async () => {
    if (saving) return;
    const next: Errors = {};
    if (isExisting) {
      if (!staffUserId.trim()) next.staffUserId = "Paste the user's ID from Keycloak, or their DA Services id ending in @iam.internal";
    } else {
      if (name.trim().length < 3) next.name = "Enter the user's full name";
      if (!/^\+?251\s?9\d(\s?\d){7}$/.test(phone.trim())) next.phone = "Use an Ethiopian mobile number, e.g. +251 91 234 5678";
      if (!isEdit && !email.trim()) next.email = "Enter the email the user will sign in with";
      else if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email";
    }
    if (!isEdit && role === "DA" && !daId.trim()) next.daId = "Enter the DA-ID this agent is bound to";
    if (needsScope && !regionCode) next.scope = areasError ?? "Wait for the Regions and Woredas to load";
    else if (needsWoreda && !woredaCode) next.scope = "This Region has no Woreda in the area master";
    if (effectiveTo && effectiveTo < (effectiveFrom || today())) next.effectiveTo = "Must be on or after the From date";
    setErrors(next);
    if (Object.keys(next).length > 0) return;

    setSaving(true);
    setSaveError(null);
    try {
      await onSave({
        name: name.trim(),
        phone: phone.trim(),
        email: email.trim(),
        role,
        daId: role === "DA" ? daId.trim() : "",
        ...(isExisting && { existingUserId: await delegatedUserId(staffUserId, IAM_LOGIN_KEY) }),
        active,
        regionScope: needsScope ? regionCode : "",
        woredaScope: needsWoreda ? woredaCode : "",
        // No From date means the assignment starts today
        effectiveFrom: formatDate(effectiveFrom || today()),
        effectiveTo: effectiveTo ? formatDate(effectiveTo) : "—",
      });
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Could not save the user. Please try again.");
      setSaving(false);
    }
  };

  const clear = (key: ErrorKey) => setErrors((e) => ({ ...e, [key]: undefined }));
  const areaOption = (a: { code: string; name_en: string }) => (
    <option key={a.code} value={a.code}>{a.name_en} ({a.code})</option>
  );
  const loadingOption = <option value="">{areasError ? "Areas unavailable" : "Loading…"}</option>;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isEdit ? "Edit User" : "Add User"}
      subtitle={subtitle ?? "Create the account and assign the role and scope it acts within"}
      className="max-w-[544px]"
      bodyClassName="p-0"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="brand" onClick={submit} disabled={saving} className="px-6">{saving ? "Saving…" : "Save"}</Button>
        </>
      }
    >
      {saveError && (
        <div className="px-4 pt-5 sm:px-6">
          <ErrorAlert message={saveError} />
        </div>
      )}
      <Section title="User details" first>
        {!isEdit && (
          <div role="radiogroup" aria-label="Account" className="flex gap-1 rounded-lg border border-zinc-200 bg-surface p-1 sm:col-span-2">
            {([
              ["new", "New account", "Creates the account and a temporary password"],
              ["existing", "Existing staff account", "Signs in with the staff (SSO) account; assign the role only"],
            ] as const).map(([kind, label, hint]) => (
              <button
                key={kind}
                type="button"
                role="radio"
                aria-checked={accountKind === kind}
                title={hint}
                onClick={() => { setAccountKind(kind); setErrors({}); }}
                className={cn("flex-1 rounded-md px-3 py-1.5 text-[13px] font-semibold transition-colors", accountKind === kind ? "bg-white text-brand-green shadow-sm" : "text-ink-soft hover:text-ink")}
              >
                {label}
              </button>
            ))}
          </div>
        )}
        {isExisting ? (
          <>
            <FormField
              label="Staff user ID"
              htmlFor="uf-staff-id"
              required
              hint={errors.staffUserId ?? "The user's ID in Keycloak (Users → the user → ID), or their DA Services id ending in @iam.internal. They must have signed in once with the staff account."}
              hintTone={errors.staffUserId ? "error" : undefined}
              className={cn(FIELD, "sm:col-span-2")}
            >
              <Input id="uf-staff-id" value={staffUserId} onChange={(e) => { setStaffUserId(e.target.value); clear("staffUserId"); }} placeholder="e.g. 3f2c1d8e-1111-4c3e-9d2f-8b5a1e7c3f90" className={cn(CONTROL, "font-mono")} />
            </FormField>
            <FormField label="Full name" htmlFor="uf-name" hint="Shown in this table only; the name itself comes from the staff account." className={cn(FIELD, "sm:col-span-2")}>
              <Input id="uf-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Hana Alemu" className={CONTROL} />
            </FormField>
          </>
        ) : (
          <>
            <FormField label="Full name" htmlFor="uf-name" required hint={errors.name} hintTone="error" className={cn(FIELD, "sm:col-span-2")}>
              <Input id="uf-name" value={name} onChange={(e) => { setName(e.target.value); clear("name"); }} placeholder="e.g. Hana Alemu" className={CONTROL} />
            </FormField>
            <FormField label="Mobile number" htmlFor="uf-phone" required hint={errors.phone} hintTone="error" className={FIELD}>
              <Input id="uf-phone" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); clear("phone"); }} placeholder="+251 91 234 5678" className={CONTROL} />
            </FormField>
            <FormField label="Email" htmlFor="uf-email" required={!isEdit} hint={errors.email} hintTone="error" className={FIELD}>
              <Input id="uf-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); clear("email"); }} placeholder="name@moa.gov.et" className={CONTROL} />
            </FormField>
          </>
        )}
        {/* A new account always starts active; Status only changes on an existing one. */}
        {isEdit && (
          <FormField label="Status" htmlFor="uf-active" required className={FIELD}>
            <Select id="uf-active" value={active ? "active" : "inactive"} onChange={(e) => setActive(e.target.value === "active")} className={CONTROL}>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </Select>
          </FormField>
        )}
        <FormField label="Role" htmlFor="uf-role" required className={FIELD}>
          <Select id="uf-role" value={role} onChange={(e) => { setRole(e.target.value as Role); clear("daId"); clear("scope"); }} className={CONTROL}>
            {roleOptions.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </Select>
        </FormField>
        {!isEdit && role === "DA" && (
          <FormField label="DA-ID" htmlFor="uf-da-id" required hint={errors.daId} hintTone="error" className={FIELD}>
            <Input id="uf-da-id" value={daId} onChange={(e) => { setDaId(e.target.value); clear("daId"); }} placeholder="e.g. DA-000003" className={CONTROL} />
          </FormField>
        )}
        {!isEdit && !isExisting && (
          <p className="text-[12.5px] text-ink-soft sm:col-span-2">A temporary password is generated when you save. Share it with the user; they sign in with this email.</p>
        )}
      </Section>

      <Section title="Scope">
        <FormField label="Region" htmlFor="uf-region" required={needsScope} hint={errors.scope ?? areasError ?? undefined} hintTone="error" className={FIELD}>
          <Select
            id="uf-region"
            value={needsScope ? regionCode : ""}
            disabled={!needsScope || !areas}
            onChange={(e) => { setRegion(e.target.value); setWoreda(""); clear("scope"); }}
            className={CONTROL}
          >
            {!needsScope ? <option value="">All regions</option> : areas ? regions.map(areaOption) : loadingOption}
          </Select>
        </FormField>
        <FormField label="Woreda" htmlFor="uf-woreda" required={needsWoreda} className={FIELD}>
          <Select
            id="uf-woreda"
            value={needsWoreda ? woredaCode : ""}
            disabled={!needsWoreda || !areas}
            onChange={(e) => { setWoreda(e.target.value); clear("scope"); }}
            className={CONTROL}
          >
            {!needsWoreda ? <option value="">{wideScope ?? "All"}</option> : areas ? woredaOptions.map(areaOption) : loadingOption}
          </Select>
        </FormField>
      </Section>

      <Section title="Effective Date">
        <FormField label="From" htmlFor="uf-from" className={FIELD}>
          <Input id="uf-from" type="date" value={effectiveFrom} onChange={(e) => { setEffectiveFrom(e.target.value); clear("effectiveTo"); }} className={CONTROL} />
        </FormField>
        <FormField label="To" htmlFor="uf-to" hint={errors.effectiveTo} hintTone="error" className={FIELD}>
          <Input id="uf-to" type="date" value={effectiveTo} min={effectiveFrom || undefined} onChange={(e) => { setEffectiveTo(e.target.value); clear("effectiveTo"); }} className={CONTROL} />
        </FormField>
      </Section>
    </Modal>
  );
}
