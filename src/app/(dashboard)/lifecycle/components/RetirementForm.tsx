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
import { coverLabel } from "./leave";
import { LIFECYCLE_DA, SUCCESSOR_OPTIONS, transitionFor } from "./lifecycle";
import { CLEARANCE_ITEMS, OPEN_CLEARANCE, RETIREMENT_FORM, RETIREMENT_TYPES, SERVICE_SINCE, lengthOfService } from "./retirement";
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

// Full-page Retirement form. Confirming records the request ("Pending approval") and opens its status page.
export function RetirementForm() {
  const transition = transitionFor("RT")!;
  const router = useRouter();
  const submitRequest = useLifecycleHistory((s) => s.submit);
  const seq = useLifecycleHistory((s) => s.seq);
  const { draft, set, setFiles, saveDraft, clearDraft, saveNote } = useSessionDraft("lifecycle-retirement", { ...EMPTY_DRAFT, scope: RETIREMENT_TYPES[0] });
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const missing = { effective: !draft.effective, successor: !draft.successor, reason: !draft.reason.trim() };
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
      { id, auditId, code: "RT", scope, target, effective, successor, reason, role, assessment, document: file ? { name: file.name, size: file.size } : null, submittedAt: new Date().toISOString(), status: "Pending approval" },
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

      <TransitionHeader transition={transition} eyebrow="Initiate transition" text={RETIREMENT_FORM.summary} step={confirming ? 1 : 0} />

      <InfoNote tone="danger" title="This ends the DA's service">
        After the last working day the DA moves to Separated · retired and system access is withdrawn. Complete handover and clearance first.
      </InfoNote>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_350px]">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden p-0">
            <FormSection step={1} title="Retirement details" subtitle="Type of retirement and the last working day." tone={transition.tone}>
              <FormField label="Retirement type" htmlFor="lc-scope" required>
                <Select id="lc-scope" value={draft.scope} onChange={(e) => set("scope", e.target.value)}>
                  {RETIREMENT_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Last working day" htmlFor="lc-effective" required hint={error("effective")} hintTone="error">
                <Input id="lc-effective" type="date" min={todayIso()} value={draft.effective} onChange={(e) => set("effective", e.target.value)} />
              </FormField>
              <LockedField id="lc-since" label="Service since" value={formatDate(SERVICE_SINCE)} />
              <LockedField id="lc-length" label="Length of service" value={draft.effective ? lengthOfService(draft.effective) : "Set the last working day"} />
            </FormSection>
            <FormSection step={2} title="Handover & clearance" subtitle="All items must be cleared before approval." tone={transition.tone}>
              <LockedField id="lc-farmers" label="Farmers to hand over" value={LIFECYCLE_DA.farmers} />
              <FormField label="Successor DA" htmlFor="lc-successor" required hint={error("successor")} hintTone="error">
                <Select id="lc-successor" value={draft.successor} onChange={(e) => set("successor", e.target.value)}>
                  <option value="">Select a DA</option>
                  {SUCCESSOR_OPTIONS.map((s) => <option key={s} value={s}>{coverLabel(s)}</option>)}
                </Select>
              </FormField>
              <ChecklistField label="Clearance checklist" items={CLEARANCE_ITEMS} tone={transition.tone} />
            </FormSection>
            <FormSection step={3} title="Reason & evidence" subtitle="Explain why this transition is needed and attach supporting evidence." tone={transition.tone}>
              <FormField label="Reason for retirement" htmlFor="lc-reason" required hint={error("reason")} hintTone="error" className="sm:col-span-2">
                <Textarea id="lc-reason" rows={3} value={draft.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Why is the DA retiring?" />
              </FormField>
              <DocumentPicker title="Supporting document (optional)" label="Upload signed application" tone={transition.tone} files={draft.files} onChange={setFiles} />
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
          <PreviewCard form={RETIREMENT_FORM} transition={transition} draft={draft} placeholder={null} />
          <SideCard title="Approval route" subtitle="Who signs off and when">
            <RouteList
              tone={transition.tone}
              steps={[
                { title: "Initiate", detail: "You · today", state: "done" },
                { title: "Review & approve", detail: APPROVER_LINE, state: "current" },
                { title: "Effective", detail: RETIREMENT_FORM.effectiveNote("", draft), state: "next" },
              ]}
            />
          </SideCard>
          <SideCard title="What happens next">
            <CheckList items={RETIREMENT_FORM.next(draft)} className={TONES[transition.tone].text} />
          </SideCard>
        </div>
      </div>

      {confirming && (
        <ConfirmSubmitModal
          transition={transition}
          draft={draft}
          note={
            OPEN_CLEARANCE > 0 && (
              <InfoNote tone="danger" title="Retirement ends service">
                {OPEN_CLEARANCE} clearance items are still open and will show as pending to the approver.
              </InfoNote>
            )
          }
          onBack={() => setConfirming(false)}
          onClose={() => setConfirming(false)}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}
