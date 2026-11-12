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
        "flex cursor-pointer items-start justify-between gap-4 border-b border-line-soft px-4 py-3.5 transition-colors last:border-b-0 sm:px-5",
        unread ? "bg-brand-wash hover:bg-brand-border-soft/60" : "bg-white hover:bg-zinc-50"
      )}
    >
      <div className="flex min-w-0 flex-1 items-start">
        <div className="flex w-4 shrink-0 justify-center pt-3">
          {unread && <span className="h-1.5 w-1.5 rounded-full bg-brand-green-bright" />}
        </div>

        <div className="ml-1.5 shrink-0 pt-0.5">
          <Image
            src={visual.iconSrc}
            alt=""
            width={36}
            height={36}
            unoptimized
            className="h-9 w-9 rounded-full"
          />
        </div>

        <div className="ml-3.5 min-w-0 flex-1">
          <h3 className={cn("text-[14px] leading-snug", unread ? "font-bold text-ink" : "font-semibold text-ink")}>
            {notification.title}
          </h3>
          {notification.body && (
            <p className="mt-0.5 text-[13px] leading-snug text-muted">{notification.body}</p>
          )}
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-end gap-1 pt-0.5 text-right">
        <Pill tone={visual.tone} className="px-2.5 py-0.5 text-[11.5px]">
          {visual.category}
        </Pill>
        <span className="whitespace-nowrap text-[11.5px] text-muted">
          {formatBucketTimestamp(notification.at, bucket, now)}
        </span>
      </div>
    </div>
  );
}

