import { existsSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import {
  createFallbackNotifications,
  formatNotificationTime,
  getNotificationIcon,
  groupNotifications,
  mergeFallbackGroups,
} from "./NotificationsPanel";

describe("NotificationsPanel helpers", () => {
  it("maps notification kinds and titles to existing image assets under public/images/notifications", () => {
    const publicDir = join(process.cwd(), "public");
    const samples = [
      { kind: "Approval", title: "Lelise Gudeta KYC approved", expected: "/images/notifications/kyc-approved.svg" },
      { kind: "Payment", title: "Payment of ETB 4,500 released to Chaltu Dinkesa", expected: "/images/notifications/payment.svg" },
      { kind: "Leave", title: "Leave request approved · 01 to 12 Dec 2026", expected: "/images/notifications/leave.svg" },
      { kind: "Warning", title: "Overdue visit: Bako Tibe kebele", expected: "/images/notifications/warning.svg" },
      { kind: "Crop", title: "New crop record submitted — Teff, Gedo", expected: "/images/notifications/crop-record.svg" },
      { kind: "Grievances", title: "Grievance GR-2026-0418 assigned to you", expected: "/images/notifications/grievance.svg" },
      { kind: "Surveys", title: "Survey closes in 2 days", expected: "/images/notifications/survey.svg" },
      { kind: "Training", title: "Training module assigned: Soil health basics", expected: "/images/notifications/training.svg" },
      { kind: "Farmers", title: "12 farmers reassigned to your kebele", expected: "/images/notifications/farmers.svg" },
      { kind: "Performance", title: "Appraisal cycle Q4 2026 started", expected: "/images/notifications/performance.svg" },
      { kind: "Issue", title: "Sync error", expected: "/images/notifications/issue.svg" },
      { kind: "System", title: "General update", expected: "/images/notifications/bell.svg" },
    ];

    for (const s of samples) {
      const icon = getNotificationIcon(s);
      expect(icon).toBe(s.expected);
      expect(existsSync(join(publicDir, icon))).toBe(true);
    }
  });

  it("creates Today and Yesterday fallback items with 2 unread and formats timestamps", () => {
    const now = new Date(2026, 10, 12, 13, 30, 0);
    const items = createFallbackNotifications(now);
    const groups = groupNotifications(items, now);

    expect(items.filter((n) => !n.read)).toHaveLength(2);
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday"]);
    expect(groups[0].items).toHaveLength(2);
    expect(groups[1].items).toHaveLength(2);

    expect(formatNotificationTime(groups[0].items[0].at, "Today", now)).toBe("2 hours ago");
    expect(formatNotificationTime(groups[0].items[1].at, "Today", now)).toBe("4 hours ago");
    expect(formatNotificationTime(groups[1].items[0].at, "Yesterday", now)).toBe("Yesterday, 4:10 PM");
    expect(formatNotificationTime(groups[1].items[1].at, "Yesterday", now)).toBe("Yesterday, 9:30 AM");
  });

  it("fills missing Today/Yesterday groups when live API only has Earlier notifications", () => {
    const now = new Date(2026, 10, 12, 13, 30, 0);
    const fallback = createFallbackNotifications(now);
    const earlierLive = [
      {
        id: "live-1",
        kind: "Broadcast",
        title: "Older broadcast",
        body: "Sent last week",
        href: "/broadcast",
        read: true,
        at: new Date(2026, 10, 1, 10, 0, 0).toISOString(),
      },
    ];

    const merged = mergeFallbackGroups(earlierLive, fallback, now);
    const groups = groupNotifications(merged.items, now);
    expect(merged.addedFallbackItems).toHaveLength(4);
    expect(groups.map((g) => g.label)).toEqual(["Today", "Yesterday", "Earlier"]);
  });
});

