import type { ApprovalRequest, ApprovalRequestStatus, ApprovalTrailStep } from "@/features/agents";
import { changeRows, type ChangeRequest, type ChangeRequestDecision } from "@/features/profile";
import { ApiError } from "@/lib/api";

export type Decision = "approve" | "changes" | "reject";

export type Outcome = { tone: "success" | "warning" | "info"; text: string };

/** Minimum reviewer note length for Reject / Request changes (the backend refuses shorter notes). */
export const MIN_NOTE = 5;

/** What POST /profile/change-requests/{id}/decide expects for each button. */
export const DECISION_API: Record<Decision, ChangeRequestDecision> = {
  approve: "Approve",
  changes: "Request changes",
  reject: "Reject",
};

/** Backend request status → the queue's status chip. Approved and Applied both read as approved here. */
const STATUS_UI: Record<string, ApprovalRequestStatus> = {
  Pending: "Awaiting verification",
  Approved: "Approved",
  Applied: "Approved",
  Rejected: "Rejected",
  "Changes requested": "Changes requested",
  Cancelled: "Cancelled",
};

/** Only requests still awaiting verification can be selected or decided. */
export const isOpen = (r: ApprovalRequest) => r.status === "Awaiting verification";

export const formatDateTime = (iso: string | null | undefined): string => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const initialsOf = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("") || "DA";

/**
 * A DA Profile Change Request (GET /profile/change-requests) in the shape the queue and detail panel render.
 * `areaNames` maps area-master codes to names; `agentNames` maps a DA-ID to the registry's full name (filled in
 * lazily for the selected request). Both fall back to the code / DA-ID until they are known.
 */
export function toApprovalRequest(r: ChangeRequest, areaNames: Record<string, string> = {}, agentNames: Record<string, string> = {}): ApprovalRequest {
  const rows = changeRows(r);
  const woredaName = r.woreda ? (areaNames[r.woreda] ?? r.woreda) : "—";
  const name = (r.da_id && agentNames[r.da_id]) || r.da_id || r.requested_by || "—";
  const status = STATUS_UI[String(r.status)] ?? "Awaiting verification";
  const title = rows.length === 1 ? `${rows[0].label} → ${rows[0].to}` : `${r.section ?? "Profile"} change — ${rows.map((c) => c.label).join(", ") || "no fields"}`;

  const data: ApprovalRequest["data"] =
    rows.length === 1
      ? [
          { label: "Field changed", value: rows[0].label },
          { label: "Previous value", value: rows[0].from },
          { label: "New value", value: rows[0].to },
        ]
      : rows.flatMap((c) => [
          { label: `${c.label} (current)`, value: c.from },
          { label: `${c.label} (requested)`, value: c.to },
        ]);
  data.push({ label: "Section", value: r.section ?? "—" }, { label: "DA-ID", value: r.da_id ?? "—" }, { label: "Reason", value: r.reason ?? "—" });

  const trail: ApprovalTrailStep[] = [{ label: "Submitted", detail: `by ${name} (Development Agent)`, at: formatDateTime(r.creation) }];
  if (r.decided_at) trail.push({ label: String(r.status === "Applied" ? "Approved" : r.status), detail: `by ${r.approver ?? "supervisor"}${r.decision_note ? ` · ${r.decision_note}` : ""}`, at: formatDateTime(r.decided_at) });
  if (r.registry_sync_state && r.registry_sync_state !== "Not sent") {
    trail.push({
      label: r.registry_sync_state === "Accepted" ? "Sent to the DA Registry" : `DA Registry: ${r.registry_sync_state}`,
      detail: r.registry_error ?? (r.registry_reference ? `Registry reference ${r.registry_reference}` : "The change is now in the registry's own approval queue"),
      at: formatDateTime(r.applied_at ?? r.modified),
    });
  }
  if (r.registry_approval) trail.push({ label: `Registry ${String(r.registry_approval).toLowerCase()}`, detail: "The DA Registry's own decision on the applied change", at: r.registry_approval === "Pending" ? "Current" : formatDateTime(r.modified) });
  if (r.status === "Pending") trail.push({ label: "Awaiting review", detail: `Woreda supervisor · ${woredaName}`, at: "Current", current: true });
  else trail[trail.length - 1].current = true;

  return {
    id: r.name,
    kind: "Profile change",
    title,
    place: woredaName,
    kebele: "",
    woreda: `${woredaName} woreda`,
    woredaCode: r.woreda ?? undefined,
    daId: r.da_id,
    submittedAt: formatDateTime(r.creation),
    submittedBy: { name, agentId: r.da_id ?? "—", initials: initialsOf(name) },
    status,
    data,
    trail,
  };
}

/** What an approval achieved: the backend records a registry failure on the request, not as a failed call. */
export interface ApprovalResult {
  sent: number;
  failed: { id: string; error: string }[];
}

export function approvalResult(approved: ChangeRequest[]): ApprovalResult {
  const failed = approved.filter((r) => r.registry_sync_state !== "Accepted");
  return { sent: approved.length - failed.length, failed: failed.map((r) => ({ id: r.name, error: String(r.registry_error ?? "The DA Registry did not accept the change.") })) };
}

/** Banner shown after a request-changes / reject decision. */
export function outcomeFor(decision: "changes" | "reject", ids: string[]): Outcome {
  const count = ids.length === 1 ? "1 request" : `${ids.length} requests`;
  return decision === "changes"
    ? { tone: "warning", text: `Changes requested — ${count} sent back to the agent with your note.` }
    : { tone: "info", text: `${count} rejected. The record and its audit trail are retained.` };
}

/** What the queue says when a decision is refused: the backend names the rule (outside your Woreda, own request, already decided). */
export function describeDecisionError(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 401) return "Your session has ended. Sign in again.";
    if (err.status === 403) return err.message || "You are not allowed to decide this request.";
    return err.message;
  }
  return err instanceof Error ? err.message : "The decision could not be saved.";
}
