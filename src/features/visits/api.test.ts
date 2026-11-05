import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { canActOnVisit, canAddEvidence, canCancel, canLogOutcome, canReschedule, canStartVisit, cancelVisit, evidenceProblem, fetchActivityReport, fetchVisit, formatVisitTime, listVisits, rescheduleVisit, startVisit, submitVisitOutcome, toVisitRecord, uploadVisitEvidence, type ApiVisit } from "./api";

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

const fetchMock = vi.fn<typeof fetch>();

const apiVisit: ApiVisit = {
  name: "DA-VIS-2026-0000123",
  da_id: "DA-000003",
  farmer_id: "FRM-000103",
  visit_type: "Advisory",
  purpose: "Input advisory",
  scheduled_at: "2026-10-16T10:30:00",
  duration_min: 60,
  kebele: null,
  plot_ref: null,
  assigned_by: null,
  physical_status: "Planned",
  ui_status: "Planned",
};

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "DA", { accessToken: "t", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

describe("listVisits", () => {
  it("asks for one day and returns rows with the total", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: [apiVisit], meta: { total: 1, limit: 50, start: 0 } })));

    await expect(listVisits({ date: "2026-10-16" })).resolves.toEqual({ items: [apiVisit], total: 1 });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/visits?date=2026-10-16");
  });

  it("passes da_id and leaves it out when there is none", async () => {
    fetchMock.mockImplementation(async () => new Response(JSON.stringify({ data: [], meta: { total: 0 } })));

    await listVisits({ date: "2026-10-16", da_id: "DA-000003" });
    await listVisits({ date: "2026-10-16", da_id: undefined });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/visits?date=2026-10-16&da_id=DA-000003");
    expect(fetchMock.mock.calls[1][0]).toBe("/api/v1/da-services/visits?date=2026-10-16");
  });
});

describe("canActOnVisit", () => {
  it("lets a DA act only on their own visit and leaves officers alone", () => {
    const visit = { agent: "DA-000003" };
    expect(canActOnVisit(visit, true, "DA-000003")).toBe(true);
    expect(canActOnVisit(visit, true, "DA-000009")).toBe(false);
    expect(canActOnVisit(visit, true, null)).toBe(false);
    expect(canActOnVisit(visit, false, null)).toBe(true);
  });
});

describe("toVisitRecord", () => {
  it("maps an API visit onto a table row", () => {
    expect(toVisitRecord(apiVisit)).toEqual({
      id: "DA-VIS-2026-0000123",
      date: "Oct 16, 2026",
      time: "10:30",
      agent: "DA-000003",
      farmerId: "FRM-000103",
      farmerName: "FRM-000103",
      farmerEmail: "",
      kebele: "—",
      purpose: "Input advisory",
      status: "Planned",
      plotRef: "—",
      durationMin: 60,
      assignedBy: undefined,
      physicalStatus: "Planned",
    });
  });

  it("shows a cancelled visit as Missed and falls back to the visit type", () => {
    expect(toVisitRecord({ ...apiVisit, ui_status: "Cancelled", purpose: null })).toMatchObject({ status: "Missed", purpose: "Advisory" });
  });
});

describe("startVisit", () => {
  it("posts the check-in with gps and the farmer present", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { ...apiVisit, physical_status: "In progress" } })));
    const body = { gps: { lat: 9.1236, lng: 37.5671, accuracy_m: 8 }, farmer_present: true as const, client_op_id: "op-1" };

    await expect(startVisit("DA-VIS-2026-0000123", body)).resolves.toMatchObject({ physical_status: "In progress" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/visits/DA-VIS-2026-0000123/start");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual(body);
  });

  it("offers Start only for planned or confirmed visits", () => {
    expect(canStartVisit({ physicalStatus: "Planned" })).toBe(true);
    expect(canStartVisit({ physicalStatus: "Confirmed" })).toBe(true);
    expect(canStartVisit({ physicalStatus: "In progress" })).toBe(false);
    expect(canStartVisit({})).toBe(false);
  });
});

describe("uploadVisitEvidence", () => {
  it("sends the file, kind and geo-tag as multipart form data", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { name: "ATT-1", kind: "Crop" } }), { status: 201 }));
    const file = new File([new Uint8Array([1, 2, 3])], "plot.jpg", { type: "image/jpeg" });

    await expect(uploadVisitEvidence("DA-VIS-1", { file, kind: "Crop", gps: { lat: 9.1236, lng: 37.5671 } })).resolves.toMatchObject({ name: "ATT-1" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/visits/DA-VIS-1/attachments");
    const headers = new Headers(init!.headers);
    // The browser sets the multipart Content-Type with its boundary; a JSON one would break the upload.
    expect(headers.get("Content-Type")).toBeNull();
    expect(headers.get("Authorization")).toBe("Bearer t");
    const form = init!.body as FormData;
    expect((form.get("file") as File).name).toBe("plot.jpg");
    expect([form.get("kind"), form.get("lat"), form.get("lng")]).toEqual(["Crop", "9.1236", "37.5671"]);
  });

  it("leaves the geo-tag out when there is no position", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { name: "ATT-2" } }), { status: 201 }));

    await uploadVisitEvidence("DA-VIS-1", { file: new File(["x"], "deed.pdf"), kind: "Document" });

    const form = fetchMock.mock.calls[0][1]!.body as FormData;
    expect(form.has("lat")).toBe(false);
  });
});

describe("evidence rules", () => {
  it("checks type and size before sending", () => {
    expect(evidenceProblem(new File(["x"], "plot.JPG"))).toBeNull();
    expect(evidenceProblem(new File(["x"], "notes.docx"))).toBe("Use a JPG, PNG, WEBP or PDF file.");
    expect(evidenceProblem(new File([new Uint8Array(10 * 1024 * 1024 + 1)], "big.png"))).toBe("The file is larger than 10 MB.");
  });

  it("allows evidence on open and completed visits only", () => {
    expect(canAddEvidence({ physicalStatus: "In progress" })).toBe(true);
    expect(canAddEvidence({ physicalStatus: "Physical Visit Complete" })).toBe(true);
    expect(canAddEvidence({ physicalStatus: "Cancelled" })).toBe(false);
    expect(canAddEvidence({})).toBe(false);
  });
});

describe("visit detail and outcome", () => {
  it("reads one visit", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { ...apiVisit, timeline: [], attachments: [] } })));

    await expect(fetchVisit("DA-VIS-1")).resolves.toMatchObject({ name: "DA-VIS-2026-0000123", timeline: [] });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/visits/DA-VIS-1");
  });

  it("submits the outcome with the next action", async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ data: { ...apiVisit, physical_status: "Physical Visit Complete", ui_status: "Completed" } })));
    const body = { observed: "Rust on lower leaves", advice_given: "Spray fungicide", next_action: { type: "Follow-up visit" as const, note: "Check rust", date: "2026-10-22" }, client_op_id: "op-2" };

    await expect(submitVisitOutcome("DA-VIS-1", body)).resolves.toMatchObject({ ui_status: "Completed" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/visits/DA-VIS-1/submit");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init!.body as string)).toEqual(body);
  });

  it("offers the outcome once checked in", () => {
    expect(canLogOutcome({ physicalStatus: "In progress" })).toBe(true);
    expect(canLogOutcome({ physicalStatus: "Planned" })).toBe(false);
  });

  it("formats site-local timestamps without shifting them", () => {
    expect(formatVisitTime("2026-10-15T15:48:22.563566")).toBe("15 Oct, 15:48");
    expect(formatVisitTime(null)).toBe("");
  });
});

describe("reschedule, cancel and weekly report", () => {
  const ok = (data: unknown) => new Response(JSON.stringify({ data }));

  it("reschedules with date, time and reason and returns the new visit", async () => {
    fetchMock.mockResolvedValueOnce(ok({ ...apiVisit, name: "DA-VIS-NEW" }));

    await expect(rescheduleVisit("DA-VIS-1", { date: "2026-10-18", time: "11:00", reason: "Farmer unavailable" })).resolves.toMatchObject({ name: "DA-VIS-NEW" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/visits/DA-VIS-1/reschedule");
    expect(JSON.parse(init!.body as string)).toEqual({ date: "2026-10-18", time: "11:00", reason: "Farmer unavailable" });
  });

  it("cancels with a reason", async () => {
    fetchMock.mockResolvedValueOnce(ok({ ...apiVisit, physical_status: "Cancelled" }));

    await cancelVisit("DA-VIS-1", "Farmer moved");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/visits/DA-VIS-1/cancel");
    expect(JSON.parse(init!.body as string)).toEqual({ reason: "Farmer moved" });
  });

  it("asks for a given week, or the current one", async () => {
    fetchMock.mockImplementation(() => Promise.resolve(ok({ week: "2026-W42" })));

    await fetchActivityReport("2026-W42");
    await fetchActivityReport();

    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["/api/v1/da-services/reports/activity?week=2026-W42", "/api/v1/da-services/reports/activity"]);
  });

  it("offers reschedule and cancel on visits that are still open", () => {
    expect(canReschedule({ physicalStatus: "Confirmed" })).toBe(true);
    expect(canReschedule({ physicalStatus: "In progress" })).toBe(false);
    expect(canCancel({ physicalStatus: "In progress" })).toBe(true);
    expect(canCancel({ physicalStatus: "Physical Visit Complete" })).toBe(false);
  });
});
