import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorMessage } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { createRbacAssignment, registerUser, type NewUser } from "./api";
import { generatePassword } from "./password";

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

const base: NewUser = { fullName: "Hana Alemu", email: "hana@moa.gov.et", password: "Pw#12345abcd", role: "DA", daId: "DA-000003", regionScope: "Oromia", woredaScope: "Bako Tibe", effectiveFrom: "2026-10-15" };

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.getState().signIn({ id: "Administrator", name: "Administrator", email: "Administrator" }, "Admin", { accessToken: "admin-token", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

describe("registerUser", () => {
  it("registers with the backend role name as the Admin and returns the new user id", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { user: "abc@id.openagrinet.internal", access_token: "new-user-token" } }));

    await expect(registerUser(base)).resolves.toBe("abc@id.openagrinet.internal");

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/auth/register");
    expect(new Headers(init!.headers).get("Authorization")).toBe("Bearer admin-token");
    expect(sentBody(0)).toEqual({ email: "hana@moa.gov.et", full_name: "Hana Alemu", password: "Pw#12345abcd", role: "Development Agent" });
    // The new account's tokens must not replace the Admin's session.
    expect(useAuthStore.getState().tokens?.accessToken).toBe("admin-token");
  });
});

describe("createRbacAssignment", () => {
  it("sends the DA-ID and woreda for a Development Agent", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: { name: "DA-RBAC-1" } }));

    await createRbacAssignment("abc@id", base);

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/rbac-assignments");
    expect(sentBody(0)).toEqual({ user: "abc@id", role: "Development Agent", da_id: "DA-000003", region_scope: "Oromia", woreda_scope: "Bako Tibe", effective_from: "2026-10-15" });
  });

  it("sends the Zone code with the Woreda", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: { name: "DA-RBAC-3" } }));

    await createRbacAssignment("abc@id", { ...base, role: "Supervisor", regionScope: "ET12", zoneScope: "ET1202", woredaScope: "ET120205" });

    expect(sentBody(0)).toEqual({ user: "abc@id", role: "Supervisor", region_scope: "ET12", zone_scope: "ET1202", woreda_scope: "ET120205", effective_from: "2026-10-15" });
  });

  it("leaves out DA-ID and woreda for a region-wide Executive", async () => {
    fetchMock.mockResolvedValueOnce(json(201, { data: { name: "DA-RBAC-2" } }));

    await createRbacAssignment("abc@id", { ...base, role: "Executive", woredaScope: undefined, effectiveTo: "2026-12-31" });

    expect(sentBody(0)).toEqual({ user: "abc@id", role: "Executive", region_scope: "Oromia", effective_from: "2026-10-15", effective_to: "2026-12-31" });
  });
});

describe("errorMessage", () => {
  it("prefers field errors over a generic message", () => {
    expect(errorMessage({ message: "Validation failed", details: { password: "String should have at least 8 characters" } })).toBe("String should have at least 8 characters");
    expect(errorMessage({ message: "A user with this email address already exists.", details: {} })).toBe("A user with this email address already exists.");
  });
});

describe("generatePassword", () => {
  it("gives 12 characters with every character class", () => {
    for (let i = 0; i < 50; i++) {
      const pwd = generatePassword();
      expect(pwd).toHaveLength(12);
      expect(pwd).toMatch(/[A-Z]/);
      expect(pwd).toMatch(/[a-z]/);
      expect(pwd).toMatch(/[0-9]/);
      expect(pwd).toMatch(/[#@$%&*!?]/);
    }
  });
});
