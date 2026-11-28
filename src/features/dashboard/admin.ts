// Sample data for the Administrator home until the registry analytics API is wired.
import type { FilterFieldConfig } from "@/components/ui/AdvancedFiltersDrawer";
import type { FilterOption } from "@/components/ui/FilterDropdown";
import type { PillTone } from "@/components/ui/Pill";

export interface AdminStat {
  key: string;
  label: string;
  value: string;
  accent: string; // border-l-* class
  tile: string; // icon tile bg/text classes
  icon: "handshake" | "calendar" | "shield" | "alert";
}

export const ADMIN_STATS: AdminStat[] = [
  { key: "farmers", label: "Linked farmers", value: "12,490", accent: "border-l-blue-600", tile: "bg-info-tint text-blue-600", icon: "handshake" },
  { key: "visits", label: "Visits today", value: "22", accent: "border-l-violet-600", tile: "bg-violet-tint text-violet-600", icon: "calendar" },
  { key: "quality", label: "Avg. data quality", value: "84", accent: "border-l-brand-green", tile: "bg-brand-tint text-brand-green", icon: "shield" },
  { key: "accuracy", label: "Data accuracy", value: "18", accent: "border-l-danger", tile: "bg-danger-tint text-danger", icon: "alert" },
];

export interface TrendPoint {
  label: string;
  value: number;
}

export const REGISTRATIONS_TREND: TrendPoint[] = [
  { label: "Apr 2026", value: 460 },
  { label: "May 2026", value: 540 },
  { label: "Jun 2026", value: 420 },
  { label: "Jul 2026", value: 630 },
  { label: "Aug 2026", value: 510 },
  { label: "Sep 2026", value: 740 },
];

export type ActivityTone = "green" | "blue" | "purple" | "amber";

export interface ActivityItem {
  id: string;
  initials: string;
  tone: ActivityTone;
  title: string;
  place: string;
  at: string;
}

export const RECENT_ACTIVITY: ActivityItem[] = [
  { id: "a1", initials: "DN", tone: "green", title: "Dawit Negash registered as new farmer", place: "Dendi", at: "10 min ago" },
  { id: "a2", initials: "AK", tone: "blue", title: "Profile updated: Abebe Kebede", place: "Gedo", at: "25 min ago" },
  { id: "a3", initials: "LG", tone: "purple", title: "Visit completed: Lelise Gudeta", place: "Bako Tibe", at: "1 hr ago" },
  { id: "a4", initials: "CD", tone: "amber", title: "Kebele reassigned: Chaltu Dinkesa → Lume", place: "Lume", at: "2 hr ago" },
  { id: "a5", initials: "HF", tone: "green", title: "Hirut Fikadu registered as new farmer", place: "Gedo", at: "3 hr ago" },
];

export type RegistrationStatus = "Pending" | "Requires review";

export const REGISTRATION_STATUS_TONE: Record<RegistrationStatus, PillTone> = {
  Pending: "amber",
  "Requires review": "red",
};

export interface PendingRegistration {
  id: string;
  agent: string;
  type: "Farmer" | "Transporter" | "Vendor";
  kebele: string;
  updatedAt: string;
  status: RegistrationStatus;
}

export const PENDING_REGISTRATIONS: PendingRegistration[] = [
  { id: "r1", agent: "Almaz W.", type: "Farmer", kebele: "Lume", updatedAt: "14 Sep 2026", status: "Pending" },
  { id: "r2", agent: "Almaz W.", type: "Transporter", kebele: "Dendi", updatedAt: "13 Sep 2026", status: "Requires review" },
  { id: "r3", agent: "Bekele N.", type: "Vendor", kebele: "Bako Tibe", updatedAt: "11 Sep 2026", status: "Pending" },
  { id: "r4", agent: "Hailu G.", type: "Farmer", kebele: "Adea", updatedAt: "09 Sep 2026", status: "Requires review" },
];

const optionsFor = (pick: (row: PendingRegistration) => string): FilterOption[] => {
  const counts = new Map<string, number>();
  PENDING_REGISTRATIONS.forEach((row) => counts.set(pick(row), (counts.get(pick(row)) ?? 0) + 1));
  return [...counts].map(([value, count]) => ({ value, label: value, count }));
};

export const REGISTRATION_AGENT_OPTIONS = optionsFor((r) => r.agent);
export const REGISTRATION_TYPE_OPTIONS = optionsFor((r) => r.type);
export const REGISTRATION_STATUS_OPTIONS = optionsFor((r) => r.status);

export const REGISTRATION_FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "agent", label: "Agent", allLabel: "All agents", placeholder: "All Agents", options: REGISTRATION_AGENT_OPTIONS },
  { key: "type", label: "Type", allLabel: "All types", placeholder: "All Types", options: REGISTRATION_TYPE_OPTIONS },
  // Filled in by the component from the geo Master Data (useAreaFilterOptions).
  { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All Kebeles", options: [] },
  { key: "status", label: "Status", allLabel: "All Status", placeholder: "All Status", options: REGISTRATION_STATUS_OPTIONS },
];
