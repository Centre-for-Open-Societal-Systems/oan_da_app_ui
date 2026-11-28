import { listKbGeo } from "@/features/communication";

// Visits carry the Kebele as a P-code ("ET140108101008"); people read its name. Names come from the geo Master Data
// (the Kebeles under the code's Woreda, its first 8 characters) and are kept for the page's lifetime.

const KEBELE_CODE = /^ET\d{8,}$/;
const names = new Map<string, string>();

/** The Kebele's name once loaded, else the value as given (a code, or a name the backend already sent); null stays null. */
export const kebeleName = (kebele: string | null | undefined): string | null => (kebele ? (names.get(kebele) ?? kebele) : null);

/** Reads the names of these Kebeles' codes (one call per Woreda). Never throws: an unread name shows as its code. */
export async function loadKebeleNames(kebeles: (string | null | undefined)[]): Promise<void> {
  const woredas = new Set<string>();
  for (const k of kebeles) if (k && KEBELE_CODE.test(k) && !names.has(k)) woredas.add(k.slice(0, 8));
  await Promise.allSettled(
    [...woredas].map((w) =>
      listKbGeo("kebele", w).then((rows) => {
        for (const r of rows) names.set(r.code, r.name);
      }),
    ),
  );
}
