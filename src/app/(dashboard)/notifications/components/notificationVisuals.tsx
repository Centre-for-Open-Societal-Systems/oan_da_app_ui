import {
  formatNotificationTime,
  getNotificationIcon,
  type AppNotification,
} from "@/components/layout/NotificationsPanel";
import type { PillTone } from "@/components/ui/Pill";

export type NotificationCategory =
  | "KYC"
  | "Payments"
  | "Leave"
  | "Visits"
  | "Crop records"
  | "Grievances"
  | "Surveys"
  | "Training"
  | "Farmers"
  | "Performance";

export type NotificationTimeBucket =
  | "Today"
  | "Yesterday"
  | "Earlier this week"
  | "Last week"
  | "Earlier";

export const NOTIFICATION_CATEGORIES: NotificationCategory[] = [
  "KYC",
  "Payments",
  "Leave",
  "Visits",
  "Crop records",
  "Grievances",
  "Surveys",
  "Training",
  "Farmers",
  "Performance",
];

export const CATEGORY_TONE: Record<NotificationCategory, PillTone> = {
  KYC: "green",
  Payments: "blue",
  Leave: "amber",
  Visits: "amber",
  "Crop records": "green",
  Grievances: "red",
  Surveys: "blue",
  Training: "slate",
  Farmers: "green",
  Performance: "blue",
};

export function resolveNotificationCategory(n: Pick<AppNotification, "kind" | "title">): NotificationCategory {
  const title = n.title;
  if (/kyc/i.test(title) || n.kind === "Approval" || n.kind === "Onboarding") return "KYC";
  if (/payment|etb|subsidy|released/i.test(title) || n.kind === "Payment" || n.kind === "Sync") return "Payments";
  if (/leave/i.test(title) || n.kind === "Leave") return "Leave";
  if (/overdue|visit/i.test(title) || n.kind === "Warning" || n.kind === "Broadcast") return "Visits";
  if (/crop|yield/i.test(title) || n.kind === "Crop") return "Crop records";
  if (/grievance/i.test(title) || n.kind === "Grievance" || n.kind === "Issue") return "Grievances";
  if (/survey/i.test(title) || n.kind === "Task") return "Surveys";
  if (/training/i.test(title) || n.kind === "Training") return "Training";
  if (/farmer|reassigned/i.test(title) || n.kind === "Assignment" || n.kind === "Farmers") return "Farmers";
  if (/appraisal|performance/i.test(title) || n.kind === "Performance") return "Performance";
  if ((NOTIFICATION_CATEGORIES as string[]).includes(n.kind)) {
    return n.kind as NotificationCategory;
  }
  return "Visits";
}

export function getNotificationVisual(n: Pick<AppNotification, "kind" | "title">) {
  const category = resolveNotificationCategory(n);
  return {
    category,
    tone: CATEGORY_TONE[category],
    iconSrc: getNotificationIcon(n),
  };
}

const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
const DAY = 86_400_000;

export function timeBucketOf(at: string, now = new Date()): NotificationTimeBucket {
  const diffDays = Math.round((startOfDay(now) - startOfDay(new Date(at))) / DAY);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "Yesterday";
  if (diffDays <= 5) return "Earlier this week";
  if (diffDays <= 14) return "Last week";
  return "Earlier";
}

export function groupNotificationsByBucket(
  items: AppNotification[],
  now = new Date()
): { label: NotificationTimeBucket; items: AppNotification[] }[] {
  const order: NotificationTimeBucket[] = ["Today", "Yesterday", "Earlier this week", "Last week", "Earlier"];
  return order
    .map((label) => ({ label, items: items.filter((n) => timeBucketOf(n.at, now) === label) }))
    .filter((g) => g.items.length > 0);
}

export function formatBucketTimestamp(at: string, bucket: NotificationTimeBucket, now = new Date()): string {
  if (bucket === "Today") return formatNotificationTime(at, "Today", now);
  if (bucket === "Yesterday") return formatNotificationTime(at, "Yesterday", now);
  const d = new Date(at);
  const weekday = d.toLocaleDateString("en-US", { weekday: "short" });
  const datePart = d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
  const clock = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
  return `${weekday}, ${datePart}, ${clock}`;
}

/** Rich page sample dataset matching the Notifications page layout when live groups are absent. */
export function createPageSampleNotifications(now = new Date()): AppNotification[] {
  const todayStart = startOfDay(now);
  const hoursAgo = (h: number) => new Date(Math.max(todayStart + 60_000, now.getTime() - h * 3_600_000)).toISOString();
  const daysAgoAt = (days: number, hour: number, minute: number) =>
    new Date(now.getFullYear(), now.getMonth(), now.getDate() - days, hour, minute, 0).toISOString();

  return [
    {
      id: "sample-today-1",
      kind: "KYC",
      title: "Lelise Gudeta KYC approved",
      body: "The national registry database matched the biometric and land deed documentation successfully.",
      href: null,
      read: false,
      at: hoursAgo(2),
    },
    {
      id: "sample-today-2",
      kind: "Payments",
      title: "Payment of ETB 4,500 released to Chaltu Dinkesa",
      body: "Government agricultural subsidy for Teff production has been credited to the designated commercial account.",
      href: null,
      read: true,
      at: hoursAgo(4),
    },
    {
      id: "sample-today-3",
      kind: "Leave",
      title: "Leave request approved · 01 to 12 Dec 2026",
      body: "Dr. Tewodros M. approved your annual leave. Kedir Hussen is set as the backup DA.",
      href: "/lifecycle/leave",
      read: true,
      at: hoursAgo(5),
    },
    {
      id: "sample-yesterday-1",
      kind: "Visits",
      title: "Overdue visit: Bako Tibe kebele",
      body: "Development agent agenda requires field visit assessment for crop yield estimates on sector 4 plots.",
      href: "/visits",
      read: false,
      at: daysAgoAt(1, 16, 10),
    },
    {
      id: "sample-yesterday-2",
      kind: "Crop records",
      title: "New crop record submitted — Teff, Gedo",
      body: "Farmer Chaltu Dinkesa submitted baseline agricultural yield report.",
      href: "/farmers/crop-report",
      read: true,
      at: daysAgoAt(1, 9, 30),
    },
    {
      id: "sample-yesterday-3",
      kind: "Grievances",
      title: "Grievance GR-2026-0418 assigned to you",
      body: "A farmer in Dodota reported a delayed input delivery. Respond within 3 working days.",
      href: "/grievances",
      read: true,
      at: daysAgoAt(1, 8, 5),
    },
    {
      id: "sample-week-1",
      kind: "Surveys",
      title: "Survey closes in 2 days",
      body: "The Q4 extension-service satisfaction survey is still open for 6 of your farmers.",
      href: "/surveys",
      read: true,
      at: daysAgoAt(3, 14, 20),
    },
    {
      id: "sample-week-2",
      kind: "Training",
      title: "Training module assigned: Soil health basics",
      body: "Complete the module in Agrilearn by 30 Nov to keep your certificate valid.",
      href: "/training",
      read: true,
      at: daysAgoAt(4, 11, 0),
    },
    {
      id: "sample-lastweek-1",
      kind: "Farmers",
      title: "12 farmers reassigned to your kebele",
      body: "Farmers from Dodota were reassigned to you after a transfer was approved.",
      href: "/farmers",
      read: true,
      at: daysAgoAt(7, 15, 45),
    },
    {
      id: "sample-lastweek-2",
      kind: "Performance",
      title: "Appraisal cycle Q4 2026 started",
      body: "Your self-assessment is due on 15 Dec 2026. Open My Performance to begin.",
      href: "/performance",
      read: true,
      at: daysAgoAt(9, 9, 0),
    },
  ];
}

