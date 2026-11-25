"use client";

import { useEffect } from "react";
import { GEO_LEVELS, useGeoLevels, valueKey, type CropSownFieldDef, type CropSownSectionDef, type CropSownValues, type GeoIds, type GeoKey } from "@/features/farmers";
import { CropSownFieldInput } from "./CropSownFieldInput";

interface CropSownSectionFieldsProps {
  section: CropSownSectionDef;
  values: CropSownValues;
  prefilled: CropSownValues;
  errors: Record<string, string>;
  /** Registry choices for a field (from the intake-form route), if it has any. */
  optionsOf: (sectionId: string, key: string) => string[] | undefined;
  requiredOf: (sectionId: string, key: string) => boolean | undefined;
  /** Sets values: several at once, as picking a region also clears the zone, woreda and kebele below it. */
  onChange: (changes: Record<string, string>) => void;
  /** The geo ids behind the names picked in this section, for the save. */
  onGeoIds: (sectionId: string, ids: GeoIds) => void;
}

const GEO_KEYS = GEO_LEVELS.map((l) => l.key) as readonly string[];
const GEO_FIELDS: CropSownFieldDef[] = GEO_LEVELS.map(({ key }) => ({ key, label: key[0].toUpperCase() + key.slice(1), type: "select" }));

// The fields of one form section. Region, zone, woreda and kebele are chained selects fed by the registry's geo
// levels, in the sections that have them (and the Address section, which is made of just these four).
export function CropSownSectionFields({ section, values, prefilled, errors, optionsOf, requiredOf, onChange, onGeoIds }: CropSownSectionFieldsProps) {
  const isAddress = section.id === "address";
  const hasGeo = isAddress || section.fields.some((f) => f.key === "region");
  const names = Object.fromEntries(GEO_LEVELS.map(({ key }) => [key, values[valueKey(section.id, key)]])) as Record<GeoKey, string | undefined>;
  const { options, ids } = useGeoLevels(hasGeo ? names : {});

  const idsKey = JSON.stringify(ids);
  useEffect(() => {
    if (hasGeo) onGeoIds(section.id, ids);
    // ids is covered by idsKey
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasGeo, idsKey, section.id, onGeoIds]);

  const fields = isAddress ? [...GEO_FIELDS, ...section.fields.filter((f) => !GEO_KEYS.includes(f.key) && f.type !== "geo")] : section.fields;

  return (
    <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
      {fields.map((field) => {
        const k = valueKey(section.id, field.key);
        const level = GEO_LEVELS.findIndex((l) => l.key === field.key);
        return (
          <CropSownFieldInput
            key={k}
            id={k}
            field={field}
            value={values[k] ?? ""}
            onChange={(v) => {
              // A new region/zone/woreda empties the levels below it, whose lists no longer apply.
              const below = level >= 0 ? Object.fromEntries(GEO_LEVELS.slice(level + 1).map((l) => [valueKey(section.id, l.key), ""])) : {};
              onChange({ ...below, [k]: v });
            }}
            error={errors[k]}
            // Registry data stays as fetched; the DA enters only what they observe on the plot.
            autoFilled={k in prefilled}
            options={level >= 0 && hasGeo ? options[field.key as GeoKey] : optionsOf(section.id, field.key)}
            required={requiredOf(section.id, field.key)}
          />
        );
      })}
    </div>
  );
}
