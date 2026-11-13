import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { assignAgent, fetchCoverage, fetchMyAssignment, formatAssignmentDate, listAssignments, listKebeles, toAgentAssignment, type ApiAssignmentRow } from "./api";
import { areaLabel, areaNameMap, woredasInRegion } from "./api";

// Minimal in-memory Storage so the persisted auth store runs under Node.
class MemoryStorage implements Storage {
  private map = new Map<string, string>();
  get length() { return this.map.size; }
  clear() { this.map.clear(); }
  getItem(k: string) { return this.map.get(k) ?? null; }
  key(i: number) { return [...this.map.keys()][i] ?? null; }
  removeItem(k: string) { this.map.delete(k); }
  setItem(k: string, v: string) { this.map.set(k, String(v)); }
}

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn<typeof fetch>();

const row: ApiAssignmentRow = {
  da_id: "DA-000001",
  agent: "Tadesse Alemu",
  region: "ET04",
  woreda: "ET04-W01",
  kebele: "ET04-W01-K01",
  kebele_name: "Bako 01",
  farmers: 248,
  status: "Active",
  assignment_status: "Effective",
  assignment_id: "DA-ASG-0001",
  effective_date: "2026-10-20",
  geofence: "In-boundary",
  geofence_reason: null,
  mode: "Automatic",
  assigned_by: "sup.demo@da.local",
  flagged: null,
};

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "Supervisor", { accessToken: "t", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

describe("assignments api", () => {
  it("lists the Woreda's agents with the summary", async () => {
    const summary = { agents: 1, unassigned: 0, on_leave: 0, flagged: 0 };
    fetchMock.mockResolvedValueOnce(json({ data: [row], meta: { total: 1, limit: 500, start: 0, summary } }));

    await expect(listAssignments()).resolves.toEqual({ rows: [row], total: 1, summary });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/assignments?limit=500");
  });

  it("asks for coverage, kebeles and the DA's own posting", async () => {
    fetchMock.mockImplementation(async () => json({ data: {} }));

    await fetchCoverage();
    await fetchCoverage("ET04-W01");
    await listKebeles("ET04-W01");
    await fetchMyAssignment();

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/da-services/assignments/coverage",
      "/api/v1/da-services/assignments/coverage?woreda=ET04-W01",
      "/api/v1/da-services/master/kebeles?woreda=ET04-W01",
      "/api/v1/da-services/assignments/me",
    ]);
  });

  it("posts an assignment", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { name: "DA-ASG-0002", state: "Effective", geofence_result: "Not checked" } }, 201));
    const body = { da_id: "DA-000001", kebele: "ET04-W01-K01", effective_date: "2026-10-20", reason: "Coverage gap", mode: "Automatic" as const, client_op_id: "op-1" };

    await expect(assignAgent(body)).resolves.toMatchObject({ state: "Effective" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/assignments");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual(body);
  });
});

describe("toAgentAssignment", () => {
  it("shows names and keeps codes for the form", () => {
    expect(toAgentAssignment(row, { "ET04-W01": "Bako Tibe" })).toEqual({
      daId: "DA-000001",
      agent: "Tadesse Alemu",
      woreda: "Bako Tibe",
      woredaCode: "ET04-W01",
      kebele: "Bako 01",
      kebeleCode: "ET04-W01-K01",
      farmers: 248,
      status: "Active",
      assignmentStatus: "Effective",
      effectiveDate: "20 Oct 2026",
      geofence: "In-boundary",
      geofenceReason: undefined,
      mode: "Automatic",
      assignedBy: "sup.demo@da.local",
    });
  });

  it("handles an unassigned DA and a pending flag", () => {
    const unassigned = toAgentAssignment({ ...row, kebele: null, kebele_name: null, farmers: null, effective_date: null, status: "Unassigned", assignment_status: "Flagged", flagged: { assignment_id: "A", kebele: "K", kebele_name: "Bako 02", effective_date: null, reason: "2.4 km outside" } });
    expect(unassigned).toMatchObject({ kebele: null, farmers: 0, effectiveDate: "—", geofenceReason: "2.4 km outside" });
  });

  it("formats dates", () => {
    expect(formatAssignmentDate("2026-10-20")).toBe("20 Oct 2026");
    expect(formatAssignmentDate(null)).toBe("—");
  });
});

describe("scope area helpers", () => {
  const area = (code: string, level: "Region" | "Woreda", name_en: string) => ({ code, level, parent_area: null, name_en }) as import("./api").AdminArea;
  const regions = [area("ET04", "Region", "Oromia"), area("ET01", "Region", "Tigray")];
  const woredas = [area("ET040301", "Woreda", "Bako Tibe"), area("ET010101", "Woreda", "Tahtay Adiyabo"), area("ET040302", "Woreda", "Ambo")];

  it("picks a region's woredas by code prefix", () => {
    expect(woredasInRegion(woredas, "ET04").map((w) => w.code)).toEqual(["ET040301", "ET040302"]);
    expect(woredasInRegion(woredas, "")).toEqual([]);
  });

  it("labels known codes with their name and leaves other values alone", () => {
    const names = areaNameMap({ regions, woredas });
    expect(areaLabel(names, "ET04")).toBe("Oromia (ET04)");
    expect(areaLabel(names, "ET010101")).toBe("Tahtay Adiyabo (ET010101)");
    expect(areaLabel(names, "Bako Tibe")).toBe("Bako Tibe");
    expect(areaLabel(names, "")).toBe("—");
  });
});
