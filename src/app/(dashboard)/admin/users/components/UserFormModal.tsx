"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { cn } from "@/lib/utils";
import { fetchPlaces, type Place } from "@/features/farmers";
import { ASSIGNABLE_ROLES } from "@/features/users";
import { ROLE_LABELS, ROLES, type Role } from "@/lib/rbac";

/** Everything the Add and Edit user forms capture (dates are display strings, e.g. "12 Mar 2019"; "—" = open-ended). */
export interface UserFormValues {
  name: string;
  phone: string;
  email: string;
  role: Role;
  /** DA-ID the Development Agent assignment is bound to; empty for other roles. */
  daId: string;
  active: boolean;
  regionScope: string;
  woredaScope: string;
  effectiveFrom: string;
  effectiveTo: string;
}

const ALL_REGIONS = "All regions";

/** Every Woreda of a Region, across its Zones, from the registry's Master Data; sorted by name. */
async function woredasOf(regionId: string): Promise<Place[]> {
  const zones = await fetchPlaces("zone", regionId);
  const lists = await Promise.all(zones.map((zone) => fetchPlaces("woreda", zone.id)));
  return lists.flat().sort((a, b) => a.name.localeCompare(b.name));
}

/**
 * Regions and the chosen Region's Woredas from Master Data (GET /registries/farmer/places). Scope is saved by *name*,
 * the way the Farmer Registry names areas, so a DA's farmers can be matched to it.
 */
function useScopePlaces(region: string) {
  const [regions, setRegions] = useState<Place[]>([]);
  const [woredas, setWoredas] = useState<{ region: string; list: Place[] } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    fetchPlaces("region")
      .then((list) => current && setRegions(list))
      .catch((err: unknown) => current && setError(err instanceof Error ? err.message : "Could not load the regions."));
    return () => {
      current = false;
    };
  }, []);

  const regionId = regions.find((r) => r.name === region)?.id;
  useEffect(() => {
    if (!regionId) return;
    let current = true;
    woredasOf(regionId)
      .then((list) => current && setWoredas({ region, list }))
      .catch((err: unknown) => current && setError(err instanceof Error ? err.message : "Could not load the woredas."));
    return () => {
      current = false;
    };
  }, [regionId, region]);

  return { regions, woredas: woredas?.region === region ? woredas.list : null, error };
}

// Region-wide roles are not tied to a single Woreda.
const WIDE_SCOPE: Record<Role, string | null> = { DA: null, Supervisor: null, Executive: "All (read)", Admin: "All", CommsOfficer: null, SuperAdmin: "All" };

const toIso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const today = () => toIso(new Date());
const formatDate = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
/** "12 Mar 2019" → "2019-03-12"; anything unparseable ("—") → "". */
export const parseDisplayDate = (value: string) => {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? "" : toIso(d);
};

type ErrorKey = "name" | "phone" | "email" | "daId" | "region" | "woreda" | "effectiveTo";
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
export function UserFormModal({ mode, initial, subtitle, onClose, onSave }: UserFormModalProps) {
  const [name, setName] = useState(initial?.name ?? "");
  const [phone, setPhone] = useState(initial?.phone ?? "");
  const [email, setEmail] = useState(initial?.email ?? "");
  const [role, setRole] = useState<Role>(initial?.role ?? "DA");
  const [daId, setDaId] = useState(initial?.daId ?? "");
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [active, setActive] = useState(initial?.active ?? true);
  const [region, setRegion] = useState(initial && initial.regionScope !== ALL_REGIONS ? initial.regionScope : "");
  const [woreda, setWoreda] = useState(initial?.woredaScope ?? "");
  const scope = useScopePlaces(region);
  const [effectiveFrom, setEffectiveFrom] = useState(initial ? parseDisplayDate(initial.effectiveFrom) : "");
  const [effectiveTo, setEffectiveTo] = useState(initial ? parseDisplayDate(initial.effectiveTo) : "");
  const [errors, setErrors] = useState<Errors>({});

  const isEdit = mode === "edit";
  const wideScope = WIDE_SCOPE[role];
  // A new account is created on the backend, which signs in by email and hands out four roles (not Admin).
  const roleOptions: readonly Role[] = isEdit ? ROLES.filter((r) => r !== "SuperAdmin") : ASSIGNABLE_ROLES;

  const submit = async () => {
    if (saving) return;
    const next: Errors = {};
    if (name.trim().length < 3) next.name = "Enter the user's full name";
    if (!/^\+?251\s?9\d(\s?\d){7}$/.test(phone.trim())) next.phone = "Use an Ethiopian mobile number, e.g. +251 91 234 5678";
    if (!isEdit && !email.trim()) next.email = "Enter the email the user will sign in with";
    else if (email.trim() && !/^\S+@\S+\.\S+$/.test(email.trim())) next.email = "Enter a valid email";
    if (!isEdit && role === "DA" && !daId.trim()) next.daId = "Enter the DA-ID this agent is bound to";
    if (role !== "Admin" && !region) next.region = "Pick the region";
    if (!wideScope && !woreda) next.woreda = "Pick the woreda";
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
        active,
        regionScope: role === "Admin" ? ALL_REGIONS : region,
        woredaScope: wideScope ?? woreda,
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
        <FormField label="Full name" htmlFor="uf-name" required hint={errors.name} hintTone="error" className={cn(FIELD, "sm:col-span-2")}>
          <Input id="uf-name" value={name} onChange={(e) => { setName(e.target.value); clear("name"); }} placeholder="e.g. Hana Alemu" className={CONTROL} />
        </FormField>
        <FormField label="Mobile number" htmlFor="uf-phone" required hint={errors.phone} hintTone="error" className={FIELD}>
          <Input id="uf-phone" type="tel" value={phone} onChange={(e) => { setPhone(e.target.value); clear("phone"); }} placeholder="+251 91 234 5678" className={CONTROL} />
        </FormField>
        <FormField label="Email" htmlFor="uf-email" required={!isEdit} hint={errors.email} hintTone="error" className={FIELD}>
          <Input id="uf-email" type="email" value={email} onChange={(e) => { setEmail(e.target.value); clear("email"); }} placeholder="name@moa.gov.et" className={CONTROL} />
        </FormField>
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
          <Select id="uf-role" value={role} onChange={(e) => { setRole(e.target.value as Role); clear("daId"); }} className={CONTROL}>
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
        {!isEdit && (
          <p className="text-[12.5px] text-ink-soft sm:col-span-2">A temporary password is generated when you save. Share it with the user; they sign in with this email.</p>
        )}
      </Section>

      <Section title="Scope">
        {scope.error && (
          <div className="sm:col-span-2">
            <ErrorAlert message={`Could not load the location list: ${scope.error}`} />
          </div>
        )}
        <FormField label="Region" htmlFor="uf-region" required hint={errors.region} hintTone="error" className={FIELD}>
          <Select
            id="uf-region"
            value={role === "Admin" ? ALL_REGIONS : region}
            disabled={role === "Admin"}
            onChange={(e) => { setRegion(e.target.value); setWoreda(""); clear("region"); }}
            className={CONTROL}
          >
            {role === "Admin" ? (
              <option value={ALL_REGIONS}>{ALL_REGIONS}</option>
            ) : (
              <>
                <option value="" disabled>{scope.regions.length ? "Select region" : "Loading…"}</option>
                {/* A saved region stays selectable before (or without) a Master Data match. */}
                {region && !scope.regions.some((r) => r.name === region) && <option value={region}>{region}</option>}
                {scope.regions.map((r) => <option key={r.id} value={r.name}>{r.name}</option>)}
              </>
            )}
          </Select>
        </FormField>
        <FormField label="Woreda" htmlFor="uf-woreda" required hint={errors.woreda} hintTone="error" className={FIELD}>
          <Select id="uf-woreda" value={wideScope ?? woreda} disabled={!!wideScope || !region} onChange={(e) => { setWoreda(e.target.value); clear("woreda"); }} className={CONTROL}>
            {wideScope ? (
              <option value={wideScope}>{wideScope}</option>
            ) : (
              <>
                <option value="" disabled>{!region ? "Pick a region first" : scope.woredas ? "Select woreda" : "Loading…"}</option>
                {woreda && !scope.woredas?.some((w) => w.name === woreda) && <option value={woreda}>{woreda}</option>}
                {scope.woredas?.map((w) => <option key={w.id} value={w.name}>{w.name}</option>)}
              </>
            )}
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
