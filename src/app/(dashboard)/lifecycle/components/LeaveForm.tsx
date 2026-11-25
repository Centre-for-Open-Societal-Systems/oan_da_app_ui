"use client";

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
import { cn, todayIso } from "@/lib/utils";
import { DocumentPicker, FormSection, LockedField, PreviewCard, fromTodayNote, useSessionDraft } from "./InitiateTransition";
import {
  ACCESS_OPTIONS,
  COVER_KEBELE,
  COVER_OPTIONS,
  LEAVE_ENTITLEMENT,
  LEAVE_FORM,
  LEAVE_TYPES,
  LEAVE_YEAR,
  coverLabel,
  durationLine,
  leaveBalance,
  returnDate,
  validRange,
  visitsInWindow,
  workingDays,
} from "./leave";
import { transitionFor, type LifecycleRequest } from "./lifecycle";
import {
  APPROVER_LINE,
  CheckList,
  ConfirmSubmitModal,
  EMPTY_DRAFT,
  ICONS,
  Icon,
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

/** Grey (taken) · amber (this request) · light (left) bar over the year's entitlement. */
export function BalanceBar({ total, taken, held }: { total: number; taken: number; held: number }) {
  const pct = (n: number) => `${Math.max(0, Math.min(100, (n / total) * 100))}%`;
  return (
    <div className="flex h-1.5 gap-0.5 overflow-hidden rounded-full" aria-hidden="true">
      <span className="rounded-full bg-slate-300" style={{ width: pct(taken) }} />
      <span className="rounded-full bg-amber-600" style={{ width: pct(held) }} />
      <span className="flex-1 rounded-full bg-slate-200" />
    </div>
  );
}

function BalanceCard({ type, requested, requests }: { type: string; requested: number; requests: LifecycleRequest[] }) {
  const balance = leaveBalance(type, requests);
  const others = Object.keys(LEAVE_ENTITLEMENT).filter((t) => t !== type);
  const row = "flex items-center justify-between gap-3 text-[13.5px]";
  return (
    <SideCard title={`Leave balance - ${LEAVE_YEAR}`} subtitle={balance ? `${type} entitlement for the policy year` : `${type} isn't deducted from a balance`}>
      <div className="flex flex-col gap-3 px-5 py-4">
        {balance && (
          <>
            <p className="flex items-baseline gap-2">
              <span className="text-[32px] font-bold leading-none text-ink">{balance.left}</span>
              <span className="text-[13.5px] text-ink-soft">days remaining of {balance.total}</span>
            </p>
            <BalanceBar total={balance.total} taken={balance.taken + balance.held} held={requested} />
            <div className={row}>
              <span className="flex items-center gap-2 text-ink-soft"><span className="h-2 w-2 rounded-full bg-slate-300" />Taken so far</span>
              <span className="font-semibold text-ink">{balance.taken + balance.held} days</span>
            </div>
            <div className={row}>
              <span className="flex items-center gap-2 text-ink-soft"><span className="h-2 w-2 rounded-full bg-amber-600" />This request (working days)</span>
              <span className="font-semibold text-ink">{requested} days</span>
            </div>
            <div className={row}>
              <span className="flex items-center gap-2 text-ink-soft"><span className="h-2 w-2 rounded-full bg-slate-200" />Balance after approval</span>
              <span className={cn("font-semibold", balance.left - requested < 0 ? "text-danger" : "text-ink")}>{balance.left - requested} days</span>
            </div>
          </>
        )}
        <div className={cn("flex flex-col gap-2", balance && "border-t border-line-soft pt-3")}>
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">Other leave types</p>
          {others.map((t) => {
            const b = leaveBalance(t, requests)!;
            return (
              <div key={t} className={row}>
                <span className="text-ink-soft">{t}</span>
                <span className="font-semibold text-ink">{b.left} of {b.total} days left</span>
              </div>
            );
          })}
        </div>
      </div>
    </SideCard>
  );
}

// Full-page Leave / suspension form. Confirming records the request ("Pending approval") and opens its status page.
export function LeaveForm() {
  const transition = transitionFor("LV")!;
  const router = useRouter();
  const submitRequest = useLifecycleHistory((s) => s.submit);
  const seq = useLifecycleHistory((s) => s.seq);
  const requests = Object.values(useLifecycleHistory((s) => s.requests));
  const { draft, set, setFiles, saveDraft, clearDraft, saveNote } = useSessionDraft("lifecycle-leave", { ...EMPTY_DRAFT, scope: LEAVE_TYPES[0], access: "Read-only" });
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const datesSet = validRange(draft);
  const days = datesSet ? workingDays(draft.effective, draft.target) : 0;
  const balance = leaveBalance(draft.scope, requests);
  const overBalance = !!balance && days > balance.left;
  const missing = {
    effective: !draft.effective,
    target: !draft.target || (!!draft.effective && draft.target < draft.effective) || overBalance,
    successor: !draft.successor,
    reason: !draft.reason.trim(),
  };
  const error = (key: keyof typeof missing) => {
    if (!submitted || !missing[key]) return undefined;
    if (key === "target" && draft.target && draft.target < draft.effective) return "Ends before the start date";
    if (key === "target" && overBalance) return `Only ${balance!.left} ${draft.scope.toLowerCase()} days left`;
    return "Required";
  };

  const review = () => {
    setSubmitted(true);
    if (!Object.values(missing).some(Boolean)) setConfirming(true);
  };

  const confirm = () => {
    const { id, auditId } = requestIds(seq, "LV");
    const file = draft.files[0];
    const { scope, target, effective, successor, reason, role, assessment, access } = draft;
    submitRequest(
      { id, auditId, code: "LV", scope, target, effective, successor, reason, role, assessment, access, document: file ? { name: file.name, size: file.size } : null, submittedAt: new Date().toISOString(), status: "Pending approval" },
      buildEvent(transition, draft, id)
    );
    clearDraft();
    router.push(`/lifecycle/requests/${id}`);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink href="/lifecycle/leave" />
      <ProfileCard />
      <StatusCard title="Current status" transitionTone={transition.tone} />

      <TransitionHeader transition={transition} eyebrow="Initiate transition" text={LEAVE_FORM.summary} step={confirming ? 1 : 0} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_350px]">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden p-0">
            <FormSection step={1} title="Leave details" subtitle="Type and dates of absence." tone={transition.tone}>
              <FormField label="Leave type" htmlFor="lc-scope" required>
                <Select id="lc-scope" value={draft.scope} onChange={(e) => set("scope", e.target.value)}>
                  {LEAVE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
                </Select>
              </FormField>
              <LockedField id="lc-duration" label="Duration" value={datesSet ? durationLine(draft.effective, draft.target) : "Set the start and end dates"} />
              <FormField label="Start date" htmlFor="lc-effective" required {...fromTodayNote(draft.effective, error("effective"))}>
                <Input id="lc-effective" type="date" min={todayIso()} value={draft.effective} onChange={(e) => set("effective", e.target.value)} />
              </FormField>
              <FormField label="End date" htmlFor="lc-target" required hint={error("target") ?? "On or after the start date, within the leave balance."} hintTone={error("target") || (draft.target && missing.target) ? "error" : "muted"}>
                <Input id="lc-target" type="date" min={draft.effective || undefined} value={draft.target} onChange={(e) => set("target", e.target.value)} />
              </FormField>
              <LockedField id="lc-return" label="Return to work" value={datesSet ? formatDate(returnDate(draft.target)) : "—"} />
              <LockedField id="lc-visits" label="Scheduled visits in window" value={datesSet ? `${visitsInWindow(draft.effective, draft.target)} visits to reassign` : "—"} />
            </FormSection>
            <FormSection step={2} title="Coverage & access" subtitle="Keep farmers covered while the DA is away." tone={transition.tone}>
              <FormField label="Interim cover DA" htmlFor="lc-successor" required hint={error("successor")} hintTone="error">
                <Select id="lc-successor" value={draft.successor} onChange={(e) => set("successor", e.target.value)}>
                  <option value="">Select a DA</option>
                  {COVER_OPTIONS.map((c) => <option key={c} value={c}>{coverLabel(c)}</option>)}
                </Select>
              </FormField>
              <LockedField id="lc-cover-kebele" label="Cover kebele" value={COVER_KEBELE} />
              <SegmentedField id="lc-access" label="System access during leave" options={ACCESS_OPTIONS} value={draft.access ?? ""} onChange={(v) => set("access", v)} tone={transition.tone} />
            </FormSection>
            <FormSection step={3} title="Reason & evidence" subtitle="Explain why this transition is needed and attach supporting evidence." tone={transition.tone}>
              <FormField label="Reason for leave / suspension" htmlFor="lc-reason" required hint={error("reason")} hintTone="error" className="sm:col-span-2">
                <Textarea id="lc-reason" rows={3} value={draft.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Why is the DA away?" />
              </FormField>
              <DocumentPicker title="Supporting document (optional)" label="Upload leave application or certificate" tone={transition.tone} files={draft.files} onChange={setFiles} />
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
              <Link href="/lifecycle/leave" className="inline-flex h-12 items-center rounded-lg border border-zinc-200 bg-white px-6 text-[15px] font-medium text-ink transition-colors hover:bg-zinc-50">
                Cancel
              </Link>
              <Button variant="brand" size="lg" onClick={review} className="gap-2 text-[15px]">
                Submit for approval <Icon d={ICONS.arrow} />
              </Button>
            </div>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <BalanceCard type={draft.scope} requested={days} requests={requests} />
          <PreviewCard form={LEAVE_FORM} transition={transition} draft={draft} placeholder={datesSet ? null : "Choose the leave dates"} />
          <SideCard title="Approval route" subtitle="Who signs off and when">
            <RouteList
              tone={transition.tone}
              steps={[
                { title: "Initiate", detail: "You · today", state: "done" },
                { title: "Review & approve", detail: APPROVER_LINE, state: "current" },
                { title: "Effective", detail: LEAVE_FORM.effectiveNote(draft.effective ? formatDate(draft.effective) : "the start date", draft), state: "next" },
              ]}
            />
          </SideCard>
          <SideCard title="What happens next">
            <CheckList items={LEAVE_FORM.next(draft)} className={TONES[transition.tone].text} />
          </SideCard>
        </div>
      </div>

      {confirming && <ConfirmSubmitModal transition={transition} draft={draft} onBack={() => setConfirming(false)} onClose={() => setConfirming(false)} onConfirm={confirm} />}
    </div>
  );
}
