"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { Banner } from "@/components/ui/Banner";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import {
  fetchGrievanceOptions,
  newClientOpId,
  selfSubmitter,
  submitGrievance,
  toEthiopianMobile,
  type GrievanceOptions,
  type SubmitGrievanceResult,
} from "../api";
import { AreaPicker, type AreaSelection } from "@/features/geo";
import { VoiceRecorder } from "./VoiceRecorder";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** Pre-selects "for a farmer" (when launched from a farmer profile). */
  farmerId?: string;
  /** Called after the Grievance Service accepted (or queued) the grievance, e.g. to reload a list. */
  onSubmitted?: (result: SubmitGrievanceResult) => void;
}

/** The rule of a minimum-length field as its visible note; red once what is typed falls short. */
const minLengthNote = (value: string, min: number, prefix = "") => {
  const length = value.trim().length;
  return { hint: `${prefix}At least ${min} characters.`, hintTone: length > 0 && length < min ? ("error" as const) : ("muted" as const) };
};

type Result = { kind: "draft" } | { kind: "sent"; result: SubmitGrievanceResult };

const DA_SUBMITTER_TYPE = "Development Agent";
const SUBMITTER_TYPES_FALLBACK = ["Individual Farmer", "Cooperative", DA_SUBMITTER_TYPE, "FPO", "NGO", "Woreda/Kebele Body"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
/** The Grievance Service's min_description_length. */
const MIN_DESCRIPTION = 20;

// FR-12 / FR-12a: native raise form → POST /grievances → external case ID. When the Grievance Service is down
// DA Services queues the grievance and returns no ticket yet; it is forwarded once the service is back.
export function RaiseGrievanceModal({ isOpen, onClose, farmerId, onSubmitted }: Props) {
  const role = useAuthStore((s) => s.role);
  const accountName = useAuthStore((s) => s.user?.name);
  const agent = useAuthStore((s) => s.profile?.agent);
  const self = useMemo(() => selfSubmitter(agent, accountName), [agent, accountName]);

  const [forWhom, setForWhom] = useState<"farmer" | "me">(farmerId ? "farmer" : "me");
  // Fixed when launched from a farmer profile, otherwise typed in.
  const [farmerRef, setFarmerRef] = useState(farmerId ?? "");
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

  // Administrative area: the Kebele from the Master Data picker (AreaPicker). The levels /me fills for the role are
  // locked (a DA's down to the Kebele, a Supervisor's to the Woreda, an Executive's to the Zone); the rest are picked.
  const [kebeleCode, setKebeleCode] = useState("");
  const [kebeleName, setKebeleName] = useState("");
  const pickKebele = useCallback((area: AreaSelection | null) => {
    setKebeleCode(area?.kebele?.code ?? "");
    setKebeleName(area?.kebele?.name ?? "");
  }, []);
  // Bumped to start the picker afresh (its preset filled in again) when the form is cleared.
  const [pickerKey, setPickerKey] = useState(0);
  const clearArea = () => {
    pickKebele(null);
    setPickerKey((k) => k + 1);
  };

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

  // A DA raising for themselves is the submitter: the type is fixed, and name and mobile come from their DA record.
  // A value the record does not hold stays editable, so the form can still be completed.
  const selfAsDa = forWhom === "me" && role === "DA";
  const daType = submitterTypes.find((t) => /development agent/i.test(t)) ?? DA_SUBMITTER_TYPE;
  const nameLocked = selfAsDa && !!self.name;
  // A record mobile the Grievance Service would refuse stays editable.
  const mobileLocked = selfAsDa && !!toEthiopianMobile(self.mobile);
  const effectiveType = selfAsDa ? daType : submitterType;
  const effectiveName = nameLocked ? self.name : submitterName;
  const effectiveMobile = mobileLocked ? self.mobile : contactMobile;
  /** What is sent: +251 and the 9 digits; null until it is a valid Ethiopian mobile. */
  const mobileToSend = toEthiopianMobile(effectiveMobile);
  const mobileNote = mobileLocked
    ? { hint: "From your DA record." }
    : { hint: "Ethiopian mobile, e.g. 0911234567.", hintTone: contactMobile.trim() && !mobileToSend ? ("error" as const) : ("muted" as const) };

  const chooseFor = (whom: "farmer" | "me") => {
    setForWhom(whom);
    clearArea();
  };

  const reset = () => {
    setSubject(""); setDescription(""); setDesiredOutcome("");
    setSubmitterName(""); setContactMobile(""); setFarmerRef(farmerId ?? "");
    setGrievanceType(""); clearArea();
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
        farmer_id: forWhom === "farmer" ? farmerRef.trim() : undefined,

        submitter_type: effectiveType,
        submitter_name: effectiveName.trim(),
        contact_mobile: mobileToSend ?? "",
        administrative_area: kebeleCode.trim(),
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
    (forWhom !== "farmer" || !!farmerRef.trim()) &&
    subject.trim().length >= 3 &&
    description.trim().length >= MIN_DESCRIPTION &&
    !!serviceCategory &&
    !!grievanceType &&
    effectiveName.trim().length >= 2 &&
    !!mobileToSend &&
    !!kebeleCode &&
    !!kebeleName &&
    !submitting;
  const reference = result?.kind === "sent" ? result.result.ticket_number ?? result.result.ticket_id : null;
  const queued = result?.kind === "sent" && result.result.sync_state === "pending";

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Raise a Grievance"
      subtitle="Submitted to the external OAN Grievance Service — triage, response and closure happen there."
      size="xl"
      bodyClassName="p-4 sm:p-6"
      icon={
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-green/20 bg-emerald-50 text-brand-green shadow-xs">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            <line x1="9" y1="10" x2="15" y2="10" />
            <line x1="12" y1="7" x2="12" y2="13" />
          </svg>
        </div>
      }
      footer={result ? <Button variant="brand" onClick={close}>Done</Button> : (
        <>
          <Button variant="outline" onClick={close} disabled={submitting}>Cancel</Button>
          <Button variant="brandOutline" onClick={() => setResult({ kind: "draft" })} disabled={submitting}>Save draft</Button>
          <Button variant="brand" disabled={!canSubmit} onClick={submit} className="gap-2">
            {submitting ? "Submitting…" : "Submit"}
          </Button>
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
        <div className="flex flex-col gap-5">
          {error && <Banner tone="error" title="Grievance not submitted">{error}</Banner>}
          {optionsError && <Banner tone="warning" title="Categories unavailable">{optionsError}</Banner>}

          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 gap-1.5 rounded-xl border border-slate-200/80 bg-slate-100/80 p-1.5 shadow-2xs">
            <button
              type="button"
              onClick={() => chooseFor("farmer")}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                forWhom === "farmer"
                  ? "bg-white text-brand-green shadow-xs border border-gray-200/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50",
              )}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span className="truncate">
                <span className="hidden min-[420px]:inline">On behalf of a </span>Farmer
              </span>
            </button>
            <button
              type="button"
              onClick={() => chooseFor("me")}
              className={cn(
                "flex h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition-all cursor-pointer",
                forWhom === "me"
                  ? "bg-white text-brand-green shadow-xs border border-gray-200/60"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/50",
              )}
            >
              <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
              <span className="truncate">For myself</span>
            </button>
          </div>

          {/* Submitter details section */}
          {forWhom === "farmer" ? (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField label="Farmer ID" htmlFor="grv-farmer-id" required hint={farmerId ? "From the farmer's profile." : "Required, e.g. FR-675618129549."}>
                <Input id="grv-farmer-id" value={farmerRef} disabled={!!farmerId} onChange={(e) => setFarmerRef(e.target.value)} placeholder="FR-…" />
              </FormField>
              <FormField label="Submitter type" htmlFor="grv-subtype" required>
                <Select id="grv-subtype" value={effectiveType} disabled={selfAsDa} onChange={(e) => setSubmitterType(e.target.value)}>
                  {(selfAsDa ? [daType] : submitterTypes).map((t) => <option key={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Submitter name" htmlFor="grv-subname" required {...(nameLocked ? { hint: "From your DA record." } : minLengthNote(submitterName, 2))}>
                <Input id="grv-subname" value={effectiveName} disabled={nameLocked} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Full name" />
              </FormField>
              <FormField label="Contact mobile" htmlFor="grv-mobile" required {...mobileNote}>
                <Input id="grv-mobile" value={effectiveMobile} disabled={mobileLocked} onChange={(e) => setContactMobile(e.target.value)} placeholder="09xxxxxxxx" inputMode="tel" />
              </FormField>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {selfAsDa && (
                <div className="flex items-center gap-2.5 rounded-lg border border-brand-green/20 bg-emerald-50/60 px-3.5 py-2 text-xs text-brand-green">
                  <svg className="h-4 w-4 shrink-0 text-brand-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  <span>Raising grievance as logged-in Development Agent. Submitter details are sourced from your DA record.</span>
                </div>
              )}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <FormField label="Submitter type" htmlFor="grv-subtype" required>
                  <Select id="grv-subtype" value={effectiveType} disabled={selfAsDa} onChange={(e) => setSubmitterType(e.target.value)}>
                    {(selfAsDa ? [daType] : submitterTypes).map((t) => <option key={t}>{t}</option>)}
                  </Select>
                </FormField>
                <FormField label="Submitter name" htmlFor="grv-subname" required {...(nameLocked ? { hint: "From your DA record." } : minLengthNote(submitterName, 2))}>
                  <Input id="grv-subname" value={effectiveName} disabled={nameLocked} onChange={(e) => setSubmitterName(e.target.value)} placeholder="Full name" />
                </FormField>
                <FormField label="Contact mobile" htmlFor="grv-mobile" required {...mobileNote}>
                  <Input id="grv-mobile" value={effectiveMobile} disabled={mobileLocked} onChange={(e) => setContactMobile(e.target.value)} placeholder="09xxxxxxxx" inputMode="tel" />
                </FormField>
              </div>
            </div>
          )}

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

          <AreaPicker key={pickerKey} depth="kebele" required idPrefix="grv" onChange={pickKebele} />

          <FormField label="Subject" htmlFor="grv-subject" required {...minLengthNote(subject, 3)}>
            <Input id="grv-subject" value={subject} onChange={(e) => setSubject(e.target.value)} placeholder="Short title" />
          </FormField>
          <FormField label="Description" htmlFor="grv-desc" required {...minLengthNote(description, MIN_DESCRIPTION)}>
            <Textarea id="grv-desc" rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="What happened, where, and when" />
          </FormField>
          <VoiceRecorder />
          <FormField label="Desired outcome" htmlFor="grv-outcome">
            <Textarea id="grv-outcome" rows={2} value={desiredOutcome} onChange={(e) => setDesiredOutcome(e.target.value)} placeholder="What resolution the submitter is seeking" />
          </FormField>

          <div className="flex flex-col gap-3 rounded-xl border border-line bg-surface/60 p-3.5 sm:p-4">
            <label className="flex items-start gap-2.5 text-[13.5px] text-ink cursor-pointer select-none">
              <span className="mt-0.5 shrink-0"><Checkbox checked={consent} onChange={(e) => setConsent(e.target.checked)} /></span>
              <span>The submitter consents to sharing this grievance with the Grievance Service.</span>
            </label>
            <label className="flex items-start gap-2.5 text-[13.5px] text-ink cursor-pointer select-none">
              <span className="mt-0.5 shrink-0"><Checkbox checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} /></span>
              <span>Submit anonymously (hide the submitter&rsquo;s identity in reports).</span>
            </label>
          </div>

          {!canSubmit && !submitting && <p className="text-[12.5px] text-muted">Complete every field marked * to enable Submit.</p>}
        </div>
      )}
    </Modal>
  );
}
