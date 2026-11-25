import { authRequest } from "@/features/auth";

/** GET /api/v1/da-services/dashboard/summary: the signed-in DA's visits, tasks and sync health for a date range. */
export interface AgentSummary {
  da_id: string;
  range: { from: string; to: string };
  visits: { completed: number; planned: number };
  tasks: { open: number; done: number; urgent: number; due_today: number };
  sync: {
    conflicts: number;
    failed: number;
    server_pending: number;
    /** ISO timestamp of the last upload the server received from this DA; null before the first. */
    last_received_at: string | null;
  };
}

/** Both ends inclusive, as ISO dates ("2026-10-15"). */
export interface DateRange {
  from: string;
  to: string;
}

/** For a DA the backend reads the DA-ID from the token; other roles get a 400 "da_id is required". */
export async function fetchAgentSummary({ from, to }: DateRange): Promise<AgentSummary> {
  const query = new URLSearchParams({ from, to });
  const res = await authRequest<{ data: AgentSummary }>(`/da-services/dashboard/summary?${query}`);
  return res.data;
}

/** One row of Today's Plan; visits and tasks come merged, timed rows first in clock order. */
export interface TodayItem {
  kind: "visit" | "task";
  id: string;
  /** "08:30"; null for a task with no time. */
  time: string | null;
  title: string;
  subtitle: string;
  status: "Upcoming" | "Due today" | "Overdue" | "Done";
  /** Tasks only. */
  priority?: string;
  /** Backend route for the row, e.g. "/visits/DA-VIS-0001" or "/tasks/DA-TASK-0001". */
  href: string;
}

/** GET /api/v1/da-services/dashboard/today: the signed-in DA's visits and tasks for one day (ISO date). */
export async function fetchTodayPlan(date: string): Promise<TodayItem[]> {
  const res = await authRequest<{ data: { date: string; items: TodayItem[] } }>(`/da-services/dashboard/today?${new URLSearchParams({ date })}`);
  return res.data.items;
}

export { todayIso } from "@/lib/utils";

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
const daysBack = (today: Date, n: number) => new Date(today.getFullYear(), today.getMonth(), today.getDate() - n);

/**
 * Dates for a dashboard range label, ending today. "Last 30 days" counts today as one of the 30, which is
 * also what the backend uses when no range is sent. Unknown labels (e.g. "Custom range") give null.
 */
export function rangeFor(label: string, today = new Date()): DateRange | null {
  const to = iso(today);
  switch (label) {
    case "Last 7 days":
      return { from: iso(daysBack(today, 6)), to };
    case "Last 30 days":
      return { from: iso(daysBack(today, 29)), to };
    case "Last 90 days":
      return { from: iso(daysBack(today, 89)), to };
    case "This quarter":
      return { from: iso(new Date(today.getFullYear(), Math.floor(today.getMonth() / 3) * 3, 1)), to };
    case "This year":
      return { from: iso(new Date(today.getFullYear(), 0, 1)), to };
    default:
      return null;
  }
}

/** "just now", "5 min ago", "3 h ago", "2 days ago"; null for no timestamp. */
export function timeAgo(isoTimestamp: string | null, now = Date.now()): string | null {
  if (!isoTimestamp) return null;
  const minutes = Math.max(0, Math.round((now - new Date(isoTimestamp).getTime()) / 60_000));
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}
