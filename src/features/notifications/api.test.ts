import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuthStore } from "@/store/useAuthStore";
import { broadcastToWoreda, listNotifications, markAllNotificationsRead, markNotificationRead } from "./api";

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

beforeEach(() => {
  globalThis.sessionStorage = new MemoryStorage();
  globalThis.localStorage = new MemoryStorage();
  fetchMock.mockReset();
  vi.stubGlobal("fetch", fetchMock);
  useAuthStore.getState().signIn({ id: "u", name: "u", email: "u" }, "DA", { accessToken: "t", refreshToken: "r", expiresAt: Date.now() + 600_000 });
});

describe("notifications api", () => {
  it("lists unread notifications with paging and returns the badge count", async () => {
    const row = { id: "N-1", kind: "Task", title: "t", body: null, href: "/tasks/T-1", read: false, at: "2026-10-15T09:00:00" };
    fetchMock.mockResolvedValueOnce(json(200, { data: [row], meta: { unread_count: 7, limit: 20, start: 20 } }));

    await expect(listNotifications({ unread: true, start: 20 })).resolves.toEqual({ items: [row], unreadCount: 7 });
    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/notifications?limit=20&start=20&unread=1");
  });

  it("leaves out unread for the full list", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: [], meta: { unread_count: 0, limit: 20, start: 0 } }));

    await listNotifications();

    expect(fetchMock.mock.calls[0][0]).toBe("/api/v1/da-services/notifications?limit=20&start=0");
  });

  it("marks one or all read with POST", async () => {
    fetchMock.mockResolvedValue(json(200, { data: {} }));

    await markNotificationRead("DA-NOTIF-0001");
    await markAllNotificationsRead();

    expect(fetchMock.mock.calls.map(([url, init]) => [url, init?.method])).toEqual([
      ["/api/v1/da-services/notifications/DA-NOTIF-0001/read", "POST"],
      ["/api/v1/da-services/notifications/read-all", "POST"],
    ]);
  });

  it("broadcasts to a Woreda by its code", async () => {
    fetchMock.mockResolvedValueOnce(json(200, { data: { broadcast_id: "B-1", duplicate: false, recipients: 3, scope: "woreda", scope_value: "ET120205" } }));

    const result = await broadcastToWoreda({ title: "Title", body: "Message", woredaCode: "ET120205", clientOpId: "op-1" });

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe("/api/v1/da-services/notifications/broadcast");
    expect(JSON.parse(String(init?.body))).toMatchObject({ scope: "woreda", scope_value: "ET120205", client_op_id: "op-1" });
    expect(result).toEqual({ broadcastId: "B-1", duplicate: false, recipients: 3, woredaCode: "ET120205" });
  });
});
