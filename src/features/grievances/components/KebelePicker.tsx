"use client";

import { useEffect, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { listKbGeo, type KbGeo } from "@/features/communication";
import type { AreaLevel, AreaPick, AreaPreset } from "../api";

const LEVELS: { level: AreaLevel; label: string }[] = [
  { level: "region", label: "Region" },
  { level: "zone", label: "Zone" },
  { level: "woreda", label: "Woreda" },
  { level: "kebele", label: "Kebele" },
];

/** The Master Data areas of `level` under `parent` (regions under "ET"); null parent = nothing chosen above yet. */
function useGeo(level: AreaLevel, parent: string | null) {
  const key = parent === null ? null : `${level}:${parent}`;
  const [state, setState] = useState<{ key: string; areas: KbGeo[]; error: boolean } | null>(null);

  useEffect(() => {
    if (parent === null || key === null) return;
    let current = true;
    listKbGeo(level, parent)
      .then((areas) => current && setState({ key, areas, error: false }))
      .catch(() => current && setState({ key, areas: [], error: true }));
    return () => {
      current = false;
    };
  }, [level, parent, key]);

  return state && state.key === key ? state : { areas: null, error: false };
}

interface Props {
  /** The levels fixed by the user's own area (grievanceAreaPreset); shown filled and read-only. */
  preset: AreaPreset;
  /** The chosen Kebele, or null while none is. */
  onChange: (kebele: AreaPick | null) => void;
}

// Region > Zone > Woreda > Kebele from the geo Master Data (get_master_data). Levels in `preset` are filled and
// locked: a DA's whole area down to the Kebele, a Supervisor's down to the Woreda (Kebele picked, required).
export function KebelePicker({ preset, onChange }: Props) {
  const [chosen, setChosen] = useState<Record<AreaLevel, string>>({
    region: preset.region?.code ?? "",
    zone: preset.zone?.code ?? "",
    woreda: preset.woreda?.code ?? "",
    kebele: preset.kebele?.code ?? "",
  });

  const lists = {
    region: useGeo("region", preset.region ? null : "ET"),
    zone: useGeo("zone", preset.zone || !chosen.region ? null : chosen.region),
    woreda: useGeo("woreda", preset.woreda || !chosen.zone ? null : chosen.zone),
    // Read for a preset Kebele too: the Grievance Service takes the Master Data code, which /me's id may not be.
    kebele: useGeo("kebele", chosen.woreda || null),
  };
  const error = Object.values(lists).some((l) => l.error);

  // A preset Kebele is matched in the Master Data list (by code, else by name) and sent with that list's code.
  // Not found there: the Kebele is picked instead.
  const kebeles = lists.kebele.areas;
  const presetKebele = preset.kebele;
  const wanted = presetKebele?.name.trim().toLowerCase();
  // undefined while the list loads; null when the Kebele is not in it. Rows come from the cached list, so stable.
  const matched = !presetKebele || !kebeles
    ? undefined
    : kebeles.find((a) => a.code === presetKebele.code) ?? (wanted ? kebeles.find((a) => a.name.trim().toLowerCase() === wanted) : undefined) ?? null;
  const unmatched = matched === null || (!!presetKebele && lists.kebele.error);
  const effective: AreaPreset = unmatched ? { ...preset, kebele: undefined } : matched ? { ...preset, kebele: { code: matched.code, name: matched.name } } : preset;

  useEffect(() => {
    if (matched) onChange({ code: matched.code, name: matched.name });
  }, [matched, onChange]);

  const choose = (level: AreaLevel, code: string) => {
    const index = LEVELS.findIndex((l) => l.level === level);
    setChosen((prev) => {
      const next = { ...prev, [level]: code };
      LEVELS.slice(index + 1).forEach((l) => (next[l.level] = ""));
      return next;
    });
    if (level === "kebele") {
      const area = lists.kebele.areas?.find((a) => a.code === code);
      onChange(area ? { code: area.code, name: area.name } : null);
    } else onChange(null);
  };

  const locked = LEVELS.filter((l) => effective[l.level]).map((l) => l.label);

  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {LEVELS.map(({ level, label }, i) => {
          const fixed = effective[level];
          const id = `grv-${level}`;
          if (fixed) {
            const resolving = level === "kebele" && matched === undefined;
            return (
              <FormField key={level} label={label} htmlFor={id} required>
                <Select id={id} value={fixed.code} disabled>
                  <option value={fixed.code}>{resolving ? "Loading…" : fixed.name || fixed.code}</option>
                </Select>
              </FormField>
            );
          }
          const parentChosen = i === 0 || !!chosen[LEVELS[i - 1].level];
          const list = lists[level].areas;
          return (
            <FormField key={level} label={label} htmlFor={id} required>
              <Select id={id} value={chosen[level]} disabled={!parentChosen || !list} onChange={(e) => choose(level, e.target.value)}>
                <option value="">{parentChosen && !list ? "Loading…" : `Select ${label.toLowerCase()}`}</option>
                {list?.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}
              </Select>
            </FormField>
          );
        })}
      </div>
      {locked.length > 0 && <p className="text-[12.5px] text-muted">{locked.join(", ")} {locked.length > 1 ? "are" : "is"} from your account.</p>}
      {error && <p className="text-[12.5px] text-danger">Could not load the areas. Please try again.</p>}
    </div>
  );
}
