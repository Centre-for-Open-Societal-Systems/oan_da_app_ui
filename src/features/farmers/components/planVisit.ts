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

/** Outcome shown in place of the form after Plan/Schedule (sent to the visits API) or Save as draft (kept on this device). */
export type PlanVisitResult = { kind: "planned" | "draft"; farmer?: string; when: string; visitId?: string };

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

// One entry per distinct farmer (the mock list repeats names to fill a page).
export const FARMER_CHOICES = FARMERS.filter((f, i, all) => all.findIndex((o) => o.name === f.name) === i);

/** Farmers whose name, phone or kebele contains the (lower-cased, trimmed) term; all of them when it is empty. */
export const matchFarmers = (term: string, choices: Farmer[] = FARMER_CHOICES) =>
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
