"use client";

import { useEffect, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Select } from "@/components/ui/Select";
import { FormField } from "@/components/ui/FormField";
import { fetchPlaces, type Place, type PlaceLevel } from "@/features/farmers";
import { LOCATION_HIERARCHY_FIELDS, REGISTRY_TABS } from "../registrySpec";
import { RegistryStep, Section } from "./RegistryStep";

const locationTab = REGISTRY_TABS.find((tab) => tab.key === "location")!;

const LEVELS = LOCATION_HIERARCHY_FIELDS.map((f) => f.name) as PlaceLevel[];

type Picked = Record<PlaceLevel, { id: string; name: string }>;

const pickedFrom = (initial: Record<string, string>) =>
  Object.fromEntries(LEVELS.map((level) => [level, { id: initial[level] ?? "", name: initial[`${level}_name`] ?? "" }])) as Picked;

/**
 * Region › Zone › Woreda › Kebele from the registry's Master Data (GET /registries/farmer/places). Each level keeps its
 * id (the kebele id is what registration sends) and its name in `<level>_name` for the review. `initial` restores a draft.
 */
export function LocationStep({ initial = {} }: { initial?: Record<string, string> }) {
  const [picked, setPicked] = useState<Picked>(() => pickedFrom(initial));
  const [places, setPlaces] = useState<Partial<Record<PlaceLevel, Place[]>>>({});
  const [error, setError] = useState<string | null>(null);

  // Load each level whose parent is chosen (regions straight away); a restored draft refills every list it needs.
  const regionId = picked.region.id;
  const zoneId = picked.zone.id;
  const woredaId = picked.woreda.id;
  useEffect(() => {
    let current = true;
    const parents: [PlaceLevel, string | undefined][] = [["region", undefined], ["zone", regionId], ["woreda", zoneId], ["kebele", woredaId]];
    for (const [level, parent] of parents) {
      if (level !== "region" && !parent) continue;
      fetchPlaces(level, parent)
        .then((list) => current && setPlaces((p) => ({ ...p, [level]: list })))
        .catch((err: unknown) => current && setError(err instanceof Error ? err.message : "Could not load the places."));
    }
    return () => {
      current = false;
    };
  }, [regionId, zoneId, woredaId]);

  // Picking a level clears every level below it, so stale selections don't linger.
  const choose = (level: PlaceLevel, id: string) => {
    const index = LEVELS.indexOf(level);
    const name = places[level]?.find((p) => p.id === id)?.name ?? "";
    setPicked((current) => {
      const next = { ...current, [level]: { id, name } };
      for (const below of LEVELS.slice(index + 1)) next[below] = { id: "", name: "" };
      return next;
    });
    setPlaces((current) => {
      const next = { ...current };
      for (const below of LEVELS.slice(index + 1)) delete next[below];
      return next;
    });
  };

  const path = LEVELS.map((level) => picked[level].name).filter(Boolean).join(" › ");

  const hierarchy = (
    <>
      {error && (
        <Banner tone="error" title="Could not load the location hierarchy" onDismiss={() => setError(null)}>
          {error}
        </Banner>
      )}
      <Section title="Administrative Location" description="Select the region, zone, woreda and kebele from the registry's Master Data.">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
          <div className="flex items-center gap-2.5">
            <span className="text-[14px] font-semibold text-ink">Location hierarchy</span>
            <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-blue-700">One cascading selection</span>
          </div>
          {path && (
            <span className="flex items-center gap-1.5 text-[13px] font-medium text-brand-green">
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z" />
              </svg>
              {path}
            </span>
          )}
        </div>
        <div className="grid grid-cols-1 gap-x-6 gap-y-5 md:grid-cols-2 xl:grid-cols-4">
          {LOCATION_HIERARCHY_FIELDS.map(({ name, label }, index) => {
            const level = name as PlaceLevel;
            const parentChosen = index === 0 || !!picked[LEVELS[index - 1]].id;
            const { id, name: placeName } = picked[level];
            const list = places[level] ?? [];
            // A level is loading while its parent is chosen and its list has not arrived.
            const loading = parentChosen && !places[level] && !error;
            return (
              <FormField key={level} label={label} htmlFor={level} required>
                <input type="hidden" name={`${level}_name`} value={placeName} readOnly />
                <Select id={level} name={level} value={id} disabled={!parentChosen} onChange={(e) => choose(level, e.target.value)}>
                  <option value="" disabled>{loading ? "Loading…" : `Select ${label}`}</option>
                  {/* The restored choice stays selectable until its list arrives. */}
                  {id && !list.some((p) => p.id === id) && <option value={id}>{placeName || id}</option>}
                  {list.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </Select>
              </FormField>
            );
          })}
        </div>
      </Section>
    </>
  );

  return <RegistryStep tab={locationTab} initial={initial} leading={hierarchy} />;
}
