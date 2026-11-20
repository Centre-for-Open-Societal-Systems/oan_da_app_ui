"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { describeFarmerError, usePlaces, type PlaceLevel } from "@/features/farmers";
import type { StepProps } from "./FarmerStep";

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
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        {LEVELS.map((level, i) => (
          <PlaceSelect
            key={level}
            level={level}
            parent={i === 0 ? undefined : form.places[LEVELS[i - 1]]}
            value={form.places[level] ?? ""}
            error={errors[level]}
            onChange={(id, name) => choose(level, id, name)}
          />
        ))}
      </div>

      <div className="w-full">
        <FormField
          label="GPS location"
          htmlFor="location"
          hint={locating ?? "Latitude and longitude, then altitude and accuracy if known, separated by spaces."}
          hintTone={locating && locating !== "Finding the location…" ? "error" : errors.location ? "error" : "muted"}
        >
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            <div className="relative flex-1">
              <Input
                id="location"
                type="text"
                value={form.location}
                onChange={(e) => update({ location: e.target.value })}
                placeholder="9.03 38.74 2350 5"
                className={cn("h-11 w-full", errors.location && "border-danger")}
                aria-invalid={errors.location ? true : undefined}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={locate}
              disabled={locating === "Finding the location…"}
              className="h-11 shrink-0 px-4 gap-2 text-[13px] font-semibold text-slate-700 hover:text-brand-green hover:border-brand-green border-line transition-all active:scale-95 shadow-2xs whitespace-nowrap"
            >
              <svg className="h-4 w-4 text-brand-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 2a8 8 0 0 0-8 8c0 5.25 8 12 8 12s8-6.75 8-12a8 8 0 0 0-8-8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <span>{locating === "Finding the location…" ? "Detecting location…" : "Use this device's location"}</span>
            </Button>
          </div>
        </FormField>
      </div>
    </div>
  );
}
