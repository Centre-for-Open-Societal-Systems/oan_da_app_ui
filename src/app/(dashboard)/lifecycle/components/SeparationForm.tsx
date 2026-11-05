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
import { NOTICE_OPTIONS, OPEN_SEPARATION_ITEMS, SECOND_APPROVER, SEPARATION_CLEARANCE, SEPARATION_FORM, SEPARATION_TYPES } from "./separation";
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
  SegmentedField,
  RouteList,
  SideCard,
  StatusCard,
  TONES,
  TransitionHeader,
  buildEvent,
  formatDate,
} from "./shared";
import { requestIds, useLifecycleHistory } from "./useLifecycleHistory";

// Full-page Separation form; it needs a Woreda and a zone / regional HR sign-off. Confirming records the request ("Pending approval") and opens its status page.
export function SeparationForm() {
  const transition = transitionFor("SP")!;
  const router = useRouter();
  const submitRequest = useLifecycleHistory((s) => s.submit);
  const seq = useLifecycleHistory((s) => s.seq);
  const { draft, set, setFiles, saveDraft, clearDraft, saveNote } = useSessionDraft("lifecycle-separation", { ...EMPTY_DRAFT, scope: SEPARATION_TYPES[0], notice: NOTICE_OPTIONS[0] });
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
    const { scope, target, effective, successor, reason, role, assessment, notice } = draft;
    submitRequest(
      { id, auditId, code: "SP", scope, target, effective, successor, reason, role, assessment, notice, document: file ? { name: file.name, size: file.size } : null, submittedAt: new Date().toISOString(), status: "Pending approval" },
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

      <TransitionHeader transition={transition} eyebrow="Initiate transition" text={SEPARATION_FORM.summary} step={confirming ? 1 : 0} />

      <InfoNote tone="danger" title="Separation is permanent">
        It cannot be reversed from this screen. System access ends on the last working day and the DA record is archived.
      </InfoNote>

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_350px]">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden p-0">
            <FormSection step={1} title="Separation details" subtitle="Reason category and last working day." tone={transition.tone}>
              <FormField label="Separation type" htmlFor="lc-scope" required>
                <Select id="lc-scope" value={draft.scope} onChange={(e) => set("scope", e.target.value)}>
                  {SEPARATION_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FormField>
              <FormField label="Last working day" htmlFor="lc-effective" required hint={error("effective")} hintTone="error">
                <Input id="lc-effective" type="date" min={todayIso()} value={draft.effective} onChange={(e) => set("effective", e.target.value)} />
              </FormField>
              <SegmentedField id="lc-notice" label="Notice period" options={NOTICE_OPTIONS} value={draft.notice ?? ""} onChange={(v) => set("notice", v)} tone={transition.tone} />
            </FormSection>
            <FormSection step={2} title="Handover & clearance" subtitle="All items must be cleared before approval." tone={transition.tone}>
              <LockedField id="lc-farmers" label="Farmers to hand over" value={LIFECYCLE_DA.farmers} />
              <FormField label="Successor DA" htmlFor="lc-successor" required hint={error("successor")} hintTone="error">
                <Select id="lc-successor" value={draft.successor} onChange={(e) => set("successor", e.target.value)}>
                  <option value="">Select a DA</option>
                  {SUCCESSOR_OPTIONS.map((s) => <option key={s} value={s}>{coverLabel(s)}</option>)}
                </Select>
              </FormField>
              <ChecklistField label="Clearance checklist" items={SEPARATION_CLEARANCE} tone={transition.tone} />
            </FormSection>
            <FormSection step={3} title="Reason & evidence" subtitle="Explain why this transition is needed and attach supporting evidence." tone={transition.tone}>
              <FormField label="Reason for separation" htmlFor="lc-reason" required hint={error("reason")} hintTone="error" className="sm:col-span-2">
                <Textarea id="lc-reason" rows={3} value={draft.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Why is the DA leaving the service?" />
              </FormField>
              <DocumentPicker title="Supporting document (optional)" label="Upload supporting letter" tone={transition.tone} files={draft.files} onChange={setFiles} />
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
          <PreviewCard form={SEPARATION_FORM} transition={transition} draft={draft} placeholder={null} pendingNote="Pending two approvals" approver={`${APPROVER_LINE} + second approver`} />
          <SideCard title="Approval route" subtitle="Who signs off and when">
            <RouteList
              tone={transition.tone}
              steps={[
                { title: "Initiate", detail: "You · today", state: "done" },
                { title: "First approval", detail: APPROVER_LINE, state: "current" },
                { title: "Second approval", detail: `${SECOND_APPROVER.role.replace(" / ", " or ")}, as required for separation.`, state: "next" },
                { title: "Effective", detail: SEPARATION_FORM.effectiveNote(draft.effective ? formatDate(draft.effective) : "the last working day", draft), state: "next" },
              ]}
            />
          </SideCard>
          <SideCard title="What happens next">
            <CheckList items={SEPARATION_FORM.next(draft)} className={TONES[transition.tone].text} />
          </SideCard>
        </div>
      </div>

      {confirming && (
        <ConfirmSubmitModal
          transition={transition}
          draft={draft}
          note={
            <InfoNote tone="danger" title="Separation is permanent">
              It cannot be reversed from this screen and needs two approvals.{OPEN_SEPARATION_ITEMS > 0 && ` ${OPEN_SEPARATION_ITEMS} clearance items are still open.`}
            </InfoNote>
          }
          onBack={() => setConfirming(false)}
          onClose={() => setConfirming(false)}
          onConfirm={confirm}
        />
      )}
    </div>
  );
}
