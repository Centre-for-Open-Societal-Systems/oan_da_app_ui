"use client";

import type { AppNotification, NotificationsTab } from "@/components/layout/NotificationsPanel";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { TablePagination } from "@/components/ui/TablePagination";
import { cn } from "@/lib/utils";
import { NotificationRow } from "./NotificationRow";
import { NotificationsToolbar, type TimeFilter, type TypeFilter } from "./NotificationsToolbar";
import { groupNotificationsByBucket } from "./notificationVisuals";

interface NotificationsCardProps {
  ready: boolean;
  tab: NotificationsTab;
  onTabChange: (tab: NotificationsTab) => void;
  unreadCount: number;
  totalMatchingCount: number;
  pageNotifications: AppNotification[];
  query: string;
  onQueryChange: (value: string) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (value: TypeFilter) => void;
  timeFilter: TimeFilter;
  onTimeFilterChange: (value: TimeFilter) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onSelectNotification: (notification: AppNotification) => void;
}

export function NotificationsCard({
  ready,
  tab,
  onTabChange,
  unreadCount,
  totalMatchingCount,
  pageNotifications,
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  timeFilter,
  onTimeFilterChange,
  page,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onSelectNotification,
}: NotificationsCardProps) {
  const now = new Date();
  const groups = groupNotificationsByBucket(pageNotifications, now);

  const tabClass = (active: boolean) =>
    cn(
      "relative flex items-center gap-2 border-b-2 px-5 py-3.5 text-[14px] font-semibold transition-all",
      active
        ? "border-brand-green bg-emerald-50/40 text-brand-green"
        : "border-transparent text-muted hover:text-ink hover:bg-slate-50/50"
    );

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      {/* Tabs */}
      <div role="tablist" aria-label="Notification filter tabs" className="flex items-center border-b border-line-soft select-none px-2 sm:px-4">
        <button type="button" role="tab" aria-selected={tab === "all"} onClick={() => onTabChange("all")} className={tabClass(tab === "all")}>
          <span>All</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "unread"} onClick={() => onTabChange("unread")} className={tabClass(tab === "unread")}>
          <span>Unread</span>
          {unreadCount > 0 && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-brand-green px-1.5 py-0.5 text-[11px] font-bold text-white shadow-2xs">
              {unreadCount}
            </span>
          )}
        </button>
      </div>

      {/* Search & Filters Toolbar */}
      <NotificationsToolbar
        query={query}
        onQueryChange={onQueryChange}
        typeFilter={typeFilter}
        onTypeFilterChange={onTypeFilterChange}
        timeFilter={timeFilter}
        onTimeFilterChange={onTimeFilterChange}
        totalCount={totalMatchingCount}
        unreadCount={unreadCount}
      />

      {/* Grouped List */}
      <div>
        {!ready ? (
          [0, 1, 2, 3].map((i) => (
            <div key={i} className="flex gap-4 border-b border-line-soft px-4 py-4 sm:px-5">
              <div className="h-9 w-9 shrink-0 animate-pulse rounded-full bg-slate-100" />
              <div className="flex-1 space-y-2">
                <div className="h-3.5 w-1/3 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-2/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))
        ) : groups.length === 0 ? (
          <EmptyState
            title={tab === "unread" ? "All caught up" : "No notifications match your filters"}
            hint={
              tab === "unread"
                ? "You have no unread notifications right now."
                : "Try clearing the search query or changing the type and time filters."
            }
          />
        ) : (
          groups.map((group) => (
            <div key={group.label}>
              <div className="flex items-center justify-between border-b border-line-soft bg-surface/80 px-4 py-2 sm:px-5 sm:py-2.5 backdrop-blur-2xs">
                <span className="text-[11px] font-bold tracking-wider text-muted uppercase">{group.label}</span>
                <span className="text-[11px] font-medium text-slate-400">
                  {group.items.length} {group.items.length === 1 ? "notification" : "notifications"}
                </span>
              </div>
              {group.items.map((n) => (
                <NotificationRow
                  key={n.id}
                  notification={n}
                  bucket={group.label}
                  now={now}
                  onSelect={onSelectNotification}
                />
              ))}
            </div>
          ))
        )}
      </div>

      {/* Pagination Footer */}
      {ready && totalMatchingCount > 0 && (
        <TablePagination
          page={page}
          pageSize={pageSize}
          total={totalMatchingCount}
          itemLabel="notifications"
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      )}
    </Card>
  );
}

