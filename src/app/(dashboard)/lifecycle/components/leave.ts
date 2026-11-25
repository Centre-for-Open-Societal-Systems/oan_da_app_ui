// Sample leave record and the Leave / suspension form copy, until the leave API is wired.
import { formatDate, type LifecycleRequest, type RequestFields, type TransitionCopy } from "./lifecycle";

export const LEAVE_TYPES = ["Annual leave", "Sick leave", "Special leave", "Maternity leave", "Suspension"];
/** Types offered on the Request leave dialog: what each one is, and the badge shown beside it (Annual shows the days left). */
export const LEAVE_TYPE_OPTIONS = [
  { type: "Annual leave", note: "Paid - plan ahead with your supervisor", badge: "" },
  { type: "Sick leave", note: "Paid - medical note after 3 days", badge: "As needed" },
  { type: "Maternity leave", note: "120 days - Starts up to 30 days before", badge: "120 days" },
  { type: "Paternity leave", note: "10 working days around the birth", badge: "10 days" },
  { type: "Marriage leave", note: "3 working days, once", badge: "3 days" },
  { type: "Mourning leave", note: "3 working days per bereavement", badge: "3 days" },
  { type: "Leave without pay", note: "Needs supervisor and HR approval", badge: "Unpaid" },
];
export const LEAVE_YEAR = 2026;
/** Days a DA is entitled to per policy year; other types aren't deducted from a balance. */
export const LEAVE_ENTITLEMENT: Record<string, number> = { "Annual leave": 20, "Sick leave": 30, "Special leave": 5 };

export const ACCESS_OPTIONS = ["Full access", "Read-only", "Suspended"];
/** DAs in nearby kebeles who can cover the scheduled visits; the label adds their role as on the form. */
export const COVER_OPTIONS = ["Kedir Hussen — Lume kebele", "Meseret Bekele — Kebele 05", "Tolosa Gemechu — Gedo kebele", "Hirut Abebe — Dendi kebele"];
export const coverLabel = (cover: string) => cover.replace(" — ", " — DA, ");
export const COVER_KEBELE = "Bako Tibe kebele, Adama";

export type LeaveStatus = "Pending approval" | "Approved" | "Completed" | "Rejected" | "Withdrawn";

export interface LeaveRecord {
  id: string;
  type: string;
  /** ISO dates (yyyy-mm-dd). */
  start: string;
  end: string;
  /** Working days. */
  days: number;
  status: LeaveStatus;
  approver: string;
  submitted: string;
  reason: string;
  /** Interim cover DA, when one was named. */
  cover?: string;
  /** Raised in this session, so it has a request page. */
  hasPage?: boolean;
}

export const LEAVE_RECORDS: LeaveRecord[] = [
  { id: "LV-2026-0087", type: "Annual leave", start: "2026-06-12", end: "2026-06-16", days: 5, status: "Completed", approver: "Dr. Tewodros M.", submitted: "2026-06-02", reason: "Family event in Bishoftu." },
  { id: "LV-2026-0031", type: "Sick leave", start: "2026-03-03", end: "2026-03-04", days: 2, status: "Completed", approver: "Dr. Tewodros M.", submitted: "2026-03-03", reason: "Fever; medical certificate from Adama health centre." },
  { id: "LV-2025-0210", type: "Annual leave", start: "2025-12-15", end: "2025-12-19", days: 5, status: "Completed", approver: "Dr. Tewodros M.", submitted: "2025-12-04", reason: "Year-end annual leave." },
  { id: "LV-2025-0155", type: "Annual leave", start: "2025-08-18", end: "2025-08-22", days: 5, status: "Rejected", approver: "Dr. Tewodros M.", submitted: "2025-08-05", reason: "Personal travel; rejected because it overlapped the Meher planting campaign." },
  { id: "LV-2024-0012", type: "Maternity leave", start: "2024-01-02", end: "2024-04-01", days: 65, status: "Completed", approver: "Dr. Tewodros M.", submitted: "2023-12-20", reason: "Statutory maternity leave." },
];

/** A yyyy-mm-dd date as local midnight. */
const day = (iso: string) => {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
};
const isoOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
const isWeekday = (date: Date) => date.getDay() !== 0 && date.getDay() !== 6;

export const calendarDays = (start: string, end: string) => Math.round((day(end).getTime() - day(start).getTime()) / 86_400_000) + 1;

/** Public holidays that are not counted as leave days (ISO date -> name). Sample list until the leave calendar API exists. */
export const PUBLIC_HOLIDAYS: Record<string, string> = {
  "2026-09-11": "Enkutatash (Ethiopian New Year)",
  "2026-09-27": "Meskel",
  "2027-01-07": "Genna (Ethiopian Christmas)",
  "2027-01-19": "Timket",
  "2027-03-02": "Adwa Victory Day",
  "2027-03-10": "Eid al-Fitr (provisional)",
  "2027-04-30": "Siklet (Good Friday)",
  "2027-05-01": "Labour Day",
  "2027-05-05": "Patriots' Victory Day",
  "2027-05-28": "Derg Downfall Day",
};

/** A weekday that is not a public holiday. */
export const isWorkingDay = (iso: string) => isWeekday(day(iso)) && !PUBLIC_HOLIDAYS[iso];

/** Monday–Friday days from start to end, both included, without public holidays. */
export function workingDays(start: string, end: string) {
  let count = 0;
  for (let d = day(start); d <= day(end); d.setDate(d.getDate() + 1)) if (isWorkingDay(isoOf(d))) count++;
  return count;
}

/** Working days with half a day taken off for a half-day start and/or end. */
export function leaveDays(start: string, end: string, halfStart = false, halfEnd = false) {
  let days = workingDays(start, end);
  if (halfStart && isWorkingDay(start)) days -= 0.5;
  if (halfEnd && isWorkingDay(end) && !(halfStart && start === end)) days -= 0.5;
  return days;
}

/** First working day after the leave ends. */
export function returnDate(end: string) {
  const d = day(end);
  do d.setDate(d.getDate() + 1);
  while (!isWorkingDay(isoOf(d)));
  return isoOf(d);
}

/** Both dates set and in order. */
export const validRange = (f: RequestFields) => !!f.effective && !!f.target && f.target >= f.effective;

/** "20 Oct – 03 Nov 2026", "12 – 16 Jun 2026"; `full` spells out both dates ("20 Oct 2026 – 03 Nov 2026"). */
export function dateRange(start: string, end: string, full = false) {
  if (full) return `${formatDate(start)} – ${formatDate(end)}`;
  const [sd, sm, sy] = formatDate(start).split(" ");
  const [ed, em, ey] = formatDate(end).split(" ");
  if (sy !== ey) return `${formatDate(start)} – ${formatDate(end)}`;
  return sm === em ? `${sd} – ${ed} ${em} ${ey}` : `${sd} ${sm} – ${ed} ${em} ${ey}`;
}

export const durationLine = (start: string, end: string) => `${workingDays(start, end)} working days (${calendarDays(start, end)} calendar)`;

/** Roughly one farm visit every other working day falls in the leave window. */
export const visitsInWindow = (start: string, end: string) => Math.ceil(workingDays(start, end) / 2);

export const leaveStatus = (type: string) => (type === "Suspension" ? "Suspended" : "On Leave");

const ACCESS_NOTE: Record<string, string> = { "Full access": "access stays full", "Read-only": "access is read-only", Suspended: "access is suspended" };

/** Leave raised in this session as table rows, newest first, followed by the record on file. */
export function leaveRecords(requests: LifecycleRequest[]): LeaveRecord[] {
  const raised = requests
    .filter((r) => r.code === "LV")
    .sort((a, b) => b.submittedAt.localeCompare(a.submittedAt))
    .map((r): LeaveRecord => ({ id: r.id, type: r.scope, start: r.effective, end: r.target, days: leaveDays(r.effective, r.target, r.halfStart, r.halfEnd), status: r.status, approver: "Dr. Tewodros M.", submitted: r.submittedAt, reason: r.reason, cover: r.successor ? r.successor.split(" — ")[0] : undefined, hasPage: true }));
  return [...raised, ...LEAVE_RECORDS];
}

/**
 * Balance of a leave type this policy year: days already taken, days held by pending or approved requests
 * (optionally only those submitted before `before`, and never `excludeId`), and what's left.
 */
export function leaveBalance(type: string, requests: LifecycleRequest[], opts: { excludeId?: string; before?: string } = {}) {
  const total = LEAVE_ENTITLEMENT[type];
  if (total === undefined) return null;
  const inYear = (r: LeaveRecord) => r.type === type && r.start.startsWith(String(LEAVE_YEAR));
  const taken = LEAVE_RECORDS.filter((r) => inYear(r) && r.status === "Completed").reduce((sum, r) => sum + r.days, 0);
  const held = leaveRecords(requests)
    .filter((r) => r.hasPage && inYear(r) && (r.status === "Pending approval" || r.status === "Approved") && r.id !== opts.excludeId && (!opts.before || r.submitted < opts.before))
    .reduce((sum, r) => sum + r.days, 0);
  return { total, taken, held, left: total - taken - held };
}

export const LEAVE_FORM: TransitionCopy = {
  slug: "leave",
  code: "LV",
  summary: "Record a temporary leave or suspension. The DA returns to Active automatically on the return date.",
  previewCurrent: "Active · Bako Tibe kebele",
  previewAfter: (f) => `${leaveStatus(f.scope)} · until ${formatDate(f.target)}`,
  effectiveNote: (d, f) => `Status becomes ${leaveStatus(f.scope)} on ${d}${validRange(f) ? ` and returns to Active on ${formatDate(returnDate(f.target))}` : ""}.`,
  requestNote: (d, f) => `Status becomes ${leaveStatus(f.scope)} on ${d}.`,
  next: () => ["Scheduled visits in the window move to the interim cover DA.", "The DA returns to Active automatically on the return date.", "An audit entry records type, dates, approver and timestamp."],
  approvedNext: (r) => [
    `Hand over scheduled visits to ${r.successor.split(" — ")[0]} before ${formatDate(r.effective)}.`,
    `Status becomes ${leaveStatus(r.scope)} on ${formatDate(r.effective)}; ${ACCESS_NOTE[r.access ?? ""] ?? "access is unchanged"}.`,
    `Returns to Active automatically on ${formatDate(returnDate(r.target))}.`,
  ],
};
