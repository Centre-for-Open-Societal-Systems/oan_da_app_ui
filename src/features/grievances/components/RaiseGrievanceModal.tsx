"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Banner } from "@/components/ui/Banner";
import { cn } from "@/lib/utils";
import {
  fetchGrievanceOptions,
  newClientOpId,
  SAMPLE_KEBELE,
  submitGrievance,
  toAdministrativeArea,
  type GrievanceOptions,
  type SubmitGrievanceResult,
} from "../api";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-selects "for a farmer" (when launched from a farmer profile). */
  farmerId?: string;
  /** Called after the Grievance Service accepted (or queued) the grievance, e.g. to reload a list. */
  onSubmitted?: (result: SubmitGrievanceResult) => void;
}

type Result = { kind: "draft" } | { kind: "sent"; result: SubmitGrievanceResult };

const SUBMITTER_TYPES_FALLBACK = ["Individual Farmer", "Cooperative", "Development Agent", "FPO", "NGO", "Woreda/Kebele Body"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];

// FR-12 / FR-12a: native raise form → POST /grievances → external case ID. When the Grievance Service is down
// DA Services queues the grievance and returns no ticket yet; it is forwarded once the service is back.
export function RaiseGrievanceModal({ isOpen, onClose, farmerId, onSubmitted }: Props) {
  const [forWhom, setForWhom] = useState<"farmer" | "me">(farmerId ? "farmer" : "me");
  const [options, setOptions] = useState<GrievanceOptions | null>(null);
  const [optionsError, setOptionsError] = useState<string | null>(null);

  // Submitter
  const [submitterType, setSubmitterType] = useState(SUBMITTER_TYPES_FALLBACK[0]);
  const [submitterName, setSubmitterName] = useState("");
  const [contactMobile, setContactMobile] = useState("");

  // Classification
  const [serviceCategory, setServiceCategory] = useState("");
  const [grievanceType, setGrievanceType] = useState("");
  const [priority, setPriority] = useState("Medium");

  // Administrative area: the DA portal has no geo lookup yet (see api.ts), so the Kebele code + name are entered.
  const [kebeleCode, setKebeleCode] = useState(SAMPLE_KEBELE.code);
  const [kebeleName, setKebeleName] = useState(SAMPLE_KEBELE.name);

  // Content
  const [subject, setSubject] = useState("");
  const [description, setDescription] = useState("");
  const [desiredOutcome, setDesiredOutcome] = useState("");
  const [consent, setConsent] = useState(true);
  const [anonymous, setAnonymous] = useState(false);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [clientOpId, setClientOpId] = useState(newClientOpId);

  // Dropdown values + top geo level, loaded once the modal opens.
  useEffect(() => {
    if (!isOpen) return;
    let current = true;
    fetchGrievanceOptions()
      .then((o) => {
        if (!current) return;
        setOptions(o);
        setServiceCategory((c) => c || o.categories[0]?.value || "");
      })
      .catch((err: unknown) => current && setOptionsError(err instanceof Error ? err.message : "Could not load the grievance categories."));
    return () => {
      current = false;
    };
  }, [isOpen]);

  const grievanceTypes = useMemo(() => {
    const sub = options?.categories.find((c) => c.value === serviceCategory)?.subcategories ?? [];
    return sub.length > 0 ? sub : options?.grievanceTypes ?? [];
  }, [options, serviceCategory]);

  const submitterTypes = options?.submitterTypes?.length ? options.submitterTypes : SUBMITTER_TYPES_FALLBACK;

  const reset = () => {
    setSubject(""); setDescription(""); setDesiredOutcome("");
    setSubmitterName(""); setContactMobile("");
    setGrievanceType(""); setKebeleCode(SAMPLE_KEBELE.code); setKebeleName(SAMPLE_KEBELE.name);
    setConsent(true); setAnonymous(false);
    setError(null); setResult(null);
    setClientOpId(newClientOpId());
  };

  const submit = async () => {
    setSubmitting(true);
    setError(null);
    try {
      const sent = await submitGrievance({
        subject: subject.trim(),
        description: description.trim(),
        priority,
        raised_for: forWhom === "farmer" ? "Farmer" : "Self",
        submitter_type: submitterType,
        submitter_name: submitterName.trim(),
        contact_mobile: contactMobile.trim(),
        administrative_area: toAdministrativeArea(kebeleCode),
        administrative_unit: kebeleName.trim(),
        service_category: serviceCategory,
        grievance_type: grievanceType,
        desired_outcome: desiredOutcome.trim(),
        consent_given: consent ? 1 : 0,
        is_anonymous: anonymous ? 1 : 0,
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

  const canSubmit =
    subject.trim().length >= 3 &&
    description.trim().length >= 10 &&
    !!serviceCategory &&
    !!grievanceType &&
    submitterName.trim().length >= 2 &&
    contactMobile.trim().length >= 6 &&
    kebeleCode.trim().length >= 3 &&
    kebeleName.trim().length >= 2 &&
    !submitting;
  const reference = result?.kind === "sent" ? result.result.ticket_number ?? result.result.ticket_id : null;
  const queued = result?.kind === "sent" && result.result.sync_state === "pending";

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
              External case ID {reference}. Status is sourced from the Grievance Service; the submitter is notified on every change.
            </Banner>
          )}
          {result.kind === "sent" && (
            <p className="text-[13px] text-ink-soft">
              Reference: <span className="font-mono font-medium text-ink">{reference ?? result.result.queue_ref ?? "queued"}</span>
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

          {/* Submitter */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Submitter type" htmlFor="grv-subtype" required>
              <Select id="grv-subtype" value={submitterType} onChange={(e) => setSubmitterType(e.target.value)}>
                {submitterTypes.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Submitter name" htmlFor="grv-subname" required>
              <Input id="grv-subname" value={submitterName} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Full name" />
            </FormField>
            <FormField label="Contact mobile" htmlFor="grv-mobile" required>
              <Input id="grv-mobile" value={contactMobile} onChange={(e) => setContactMobile(e.target.value)} placeholder="09xxxxxxxx" inputMode="tel" />
            </FormField>
          </div>

          {/* Classification */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <FormField label="Service category" htmlFor="grv-cat" required>
              <Select id="grv-cat" value={serviceCategory} disabled={!options} onChange={(e) => { setServiceCategory(e.target.value); setGrievanceType(""); }}>
                {!options && <option value="">Loading…</option>}
                {options?.categories.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
              </Select>
            </FormField>
            <FormField label="Grievance type" htmlFor="grv-type" required>
              <Select id="grv-type" value={grievanceType} disabled={grievanceTypes.length === 0} onChange={(e) => setGrievanceType(e.target.value)}>
                <option value="">{grievanceTypes.length === 0 ? "—" : "Select…"}</option>
                {grievanceTypes.map((t) => <option key={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Priority" htmlFor="grv-priority" required>
              <Select id="grv-priority" value={priority} onChange={(e) => setPriority(e.target.value)}>{PRIORITIES.map((p) => <option key={p}>{p}</option>)}</Select>
            </FormField>
          </div>

          {/* Administrative area — Kebele code + name (no DA-side geo lookup yet; see api.ts). */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Kebele code" htmlFor="grv-kebele-code" required hint="Grievance geo code; submitted as kebele-<code>.">
              <Input id="grv-kebele-code" value={kebeleCode} onChange={(e) => setKebeleCode(e.target.value)} placeholder="e.g. ET140108101008" />
            </FormField>
            <FormField label="Kebele name" htmlFor="grv-kebele-name" required>
              <Input id="grv-kebele-name" value={kebeleName} onChange={(e) => setKebeleName(e.target.value)} placeholder="e.g. Kebele 01 Center" />
            </FormField>
          </div>

          <FormField label="Subject" htmlFor="grv-subject" required>
            <Input id="grv-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short title" />
          </FormField>
          <FormField label="Description" htmlFor="grv-desc" required>
            <Textarea id="grv-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened, where, and when" />
          </FormField>
          <FormField label="Desired outcome" htmlFor="grv-outcome">
            <Textarea id="grv-outcome" rows={2} value={desiredOutcome} onChange={(e) => setDesiredOutcome(e.target.value)} placeholder="What resolution the submitter is seeking" />
          </FormField>

          <div className="flex flex-col gap-2.5 rounded-lg border border-line bg-surface p-3">
            <label className="flex items-center gap-2.5 text-[13.5px] text-ink">
              <Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} />
              The submitter consents to sharing this grievance with the Grievance Service.
            </label>
            <label className="flex items-center gap-2.5 text-[13.5px] text-ink">
              <Checkbox checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} />
              Submit anonymously (hide the submitter&rsquo;s identity in reports).
            </label>
          </div>
        </div>
      )}
    </Modal>
  );
}
