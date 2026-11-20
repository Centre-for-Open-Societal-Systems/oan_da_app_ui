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
        <div className="shrink-0 pt-0.5">
          <Image
            src={visual.iconSrc}
            alt=""
            width={40}
            height={40}
            unoptimized
            className="h-10 w-10 rounded-full border border-gray-100 shadow-2xs"
          />
        </div>
      }
      titleAddon={
        <Pill tone={visual.tone} className="px-2.5 py-0.5 text-[11.5px] font-semibold">
          {visual.category}
        </Pill>
      }
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-full sm:w-auto rounded-lg border border-line bg-white px-5 text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-slate-50 shadow-2xs"
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
              className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-brand-green px-5 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-brand-green-dark"
            >
              <span>Open record</span>
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" />
                <polyline points="15 3 21 3 21 9" />
                <line x1="10" y1="14" x2="21" y2="3" />
              </svg>
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        {/* Main notification body */}
        <div className="rounded-xl border border-line-soft bg-surface/60 p-4">
          <p className="text-[14px] leading-relaxed text-slate-800 whitespace-pre-wrap break-words">
            {notification.body || "No additional details were included with this notification."}
          </p>
        </div>

        {/* Metadata Grid */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-line-soft bg-white p-3">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-muted">Status</span>
            <div className="mt-1 flex items-center gap-1.5">
              {!notification.read ? (
                <>
                  <span className="h-2 w-2 rounded-full bg-brand-green animate-pulse" />
                  <span className="text-[13px] font-semibold text-brand-green">Unread</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 rounded-full bg-slate-400" />
                  <span className="text-[13px] font-semibold text-slate-700">Read</span>
                </>
              )}
            </div>
          </div>

          <div className="rounded-lg border border-line-soft bg-white p-3">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-muted">Category</span>
            <div className="mt-1">
              <span className="text-[13px] font-semibold text-ink">{visual.category}</span>
            </div>
          </div>

          <div className="col-span-2 sm:col-span-1 rounded-lg border border-line-soft bg-white p-3">
            <span className="block text-[11px] font-medium uppercase tracking-wider text-muted">Time</span>
            <div className="mt-1">
              <span className="text-[12.5px] font-medium text-slate-700">{timestamp}</span>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  );
}

