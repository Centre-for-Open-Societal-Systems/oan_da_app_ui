"use client";

import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { NOTIFICATION_CATEGORIES, type NotificationCategory, type NotificationTimeBucket } from "./notificationVisuals";

export type TypeFilter = "all" | NotificationCategory;
export type TimeFilter = "all" | NotificationTimeBucket;

const TYPE_OPTIONS: DropdownOption[] = [
  { value: "all", label: "All types" },
  ...NOTIFICATION_CATEGORIES.map((category) => ({
    value: category,
    label: category,
  })),
];

const TIME_OPTIONS: DropdownOption[] = [
  { value: "all", label: "Any time" },
  { value: "Today", label: "Today" },
  { value: "Yesterday", label: "Yesterday" },
  { value: "Earlier this week", label: "Earlier this week" },
  { value: "Last week", label: "Last week" },
];

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
    <div className="flex flex-col gap-3.5 border-b border-line-soft p-4 sm:px-5 sm:py-3.5 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center w-full lg:w-auto">
        {/* Search */}
        <div className="relative w-full sm:w-64 lg:w-72">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <circle cx="11" cy="11" r="7" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="search"
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Search notifications..."
            aria-label="Search notifications"
            className="h-10 sm:h-9 w-full rounded-lg border border-gray-200 bg-white pl-9 pr-3 text-[13.5px] text-ink placeholder:text-muted focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20 hover:border-brand-green hover:ring-1 hover:ring-brand-green/20 transition-all"
          />
        </div>

        {/* Filter Dropdowns: 2-column grid on mobile, inline flex on tablet/desktop */}
        <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
          {/* All types animated dropdown */}
          <div className="w-full sm:w-auto">
            <Dropdown
              id="notifications-type-filter"
              value={typeFilter}
              onChange={(val) => onTypeFilterChange(val as TypeFilter)}
              options={TYPE_OPTIONS}
              className="w-full sm:w-auto"
              triggerClassName="h-10 sm:h-9 w-full sm:w-38 text-[13px] font-medium border-gray-200"
            />
          </div>

          {/* Any time animated dropdown */}
          <div className="w-full sm:w-auto">
            <Dropdown
              id="notifications-time-filter"
              value={timeFilter}
              onChange={(val) => onTimeFilterChange(val as TimeFilter)}
              options={TIME_OPTIONS}
              align="right"
              className="w-full sm:w-auto"
              triggerClassName="h-10 sm:h-9 w-full sm:w-38 text-[13px] font-medium border-gray-200"
            />
          </div>
        </div>
      </div>

      {/* Results count indicator */}
      <div className="flex items-center justify-between sm:justify-end gap-2 text-[12.5px] font-medium text-muted">
        <span>
          {totalCount} {totalCount === 1 ? "notification" : "notifications"}
        </span>
        <span>•</span>
        <span className={unreadCount > 0 ? "font-semibold text-brand-green" : ""}>
          {unreadCount} unread
        </span>
      </div>
    </div>
  );
}

