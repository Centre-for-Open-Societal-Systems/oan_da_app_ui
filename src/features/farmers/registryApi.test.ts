import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { ApiError } from "@/lib/api";
import { documentProblem, fetchFieldOptions, fetchPlaces, fetchRegistrationStatus, optionsFor, registerFarmer, uploadIdentityDocument, type RegistrationBody } from "./registryApi";

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

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "DA", { accessToken: "t", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

describe("registration form data", () => {
  it("reads the field-options lists and finds a field in whichever register has it", async () => {
    const options = { farmer: { gender: [{ value: "male", label: "Male" }] }, land: { ownership: [{ value: "owner", label: "Owner" }] } };
    fetchMock.mockResolvedValueOnce(json({ status: "success", data: { registry: "farmer", options } }));
    const read = await fetchFieldOptions();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/registries/farmer/field-options");
    expect(optionsFor(read, "ownership")).toEqual([{ value: "owner", label: "Owner" }]);
    expect(optionsFor(read, "nope")).toBeUndefined();
  });

  it("asks for the places of a level under the chosen parent", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { places: [{ id: "ET04", name: "Oromia" }] } })).mockResolvedValueOnce(json({ data: { places: [{ id: "ET04080101", name: "K" }] } }));
    await expect(fetchPlaces("region")).resolves.toEqual([{ id: "ET04", name: "Oromia" }]);
    await fetchPlaces("kebele", "ET040801");
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual([
      "/api/v1/da-services/registries/farmer/places?level=region",
      "/api/v1/da-services/registries/farmer/places?level=kebele&parent=ET040801",
    ]);
  });
});

describe("the ID document", () => {
  it("accepts PDF, JPEG and PNG up to 5 MB", () => {
    expect(documentProblem({ type: "application/pdf", size: 1000 })).toBeNull();
    expect(documentProblem({ type: "image/gif", size: 1000 })).toContain("PDF, JPEG or PNG");
    expect(documentProblem({ type: "image/png", size: 6 * 1024 * 1024 })).toContain("5 MB");
  });

  it("uploads it as multipart 'file' and returns the document_id", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { document_id: "doc-1" } }));
    await expect(uploadIdentityDocument(new File(["%PDF"], "id.pdf", { type: "application/pdf" }))).resolves.toBe("doc-1");
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/farmers/registrations/documents");
    expect(init?.method).toBe("POST");
    expect((init?.body as FormData).get("file")).toBeInstanceOf(File);
  });

  it("refuses a wrong file before sending it", async () => {
    await expect(uploadIdentityDocument(new File(["x"], "id.gif", { type: "image/gif" }))).rejects.toMatchObject({ status: 400 });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});

describe("submitting", () => {
  const body = { client_op_id: "reg-1", first_name: "Abebe", kebele: "ET04080101", identity_document_id: "doc-1" } as RegistrationBody;

  it("posts the body and returns the submission waiting for approval", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { submission_id: "sub-1", status: "PENDING_APPROVAL" } }));
    await expect(registerFarmer(body)).resolves.toEqual({ submission_id: "sub-1", status: "PENDING_APPROVAL" });
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/farmers");
    expect(JSON.parse(String(init?.body))).toEqual(body);
  });

  it("keeps a 400's field details on the error", async () => {
    fetchMock.mockResolvedValueOnce(json({ status: "error", code: "VALIDATION_ERROR", message: "Validation failed", details: { kebele: "Kebele is required" } }, 400));
    const err = await registerFarmer(body).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(err).toMatchObject({ status: 400, code: "VALIDATION_ERROR", details: { kebele: "Kebele is required" } });
  });

  it("reads a registration's status", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: { status: "APPROVED", application_reference: "2026NOV02-1" } }));
    await expect(fetchRegistrationStatus("sub-1")).resolves.toMatchObject({ status: "APPROVED" });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/farmers/registrations/sub-1");
  });
});
