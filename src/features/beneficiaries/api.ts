import { authRequest } from "@/features/auth";
import { listAreas, type AdminArea } from "@/features/assignments";
import type { Farmer } from "@/features/farmers";
import { ApiError } from "@/lib/api";

// DA Services "4. Beneficiary": Beneficiary Segments (the packages) and Farmer Beneficiaries (which farmer is in which
// package). Frappe's DocType permissions and the caller's area decide what is read and who may add.

/** One active Beneficiary Segment from GET /beneficiary-segments. */
export interface ApiSegment {
  name: string;
  title: string;
  short_desc: string | null;
  long_desc: string | null;
  /** With get_count: Farmer Beneficiaries in it that the caller may read; null when they may not read any. */
  farmer_beneficiary_count?: number | null;
}

/** One Farmer Beneficiary row: area values are area codes (e.g. "ET04-W01-K01"). */
export interface ApiFarmerBeneficiary {
  name: string;
  /** The Frappe user who added it. */
  user: string;
  farmer_id: string;
  region: string;
  zone: string;
  woreda: string;
  kebele: string;
  beneficiary_segment: string;
  creation: string;
  modified: string;
}

/** POST body: every farmer id gets its own Farmer Beneficiary, all with the same area and segment. */
export interface FarmerBeneficiaryRequest {
  /** 1-500 Farmer IDs as people see them ("FR-…", the farmer's reg_id); blanks and repeats are dropped by the backend. */
  farmer_ids: string[];
  region: string;
  zone: string;
  woreda: string;
  kebele: string;
  beneficiary_segment: string;
}

const query = (params: Record<string, string | number | boolean | undefined>) => {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v !== undefined && v !== "") q.set(k, String(v));
  const s = q.toString();
  return s ? `?${s}` : "";
};

/** GET /beneficiary-segments: the active packages, newest first, with their member counts. */
export async function listBeneficiarySegments(p: { search?: string; limit?: number; start?: number } = {}): Promise<ApiSegment[]> {
  const res = await authRequest<{ data: ApiSegment[] }>(`/da-services/beneficiary-segments${query({ limit: 500, ...p, get_count: true })}`);
  return res.data;
}

/** GET /farmer-beneficiaries: the links the caller may read, newest first (exact-match filters). */
export async function listFarmerBeneficiaries(
  p: { farmer_id?: string; beneficiary_segment?: string; kebele?: string; limit?: number; start?: number } = {},
): Promise<{ items: ApiFarmerBeneficiary[]; total: number }> {
  const res = await authRequest<{ data: ApiFarmerBeneficiary[]; meta: { total: number } }>(`/da-services/farmer-beneficiaries${query({ limit: 500, ...p })}`);
  return { items: res.data, total: res.meta?.total ?? res.data.length };
}

/**
 * POST /farmer-beneficiaries: adds farmers of one area to one package in a single call. Farmers already in it come back
 * in `skipped`; any other failure creates nothing.
 */
export async function createFarmerBeneficiaries(body: FarmerBeneficiaryRequest): Promise<{ created: ApiFarmerBeneficiary[]; skipped: string[] }> {
  const res = await authRequest<{ data: { created: ApiFarmerBeneficiary[]; skipped: string[] } }>("/da-services/farmer-beneficiaries", { method: "POST", body });
  return { created: res.data.created ?? [], skipped: res.data.skipped ?? [] };
}

/** The backend takes at most this many farmer_ids per POST. */
const MAX_BULK = 500;

// ----- Farmer area → area codes ---------------------------------------------------------------------------------
// The farmer list gives area names ("Lekatit", "Shire Endaslasie town"); the POST needs the codes of the DA area
// master. The kebele is found by name under a woreda of the farmer's woreda name; zone and region are its parents.

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

let zonesOnce: Promise<AdminArea[]> | null = null;
const allZones = () => {
  zonesOnce ??= listAreas({ level: "Zone" }).catch((err: unknown) => {
    zonesOnce = null;
    throw err;
  });
  return zonesOnce;
};

export type FarmerArea = Pick<FarmerBeneficiaryRequest, "region" | "zone" | "woreda" | "kebele">;

/** The farmer's area codes, or a reason they could not be found in the DA area master. */
export async function resolveFarmerArea(farmer: Pick<Farmer, "kebele" | "woreda">): Promise<FarmerArea | { error: string }> {
  const kebeleName = norm(farmer.kebele);
  const woredaName = norm(farmer.woreda);
  if (!kebeleName || kebeleName === "—" || !woredaName) return { error: "The farmer's kebele or woreda is missing in the Farmer Registry." };

  const [kebeles, woredas, zones] = await Promise.all([
    listAreas({ level: "Kebele", q: farmer.kebele.trim() }),
    listAreas({ level: "Woreda", q: farmer.woreda.trim() }),
    allZones(),
  ]);
  const woredaCodes = new Map(woredas.filter((w) => norm(w.name_en) === woredaName).map((w) => [w.code, w]));
  const kebele = kebeles.find((k) => norm(k.name_en) === kebeleName && k.parent_area && woredaCodes.has(k.parent_area));
  if (!kebele) return { error: `Kebele “${farmer.kebele}” (${farmer.woreda}) was not found in the area master.` };
  const woreda = woredaCodes.get(kebele.parent_area!)!;
  const zone = zones.find((z) => z.code === woreda.parent_area);
  if (!zone?.parent_area) return { error: `The zone of woreda “${farmer.woreda}” was not found in the area master.` };
  return { region: zone.parent_area, zone: zone.code, woreda: woreda.code, kebele: kebele.code };
}

// ----- Add many farmers to one package ---------------------------------------------------------------------------

export interface AddResult {
  added: ApiFarmerBeneficiary[];
  /** Already in this package (409). */
  skipped: Farmer[];
  failed: { farmer: Farmer; reason: string }[];
}

const reasonOf = (err: unknown) => (err instanceof Error && err.message ? err.message : "Could not add the farmer.");

/**
 * The POST shares one area across its farmer_ids, so farmers are grouped by their area codes and each group is sent in
 * one call (500 at most), one group after another. Each farmer's outcome is kept.
 */
export async function addFarmersToSegment(farmers: Farmer[], segment: string): Promise<AddResult> {
  const result: AddResult = { added: [], skipped: [], failed: [] };
  const groups = new Map<string, { area: FarmerArea; farmers: Farmer[] }>();
  for (const farmer of farmers) {
    if (!farmer.regId) {
      result.failed.push({ farmer, reason: "The farmer has no Farmer ID (FR-…) in the Farmer Registry." });
      continue;
    }
    try {
      const area = await resolveFarmerArea(farmer);
      if ("error" in area) {
        result.failed.push({ farmer, reason: area.error });
        continue;
      }
      const key = [area.region, area.zone, area.woreda, area.kebele].join("|");
      const group = groups.get(key) ?? { area, farmers: [] };
      group.farmers.push(farmer);
      groups.set(key, group);
    } catch (err) {
      result.failed.push({ farmer, reason: reasonOf(err) });
    }
  }

  for (const { area, farmers: inArea } of groups.values()) {
    for (let i = 0; i < inArea.length; i += MAX_BULK) {
      const batch = inArea.slice(i, i + MAX_BULK);
      try {
        const res = await createFarmerBeneficiaries({ farmer_ids: batch.map((f) => f.regId!), beneficiary_segment: segment, ...area });
        const skipped = new Set(res.skipped);
        result.added.push(...res.created);
        result.skipped.push(...batch.filter((f) => skipped.has(f.regId!)));
      } catch (err) {
        // Nothing of this batch was created.
        const reason = err instanceof ApiError && err.status === 409 ? "Already in this package." : reasonOf(err);
        result.failed.push(...batch.map((farmer) => ({ farmer, reason })));
      }
    }
  }
  return result;
}

/** One line for a banner: who was added, who was already in, who failed and why. */
export function describeAddResult(r: AddResult, segmentTitle: string): { tone: "success" | "warning" | "error"; text: string } {
  const parts: string[] = [];
  if (r.added.length) parts.push(`${r.added.length} farmer${r.added.length === 1 ? "" : "s"} added to “${segmentTitle}”.`);
  if (r.skipped.length) parts.push(`Already in this package: ${r.skipped.map((f) => f.name).join(", ")}.`);
  if (r.failed.length) parts.push(`Not added: ${r.failed.map((f) => `${f.farmer.name} (${f.reason})`).join("; ")}.`);
  const tone = r.failed.length === 0 ? "success" : r.added.length ? "warning" : "error";
  return { tone, text: parts.join(" ") };
}
