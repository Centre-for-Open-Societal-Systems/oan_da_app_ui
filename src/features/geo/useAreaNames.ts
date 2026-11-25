import { useEffect, useState } from "react";
import { areaName, loadAreaNames } from "./areaNames";

/**
 * code → name for these geo Master Data codes, filled in once their names are read (one call per parent, cached).
 * Codes whose name cannot be read are left out, so a lookup falls back to the code.
 */
export function useAreaNames(codes: (string | null | undefined)[]): Record<string, string> {
  const key = [...new Set(codes.filter((c): c is string => !!c))].sort().join(",");
  const [loaded, setLoaded] = useState<{ key: string; names: Record<string, string> } | null>(null);

  useEffect(() => {
    if (!key) return;
    let live = true;
    const list = key.split(",");
    void loadAreaNames(list).then(() => {
      if (!live) return;
      setLoaded({ key, names: Object.fromEntries(list.filter((c) => areaName(c) !== c).map((c) => [c, areaName(c)])) });
    });
    return () => {
      live = false;
    };
  }, [key]);

  // Until the new codes are read the names known so far are kept, so the screen does not fall back to codes meanwhile.
  return loaded?.names ?? NONE;
}

const NONE: Record<string, string> = {};
