import { FARMERS } from "../data";
import type { Farmer } from "../types";
import { planVisit, planVisitsBatch, type BatchVisitItem, type PlannedVisit } from "../visitsApi";

// "Advisory" visits capture the farmer's questions and the advice given (see AdvisoryQaFields).
export const ADVISORY_VISIT = "Advisory";
export const VISIT_TYPES = ["Crop Survey", "Livestock Survey", "Services", "Follow-up", ADVISORY_VISIT];

/** One question raised by the farmer and the advice to give, on an Advisory visit. */
export interface AdvisoryQa {
  id: number;
  question: string;
  answer: string;
}

export const DURATIONS = ["30 min", "45 min", "60 min", "90 min"];
export const PRIORITIES = ["High — overdue by 4 days", "Medium — due this week", "Low — routine"];
export const PRIORITY_BY_LEVEL = { high: PRIORITIES[0], medium: PRIORITIES[1], low: PRIORITIES[2] } as const;

/** Pre-filled reason for a visit, e.g. from a Priority-list flag. */
export interface VisitPreset {
  reason: string;
  visitType: string;
  level: keyof typeof PRIORITY_BY_LEVEL;
}
export const QUICK_FILTERS = ["Registered", "Input voucher redeemed this season"];

/**
 * Outcome shown in place of the form after Plan/Schedule (sent to the visits API) or Save as draft (kept on this device).
 * `farmer` and `visitId` list every farmer / visit of a batch; `count` is the number of farmers.
 */
export type PlanVisitResult = { kind: "planned" | "draft"; farmer?: string; when: string; visitId?: string; count?: number };

/** A batch visit plans one visit per farmer, for at most this many farmers at once. */
export const MAX_BATCH_FARMERS = 5;

/** Adds the farmer, or removes them when already picked; a full batch stays as it is. */
export function toggleFarmer(picked: Farmer[], farmer: Farmer, max = MAX_BATCH_FARMERS): Farmer[] {
  if (picked.some((f) => f.id === farmer.id)) return picked.filter((f) => f.id !== farmer.id);
  return picked.length >= max ? picked : [...picked, farmer];
}

/** "A", "A and B", "A, B and C". */
export function joinNames(names: string[]): string {
  if (names.length <= 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export interface BatchOutcome<T> {
  planned: { farmer: Farmer; visit: T }[];
  failed: { farmer: Farmer; reason: string }[];
}

/** One farmer on the batch result: planned (visitId, when) or failed (reason). */
export interface BatchRow {
  farmer: Farmer;
  visitId?: string;
  /** Human-readable date/time the visit was planned for. */
  when?: string;
  /** The backend's error; set only when the visit was not planned. */
  reason?: string;
  /** What was sent for a failed farmer: edited on the result and sent again by Resubmit / Retry failed. */
  request?: BatchVisitItem;
}

/**
 * The batch result after a (re)try: a farmer's latest outcome replaces their earlier row, in the original order;
 * farmers new to the batch are added at the end.
 */
export function mergeBatchRows(prev: BatchRow[], planned: BatchRow[], failed: BatchRow[]): BatchRow[] {
  const latest = new Map<string, BatchRow>([...planned, ...failed].map((r) => [r.farmer.id, r]));
  const rows = prev.map((r) => latest.get(r.farmer.id) ?? r);
  const seen = new Set(prev.map((r) => r.farmer.id));
  return [...rows, ...[...latest.values()].filter((r) => !seen.has(r.farmer.id))];
}

const PLAN_FAILED = "Could not plan the visit.";
const reasonOf = (err: unknown) => (err instanceof Error && err.message ? err.message : PLAN_FAILED);

/**
 * Plans the farmers' visits on POST /visits: one farmer sends the single-visit body, 2-5 farmers one batch body
 * (`visits: [...]`, envelope `user`). Each farmer ends up planned or failed with the backend's reason.
 */
export async function planFarmers(
  farmers: Farmer[],
  /** Whose plan the visits go to: the DA's Frappe User, plus their DA-ID when an officer plans for them. */
  { user, daId }: { user: string; daId?: string },
  itemFor: (farmer: Farmer) => BatchVisitItem,
): Promise<BatchOutcome<PlannedVisit>> {
  const owner = { user, ...(daId && { da_id: daId }) };
  if (farmers.length === 1) {
    const [farmer] = farmers;
    try {
      return { planned: [{ farmer, visit: await planVisit({ ...itemFor(farmer), ...owner }) }], failed: [] };
    } catch (err) {
      return { planned: [], failed: [{ farmer, reason: reasonOf(err) }] };
    }
  }

  const items = farmers.map((farmer) => ({ farmer, body: itemFor(farmer) }));
  let result;
  try {
    result = await planVisitsBatch({ ...owner, visits: items.map((i) => i.body) });
  } catch (err) {
    // 400: none of the visits was created.
    return { planned: [], failed: farmers.map((farmer) => ({ farmer, reason: reasonOf(err) })) };
  }

  // Both lists carry the farmer_id sent (the failures echo the item received).
  const failedReason = new Map(result.failed.map((f) => [f.farmer_id, f.reason]));
  const outcome: BatchOutcome<PlannedVisit> = { planned: [], failed: [] };
  for (const { farmer, body } of items) {
    const visit = result.created.find((v) => v.farmer_id === body.farmer_id);
    if (visit) outcome.planned.push({ farmer, visit });
    else outcome.failed.push({ farmer, reason: failedReason.get(body.farmer_id) || PLAN_FAILED });
  }
  return outcome;
}

/** "45 min" → 45. */
export const durationMinutes = (label: string) => parseInt(label, 10) || 45;

/** "High — overdue by 4 days" → level "High" and reason "Overdue by 4 days". */
export function splitPriority(label: string): { level: "Low" | "Medium" | "High"; reason?: string } {
  const [head, ...rest] = label.split(" — ");
  const level = head === "High" || head === "Low" ? head : "Medium";
  const reason = rest.join(" — ").trim();
  return { level, reason: reason ? reason[0].toUpperCase() + reason.slice(1) : undefined };
}

/** Values of the form's uncontrolled detail inputs (see VisitDetailsFields). */
export function readVisitDetails() {
  const value = (id: string) => (document.getElementById(id) as HTMLInputElement | HTMLSelectElement | null)?.value ?? "";
  return { purpose: value("visit-purpose").trim(), date: value("visit-date"), time: value("visit-time"), duration: value("visit-duration"), priority: value("visit-priority") };
}

export const FORM_ID = "plan-visit-form";

/** Farmers whose name, phone or kebele contains the (lower-cased, trimmed) term; all of them when it is empty. */
export const matchFarmers = (term: string, choices: Farmer[]) =>
  term ? choices.filter((f) => `${f.name} ${f.phone} ${f.kebele}`.toLowerCase().includes(term)) : choices;

const isSampleFarmer = (farmer: Farmer) => FARMERS.some((f) => f.id === farmer.id);

/**
 * The Farmer ID (`FR-…`, the API's reg_id) every farmer API call sends: the internal farmer_id only when a farmer has
 * no reg_id. A sample farmer gets a mock code derived from the record.
 */
export const registryCode = (farmer: Farmer) =>
  isSampleFarmer(farmer) ? `FR-${(88000 + farmer.name.length * 31 + farmer.kebele.length * 7).toString().slice(0, 5)}` : farmer.regId ?? farmer.id;

/** "2026-11-20", "10:00" → "20 Nov 2026 at 10:00". */
export function formatWhen(date: string | undefined, time: string | undefined) {
  if (!date) return "the chosen date";
  const label = new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return time ? `${label} at ${time}` : label;
}

/** Human-readable date/time from the (uncontrolled) date and time inputs. */
export const readWhen = () =>
  formatWhen((document.getElementById("visit-date") as HTMLInputElement | null)?.value, (document.getElementById("visit-time") as HTMLInputElement | null)?.value);
