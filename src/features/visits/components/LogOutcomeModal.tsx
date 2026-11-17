"use client";

import { todayIso } from "@/lib/utils";
import { useEffect, useState, type ChangeEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { AdvisoryQaFields } from "@/features/farmers";
import { ADVISORY_VISIT_TYPE, canAddEvidence, fetchVisit, newClientOpId, NEXT_ACTION_TYPES, submitVisitOutcome, type AdvisoryQa, type ApiVisit, type ApiVisitDetail, type NextActionType } from "../api";
import type { VisitRecord } from "../types";
import { VisitEvidence } from "./VisitEvidence";

interface LogOutcomeModalProps {
  visit: VisitRecord;
  onClose: () => void;
  /** The visit after the backend closed it (physical_status "Physical Visit Complete"). */
  onSubmitted: (visit: ApiVisit) => void;
}

type Values = { purpose: string; farmerResponse: string; observed: string; advice: string; inputs: string; nextType: NextActionType; nextNote: string; nextDate: string };

// Log what happened at the farm (POST /visits/{id}/submit). Submitting closes the visit; a follow-up visit or
// task is created from "Next action" when one is chosen. The visit type planned is shown (read-only: /submit does not
// change it); an Advisory visit also takes the farmer's questions and answers here, starting from any saved at planning.
const toRows = (list: AdvisoryQa[]) => (list.length > 0 ? list : [{ question: "", answer: "" }]).map((qa, i) => ({ id: i + 1, question: qa.question, answer: qa.answer ?? "" }));

export function LogOutcomeModal({ visit, onClose, onSubmitted }: LogOutcomeModalProps) {
  // A list row shows the visit type in place of an empty purpose; that stand-in is not the purpose, so it starts empty.
  const [values, setValues] = useState<Values>({ purpose: visit.purpose === visit.visitType ? "" : visit.purpose, farmerResponse:"", observed: "", advice: "", inputs: "", nextType: "None", nextNote: "", nextDate: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientOpId] = useState(newClientOpId);
  const [attachments, setAttachments] = useState<ApiVisitDetail["attachments"]>();
  /** The planned visit type: from the list row, then from GET /visits/{id}. */
  const [visitType, setVisitType] = useState(visit.visitType ?? "");
  const isAdvisory = visitType === ADVISORY_VISIT_TYPE;
  /** An Advisory visit's questions and answers as edited here (one empty row to start when none was saved). */
  const [advisory, setAdvisory] = useState(() => toRows([]));

  // Evidence already on the visit and an Advisory visit's questions; the outcome can be submitted without either.
  useEffect(() => {
    if (!canAddEvidence(visit)) return;
    let live = true;
    fetchVisit(visit.id)
      .then((detail) => {
        if (!live) return;
        setAttachments(detail.attachments);
        if (detail.visit_type) setVisitType(detail.visit_type);
        // The purpose saved at planning, unless the DA has already started editing it.
        setValues((v) => (v.purpose.trim() ? v : { ...v, purpose: detail.purpose ?? "" }));
        if (detail.advisory_qa?.length) setAdvisory(toRows(detail.advisory_qa));
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [visit]);

  const set = (key: keyof Values) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const hasNext = values.nextType !== "None";

  const submit = async () => {
    // An Advisory visit records its questions and answers instead of an observation and advice.
    if (!isAdvisory && !values.observed.trim()) {
      setError("Describe what was observed; it becomes the visit's outcome.");
      return;
    }
    const questions = advisory.filter((qa) => qa.question.trim()).map((qa) => ({ question: qa.question.trim(), answer: qa.answer.trim() }));
    if (isAdvisory && questions.length === 0) {
      setError("Add at least one question the farmer asked on this Advisory visit.");
      return;
    }
    setSaving(true);
    setError(null);
    const text = (s: string) => s.trim() || undefined;
    try {
      const closed = await submitVisitOutcome(visit.id, {
        purpose: text(values.purpose),
        farmer_response: text(values.farmerResponse),
        observed: isAdvisory ? undefined : values.observed.trim(),
        advice_given: isAdvisory ? undefined : text(values.advice),
        inputs_actions: text(values.inputs),
        next_action: hasNext ? { type: values.nextType, note: text(values.nextNote), date: values.nextDate || undefined } : { type: "None" },
        // The backend replaces the stored list with this one, so every question goes back, answered or not.
        advisory_qa: isAdvisory ? questions : undefined,
        client_op_id: clientOpId,
      });
      onSubmitted(closed);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the outcome. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Log Visit Outcome"
      subtitle={`${visit.farmerName} · ${visit.id}`}
      size="lg"
      bodyClassName="px-4 py-4 sm:px-6"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving} className="sm:mr-auto">
            Cancel
          </Button>
          <Button variant="brand" onClick={submit} disabled={saving}>
            {saving ? "Submitting…" : "Submit outcome"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Banner tone="error" title="Outcome not submitted">{error}</Banner>}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <FormField label="Visit type" htmlFor="lo-type" hint="As planned.">
            <Input id="lo-type" value={visitType || "—"} readOnly className="h-10 border-transparent bg-slate-100 text-ink" />
          </FormField>
          <FormField label="Farmer response" htmlFor="lo-response">
            <Input id="lo-response" value={values.farmerResponse} onChange={set("farmerResponse")} placeholder="e.g. Agreed to apply urea this week" className="h-10" />
          </FormField>
        </div>

        <FormField label="Visit purpose" htmlFor="lo-purpose" hint="Saved at planning; change it if the visit's purpose changed.">
          <Textarea id="lo-purpose" rows={2} value={values.purpose} onChange={set("purpose")} placeholder="What the visit was for" />
        </FormField>

        {isAdvisory ? (
          <AdvisoryQaFields items={advisory} onChange={setAdvisory} />
        ) : (
          <>
            <FormField label="What was observed" htmlFor="lo-observed" required hint="Required. This becomes the visit's outcome.">
              <Textarea id="lo-observed" rows={2} value={values.observed} onChange={set("observed")} placeholder="Crop stage, pests, plot condition…" />
            </FormField>

            <FormField label="Advice given" htmlFor="lo-advice">
              <Textarea id="lo-advice" rows={2} value={values.advice} onChange={set("advice")} />
            </FormField>
          </>
        )}

        <FormField label="Inputs / actions logged" htmlFor="lo-inputs">
          <Input id="lo-inputs" value={values.inputs} onChange={set("inputs")} placeholder="e.g. 50 kg DAP voucher redeemed" className="h-10" />
        </FormField>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <FormField label="Next action" htmlFor="lo-next-type">
            <Select id="lo-next-type" value={values.nextType} onChange={set("nextType")} className="h-10">
              {NEXT_ACTION_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </FormField>
          {hasNext && (
            <>
              <FormField label="Note" htmlFor="lo-next-note">
                <Input id="lo-next-note" value={values.nextNote} onChange={set("nextNote")} placeholder="What to follow up" className="h-10" />
              </FormField>
              <FormField label="Date" htmlFor="lo-next-date">
                <Input id="lo-next-date" type="date" min={todayIso()} value={values.nextDate} onChange={set("nextDate")} className="h-10" />
              </FormField>
            </>
          )}
        </div>

        {canAddEvidence(visit) && <VisitEvidence visitId={visit.id} existing={attachments} />}

        <p className="text-[12.5px] text-muted">Submitting closes the visit. A follow-up visit or task is added to your plan when you choose one.</p>
      </div>
    </Modal>
  );
}
