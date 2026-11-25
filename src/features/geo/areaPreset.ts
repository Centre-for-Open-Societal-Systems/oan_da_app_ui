// The user's own area as a form's Region > Zone > Woreda > Kebele fields start with. GET /me names the place of the
// user's DA Hierarchy node with geo Master Data codes (Region ET01 > Zone ET0101 > Woreda ET010101 > Kebele ET0101…).

export const AREA_LEVELS = ["region", "zone", "woreda", "kebele"] as const;
export type AreaLevel = (typeof AREA_LEVELS)[number];

export const AREA_LABELS: Record<AreaLevel, string> = { region: "Region", zone: "Zone", woreda: "Woreda", kebele: "Kebele" };

/** One area: its geo Master Data code and display name (the name may be empty until the Master Data is read). */
export interface AreaPick {
  code: string;
  name: string;
}

/** The levels fixed by the user's own area; the levels left out are picked. */
export type AreaPreset = Partial<Record<AreaLevel, AreaPick>>;

/** What a form's area fields hold: each level's area, or null while none is chosen. */
export type AreaSelection = Record<AreaLevel, AreaPick | null>;

export const EMPTY_AREA: AreaSelection = { region: null, zone: null, woreda: null, kebele: null };

/**
 * The deepest level each role sits at: a DA at the Kebele, a Supervisor at the Woreda, an Executive at the Zone. Levels
 * down to it come from the account and are locked; the levels below it are picked. Admin, Communications Officer and
 * Super Admin sit at the Country, so they pick every level.
 */
const ROLE_LEVEL: Partial<Record<string, AreaLevel>> = { DA: "kebele", Supervisor: "woreda", Executive: "zone" };

/** Length of a level's code: Region ET01, Zone ET0101, Woreda ET010101 (a Kebele's is longer). */
const CODE_LENGTH: Record<Exclude<AreaLevel, "kebele">, number> = { region: 4, zone: 6, woreda: 8 };
const GEO_CODE = /^ET\d+$/;

type Ref = { id: string; name: string } | null | undefined;
type Location = Partial<Record<AreaLevel, Ref>> | null | undefined;

const toPick = (ref: Ref): AreaPick | undefined => (ref?.id ? { code: ref.id, name: ref.name ?? "" } : undefined);

/**
 * The area fields a role starts with, from its /me location: every level down to the role's own (see ROLE_LEVEL) that
 * /me sends. A level /me leaves out is taken from the code of a level below it (Woreda ET040101 > Zone ET0401 > Region
 * ET04). The locked levels always run from Region down without a gap; a level that cannot be filled ends them.
 */
export function userAreaPreset(role: string | null | undefined, location: Location): AreaPreset {
  const deepest = role ? ROLE_LEVEL[role] : undefined;
  if (!deepest || !location) return {};
  const levels = AREA_LEVELS.slice(0, AREA_LEVELS.indexOf(deepest) + 1);
  const given = Object.fromEntries(levels.map((l) => [l, toPick(location[l])])) as AreaPreset;

  const preset: AreaPreset = {};
  for (const [i, level] of levels.entries()) {
    let pick = given[level];
    if (!pick && level !== "kebele") {
      // The deepest level below that /me does send, cut to this level's code.
      const below = levels.slice(i + 1).map((l) => given[l]).find((p) => p && GEO_CODE.test(p.code) && p.code.length > CODE_LENGTH[level]);
      if (below) pick = { code: below.code.slice(0, CODE_LENGTH[level]), name: "" };
    }
    if (!pick) break;
    preset[level] = pick;
  }
  return preset;
}

/** The levels of a form that asks down to `depth`, e.g. ["region", "zone", "woreda"] for "woreda". */
export const levelsDownTo = (depth: AreaLevel): AreaLevel[] => AREA_LEVELS.slice(0, AREA_LEVELS.indexOf(depth) + 1);

/**
 * A geo code with the codes of the levels above it, e.g. Woreda ET040101 → { region ET04, zone ET0401, woreda ET040101 }.
 * Empty for a code that is not a geo Master Data code.
 */
export function areaCodesOf(code: string | null | undefined): Partial<Record<AreaLevel, string>> {
  if (!code || !GEO_CODE.test(code) || code.length < 4) return {};
  const out: Partial<Record<AreaLevel, string>> = { region: code.slice(0, 4) };
  if (code.length >= 6) out.zone = code.slice(0, 6);
  if (code.length >= 8) out.woreda = code.slice(0, 8);
  if (code.length > 8) out.kebele = code;
  return out;
}
