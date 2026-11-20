import { useEffect, useState } from "react";
import type { Farmer } from "../types";
import { useAuthStore } from "@/store/useAuthStore";
import { listAgents, type ApiAgent } from "@/features/agents";
import type { BatchVisitItem } from "../visitsApi";
import type { VisitItemDetails } from "./VisitItemFields";
import { apiFarmerToFarmer, describeFarmerError, listFarmers } from "../farmersApi";
import {
  ADVISORY_VISIT,
  durationMinutes,
  formatWhen,
  joinNames,
  matchFarmers,
  mergeBatchRows,
  type BatchRow,
  MAX_BATCH_FARMERS,
  planFarmers,
  readVisitDetails,
  readWhen,
  registryCode,
  splitPriority,
  PRIORITY_BY_LEVEL,
  toggleFarmer,
  VISIT_TYPES,
  type AdvisoryQa,
  type PlanVisitResult,
  type VisitPreset,
} from "./planVisit";

type Owner = { user: string; daId?: string };

// randomUUID needs a secure context (https or localhost); a plain-http deployment falls back to time + random.
const newOpId = () => (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

// Farmer search / selection (up to MAX_BATCH_FARMERS farmers), visit type and outcome state for the plan-visit form.
export function usePlanVisit(initial: Farmer[], preset: VisitPreset | undefined) {
  const [selected, setSelected] = useState<Farmer[]>(() => initial.slice(0, MAX_BATCH_FARMERS));
  // The form does not ask for a priority: a Priority-list preset sends its level and reason, others the default (Medium).
  const presetPriority = preset ? PRIORITY_BY_LEVEL[preset.level] : "";
  const [visitType, setVisitType] = useState(preset && VISIT_TYPES.includes(preset.visitType) ? preset.visitType : VISIT_TYPES[0]);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<PlanVisitResult | null>(null);
  const [advisoryQa, setAdvisoryQa] = useState<AdvisoryQa[]>([{ id: 1, question: "", answer: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Every farmer's outcome of a batch plan, kept across retries; "batch" shows it in place of the form.
  const [batch, setBatch] = useState<BatchRow[] | null>(null);
  const [view, setView] = useState<"form" | "batch">("form");
  // Farmers in a batch with details of their own (by farmer id); the others use the common form.
  const [overrides, setOverrides] = useState<Record<string, VisitItemDetails>>({});
  const setOverride = (farmer: Farmer, details: VisitItemDetails | null) =>
    setOverrides((prev) => {
      const next = { ...prev };
      if (details) next[farmer.id] = details;
      else delete next[farmer.id];
      return next;
    });
  /** The common form's current values, the starting point of a farmer's own details. */
  const commonDetails = (): VisitItemDetails => {
    const d = readVisitDetails();
    return { visit_type: visitType, priority: splitPriority(presetPriority).level, date: d.date, time: d.time, duration_min: durationMinutes(d.duration), purpose: d.purpose };
  };
  // Whose plan the batch went to, reused when a failed farmer is resubmitted from the result.
  const [owner, setOwner] = useState<Owner | null>(null);
  // One id per open form, suffixed per farmer: a retry after a timeout returns the visits already created instead of duplicates.
  const [clientOpId] = useState(newOpId);

  // The caller's farmers from GET /farmers: for a DA, the farmers assigned to them.
  const [apiFarmers, setApiFarmers] = useState<Farmer[] | null>(null);
  const [farmersError, setFarmersError] = useState<string | null>(null);
  useEffect(() => {
    let current = true;
    listFarmers({ pageSize: 500 })
      .then(({ items }) => current && setApiFarmers(items.map(apiFarmerToFarmer)))
      .catch((err: unknown) => current && setFarmersError(describeFarmerError(err)));
    return () => {
      current = false;
    };
  }, []);

  const term = query.trim().toLowerCase();
  const matches = matchFarmers(term, apiFarmers ?? []);
  const emptyText = farmersError ?? (apiFarmers ? "No farmer assigned" : "Loading farmers…");
  const isFull = selected.length >= MAX_BATCH_FARMERS;

  const toggle = (farmer: Farmer) => setSelected((prev) => toggleFarmer(prev, farmer));
  const remove = (farmer: Farmer) => setSelected((prev) => prev.filter((f) => f.id !== farmer.id));

  // Search button / Enter: show the results list; a single hit is added straight away.
  const runSearch = () => {
    setSearched(true);
    if (term && matches.length === 1 && !selected.some((f) => f.id === matches[0].id)) toggle(matches[0]);
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    setSearched(false);
  };

  // A DA plans for themself (their Frappe User); an officer picks the DA whose plan the visit goes to.
  const user = useAuthStore((s) => s.user?.id);
  const isOfficer = useAuthStore((s) => s.role) !== "DA";
  const [assignee, setAssignee] = useState<ApiAgent | null>(null);
  const [agents, setAgents] = useState<ApiAgent[] | null>(null);
  const [agentsError, setAgentsError] = useState<string | null>(null);
  useEffect(() => {
    if (!isOfficer) return;
    let current = true;
    listAgents({ limit: 500 })
      .then(({ agents: list }) => current && setAgents(list.filter((a) => a.active_status !== "Separated")))
      .catch((err: unknown) => current && setAgentsError(err instanceof Error ? err.message : "Could not load the development agents."));
    return () => {
      current = false;
    };
  }, [isOfficer]);

  // Sends these farmers' own bodies (one batch call, or a single one for one farmer) and folds the outcome into the
  // batch result. An Advisory visit's questions go with it to the backend, which the farmer's Advisory tab reads.
  const send = async (rows: { farmer: Farmer; request: BatchVisitItem }[], by: Owner) => {
    const byId = new Map(rows.map((r) => [r.farmer.id, r.request]));
    const bodyOf = (f: Farmer) => byId.get(f.id)!;
    setSubmitting(true);
    const { planned, failed } = await planFarmers(
      rows.map((r) => r.farmer),
      by,
      bodyOf,
    );
    setSubmitting(false);
    setBatch((prev) =>
      mergeBatchRows(
        prev ?? [],
        planned.map((p) => ({ farmer: p.farmer, visitId: p.visit.name, when: formatWhen(bodyOf(p.farmer).date, bodyOf(p.farmer).time) })),
        failed.map((f) => ({ farmer: f.farmer, reason: f.reason, request: bodyOf(f.farmer) })),
      ),
    );
    setSelected(failed.map((f) => f.farmer));
    setView("batch");
  };

  // Save as draft stays on this device; Plan / Schedule goes to POST /visits once per farmer and only succeeds once the
  // backend has every visit. Farmers whose visit failed stay selected so Plan can be pressed again.
  const finish = async (kind: PlanVisitResult["kind"]) => {
    if (submitting) return;
    const when = readWhen();
    // Advisory Q&A is sent with the visit; rows without a question are dropped.
    const items = advisoryQa.filter((qa) => qa.question.trim()).map((qa) => ({ question: qa.question.trim(), answer: qa.answer.trim() }));
    const isAdvisory = visitType === ADVISORY_VISIT && items.length > 0;

    let farmers = selected;
    let visitIds: string[] = [];
    if (kind === "planned") {
      if (selected.length === 0) {
        setError("Select a farmer first.");
        return;
      }
      // The visit's `user` must be the owning DA's Frappe User: their login email for an officer's pick.
      let owner: Owner;
      if (isOfficer) {
        if (!assignee) {
          setError("Select the development agent this visit is for.");
          return;
        }
        if (!assignee.email) {
          setError(`${assignee.full_name || assignee.da_id} has no email in the DA registry, so the visit cannot be assigned to them.`);
          return;
        }
        owner = { user: assignee.email, daId: assignee.da_id };
      } else if (user) {
        owner = { user };
      } else {
        setError("Your account could not be read. Sign in again and retry.");
        return;
      }
      const details = readVisitDetails();
      const priority = splitPriority(presetPriority);
      const requests = selected.map((f) => {
        const code = registryCode(f);
        // A farmer's own details (set with "Edit details" on their card) win over the common form below.
        const own = selected.length > 1 ? overrides[f.id] : undefined;
        const request: BatchVisitItem = {
          // A farmer from the farmers API sends its registry id; a sample farmer its mock registry code.
          farmer_id: code,
          farmer_name: f.name.trim(),
          date: details.date,
          time: details.time,
          visit_type: visitType,
          purpose: details.purpose,
          duration_min: durationMinutes(details.duration),
          priority: priority.level,
          priority_reason: preset?.reason ?? priority.reason,
          // The success message promises the farmer an SMS.
          notify_farmer_sms: true,
          ...(isAdvisory && { advisory_qa: items }),
          client_op_id: selected.length === 1 ? clientOpId : `${clientOpId}-${code}`,
          ...own,
        };
        // The priority reason describes the common priority only.
        if (own && own.priority !== priority.level) request.priority_reason = undefined;
        // Advisory Q&A from the form goes with any farmer whose own type is Advisory.
        if (own?.visit_type === ADVISORY_VISIT && items.length > 0) request.advisory_qa = items;
        else if (own && own.visit_type !== ADVISORY_VISIT) delete request.advisory_qa;
        return { farmer: f, request };
      });
      setError(null);

      // A batch shows every farmer's outcome; a failed farmer can be edited and resubmitted from there.
      if (selected.length > 1) {
        setOwner(owner);
        await send(requests, owner);
        return;
      }

      setSubmitting(true);
      const { planned, failed } = await planFarmers(selected, owner, () => requests[0].request);
      setSubmitting(false);
      if (failed.length > 0) {
        setError(`${failed[0].farmer.name}: ${failed[0].reason} Change the details and press Plan again.`);
        return;
      }
      farmers = planned.map((p) => p.farmer);
      visitIds = planned.map((p) => p.visit.name).filter(Boolean);
    }

    setResult({ kind, farmer: farmers.length > 0 ? joinNames(farmers.map((f) => f.name)) : undefined, when, visitId: visitIds.join(", ") || undefined, count: farmers.length });
  };

  // Batch result actions: drop a failed farmer, go back to the form to change the failed farmers' details, or resend.
  // Nothing left after discarding (every farmer had failed): back to an empty form.
  const keepRows = (keep: (r: BatchRow) => boolean) => setBatch((prev) => (prev && prev.some(keep) ? prev.filter(keep) : null));
  const discard = (farmer: Farmer) => {
    keepRows((r) => r.farmer.id !== farmer.id || !r.reason);
    setSelected((prev) => prev.filter((f) => f.id !== farmer.id));
  };
  const discardFailed = () => {
    keepRows((r) => !r.reason);
    setSelected([]);
  };
  const failedRows = (only?: Farmer) =>
    (batch ?? []).filter((r) => r.reason && r.request && (!only || r.farmer.id === only.id)).map((r) => ({ farmer: r.farmer, request: r.request! }));
  /** Sends one failed farmer again with the details edited on the result. */
  const resubmit = async (farmer: Farmer, request: BatchVisitItem) => {
    if (submitting || !owner) return;
    await send([{ farmer, request }], owner);
  };
  /** Sends every failed farmer again with their own (possibly edited) details. */
  const retryFailed = async () => {
    const rows = failedRows();
    if (submitting || !owner || rows.length === 0) return;
    await send(rows, owner);
  };

  return { overrides, setOverride, commonDetails, view, batch, discard, discardFailed, resubmit, retryFailed, isOfficer, agents, agentsError, assignee, setAssignee, selected, toggle, remove, isFull, visitType, setVisitType, advisoryQa, setAdvisoryQa, query, changeQuery, searched, term, matches, emptyText, runSearch, result, finish, submitting, error };
}
