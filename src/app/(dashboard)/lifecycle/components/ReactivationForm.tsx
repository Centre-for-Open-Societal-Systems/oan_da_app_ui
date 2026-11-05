"use client";

import { todayIso } from "@/lib/utils";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { DocumentPicker, FormSection, LockedField, PreviewCard, useSessionDraft } from "./InitiateTransition";
import { transitionFor } from "./lifecycle";
import { INACTIVE_REASON, INACTIVE_SINCE, KEEP_PREVIOUS, PREVIOUS_ASSIGNMENT, REACTIVATION_FORM, RETURN_OPTIONS, eligibilityChecks } from "./reactivation";
import {
  APPROVER_LINE,
  CheckList,
  ChecklistField,
  ConfirmSubmitModal,
  EMPTY_DRAFT,
  ICONS,
  Icon,
  InfoNote,
  ProfileCard,
  RouteList,
  SideCard,
  StatusCard,
  TONES,
  TransitionHeader,
  buildEvent,
  formatDate,
} from "./shared";
import { requestIds, useLifecycleHistory } from "./useLifecycleHistory";

// Full-page Reactivation form. Confirming records the request ("Pending approval") and opens its status page.
export function ReactivationForm() {
  const transition = transitionFor("RA")!;
  const router = useRouter();
  const submitRequest = useLifecycleHistory((s) => s.submit);
  const seq = useLifecycleHistory((s) => s.seq);
  const { draft, set, setFiles, saveDraft, clearDraft, saveNote } = useSessionDraft("lifecycle-reactivation", { ...EMPTY_DRAFT, target: KEEP_PREVIOUS });
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const hasDocument = draft.files.length > 0;
  const missing = { effective: !draft.effective, target: !draft.target, document: !hasDocument, reason: !draft.reason.trim() };
  const error = (key: keyof typeof missing) => (submitted && missing[key] ? "Required" : undefined);

  const review = () => {
    setSubmitted(true);
    if (!Object.values(missing).some(Boolean)) setConfirming(true);
  };

  const confirm = () => {
    const { id, auditId } = requestIds(seq);
    const file = draft.files[0];
    const { scope, target, effective, successor, reason, role, assessment } = draft;
    submitRequest(
      { id, auditId, code: "RA", scope, target, effective, successor, reason, role, assessment, document: { name: file.name, size: file.size }, submittedAt: new Date().toISOString(), status: "Pending approval" },
      buildEvent(transition, draft, id)
    );
    clearDraft();
    router.push(`/lifecycle/requests/${id}`);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink href="/lifecycle" />
      <ProfileCard />
      <StatusCard title="Current status" transitionTone={transition.tone} />

      <TransitionHeader transition={transition} eyebrow="Initiate transition" text={REACTIVATION_FORM.summary} step={confirming ? 1 : 0} />

      <InfoNote title={`Currently Inactive since ${INACTIVE_SINCE}`}>
        Reason on record: {INACTIVE_REASON}. Reactivating restores system access and the previous assignment.
      </InfoNote>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_350px]">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden p-0">
            <FormSection step={1} title="Reactivation details" subtitle="Status after approval and assignment on return." tone={transition.tone}>
              <LockedField id="lc-status" label="Resulting status" value={transition.outcome} />
              <FormField label="Effective date" htmlFor="lc-effective" required hint={error("effective")} hintTone="error">
                <Input id="lc-effective" type="date" min={todayIso()} value={draft.effective} onChange={(e) => set("effective", e.target.value)} />
              </FormField>
              <LockedField id="lc-previous" label="Previous assignment" value={PREVIOUS_ASSIGNMENT} />
              <FormField label="Assignment on return" htmlFor="lc-target" required hint={error("target")} hintTone="error">
                <Select id="lc-target" value={draft.target} onChange={(e) => set("target", e.target.value)}>
                  {RETURN_OPTIONS.map((o) => <option key={o} value={o}>{o}</option>)}
                </Select>
              </FormField>
            </FormSection>
            <FormSection step={2} title="Eligibility checks" subtitle="Everything must be green before submitting." tone={transition.tone}>
              <DocumentPicker title="Renewed documents" label="Upload renewed documents" tone={transition.tone} files={draft.files} onChange={setFiles} />
              <ChecklistField label="Eligibility" items={eligibilityChecks(hasDocument)} tone={transition.tone} error={error("document") && "Upload the renewed documents to continue"} />
            </FormSection>
            <FormSection step={3} title="Reason" subtitle="Explain the reason for this transition." tone={transition.tone}>
              <FormField label="Reason for reactivation" htmlFor="lc-reason" required hint={error("reason")} hintTone="error" className="sm:col-span-2">
                <Textarea id="lc-reason" rows={3} value={draft.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Why can the DA return to service?" />
              </FormField>
            </FormSection>
          </Card>

          <Card className="flex flex-wrap items-center gap-3 px-5 py-4">
            <Button variant="outline" size="lg" onClick={saveDraft}>Save Draft</Button>
            {saveNote && (
              <span className="flex items-center gap-1.5 text-[14px] text-ink-soft">
                <Icon d={ICONS.check} /> {saveNote}
              </span>
            )}
            <div className="ml-auto flex gap-3">
              <Link href="/lifecycle" className="inline-flex h-12 items-center rounded-lg border border-zinc-200 bg-white px-6 text-[15px] font-medium text-ink transition-colors hover:bg-zinc-50">
                Cancel
              </Link>
              <Button variant="brand" size="lg" onClick={review} className="gap-2 text-[15px]">
                Submit for approval <Icon d={ICONS.arrow} />
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <PreviewCard form={REACTIVATION_FORM} transition={transition} draft={draft} placeholder={null} />
          <SideCard title="Approval route" subtitle="Who signs off and when">
            <RouteList
              tone={transition.tone}
              steps={[
                { title: "Initiate", detail: "You · today", state: "done" },
                { title: "Review & approve", detail: APPROVER_LINE, state: "current" },
                { title: "Effective", detail: REACTIVATION_FORM.effectiveNote(draft.effective ? formatDate(draft.effective) : "the effective date", draft), state: "next" },
              ]}
            />
          </SideCard>
          <SideCard title="What happens next">
            <CheckList items={REACTIVATION_FORM.next(draft)} className={TONES[transition.tone].text} />
          </SideCard>
        </div>
      </div>

      {confirming && (
        <ConfirmSubmitModal
          transition={transition}
          draft={draft}
          note={<InfoNote title="One check is still pending">Renewed documents are under review. The approver will see this check as pending.</InfoNote>}
          onBack={() => setConfirming(false)}
          onClose={() => setConfirming(false)}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}
