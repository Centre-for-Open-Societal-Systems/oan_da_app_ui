import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiAgentToAgent, describeImportException, importStatusLabel, listAllImportExceptions, listAgents, listMyTeam } from "./api";

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

describe("listMyTeam", () => {
  it("reads the team from /agents/my-team with comma-separated filters", async () => {
    const facets = { kebele: [{ value: "ET04-W01-K03", label: "Bako 03", count: 1 }] };
    authRequest.mockResolvedValueOnce({ data: { scope: "woreda", areas: ["ET04-W01"], agents: [{ da_id: "DA-000001" }, { da_id: "DA-000002" }], total: 2, facets } });

    const team = await listMyTeam({ search: "DA-0000", filters: { kebele: ["ET04-W01-K03", "unassigned"], active_status: [] }, limit: 20, start: 20 });

    const url = authRequest.mock.calls[0][0] as string;
    const params = new URLSearchParams(url.split("?")[1]);
    expect(url.startsWith("/da-services/agents/my-team?")).toBe(true);
    expect(params.get("search")).toBe("DA-0000");
    expect(params.get("kebele")).toBe("ET04-W01-K03,unassigned");
    expect(params.has("active_status")).toBe(false);
    expect(params.get("limit")).toBe("20");
    expect(params.get("start")).toBe("20");
    expect(team).toMatchObject({ scope: "woreda", areas: ["ET04-W01"], total: 2, facets });
    expect(team.agents).toHaveLength(2);
  });

  it("asks for 50 from the start by default", async () => {
    authRequest.mockResolvedValueOnce({ data: { scope: "all", areas: [], agents: [], total: 0 } });
    await listMyTeam();
    const params = new URLSearchParams((authRequest.mock.calls[0][0] as string).split("?")[1]);
    expect([params.get("limit"), params.get("start")]).toEqual(["50", "0"]);
  });

  it("reads a response without the optional fields as an empty team", async () => {
    authRequest.mockResolvedValueOnce({ data: {} });
    expect(await listMyTeam()).toEqual({ scope: "none", areas: [], agents: [], total: 0, facets: {} });
  });
});

describe("listAgents", () => {
  it("sends several values per filter comma-separated and returns the facets", async () => {
    const facets = { region: [{ value: "ET04", label: "Oromia", count: 2 }] };
    authRequest.mockResolvedValueOnce({ data: { agents: [], total: 0, facets } });

    const result = await listAgents({ search: "abe", filters: { region: ["ET04", "ET03"], approval_status: ["Published"] }, limit: 25 });

    const params = new URLSearchParams((authRequest.mock.calls[0][0] as string).split("?")[1]);
    expect(params.get("region")).toBe("ET04,ET03");
    expect(params.get("approval_status")).toBe("Published");
    expect(params.get("search")).toBe("abe");
    expect(params.get("limit")).toBe("25");
    expect(result.facets).toEqual(facets);
  });

  it("keeps the single-value parameters other screens use", async () => {
    authRequest.mockResolvedValueOnce({ data: { agents: [], total: 0 } });

    const result = await listAgents({ woreda: "ET04-W01", activeStatus: "Active" });

    const params = new URLSearchParams((authRequest.mock.calls[0][0] as string).split("?")[1]);
    expect(params.get("woreda")).toBe("ET04-W01");
    expect(params.get("active_status")).toBe("Active");
    expect(result.facets).toEqual({});
  });

  it("lets the filters win over a single value of the same field", async () => {
    authRequest.mockResolvedValueOnce({ data: { agents: [], total: 0 } });
    await listAgents({ woreda: "ET04-W01", filters: { woreda: ["ET03-W02"] } });
    expect(new URLSearchParams((authRequest.mock.calls[0][0] as string).split("?")[1]).get("woreda")).toBe("ET03-W02");
  });
});
