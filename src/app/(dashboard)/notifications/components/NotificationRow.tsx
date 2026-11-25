"use client";

import Image from "next/image";
import type { AppNotification } from "@/components/layout/NotificationsPanel";
import { Pill } from "@/components/ui/Pill";
import { cn } from "@/lib/utils";
import {
  formatBucketTimestamp,
  getNotificationVisual,
  type NotificationTimeBucket,
} from "./notificationVisuals";

interface NotificationRowProps {
  notification: AppNotification;
  bucket: NotificationTimeBucket;
  now: Date;
  onSelect: (notification: AppNotification) => void;
}

export function NotificationRow({
  notification,
  bucket,
  now,
  onSelect,
}: NotificationRowProps) {
  const unread = !notification.read;
  const visual = getNotificationVisual(notification);

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onSelect(notification)}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onSelect(notification);
        }
      }}
      aria-label={unread ? `Open unread notification "${notification.title}"` : notification.title}
      className={cn(
        "flex cursor-pointer items-start justify-between gap-3 sm:gap-4 border-b border-line-soft px-3.5 py-3 sm:px-5 sm:py-3.5 transition-colors last:border-b-0",
        unread ? "bg-emerald-50/30 hover:bg-emerald-50/55" : "bg-white hover:bg-slate-50/80"
      )}
    >
      <div className="flex min-w-0 flex-1 items-start gap-2.5 sm:gap-3">
        {/* Unread dot */}
        <div className="flex w-2.5 sm:w-3 shrink-0 justify-center pt-3">
          {unread ? (
            <span className="relative flex h-2 w-2" aria-label="Unread">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand-green opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-brand-green" />
            </span>
          ) : (
            <span className="h-1.5 w-1.5 rounded-full bg-transparent" />
          )}
        </div>

        {/* Icon */}
        <div className="shrink-0 pt-0.5">
          <Image
            src={visual.iconSrc}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="h-8.5 w-8.5 sm:h-9 sm:w-9 rounded-full shadow-2xs border border-gray-100"
          />
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1">
          <h3 className={cn("text-[13.5px] sm:text-[14px] leading-snug break-words", unread ? "font-bold text-ink" : "font-semibold text-slate-800")}>
            {notification.title}
          </h3>
          {notification.body && (
            <p className="mt-0.5 text-[12.5px] sm:text-[13px] leading-relaxed text-ink-soft line-clamp-2">
              {notification.body}
            </p>
          )}
        </div>
      </div>

      {/* Category Pill and Timestamp */}
      <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5 text-right">
        <Pill tone={visual.tone} className="px-2 py-0.5 text-[11px] sm:text-[11.5px] font-medium">
          {visual.category}
        </Pill>
        <span className="whitespace-nowrap text-[11px] sm:text-[11.5px] text-muted">
          {formatBucketTimestamp(notification.at, bucket, now)}
        </span>
      </div>
    </div>
  );
}

