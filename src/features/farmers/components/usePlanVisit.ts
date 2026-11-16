import { useEffect, useState } from "react";
import type { Farmer } from "../types";
import { useAdvisoryStore } from "../advisoryStore";
import { useAuthStore } from "@/store/useAuthStore";
import { listAgents, type ApiAgent } from "@/features/agents";
import { apiFarmerToFarmer, describeFarmerError, listFarmers } from "../farmersApi";
import {
  ADVISORY_VISIT,
  durationMinutes,
  joinNames,
  matchFarmers,
  MAX_BATCH_FARMERS,
  planFarmers,
  readVisitDetails,
  readWhen,
  registryCode,
  splitPriority,
  toggleFarmer,
  VISIT_TYPES,
  type AdvisoryQa,
  type PlanVisitResult,
  type VisitPreset,
} from "./planVisit";

// randomUUID needs a secure context (https or localhost); a plain-http deployment falls back to time + random.
const newOpId = () => (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

// Farmer search / selection (up to MAX_BATCH_FARMERS farmers), visit type and outcome state for the plan-visit form.
export function usePlanVisit(initial: Farmer[], preset: VisitPreset | undefined) {
  const [selected, setSelected] = useState<Farmer[]>(() => initial.slice(0, MAX_BATCH_FARMERS));
  const [visitType, setVisitType] = useState(preset && VISIT_TYPES.includes(preset.visitType) ? preset.visitType : VISIT_TYPES[0]);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<PlanVisitResult | null>(null);
  const [advisoryQa, setAdvisoryQa] = useState<AdvisoryQa[]>([{ id: 1, question: "", answer: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  const addAdvisory = useAdvisoryStore((s) => s.add);
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

  // Save as draft stays on this device; Plan / Schedule goes to POST /visits once per farmer and only succeeds once the
  // backend has every visit. Farmers whose visit failed stay selected so Plan can be pressed again.
  const finish = async (kind: PlanVisitResult["kind"]) => {
    if (submitting) return;
    const when = readWhen();
    // Advisory Q&A goes to each farmer's Advisory tab; rows without a question are dropped.
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
      let owner: { user: string; daId?: string };
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
      const priority = splitPriority(details.priority);
      setSubmitting(true);
      setError(null);
      // One farmer: single-visit body; 2-5 farmers: one batch body on the same POST /visits.
      const { planned, failed } = await planFarmers(selected, owner, (f) => {
        const code = registryCode(f);
        return {
          // A farmer from the farmers API sends its registry id; a sample farmer its mock registry code.
          farmer_id: code,
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
        };
      });
      setSubmitting(false);
      if (failed.length > 0) {
        if (isAdvisory) planned.forEach(({ farmer }) => addAdvisory({ farmerId: farmer.id, when, status: "Planned", items }));
        setSelected(failed.map((f) => f.farmer));
        const done = planned.length > 0 ? `Planned for ${joinNames(planned.map((p) => p.farmer.name))}. ` : "";
        const reasons = failed.map((f) => `${f.farmer.name}: ${f.reason}`).join(" · ");
        setError(`${done}Not planned — ${reasons}. Press Plan again to retry the farmers still selected.`);
        return;
      }
      farmers = planned.map((p) => p.farmer);
      visitIds = planned.map((p) => p.visit.name).filter(Boolean);
    }

    if (isAdvisory) {
      farmers.forEach((f) => addAdvisory({ farmerId: f.id, when, status: kind === "draft" ? "Draft" : "Planned", items }));
    }
    setResult({ kind, farmer: farmers.length > 0 ? joinNames(farmers.map((f) => f.name)) : undefined, when, visitId: visitIds.join(", ") || undefined, count: farmers.length });
  };

  return { isOfficer, agents, agentsError, assignee, setAssignee, selected, toggle, remove, isFull, visitType, setVisitType, advisoryQa, setAdvisoryQa, query, changeQuery, searched, term, matches, emptyText, runSearch, result, finish, submitting, error };
}
