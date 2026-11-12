"use client";

import Image from "next/image";
import type { AppNotification } from "@/components/layout/NotificationsPanel";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import {
  formatBucketTimestamp,
  getNotificationVisual,
  timeBucketOf,
} from "./notificationVisuals";

interface NotificationDetailModalProps {
  notification: AppNotification | null;
  onClose: () => void;
  onNavigate?: (href: string) => void;
}

export function NotificationDetailModal({
  notification,
  onClose,
  onNavigate,
}: NotificationDetailModalProps) {
  if (!notification) return null;

  const visual = getNotificationVisual(notification);
  const now = new Date();
  const bucket = timeBucketOf(notification.at, now);
  const timestamp = formatBucketTimestamp(notification.at, bucket, now);
  const canOpenLink = Boolean(notification.href && notification.href !== "/notifications");

  return (
    <Modal
      isOpen={Boolean(notification)}
      onClose={onClose}
      title={notification.title}
      subtitle={timestamp}
      icon={
        <Image
          src={visual.iconSrc}
          alt=""
          width={36}
          height={36}
          unoptimized
          className="h-9 w-9 shrink-0 rounded-full"
        />
      }
      titleAddon={
        <Pill tone={visual.tone} className="px-2.5 py-0.5 text-[11.5px]">
          {visual.category}
        </Pill>
      }
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-line bg-white px-4 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface"
          >
            Close
          </button>
          {canOpenLink && notification.href && onNavigate && (
            <button
              type="button"
              onClick={() => {
                const target = notification.href;
                onClose();
                if (target) onNavigate(target);
              }}
              className="h-9 rounded-lg bg-brand-green-bright px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-green-dark"
            >
              Open record
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-3 text-[13.5px] leading-relaxed text-ink-soft">
        <p>{notification.body ?? "No additional details were included with this notification."}</p>
        <div className="rounded-lg border border-line-soft bg-surface px-3.5 py-2.5 text-[12px] text-muted">
          Status: <span className="font-semibold text-ink">{notification.read ? "Read" : "Unread"}</span> · Category:{" "}
          <span className="font-semibold text-ink">{visual.category}</span>
        </div>
      </div>
    </Modal>
  );
}

