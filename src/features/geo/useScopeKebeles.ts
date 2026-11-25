import { useEffect, useState } from "react";
import { listKbGeo, type KbGeo } from "@/features/communication";
import type { AreaLevel, AreaPreset } from "./areaPreset";
import { useUserAreaPreset } from "./AreaPicker";

const PARENT: Record<AreaLevel, AreaLevel | null> = { region: null, zone: "region", woreda: "zone", kebele: "woreda" };

/**
 * How to read every area of `level` in the user's own area: the parents to list it under (one call each) and, when
 * the user's nearest area is two levels up, the level between to walk first. Null when the list would be country-wide
 * below Region (an Admin's Woredas or Kebeles), which is too long to read.
 */
function plan(level: AreaLevel, preset: AreaPreset): { from: string; via: AreaLevel | null } | null {
  if (level === "region") return { from: "ET", via: null };
  const parent = PARENT[level]!;
  if (preset[parent]) return { from: preset[parent]!.code, via: null };
  // One level further up: e.g. an Executive's Kebeles are those of every Woreda in their Zone.
  const grand = PARENT[parent];
  if (grand && preset[grand]) return { from: preset[grand]!.code, via: parent };
  return null;
}

/**
 * Every area of `level` in the signed-in user's own area, from the geo Master Data (get_master_data), for filter
 * dropdowns: all Kebeles of the user's Woreda (a DA's or a Supervisor's), all Woredas of their Zone, all Zones of their
 * Region, every Region. One level further up is walked too (an Executive's Kebeles: every Woreda of their Zone). Null
 * while loading; empty when the user has no area to read it under (an Admin's Woredas and Kebeles).
 */
export function useScopeAreas(level: AreaLevel): KbGeo[] | null {
  const preset = useUserAreaPreset();
  const steps = plan(level, preset);
  const key = steps ? `${level}:${steps.from}:${steps.via ?? ""}` : null;
  const [loaded, setLoaded] = useState<{ key: string; areas: KbGeo[] } | null>(null);

  useEffect(() => {
    if (!key || !steps) return;
    let live = true;
    const parents = steps.via ? listKbGeo(steps.via, steps.from).then((rows) => rows.map((r) => r.code)) : Promise.resolve([steps.from]);
    parents
      .then((codes) => Promise.allSettled(codes.map((c) => listKbGeo(level, c))))
      .then((lists) => {
        if (!live) return;
        const areas = lists.flatMap((l) => (l.status === "fulfilled" ? l.value : [])).sort((a, b) => a.name.localeCompare(b.name));
        setLoaded({ key, areas });
      })
      .catch(() => live && setLoaded({ key, areas: [] }));
    return () => {
      live = false;
    };
    // key stands for steps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, level]);

  if (!key) return [];
  return loaded && loaded.key === key ? loaded.areas : null;
}

/** Every Kebele of the signed-in user's Woreda (or Zone), from the geo Master Data; see useScopeAreas. */
export const useScopeKebeles = (): KbGeo[] | null => useScopeAreas("kebele");

/** The names of `level`'s areas in the user's own area followed by the values the rows hold, each once: a filter's order. */
export function useScopeAreaNames(level: AreaLevel, rowValues: (string | null | undefined)[]): string[] {
  const areas = useScopeAreas(level);
  return [...new Set([...(areas ?? []).map((a) => a.name), ...rowValues.filter((v): v is string => !!v && v !== "—")])];
}

/**
 * Filter options for an area column: `order` (useScopeAreaNames: the API's areas, then the rows' values), each with how
 * many rows hold it. An area no row holds is listed with 0.
 */
export function areaFilterOptions(values: (string | null | undefined)[], order: string[], label?: (v: string) => string): { value: string; label: string; count: number }[] {
  return order.map((value) => ({ value, label: label ? label(value) : value, count: values.filter((v) => v === value).length }));
}

/** Filter options for an area column: the user's area from the geo Master Data, then the rows' values, with counts. */
export function useAreaFilterOptions(level: AreaLevel, values: (string | null | undefined)[]): { value: string; label: string; count: number }[] {
  const order = useScopeAreaNames(level, values);
  return areaFilterOptions(values, order);
}

/** `fields` with the options of the named keys swapped in (e.g. a Kebele field's options from useAreaFilterOptions). */
export function withFieldOptions<F extends { key: string; options: unknown }>(fields: F[], options: Record<string, F["options"]>): F[] {
  return fields.map((f) => (f.key in options ? { ...f, options: options[f.key] } : f));
}
