import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchFarmerUpdateStatus, linkFarmer, listFarmerLinks, retryFarmerUpdate, updateFarmer } from "@/features/farmers";
import { retryGrievanceSync } from "@/features/grievances";
import { cancelChangeRequest, decideChangeRequest, describeProfileError, fetchMyProfile, fetchProfileDocument, listChangeRequests, submitChangeRequest } from "./api";

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

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const fetchMock = vi.fn<typeof fetch>();
const sentBody = (call: number) => JSON.parse(fetchMock.mock.calls[call][1]!.body as string);
const call = (n: number) => ({ url: fetchMock.mock.calls[n][0] as string, method: fetchMock.mock.calls[n][1]!.method });

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.getState().signIn({ id: "u", name: "User", email: "u@x" }, "DA", { accessToken: "token", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

describe("my profile", () => {
  it("reads GET /profile/my_profile and fills the lists that may be missing", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { status: "success", data: { profile: { da_id: "DA-1", full_name: "Abebe", internal_record_id: "r-1" }, validation: { record_found: true, record_status: "ACTIVE", is_active: true } } }));

    const my = await fetchMyProfile();

    expect(call(0)).toEqual({ url: "/api/v1/da-services/profile/my_profile", method: "GET" });
    expect(my.profile).toMatchObject({ da_id: "DA-1", internal_record_id: "r-1", qualifications: [], family_members: [] });
    expect(my.pending_requests).toEqual([]);
    expect(my.validation?.is_active).toBe(true);
  });

  it("asks for a certificate link by document_id", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { document_id: "doc 1", name: "Diploma", url: "https://files/x" } }));

    await expect(fetchProfileDocument("doc 1")).resolves.toMatchObject({ url: "https://files/x" });

    expect(call(0).url).toBe("/api/v1/da-services/profile/documents/doc%201");
  });

  it("shows the backend's 404 message and a generic text when the registry is not configured", async () => {
    fetchMock.mockResolvedValueOnce(json(404, { status: "error", code: "NOT_FOUND", message: "Your account is not linked to a DA Registry record." }));
    fetchMock.mockResolvedValueOnce(json(500, { status: "error", code: "DA_REGISTRY_NOT_CONFIGURED", message: "DA_REGISTRY_URL is not set" }));

    const notLinked = await fetchMyProfile().catch((e: unknown) => e);
    const notConfigured = await fetchMyProfile().catch((e: unknown) => e);

    expect(describeProfileError(notLinked)).toBe("Your account is not linked to a DA Registry record.");
    expect(describeProfileError(notConfigured)).toBe("Your profile could not be loaded right now. Try again later.");
  });
});

describe("profile change requests", () => {
  it("submits changes with the reason and client_op_id", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: { request_id: "CR-1", status: "Pending" } }));

    await submitChangeRequest({ mobile: "+251911000111" }, "New SIM card", "op-1", "DA-1");

    expect(call(0)).toEqual({ url: "/api/v1/da-services/profile/change-requests", method: "POST" });
    expect(sentBody(0)).toEqual({ da_id: "DA-1", changes: { mobile: "+251911000111" }, reason: "New SIM card", client_op_id: "op-1" });
  });

  it("lists by status and reads meta.total", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [{ request_id: "CR-1" }], meta: { total: 4 } }));

    await expect(listChangeRequests({ status: "Pending" })).resolves.toEqual({ items: [{ request_id: "CR-1" }], total: 4 });

    expect(new URL(call(0).url, "http://x").searchParams.get("status")).toBe("Pending");
  });

  it("cancels and decides on the request path", async () => {
    fetchMock.mockImplementation(async () => json(200, { data: { request_id: "CR-1" } }));

    await cancelChangeRequest("CR-1");
    await decideChangeRequest("CR-1", "Request changes", "Add the SIM receipt");

    expect(call(0)).toEqual({ url: "/api/v1/da-services/profile/change-requests/CR-1/cancel", method: "POST" });
    expect(call(1)).toEqual({ url: "/api/v1/da-services/profile/change-requests/CR-1/decide", method: "POST" });
    expect(sentBody(1)).toEqual({ decision: "Request changes", note: "Add the SIM receipt" });
  });
});

describe("farmer updates and links", () => {
  it("PATCHes the farmer with the edits and client_op_id", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { event_id: "E-1", status: "queued", updates: { household_size: 6 } } }));

    await updateFarmer("FRM-1", { household_size: 6 }, "op-2");

    expect(call(0)).toEqual({ url: "/api/v1/da-services/farmers/FRM-1", method: "PATCH" });
    expect(sentBody(0)).toEqual({ household_size: 6, client_op_id: "op-2" });
  });

  it("reads the queued updates of a farmer", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { pending_updates: [{ event_id: "E-1", status: "Pending" }], total_pending: 1 } }));

    await expect(fetchFarmerUpdateStatus("FRM-1")).resolves.toEqual({ pending: [{ event_id: "E-1", status: "Pending" }], total: 1 });
  });

  it("retries a failed update", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: {} }));

    await retryFarmerUpdate("E-1");

    expect(call(0)).toEqual({ url: "/api/v1/da-services/farmers/updates/E-1/retry", method: "POST" });
  });

  it("lists and creates farmer links", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [] }));
    fetchMock.mockResolvedValueOnce(json(201, { data: { link_id: "L-1", link_type: "Manual" } }));

    await listFarmerLinks({ daId: "DA-000001", active: true });
    await linkFarmer("DA-000001", "FRM-1", "op-3");

    const query = new URL(call(0).url, "http://x").searchParams;
    expect(Object.fromEntries(query)).toEqual({ da_id: "DA-000001", is_active: "1" });
    expect(call(1)).toEqual({ url: "/api/v1/da-services/farmer-links", method: "POST" });
    expect(sentBody(1)).toEqual({ da_id: "DA-000001", farmer_id: "FRM-1", client_op_id: "op-3" });
  });
});

describe("retryGrievanceSync", () => {
  it("retries one named event or all when none is given", async () => {
    fetchMock.mockImplementation(async () => json(200, { data: { retried: [], count: 0 } }));

    await retryGrievanceSync("grievance.submit");
    await retryGrievanceSync();

    expect(call(0).url).toBe("/api/v1/da-services/grievances/sync/retry");
    expect(sentBody(0)).toEqual({ event_name: "grievance.submit" });
    expect(sentBody(1)).toEqual({});
  });
});
