"use client";

import { NOTIFICATION_CATEGORIES, type NotificationCategory, type NotificationTimeBucket } from "./notificationVisuals";

export type TypeFilter = "all" | NotificationCategory;
export type TimeFilter = "all" | NotificationTimeBucket;

interface NotificationsToolbarProps {
  query: string;
  onQueryChange: (value: string) => void;
  typeFilter: TypeFilter;
  onTypeFilterChange: (value: TypeFilter) => void;
  timeFilter: TimeFilter;
  onTimeFilterChange: (value: TimeFilter) => void;
  totalCount: number;
  unreadCount: number;
}

export function NotificationsToolbar({
  query,
  onQueryChange,
  typeFilter,
  onTypeFilterChange,
  timeFilter,
  onTimeFilterChange,
  totalCount,
  unreadCount,
}: NotificationsToolbarProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-line-soft px-4 py-3.5 sm:px-5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center">
        {/* Search */}
        <div className="relative w-full sm:w-72">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-subtle"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search notifications..."
            aria-label="Search notifications"
            className="h-9 w-full rounded-lg border border-line bg-white pl-9 pr-3 text-[13px] text-ink placeholder:text-subtle focus:border-brand-green focus:outline-none"
          />
        </div>

        {/* All types filter */}
        <div className="relative">
          <select
            value={typeFilter}
            onChange={(e) => onTypeFilterChange(e.target.value as TypeFilter)}
            aria-label="Filter by notification type"
            className="h-9 appearance-none rounded-lg border border-line bg-white pl-3 pr-8 text-[13px] font-medium text-ink-soft focus:border-brand-green focus:outline-none"
          >
            <option value="all">All types</option>
            {NOTIFICATION_CATEGORIES.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>

        {/* Any time filter */}
        <div className="relative">
          <select
            value={timeFilter}
            onChange={(e) => onTimeFilterChange(e.target.value as TimeFilter)}
            aria-label="Filter by time range"
            className="h-9 appearance-none rounded-lg border border-line bg-white pl-3 pr-8 text-[13px] font-medium text-ink-soft focus:border-brand-green focus:outline-none"
          >
            <option value="all">Any time</option>
            <option value="Today">Today</option>
            <option value="Yesterday">Yesterday</option>
            <option value="Earlier this week">Earlier this week</option>
            <option value="Last week">Last week</option>
          </select>
          <svg
            className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>

      <p className="text-[12.5px] font-medium text-muted">
        {totalCount} {totalCount === 1 ? "notification" : "notifications"} · {unreadCount} unread
      </p>
    </div>
  );
}

