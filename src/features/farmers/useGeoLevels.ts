"use client";

import { useEffect, useState } from "react";
import { fetchGeoLevelValues, type ApiGeoValue } from "./cropSownApi";

/**
 * Regions and zones from the Crop Sown geo levels (l1, l2). Zones follow the region picked by name; until the call
 * answers (or if it fails) the lists are null, and the form keeps its built-in options.
 */
export function useGeoLevels(regionName: string | undefined, zoneName?: string) {
  const [regions, setRegions] = useState<ApiGeoValue[] | null>(null);
  const [zones, setZones] = useState<{ parent: string; values: ApiGeoValue[] } | null>(null);

  useEffect(() => {
    let live = true;
    fetchGeoLevelValues("l1").then((v) => live && setRegions(v)).catch(() => {});
    return () => {
      live = false;
    };
  }, []);

  const regionId = regions?.find((r) => r.level_value_mnemonic === regionName)?.level_value_id;
  useEffect(() => {
    if (!regionId) return;
    let live = true;
    fetchGeoLevelValues("l2", regionId).then((v) => live && setZones({ parent: regionId, values: v })).catch(() => {});
    return () => {
      live = false;
    };
  }, [regionId]);

  const zoneId = regionId && zones?.parent === regionId ? zones.values.find((z) => z.level_value_mnemonic === zoneName)?.level_value_id : undefined;

  return {
    /** Registry ids of the region and zone picked by name, once the geo levels have answered. */
    geoIds: { region: regionId, zone: zoneId },
    regionOptions: regions?.map((r) => r.level_value_mnemonic),
    zoneOptions: regionId && zones?.parent === regionId ? zones.values.map((z) => z.level_value_mnemonic) : undefined,
  };
}
