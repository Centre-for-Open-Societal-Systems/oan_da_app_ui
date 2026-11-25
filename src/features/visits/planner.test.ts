import { describe, expect, it } from "vitest";
import type { ApiVisit } from "./api";
import { plannerVisitsByDate, toTodaysVisit } from "./planner";

const visit = (over: Partial<ApiVisit>): ApiVisit => ({
  name: "V-1",
  da_id: "DA-1",
  farmer_id: "FRM-1",
  visit_type: "Advisory",
  purpose: null,
  scheduled_at: "2026-11-04T09:30:00",
  duration_min: 60,
  kebele: "Gedo",
  plot_ref: null,
  assigned_by: null,
  physical_status: "Planned",
  ui_status: "Planned",
  ...over,
});

describe("plannerVisitsByDate", () => {
  it("groups by day and leaves out visits that no longer happen", () => {
    const byDate = plannerVisitsByDate([
      visit({ name: "A", planner_status: "completed" }),
      visit({ name: "B", scheduled_at: "2026-11-05T10:00:00", physical_status: "Missed", planner_status: "scheduled" }),
      visit({ name: "C", physical_status: "Cancelled" }),
      visit({ name: "D", physical_status: "Rescheduled" }),
    ]);
    expect(Object.keys(byDate)).toEqual(["2026-11-04", "2026-11-05"]);
    expect(byDate["2026-11-04"]).toEqual([{ id: "A", time: "09:30", farmerName: "FRM-1", kebele: "Gedo", status: "completed" }]);
    expect(byDate["2026-11-05"][0].status).toBe("overdue");
  });
});

describe("toTodaysVisit", () => {
  it("reads the arrival state and note from the visit", () => {
    expect(toTodaysVisit(visit({ physical_status: "Physical Visit Complete" })).state).toBe("done");
    expect(toTodaysVisit(visit({ farmer_confirmation: "Confirmed", confirmation_note: "after 2 pm" }))).toMatchObject({ state: "confirmed", note: "Confirmed · after 2 pm" });
    expect(toTodaysVisit(visit({ farmer_confirmation: "Unknown" }))).toMatchObject({ state: "tentative", note: "Not confirmed yet" });
  });
});
