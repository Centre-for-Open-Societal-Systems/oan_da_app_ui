import { authRequest } from "@/features/auth";
import type { AppNotification } from "@/components/layout/NotificationsPanel";

interface ListResponse {
  data: AppNotification[];
  meta: { unread_count: number; limit: number; start: number };
}

export interface NotificationPage {
  items: AppNotification[];
  /** Unread across all of the user's notifications, not just this page: the bell badge. */
  unreadCount: number;
}

/** GET /api/v1/da-services/notifications: the signed-in user's own notifications, newest first. */
export async function listNotifications({ unread = false, limit = 20, start = 0 } = {}): Promise<NotificationPage> {
  const query = new URLSearchParams({ limit: String(limit), start: String(start) });
  if (unread) query.set("unread", "1");
  const res = await authRequest<ListResponse>(`/da-services/notifications?${query}`);
  return { items: res.data, unreadCount: res.meta.unread_count };
}

/** POST /notifications/{id}/read. Already-read rows are left as they are. */
export async function markNotificationRead(id: string): Promise<void> {
  await authRequest(`/da-services/notifications/${encodeURIComponent(id)}/read`, { method: "POST" });
}

/** POST /notifications/read-all. */
export async function markAllNotificationsRead(): Promise<void> {
  await authRequest("/da-services/notifications/read-all", { method: "POST" });
}

/** The notification kind the broadcast engine writes when a message reaches this user. */
export const BROADCAST_KIND = "Broadcast";

export interface BroadcastList {
  /** The user's received broadcasts, newest first. */
  items: AppNotification[];
  /** Unread broadcasts in this list (for a "new broadcasts" badge). */
  unreadCount: number;
}

/**
 * The signed-in user's received broadcasts (notifications of kind "Broadcast"), newest first.
 *
 * Read-only: there is no API to create a broadcast — the backend writes these rows on its own
 * events. The notifications endpoint has no server-side kind filter, so one page (default the
 * API max, 100) is fetched and filtered here. Follow-up: add a `kind=Broadcast` query param
 * to GET /notifications so older broadcasts past the first page are reachable.
 */
export async function listBroadcasts({ limit = 100 } = {}): Promise<BroadcastList> {
  const { items } = await listNotifications({ limit });
  const broadcasts = items.filter((n) => n.kind === BROADCAST_KIND);
  return { items: broadcasts, unreadCount: broadcasts.filter((n) => !n.read).length };
}

export interface BroadcastResult {
  /** Echoes the client_op_id the send used. */
  broadcastId: string;
  /** true when this client_op_id was already sent — nothing new was created. */
  duplicate: boolean;
  /** How many DAs received it. */
  recipients: number;
  /** The Woreda it went to (its name). */
  woreda: string;
}

/**
 * POST /da-services/notifications/broadcast — send an in-app broadcast to every DA in a Woreda.
 *
 * Roles: DA / Communications Officer / Admin, and the Woreda must be inside the caller's scope.
 *
 * scope_value is the Woreda NAME (e.g. "Bako Tibe"): the caller's RBAC woreda_scope is stored by name,
 * so the area CODE from GET /master/areas (e.g. "ET04-W01") is rejected with 403. client_op_id makes the
 * call idempotent — the same id returns the first result with duplicate=true instead of sending again.
 */
export async function broadcastToWoreda(input: {
  title: string;
  body?: string;
  href?: string;
  woreda: string;
  clientOpId?: string;
}): Promise<BroadcastResult> {
  interface Resp {
    data: { broadcast_id: string; duplicate: boolean; recipients: number; scope: string; scope_value: string };
  }
  const res = await authRequest<Resp>("/da-services/notifications/broadcast", {
    method: "POST",
    body: {
      title: input.title,
      body: input.body ?? "",
      href: input.href ?? "/notifications",
      scope: "woreda",
      scope_value: input.woreda,
      client_op_id: input.clientOpId ?? crypto.randomUUID(),
    },
  });
  return { broadcastId: res.data.broadcast_id, duplicate: res.data.duplicate, recipients: res.data.recipients, woreda: res.data.scope_value };
}
