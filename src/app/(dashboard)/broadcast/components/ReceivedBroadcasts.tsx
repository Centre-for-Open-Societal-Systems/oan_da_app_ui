"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill } from "@/components/ui/Pill";
import { useAuthStore } from "@/store/useAuthStore";
import { listBroadcasts, markNotificationRead } from "@/features/notifications";
import type { AppNotification } from "@/components/layout/NotificationsPanel";

// One page at the API's maximum; the table searches and pages it client-side (see listBroadcasts).
const PAGE_MAX = 100;

function receivedLabel(at: string): string {
  const d = new Date(at);
  if (Number.isNaN(d.getTime())) return at;
  return d.toLocaleString("en-US", { day: "numeric", month: "short", year: "numeric", hour: "numeric", minute: "2-digit" });
}

type Loaded = { reload: number; rows: AppNotification[]; error: string | null };

// Read-only list of broadcasts sent to the signed-in user (GET /da-services/notifications, kind "Broadcast").
export function ReceivedBroadcasts() {
  const router = useRouter();
  const hasSession = useAuthStore((s) => !!s.tokens);
  const [reload, setReload] = useState(0);
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    if (!hasSession) return;
    let current = true;
    listBroadcasts({ limit: PAGE_MAX })
      .then(({ items }) => current && setLoaded({ reload, rows: items, error: null }))
      .catch((err: unknown) => current && setLoaded({ reload, rows: [], error: err instanceof Error ? err.message : "Could not load broadcasts." }));
    return () => {
      current = false;
    };
  }, [reload, hasSession]);

  const loading = loaded?.reload !== reload;
  const rows = loaded?.rows ?? [];
  const error = loaded?.error ?? null;
  const refresh = () => setReload((r) => r + 1);

  // Open the broadcast's target (if any) and mark it read; the badge/count self-corrects if the call fails.
  const open = (n: AppNotification) => {
    if (!n.read) {
      setLoaded((prev) => (prev ? { ...prev, rows: prev.rows.map((r) => (r.id === n.id ? { ...r, read: true } : r)) } : prev));
      markNotificationRead(n.id).catch(() => {});
    }
    if (n.href) router.push(n.href);
  };

  const columns: Column<AppNotification>[] = [
    {
      key: "title",
      header: "Broadcast",
      cell: (n) => (
        <div className="flex items-center gap-2">
          {!n.read && <span className="h-2 w-2 shrink-0 rounded-full bg-brand-green" aria-label="Unread" />}
          <span className={n.read ? "text-[14px] text-ink" : "text-[14px] font-semibold text-ink"}>{n.title}</span>
        </div>
      ),
    },
    { key: "body", header: "Message", cell: (n) => <span className="line-clamp-2 block max-w-[460px] text-[13px] text-ink-soft">{n.body ?? "—"}</span> },
    { key: "status", header: "Status", cell: (n) => <Pill tone={n.read ? "slate" : "green"}>{n.read ? "Read" : "New"}</Pill> },
    { key: "at", header: "Received", cell: (n) => <span className="whitespace-nowrap text-[13px] text-muted">{receivedLabel(n.at)}</span> },
  ];

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <DataTable
        itemLabel="broadcasts"
        title={
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Received broadcasts</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">Broadcasts sent to you, newest first. Select one to open it and mark it read.</p>
          </div>
        }
        searchable
        columns={columns}
        rows={rows}
        rowKey={(n) => n.id}
        state={loading ? "loading" : error ? "error" : "ready"}
        onRetry={refresh}
        onRowClick={open}
        minWidth="820px"
        emptyTitle="No broadcasts yet"
        emptyHint="Broadcasts sent to you will appear here."
      />
    </Card>
  );
}
