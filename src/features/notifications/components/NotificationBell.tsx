"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  NotificationsPanel,
  createFallbackNotifications,
  isFallbackNotification,
  notificationGroupOf,
  type AppNotification,
  type NotificationsTab,
} from "@/components/layout/NotificationsPanel";
import { useAuthStore } from "@/store/useAuthStore";
import { listNotifications, markAllNotificationsRead, markNotificationRead } from "../api";

const PAGE_SIZE = 20;
// The badge re-reads the unread count this often while the tab is visible.
const POLL_MS = 60_000;

const messageOf = (err: unknown) => (err instanceof Error ? err.message : "Could not load notifications.");

interface ListState {
  /** Which tab (and reload) these rows belong to; a mismatch means a newer list is loading. */
  key: string;
  items: AppNotification[];
  hasMore: boolean;
  error: string | null;
  failed: boolean;
}

interface LiveCoverage {
  today: boolean;
  yesterday: boolean;
}

function coverageOf(items: AppNotification[], now = new Date()): LiveCoverage {
  return {
    today: items.some((n) => notificationGroupOf(n.at, now) === "Today"),
    yesterday: items.some((n) => notificationGroupOf(n.at, now) === "Yesterday"),
  };
}

// Header bell: unread badge from the API's meta.unread_count, and the drawer listing the user's notifications.
export function NotificationBell() {
  const router = useRouter();
  const hasSession = useAuthStore((s) => !!s.tokens);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<NotificationsTab>("all");
  const [unreadCount, setUnreadCount] = useState(0);
  const [reload, setReload] = useState(0);
  const [list, setList] = useState<ListState | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fallbackItems, setFallbackItems] = useState<AppNotification[]>(() => createFallbackNotifications());
  const [liveCoverage, setLiveCoverage] = useState<LiveCoverage | null>(null);

  const refreshCount = useCallback(() => {
    listNotifications({ unread: false, limit: PAGE_SIZE })
      .then((page) => {
        setLiveCoverage(coverageOf(page.items));
        setUnreadCount(page.unreadCount);
      })
      .catch(() => {
        setLiveCoverage(null);
      });
  }, []);

  useEffect(() => {
    if (!hasSession) return;
    refreshCount();
    const timer = setInterval(() => {
      if (!document.hidden) refreshCount();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [hasSession, refreshCount]);

  // First page of the open tab; reopening the drawer or switching tab reloads it.
  const key = `${tab}:${reload}`;
  useEffect(() => {
    if (!isOpen || !hasSession) return;
    let current = true;
    listNotifications({ unread: tab === "unread", limit: PAGE_SIZE })
      .then((page) => {
        if (!current) return;
        if (tab === "all") {
          setLiveCoverage(coverageOf(page.items));
        }
        setList({ key, items: page.items, hasMore: page.items.length === PAGE_SIZE, error: null, failed: false });
        setUnreadCount(page.unreadCount);
      })
      .catch(() => {
        if (!current) return;
        setLiveCoverage(null);
        setList({ key, items: [], hasMore: false, error: null, failed: true });
      });
    return () => {
      current = false;
    };
  }, [isOpen, hasSession, tab, key]);

  const now = new Date();
  const ready = !hasSession || list?.key === key;
  const apiUnavailable = !hasSession || (list?.key === key ? list.failed : liveCoverage === null);
  const coverage = apiUnavailable ? { today: false, yesterday: false } : (liveCoverage ?? { today: false, yesterday: false });

  const activeFallbackItems = fallbackItems.filter((n) => {
    const group = notificationGroupOf(n.at, now);
    if (group === "Today") return !coverage.today;
    if (group === "Yesterday") return !coverage.yesterday;
    return false;
  });

  const fallbackUnreadCount = activeFallbackItems.filter((n) => !n.read).length;
  const displayedFallback = tab === "unread" ? activeFallbackItems.filter((n) => !n.read) : activeFallbackItems;
  const liveItems = list?.key === key && !list.failed ? list.items : [];
  const items = !ready ? [] : [...displayedFallback, ...liveItems];
  const effectiveUnreadCount = (apiUnavailable ? 0 : unreadCount) + fallbackUnreadCount;

  const open = () => {
    setReload((n) => n + 1);
    setIsOpen(true);
  };

  const loadMore = () => {
    if (!list || loadingMore || apiUnavailable) return;
    setLoadingMore(true);
    listNotifications({ unread: tab === "unread", limit: PAGE_SIZE, start: list.items.length })
      .then((page) => {
        setList((prev) =>
          prev && prev.key === key
            ? { ...prev, items: [...prev.items, ...page.items], hasMore: page.items.length === PAGE_SIZE }
            : prev
        );
        setUnreadCount(page.unreadCount);
      })
      .catch((err: unknown) => setList((prev) => (prev ? { ...prev, error: messageOf(err) } : prev)))
      .finally(() => setLoadingMore(false));
  };

  // Shown read straight away; if the call fails, the next count refresh puts the badge right.
  const openNotification = (n: AppNotification) => {
    if (!n.read) {
      if (isFallbackNotification(n.id)) {
        setFallbackItems((prev) => prev.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      } else {
        setList((prev) => (prev ? { ...prev, items: prev.items.map((x) => (x.id === n.id ? { ...x, read: true } : x)) } : prev));
        setUnreadCount((c) => Math.max(0, c - 1));
        markNotificationRead(n.id).catch(refreshCount);
      }
    }
    if (n.href) {
      setIsOpen(false);
      router.push(n.href);
    }
  };

  const markAllRead = () => {
    setFallbackItems((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!apiUnavailable) {
      setList((prev) => (prev ? { ...prev, items: prev.items.map((n) => ({ ...n, read: true })) } : prev));
      setUnreadCount(0);
      markAllNotificationsRead().catch(refreshCount);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={open}
        aria-label={effectiveUnreadCount > 0 ? `Notifications — ${effectiveUnreadCount} unread` : "Notifications"}
        className="relative flex h-10 w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 lg:ml-2"
      >
        <svg className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a1.94 1.94 0 003.4 0" />
        </svg>
        {effectiveUnreadCount > 0 && (
          <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full border-2 border-white bg-red-600 px-1 text-[10px] font-bold leading-none text-white">
            {effectiveUnreadCount > 9 ? "9+" : effectiveUnreadCount}
          </span>
        )}
      </button>

      <NotificationsPanel
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        notifications={items}
        unreadCount={effectiveUnreadCount}
        tab={tab}
        onTabChange={setTab}
        loading={!ready}
        error={ready ? (list?.error ?? null) : null}
        hasMore={ready && !apiUnavailable && (list?.hasMore ?? false)}
        loadingMore={loadingMore}
        onLoadMore={loadMore}
        onOpen={openNotification}
        onMarkAllRead={markAllRead}
      />
    </>
  );
}
