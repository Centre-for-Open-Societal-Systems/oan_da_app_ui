"use client";

import { Card } from "@/components/ui/Card";

interface NotificationsHeaderCardProps {
  unreadCount: number;
  onMarkAllRead: () => void;
  onOpenSettings: () => void;
}

export function NotificationsHeaderCard({
  unreadCount,
  onMarkAllRead,
  onOpenSettings,
}: NotificationsHeaderCardProps) {
  return (
    <Card className="p-4 sm:p-5 shadow-card">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: Icon & Title info */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-brand-green shadow-2xs">
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" />
              <path d="M10.3 21a1.94 1.94 0 003.4 0" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[19px] sm:text-[21px] font-bold tracking-tight text-ink">Notifications</h1>
              {unreadCount > 0 ? (
                <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-[11px] font-bold text-emerald-800">
                  {unreadCount} unread
                </span>
              ) : (
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                  All caught up
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12.5px] sm:text-[13px] text-ink-soft">
              Farmer updates, payments, visits and approvals in one place.
            </p>
          </div>
        </div>

        {/* Right: Actions (Responsive on mobile & tablet) */}
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:flex-nowrap sm:items-center sm:gap-2.5">
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3.5 text-[13px] font-semibold text-ink-soft transition-all hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-45 shadow-2xs"
          >
            <svg className="h-4 w-4 text-brand-green" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span className="truncate">Mark all read</span>
          </button>

          <button
            type="button"
            onClick={onOpenSettings}
            className="inline-flex h-9.5 items-center justify-center gap-1.5 rounded-lg border border-line bg-white px-3.5 text-[13px] font-semibold text-ink-soft transition-all hover:bg-slate-50 shadow-2xs"
          >
            <svg className="h-4 w-4 text-muted" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
            </svg>
            <span className="truncate">Settings</span>
          </button>
        </div>
      </div>
    </Card>
  );
}

