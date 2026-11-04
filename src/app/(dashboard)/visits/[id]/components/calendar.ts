import type { PlannerStatus } from "@/features/visits";

export const LEGEND: { status: PlannerStatus; label: string; dot: string }[] = [
  { status: "scheduled", label: "Scheduled", dot: "bg-blue-600" },
  { status: "completed", label: "Completed", dot: "bg-brand-green" },
  { status: "overdue", label: "Overdue", dot: "bg-amber-600" },
];

export const VISIT_STYLES: Record<PlannerStatus, { card: string; time: string; dot: string }> = {
  scheduled: { card: "border-blue-200 bg-blue-50", time: "text-blue-600", dot: "bg-blue-600" },
  completed: { card: "border-brand-border bg-brand-mint", time: "text-brand-green", dot: "bg-brand-green" },
  overdue: { card: "border-warning-border bg-warning-wash", time: "text-amber-700", dot: "bg-amber-600" },
};

export const VIEWS = ["Week", "Day", "Month"];
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
export const DAY_LABELS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const DAY_MS = 86_400_000;

// Days are counted from the Monday of the current week (= 0), so any week can be derived from it.
const now = new Date();
export const TODAY = (now.getDay() + 6) % 7;
const ANCHOR = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate() - TODAY);

export const dateOf = (day: number) => new Date(ANCHOR + day * DAY_MS);
export const dayOfDate = (d: Date) => Math.round((d.getTime() - ANCHOR) / DAY_MS);
export const weekStartOf = (day: number) => Math.floor(day / 7) * 7;
export const weekdayLabel = (day: number) => DAY_LABELS[((day % 7) + 7) % 7];
export const isoOf = (day: number) => dateOf(day).toISOString().slice(0, 10);
export const todayIso = isoOf(TODAY);
export const isToday = (day: number) => day === TODAY;

export const monthYear = (d: Date) => `${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
export const longDate = (day: number) => {
  const d = dateOf(day);
  const label = weekdayLabel(day);
  return `${label.charAt(0)}${label.slice(1).toLowerCase()} ${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]} ${d.getUTCFullYear()}`;
};

export function weekLabel(start: number) {
  const a = dateOf(start);
  const b = dateOf(start + 6);
  if (a.getUTCMonth() === b.getUTCMonth()) return monthYear(a);
  if (a.getUTCFullYear() === b.getUTCFullYear()) return `${MONTHS[a.getUTCMonth()].slice(0, 3)} – ${MONTHS[b.getUTCMonth()].slice(0, 3)} ${b.getUTCFullYear()}`;
  return `${MONTHS[a.getUTCMonth()].slice(0, 3)} ${a.getUTCFullYear()} – ${MONTHS[b.getUTCMonth()].slice(0, 3)} ${b.getUTCFullYear()}`;
}
