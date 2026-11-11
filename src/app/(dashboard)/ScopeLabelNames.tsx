"use client";

import { useEffect } from "react";
import { areaNameMap, listAreas, loadScopeAreas } from "@/features/assignments";
import { useAuthStore } from "@/store/useAuthStore";

const AREA_CODE = /ET\d{2,}/g;
const ZONE_CODE = /\bET\d{4}\b/;

/** "Woreda · ET040101" → "Woreda · Bako Tibe": the area codes in a scope line swapped for their names, unknown ones kept. */
export function nameAreaCodes(label: string, names: Record<string, string>): string {
  return label.replace(AREA_CODE, (code) => names[code] ?? code);
}

// /me's scope line (sidebar footer, header, profile) carries area codes; the backend has no names for it yet. This
// swaps them for the area master's names in the stored profile, once per new line. Best effort: codes stay on failure.
export function ScopeLabelNames() {
  const label = useAuthStore((s) => s.profile?.scopeLabel);

  useEffect(() => {
    if (!label || !label.match(AREA_CODE)) return;
    let live = true;
    Promise.all([loadScopeAreas(), ZONE_CODE.test(label) ? listAreas({ level: "Zone" }) : Promise.resolve([])])
      .then(([areas, zones]) => {
        if (!live) return;
        const names = { ...areaNameMap(areas), ...Object.fromEntries(zones.map((z) => [z.code, z.name_en])) };
        const named = nameAreaCodes(label, names);
        const { profile } = useAuthStore.getState();
        if (named !== label && profile?.scopeLabel === label) useAuthStore.setState({ profile: { ...profile, scopeLabel: named } });
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, [label]);

  return null;
}
