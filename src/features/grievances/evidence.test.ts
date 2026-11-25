import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { evidenceScanLabel, fetchGrievanceEvidenceFile, isEvidenceViewable, listGrievanceEvidence, uploadEvidenceDocument, uploadGrievanceEvidence, useEvidenceStore, type GrievanceAttachment } from "./evidence";

// Minimal in-memory Storage so the persisted stores run under Node.
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
const TICKET = "0-004-000F-0";
const BASE = `/api/v1/da-services/grievances/${TICKET}/attachments`;

const attachment = (over: Partial<GrievanceAttachment> = {}): GrievanceAttachment => ({
  attachment_id: "GAT-00001",
  file_name: "receipt.pdf",
  mime_type: "application/pdf",
  size_bytes: 2048,
  document_type: null,
  scan_status: "Pending",
  scanned_at: null,
  uploaded_at: "2026-11-15 09:59:00",
  ...over,
});

const pdf = () => new File(["%PDF-1.4 evidence"], "receipt.pdf", { type: "application/pdf" });

/** The [url, init] of the nth fetch call. */
const call = (n = 0) => fetchMock.mock.calls[n] as [string, RequestInit];

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useEvidenceStore.setState({ documents: [] });
  useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "DA", { accessToken: "t", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

describe("grievance evidence api", () => {
  it("uploads one file as multipart to the ticket", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: "success", data: [attachment()] }, 201));
    const uploaded = await uploadGrievanceEvidence(TICKET, pdf(), "Receipt");

    expect(uploaded.attachment_id).toBe("GAT-00001");
    const [url, init] = call();
    expect(url).toBe(BASE);
    expect(init.method).toBe("POST");
    const body = init.body as FormData;
    expect(body).toBeInstanceOf(FormData);
    expect((body.get("files") as File).name).toBe("receipt.pdf");
    expect(body.get("document_type")).toBe("Receipt");
    const headers = init.headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer t");
    // The browser writes the multipart Content-Type, boundary included.
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("escapes the ticket in the path", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [] }));
    await listGrievanceEvidence("a/b c");
    expect(call()[0]).toBe("/api/v1/da-services/grievances/a%2Fb%20c/attachments");
  });

  it("passes on the service's reason for a refusal", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: "error", message: "A grievance may carry at most 10 attachments." }, 400));
    const err = await uploadGrievanceEvidence(TICKET, pdf()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).message).toBe("A grievance may carry at most 10 attachments.");
  });

  it("treats a success without an attachment as a failure", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: "success", data: [] }, 201));
    await expect(uploadGrievanceEvidence(TICKET, pdf())).rejects.toThrow("The document was not attached. Try again.");
  });

  it("lists the documents on the grievance", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [attachment({ scan_status: "Clean" }), attachment({ attachment_id: "GAT-00002" })] }));
    const items = await listGrievanceEvidence(TICKET);
    expect(call()[0]).toBe(BASE);
    expect(items.map((a) => a.attachment_id)).toEqual(["GAT-00001", "GAT-00002"]);
    expect(items.map(isEvidenceViewable)).toEqual([true, false]);
  });

  it("reads a missing list as empty", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: null }));
    expect(await listGrievanceEvidence(TICKET)).toEqual([]);
  });

  it("fetches the file bytes with the session's token", async () => {
    fetchMock.mockResolvedValueOnce(new Response("%PDF-1.4 evidence", { status: 200, headers: { "Content-Type": "application/pdf" } }));
    const blob = await fetchGrievanceEvidenceFile(TICKET, "GAT-00001");
    expect(await blob.text()).toBe("%PDF-1.4 evidence");
    const [url, init] = call();
    expect(url).toBe(`${BASE}/GAT-00001/view`);
    expect((init.headers as Record<string, string>).Authorization).toBe("Bearer t");
  });

  it("reports why a file cannot be opened", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: "error", code: "VALIDATION_ERROR", message: "receipt.pdf is not available: its scan status is Pending." }, 400));
    const err = await fetchGrievanceEvidenceFile(TICKET, "GAT-00001").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(400);
    expect((err as ApiError).message).toBe("receipt.pdf is not available: its scan status is Pending.");
  });

  it("names the scan status for the list", () => {
    expect(evidenceScanLabel("Clean")).toEqual({ label: "Ready", tone: "green" });
    expect(evidenceScanLabel("Infected")).toEqual({ label: "Blocked", tone: "red" });
    expect(evidenceScanLabel("Pending")).toEqual({ label: "Scanning", tone: "amber" });
    expect(evidenceScanLabel(null)).toEqual({ label: "Scanning", tone: "amber" });
  });
});

describe("uploadEvidenceDocument", () => {
  it("notes an uploaded document for the Documents tab", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [attachment()] }, 201));
    const doc = await uploadEvidenceDocument(TICKET, pdf());
    expect(doc).toMatchObject({ id: "GAT-00001", ticketId: TICKET, name: "receipt.pdf", size: 2048, type: "pdf" });
    expect(useEvidenceStore.getState().documents).toEqual([doc]);
  });

  it("notes nothing when the upload is refused", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: "error", message: "Grievance 0-004-000F-0 not found." }, 404));
    await expect(uploadEvidenceDocument(TICKET, pdf())).rejects.toThrow("not found");
    expect(useEvidenceStore.getState().documents).toEqual([]);
  });
});
