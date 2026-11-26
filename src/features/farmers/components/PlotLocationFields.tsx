"use client";

import { useEffect, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { apiPlotToPlot, fetchFarmerLandDetails, resolveFarmerInternalId } from "../farmersApi";
import type { Farmer, Plot } from "../types";
import { EMPTY_LOCATION, parseLocation, registryCode, type PlotLocation } from "./planVisit";

/**
 * The farmer's plots from GET /farmers/{internal_id}/land_details, as the Holdings tab shows them; null while loading.
 * `id` is the internal_record_id, or a Farmer-ID that is looked up in the farmer list first.
 */
function useFarmerPlots(id: string) {
  const [plots, setPlots] = useState<Plot[] | null>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    let current = true;
    resolveFarmerInternalId(id).then(fetchFarmerLandDetails).then(
      (rows) => current && setPlots(rows.map(apiPlotToPlot).filter((p) => p.code)),
      () => {
        if (!current) return;
        setPlots([]);
        setFailed(true);
      },
    );
    return () => {
      current = false;
    };
  }, [id]);
  return { plots, failed };
}

const plotLabel = (p: Plot) => [p.code, p.areaHa ? `${p.areaHa} ha` : null, p.crop !== "—" ? p.crop : null].filter(Boolean).join(" · ");

interface RowProps {
  farmer: Farmer;
  value: PlotLocation;
  onChange: (farmer: Farmer, patch: Partial<PlotLocation>) => void;
  /** Batch: the farmer's name heads their row. */
  showName: boolean;
}

// One farmer's location: the plot (from the registry) and the plot's latitude / longitude (typed; the registry sends no
// coordinates yet). A farmer with one plot gets it picked.
function PlotLocationRow({ farmer, value, onChange, showName }: RowProps) {
  const { plots, failed } = useFarmerPlots(farmer.internalId ?? registryCode(farmer));
  useEffect(() => {
    if (plots?.length === 1 && !value.plotRef) onChange(farmer, { plotRef: plots[0].code });
  }, [plots, value.plotRef, farmer, onChange]);

  const id = (name: string) => `visit-${name}-${farmer.id}`;
  const { error } = parseLocation(value);
  const placeholder = !plots ? "Loading plots…" : failed ? "Plots could not be loaded" : plots.length === 0 ? "No plots registered" : "Select a plot";

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-line p-3">
      {showName && <p className="text-[13.5px] font-semibold text-ink">{farmer.name}</p>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Plot reference" htmlFor={id("plot")} hint="From the farmer's registered plots">
          <Select id={id("plot")} className="h-10" value={value.plotRef} onChange={(e) => onChange(farmer, { plotRef: e.target.value })} disabled={!plots || plots.length === 0}>
            <option value="">{placeholder}</option>
            {plots?.map((p) => (
              <option key={p.code} value={p.code}>
                {plotLabel(p)}
              </option>
            ))}
          </Select>
        </FormField>
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Latitude" htmlFor={id("lat")} hint={error} hintTone={error ? "error" : "muted"}>
            <Input id={id("lat")} className="h-10" inputMode="decimal" placeholder="e.g. 9.1234" value={value.lat} onChange={(e) => onChange(farmer, { lat: e.target.value })} />
          </FormField>
          <FormField label="Longitude" htmlFor={id("lng")}>
            <Input id={id("lng")} className="h-10" inputMode="decimal" placeholder="e.g. 37.5678" value={value.lng} onChange={(e) => onChange(farmer, { lng: e.target.value })} />
          </FormField>
        </div>
      </div>
    </div>
  );
}

interface PlotLocationFieldsProps {
  selected: Farmer[];
  /** Each farmer's location, by farmer id. */
  values: Record<string, PlotLocation>;
  onChange: (farmer: Farmer, patch: Partial<PlotLocation>) => void;
}

// Location of the visit in two parts, Plot reference and the plot's Latitude / Longitude: one row per picked farmer.
export function PlotLocationFields({ selected, values, onChange }: PlotLocationFieldsProps) {
  return (
    <fieldset className="flex flex-col gap-2">
      <legend className="mb-2 text-[14px] font-medium text-ink">Location</legend>
      {selected.length === 0 ? (
        <p className="text-[13px] text-muted">Select a farmer first.</p>
      ) : (
        selected.map((f) => <PlotLocationRow key={f.id} farmer={f} value={values[f.id] ?? EMPTY_LOCATION} onChange={onChange} showName={selected.length > 1} />)
      )}
    </fieldset>
  );
}
