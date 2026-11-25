import { useEffect, useState } from "react";
import { listKbGeo, type KbGeo } from "@/features/communication";
import type { AreaLevel } from "./areaPreset";

/**
 * The geo Master Data areas of `level` under any of `parents` (regions under ["ET"], zones under the chosen regions, …),
 * merged and sorted by name. Null while loading; empty when there is no parent. Lists are cached per page (listKbGeo),
 * and a list that cannot be read is left out.
 */
export function useGeoChildren(level: AreaLevel, parents: string[]): KbGeo[] | null {
  const key = [...new Set(parents.filter(Boolean))].sort().join(",");
  const [loaded, setLoaded] = useState<{ key: string; areas: KbGeo[] } | null>(null);

  useEffect(() => {
    if (!key) return;
    let live = true;
    Promise.allSettled(key.split(",").map((p) => listKbGeo(level, p))).then((lists) => {
      if (!live) return;
      const areas = lists.flatMap((l) => (l.status === "fulfilled" ? l.value : [])).sort((a, b) => a.name.localeCompare(b.name));
      setLoaded({ key: `${level}:${key}`, areas });
    });
    return () => {
      live = false;
    };
  }, [level, key]);

  if (!key) return [];
  return loaded && loaded.key === `${level}:${key}` ? loaded.areas : null;
}
