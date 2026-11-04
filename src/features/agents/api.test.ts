import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiAgentToAgent, describeImportException, importStatusLabel, listAllImportExceptions } from "./api";

const { authRequest } = vi.hoisted(() => ({ authRequest: vi.fn() }));
vi.mock("@/features/auth", () => ({ authRequest }));

const row = (i: number, at: string) => ({ id: `e${i}`, exception_type: "DUPLICATE_IDENTITY", name: `Row ${i}`, created_at: at });
const page = (rows: unknown[], total: number) => ({ data: rows, meta: { total } });

beforeEach(() => {
  authRequest.mockReset();
});

describe("importStatusLabel", () => {
  it("says the registry has the file, not that it was processed", () => {
    expect(importStatusLabel("Queued")).toBe("Sent to registry");
    expect(importStatusLabel("Completed")).toBe("Sent to registry");
    expect(importStatusLabel("Failed")).toBe("Failed");
  });
});

describe("describeImportException", () => {
  it("reads a registry time without a zone as UTC", () => {
    const utc = Date.UTC(2026, 10, 3, 15, 57, 43);
    expect(describeImportException(row(1, "2026-11-03 15:57:43.123456")).raisedAtMs).toBe(utc + 123);
    expect(describeImportException(row(2, "2026-11-03T15:57:43")).raisedAtMs).toBe(utc);
  });

  it("keeps a time that names its zone", () => {
    expect(describeImportException(row(1, "2026-11-03T21:27:43+05:30")).raisedAtMs).toBe(Date.UTC(2026, 10, 3, 15, 57, 43));
  });

  it("has safe defaults for a row without the usual fields", () => {
    expect(describeImportException({}, 4)).toMatchObject({ id: "exception-5", kind: "Import exception", name: "Unknown agent", detail: "The registry gave no reason.", raisedAtMs: 0 });
  });
});

describe("listAllImportExceptions", () => {
  it("reads every page and orders newest first", async () => {
    const first = Array.from({ length: 50 }, (_, i) => row(i, "2026-11-03T10:00:00"));
    authRequest.mockResolvedValueOnce(page(first, 51)).mockResolvedValueOnce(page([row(50, "2026-11-03T12:00:00")], 51));

    const result = await listAllImportExceptions();

    expect(authRequest).toHaveBeenCalledTimes(2);
    expect(authRequest.mock.calls[1][0]).toContain("page=2");
    expect(result.items).toHaveLength(51);
    expect(result.items[0].id).toBe("e50");
    expect(result.truncated).toBe(false);
  });

  it("says so when the page limit stops it early", async () => {
    authRequest.mockResolvedValue(page(Array.from({ length: 50 }, (_, i) => row(i, "2026-11-03T10:00:00")), 500));
    const result = await listAllImportExceptions(2);
    expect(authRequest).toHaveBeenCalledTimes(2);
    expect(result).toMatchObject({ total: 500, truncated: true });
  });
});

describe("apiAgentToAgent", () => {
  it("prefers names and marks the record as coming from the registry", () => {
    const agent = apiAgentToAgent({ da_id: "DA-1", full_name: "QA Rakesh Test", woreda: "ET120205", woreda_name: "Dima (Gm)", approval_status: "Published", farmer_count: null } as Parameters<typeof apiAgentToAgent>[0]);
    expect(agent).toMatchObject({ daId: "DA-1", fullName: "QA Rakesh Test", woreda: "Dima (Gm)", farmerCount: 0, moaPublication: "Published", source: "DA Registry" });
  });
});
