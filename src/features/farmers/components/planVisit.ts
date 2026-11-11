import { FARMERS } from "../data";
import type { Farmer } from "../types";

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

/**
 * Plans one visit per farmer, one call after the other, and keeps going past a failure so the caller can report each
 * farmer: the backend plans a single farmer per call.
 */
export async function planEach<T>(farmers: Farmer[], plan: (farmer: Farmer) => Promise<T>): Promise<BatchOutcome<T>> {
  const outcome: BatchOutcome<T> = { planned: [], failed: [] };
  for (const farmer of farmers) {
    try {
      outcome.planned.push({ farmer, visit: await plan(farmer) });
    } catch (err) {
      outcome.failed.push({ farmer, reason: err instanceof Error ? err.message : "Could not plan the visit." });
    }
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

/** Human-readable date/time from the (uncontrolled) date and time inputs. */
export const readWhen = () => {
  const date = (document.getElementById("visit-date") as HTMLInputElement | null)?.value;
  const time = (document.getElementById("visit-time") as HTMLInputElement | null)?.value;
  if (!date) return "the chosen date";
  const label = new Date(`${date}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
  return time ? `${label} at ${time}` : label;
};
