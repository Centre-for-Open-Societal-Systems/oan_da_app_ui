import { Pill, type PillTone } from "@/components/ui/Pill";
import type { GrievancePriority } from "../types";

// Known status names → tone; the service's own vocabulary is open-ended, so statusTone() falls back by keyword.
const STATUS_TONES: Record<string, PillTone> = {
  "pending submit": "amber",
  submitted: "slate",
  open: "slate",
  new: "slate",
  "more info needed": "amber",
  "awaiting info": "amber",
  assigned: "blue",
  "in progress": "blue",
  "under review": "purple",
  escalated: "purple",
  resolved: "green",
  rejected: "red",
  "pending submitter": "amber",
  closed: "slate",
};

/** A pill tone for any status label the Grievance Service returns. */
export function statusTone(status: string): PillTone {
  const key = status.trim().toLowerCase();
  if (STATUS_TONES[key]) return STATUS_TONES[key];
  if (/reject|fail|overdue/.test(key)) return "red";
  if (/resolv|close|complete|done/.test(key)) return "green";
  if (/review|escalat/.test(key)) return "purple";
  if (/progress|assign|open/.test(key)) return "blue";
  if (/pend|info|wait|hold/.test(key)) return "amber";
  return "slate";
}

const PRIORITY_TONES: Record<GrievancePriority, PillTone> = {
  Critical: "red",
  High: "amber",
  Medium: "blue",
  Low: "green",
};

export function GrievanceStatusPill({ status, className }: { status: string; className?: string }) {
  return <Pill tone={statusTone(status)} className={className}>{status}</Pill>;
}

export function GrievancePriorityPill({ priority, className }: { priority: GrievancePriority; className?: string }) {
  return <Pill tone={PRIORITY_TONES[priority]} className={className}>{priority}</Pill>;
}
