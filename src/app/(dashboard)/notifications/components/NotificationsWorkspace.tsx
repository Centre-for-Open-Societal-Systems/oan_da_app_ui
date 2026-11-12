"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  isFallbackNotification,
  type AppNotification,
  type NotificationsTab,
} from "@/components/layout/NotificationsPanel";
import { usePagination } from "@/components/ui/TablePagination";
import {
  listNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/features/notifications";
import { useAuthStore } from "@/store/useAuthStore";
import { NotificationDetailModal } from "./NotificationDetailModal";
import {
  DEFAULT_NOTIFICATION_PREFERENCES,
  NotificationSettingsModal,
  type NotificationPreferences,
} from "./NotificationSettingsModal";
import { NotificationsCard } from "./NotificationsCard";
import { NotificationsHeaderCard } from "./NotificationsHeaderCard";
import type { TimeFilter, TypeFilter } from "./NotificationsToolbar";
import {
  createPageSampleNotifications,
  resolveNotificationCategory,
  timeBucketOf,
} from "./notificationVisuals";

const PAGE_SIZE = 50;

interface ListState {
  key: string;
  items: AppNotification[];
  failed: boolean;
}

export function NotificationsWorkspace() {
  const router = useRouter();
  const hasSession = useAuthStore((s) => !!s.tokens);
  const [tab, setTab] = useState<NotificationsTab>("all");
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("all");
  const [reload, setReload] = useState(0);
  const [list, setList] = useState<ListState | null>(null);
  const [sampleItems, setSampleItems] = useState<AppNotification[]>(() => createPageSampleNotifications());
  const [selected, setSelected] = useState<AppNotification | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [preferences, setPreferences] = useState<NotificationPreferences>(DEFAULT_NOTIFICATION_PREFERENCES);

  const key = `all:${reload}`;

  useEffect(() => {
    if (!hasSession) return;
    let current = true;
    listNotifications({ unread: false, limit: PAGE_SIZE })
      .then((page) => {
        if (!current) return;
        setList({ key, items: page.items, failed: false });
      })
      .catch(() => {
        if (!current) return;
        setList({ key, items: [], failed: true });
      });
    return () => {
      current = false;
    };
  }, [hasSession, key]);

  const now = new Date();
  const ready = !hasSession || list?.key === key;
  const apiUnavailable = !hasSession || (list?.key === key ? list.failed : false);
  const liveItems = list?.key === key && !list.failed ? list.items : [];

  // Fill Today/Yesterday/Earlier-this-week/Last-week sections whenever live data has none in those buckets.
  const activeSamples = sampleItems.filter((sample) => {
    const bucket = timeBucketOf(sample.at, now);
    if (apiUnavailable || liveItems.length === 0) return true;
    return !liveItems.some((live) => timeBucketOf(live.at, now) === bucket);
  });

  const combinedItems = !ready ? [] : [...activeSamples, ...liveItems];
  const unreadCount = combinedItems.filter((n) => !n.read).length;

  const filteredItems = combinedItems.filter((n) => {
    if (tab === "unread" && n.read) return false;
    if (typeFilter !== "all" && resolveNotificationCategory(n) !== typeFilter) return false;
    if (timeFilter !== "all" && timeBucketOf(n.at, now) !== timeFilter) return false;
    const trimmed = query.trim().toLowerCase();
    if (trimmed) {
      const hay = `${n.title} ${n.body ?? ""} ${resolveNotificationCategory(n)}`.toLowerCase();
      if (!hay.includes(trimmed)) return false;
    }
    return true;
  });

  const { pageRows, paginationProps } = usePagination(filteredItems, 10);

  const markReadLocally = (id: string) => {
    if (isFallbackNotification(id)) {
      setSampleItems((prev) => prev.map((x) => (x.id === id ? { ...x, read: true } : x)));
    } else {
      setList((prev) => (prev ? { ...prev, items: prev.items.map((x) => (x.id === id ? { ...x, read: true } : x)) } : prev));
      markNotificationRead(id).catch(() => setReload((r) => r + 1));
    }
  };

  const handleSelectNotification = (n: AppNotification) => {
    const nextNotification = n.read ? n : { ...n, read: true };
    if (!n.read) {
      markReadLocally(n.id);
    }
    setSelected(nextNotification);
  };

  const handleMarkAllRead = () => {
    setSampleItems((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!apiUnavailable) {
      setList((prev) => (prev ? { ...prev, items: prev.items.map((n) => ({ ...n, read: true })) } : prev));
      markAllNotificationsRead().catch(() => setReload((r) => r + 1));
    }
  };

  const resetToFirstPage = () => {
    if (paginationProps.page !== 1) paginationProps.onPageChange(1);
  };

  return (
    <>
      <NotificationsHeaderCard
        unreadCount={unreadCount}
        onMarkAllRead={handleMarkAllRead}
        onOpenSettings={() => setSettingsOpen(true)}
      />

      <NotificationsCard
        ready={ready}
        tab={tab}
        onTabChange={(next) => {
          setTab(next);
          resetToFirstPage();
        }}
        unreadCount={unreadCount}
        totalMatchingCount={filteredItems.length}
        pageNotifications={pageRows}
        query={query}
        onQueryChange={(val) => {
          setQuery(val);
          resetToFirstPage();
        }}
        typeFilter={typeFilter}
        onTypeFilterChange={(val) => {
          setTypeFilter(val);
          resetToFirstPage();
        }}
        timeFilter={timeFilter}
        onTimeFilterChange={(val) => {
          setTimeFilter(val);
          resetToFirstPage();
        }}
        page={paginationProps.page}
        pageSize={paginationProps.pageSize}
        onPageChange={paginationProps.onPageChange}
        onPageSizeChange={paginationProps.onPageSizeChange}
        onSelectNotification={handleSelectNotification}
      />

      <NotificationDetailModal
        notification={selected}
        onClose={() => setSelected(null)}
        onNavigate={(href) => router.push(href)}
      />

      <NotificationSettingsModal
        key={settingsOpen ? "open" : "closed"}
        isOpen={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        preferences={preferences}
        onSave={setPreferences}
      />
    </>
  );
}
