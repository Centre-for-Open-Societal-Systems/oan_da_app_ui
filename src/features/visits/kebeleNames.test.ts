import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { kebeleName, loadKebeleNames } from "./kebeleNames";

const fetchMock = vi.fn<typeof fetch>();
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });

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

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "DA", { accessToken: "t", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

describe("kebeleName", () => {
  it("shows a Kebele's name once its Woreda's Kebeles are read", async () => {
    fetchMock.mockResolvedValueOnce(json({ data: [{ code: "ET140108101008", name: "Gedo 08", parent: "ET140108" }] }));
    expect(kebeleName("ET140108101008")).toBe("ET140108101008");
    await loadKebeleNames(["ET140108101008", "ET140108101008", null]);
    expect(kebeleName("ET140108101008")).toBe("Gedo 08");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock.mock.calls[0][0]).toContain("/api/v1/da-services/get_master_data?data_type=geo&field_name=kebele&parent=ET140108");
  });

  it("keeps a name or unknown value as given and never throws", async () => {
    fetchMock.mockResolvedValueOnce(json({ message: "down" }, 500));
    await expect(loadKebeleNames(["ET990101000001", "Bako Tibe"])).resolves.toBeUndefined();
    expect(kebeleName("ET990101000001")).toBe("ET990101000001");
    expect(kebeleName("Bako Tibe")).toBe("Bako Tibe");
    expect(kebeleName(null)).toBeNull();
  });
});
