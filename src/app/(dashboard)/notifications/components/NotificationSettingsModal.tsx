"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Switch } from "@/components/ui/Switch";
import {
  CATEGORY_TONE,
  NOTIFICATION_CATEGORIES,
  type NotificationCategory,
} from "./notificationVisuals";

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
    Knowledge: true,
    Emergency: true,
    Weather: true,
    Informational: true,
    Broadcast: true,
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

  const setAllCategories = (checked: boolean) => {
    const updated = {} as Record<NotificationCategory, boolean>;
    NOTIFICATION_CATEGORIES.forEach((cat) => {
      updated[cat] = checked;
    });
    setDraft((prev) => ({ ...prev, categories: updated }));
  };

  const handleSave = () => {
    onSave(draft);
    onClose();
  };

  const activeCategoryCount = Object.values(draft.categories).filter(Boolean).length;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Notification settings"
      subtitle="Choose which portal updates and channels are active for your account."
      size="lg"
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-emerald-100 bg-emerald-50 text-brand-green shadow-2xs">
          <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="3" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06-.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z" />
          </svg>
        </div>
      }
      footer={
        <div className="flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-2.5 w-full sm:w-auto">
          <button
            type="button"
            onClick={onClose}
            className="h-10 w-full sm:w-auto rounded-lg border border-line bg-white px-5 text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-slate-50 shadow-2xs"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="inline-flex h-10 w-full sm:w-auto items-center justify-center gap-1.5 rounded-lg bg-brand-green px-6 text-[13.5px] font-semibold text-white shadow-sm transition-all hover:bg-brand-green-dark"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6L9 17l-5-5" />
            </svg>
            <span>Save preferences</span>
          </button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Delivery channels */}
        <div className="space-y-2.5">
          <h3 className="text-[11.5px] font-bold tracking-wider text-muted uppercase">Delivery channels</h3>
          <div className="divide-y divide-line-soft rounded-xl border border-line-soft bg-white overflow-hidden shadow-2xs">
            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-brand-green">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">In-app notifications</p>
                  <p className="text-[12px] text-muted">Real-time alerts in the top bar bell drawer and Notifications page.</p>
                </div>
              </div>
              <Switch
                checked={draft.inApp}
                onChange={(checked) => setDraft((prev) => ({ ...prev, inApp: checked }))}
                label="Toggle in-app notifications"
              />
            </div>

            <div className="flex items-center justify-between gap-3 p-3.5 sm:p-4 hover:bg-slate-50/50 transition-colors">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                </div>
                <div>
                  <p className="text-[13.5px] font-semibold text-ink">Daily summary digest</p>
                  <p className="text-[12px] text-muted">Once-daily email briefing for unread approvals and scheduled visits.</p>
                </div>
              </div>
              <Switch
                checked={draft.emailDigest}
                onChange={(checked) => setDraft((prev) => ({ ...prev, emailDigest: checked }))}
                label="Toggle daily summary digest"
              />
            </div>
          </div>
        </div>

        {/* Categories */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <div className="flex items-center gap-2">
              <h3 className="text-[11.5px] font-bold tracking-wider text-muted uppercase">Notification categories</h3>
              <span className="text-[11.5px] font-medium text-slate-500">
                ({activeCategoryCount} of {NOTIFICATION_CATEGORIES.length} active)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setAllCategories(true)}
                className="text-[11.5px] font-semibold text-brand-green hover:underline"
              >
                Select all
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={() => setAllCategories(false)}
                className="text-[11.5px] font-semibold text-muted hover:text-ink hover:underline"
              >
                Deselect all
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {NOTIFICATION_CATEGORIES.map((category) => {
              const tone = CATEGORY_TONE[category];
              return (
                <div
                  key={category}
                  className="flex items-center justify-between gap-2 rounded-xl border border-line-soft bg-white px-3.5 py-2.5 hover:bg-slate-50/70 transition-colors shadow-2xs"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span
                      className={`h-2 w-2 shrink-0 rounded-full ${
                        tone === "green"
                          ? "bg-emerald-500"
                          : tone === "blue"
                          ? "bg-blue-500"
                          : tone === "amber"
                          ? "bg-amber-500"
                          : tone === "red"
                          ? "bg-red-500"
                          : tone === "purple"
                          ? "bg-purple-500"
                          : "bg-slate-400"
                      }`}
                    />
                    <span className="text-[13px] font-semibold text-slate-800 truncate">{category}</span>
                  </div>
                  <Switch
                    checked={draft.categories[category]}
                    onChange={(checked) => toggleCategory(category, checked)}
                    label={`Toggle ${category} notifications`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}

