"use client";

import { useEffect, useState } from "react";
import { fetchGeoLevelValues, type ApiGeoValue } from "./cropSownApi";
import { fetchLivestockGeoLevelValues } from "./livestockApi";

/** Which registry's geo-level route answers: the two have their own. */
export type GeoSource = "crop-sown" | "livestock";

/** The four geo levels of the registry, top down: l1 region, l2 zone, l3 woreda, l4 kebele. */
export const GEO_LEVELS = [
  { key: "region", level: "l1" },
  { key: "zone", level: "l2" },
  { key: "woreda", level: "l3" },
  { key: "kebele", level: "l4" },
] as const;
export type GeoKey = (typeof GEO_LEVELS)[number]["key"];

/** Names picked in the form, one per level. */
export type GeoNames = Partial<Record<GeoKey, string>>;
/** The registry (Master Data) ids behind those names. */
export type GeoIds = Partial<Record<GeoKey, string>>;

const cache = new Map<string, Promise<ApiGeoValue[]>>();
/** The values of one level (under `parent` for l2–l4), once per page; a failed read is tried again next time. */
function geoValues(source: GeoSource, level: string, parent?: string): Promise<ApiGeoValue[]> {
  const key = `${source}:${level}:${parent ?? ""}`;
  let found = cache.get(key);
  if (!found) {
    found = (source === "livestock" ? fetchLivestockGeoLevelValues : fetchGeoLevelValues)(level, parent).catch((err) => {
      cache.delete(key);
      throw err;
    });
    cache.set(key, found);
  }
  return found;
}

function useGeoList(source: GeoSource, level: string, parent: string | undefined, needsParent: boolean): ApiGeoValue[] | undefined {
  const [loaded, setLoaded] = useState<{ key: string; values: ApiGeoValue[] } | null>(null);
  const key = `${level}:${parent ?? ""}`;
  const wanted = !needsParent || !!parent;
  useEffect(() => {
    if (!wanted) return;
    let live = true;
    geoValues(source, level, parent).then((values) => live && setLoaded({ key, values })).catch(() => {});
    return () => {
      live = false;
    };
  }, [source, level, parent, key, wanted]);
  return wanted && loaded?.key === key ? loaded.values : undefined;
}

/**
 * Region → zone → woreda → kebele from the Crop Sown geo-level routes. Each level follows the name picked above it;
 * until a call answers (or if it fails) its options are undefined and the form keeps its built-in list. `ids` are the
 * registry ids of the names picked, which is what the registry takes.
 */
export function useGeoLevels(names: GeoNames, source: GeoSource = "crop-sown") {
  const regions = useGeoList(source, "l1", undefined, false);
  const regionId = regions?.find((v) => v.level_value_mnemonic === names.region)?.level_value_id;
  const zones = useGeoList(source, "l2", regionId, true);
  const zoneId = zones?.find((v) => v.level_value_mnemonic === names.zone)?.level_value_id;
  const woredas = useGeoList(source, "l3", zoneId, true);
  const woredaId = woredas?.find((v) => v.level_value_mnemonic === names.woreda)?.level_value_id;
  const kebeles = useGeoList(source, "l4", woredaId, true);
  const kebeleId = kebeles?.find((v) => v.level_value_mnemonic === names.kebele)?.level_value_id;

  const labels = (list?: ApiGeoValue[]) => list?.map((v) => v.level_value_mnemonic);
  return {
    options: { region: labels(regions), zone: labels(zones), woreda: labels(woredas), kebele: labels(kebeles) } as Record<GeoKey, string[] | undefined>,
    ids: { region: regionId, zone: zoneId, woreda: woredaId, kebele: kebeleId } as GeoIds,
  };
}
