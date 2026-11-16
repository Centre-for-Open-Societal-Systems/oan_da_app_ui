import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime, toWoredaHealth, woredaHealthQuery } from "./woredaHealth";

const payload = {
  view: "woreda",
  woreda: { code: "ET04-W01", name: "Bako Tibe" },
  updated_at: "2026-11-11T14:32:49.291882",
  stats: { farmers: 12490, active_agents: 22, data_quality: 84, open_grievances: 22 },
  kebeles: [
    { kebele: "Dhankaka", kebele_code: "ET04-W01-K01", farmers: 1240, agents: 2, visit_pct: 89, last_sync: "2026-09-15T14:30:00", status: "On track" as const },
    { kebele: "Godino", kebele_code: "ET04-W01-K02", farmers: 1110, agents: 1, visit_pct: 51, last_sync: null, status: "At risk" as const },
  ],
  total: 2,
};

describe("toWoredaHealth", () => {
  it("maps the API fields to the screen model", () => {
    const health = toWoredaHealth(payload);
    expect(health.name).toBe("Bako Tibe");
    expect(health.stats).toEqual({ farmers: 12490, activeAgents: 22, dataQuality: 84, openGrievances: 22 });
    expect(health.kebeles[0]).toEqual({ code: "ET04-W01-K01", name: "Dhankaka", farmers: 1240, agents: 2, visitPct: 89, lastSync: "2026-09-15T14:30:00", status: "On track" });
    expect(health.kebeles[1].lastSync).toBeNull();
    expect(health.total).toBe(2);
  });

  it("falls back to the woreda code when the name is empty", () => {
    expect(toWoredaHealth({ ...payload, woreda: { code: "ET04-W01", name: "" } }).name).toBe("ET04-W01");
    expect(toWoredaHealth({ ...payload, woreda: { code: "ET04-W01", name: null } }).name).toBe("ET04-W01");
  });

  it("refuses a payload that is not the woreda view", () => {
    expect(() => toWoredaHealth({ ...payload, view: "agent" })).toThrow(/no woreda programme health/);
  });
});

describe("date formatting", () => {
  it("formats an ISO datetime like the table showed it", () => {
    expect(formatDate("2026-09-15T14:30:00")).toBe("15 Sep 2026");
    expect(formatDateTime("2026-09-15T14:30:00")).toBe("15 Sep 2026, 14:30");
  });

  it("gives null for a missing or unreadable timestamp", () => {
    expect(formatDate(null)).toBeNull();
    expect(formatDateTime(null)).toBeNull();
    expect(formatDateTime("not a date")).toBeNull();
  });
});

describe("woredaHealthQuery", () => {
  const range = { from: "2026-10-18", to: "2026-11-16" };

  it("sends only the range and the page size when nothing is filtered", () => {
    expect(woredaHealthQuery(range).toString()).toBe("from=2026-10-18&to=2026-11-16&limit=500");
  });

  it("adds each filter the table has set", () => {
    const query = woredaHealthQuery(range, { q: "  Godino ", kebele: "ET04-W01-K03", status: "At risk", agents: 2 });
    expect(query.get("q")).toBe("Godino");
    expect(query.get("kebele")).toBe("ET04-W01-K03");
    expect(query.get("status")).toBe("At risk");
    expect(query.get("agents")).toBe("2");
  });

  it("keeps an agent count of zero and drops a blank search", () => {
    const query = woredaHealthQuery(range, { q: "   ", agents: 0 });
    expect(query.has("q")).toBe(false);
    expect(query.get("agents")).toBe("0");
  });
});
