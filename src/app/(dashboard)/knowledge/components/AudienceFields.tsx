"use client";

import { useEffect, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { listKbGeo, type KbAudienceScope, type KbGeo, type KbGeoLevel } from "@/features/communication";
import type { Role } from "@/lib/rbac";

/**
 * The audience picked in the form. One area per level (empty = everything under the level above), plus
 * `woredas` (Executive: several Woredas of their Zone) and `kebeles` (several Kebeles of the Woreda).
 */
export interface AudienceDraft {
  region: string;
  zone: string;
  woreda: string;
  woredas: string[];
  kebeles: string[];
}

export interface UserScope {
  regions: string[];
  zones: string[];
  woredas: string[];
}

const EMPTY: AudienceDraft = { region: "", zone: "", woreda: "", woredas: [], kebeles: [] };
const codes = (saved: KbAudienceScope[] | undefined, key: "woreda" | "kebele") => Array.from(new Set((saved ?? []).map((s) => s[key]).filter((c): c is string => !!c)));

/**
 * Starting audience, from the signed-in user's scope (GET /me):
 *  - Supervisor: their own Woreda (with its Zone and Region), fixed.
 *  - Executive: their own Zone (with its Region), fixed.
 *  - Admin: nothing (whole country).
 * An edited item starts from its saved scopes (within the fixed part).
 */
export function initialAudience(role: Role | null, scope: UserScope | undefined, saved?: KbAudienceScope[]): AudienceDraft {
  const first = saved?.[0];
  if (role === "Supervisor") {
    return { ...EMPTY, region: scope?.regions[0] ?? "", zone: scope?.zones[0] ?? "", woreda: scope?.woredas[0] ?? "", kebeles: codes(saved, "kebele") };
  }
  if (role === "Executive") {
    return { ...EMPTY, region: scope?.regions[0] ?? "", zone: scope?.zones[0] ?? "", woredas: codes(saved, "woreda") };
  }
  if (!first) return { ...EMPTY };
  return { ...EMPTY, region: first.region || "", zone: first.zone || "", woreda: first.woreda || "", kebeles: codes(saved, "kebele") };
}

/** The draft as audience_scopes: one row per Kebele / Woreda picked, else one row for the narrowest level, else [] (everyone). */
export function audienceScopes(d: AudienceDraft): KbAudienceScope[] {
  const base: KbAudienceScope = {};
  if (d.region) base.region = d.region;
  if (d.zone) base.zone = d.zone;
  if (d.woreda) base.woreda = d.woreda;
  if (d.woreda && d.kebeles.length) return d.kebeles.map((kebele) => ({ ...base, kebele }));
  if (!d.woreda && d.woredas.length) return d.woredas.map((woreda) => ({ ...base, woreda }));
  return d.region ? [base] : [];
}

/** Areas of one level under `parent`; undefined while loading, [] when there is no parent or the call fails. */
function useGeo(level: KbGeoLevel, parent: string | undefined): KbGeo[] | undefined {
  const [loaded, setLoaded] = useState<{ key: string; items: KbGeo[] } | null>(null);
  const key = `${level}:${parent ?? ""}`;
  useEffect(() => {
    if (!parent) return;
    let live = true;
    listKbGeo(level, parent).then((items) => live && setLoaded({ key, items }), () => live && setLoaded({ key, items: [] }));
    return () => {
      live = false;
    };
  }, [level, parent, key]);
  if (!parent) return [];
  return loaded?.key === key ? loaded.items : undefined;
}

const nameOf = (list: KbGeo[] | undefined, code: string) => list?.find((a) => a.code === code)?.name ?? code;
const loadingHint = (list: KbGeo[] | undefined, empty: string) => (list === undefined ? "Loading…" : list.length === 0 ? empty : undefined);
const LOCKED = "cursor-not-allowed bg-surface text-ink-soft";

function Multi({ id, label, items, selected, onChange, hint, placeholder }: { id: string; label: string; items: KbGeo[] | undefined; selected: string[]; onChange: (codes: string[]) => void; hint: string; placeholder: string }) {
  return (
    <FormField label={label} htmlFor={id} hint={hint}>
      <MultiSelectDropdown id={id} placeholder={placeholder} options={(items ?? []).map((a) => a.name)} selected={selected.map((c) => nameOf(items, c))}
        onChange={(names) => onChange(names.map((n) => items?.find((a) => a.name === n)?.code ?? n))} disabled={!items?.length} />
    </FormField>
  );
}

/**
 * Audience by role (areas from get_master_data):
 *  - Supervisor: Woreda fixed to their own; picks Kebeles of it.
 *  - Executive: Zone fixed to their own; picks Woredas of it.
 *  - Admin: picks Region → Zone → Woreda → Kebeles; each level optional (empty = everything under the one above).
 */
export function AudienceFields({ role, value, onChange }: { role: Role | null; value: AudienceDraft; onChange: (d: AudienceDraft) => void }) {
  const isSupervisor = role === "Supervisor";
  const isExecutive = role === "Executive";

  const regions = useGeo("region", "ET");
  const zones = useGeo("zone", value.region || undefined);
  const woredas = useGeo("woreda", value.zone || undefined);
  const kebeles = useGeo("kebele", value.woreda || undefined);

  const set = (patch: Partial<AudienceDraft>) => onChange({ ...value, ...patch });
  const kebeleHint = !value.woreda ? "Pick a Woreda first." : loadingHint(kebeles, "No kebeles found.") ?? (value.kebeles.length ? `${value.kebeles.length} selected` : "None selected = whole Woreda.");

  if (isSupervisor) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Woreda" htmlFor="kb-woreda" hint={value.woreda ? "Your assigned Woreda." : "No Woreda assigned to you."}>
          <Input id="kb-woreda" value={value.woreda ? nameOf(woredas, value.woreda) : "—"} readOnly aria-readonly="true" tabIndex={-1} className={LOCKED} />
        </FormField>
        <Multi id="kb-kebele" label="Kebele" placeholder="All kebeles" items={kebeles} selected={value.kebeles} onChange={(kebeles) => set({ kebeles })} hint={kebeleHint} />
      </div>
    );
  }

  if (isExecutive) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Zone" htmlFor="kb-zone" hint={value.zone ? "Your assigned Zone." : "No Zone assigned to you."}>
          <Input id="kb-zone" value={value.zone ? nameOf(zones, value.zone) : "—"} readOnly aria-readonly="true" tabIndex={-1} className={LOCKED} />
        </FormField>
        <Multi id="kb-woredas" label="Woreda" placeholder="All woredas" items={woredas} selected={value.woredas} onChange={(woredas) => set({ woredas })}
          hint={!value.zone ? "No Zone assigned to you." : loadingHint(woredas, "No woredas found.") ?? (value.woredas.length ? `${value.woredas.length} selected` : "None selected = whole Zone.")} />
      </div>
    );
  }

  // Admin (and any other writer): the full cascade.
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Region" htmlFor="kb-region" hint={loadingHint(regions, "No regions found.") ?? (value.region ? undefined : "None selected = all regions.")}>
        <Select id="kb-region" value={value.region} disabled={!regions?.length} onChange={(e) => onChange({ ...EMPTY, region: e.target.value })}>
          <option value="">All regions</option>
          {(regions ?? []).map((r) => <option key={r.code} value={r.code}>{r.name}</option>)}
        </Select>
      </FormField>
      <FormField label="Zone" htmlFor="kb-zone" hint={!value.region ? "Pick a Region first." : loadingHint(zones, "No zones found.") ?? (value.zone ? undefined : "None selected = whole Region.")}>
        <Select id="kb-zone" value={value.zone} disabled={!zones?.length} onChange={(e) => set({ zone: e.target.value, woreda: "", kebeles: [] })}>
          <option value="">All zones</option>
          {(zones ?? []).map((z) => <option key={z.code} value={z.code}>{z.name}</option>)}
        </Select>
      </FormField>
      <FormField label="Woreda" htmlFor="kb-woreda" hint={!value.zone ? "Pick a Zone first." : loadingHint(woredas, "No woredas found.") ?? (value.woreda ? undefined : "None selected = whole Zone.")}>
        <Select id="kb-woreda" value={value.woreda} disabled={!woredas?.length} onChange={(e) => set({ woreda: e.target.value, kebeles: [] })}>
          <option value="">All woredas</option>
          {(woredas ?? []).map((w) => <option key={w.code} value={w.code}>{w.name}</option>)}
        </Select>
      </FormField>
      <Multi id="kb-kebele" label="Kebele" placeholder="All kebeles" items={kebeles} selected={value.kebeles} onChange={(kebeles) => set({ kebeles })} hint={kebeleHint} />
    </div>
  );
}
