"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { readDraft, removeDraft, writeDraft } from "@/lib/drafts";
import { cn, todayIso } from "@/lib/utils";
import { ASSIGNMENT_FORMS, LIFECYCLE_DA, SUCCESSOR_OPTIONS, transitionFor, type LifecycleTransition, type TransitionCopy } from "./lifecycle";
import {
  APPROVER_LINE,
  CheckList,
  ConfirmSubmitModal,
  EMPTY_DRAFT,
  ICONS,
  Icon,
  MetaItem,
  ProfileCard,
  RouteList,
  SideCard,
  StatusCard,
  TONES,
  TransitionHeader,
  buildEvent,
  formatDate,
  formatSize,
  type InitiateDraft,
} from "./shared";
import { requestIds, useLifecycleHistory } from "./useLifecycleHistory";

const MAX_SIZE_BYTES = 10 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg"];

/** The draft minus the attached files, which can't be stored in sessionStorage. */
type StoredDraft = Omit<InitiateDraft, "files"> & { savedAt: string };

const clock = () => new Date().toTimeString().slice(0, 5);

const withToday = (draft: InitiateDraft) => (draft.effective ? draft : { ...draft, effective: todayIso() });

/**
 * Draft state for a full-page initiate form. Every edit is auto-saved to the session (files excluded), and a
 * draft saved earlier in the session is restored after mount. The effective date starts on today, also set after mount
 * because the server's day can differ from the browser's.
 */
export function useSessionDraft(draftKey: string, initial: InitiateDraft) {
  const [draft, setDraft] = useState<InitiateDraft>(initial);
  const [saveNote, setSaveNote] = useState<string | null>(null);

  // Restore after mount, so server and client render the same markup first.
  useEffect(() => {
    const t = setTimeout(() => {
      const saved = readDraft<StoredDraft>(draftKey);
      if (!saved) {
        setDraft(withToday);
        return;
      }
      const { savedAt, ...values } = saved;
      setDraft((d) => withToday({ ...d, ...values }));
      setSaveNote(`Draft restored · ${savedAt}`);
    }, 0);
    return () => clearTimeout(t);
  }, [draftKey]);

  /** Writes the draft (without files) to the session; false when storage is blocked. */
  const persist = (next: InitiateDraft) => {
    const { scope, target, effective, successor, reason, role, assessment, access, notice } = next;
    try {
      writeDraft<StoredDraft>(draftKey, { scope, target, effective, successor, reason, role, assessment, access, notice, savedAt: clock() });
      return true;
    } catch {
      return false;
    }
  };

  const set = <K extends keyof InitiateDraft>(key: K, value: InitiateDraft[K]) => {
    const next = { ...draft, [key]: value };
    setDraft(next);
    setSaveNote(persist(next) ? "Auto-saved" : "Not saved — storage blocked");
  };

  return {
    draft,
    set,
    setFiles: (files: File[]) => setDraft((d) => ({ ...d, files })),
    saveDraft: () => setSaveNote(persist(draft) ? `Draft saved · ${clock()}` : "Not saved — storage blocked"),
    clearDraft: () => removeDraft(draftKey),
    saveNote,
  };
}

/** The "today or later" rule of a date field as its note; red on a failed submit, or once the date is earlier. */
export const fromTodayNote = (value: string, error?: string) => ({ hint: error ?? "Today or later.", hintTone: error || (!!value && value < todayIso()) ? ("error" as const) : ("muted" as const) });

export function FormSection({ step, title, subtitle, tone, children }: { step: number; title: string; subtitle: string; tone: LifecycleTransition["tone"]; children: ReactNode }) {
  return (
    <section className="[&+section]:border-t [&+section]:border-line-soft">
      <div className="flex items-start gap-3 border-b border-line-soft bg-surface-alt px-5 py-3">
        <span className={cn("mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[12px] font-semibold", TONES[tone].card, TONES[tone].text)}>{step}</span>
        <div>
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          <p className="text-[12.5px] text-ink-soft">{subtitle}</p>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-4 px-5 py-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

/** A value the officer can't change here, shown as a greyed input with a lock. */
export function LockedField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <FormField label={label} htmlFor={id}>
      <Input id={id} value={value} readOnly className="bg-surface text-ink-soft" endAdornment={<Icon d={ICONS.lock} className="h-4 w-4 text-subtle" />} />
    </FormField>
  );
}

export function DocumentPicker({ title = "Supporting document", required, label, tone, files, onChange }: { title?: string; required?: boolean; label: string; tone: LifecycleTransition["tone"]; files: File[]; onChange: (files: File[]) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const add = (list: FileList | null) => {
    const picked = Array.from(list ?? []);
    const rejected = picked.filter((f) => !ACCEPTED_TYPES.includes(f.type) || f.size > MAX_SIZE_BYTES);
    setError(rejected.length ? `${rejected.map((f) => f.name).join(", ")} skipped — use PDF or JPG up to 10 MB.` : null);
    const accepted = picked.filter((f) => !rejected.includes(f) && !files.some((p) => p.name === f.name && p.size === f.size));
    if (accepted.length) onChange([...files, ...accepted]);
  };

  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <p className="text-[14px] font-medium text-ink">{title}{required && <span className="ml-1 text-danger">*</span>}</p>
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault();
          add(e.dataTransfer.files);
        }}
        className="flex flex-wrap items-center gap-3 rounded-lg border border-dashed border-gray-300 bg-surface-alt px-4 py-3"
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink-soft">
          <Icon d={ICONS.upload} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[14px] font-semibold text-ink">{label}</p>
          <p className="text-[12.5px] text-muted">PDF or JPG, up to 10 MB</p>
        </div>
        <button type="button" onClick={() => inputRef.current?.click()} className={cn("h-9 rounded-lg border bg-white px-4 text-[14px] font-semibold transition-colors", TONES[tone].button)}>
          Browse
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.jpg,.jpeg"
          className="hidden"
          onChange={(e) => {
            add(e.target.files);
            e.target.value = "";
          }}
        />
      </div>
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
      {files.map((f) => (
        <div key={`${f.name}-${f.size}`} className="flex items-center gap-3 rounded-lg border border-line px-3 py-2.5">
          <Icon d={ICONS.file} className={cn("h-4 w-4 shrink-0", TONES[tone].text)} />
          <p className="min-w-0 flex-1 truncate text-[14px] text-ink">
            {f.name} · {formatSize(f.size)}
          </p>
          <button
            type="button"
            onClick={() => onChange(files.filter((p) => p !== f))}
            aria-label={`Remove ${f.name}`}
            className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2.5 py-0.5 text-[12.5px] font-semibold text-red-700 hover:bg-red-100"
          >
            <Icon d={ICONS.close} className="h-3 w-3" /> Remove
          </button>
        </div>
      ))}
    </div>
  );
}

/** Current → after-approval card; `placeholder` stands in for the "after" line until the form has enough to show it. */
export function PreviewCard({ form, transition, draft, placeholder, pendingNote = "Pending approval", approver = APPROVER_LINE }: { form: TransitionCopy; transition: LifecycleTransition; draft: InitiateDraft; placeholder: string | null; pendingNote?: string; approver?: string }) {
  const tone = TONES[transition.tone];
  return (
    <SideCard title="Transition preview" subtitle="What changes once approved">
      <div className="flex flex-col gap-2 px-5 py-4">
        <div className="rounded-lg border border-line bg-surface px-3.5 py-2.5">
          <p className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">Current</p>
          <p className="mt-0.5 text-[15px] font-semibold text-ink">{form.previewCurrent}</p>
        </div>
        <Icon d={ICONS.arrowDown} className={cn("mx-auto h-4 w-4", tone.text)} />
        <div className={cn("rounded-lg border px-3.5 py-2.5", tone.card)}>
          <p className={cn("text-[11.5px] font-semibold uppercase tracking-wide", tone.text)}>After approval</p>
          <p className={cn("mt-0.5 text-[15px] font-semibold", placeholder ? "text-muted" : tone.text)}>{placeholder ?? form.previewAfter(draft)}</p>
          <p className="text-[12.5px] text-ink-soft">{pendingNote}</p>
        </div>
        <dl className="mt-2 flex flex-col gap-3 border-t border-line-soft pt-3">
          <MetaItem label="Effective date">{draft.effective ? formatDate(draft.effective) : "Not set"}</MetaItem>
          <MetaItem label="Approver">{approver}</MetaItem>
          <MetaItem label="Audit entry">Created automatically on submission</MetaItem>
        </dl>
      </div>
    </SideCard>
  );
}

// Full-page form for the Assignment & role transitions (transfer, promotion, specialization). Submitting opens the
// read-only review; confirming records the request ("Pending approval" in the audit trail) and opens its status page.
export function InitiateTransition({ slug }: { slug: string }) {
  const form = ASSIGNMENT_FORMS.find((f) => f.slug === slug)!;
  const transition = transitionFor(form.code)!;
  const router = useRouter();
  const submitRequest = useLifecycleHistory((s) => s.submit);
  const seq = useLifecycleHistory((s) => s.seq);
  const { draft, set, setFiles, saveDraft, clearDraft, saveNote } = useSessionDraft(`lifecycle-${form.slug}`, { ...EMPTY_DRAFT, scope: transition.scopes?.[0] ?? "" });
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);

  // On a promotion the change type decides what's required: a grade, a role, or both.
  const targetRequired = !form.role || draft.scope !== "Role change";
  const roleRequired = !!form.role && !form.role.optional && draft.scope !== "Grade promotion";
  const missing = {
    target: targetRequired && !draft.target,
    role: roleRequired && !draft.role,
    effective: !draft.effective,
    successor: !!transition.handover && !draft.successor,
    assessment: !!form.assessment && !draft.assessment,
    reason: !draft.reason.trim(),
  };
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
      { id, auditId, code: transition.code, scope, target, effective, successor, reason, role, assessment, document: file ? { name: file.name, size: file.size } : null, submittedAt: new Date().toISOString(), status: "Pending approval" },
      buildEvent(transition, draft, id)
    );
    clearDraft();
    router.push(`/lifecycle/requests/${id}`);
  };

  const scopeField = form.scopeLabel && transition.scopes && (
    <FormField key="scope" label={form.scopeLabel} htmlFor="lc-scope" required>
      <Select id="lc-scope" value={draft.scope} onChange={(e) => set("scope", e.target.value)}>
        {transition.scopes.map((s) => <option key={s} value={s}>{s}</option>)}
      </Select>
    </FormField>
  );
  const effectiveField = (
    <FormField key="effective" label="Effective date" htmlFor="lc-effective" required {...fromTodayNote(draft.effective, error("effective"))}>
      <Input id="lc-effective" type="date" min={todayIso()} value={draft.effective} onChange={(e) => set("effective", e.target.value)} />
    </FormField>
  );
  const currentField = <LockedField key="current" id="lc-current" label={form.currentLabel} value={form.currentValue} />;
  const targetField = (
    <FormField key="target" label={form.targetLabel} htmlFor="lc-target" required={targetRequired} hint={error("target")} hintTone="error">
      <Select id="lc-target" value={draft.target} onChange={(e) => set("target", e.target.value)}>
        <option value="">{targetRequired ? "Select" : "No change"}</option>
        {form.targetOptions.map((o) => <option key={o} value={o}>{o}</option>)}
      </Select>
    </FormField>
  );
  const roleFields = form.role
    ? [
        <LockedField key="current-role" id="lc-current-role" label={form.role.currentLabel} value={form.role.current} />,
        <FormField key="role" label={form.role.label} htmlFor="lc-role" required={roleRequired} hint={error("role")} hintTone="error">
          <Select id="lc-role" value={draft.role} onChange={(e) => set("role", e.target.value)}>
            <option value="">{roleRequired ? "Select" : "No change"}</option>
            {form.role.options.map((o) => <option key={o} value={o}>{o}</option>)}
          </Select>
        </FormField>,
      ]
    : [];
  // With a type picker the date sits beside it; without one, current/new lead and the date follows.
  const details = scopeField ? [scopeField, effectiveField, currentField, targetField, ...roleFields] : [currentField, targetField, effectiveField];
  const documentPicker = <DocumentPicker label={form.documentLabel} tone={transition.tone} files={draft.files} onChange={setFiles} />;
  const reasonField = (
    <FormField label="Reason for transition" htmlFor="lc-reason" required hint={error("reason")} hintTone="error" className="sm:col-span-2">
      <Textarea id="lc-reason" rows={3} value={draft.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Why is this change needed?" />
    </FormField>
  );

  let step = 1;
  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink href="/lifecycle" />
      <ProfileCard />
      <StatusCard title="Current status" transitionTone={transition.tone} />

      <TransitionHeader transition={transition} eyebrow="Initiate transition" text={form.summary} step={confirming ? 1 : 0} />

      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_350px]">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden p-0">
            <FormSection step={step++} title={form.detailsTitle} subtitle={form.detailsSubtitle} tone={transition.tone}>
              {details}
            </FormSection>
            {transition.handover && (
              <FormSection step={step++} title="Handover" subtitle="Farmers stay covered during the move." tone={transition.tone}>
                <LockedField id="lc-farmers" label="Farmers to hand over" value={LIFECYCLE_DA.farmers} />
                <FormField label="Successor DA (Bako Tibe)" htmlFor="lc-successor" required hint={error("successor")} hintTone="error">
                  <Select id="lc-successor" value={draft.successor} onChange={(e) => set("successor", e.target.value)}>
                    <option value="">Select a DA</option>
                    {SUCCESSOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </Select>
                </FormField>
              </FormSection>
            )}
            {form.assessment ? (
              <>
                <FormSection step={step++} title={form.assessment.title} subtitle={form.assessment.subtitle} tone={transition.tone}>
                  <FormField label={form.assessment.label} htmlFor="lc-assessment" required hint={error("assessment")} hintTone="error">
                    <Select id="lc-assessment" value={draft.assessment} onChange={(e) => set("assessment", e.target.value)}>
                      <option value="">{form.assessment.placeholder}</option>
                      {form.assessment.options.map((o) => <option key={o} value={o}>{o}</option>)}
                    </Select>
                  </FormField>
                  <LockedField id="lc-tenure" label={form.assessment.tenureLabel} value={form.assessment.tenure} />
                  {documentPicker}
                </FormSection>
                <FormSection step={step++} title="Reason" subtitle="Explain the reason for this transition." tone={transition.tone}>
                  {reasonField}
                </FormSection>
              </>
            ) : (
              <FormSection step={step++} title="Reason & evidence" subtitle="Explain why this transition is needed and attach supporting evidence." tone={transition.tone}>
                {reasonField}
                {documentPicker}
              </FormSection>
            )}
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
          <PreviewCard form={form} transition={transition} draft={draft} placeholder={draft.target || draft.role ? null : `Choose the ${form.targetLabel.toLowerCase()}`} />
          <SideCard title="Approval route" subtitle="Who signs off and when">
            <RouteList
              tone={transition.tone}
              steps={[
                { title: "Initiate", detail: "You · today", state: "done" },
                { title: "Review & approve", detail: APPROVER_LINE, state: "current" },
                { title: "Effective", detail: form.effectiveNote(draft.effective ? formatDate(draft.effective) : "the effective date", draft), state: "next" },
              ]}
            />
          </SideCard>
          <SideCard title="What happens next">
            <CheckList items={form.next(draft)} className={TONES[transition.tone].text} />
          </SideCard>
        </div>
      </div>

      {confirming && <ConfirmSubmitModal transition={transition} draft={draft} onBack={() => setConfirming(false)} onClose={() => setConfirming(false)} onConfirm={confirm} />}
    </div>
  );
}
