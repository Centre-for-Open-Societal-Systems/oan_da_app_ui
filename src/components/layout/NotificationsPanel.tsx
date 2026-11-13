"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/utils";

/** One row of GET /da-services/notifications. */
export interface AppNotification {
  id: string;
  /** Visit, Task, Sync, Grievance, Broadcast, Issue, Assignment, Onboarding, Approval or System. */
  kind: string;
  title: string;
  body: string | null;
  /** Portal route the row opens, e.g. "/visits/DA-VIS-0001"; null when there is nothing to open. */
  href: string | null;
  read: boolean;
  /** ISO timestamp the notification was created. */
  at: string;
}

export type NotificationsTab = "all" | "unread";

export type NotificationGroup = "Today" | "Yesterday" | "Earlier";

interface NotificationsPanelProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  /** Across all notifications, from the API's meta. */
  unreadCount: number;
  tab: NotificationsTab;
  onTabChange: (tab: NotificationsTab) => void;
  /** True while the first page of the current tab loads. */
  loading: boolean;
  error: string | null;
  hasMore: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  /** Row clicked: mark it read and open its href. */
  onOpen: (notification: AppNotification) => void;
  onMarkAllRead: () => void;
}

const KIND_ICON_IMAGE: Record<string, string> = {
  Approval: "/images/notifications/kyc-approved.svg",
  Onboarding: "/images/notifications/kyc-approved.svg",
  Assignment: "/images/notifications/farmers.svg",
  KYC: "/images/notifications/kyc-approved.svg",
  Payment: "/images/notifications/payment.svg",
  Payments: "/images/notifications/payment.svg",
  Sync: "/images/notifications/payment.svg",
  Leave: "/images/notifications/leave.svg",
  Warning: "/images/notifications/warning.svg",
  Visits: "/images/notifications/warning.svg",
  Grievance: "/images/notifications/grievance.svg",
  Grievances: "/images/notifications/grievance.svg",
  Broadcast: "/images/notifications/warning.svg",
  Crop: "/images/notifications/crop-record.svg",
  "Crop records": "/images/notifications/crop-record.svg",
  Visit: "/images/notifications/crop-record.svg",
  Task: "/images/notifications/survey.svg",
  Surveys: "/images/notifications/survey.svg",
  Training: "/images/notifications/training.svg",
  Farmers: "/images/notifications/farmers.svg",
  Performance: "/images/notifications/performance.svg",
  Issue: "/images/notifications/issue.svg",
};

const DEFAULT_ICON_IMAGE = "/images/notifications/bell.svg";

/** Resolve the icon image asset under /public/images/notifications/ for a notification. */
export function getNotificationIcon(notification: Pick<AppNotification, "kind" | "title">): string {
  const title = notification.title;
  if (/kyc|approved/i.test(title) && !/leave/i.test(title)) return "/images/notifications/kyc-approved.svg";
  if (/leave/i.test(title)) return "/images/notifications/leave.svg";
  if (/payment|etb|released|subsidy/i.test(title)) return "/images/notifications/payment.svg";
  if (/overdue|warning/i.test(title)) return "/images/notifications/warning.svg";
  if (/grievance/i.test(title)) return "/images/notifications/grievance.svg";
  if (/crop|record|yield/i.test(title)) return "/images/notifications/crop-record.svg";
  if (/survey/i.test(title)) return "/images/notifications/survey.svg";
  if (/training/i.test(title)) return "/images/notifications/training.svg";
  if (/farmer|reassigned/i.test(title)) return "/images/notifications/farmers.svg";
  if (/appraisal|performance/i.test(title)) return "/images/notifications/performance.svg";
  return KIND_ICON_IMAGE[notification.kind] ?? DEFAULT_ICON_IMAGE;
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY = 86_400_000;

export function notificationGroupOf(at: string, now: Date): NotificationGroup {
  const diff = startOfDay(now) - startOfDay(new Date(at));
  return diff <= 0 ? "Today" : diff <= DAY ? "Yesterday" : "Earlier";
}

export function groupNotifications(notifications: AppNotification[], now = new Date()): { label: NotificationGroup; items: AppNotification[] }[] {
  return (["Today", "Yesterday", "Earlier"] as const)
    .map((label) => ({ label, items: notifications.filter((n) => notificationGroupOf(n.at, now) === label) }))
    .filter((g) => g.items.length > 0);
}

/** "2 hours ago" today, "Yesterday, 4:10 PM", then "12 Oct, 4:10 PM". */
export function formatNotificationTime(at: string, group: NotificationGroup, now = new Date()): string {
  const d = new Date(at);
  const clock = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  if (group === "Yesterday") return `Yesterday, ${clock}`;
  if (group === "Earlier") return `${d.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}, ${clock}`;
  const minutes = Math.max(0, Math.round((now.getTime() - d.getTime()) / 60_000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return hours === 1 ? "1 hour ago" : `${hours} hours ago`;
}

/** Fallback Today & Yesterday notifications shown when the API returns empty or is unavailable. */
export function createFallbackNotifications(now = new Date()): AppNotification[] {
  const todayStart = startOfDay(now);
  const twoHoursAgo = new Date(Math.max(todayStart + 60_000, now.getTime() - 2 * 3_600_000)).toISOString();
  const fourHoursAgo = new Date(Math.max(todayStart + 60_000, now.getTime() - 4 * 3_600_000)).toISOString();
  const yesterdayAfternoon = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 16, 10, 0).toISOString();
  const yesterdayMorning = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 9, 30, 0).toISOString();

  return [
    {
      id: "sample-today-1",
      kind: "Approval",
      title: "Lelise Gudeta KYC approved",
      body: "The national registry database matched the biometric and land deed documentation successfully.",
      href: null,
      read: false,
      at: twoHoursAgo,
    },
    {
      id: "sample-today-2",
      kind: "Payment",
      title: "Payment of ETB 4,500 released to Chaltu Dinkesa",
      body: "Government agricultural subsidy for Teff production has been credited to the designated commercial account.",
      href: null,
      read: true,
      at: fourHoursAgo,
    },
    {
      id: "sample-yesterday-1",
      kind: "Warning",
      title: "Overdue visit: Bako Tibe kebele",
      body: "Development agent agenda requires field visit assessment for crop yield estimates on sector 4 plots.",
      href: null,
      read: false,
      at: yesterdayAfternoon,
    },
    {
      id: "sample-yesterday-2",
      kind: "Crop",
      title: "New crop record submitted — Teff, Gedo",
      body: "Farmer Chaltu Dinkesa submitted baseline agricultural yield report.",
      href: null,
      read: true,
      at: yesterdayMorning,
    },
  ];
}

export const isFallbackNotification = (id: string) => id.startsWith("sample-");

/**
 * Fill in Today and/or Yesterday sample notifications whenever the live list
 * has no items in those groups, keeping all live notifications intact.
 */
export function mergeFallbackGroups(
  liveItems: AppNotification[],
  fallbackItems: AppNotification[],
  now = new Date()
): { items: AppNotification[]; addedFallbackItems: AppNotification[] } {
  const hasToday = liveItems.some((n) => notificationGroupOf(n.at, now) === "Today");
  const hasYesterday = liveItems.some((n) => notificationGroupOf(n.at, now) === "Yesterday");

  const addedFallbackItems = fallbackItems.filter((n) => {
    const group = notificationGroupOf(n.at, now);
    if (group === "Today") return !hasToday;
    if (group === "Yesterday") return !hasYesterday;
    return false;
  });

  if (addedFallbackItems.length === 0) {
    return { items: liveItems, addedFallbackItems: [] };
  }

  return {
    items: [...addedFallbackItems, ...liveItems],
    addedFallbackItems,
  };
}

export function NotificationsPanel({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  tab,
  onTabChange,
  loading,
  error,
  hasMore,
  loadingMore,
  onLoadMore,
  onOpen,
  onMarkAllRead,
}: NotificationsPanelProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  // Prevent scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }
    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  if (!mounted || !isOpen) return null;

  const now = new Date();
  const groups = groupNotifications(notifications, now);

  const tabClass = (active: boolean) =>
    cn(
      "flex h-full items-center gap-2 border-b-2 px-5 py-3.5 text-[14px] font-semibold transition-colors",
      active ? "border-brand-green bg-brand-green/5 text-brand-green" : "border-transparent text-muted hover:text-ink"
    );

  return createPortal(
    <div className="fixed inset-0 z-[100] flex justify-end">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-ink/20 backdrop-blur-sm animate-in fade-in duration-300"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="relative w-full max-w-[400px] h-full bg-white shadow-[-10px_0_40px_rgba(0,0,0,0.1)] flex flex-col animate-in slide-in-from-right-full duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-line-soft">
          <h2 className="text-xl font-bold text-ink">Notifications</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close notifications"
            className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-ink-soft transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex items-center justify-between pr-6 border-b border-line-soft select-none">
          <div className="flex items-center h-full">
            <button type="button" onClick={() => onTabChange("all")} className={tabClass(tab === "all")}>
              All
            </button>
            <button type="button" onClick={() => onTabChange("unread")} className={tabClass(tab === "unread")}>
              Unread
              {unreadCount > 0 && (
                <span className="flex items-center justify-center bg-brand-green-bright text-white text-[11px] font-bold px-1.5 py-0.5 rounded-full min-w-[20px] h-5">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
            className="text-[13px] font-bold text-brand-green-bright hover:text-brand-green-dark transition-colors disabled:cursor-not-allowed disabled:text-subtle"
          >
            Mark all read
          </button>
        </div>

        {/* Scrollable Notifications List */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-zinc-200 scrollbar-track-transparent">
          {error && (
            <div className="m-4 rounded-lg border border-danger-border bg-danger-wash px-4 py-3 text-[13px] text-red-800">{error}</div>
          )}

          {loading ? (
            [0, 1, 2, 3].map((i) => (
              <div key={i} className="flex gap-4 border-b border-line-soft px-5 py-4">
                <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 w-3/4 animate-pulse rounded bg-slate-100" />
                  <div className="h-3 w-full animate-pulse rounded bg-slate-100" />
                </div>
              </div>
            ))
          ) : (
            groups.map((group) => (
              <div key={group.label}>
                <div className="px-5 py-2.5 bg-surface border-b border-line-soft">
                  <span className="text-[11px] font-bold text-muted tracking-wider uppercase">{group.label}</span>
                </div>

                {group.items.map((n) => {
                  const iconSrc = getNotificationIcon(n);
                  const unread = !n.read;
                  return (
                    <div
                      key={n.id}
                      role="button"
                      tabIndex={0}
                      onClick={() => onOpen(n)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.preventDefault();
                          onOpen(n);
                        }
                      }}
                      aria-label={n.href ? `Open "${n.title}"` : unread ? `Mark "${n.title}" as read` : n.title}
                      className={cn(
                        "flex px-4 py-4 border-b border-line-soft cursor-pointer transition-colors",
                        unread ? "bg-brand-wash hover:bg-brand-border-soft/70" : "bg-white hover:bg-zinc-50"
                      )}
                    >
                      <div className="pt-3 shrink-0 w-3.5 flex justify-center">
                        {unread && <div className="w-1.5 h-1.5 rounded-full bg-brand-green-bright" />}
                      </div>
                      <div className="ml-1.5 shrink-0 pt-0.5">
                        <Image
                          src={iconSrc}
                          alt=""
                          width={36}
                          height={36}
                          unoptimized
                          className="h-9 w-9 rounded-full"
                        />
                      </div>
                      <div className="ml-3.5 min-w-0 flex-1">
                        <h4 className={cn("text-[14px] leading-snug", unread ? "font-bold text-ink" : "font-semibold text-ink-soft")}>
                          {n.title}
                        </h4>
                        {n.body && <p className="text-[13px] text-muted mt-1 leading-snug pr-2">{n.body}</p>}
                        <span className="text-[12px] text-muted mt-1.5 block">
                          {formatNotificationTime(n.at, group.label, now)}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))
          )}

          {!loading && !error && notifications.length === 0 && (
            <div className="p-8 text-center text-muted">
              {tab === "unread" ? "You're all caught up." : "No notifications to display."}
            </div>
          )}

          {!loading && hasMore && (
            <div className="p-4 text-center">
              <button
                type="button"
                onClick={onLoadMore}
                disabled={loadingMore}
                className="text-[13px] font-semibold text-brand-green hover:underline disabled:cursor-wait disabled:text-subtle disabled:no-underline"
              >
                {loadingMore ? "Loading…" : "Load more"}
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-line-soft bg-white px-5 py-4">
          <Link
            href="/notifications"
            onClick={onClose}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-brand-green-bright px-4 py-3 text-[14px] font-semibold text-white transition-colors hover:bg-brand-green-dark"
          >
            <span>View all notifications</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
            </svg>
          </Link>
        </div>
      </div>
    </div>,
    document.body
  );
}
