import { useEffect, useState } from "react";
import type { Farmer } from "../types";
import { useAdvisoryStore } from "../advisoryStore";
import { planVisit } from "../visitsApi";
import { apiFarmerToFarmer, listFarmers } from "../farmersApi";
import { ADVISORY_VISIT, durationMinutes, matchFarmers, readVisitDetails, readWhen, registryCode, splitPriority, VISIT_TYPES, type AdvisoryQa, type PlanVisitResult, type VisitPreset } from "./planVisit";

// randomUUID needs a secure context (https or localhost); a plain-http deployment falls back to time + random.
const newOpId = () => (typeof crypto.randomUUID === "function" ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);

// Farmer search / selection, visit type and outcome state for the plan-visit form.
export function usePlanVisit(farmer: Farmer | undefined, preset: VisitPreset | undefined) {
  const [selected, setSelected] = useState<Farmer | undefined>(farmer);
  const [visitType, setVisitType] = useState(preset && VISIT_TYPES.includes(preset.visitType) ? preset.visitType : VISIT_TYPES[0]);
  const [query, setQuery] = useState("");
  const [searched, setSearched] = useState(false);
  const [result, setResult] = useState<PlanVisitResult | null>(null);
  const [advisoryQa, setAdvisoryQa] = useState<AdvisoryQa[]>([{ id: 1, question: "", answer: "" }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One id per open form: a retry after a timeout returns the visit already created instead of a duplicate.
  const [clientOpId] = useState(newOpId);

  // The caller's farmers from GET /farmers; the sample list stays the choice when the API cannot be reached.
  const [apiFarmers, setApiFarmers] = useState<Farmer[] | null>(null);
  useEffect(() => {
    let current = true;
    listFarmers({ pageSize: 500 })
      .then(({ items }) => current && setApiFarmers(items.map(apiFarmerToFarmer)))
      .catch(() => {
        // Keep the sample farmers.
      });
    return () => {
      current = false;
    };
  }, []);

  const term = query.trim().toLowerCase();
  const matches = matchFarmers(term, apiFarmers ?? undefined);

  // Search button / Enter: show the results list (even if a farmer was already picked); a single hit is picked straight away.
  const runSearch = () => {
    setSearched(true);
    if (term && matches.length === 1) setSelected(matches[0]);
    else setSelected(undefined);
  };

  const changeQuery = (value: string) => {
    setQuery(value);
    setSearched(false);
  };

  const addAdvisory = useAdvisoryStore((s) => s.add);

  // Save as draft stays on this device; Plan / Schedule goes to POST /visits and only succeeds once the backend has the visit.
  const finish = async (kind: PlanVisitResult["kind"]) => {
    if (submitting) return;
    const when = readWhen();
    // Advisory Q&A goes to the farmer's Advisory tab; rows without a question are dropped.
    const items = advisoryQa.filter((qa) => qa.question.trim()).map((qa) => ({ question: qa.question.trim(), answer: qa.answer.trim() }));
    const isAdvisory = visitType === ADVISORY_VISIT && items.length > 0;

    let visitId: string | undefined;
    if (kind === "planned") {
      if (!selected) {
        setError("Select a farmer first.");
        return;
      }
      const details = readVisitDetails();
      const priority = splitPriority(details.priority);
      setSubmitting(true);
      setError(null);
      try {
        const visit = await planVisit({
          // A farmer from the farmers API sends its registry id; a sample farmer its mock registry code.
          farmer_id: registryCode(selected),
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
          client_op_id: clientOpId,
        });
        visitId = visit.name;
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not plan the visit. Please try again.");
        setSubmitting(false);
        return;
      }
      setSubmitting(false);
    }

    if (isAdvisory && selected) {
      addAdvisory({ farmerId: selected.id, when, status: kind === "draft" ? "Draft" : "Planned", items });
    }
    setResult({ kind, farmer: selected?.name, when, visitId });
  };

  return { selected, setSelected, visitType, setVisitType, advisoryQa, setAdvisoryQa, query, changeQuery, searched, term, matches, runSearch, result, finish, submitting, error };
}
