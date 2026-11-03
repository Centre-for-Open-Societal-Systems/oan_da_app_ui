"use client";

import { EMPTY_CROP, EMPTY_LAND, EMPTY_LIVESTOCK, type CropRow, type LandRow, type LivestockRow } from "../registration";
import type { StepProps } from "./FarmerStep";
import { Grid, OptionField, RowList, TextField } from "./fields";

export function HoldingsStep({ form, update, errors, options, optionsLoading }: StepProps) {
  const choice = { options, loading: optionsLoading };
  const setLand = (i: number, patch: Partial<LandRow>) => update({ lands: form.lands.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const setCrop = (i: number, patch: Partial<CropRow>) => update({ crops: form.crops.map((r, j) => (j === i ? { ...r, ...patch } : r)) });
  const setAnimal = (i: number, patch: Partial<LivestockRow>) => update({ livestock: form.livestock.map((r, j) => (j === i ? { ...r, ...patch } : r)) });

  return (
    <>
      <RowList
        title="Land parcel"
        rows={form.lands}
        addLabel="Add parcel"
        onAdd={() => update({ lands: [...form.lands, { ...EMPTY_LAND }] })}
        onRemove={(i) => update({ lands: form.lands.filter((_, j) => j !== i) })}
        render={(row, i) => (
          <Grid>
            <OptionField id={`lands.${i}.ownership`} label="Ownership" list="ownership" required {...choice} value={row.ownership} onChange={(v) => setLand(i, { ownership: v })} error={errors[`lands.${i}.ownership`]} />
            <TextField id={`lands.${i}.area_hectare`} label="Area (ha)" type="number" inputMode="decimal" required value={row.area_hectare} onChange={(v) => setLand(i, { area_hectare: v })} error={errors[`lands.${i}.area_hectare`]} />
          </Grid>
        )}
      />
      <RowList
        title="Crop"
        rows={form.crops}
        addLabel="Add crop"
        onAdd={() => update({ crops: [...form.crops, { ...EMPTY_CROP }] })}
        onRemove={(i) => update({ crops: form.crops.filter((_, j) => j !== i) })}
        render={(row, i) => (
          <Grid>
            <OptionField id={`crops.${i}.name`} label="Crop" list="crop" required {...choice} value={row.name} onChange={(v) => setCrop(i, { name: v })} error={errors[`crops.${i}.name`]} />
            <TextField id={`crops.${i}.planted_date`} label="Planted date" type="date" value={row.planted_date} onChange={(v) => setCrop(i, { planted_date: v })} error={errors[`crops.${i}.planted_date`]} />
            <OptionField id={`crops.${i}.season`} label="Season" list="season" {...choice} value={row.season} onChange={(v) => setCrop(i, { season: v })} error={errors[`crops.${i}.season`]} />
          </Grid>
        )}
      />
      <RowList
        title="Livestock"
        rows={form.livestock}
        addLabel="Add animal"
        onAdd={() => update({ livestock: [...form.livestock, { ...EMPTY_LIVESTOCK }] })}
        onRemove={(i) => update({ livestock: form.livestock.filter((_, j) => j !== i) })}
        render={(row, i) => (
          <Grid>
            <OptionField id={`livestock.${i}.animal`} label="Animal" list="animal" required {...choice} value={row.animal} onChange={(v) => setAnimal(i, { animal: v })} error={errors[`livestock.${i}.animal`]} />
            <TextField id={`livestock.${i}.count`} label="Count" type="number" inputMode="numeric" required value={row.count} onChange={(v) => setAnimal(i, { count: v })} error={errors[`livestock.${i}.count`]} />
            <OptionField id={`livestock.${i}.system`} label="System" list="livestock_system" {...choice} value={row.system} onChange={(v) => setAnimal(i, { system: v })} error={errors[`livestock.${i}.system`]} />
          </Grid>
        )}
      />
    </>
  );
}
