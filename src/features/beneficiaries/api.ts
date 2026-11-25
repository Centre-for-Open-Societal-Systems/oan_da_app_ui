import { authRequest } from "@/features/auth";
import { listKbGeo } from "@/features/communication";
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
// The farmer list gives area names ("Oromia", "Shire Endaslasie town", "Lekatit"); the POST needs their geo Master Data
// codes (GET /get_master_data?data_type=geo, the codes DA Region / Zone / Woreda / Kebele are keyed by). The region is
// found by name, the woreda by name among the woredas of the region's zones, and the kebele by name under that woreda.
// Every list is read once per page (listKbGeo caches it).

const norm = (s: string | null | undefined) => (s ?? "").trim().toLowerCase();

export type FarmerArea = Pick<FarmerBeneficiaryRequest, "region" | "zone" | "woreda" | "kebele">;

/** The farmer's area codes, or a reason they could not be found in the geo Master Data. */
export async function resolveFarmerArea(farmer: Pick<Farmer, "kebele" | "woreda" | "region">): Promise<FarmerArea | { error: string }> {
  const kebeleName = norm(farmer.kebele);
  const woredaName = norm(farmer.woreda);
  const regionName = norm(farmer.region);
  if (!kebeleName || kebeleName === "—" || !woredaName || !regionName) return { error: "The farmer's region, woreda or kebele is missing in the Farmer Registry." };

  const region = (await listKbGeo("region", "ET")).find((r) => norm(r.name) === regionName);
  if (!region) return { error: `Region “${farmer.region}” was not found in the Master Data.` };
  const zones = await listKbGeo("zone", region.code);
  const woredas = (await Promise.all(zones.map((z) => listKbGeo("woreda", z.code)))).flat().filter((w) => norm(w.name) === woredaName);
  if (woredas.length === 0) return { error: `Woreda “${farmer.woreda}” was not found in ${farmer.region} in the Master Data.` };
  // The same woreda name can sit in two zones: the one holding the kebele is taken.
  for (const woreda of woredas) {
    const kebele = (await listKbGeo("kebele", woreda.code)).find((k) => norm(k.name) === kebeleName);
    if (kebele) return { region: region.code, zone: woreda.parent, woreda: woreda.code, kebele: kebele.code };
  }
  return { error: `Kebele “${farmer.kebele}” (${farmer.woreda}) was not found in the Master Data.` };
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
 * one call (500 at most), one group after another. Each farmer's outcome is kept. With `area` (the Kebele picked in the
 * Add form, whose farmers were listed) every farmer is sent with it; without it each farmer's area is looked up.
 */
export async function addFarmersToSegment(farmers: Farmer[], segment: string, area?: FarmerArea): Promise<AddResult> {
  const result: AddResult = { added: [], skipped: [], failed: [] };
  const groups = new Map<string, { area: FarmerArea; farmers: Farmer[] }>();
  for (const farmer of farmers) {
    if (!farmer.regId) {
      result.failed.push({ farmer, reason: "The farmer has no Farmer ID (FR-…) in the Farmer Registry." });
      continue;
    }
    try {
      const found = area ?? (await resolveFarmerArea(farmer));
      if ("error" in found) {
        result.failed.push({ farmer, reason: found.error });
        continue;
      }
      const key = [found.region, found.zone, found.woreda, found.kebele].join("|");
      const group = groups.get(key) ?? { area: found, farmers: [] };
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
