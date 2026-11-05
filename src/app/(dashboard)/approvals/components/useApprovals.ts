import { useEffect, useMemo, useState } from "react";
import type { DropdownOption } from "@/components/ui/Dropdown";
import { APPROVAL_TABS, type ApprovalTab } from "@/features/agents";
import { areaNameMap, loadScopeAreas } from "@/features/assignments";
import { decideChangeRequest, describeProfileError, fetchAgent, listChangeRequests, type ChangeRequest } from "@/features/profile";
import { useAuthStore } from "@/store/useAuthStore";
import { approvalResult, DECISION_API, describeDecisionError, isOpen, MIN_NOTE, outcomeFor, toApprovalRequest, type ApprovalResult, type Decision, type Outcome } from "./approvals";

// Queue, selection and review-dialog state for the approvals workspace.
// The queue is GET /profile/change-requests?status=Pending (the backend scopes it to the user's Woreda / Region);
// a decision is POST /profile/change-requests/{id}/decide, after which the row shows its new status until reload.
export function useApprovals() {
  const role = useAuthStore((s) => s.role);
  /** The backend lets only a Supervisor of the DA's Woreda or an Admin decide; an Executive reads only. */
  const canDecide = role === "Supervisor" || role === "Admin";

  const [rows, setRows] = useState<ChangeRequest[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [areaNames, setAreaNames] = useState<Record<string, string>>({});
  const [agentNames, setAgentNames] = useState<Record<string, string>>({});

  const [tab, setTab] = useState<ApprovalTab>("all");
  const [woreda, setWoreda] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [checked, setChecked] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  /** Ids awaiting a reject / request-changes decision in the review dialog. */
  const [reviewIds, setReviewIds] = useState<string[] | null>(null);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState(false);
  /** What the last approval reached — drives the result dialog. */
  const [approved, setApproved] = useState<ApprovalResult | null>(null);
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [deciding, setDeciding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listChangeRequests({ status: "Pending", limit: 200 })
      .then((r) => {
        if (cancelled) return;
        setRows(r.items);
        setLoadError(null);
      })
      .catch((err: unknown) => !cancelled && setLoadError(describeProfileError(err)));
    loadScopeAreas()
      .then((areas) => !cancelled && setAreaNames(areaNameMap(areas)))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  const requests = useMemo(() => (rows ?? []).map((r) => toApprovalRequest(r, areaNames, agentNames)), [rows, areaNames, agentNames]);

  const kinds = APPROVAL_TABS.find((t) => t.key === tab)?.kinds ?? null;
  const list = requests.filter((r) => (!kinds || kinds.includes(r.kind)) && (!woreda || r.woredaCode === woreda));
  const selected = requests.find((r) => r.id === selectedId) ?? list[0] ?? null;

  // The DA's name for the selected request comes from the registry (GET /agents/{da_id}), once per DA.
  const selectedDaId = selected?.daId;
  const knownName = selectedDaId ? agentNames[selectedDaId] : undefined;
  useEffect(() => {
    if (!selectedDaId || knownName !== undefined) return;
    let cancelled = false;
    fetchAgent(selectedDaId)
      .then((a) => !cancelled && setAgentNames((n) => ({ ...n, [selectedDaId]: String(a.full_name ?? selectedDaId) })))
      .catch(() => !cancelled && setAgentNames((n) => ({ ...n, [selectedDaId]: selectedDaId })));
    return () => {
      cancelled = true;
    };
  }, [selectedDaId, knownName]);

  const woredas: DropdownOption[] = [...new Set(requests.map((r) => r.woredaCode).filter((c): c is string => !!c))].map((code) => ({ value: code, label: areaNames[code] ? `${areaNames[code]} (${code})` : code }));

  const checkable = list.filter(isOpen);
  const checkedInView = checkable.filter((r) => checked.has(r.id));
  const allChecked = checkable.length > 0 && checkedInView.length === checkable.length;

  const toggle = (id: string) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setChecked((prev) => {
      const next = new Set(prev);
      checkable.forEach((r) => (allChecked ? next.delete(r.id) : next.add(r.id)));
      return next;
    });

  const setNote = (id: string, value: string) => setNotes((prev) => ({ ...prev, [id]: value }));

  const decide = async (ids: string[], decision: Decision, note: string) => {
    if (!canDecide || deciding) return;
    setDeciding(true);
    setError(null);
    const results = await Promise.allSettled(ids.map((id) => decideChangeRequest(id, DECISION_API[decision], note)));
    const updated = results.flatMap((r) => (r.status === "fulfilled" ? [r.value] : []));
    const failures = results.flatMap((r, i) => (r.status === "rejected" ? [`${ids[i]}: ${describeDecisionError(r.reason)}`] : []));
    setRows((prev) => (prev ?? []).map((r) => updated.find((u) => u.name === r.name) ?? r));
    setChecked((prev) => new Set([...prev].filter((id) => !updated.some((u) => u.name === id))));
    setDeciding(false);
    if (failures.length) setError(failures.join(" · "));
    if (!updated.length) return;
    if (decision === "approve") {
      setApproved(approvalResult(updated));
      return;
    }
    setOutcome(outcomeFor(decision, updated.map((u) => u.name)));
  };

  const openReview = (ids: string[], prefill = "") => {
    setReviewIds(ids);
    setReason(prefill);
    setReasonError(false);
  };

  const closeReview = () => setReviewIds(null);

  const changeReason = (value: string) => {
    setReason(value);
    setReasonError(false);
  };

  const submitReview = (decision: "changes" | "reject") => {
    if (!reviewIds) return;
    if (reason.trim().length < MIN_NOTE) {
      setReasonError(true);
      return;
    }
    void decide(reviewIds, decision, reason.trim());
    setReviewIds(null);
  };

  return {
    loading: rows === null && !loadError,
    loadError,
    reload: () => setAttempt((n) => n + 1),
    canDecide,
    deciding,
    error,
    dismissError: () => setError(null),
    tab,
    setTab,
    woreda,
    setWoreda,
    woredas,
    list,
    selected,
    setSelectedId,
    checked,
    checkable,
    checkedInView,
    allChecked,
    toggle,
    toggleAll,
    notes,
    setNote,
    decide,
    reviewIds,
    reason,
    reasonError,
    changeReason,
    openReview,
    closeReview,
    submitReview,
    approved,
    closeApproved: () => setApproved(null),
    outcome,
    dismissOutcome: () => setOutcome(null),
  };
}
