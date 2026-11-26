"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { listKbGeo, type KbGeo } from "@/features/communication";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { AREA_LABELS, AREA_LEVELS, levelsDownTo, userAreaPreset, type AreaLevel, type AreaPick, type AreaPreset, type AreaSelection } from "./areaPreset";

/** The geo Master Data areas of `level` under `parent` (regions under "ET"); null parent = nothing to read yet. */
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

  return state && state.key === key ? state : { areas: null as KbGeo[] | null, error: false };
}

/** Every area lies in Ethiopia: Regions are listed under its code. */
const COUNTRY = "ET";

/** The signed-in user's area preset (userAreaPreset of their role and /me location). */
export function useUserAreaPreset(): AreaPreset {
  const role = useAuthStore((s) => s.role);
  const location = useAuthStore((s) => s.profile?.location);
  return useMemo(() => userAreaPreset(role, location), [role, location]);
}

interface Level {
  level: AreaLevel;
  /** Filled from the account and read-only. */
  locked: boolean;
  /** Locked, but the Master Data list that names it is still loading. */
  resolving: boolean;
  code: string;
  name: string;
  /** Options to pick from (unlocked levels); null while loading or before the level above is chosen. */
  options: KbGeo[] | null;
  parentChosen: boolean;
}

interface Props {
  /** The deepest level the form asks for. */
  depth: AreaLevel;
  /** Levels filled and locked; defaults to the signed-in user's own area (useUserAreaPreset). */
  preset?: AreaPreset;
  /** Codes the unlocked levels start on (e.g. a record being edited); they stay editable. */
  initial?: Partial<Record<AreaLevel, string>>;
  /** Marks every level as required. */
  required?: boolean;
  /** Prefix of the fields' ids, e.g. "grv" gives "grv-region". */
  idPrefix: string;
  onChange: (selection: AreaSelection) => void;
  /** Shows only the levels /me leaves empty: the account's own levels get no field, and a line under the fields names them instead. */
  hideLocked?: boolean;
  /** An error shown under the fields, e.g. a failed "required" check. */
  error?: string;
  className?: string;
  fieldClassName?: string;
  controlClassName?: string;
}

/**
 * Region > Zone > Woreda (> Kebele) from the geo Master Data (GET /get_master_data?data_type=geo). The levels
 * the account fixes (the preset, from /me) are shown filled and locked; the levels /me leaves empty are picked, each
 * listing the areas under the one above. A locked level is checked against the Master Data (by code, else by name);
 * one not found there is picked instead, with every level below it.
 */
export function AreaPicker({ depth, preset: presetProp, initial, required, idPrefix, onChange, hideLocked = false, error, className, fieldClassName, controlClassName }: Props) {
  const userPreset = useUserAreaPreset();
  const preset = presetProp ?? userPreset;
  const levels = levelsDownTo(depth);
  const asked = (level: AreaLevel) => levels.includes(level);
  const [chosen, setChosen] = useState<Partial<Record<AreaLevel, string>>>(() => ({ ...initial }));

  // One level from its Master Data list and the level above; called in order, so each sees its parent resolved.
  const resolve = (level: AreaLevel, list: { areas: KbGeo[] | null; error: boolean }, parent: Level | null): Level => {
    const parentChosen = level === "region" || !!parent?.code;
    const fixed = preset[level];
    if (fixed && asked(level) && (level === "region" || parent?.locked)) {
      if (!list.areas && !list.error) return { level, locked: true, resolving: true, code: fixed.code, name: fixed.name, options: null, parentChosen };
      if (list.error) return { level, locked: true, resolving: false, code: fixed.code, name: fixed.name, options: null, parentChosen };
      const wanted = fixed.name.trim().toLowerCase();
      const match = list.areas!.find((a) => a.code === fixed.code) ?? (wanted ? list.areas!.find((a) => a.name.trim().toLowerCase() === wanted) : undefined);
      if (match) return { level, locked: true, resolving: false, code: match.code, name: match.name, options: null, parentChosen };
    }
    const code = chosen[level] ?? "";
    const name = list.areas?.find((a) => a.code === code)?.name ?? "";
    return { level, locked: false, resolving: false, code, name, options: list.areas, parentChosen };
  };

  const parentOf = (level: Level) => (level.code && !level.resolving ? level.code : null);
  const regionList = useGeo("region", COUNTRY);
  const region = resolve("region", regionList, null);
  const zoneList = useGeo("zone", asked("zone") ? parentOf(region) : null);
  const zone = resolve("zone", zoneList, region);
  const woredaList = useGeo("woreda", asked("woreda") ? parentOf(zone) : null);
  const woreda = resolve("woreda", woredaList, zone);
  const kebeleList = useGeo("kebele", asked("kebele") ? parentOf(woreda) : null);
  const kebele = resolve("kebele", kebeleList, woreda);
  const rows = [region, zone, woreda, kebele].filter((l) => asked(l.level));
  const loadError = [regionList, zoneList, woredaList, kebeleList].some((l) => l.error);

  // The selection as the form reads it: a level counts once it has a code (and is not still being checked).
  const selection = Object.fromEntries(
    AREA_LEVELS.map((l) => {
      const row = rows.find((r) => r.level === l);
      return [l, row && row.code && !row.resolving ? ({ code: row.code, name: row.name || row.code } satisfies AreaPick) : null];
    }),
  ) as AreaSelection;
  const selectionKey = AREA_LEVELS.map((l) => `${selection[l]?.code ?? ""}:${selection[l]?.name ?? ""}`).join("|");
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  });
  useEffect(() => {
    onChangeRef.current(selection);
    // selectionKey stands for selection.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectionKey]);

  const choose = (level: AreaLevel, code: string) => {
    const below = AREA_LEVELS.slice(AREA_LEVELS.indexOf(level) + 1);
    setChosen((prev) => ({ ...prev, [level]: code, ...Object.fromEntries(below.map((l) => [l, ""])) }));
  };

  const locked = rows.filter((r) => r.locked).map((r) => AREA_LABELS[r.level]);
  const shownRows = hideLocked ? rows.filter((r) => !r.locked) : rows;
  // With hideLocked: "Oromia › West Shewa" for the levels the account fixes.
  const accountArea = rows.filter((r) => r.locked).map((r) => (r.resolving && !r.name ? "…" : r.name || r.code));

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      {shownRows.length > 0 && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {shownRows.map((row) => {
          const label = AREA_LABELS[row.level];
          const id = `${idPrefix}-${row.level}`;
          if (row.locked) {
            return (
              <FormField key={row.level} label={label} htmlFor={id} required={required} className={fieldClassName}>
                <Select id={id} value={row.code} disabled className={controlClassName}>
                  <option value={row.code}>{row.resolving && !row.name ? "Loading…" : row.name || row.code}</option>
                </Select>
              </FormField>
            );
          }
          const loading = row.parentChosen && !row.options;
          return (
            <FormField key={row.level} label={label} htmlFor={id} required={required} className={fieldClassName}>
              <Select id={id} value={row.code} disabled={!row.parentChosen || !row.options} onChange={(e) => choose(row.level, e.target.value)} className={controlClassName}>
                <option value="">
                  {loading ? "Loading…" : row.parentChosen ? (row.options?.length ? `Select ${label.toLowerCase()}` : `No ${label.toLowerCase()} found`) : `Select the ${AREA_LABELS[AREA_LEVELS[AREA_LEVELS.indexOf(row.level) - 1]].toLowerCase()} first`}
                </option>
                {row.options?.map((a) => <option key={a.code} value={a.code}>{a.name}</option>)}
              </Select>
            </FormField>
          );
        })}
      </div>
      )}
      {hideLocked
        ? accountArea.length > 0 && <p className="text-[12.5px] text-muted">Your area (from your account): <span className="font-medium text-ink">{accountArea.join(" › ")}</span></p>
        : locked.length > 0 && <p className="text-[12.5px] text-muted">{locked.join(", ")} {locked.length > 1 ? "are" : "is"} from your account.</p>}
      {loadError && <p className="text-[12.5px] text-danger">Could not load the areas. Please try again.</p>}
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}
