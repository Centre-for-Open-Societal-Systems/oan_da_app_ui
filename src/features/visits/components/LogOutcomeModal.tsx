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
import { canAddEvidence, fetchVisit, newClientOpId, NEXT_ACTION_TYPES, submitVisitOutcome, type AdvisoryQa, type ApiVisit, type ApiVisitDetail, type NextActionType } from "../api";
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
// task is created from "Next action" when one is chosen. An Advisory visit also shows the farmer's questions from
// planning, so the advice left open then can be filled in now.
export function LogOutcomeModal({ visit, onClose, onSubmitted }: LogOutcomeModalProps) {
  const [values, setValues] = useState<Values>({ purpose: visit.purpose, farmerResponse: "", observed: "", advice: "", inputs: "", nextType: "None", nextNote: "", nextDate: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientOpId] = useState(newClientOpId);
  const [attachments, setAttachments] = useState<ApiVisitDetail["attachments"]>();
  /** The visit's questions with the answers as typed here; empty for other visit types (and until the visit is read). */
  const [advisory, setAdvisory] = useState<AdvisoryQa[]>([]);

  // Evidence already on the visit and an Advisory visit's questions; the outcome can be submitted without either.
  useEffect(() => {
    if (!canAddEvidence(visit)) return;
    let live = true;
    fetchVisit(visit.id)
      .then((detail) => {
        if (!live) return;
        setAttachments(detail.attachments);
        setAdvisory(detail.advisory_qa ?? []);
      })
      .catch(() => {});
    return () => {
      live = false;
    };
  }, [visit]);

  const setAnswer = (index: number, answer: string) => setAdvisory((list) => list.map((qa, i) => (i === index ? { ...qa, answer } : qa)));

  const set = (key: keyof Values) => (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setValues((v) => ({ ...v, [key]: e.target.value }));
  const hasNext = values.nextType !== "None";

  const submit = async () => {
    if (!values.observed.trim()) {
      setError("Describe what was observed; it becomes the visit's outcome.");
      return;
    }
    setSaving(true);
    setError(null);
    const text = (s: string) => s.trim() || undefined;
    try {
      const closed = await submitVisitOutcome(visit.id, {
        purpose: text(values.purpose),
        farmer_response: text(values.farmerResponse),
        observed: values.observed.trim(),
        advice_given: text(values.advice),
        inputs_actions: text(values.inputs),
        next_action: hasNext ? { type: values.nextType, note: text(values.nextNote), date: values.nextDate || undefined } : { type: "None" },
        // The backend replaces the stored list with this one, so every question goes back, answered or not.
        advisory_qa: advisory.length > 0 ? advisory.map((qa) => ({ question: qa.question, answer: qa.answer.trim() })) : undefined,
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
          <FormField label="Visit purpose" htmlFor="lo-purpose">
            <Input id="lo-purpose" value={values.purpose} onChange={set("purpose")} className="h-10" />
          </FormField>
          <FormField label="Farmer response" htmlFor="lo-response">
            <Input id="lo-response" value={values.farmerResponse} onChange={set("farmerResponse")} placeholder="e.g. Agreed to apply urea this week" className="h-10" />
          </FormField>
        </div>

        <FormField label="What was observed" htmlFor="lo-observed" required hint="Required. This becomes the visit's outcome.">
          <Textarea id="lo-observed" rows={2} value={values.observed} onChange={set("observed")} placeholder="Crop stage, pests, plot condition…" />
        </FormField>

        <FormField label="Advice given" htmlFor="lo-advice">
          <Textarea id="lo-advice" rows={2} value={values.advice} onChange={set("advice")} />
        </FormField>

        {advisory.length > 0 && (
          <div className="flex flex-col gap-3">
            <p className="text-[14px] font-medium text-ink">Questions &amp; answers</p>
            {advisory.map((qa, i) => (
              <div key={i} className="flex flex-col gap-2 rounded-xl border border-line bg-surface-alt p-3.5">
                <p className="flex items-start gap-2 text-[14px] font-medium text-ink">
                  <span className="mt-0.5 shrink-0 rounded-full bg-brand-mint px-2.5 py-0.5 text-[12px] font-semibold text-brand-green">Q{i + 1}</span>
                  <span className="min-w-0">{qa.question}</span>
                </p>
                <FormField label="Answer / advice" htmlFor={`lo-qa-${i}`}>
                  <Textarea id={`lo-qa-${i}`} rows={2} className="bg-white" value={qa.answer} onChange={(e) => setAnswer(i, e.target.value)} placeholder="Advice given to the farmer" />
                </FormField>
              </div>
            ))}
          </div>
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
