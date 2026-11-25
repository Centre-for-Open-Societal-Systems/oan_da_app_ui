"use client";

import { useEffect } from "react";
import { areaName, loadAreaNames } from "@/features/geo";
import { useAuthStore } from "@/store/useAuthStore";

const AREA_CODE = /ET\d{2,}/g;

/** "Woreda · ET040101" → "Woreda · Bako Tibe": the area codes in a scope line swapped for their names, unknown ones kept. */
export function nameAreaCodes(label: string, names: Record<string, string>): string {
  return label.replace(AREA_CODE, (code) => names[code] ?? code);
}

// /me's scope line (sidebar footer, header, profile) carries area codes; the backend has no names for it yet. This
// swaps them for the geo Master Data names in the stored profile, once per new line. Best effort: codes stay on failure.
export function ScopeLabelNames() {
  const label = useAuthStore((s) => s.profile?.scopeLabel);

  useEffect(() => {
    if (!label || !label.match(AREA_CODE)) return;
    let live = true;
    const codes = label.match(AREA_CODE) ?? [];
    loadAreaNames(codes)
      .then(() => {
        if (!live) return;
        const names = Object.fromEntries(codes.filter((c) => areaName(c) !== c).map((c) => [c, areaName(c)]));
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
