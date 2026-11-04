import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import {
  caseFromApi,
  fetchGrievance,
  fetchGrievanceOptions,
  fetchGrievanceSummary,
  fetchGrievanceTimeline,
  listGrievances,
  submitGrievance,
  toGrievance,
  type ApiGrievance,
  type ApiGrievanceDetail,
  type SubmitGrievanceRequest,
} from "./api";

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

const row: ApiGrievance = {
  ticket_number: "GRV-000001",
  status: "In Progress",
  category: "Water & Resources",
  subject: "Canal not cleaned",
  created_at: "2026-09-20T10:00:00Z",
  location: "Kebele 01 Center",
};

const detail: ApiGrievanceDetail = {
  ticket_number: "GRV-000001",
  ticket_id: "GRV-000001",
  status: "In Progress",
  subject: "Canal not cleaned",
  description: "The irrigation canal has not been maintained this season.",
  category: "Water & Resources",
  subcategory: "Canal maintenance problems",
  complainant_name: "Abebe Bikila",
  complainant_role: "Individual Farmer",
  complainant_id: "",
  region: null,
  woreda: "kebele-ET140108101008",
  assigned_to: "officer@isda.gov.et",
  resolution: null,
  resolved_at: null,
  sla_due_date: "2026-09-27T10:00:00Z",
  sla_consumed_percent: 40,
  created_at: null,
  updated_at: null,
};

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "DA", { accessToken: "t", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

describe("grievances api", () => {
  it("reads options, summary, a page of tickets, one ticket and its timeline", async () => {
    fetchMock
      .mockResolvedValueOnce(json({ data: { categories: [{ code: "005", value: "Water & Resources", label: "Water & Resources", subcategories: ["Canal maintenance problems"] }], grievance_types: [{ grievance_type_id: "GTYPE-1", service_category: "Water & Resources", type_name: "Canal maintenance problems" }], statuses: [{ status: "All", label: "All", order: 1 }, { status: "In Progress", label: "In Progress", order: 5 }], submitter_types: [{ code: "IND", type_name: "Individual Farmer" }, { code: "COOP", type_name: "Cooperative" }] } }))
      .mockResolvedValueOnce(json({ data: { cards: [{ status: "In Progress", label: "In Progress", order: 2, is_open: 1, is_terminal: 0, count: 3 }, { status: "All", label: "All", order: 1, is_open: 0, is_terminal: 0, count: 5 }] } }))
      .mockResolvedValueOnce(json({ data: [row], meta: { page: 1, page_size: 100, total: 3 } }))
      .mockResolvedValueOnce(json({ data: detail }))
      .mockResolvedValueOnce(json({ data: [] }));

    await expect(fetchGrievanceOptions()).resolves.toEqual({
      categories: [{ value: "Water & Resources", label: "Water & Resources", subcategories: ["Canal maintenance problems"] }],
      grievanceTypes: ["Canal maintenance problems"],
      // "All" and empty statuses are dropped (the summary carries the All card).
      statuses: [{ status: "In Progress", label: "In Progress" }],
      submitterTypes: ["Individual Farmer", "Cooperative"],
    });
    // Summary cards come back sorted by order (All first).
    await expect(fetchGrievanceSummary()).resolves.toMatchObject([{ status: "All" }, { status: "In Progress", count: 3 }]);
    await expect(listGrievances({ pageSize: 100, status: "In Progress" })).resolves.toEqual({ items: [row], total: 3 });
    await expect(fetchGrievance("GRV-000001")).resolves.toMatchObject({ sla_consumed_percent: 40 });
    await expect(fetchGrievanceTimeline("GRV-000001")).resolves.toEqual([]);

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/da-services/grievances/options",
      "/api/v1/da-services/grievances/summary",
      "/api/v1/da-services/grievances?page=1&page_size=100&status=In+Progress",
      "/api/v1/da-services/grievances/GRV-000001",
      "/api/v1/da-services/grievances/GRV-000001/timeline",
    ]);
  });

  it("submits a grievance with the service's create body", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { ticket_id: null, ticket_number: null, sync_state: "pending", queue_ref: "EVT-1", message: "queued" } }, 201));
    const body: SubmitGrievanceRequest = {
      subject: "Canal not cleaned",
      description: "The irrigation canal has not been maintained this season.",
      priority: "Medium",
      raised_for: "Self",
      submitter_type: "Individual Farmer",
      submitter_name: "Abebe Bikila",
      contact_mobile: "0911000000",
      administrative_area: "kebele-ET140108101008",
      administrative_unit: "Kebele 01 Center",
      service_category: "Water & Resources",
      grievance_type: "Canal maintenance problems",
      desired_outcome: "Canal cleaned before the next irrigation cycle",
      consent_given: 1,
      is_anonymous: 0,
      client_op_id: "op-1",
    };

    await expect(submitGrievance(body)).resolves.toMatchObject({ ticket_id: null, ticket_number: null, sync_state: "pending" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/grievances");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual(body);
  });
});

describe("mapping", () => {
  it("maps a ticket onto a table row", () => {
    expect(toGrievance(row)).toMatchObject({
      ticketId: "GRV-000001",
      title: "Canal not cleaned",
      category: "Water & Resources",
      status: "In Progress",
      location: "Kebele 01 Center",
      raisedBy: "DA",
      fromApi: true,
    });
  });

  it("builds the case thread, submitter and SLA from the detail and timeline", () => {
    const c = caseFromApi(toGrievance(row), detail, [
      { timestamp: "2026-09-20T10:00:00Z", action: "submission", actor: "Abebe Bikila", detail: "Canal not cleaned" },
      { timestamp: "2026-09-21T08:00:00Z", action: "assignment", actor: "Woreda office", detail: "To inputs desk" },
    ]);
    // The timeline's own "submission" entry is dropped (we synthesise the submission block from the description).
    expect(c.thread.map((m) => m.kind)).toEqual(["submission", "event"]);
    expect(c.grievance).toMatchObject({ status: "In Progress", type: "Canal maintenance problems" });
    expect(c.submitter).toMatchObject({ name: "Abebe Bikila", kind: "Individual Farmer" });
    expect(c.sla.consumedPct).toBe(40);
  });
});
