"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { describeFarmerError, usePlaces, type PlaceLevel } from "@/features/farmers";
import type { StepProps } from "./FarmerStep";
import { Grid, TextField } from "./fields";

const LEVELS: PlaceLevel[] = ["region", "zone", "woreda", "kebele"];
const title = (level: PlaceLevel) => level[0].toUpperCase() + level.slice(1);

/** One level of the cascade: its places come from the registry under the level chosen above it. */
function PlaceSelect({ level, parent, value, error, onChange }: { level: PlaceLevel; parent: string | undefined; value: string; error?: string; onChange: (id: string, name: string) => void }) {
  const { places, error: loadError, loading } = usePlaces(level, parent);
  const waiting = level !== "region" && !parent;
  const hint = error ?? (loadError ? describeFarmerError(loadError) : waiting ? `Choose the ${LEVELS[LEVELS.indexOf(level) - 1]} first.` : undefined);
  return (
    <FormField label={title(level)} htmlFor={level} required hint={hint} hintTone={error || loadError ? "error" : "muted"}>
      <Select
        id={level}
        value={value}
        disabled={!places}
        onChange={(e) => onChange(e.target.value, places?.find((p) => p.id === e.target.value)?.name ?? "")}
        aria-invalid={error ? true : undefined}
      >
        <option value="">{loading ? "Loading…" : `Select ${level}`}</option>
        {places?.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </Select>
    </FormField>
  );
}

export function LocationStep({ form, update, errors }: StepProps) {
  const [locating, setLocating] = useState<string | null>(null);

  // Choosing a level clears the ones below it: their lists belong to the old choice.
  const choose = (level: PlaceLevel, id: string, name: string) => {
    const below = LEVELS.slice(LEVELS.indexOf(level) + 1);
    const places = { ...form.places, [level]: id || undefined };
    const placeNames = { ...form.placeNames, [level]: name || undefined };
    for (const l of below) {
      delete places[l];
      delete placeNames[l];
    }
    update({ places, placeNames });
  };

  // "latitude longitude altitude accuracy", the shape the registry takes (e.g. "9.03 38.74 2350 5").
  const locate = () => {
    if (!navigator.geolocation) return setLocating("This device cannot give a location.");
    setLocating("Finding the location…");
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => {
        const parts = [coords.latitude.toFixed(6), coords.longitude.toFixed(6), coords.altitude !== null ? Math.round(coords.altitude) : null, Math.round(coords.accuracy)];
        update({ location: parts.filter((p) => p !== null).join(" ") });
        setLocating(null);
      },
      (err) => setLocating(err.message || "The location could not be read."),
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  return (
    <>
      <Grid className="xl:grid-cols-4">
        {LEVELS.map((level, i) => (
          <PlaceSelect key={level} level={level} parent={i === 0 ? undefined : form.places[LEVELS[i - 1]]} value={form.places[level] ?? ""} error={errors[level]} onChange={(id, name) => choose(level, id, name)} />
        ))}
      </Grid>
      <Grid>
        <TextField id="location" label="GPS location" value={form.location} onChange={(v) => update({ location: v })} error={errors.location} hint={locating ?? "Latitude, longitude, altitude and accuracy, separated by spaces."} placeholder="9.03 38.74 2350 5" />
        <div className="flex items-end">
          <Button type="button" variant="outline" onClick={locate} className="h-11">
            Use this device&apos;s location
          </Button>
        </div>
      </Grid>
    </>
  );
}
