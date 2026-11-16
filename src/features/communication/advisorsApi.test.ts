import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { createAdvisor, describeAdvisorError, fetchAdvisor, listAdvisors } from "./advisorsApi";

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

const ROW = {
  id: "ADV-0007",
  name: "Dr. Hanna Girma",
  expertise: "Agronomy",
  unit: "Crop Development Directorate",
  region: "Sidama",
  woreda: "Hawassa Zuria",
  phone: "+251 91 623 0458",
  email: "hanna.g@moa.gov.et",
  status: "Active",
  availability: "Mon–Fri, 08:30–17:00",
  updated_at: "2026-11-16 16:07:07",
};

describe("advisors API", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    useAuthStore.setState({ tokens: { accessToken: "tok", refreshToken: "", expiresAt: Date.now() + 600_000 } });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    useAuthStore.setState({ tokens: null });
  });

  it("lists the directory and formats the update time", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [ROW, { ...ROW, id: "ADV-0008", updated_at: null }] }));
    const rows = await listAdvisors();
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/advisors?limit=500");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({
      id: "ADV-0007",
      name: "Dr. Hanna Girma",
      expertise: "Agronomy",
      unit: "Crop Development Directorate",
      region: "Sidama",
      woreda: "Hawassa Zuria",
      phone: "+251 91 623 0458",
      email: "hanna.g@moa.gov.et",
      status: "Active",
      availability: "Mon–Fri, 08:30–17:00",
      updatedAt: "16 Nov 2026, 16:07",
    });
    expect(rows[1].updatedAt).toBe("—");
  });

  it("returns an empty list when the directory is empty", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [] }));
    expect(await listAdvisors()).toEqual([]);
  });

  it("reads one advisor by id", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: ROW }));
    const advisor = await fetchAdvisor("ADV 7/x");
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/advisors/ADV%207%2Fx");
    expect(advisor.name).toBe("Dr. Hanna Girma");
  });

  it("posts the form and returns the saved advisor", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: ROW }));
    const input = { name: ROW.name, expertise: "Agronomy" as const, unit: ROW.unit, region: ROW.region, woreda: ROW.woreda, phone: ROW.phone, email: ROW.email, status: "Active" as const, availability: "" };
    const saved = await createAdvisor(input);
    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/advisors");
    expect(init.method).toBe("POST");
    expect(JSON.parse(init.body)).toEqual(input);
    expect(saved.id).toBe("ADV-0007");
  });

  it("describes failures", () => {
    expect(describeAdvisorError(new ApiError("x", 401))).toBe("Your session has ended. Please sign in again.");
    expect(describeAdvisorError(new ApiError("x", 403))).toBe("Only an Administrator can add advisors.");
    expect(describeAdvisorError(new ApiError("x", 404))).toBe("Advisor not found.");
    expect(describeAdvisorError(new ApiError("Use an Ethiopian mobile number, e.g. +251 91 234 5678.", 400))).toBe("Use an Ethiopian mobile number, e.g. +251 91 234 5678.");
    expect(describeAdvisorError(new Error("offline"))).toBe("offline");
  });
});
