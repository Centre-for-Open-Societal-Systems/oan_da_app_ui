"use client";

import { useEffect, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { fetchGrievanceAreas, type GrievanceArea } from "../api";

/** The children of `parent` ("" = the regions; null = nothing chosen above yet). */
function useAreas(parent: string | null) {
  const [state, setState] = useState<{ parent: string; areas: GrievanceArea[] | null; error: string | null } | null>(null);

  useEffect(() => {
    if (parent === null) return;
    let current = true;
    fetchGrievanceAreas(parent || undefined)
      .then((areas) => current && setState({ parent, areas, error: null }))
      .catch((err: unknown) => current && setState({ parent, areas: [], error: err instanceof Error ? err.message : "Could not load the areas." }));
    return () => {
      current = false;
    };
  }, [parent]);

  return state?.parent === parent ? state : { areas: null, error: null };
}

function AreaSelect({ id, label, list, value, onChange, enabled }: { id: string; label: string; list: GrievanceArea[] | null; value: string; onChange: (value: string) => void; enabled: boolean }) {
  return (
    <FormField label={label} htmlFor={id} required>
      <Select id={id} value={value} disabled={!enabled || !list} onChange={(e) => onChange(e.target.value)}>
        <option value="">{enabled && !list ? "Loading…" : `Select ${label.toLowerCase()}`}</option>
        {list?.map((a) => <option key={a.area_id} value={a.area_id}>{a.area_name}</option>)}
      </Select>
    </FormField>
  );
}

const WOREDA_CODE = /^ET\d{6}$/;

// Region > Zone > Woreda > Kebele from the Grievance Service's own list: the create call accepts only its Kebele ids.
// With `woredaCode` (a Supervisor's own Woreda) Region, Zone and Woreda are filled from the code and locked: P-codes
// nest by prefix (Region ET04 > Zone ET0401 > Woreda ET040101), so only the Kebele is picked.
export function KebelePicker({ onChange, woredaCode }: { onChange: (kebele: GrievanceArea | null) => void; woredaCode?: string | null }) {
  const fixed = woredaCode && WOREDA_CODE.test(woredaCode) ? woredaCode : null;
  const [region, setRegion] = useState(fixed ? `region-${fixed.slice(0, 4)}` : "");
  const [zone, setZone] = useState(fixed ? `zone-${fixed.slice(0, 6)}` : "");
  const [woreda, setWoreda] = useState(fixed ? `woreda-${fixed}` : "");
  const [kebele, setKebele] = useState("");

  const regions = useAreas("");
  const zones = useAreas(region || null);
  const woredas = useAreas(zone || null);
  const kebeles = useAreas(woreda || null);
  const error = regions.error ?? zones.error ?? woredas.error ?? kebeles.error;

  const clear = () => {
    setKebele("");
    onChange(null);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <AreaSelect id="grv-region" label="Region" list={regions.areas} value={region} enabled={!fixed} onChange={(v) => { setRegion(v); setZone(""); setWoreda(""); clear(); }} />
        <AreaSelect id="grv-zone" label="Zone" list={zones.areas} value={zone} enabled={!fixed && !!region} onChange={(v) => { setZone(v); setWoreda(""); clear(); }} />
        <AreaSelect id="grv-woreda" label="Woreda" list={woredas.areas} value={woreda} enabled={!fixed && !!zone} onChange={(v) => { setWoreda(v); clear(); }} />
        <AreaSelect id="grv-kebele" label="Kebele" list={kebeles.areas} value={kebele} enabled={!!woreda} onChange={(v) => { setKebele(v); onChange(kebeles.areas?.find((a) => a.area_id === v) ?? null); }} />
      </div>
      {fixed && <p className="text-[12.5px] text-muted">Region, Zone and Woreda are from your account.</p>}
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

interface DaKebeleProps {
  /** From the DA's record: their Woreda code and Kebele name. */
  woredaCode: string;
  kebeleName: string;
  onChange: (kebele: GrievanceArea | null) => void;
}

// A DA raising for themselves: their Kebele, read-only. The record's own Kebele code is not one the Grievance Service
// accepts, so the code shown and sent is that Kebele's in the service's list, found by name under the DA's Woreda.
// When the service does not know it, the DA picks the Kebele instead.
export function DaKebele({ woredaCode, kebeleName, onChange }: DaKebeleProps) {
  const known = WOREDA_CODE.test(woredaCode) && !!kebeleName;
  const [found, setFound] = useState<GrievanceArea | null | undefined>(known ? undefined : null);

  useEffect(() => {
    if (!known) return;
    let current = true;
    fetchGrievanceAreas(`woreda-${woredaCode}`)
      .then((areas) => {
        if (!current) return;
        const match = areas.find((a) => a.area_name.trim().toLowerCase() === kebeleName.trim().toLowerCase()) ?? null;
        setFound(match);
        onChange(match);
      })
      .catch(() => current && setFound(null));
    return () => {
      current = false;
    };
  }, [known, woredaCode, kebeleName, onChange]);

  if (found === null) return <KebelePicker onChange={onChange} />;
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
      <FormField label="Kebele code" htmlFor="grv-kebele-code" required hint="From your DA record.">
        <Input id="grv-kebele-code" value={found?.code ?? ""} placeholder="Loading…" disabled />
      </FormField>
      <FormField label="Kebele name" htmlFor="grv-kebele-name" required hint="From your DA record.">
        <Input id="grv-kebele-name" value={found?.area_name ?? kebeleName} disabled />
      </FormField>
    </div>
  );
}
