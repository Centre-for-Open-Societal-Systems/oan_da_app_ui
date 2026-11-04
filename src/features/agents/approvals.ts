// Shape of a row in the Woreda approval queue; the rows come from GET /profile/change-requests (app/(dashboard)/approvals).
import type { PillTone } from "@/components/ui/Pill";

export type ApprovalKind = "Onboarding" | "Profile change" | "Assignment" | "Specialization";
export type ApprovalRequestStatus = "Awaiting verification" | "Changes requested" | "Approved" | "Rejected" | "Cancelled";

export const APPROVAL_REQUEST_TONE: Record<ApprovalRequestStatus, PillTone> = {
  "Awaiting verification": "amber",
  "Changes requested": "purple",
  Approved: "green",
  Rejected: "red",
  Cancelled: "slate",
};

export interface ApprovalTrailStep {
  label: string;
  detail: string;
  at: string;
  /** The step the request is currently waiting on. */
  current?: boolean;
}

export interface ApprovalRequest {
  id: string; // submission id
  kind: ApprovalKind;
  title: string;
  /** Short place shown in the queue row, e.g. "Adama" or "Assigned kebele 12". */
  place: string;
  kebele: string;
  woreda: string;
  /** Area-master code of the Woreda, for the queue filter (API-backed rows). */
  woredaCode?: string;
  /** The DA the request belongs to (API-backed rows). */
  daId?: string;
  submittedAt: string;
  submittedBy: { name: string; agentId: string; initials: string };
  status: ApprovalRequestStatus;
  data: { label: string; value: string; verified?: boolean }[];
  trail: ApprovalTrailStep[];
}

export type ApprovalTab = "all" | "onboarding" | "profile" | "assignment";

export const APPROVAL_TABS: { key: ApprovalTab; label: string; kinds: ApprovalKind[] | null }[] = [
  { key: "all", label: "All", kinds: null },
  { key: "onboarding", label: "Onboarding changes", kinds: ["Onboarding"] },
  { key: "profile", label: "Profile changes", kinds: ["Profile change", "Specialization"] },
  { key: "assignment", label: "Assignments", kinds: ["Assignment"] },
];
