"use client";

import { useEffect, useRef, useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Banner } from "@/components/ui/Banner";
import { PageHeader } from "@/components/ui/PageHeader";
import { ApiError } from "@/lib/api";
import { readDraft, removeDraft, writeDraft } from "@/lib/drafts";
import { describeFarmerError, newClientOpId, registerFarmer, useFieldOptions } from "@/features/farmers";
import { buildRegistrationBody, EMPTY_FORM, errorsFromDetails, farmerFullName, placeTrail, stepOfField, validateStep, type FormErrors, type RegistrationForm } from "../registration";
import { WIZARD_STEPS } from "../registrySpec";
import { TOTAL_STEPS } from "../steps";
import { DocumentStep } from "./DocumentStep";
import { FarmerStep, type StepProps } from "./FarmerStep";
import { StepCard } from "./fields";
import { HoldingsStep } from "./HoldingsStep";
import { HouseholdStep } from "./HouseholdStep";
import { LocationStep } from "./LocationStep";
import { ReviewStep } from "./ReviewStep";
import { Stepper } from "./Stepper";
import { SubmitConfirmModal } from "./SubmitConfirmModal";
import { SubmittedHeader, SubmittedStep, type Submission } from "./SubmittedStep";
import { WizardFooter } from "./WizardFooter";

// Register a farmer through DA Services: every step fills part of one POST /farmers body (registration.ts), choices come
// from the registry's field-options and places. The registration then waits for a supervisor; the farmer gets an FR- id
// and appears in My Farmers only once approved.

// Draft kept for this browser session only (see lib/drafts).
const DRAFT_KEY = "farmer-registration";

interface WizardDraft {
  step: number;
  form: RegistrationForm;
  savedAt: string;
}

type Notice = { tone: "success" | "info" | "error"; text: string; restored?: boolean };

const formatTime = (iso: string) => new Date(iso).toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });

/** The first problem's step number, so the user lands where it can be fixed. */
const firstStepWith = (errors: FormErrors) => {
  const steps = Object.keys(errors).map(stepOfField).filter(Boolean);
  const index = WIZARD_STEPS.findIndex((s) => steps.includes(s.key));
  return index >= 0 ? index + 1 : null;
};

export function RegisterFarmerWizard() {
  const [currentStep, setCurrentStep] = useState(1);
  const [form, setForm] = useState<RegistrationForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [notice, setNotice] = useState<Notice | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submission, setSubmission] = useState<Submission | null>(null);
  // One idempotency key per registration: sending the same registration again (a retry) returns DUPLICATE, not a second farmer.
  const clientOpId = useRef<string | null>(null);
  const touched = useRef(false);
  const { options, error: optionsError, loading: optionsLoading } = useFieldOptions();

  const step = WIZARD_STEPS[currentStep - 1];
  const isLastStep = currentStep === TOTAL_STEPS;

  // Restore a saved draft on load (deferred a tick so the server render and first client render match).
  useEffect(() => {
    const t = setTimeout(() => {
      const draft = readDraft<WizardDraft>(DRAFT_KEY);
      if (!draft?.form) return;
      setForm({ ...EMPTY_FORM, ...draft.form });
      setCurrentStep(Math.min(Math.max(draft.step, 1), TOTAL_STEPS));
      setSavedAt(draft.savedAt);
      setNotice({ tone: "info", text: `Draft restored from ${formatTime(draft.savedAt)}, you're back on step ${draft.step}.`, restored: true });
    }, 0);
    return () => clearTimeout(t);
  }, []);

  // Autosave a moment after each change (not on opening the page).
  useEffect(() => {
    if (!touched.current || submission) return;
    const t = setTimeout(() => {
      const draft: WizardDraft = { step: currentStep, form, savedAt: new Date().toISOString() };
      try {
        writeDraft(DRAFT_KEY, draft);
        setSavedAt(draft.savedAt);
      } catch {
        // Storage unavailable: the Save Draft button reports it when the agent asks.
      }
    }, 1500);
    return () => clearTimeout(t);
  }, [form, currentStep, submission]);

  const update = (patch: Partial<RegistrationForm>) => {
    touched.current = true;
    setForm((prev) => ({ ...prev, ...patch }));
    // A field the user changes is no longer reported as wrong (rows clear their own entries too).
    const keys = Object.keys(patch);
    const cleared = (k: string) => keys.some((key) => k === key || k.startsWith(`${key}.`) || (key === "places" && ["region", "zone", "woreda", "kebele"].includes(k)));
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !cleared(k))));
  };

  const goToStep = (n: number) => setCurrentStep(Math.min(Math.max(n, 1), TOTAL_STEPS));

  const goNext = () => {
    const found = validateStep(step.key, form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice({ tone: "error", text: `${Object.keys(found).length} field${Object.keys(found).length === 1 ? "" : "s"} need attention on this step.` });
      return;
    }
    setNotice(null);
    goToStep(currentStep + 1);
  };

  const handleSaveDraft = () => {
    const draft: WizardDraft = { step: currentStep, form, savedAt: new Date().toISOString() };
    try {
      writeDraft(DRAFT_KEY, draft);
      setSavedAt(draft.savedAt);
      setNotice({ tone: "success", text: `Draft saved for this session at ${formatTime(draft.savedAt)}.` });
    } catch {
      setNotice({ tone: "error", text: "Couldn't save the draft: browser storage is unavailable (private mode or storage full)." });
    }
  };

  const startOver = (text?: string) => {
    removeDraft(DRAFT_KEY);
    touched.current = false;
    clientOpId.current = null;
    setForm(EMPTY_FORM);
    setErrors({});
    setSavedAt(null);
    setCurrentStep(1);
    setSubmission(null);
    setNotice(text ? { tone: "success", text } : null);
  };

  // The submit button checks every step first; the popup then sends the registration.
  const handleSubmit = () => {
    const found = validateStep("review", form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      setNotice({ tone: "error", text: "Some details are missing or wrong. Fix them before submitting." });
      return;
    }
    setConfirming(true);
  };

  const confirmSubmit = async () => {
    clientOpId.current ??= newClientOpId();
    setSubmitting(true);
    try {
      const result = await registerFarmer(buildRegistrationBody(form, clientOpId.current));
      removeDraft(DRAFT_KEY);
      setSubmission({ submissionId: result.submission_id, status: result.status, applicationReference: result.application_reference, submittedAt: new Date().toISOString() });
      setNotice(null);
    } catch (err) {
      // 400: the registry names the fields; show each where it belongs. 401 opens the session-expired dialog by itself.
      if (err instanceof ApiError && err.status === 400 && err.details) {
        const found = errorsFromDetails(err.details);
        setErrors(found);
        setNotice({ tone: "error", text: `The registry did not accept the registration: ${Object.values(err.details).join(" ")}` });
        const at = firstStepWith(found);
        if (at) goToStep(at);
      } else {
        setNotice({ tone: "error", text: describeFarmerError(err) });
      }
    } finally {
      setSubmitting(false);
      setConfirming(false);
    }
  };

  if (submission) {
    return (
      <div className="flex w-full flex-col gap-4">
        <SubmittedHeader />
        <Stepper currentStep={TOTAL_STEPS + 1} />
        <SubmittedStep submission={submission} farmerName={farmerFullName(form)} location={placeTrail(form)} onRegisterAnother={() => startOver()} />
      </div>
    );
  }

  const stepProps: StepProps = { form, update, errors, options, optionsLoading };
  const body = {
    farmer: <FarmerStep {...stepProps} />,
    location: <LocationStep {...stepProps} />,
    household: <HouseholdStep {...stepProps} />,
    holdings: <HoldingsStep {...stepProps} />,
    document: <DocumentStep {...stepProps} />,
    review: <ReviewStep form={form} options={options} errors={errors} onEditStep={goToStep} />,
  }[step.key];

  const reviewProblems = Object.keys(validateStep("review", form)).map(stepOfField);
  const completeSteps = WIZARD_STEPS.filter((s) => s.key !== "review" && !reviewProblems.includes(s.key)).length;

  return (
    <div className="flex w-full flex-col gap-4">
      {currentStep > 1 ? <BackLink onClick={() => goToStep(currentStep - 1)} /> : <BackLink href="/farmers" />}

      <PageHeader title="Farmer Registration" description={`Step ${currentStep} of ${TOTAL_STEPS} - ${step.label}`} />
      <Stepper currentStep={currentStep} />

      {optionsError !== null && (
        <Banner tone="error" title="The registry's lists could not be loaded">
          {describeFarmerError(optionsError)} Some dropdowns use a basic list or stay empty until they load; reload the page to try again.
        </Banner>
      )}
      {notice && (
        <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>
          {notice.text}
          {notice.restored && (
            <button type="button" onClick={() => startOver("Draft discarded, starting a new registration.")} className="ml-2 font-semibold underline">
              Discard draft
            </button>
          )}
        </Banner>
      )}

      <StepCard title={step.title} description={step.description}>
        {body}
      </StepCard>

      <WizardFooter
        onSaveDraft={handleSaveDraft}
        savedAt={savedAt ? formatTime(savedAt) : null}
        currentStep={currentStep}
        totalSteps={TOTAL_STEPS}
        onBack={() => goToStep(currentStep - 1)}
        onNext={isLastStep ? handleSubmit : goNext}
        nextDisabled={submitting}
        nextLabel={isLastStep ? (submitting ? "Submitting…" : "Submit registration") : "Next Step"}
        nextIcon={isLastStep ? "check" : "arrow"}
      />

      {confirming && (
        <SubmitConfirmModal
          farmerName={farmerFullName(form)}
          place={placeTrail(form)}
          completeTabs={completeSteps}
          totalTabs={TOTAL_STEPS - 1}
          onCancel={() => setConfirming(false)}
          onConfirm={() => void confirmSubmit()}
        />
      )}
    </div>
  );
}
