import { listKbGeo, type KbGeoLevel } from "@/features/communication";

// Lists carry areas as geo Master Data codes (Region ET04, Zone ET0401, Woreda ET040101, Kebele ET040101…); people
// read names. A code's level and parent follow from its length, so its name is read from the list of its parent.

const GEO_CODE = /^ET\d{2,}$/;
const names = new Map<string, string>();

function levelOf(code: string): { level: KbGeoLevel; parent: string } | null {
  if (!GEO_CODE.test(code)) return null;
  if (code.length === 4) return { level: "region", parent: "ET" };
  if (code.length === 6) return { level: "zone", parent: code.slice(0, 4) };
  if (code.length === 8) return { level: "woreda", parent: code.slice(0, 6) };
  if (code.length > 8) return { level: "kebele", parent: code.slice(0, 8) };
  return null;
}

/** The area's name once loaded (loadAreaNames), else the value as given; empty stays empty. */
export const areaName = (code: string | null | undefined): string => (code ? (names.get(code) ?? code) : "");

/** Reads the names of these area codes (one call per parent, cached). Never throws: an unread name shows as its code. */
export async function loadAreaNames(codes: (string | null | undefined)[]): Promise<void> {
  const lists = new Map<string, { level: KbGeoLevel; parent: string }>();
  for (const code of codes) {
    const at = code && !names.has(code) ? levelOf(code) : null;
    if (at) lists.set(`${at.level}:${at.parent}`, at);
  }
  await Promise.allSettled(
    [...lists.values()].map(({ level, parent }) =>
      listKbGeo(level, parent).then((rows) => {
        for (const r of rows) names.set(r.code, r.name);
      }),
    ),
  );
}
