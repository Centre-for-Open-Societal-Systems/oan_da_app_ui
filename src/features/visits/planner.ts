import type { ApiVisit } from "./api";
import type { ArrivalState, PlannerVisit, TodaysVisit } from "./types";

// API visits in the planner's shapes. The API carries the farmer's registry id only, so the id stands in for the name.

/** Visits that no longer happen; the visit that replaced a rescheduled one has its own row. */
const OFF_PLANNER = ["Cancelled", "Rescheduled", "Superseded"];
const COMPLETE = "Physical Visit Complete";

export const isOnPlanner = (v: Pick<ApiVisit, "physical_status">) => !OFF_PLANNER.includes(v.physical_status);

export const toPlannerVisit = (v: ApiVisit): PlannerVisit => ({
  id: v.name,
  time: v.scheduled_at.slice(11, 16),
  farmerName: v.farmer_id,
  kebele: v.kebele ?? "—",
  status: v.physical_status === "Missed" ? "overdue" : (v.planner_status ?? "scheduled"),
});

/** The calendar's cards by day ("2026-10-16"), in the API's order (earliest first). */
export function plannerVisitsByDate(visits: ApiVisit[]): Record<string, PlannerVisit[]> {
  const byDate: Record<string, PlannerVisit[]> = {};
  for (const v of visits.filter(isOnPlanner)) (byDate[v.scheduled_at.slice(0, 10)] ??= []).push(toPlannerVisit(v));
  return byDate;
}

const arrivalState = (v: ApiVisit): ArrivalState => {
  if (v.physical_status === COMPLETE) return "done";
  return v.farmer_confirmation === "Confirmed" ? "confirmed" : "tentative";
};

const arrivalNote = (v: ApiVisit) => {
  if (v.physical_status === "Missed" || v.physical_status === "In progress") return v.physical_status;
  const confirmation = v.farmer_confirmation && v.farmer_confirmation !== "Unknown" ? v.farmer_confirmation : "Not confirmed yet";
  return v.confirmation_note ? `${confirmation} · ${v.confirmation_note}` : confirmation;
};

export const toTodaysVisit = (v: ApiVisit): TodaysVisit => ({
  id: v.name,
  farmerName: v.farmer_id,
  plannedArrival: v.scheduled_at.slice(11, 16),
  state: arrivalState(v),
  note: arrivalNote(v),
  kebele: v.kebele ?? undefined,
  parcel: v.plot_ref ?? undefined,
  lat: v.location_lat ?? undefined,
  lng: v.location_lng ?? undefined,
});
