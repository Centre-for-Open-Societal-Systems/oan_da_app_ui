"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import { NOTIFICATION_CATEGORIES, type NotificationCategory } from "./notificationVisuals";

export interface NotificationPreferences {
  inApp: boolean;
  emailDigest: boolean;
  categories: Record<NotificationCategory, boolean>;
}

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  inApp: true,
  emailDigest: false,
  categories: {
    KYC: true,
    Payments: true,
    Leave: true,
    Visits: true,
    "Crop records": true,
    Grievances: true,
    Surveys: true,
    Training: true,
    Farmers: true,
    Performance: true,
  },
};

interface NotificationSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: NotificationPreferences;
  onSave: (next: NotificationPreferences) => void;
}

export function NotificationSettingsModal({
  isOpen,
  onClose,
  preferences,
  onSave,
}: NotificationSettingsModalProps) {
  const [draft, setDraft] = useState<NotificationPreferences>(preferences);

  const toggleCategory = (category: NotificationCategory, checked: boolean) => {
    setDraft((prev) => ({
      ...prev,
      categories: { ...prev.categories, [category]: checked },
    }));
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notification settings"
      subtitle="Choose which portal updates and channels are active for your account."
      size="lg"
      footer={
        <div className="flex items-center justify-end gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="h-9 rounded-lg border border-line bg-white px-4 text-[13px] font-semibold text-ink-soft transition-colors hover:bg-surface"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="h-9 rounded-lg bg-brand-green-bright px-4 text-[13px] font-semibold text-white transition-colors hover:bg-brand-green-dark"
          >
            Save preferences
          </button>
        </div>
      }
    >
      <div className="space-y-5">
        <div className="space-y-2.5">
          <h3 className="text-[12px] font-bold tracking-wider text-muted uppercase">Delivery channels</h3>
          <div className="divide-y divide-line-soft rounded-lg border border-line-soft">
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[13.5px] font-semibold text-ink">In-app notifications</p>
                <p className="text-[12px] text-muted">Show real-time alerts in the header bell drawer and Notifications page.</p>
              </div>
              <Switch
                checked={draft.inApp}
                onChange={(checked) => setDraft((prev) => ({ ...prev, inApp: checked }))}
                label="Toggle in-app notifications"
              />
            </div>
            <div className="flex items-center justify-between px-4 py-3">
              <div>
                <p className="text-[13.5px] font-semibold text-ink">Daily summary digest</p>
                <p className="text-[12px] text-muted">Receive a once-daily email digest for unread approvals and overdue visits.</p>
              </div>
              <Switch
                checked={draft.emailDigest}
                onChange={(checked) => setDraft((prev) => ({ ...prev, emailDigest: checked }))}
                label="Toggle daily summary digest"
              />
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <h3 className="text-[12px] font-bold tracking-wider text-muted uppercase">Notification categories</h3>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {NOTIFICATION_CATEGORIES.map((category) => (
              <div
                key={category}
                className="flex items-center justify-between rounded-lg border border-line-soft px-3.5 py-2.5"
              >
                <span className="text-[13px] font-semibold text-ink">{category}</span>
                <Switch
                  checked={draft.categories[category]}
                  onChange={(checked) => toggleCategory(category, checked)}
                  label={`Toggle ${category} notifications`}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  );
}

