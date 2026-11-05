"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { FileDropInput } from "@/components/ui/FileDropInput";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { downloadCsv, fileDate } from "@/lib/download";
import { cn, todayIso } from "@/lib/utils";
import {
  LIFECYCLE_DA,
  SERVICE_SNAPSHOT,
  SUCCESSOR_OPTIONS,
  TRANSITION_GROUPS,
  TRANSITION_STEPS,
  assignmentFormFor,
  type LifecycleCategory,
  type LifecycleEvent,
  type LifecycleTransition,
} from "./lifecycle";
import { ConfirmSubmitModal, EMPTY_DRAFT, ICONS, Icon, ProfileCard, SectionTitle, StatusCard, StatusPill, TONES, buildEvent, type InitiateDraft } from "./shared";
import { useLifecycleHistory } from "./useLifecycleHistory";
/** Transitions with their own page outside the Assignment & role forms. */
const PAGE_LINKS: Record<string, string> = { LV: "/lifecycle/leave", RA: "/lifecycle/initiate/reactivation", RT: "/lifecycle/initiate/retirement", SP: "/lifecycle/initiate/separation" };

// Assignment & role, reactivation, retirement and separation open their full-page form, leave opens the leave history; the rest open the initiate modal in place.
function TransitionCard({ transition, onInitiate }: { transition: LifecycleTransition; onInitiate: () => void }) {
  const tone = TONES[transition.tone];
  const form = assignmentFormFor(transition.code);
  const href = PAGE_LINKS[transition.code] ?? (form && `/lifecycle/initiate/${form.slug}`);
  const buttonClass = cn("mt-1 inline-flex h-10 items-center justify-center gap-2 rounded-lg border bg-white text-[14px] font-semibold transition-colors", tone.button);
  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border p-4", tone.card)}>
      <div className="flex items-center gap-3">
        <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-md border bg-white text-[12px] font-bold", tone.code)}>{transition.code}</span>
        <h3 className="text-[15px] font-semibold text-ink">{transition.title}</h3>
      </div>
      <p className="text-[13px] text-ink-soft">{transition.description}</p>
      <span className={cn("inline-flex w-fit items-center gap-1 rounded-full border bg-white px-2.5 py-0.5 text-[12.5px] font-semibold", tone.chip)}>
        → {transition.outcome}
      </span>
      {href ? (
        <Link href={href} className={buttonClass}>
          Initiate <Icon d={ICONS.arrow} />
        </Link>
      ) : (
        <button type="button" onClick={onInitiate} className={buttonClass}>
          Initiate <Icon d={ICONS.arrow} />
        </button>
      )}
    </div>
  );
}

function TransitionsCard({ onInitiate }: { onInitiate: (t: LifecycleTransition) => void }) {
  return (
    <Card className="px-5 py-4">
      <div className="flex flex-col gap-3 border-b border-line-soft pb-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle title="Lifecycle transitions" subtitle="Initiate a governed status change. Every transition captures a reason, effective date, approver and audit entry." />
        <div className="flex shrink-0 items-center gap-2 text-[13px] text-ink-soft">
          Current status <StatusPill>{LIFECYCLE_DA.status}</StatusPill>
        </div>
      </div>
      {TRANSITION_GROUPS.map((group, i) => (
        <div key={group.category} className={cn("grid grid-cols-1 gap-4 py-5 lg:grid-cols-[200px_1fr]", i > 0 && "border-t border-line-soft")}>
          <div>
            <h3 className="text-[14px] font-semibold text-ink">{group.title}</h3>
            <p className="mt-1 text-[12.5px] text-ink-soft">{group.description}</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {group.transitions.map((t) => (
              <TransitionCard key={t.code} transition={t} onInitiate={() => onInitiate(t)} />
            ))}
          </div>
        </div>
      ))}
    </Card>
  );
}

const FILTERS: ("All" | LifecycleCategory)[] = ["All", "Assignment", "Availability", "Service"];

export function HistoryCard({ events }: { events: LifecycleEvent[] }) {
  const [filter, setFilter] = useState<(typeof FILTERS)[number]>("All");
  const shown = filter === "All" ? events : events.filter((e) => e.category === filter);

  const exportCsv = () =>
    downloadCsv(`lifecycle-audit-${LIFECYCLE_DA.name.toLowerCase().replace(/\s+/g, "-")}-${fileDate()}.csv`, events, [
      { header: "Transition", value: (e) => e.title },
      { header: "Category", value: (e) => e.category },
      { header: "Change", value: (e) => e.change },
      { header: "Reason", value: (e) => e.note },
      { header: "Effective", value: (e) => e.effective },
      { header: "Approver", value: (e) => e.approver },
      { header: "Recorded", value: (e) => e.recordedAt },
      { header: "Status", value: (e) => e.status },
    ]);

  return (
    <Card className="p-0">
      <div className="flex flex-col gap-3 px-5 pt-4 sm:flex-row sm:items-start sm:justify-between">
        <SectionTitle title="Lifecycle history & audit trail" subtitle="Every approved transition, newest first." />
        <Button variant="brand" onClick={exportCsv} className="gap-2">
          <Icon d={ICONS.download} /> Export audit CSV
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 px-5 pb-3 pt-3">
        {FILTERS.map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full border px-3 py-1 text-[13px] font-medium transition-colors",
              filter === f ? "border-brand-green-bright bg-brand-green-bright text-white" : "border-line bg-white text-ink-soft hover:bg-surface"
            )}
          >
            {f}
          </button>
        ))}
      </div>
      <ol className="border-t border-line-soft">
        {shown.map((e, i) => (
          <li key={e.id} className="relative flex gap-4 px-5 py-4 [&+li]:border-t [&+li]:border-line-soft">
            {/* Timeline rail */}
            <div className="relative flex w-3 shrink-0 justify-center pt-1.5">
              <span className={cn("relative z-10 h-2.5 w-2.5 rounded-full ring-4", TONES[e.tone].dot)} />
              {i < shown.length - 1 && <span className="absolute bottom-[-1.25rem] top-5 w-px bg-line" aria-hidden="true" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-[15px] font-semibold text-ink">{e.title}</h3>
                  <span className={cn("rounded-md border px-2 py-0.5 text-[12.5px] font-semibold", TONES[e.tone].chip, TONES[e.tone].card)}>{e.change}</span>
                </div>
                {e.status === "Approved" ? (
                  <span className="rounded-full border border-brand-border bg-brand-mint px-2.5 py-0.5 text-[12.5px] font-semibold text-brand-green">Approved</span>
                ) : e.status === "Rejected" ? (
                  <span className="rounded-full border border-danger-border bg-danger-wash px-2.5 py-0.5 text-[12.5px] font-semibold text-danger">Rejected</span>
                ) : e.status === "Withdrawn" ? (
                  <span className="rounded-full border border-slate-200 bg-surface px-2.5 py-0.5 text-[12.5px] font-semibold text-slate-600">Withdrawn</span>
                ) : (
                  <span className="rounded-full border border-warning-border bg-warning-wash px-2.5 py-0.5 text-[12.5px] font-semibold text-orange-700">Pending approval</span>
                )}
              </div>
              <p className="mt-1.5 text-[13.5px] text-ink-soft">{e.note}</p>
              <p className="mt-1 text-[12.5px] text-muted">
                Effective {e.effective} · Approver: {e.approver} · {e.recordedAt}
                {e.requestId && (
                  <>
                    {" · "}
                    <Link href={`/lifecycle/requests/${e.requestId}`} className="font-semibold text-brand-green hover:underline">
                      View request {e.requestId}
                    </Link>
                  </>
                )}
              </p>
            </div>
          </li>
        ))}
        {shown.length === 0 && <li className="px-5 py-8 text-center text-[13.5px] text-muted">No {filter.toLowerCase()} transitions on record.</li>}
      </ol>
    </Card>
  );
}

export function SnapshotCard({ transitionCount }: { transitionCount: number }) {
  const rows = [...SERVICE_SNAPSHOT, { label: "Transitions on record", value: String(transitionCount) }];
  return (
    <Card className="p-0">
      <div className="border-b border-line-soft px-5 py-4">
        <SectionTitle title="Service snapshot" subtitle="Where this DA stands today" />
      </div>
      <dl>
        {rows.map((r) => (
          <div key={r.label} className="flex items-center justify-between gap-4 px-5 py-3 text-[13.5px] [&+div]:border-t [&+div]:border-line-soft">
            <dt className="text-ink-soft">{r.label}</dt>
            <dd className="text-right font-semibold text-ink">{r.value}</dd>
          </div>
        ))}
      </dl>
    </Card>
  );
}

export function StepsCard() {
  return (
    <Card className="p-0">
      <div className="border-b border-line-soft px-5 py-4">
        <SectionTitle title="How a transition works" subtitle="Same four steps for every action" />
      </div>
      <ol className="flex flex-col px-5 py-4">
        {TRANSITION_STEPS.map((s, i) => (
          <li key={s.title} className="relative flex gap-3 pb-4 last:pb-0">
            {i < TRANSITION_STEPS.length - 1 && <span className="absolute bottom-0 left-[11px] top-7 w-px bg-brand-border" aria-hidden="true" />}
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-brand-border bg-brand-mint text-[12px] font-semibold text-brand-green">{i + 1}</span>
            <div>
              <p className="text-[14px] font-semibold text-ink">{s.title}</p>
              <p className="text-[12.5px] text-ink-soft">{s.detail}</p>
            </div>
          </li>
        ))}
      </ol>
    </Card>
  );
}

const blankDraft = (): InitiateDraft => ({ ...EMPTY_DRAFT, effective: todayIso() });

function InitiateModal({ transition, onClose, onSubmit }: { transition: LifecycleTransition | null; onClose: () => void; onSubmit: (event: LifecycleEvent) => void }) {
  const [draft, setDraft] = useState<InitiateDraft>(blankDraft);
  const [submitted, setSubmitted] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const set = <K extends keyof InitiateDraft>(key: K, value: InitiateDraft[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const close = () => {
    setDraft(blankDraft());
    setSubmitted(false);
    setConfirming(false);
    onClose();
  };

  if (!transition) return null;
  const scope = draft.scope || transition.scopes?.[0] || "";
  const missing = {
    target: !!transition.targetLabel && !draft.target.trim(),
    effective: !draft.effective,
    successor: !!transition.handover && !draft.successor,
    reason: !draft.reason.trim(),
  };
  const error = (key: keyof typeof missing) => (submitted && missing[key] ? "Required" : undefined);

  const review = () => {
    setSubmitted(true);
    if (Object.values(missing).some(Boolean)) return;
    setDraft((d) => ({ ...d, scope }));
    setConfirming(true);
  };

  const confirm = () => {
    onSubmit(buildEvent(transition, draft));
    close();
  };

  if (confirming) return <ConfirmSubmitModal transition={transition} draft={draft} onBack={() => setConfirming(false)} onClose={close} onConfirm={confirm} />;

  return (
    <Modal
      isOpen
      onClose={close}
      title={transition.title}
      subtitle={`${LIFECYCLE_DA.name} · ${LIFECYCLE_DA.status} → ${transition.outcome}`}
      icon={<span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-white text-[12px] font-bold", TONES[transition.tone].code)}>{transition.code}</span>}
      size="lg"
      bodyClassName="flex flex-col gap-4 p-4 sm:p-6"
      footer={
        <>
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button variant="brand" onClick={review}>Submit for approval</Button>
        </>
      }
    >
      {transition.scopes && (
        <FormField label="Transfer type" htmlFor="lc-scope" required>
          <Select id="lc-scope" value={scope} onChange={(e) => set("scope", e.target.value)}>
            {transition.scopes.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
      )}
      <FormField label="From" htmlFor="lc-from">
        <Input id="lc-from" value={transition.from} readOnly className="bg-surface text-ink-soft" />
      </FormField>
      {transition.targetLabel && (
        <FormField label={transition.targetLabel} htmlFor="lc-target" required hint={error("target")} hintTone="error">
          <Input id="lc-target" type={transition.code === "LV" ? "date" : "text"} value={draft.target} onChange={(e) => set("target", e.target.value)} />
        </FormField>
      )}
      <FormField label="Effective date" htmlFor="lc-effective" required hint={error("effective") ?? "Today or later."} hintTone={error("effective") || (!!draft.effective && draft.effective < todayIso()) ? "error" : "muted"}>
        <Input id="lc-effective" type="date" min={todayIso()} value={draft.effective} onChange={(e) => set("effective", e.target.value)} />
      </FormField>
      {transition.handover && (
        <FormField label="Successor DA" htmlFor="lc-successor" required hint={error("successor") ?? "Takes over the DA's farmers during the handover"} hintTone={error("successor") ? "error" : "muted"}>
          <Select id="lc-successor" value={draft.successor} onChange={(e) => set("successor", e.target.value)}>
            <option value="">Select a DA</option>
            {SUCCESSOR_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
          </Select>
        </FormField>
      )}
      <FormField label="Reason" htmlFor="lc-reason" required hint={error("reason")} hintTone="error">
        <Textarea id="lc-reason" rows={3} value={draft.reason} onChange={(e) => set("reason", e.target.value)} placeholder="Why is this change needed?" />
      </FormField>
      <FileDropInput label="Document" actionLabel="Attach order or letter" files={draft.files} onChange={(files) => set("files", files)} />
      <p className="rounded-lg border border-brand-border-soft bg-brand-wash px-3 py-2 text-[13px] text-ink-soft">
        Goes to <span className="font-semibold text-ink">{LIFECYCLE_DA.approver} — {LIFECYCLE_DA.approverName}</span> for review. The status changes only once approved, on the effective date.
      </p>
    </Modal>
  );
}

export function LifecycleWorkspace() {
  const { events, add } = useLifecycleHistory();
  const [initiating, setInitiating] = useState<LifecycleTransition | null>(null);

  // The page scrolls inside <main>, so the browser can't jump to /lifecycle#history on its own.
  useEffect(() => {
    if (window.location.hash === "#history") document.getElementById("history")?.scrollIntoView();
  }, []);

  return (
    <div className="flex w-full flex-col gap-4">
      <ProfileCard />
      <StatusCard />
      <TransitionsCard onInitiate={setInitiating} />
      <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-[1fr_340px]">
        {/* Anchor for "View lifecycle history" on the request pages */}
        <div id="history" className="scroll-mt-4">
          <HistoryCard events={events} />
        </div>
        <div className="flex flex-col gap-4">
          <SnapshotCard transitionCount={events.filter((e) => e.status === "Approved").length} />
          <StepsCard />
        </div>
      </div>
      <InitiateModal transition={initiating} onClose={() => setInitiating(null)} onSubmit={add} />
    </div>
  );
}
