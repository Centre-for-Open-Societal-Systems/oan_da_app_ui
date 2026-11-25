"use client";

// Pieces shared by the lifecycle overview, the full-page initiate form and the request pages.
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { ReactNode } from "react";
import { dateRange, durationLine, leaveBalance, leaveDays, leaveStatus, returnDate } from "./leave";
import { LIFECYCLE_DA, LIFECYCLE_STAGES, assignmentFormFor, formatDate, gradeAndRole, type LifecycleEvent, type LifecycleRequest, type LifecycleTone, type LifecycleTransition, type RequestFields } from "./lifecycle";
import { assignmentLine, eligibilityLine, returnAssignment } from "./reactivation";
import { clearanceLine, lengthOfService, retirementKind } from "./retirement";
import { APPROVERS_LINE, SEPARATION_CLEARANCE } from "./separation";
import { useLifecycleHistory } from "./useLifecycleHistory";

// Per-tone classes, written out in full so Tailwind can see them.
export const TONES: Record<LifecycleTone, { card: string; code: string; chip: string; button: string; dot: string; text: string; solid: string }> = {
  blue: { card: "border-blue-200 bg-blue-50", code: "border-blue-200 text-blue-700", chip: "border-blue-200 text-blue-700", button: "border-blue-200 text-blue-700 hover:bg-blue-50", dot: "bg-blue-600 ring-blue-100", text: "text-blue-700", solid: "border-blue-600 bg-blue-600" },
  violet: { card: "border-violet-200 bg-violet-50", code: "border-violet-200 text-violet-700", chip: "border-violet-200 text-violet-700", button: "border-violet-200 text-violet-700 hover:bg-violet-50", dot: "bg-violet-600 ring-violet-100", text: "text-violet-700", solid: "border-violet-600 bg-violet-600" },
  cyan: { card: "border-cyan-200 bg-cyan-50", code: "border-cyan-200 text-cyan-700", chip: "border-cyan-200 text-cyan-700", button: "border-cyan-200 text-cyan-700 hover:bg-cyan-50", dot: "bg-cyan-600 ring-cyan-200", text: "text-cyan-700", solid: "border-cyan-600 bg-cyan-600" },
  amber: { card: "border-amber-200 bg-yellow-50", code: "border-amber-200 text-amber-700", chip: "border-amber-200 text-amber-700", button: "border-amber-200 text-amber-700 hover:bg-yellow-50", dot: "bg-amber-500 ring-amber-100", text: "text-amber-700", solid: "border-amber-500 bg-amber-500" },
  orange: { card: "border-orange-200 bg-orange-50", code: "border-orange-200 text-orange-700", chip: "border-orange-200 text-orange-700", button: "border-orange-200 text-orange-700 hover:bg-orange-50", dot: "bg-orange-500 ring-orange-100", text: "text-orange-700", solid: "border-orange-500 bg-orange-500" },
  rose: { card: "border-rose-200 bg-rose-50", code: "border-rose-200 text-rose-700", chip: "border-rose-200 text-rose-700", button: "border-rose-200 text-rose-700 hover:bg-rose-50", dot: "bg-rose-700 ring-rose-100", text: "text-rose-700", solid: "border-rose-700 bg-rose-700" },
  red: { card: "border-red-200 bg-red-50", code: "border-red-200 text-red-700", chip: "border-red-200 text-red-700", button: "border-red-200 text-red-700 hover:bg-red-50", dot: "bg-red-500 ring-red-50", text: "text-red-700", solid: "border-red-500 bg-red-500" },
  green: { card: "border-brand-border bg-brand-mint", code: "border-brand-border text-brand-green", chip: "border-brand-border-soft bg-brand-mint text-brand-green", button: "border-brand-border text-brand-green hover:bg-brand-wash", dot: "bg-brand-green ring-brand-tint", text: "text-brand-green", solid: "border-brand-green bg-brand-green" },
};

export const ICONS = {
  pin: "M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z",
  phone: "M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z",
  mail: "M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6",
  arrow: "M5 12h14M13 6l6 6-6 6",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  lock: "M5 11h14a2 2 0 012 2v7a2 2 0 01-2 2H5a2 2 0 01-2-2v-7a2 2 0 012-2zM7 11V7a5 5 0 0110 0v4",
  file: "M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8zM14 2v6h6M16 13H8M16 17H8",
  check: "M20 6L9 17l-5-5",
  close: "M18 6L6 18M6 6l12 12",
  arrowDown: "M12 5v14M19 12l-7 7-7-7",
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2z",
};

export function Icon({ d, className = "h-4 w-4" }: { d: string; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  );
}

/** Green "Active"-style pill with a filled check, as used for every completed status. */
export function StatusPill({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <span className={cn("inline-flex w-fit items-center gap-1.5 whitespace-nowrap rounded-full border border-brand-border bg-brand-mint px-2.5 py-0.5 text-[13px] font-semibold text-brand-green", className)}>
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.2 14.2l-4-4 1.4-1.4 2.6 2.6 5.6-5.6 1.4 1.4-7 7z" />
      </svg>
      {children}
    </span>
  );
}

export function SectionTitle({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div>
      <h2 className="text-[17px] font-semibold text-ink">{title}</h2>
      {subtitle && <p className="mt-0.5 text-[13px] text-ink-soft">{subtitle}</p>}
    </div>
  );
}

export function ProfileCard() {
  const da = LIFECYCLE_DA;
  return (
    <Card className="p-0">
      <div className="flex items-center gap-4 px-5 py-4">
        <span className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-brand-green-bright text-[24px] font-bold text-white">{da.initials}</span>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-[20px] font-bold tracking-tight text-ink sm:text-2xl">DA Lifecycle - {da.name}</h1>
            <StatusPill>{da.status}</StatusPill>
          </div>
          <p className="mt-0.5 text-[14px] text-ink-soft">{da.role}</p>
        </div>
      </div>
      <div className="flex flex-wrap gap-x-8 gap-y-2 border-t border-line-soft px-5 py-3 text-[13.5px] text-ink-soft">
        <span className="flex items-center gap-2"><Icon d={ICONS.pin} className="h-4 w-4 text-muted" />{da.location}</span>
        <a href={`tel:${da.phone.replace(/\s/g, "")}`} className="flex items-center gap-2 hover:text-brand-green"><Icon d={ICONS.phone} className="h-4 w-4 text-muted" />{da.phone}</a>
        <a href={`mailto:${da.email}`} className="flex items-center gap-2 hover:text-brand-green"><Icon d={ICONS.mail} className="h-4 w-4 text-muted" />{da.email}</a>
      </div>
    </Card>
  );
}

/** `transitionTone` highlights the Transition stage while a transition is being initiated. */
export function StatusCard({ title = "Lifecycle status", transitionTone }: { title?: string; transitionTone?: LifecycleTone }) {
  const da = LIFECYCLE_DA;
  const label = "text-[12px] font-semibold uppercase tracking-wide text-muted";
  return (
    <Card className="p-0">
      <div className="border-b border-line-soft px-5 py-4">
        <SectionTitle title={title} />
      </div>
      <div className="flex flex-col gap-5 px-5 py-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="flex flex-col gap-1.5">
          <p className={label}>Current status</p>
          <StatusPill>{da.status}</StatusPill>
          <p className="text-[13px] text-ink-soft">since {da.statusSince}</p>
        </div>
        <div className="flex flex-col gap-1.5">
          <p className={label}>Lifecycle stage</p>
          <ol className="flex flex-wrap items-center gap-1.5">
            {LIFECYCLE_STAGES.map((stage, i) => (
              <li key={stage.label} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-[12px] text-subtle" aria-hidden="true">›</span>}
                {stage.done ? (
                  <StatusPill>{stage.label}</StatusPill>
                ) : stage.label === "Transition" && transitionTone ? (
                  <span className={cn("inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-[13px] font-semibold", TONES[transitionTone].card, TONES[transitionTone].text)}>
                    {stage.label}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-slate-200 bg-slate-100 px-2.5 py-0.5 text-[13px] font-semibold text-slate-600">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-600" aria-hidden="true" />
                    {stage.label}
                  </span>
                )}
              </li>
            ))}
          </ol>
        </div>
        <div className="flex flex-col gap-1 lg:items-end lg:text-right">
          <p className={label}>Assignment & approver</p>
          <p className="text-[14px] font-medium text-ink">{da.location}</p>
          <p className="text-[13px] text-ink-soft">Approver: {da.approver}</p>
        </div>
      </div>
    </Card>
  );
}


export { formatDate, formatDateTime } from "./lifecycle";
export const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);
export const BELL_ICON = "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0";

export interface InitiateDraft extends RequestFields {
  files: File[];
}

export const EMPTY_DRAFT: InitiateDraft = { scope: "", target: "", effective: "", successor: "", reason: "", role: "", assessment: "", access: "", notice: "", files: [] };

/** The "Pending approval" history entry a confirmed request becomes. */
export function buildEvent(transition: LifecycleTransition, draft: InitiateDraft, requestId?: string): LifecycleEvent {
  const now = new Date();
  const file = draft.files[0];
  return {
    id: requestId ?? `LC-${now.getTime()}`,
    title: transition.title,
    category: transition.category,
    change: `${transition.from} → ${destination(transition, draft)}`,
    tone: transition.tone,
    note: [draft.reason.trim(), transition.handover && `${transition.code === "LV" ? "Interim cover" : "Successor"}: ${draft.successor}.`, file && `Document: ${file.name}.`].filter(Boolean).join(" "),
    effective: formatDate(draft.effective),
    approver: LIFECYCLE_DA.approverName,
    recordedAt: `${formatDate(now.toISOString())} · ${now.toTimeString().slice(0, 5)}`,
    status: "Pending approval",
    requestId,
  };
}

/** "To" in the summary: the new value the officer typed, or the status the transition leads to. */
export function destination(transition: LifecycleTransition, fields: RequestFields) {
  if (transition.code === "LV" && fields.target) return `${leaveStatus(fields.scope)} · until ${formatDate(fields.target)}`;
  if (transition.code === "RA") return `Active · ${returnAssignment(fields.target).split(",")[0]}`;
  // A specialization's advisory focus follows the domain, so the domain alone names the destination.
  const value = transition.code === "SC" ? fields.target : gradeAndRole(fields);
  return value.trim() || transition.outcome;
}

export const APPROVER_LINE = `${LIFECYCLE_DA.approver} — ${LIFECYCLE_DA.approverName.replace(" (Woreda)", "")}`;

const change = (current: string, next: string) => (next ? `${current} → ${next}` : `${current} (no change)`);

/** From/To rows; a promotion or specialization shows each change on its own row ("DA II → DA III"). */
function changeRows(transition: LifecycleTransition, fields: RequestFields) {
  const form = assignmentFormFor(transition.code);
  if (!form?.changeLabel) return [{ label: "From", value: transition.from }, { label: "To", value: destination(transition, fields) }];
  return [
    { label: form.changeLabel, value: change(form.currentValue, fields.target) },
    ...(form.role ? [{ label: form.role.rowLabel, value: change(form.role.current, fields.role) }] : []),
  ];
}

const documentLine = (document: { name: string; size: number } | null, extraFiles: number) =>
  document ? `${document.name} · ${formatSize(document.size)}${extraFiles ? ` (+${extraFiles} more)` : ""}` : "None attached";

/** Leave rows: dates, duration, return, cover, access and the balance before and after. */
function leaveRows(fields: RequestFields, document: { name: string; size: number } | null, extraFiles: number) {
  // A submitted request only counts the requests raised before it; a draft counts all of them.
  const saved = "id" in fields ? (fields as LifecycleRequest) : undefined;
  const balance = leaveBalance(fields.scope, Object.values(useLifecycleHistory.getState().requests), { excludeId: saved?.id, before: saved?.submittedAt });
  const days = leaveDays(fields.effective, fields.target, fields.halfStart, fields.halfEnd);
  return [
    { label: "Dates", value: dateRange(fields.effective, fields.target, true) },
    { label: "Duration", value: durationLine(fields.effective, fields.target) },
    { label: "Return to work", value: formatDate(returnDate(fields.target)) },
    { label: "Interim cover", value: fields.successor },
    { label: "System access", value: `${fields.access} during leave` },
    { label: "Leave balance", value: balance ? `${balance.left} days now → ${balance.left - days} days after approval` : "Not deducted from a leave balance" },
    { label: "Reason", value: fields.reason.trim() },
    ...(document ? [{ label: "Document", value: documentLine(document, extraFiles) }] : []),
    { label: "Approver", value: APPROVER_LINE },
  ];
}

/** The request summary rows shown on the confirm modal and on the submitted request page. */
export function summaryRows(transition: LifecycleTransition, fields: RequestFields, document: { name: string; size: number } | null, extraFiles = 0) {
  const form = assignmentFormFor(transition.code);
  const head = [
    { label: "DA", value: `${LIFECYCLE_DA.name} — ${LIFECYCLE_DA.role}` },
    { label: "Transition", value: form?.transitionLine ?? (fields.scope ? `${transition.title.split(" /")[0]} · ${fields.scope.replace(/ \(.*\)$/, "")}` : transition.title) },
  ];
  if (transition.code === "LV" && fields.target) return [...head, ...leaveRows(fields, document, extraFiles)];
  if (transition.code === "SP")
    return [
      head[0],
      { label: "Transition", value: `${transition.title} · ${fields.scope}` },
      { label: "Last working day", value: formatDate(fields.effective) },
      { label: "Notice period", value: fields.notice ?? "" },
      { label: "Successor DA", value: fields.successor },
      { label: "Clearance", value: clearanceLine(SEPARATION_CLEARANCE) },
      { label: "Reason", value: fields.reason.trim() },
      ...(document ? [{ label: "Document", value: documentLine(document, extraFiles) }] : []),
      { label: "Approvers", value: APPROVERS_LINE },
    ];
  if (transition.code === "RT")
    return [
      head[0],
      { label: "Transition", value: `${transition.title} · ${retirementKind(fields.scope)}` },
      { label: "Last working day", value: formatDate(fields.effective) },
      { label: "Length of service", value: lengthOfService(fields.effective) },
      { label: "Successor DA", value: fields.successor },
      { label: "Clearance", value: clearanceLine() },
      { label: "Reason", value: fields.reason.trim() },
      ...(document ? [{ label: "Document", value: documentLine(document, extraFiles) }] : []),
      { label: "Approver", value: APPROVER_LINE },
    ];
  if (transition.code === "RA")
    return [
      head[0],
      { label: "Transition", value: `${transition.title} · ${transition.from} → ${transition.outcome}` },
      { label: "Effective date", value: formatDate(fields.effective) },
      { label: "Assignment", value: assignmentLine(fields.target) },
      { label: "Eligibility", value: eligibilityLine(!!document) },
      { label: "Document", value: documentLine(document, extraFiles) },
      { label: "Reason", value: fields.reason.trim() },
      { label: "Approver", value: APPROVER_LINE },
    ];
  return [
    ...head,
    ...changeRows(transition, fields),
    { label: "Effective date", value: formatDate(fields.effective) },
    ...(transition.handover ? [{ label: "Successor DA", value: fields.successor }] : []),
    ...(fields.assessment ? [{ label: form?.assessment?.rowLabel ?? "Assessment", value: fields.assessment }] : []),
    { label: "Reason", value: fields.reason.trim() },
    { label: "Document", value: documentLine(document, extraFiles) },
    { label: "Approver", value: APPROVER_LINE },
  ];
}

/** Label/value rows with dividers; `boxed` draws them in a grey panel as on the confirm modal. */
export function DetailRows({ rows, boxed }: { rows: { label: string; value: ReactNode }[]; boxed?: boolean }) {
  return (
    <dl className={cn(boxed ? "rounded-xl border border-line bg-surface px-4" : "px-5")}>
      {rows.map((r) => (
        <div key={r.label} className={cn("grid grid-cols-1 gap-1 py-3 text-[14px] sm:grid-cols-[150px_1fr] sm:gap-4", boxed ? "[&+div]:border-t [&+div]:border-line" : "[&+div]:border-t [&+div]:border-line-soft")}>
          <dt className="text-muted">{r.label}</dt>
          <dd className="text-ink">{r.value}</dd>
        </div>
      ))}
    </dl>
  );
}

const STEPS = ["Details", "Review", "Approval", "Effective"];

/** Details → Review → Approval → Effective; steps before `current` show a tick. */
export function Stepper({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2.5 gap-y-2 lg:shrink-0 lg:flex-nowrap">
      {STEPS.map((label, i) => (
        <li key={label} className="flex items-center gap-2.5">
          {i > 0 && <span className={cn("hidden h-px w-6 sm:block", i <= current ? "h-0.5 bg-brand-green-bright" : "bg-line")} aria-hidden="true" />}
          <span className="flex items-center gap-2" aria-current={i === current ? "step" : undefined}>
            <span
              className={cn(
                "flex h-7 w-7 items-center justify-center rounded-full border text-[13px] font-semibold",
                i < current ? "border-brand-green-bright bg-brand-green-bright text-white" : i === current ? "border-brand-green-bright bg-brand-green-bright text-white ring-4 ring-brand-tint" : "border-line bg-white text-muted"
              )}
            >
              {i < current ? <Icon d={ICONS.check} className="h-3.5 w-3.5" /> : i + 1}
            </span>
            <span className={cn("text-[14px]", i === current ? "font-semibold text-ink" : "text-ink-soft")}>{label}</span>
          </span>
        </li>
      ))}
    </ol>
  );
}

/** Code tile + eyebrow + title + one line, with the stepper on the right. */
export function TransitionHeader({ transition, eyebrow, text, step }: { transition: LifecycleTransition; eyebrow: string; text: string; step: number }) {
  const tone = TONES[transition.tone];
  return (
    <Card className="flex flex-col gap-4 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
      <div className="flex min-w-0 flex-1 items-start gap-4">
        <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border text-[15px] font-bold", tone.card, tone.code)}>{transition.code}</span>
        <div className="min-w-0">
          <p className={cn("text-[12px] font-semibold uppercase tracking-wide", tone.text)}>{eyebrow}</p>
          <h1 className="text-[22px] font-bold tracking-tight text-ink">{transition.title}</h1>
          <p className="max-w-[560px] text-[13.5px] text-ink-soft">{text}</p>
        </div>
      </div>
      <Stepper current={step} />
    </Card>
  );
}

export function SideCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <Card className="p-0">
      <div className="border-b border-line-soft px-5 py-4">
        <SectionTitle title={title} subtitle={subtitle} />
      </div>
      {children}
    </Card>
  );
}

export type RouteStep = { title: string; detail: string; state: "done" | "current" | "next" };

/** Vertical step list: ticked, ringed (in progress) or empty. */
export function RouteList({ steps, tone }: { steps: RouteStep[]; tone: LifecycleTone }) {
  const [border, bg] = TONES[tone].solid.split(" ");
  return (
    <ol className="flex flex-col px-5 py-4">
      {steps.map((s, i) => (
        <li key={s.title} className="relative flex gap-3 pb-5 last:pb-0">
          {i < steps.length - 1 && <span className="absolute bottom-0 left-[11px] top-7 w-px bg-line" aria-hidden="true" />}
          {s.state === "done" ? (
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-white", border, bg)}>
              <Icon d={ICONS.check} className="h-3.5 w-3.5" />
            </span>
          ) : s.state === "current" ? (
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 bg-white", border)}>
              <span className={cn("h-2.5 w-2.5 rounded-full", bg)} />
            </span>
          ) : (
            <span className="h-6 w-6 shrink-0 rounded-full border border-gray-300 bg-white" />
          )}
          <div>
            <p className="text-[14px] font-semibold text-ink">{s.title}</p>
            <p className="text-[12.5px] text-ink-soft">{s.detail}</p>
          </div>
        </li>
      ))}
    </ol>
  );
}

/** Ticked bullet list ("What happens next", "While you wait" …). */
export function CheckList({ items, className = "text-brand-green" }: { items: string[]; className?: string }) {
  return (
    <ul className="flex flex-col gap-3 px-5 py-4">
      {items.map((line) => (
        <li key={line} className="flex gap-2.5 text-[13.5px] text-ink-soft">
          <Icon d={ICONS.check} className={cn("mt-0.5 h-4 w-4 shrink-0", className)} />
          {line}
        </li>
      ))}
    </ul>
  );
}

export const INFO_ICON = "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01";

export const WARNING_ICON = "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01";

const NOTE_TONES = {
  info: { box: "border-sky-200 bg-sky-50", text: "text-sky-700", icon: INFO_ICON },
  danger: { box: "border-red-200 bg-red-50", text: "text-red-700", icon: WARNING_ICON },
};

/** Light-blue (or red warning) note with an icon: a bold first line and a detail line. */
export function InfoNote({ title, tone = "info", children }: { title: string; tone?: keyof typeof NOTE_TONES; children: ReactNode }) {
  const t = NOTE_TONES[tone];
  return (
    <div className={cn("flex items-start gap-3 rounded-xl border px-4 py-3", t.box)}>
      <Icon d={t.icon} className={cn("mt-0.5 h-4 w-4 shrink-0", t.text)} />
      <div>
        <p className={cn("text-[14px] font-semibold", t.text)}>{title}</p>
        <p className="text-[13px] text-ink-soft">{children}</p>
      </div>
    </div>
  );
}

/** One-of-three choice as a segmented control (system access, notice period …). */
export function SegmentedField({ id, label, options, value, onChange, tone }: { id: string; label: string; options: string[]; value: string; onChange: (value: string) => void; tone: LifecycleTone }) {
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <p id={`${id}-label`} className="text-[14px] font-medium text-ink">{label}</p>
      <div role="radiogroup" aria-labelledby={`${id}-label`} className="grid gap-1 rounded-lg bg-surface p-1" style={{ gridTemplateColumns: `repeat(${options.length}, minmax(0, 1fr))` }}>
        {options.map((o) => (
          <button
            key={o}
            type="button"
            role="radio"
            aria-checked={value === o}
            onClick={() => onChange(o)}
            className={cn("h-9 rounded-md border text-[14px] transition-colors", value === o ? cn(TONES[tone].code, "bg-white font-semibold shadow-sm") : "border-transparent text-ink-soft hover:text-ink")}
          >
            {o}
          </button>
        ))}
      </div>
    </div>
  );
}

export type CheckItem = { label: string; status: string; passed: boolean; alert?: boolean };

/** Read-only checklist (eligibility, clearance): ticked items in the transition's colour, open ones greyed. */
export function ChecklistField({ label, items, tone, error }: { label: string; items: CheckItem[]; tone: LifecycleTone; error?: string }) {
  const [border, bg] = TONES[tone].solid.split(" ");
  return (
    <div className="flex flex-col gap-2 sm:col-span-2">
      <p className="text-[14px] font-medium text-ink">{label}</p>
      <ul className="rounded-lg border border-line">
        {items.map((c) => (
          <li key={c.label} className="flex items-center gap-3 px-3.5 py-2.5 text-[14px] [&+li]:border-t [&+li]:border-line-soft">
            <span className={cn("flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded border", c.passed ? cn(border, bg, "text-white") : "border-gray-300 bg-white")} aria-hidden="true">
              {c.passed && <Icon d={ICONS.check} className="h-3 w-3" />}
            </span>
            <span className="flex-1 text-ink">{c.label}</span>
            <span className={cn("text-[13px]", c.passed ? TONES[tone].text : c.alert ? "text-danger" : "text-muted")}>{c.status}</span>
          </li>
        ))}
      </ul>
      {error && <p className="text-[12.5px] text-danger">{error}</p>}
    </div>
  );
}

/** Small uppercase label over a value, as in the side panels. */
export function MetaItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[11.5px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
      <dd className="mt-0.5 text-[14px] text-ink">{children}</dd>
    </div>
  );
}

// Read-only review of the request before it goes to the approver; once confirmed it can't be edited.
export function ConfirmSubmitModal({ transition, draft, note, onBack, onClose, onConfirm }: { transition: LifecycleTransition; draft: InitiateDraft; note?: ReactNode; onBack: () => void; onClose: () => void; onConfirm: () => void }) {
  const file = draft.files[0];
  const rows = summaryRows(transition, draft, file ? { name: file.name, size: file.size } : null, Math.max(0, draft.files.length - 1));
  const tone = TONES[transition.tone];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Submit ${transition.title.toLowerCase()} for approval?`}
      subtitle="Please review the details below. You can't edit the request after it is submitted."
      icon={<span className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border text-[14px] font-bold", tone.card, tone.code)}>{transition.code}</span>}
      size="xl"
      bodyClassName="p-4 sm:px-6 sm:py-5"
      footer={
        <>
          <p className="mr-auto flex w-full items-center gap-2 text-[13px] text-muted sm:w-auto">
            <Icon d={BELL_ICON} /> The approver is notified straight away.
          </p>
          <Button variant="outline" onClick={onBack}>Cancel</Button>
          <Button variant="brand" onClick={onConfirm} className="gap-2">
            Confirm & submit <Icon d={ICONS.arrow} />
          </Button>
        </>
      }
    >
      <p className="mb-2.5 text-[12px] font-semibold uppercase tracking-wide text-muted">Request summary</p>
      <DetailRows rows={rows} boxed />
      {note && <div className="mt-4">{note}</div>}
    </Modal>
  );
}
