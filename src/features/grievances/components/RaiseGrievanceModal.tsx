"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Banner } from "@/components/ui/Banner";
import { FARMERS, registryCode } from "@/features/farmers";
import { cn } from "@/lib/utils";
import { fetchGrievanceOptions, newClientOpId, submitGrievance, type GrievanceOptions, type SubmitGrievanceResult } from "../api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-selects "for a farmer" with this farmer (when launched from a farmer profile). */
  farmerId?: string;
  /** Called after the Grievance Service accepted (or queued) the grievance, e.g. to reload a list. */
  onSubmitted?: (result: SubmitGrievanceResult) => void;
}

type Result = { kind: "draft" } | { kind: "sent"; result: SubmitGrievanceResult };

// FR-12 / FR-12a: native raise form → POST /grievances → external case ID. When the Grievance Service is down
// DA Services queues the grievance and returns no ticket yet; it is forwarded once the service is back.
export function RaiseGrievanceModal({ isOpen, onClose, farmerId, onSubmitted }: Props) {
  const [forWhom, setForWhom] = useState<"farmer" | "me">(farmerId ? "farmer" : "me");
  const [farmer, setFarmer] = useState(farmerId ?? FARMERS[0].id);
  const [options, setOptions] = useState<GrievanceOptions | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [category, setCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [clientOpId, setClientOpId] = useState(newClientOpId);

  // Dropdown values come from the Grievance Service; the first category is preselected once they arrive.
  useEffect(() => {
    if (!isOpen) return;
    let current = true;
    fetchGrievanceOptions()
      .then((o) => {
        if (!current) return;
        setOptions(o);
        setCategory((c) => c || o.categories[0]?.value || "");
      })
      .catch((err: unknown) => current && setOptionsError(err instanceof Error ? err.message : "Could not load the grievance categories."));
    return () => {
      current = false;
    };
  }, [isOpen]);

  const subcategories = options?.categories.find((c) => c.value === category)?.subcategories ?? [];
  const priorities = options?.priorities ?? ["Low", "Medium", "High", "Critical"];
  const selectedFarmer = FARMERS.find((f) => f.id === farmer);

  const reset = () => {
    setSubject("");
    setDescription("");
    setSubcategory("");
    setError(null);
    setResult(null);
    setClientOpId(newClientOpId());
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const sent = await submitGrievance({
        subject: subject.trim(),
        description: description.trim(),
        category,
        ...(subcategory && { subcategory }),
        priority,
        raised_for: forWhom === "farmer" ? "Farmer" : "Self",
        // A sample farmer's mock registry code stands in for the id; a farmer from the API arrives with it already.
        ...(forWhom === "farmer" && { farmer_id: selectedFarmer ? registryCode(selectedFarmer) : farmer }),
        client_op_id: clientOpId,
      });
      setResult({ kind: "sent", result: sent });
      onSubmitted?.(sent);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit the grievance. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const close = () => {
    reset();
    onClose();
  };

  const canSubmit = subject.trim().length >= 3 && description.trim().length >= 10 && !!category && !submitting;
  const queued = result?.kind === "sent" && !result.result.ticket_id;

  return (
    <Modal isOpen={isOpen} onClose={close} title="Raise a Grievance" subtitle="Submitted to the external OAN Grievance Service — triage, response and closure happen there." size="lg"
      footer={result ? <Button variant="brand" onClick={close}>Done</Button> : (
        <>
          <Button variant="outline" onClick={close} disabled={submitting}>Cancel</Button>
          <Button variant="brandOutline" onClick={() => setResult({ kind: "draft" })} disabled={submitting}>Save draft</Button>
          <Button variant="brand" disabled={!canSubmit} onClick={submit}>{submitting ? "Submitting…" : "Submit"}</Button>
        </>
      )}
    >
      {result ? (
        <div className="flex flex-col gap-3">
          {result.kind === "draft" ? (
            <Banner tone="info" title="Draft kept on this device">Open Raise grievance again to finish and submit it.</Banner>
          ) : queued ? (
            <Banner tone="warning" title="Queued for the Grievance Service">
              {result.result.message ?? "The Grievance Service is temporarily unavailable."} It is forwarded automatically; the external case ID is assigned then.
            </Banner>
          ) : (
            <Banner tone="success" title="Submitted to the Grievance Service">
              External case ID {result.result.ticket_id}. Status is sourced from the Grievance Service; the submitter is notified by SMS on every change.
            </Banner>
          )}
          {result.kind === "sent" && (
            <p className="text-[13px] text-ink-soft">
              Reference: <span className="font-mono font-medium text-ink">{result.result.ticket_id ?? result.result.queue_ref ?? "queued"}</span>
            </p>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {error && <Banner tone="error" title="Grievance not submitted">{error}</Banner>}
          {optionsError && <Banner tone="warning" title="Categories unavailable">{optionsError}</Banner>}
          <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-100 p-1">
            {(["farmer", "me"] as const).map((k) => (
              <button key={k} type="button" onClick={() => setForWhom(k)} className={cn("h-9 rounded-md text-[13.5px] font-semibold transition-colors", forWhom === k ? "bg-white text-brand-green shadow-sm" : "text-ink-soft")}>
                {k === "farmer" ? "On behalf of a farmer" : "For myself"}
              </button>
            ))}
          </div>
          {forWhom === "farmer" && (
            <FormField label="Farmer" htmlFor="grv-farmer" required>
              <Select id="grv-farmer" value={farmer} onChange={(e) => setFarmer(e.target.value)}>{FARMERS.map((f) => <option key={f.id} value={f.id}>{f.name} — {f.kebele}</option>)}</Select>
            </FormField>
          )}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Category" htmlFor="grv-cat" required>
              <Select id="grv-cat" value={category} disabled={!options} onChange={(e) => { setCategory(e.target.value); setSubcategory(""); }}>
                {!options && <option value="">Loading…</option>}
                {options?.categories.map((c) => <option key={c.value}>{c.value}</option>)}
              </Select>
            </FormField>
            <FormField label="Sub-category" htmlFor="grv-subcat">
              <Select id="grv-subcat" value={subcategory} disabled={subcategories.length === 0} onChange={(e) => setSubcategory(e.target.value)}>
                <option value="">—</option>
                {subcategories.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </FormField>
            <FormField label="Priority" htmlFor="grv-priority" required>
              <Select id="grv-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>{priorities.map((p) => <option key={p}>{p}</option>)}</Select>
            </FormField>
          </div>
          <FormField label="Subject" htmlFor="grv-subject" required>
            <Input id="grv-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short title" />
          </FormField>
          <FormField label="Description" htmlFor="grv-desc" required>
            <Textarea id="grv-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened, where, and when" />
          </FormField>
          <div className="rounded-lg border border-line bg-surface p-3 text-[12.5px] leading-relaxed text-ink-soft">
            <p><span className="font-semibold text-ink">Shared with the Grievance Service:</span> your name and DA-ID, Woreda, the Farmer-ID when raised for a farmer, category, subject and description.</p>
            <p className="mt-1"><span className="font-semibold text-ink">Withheld from woreda-level reports:</span> Fayda ID, phone number and household data — reports carry the case ID and category only.</p>
            <p className="mt-1">If the Grievance Service is unavailable the grievance is queued and forwarded automatically.</p>
          </div>
        </div>
      )}
    </Modal>
  );
}
