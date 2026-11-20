"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
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
      markNotificationRead(n.id).catch(() => { });
    }
    if (n.href) router.push(n.href);
  };

  const columns: Column<AppNotification>[] = [
    {
      key: "sno",
      header: "S.No.",
      align: "center",
      className: "w-16 min-w-[64px] whitespace-nowrap",
      cell: (n) => (
        <span className="text-[13px] font-medium text-muted">
          {rows.indexOf(n) + 1}
        </span>
      ),
    },
    {
      key: "title",
      header: "Broadcast",
      className: "w-[28%] min-w-[200px]",
      cell: (n) => (
        <div className="flex items-center gap-2.5">
          {!n.read ? (
            <span className="relative flex h-2.5 w-2.5 shrink-0" aria-label="Unread">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-brand-green" />
            </span>
          ) : (
            <span className="h-2 w-2 shrink-0 rounded-full bg-slate-300" aria-label="Read" />
          )}
          <span className={cn("text-[14px] leading-snug", n.read ? "text-slate-700 font-normal" : "text-ink font-semibold")}>
            {n.title}
          </span>
        </div>
      ),
    },
    {
      key: "body",
      header: "Message",
      className: "w-[40%] min-w-[240px]",
      cell: (n) => (
        <span className="line-clamp-2 block text-[13px] leading-relaxed text-ink-soft">
          {n.body ?? "—"}
        </span>
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "w-[12%] min-w-[90px]",
      cell: (n) => (
        <Pill tone={n.read ? "slate" : "green"}>
          {n.read ? "Read" : "New"}
        </Pill>
      ),
    },
    {
      key: "at",
      header: "Received",
      className: "w-[16%] min-w-[150px]",
      cell: (n) => (
        <span className="whitespace-nowrap text-[13px] text-muted">
          {receivedLabel(n.at)}
        </span>
      ),
    },
  ];

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <DataTable
        itemLabel="broadcasts"
        title={
          <div className="py-0.5">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-50 text-brand-green">
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              </div>
              <h2 className="text-[16px] font-bold text-ink">Received broadcasts</h2>
            </div>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">
              Broadcasts sent to you, newest first. Select one to open it and mark it read.
            </p>
          </div>
        }
        searchable
        searchPlaceholder="Search broadcasts by title or message…"
        columns={columns}
        rows={rows}
        rowKey={(n) => n.id}
        state={loading ? "loading" : error ? "error" : "ready"}
        onRetry={refresh}
        onRowClick={open}
        rowClassName={(n) =>
          cn(
            "cursor-pointer transition-colors",
            !n.read ? "bg-emerald-50/25 hover:bg-emerald-50/45" : "hover:bg-slate-50/80"
          )
        }
        minWidth="760px"
        emptyTitle="No broadcasts yet"
        emptyHint="Broadcasts sent to you will appear here."
      />
    </Card>
  );
}