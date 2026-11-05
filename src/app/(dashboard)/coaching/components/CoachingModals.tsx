"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { cn, todayIso } from "@/lib/utils";
import {
  COACHING_AGENT,
  COACHING_FOCUS_OPTIONS,
  COACHING_PROGRESS,
  ENTRY_ID,
  type CoachingEntry,
} from "@/features/performance";

const Icon = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const CHECK = "M5 13l4 4L19 7";
const SHARE = "M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4";

export const longDate = (iso: string) => (iso ? new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }) : "Not set");
const plural = (n: number, one: string, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;

// ---------- Coaching entry saved ----------

export function SavedModal({ sessionDate, entry, savedAt, onClose, onShare }: { sessionDate: string; entry: CoachingEntry; savedAt: string; onClose: () => void; onShare: () => void }) {
  const lines = [
    `Feedback and ${plural(entry.focus.length, "focus area")}`,
    `${plural(entry.improvements.length, "improvement area")} and ${plural(entry.recommendations.length, "recommendation")}`,
    `${plural(entry.actions.length, "next action")} · review date ${longDate(entry.reviewDate)}`,
  ];
  return (
    <Modal isOpen onClose={onClose} title="Coaching entry saved" hideHeader size="md" bodyClassName="p-6">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-[74px] w-[74px] items-center justify-center rounded-full bg-brand-mint">
          <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand-green"><Icon d={CHECK} className="h-7 w-7" /></span>
        </span>
        <h2 id="modal-title" className="mt-4 text-[22px] font-bold text-ink">Coaching entry saved</h2>
        <p className="mt-3 text-[14px] text-ink-soft">Session {sessionDate} · {COACHING_AGENT.name} · Entry {ENTRY_ID}</p>
      </div>

      <div className="mt-5 rounded-xl border border-line bg-surface px-4 py-3.5 text-left">
        <p className="text-[12.5px] font-semibold text-slate-600">Saved just now · {savedAt}</p>
        <ul className="mt-2.5 flex flex-col gap-2 text-[14px] text-ink">
          {lines.map((l) => (
            <li key={l} className="flex items-center gap-2.5"><Icon d={CHECK} className="h-4 w-4 shrink-0 text-brand-green" />{l}</li>
          ))}
        </ul>
      </div>

      <p className="mt-3.5 flex items-center gap-2.5 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-2.5 text-[13.5px] text-blue-700">
        <Icon d="M5 11h14v10H5zM8 11V7a4 4 0 018 0v4" className="h-4 w-4 shrink-0" />
        Only you can see this entry. {COACHING_AGENT.first} sees it after you share it.
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Button variant="outline" className="h-11 font-semibold" onClick={onClose}>Done</Button>
        <Button variant="brand" className="h-11 gap-2" onClick={onShare}><Icon d={SHARE} /> Share with {COACHING_AGENT.first}</Button>
      </div>
    </Modal>
  );
}

// ---------- Share with the agent ----------

type SharePart = "feedback" | "improvements" | "recommendations" | "actions" | "progress";
const CHANNELS = [
  { key: "app", label: "In-app notification", d: "M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" },
  { key: "email", label: "Email", d: "M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6" },
  { key: "sms", label: "SMS", d: "M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" },
] as const;

export function ShareModal({ sessionDate, entry, onClose, onShare }: { sessionDate: string; entry: CoachingEntry; onClose: () => void; onShare: (summary: string) => void }) {
  const [parts, setParts] = useState<Set<SharePart>>(new Set(["feedback", "improvements", "recommendations", "actions"]));
  const [channels, setChannels] = useState<Set<string>>(new Set(["app", "email"]));
  const [message, setMessage] = useState("Great progress this cycle. Let's review the actions together on December 18.");

  const mine = entry.actions.filter((a) => a.owner === COACHING_AGENT.first).length;
  const rows: { key: SharePart; label: string; hint: string }[] = [
    { key: "feedback", label: "Feedback", hint: entry.feedbackTitle || "No feedback yet" },
    { key: "improvements", label: "Improvement areas", hint: plural(entry.improvements.length, "item") },
    { key: "recommendations", label: "Recommendations", hint: plural(entry.recommendations.length, "item") },
    { key: "actions", label: `Next actions assigned to ${COACHING_AGENT.first}`, hint: `${mine} of ${plural(entry.actions.length, "item")}` },
    { key: "progress", label: "Progress since last session", hint: plural(COACHING_PROGRESS.metrics.length, "metric") },
  ];
  const toggle = <T,>(set: Set<T>, v: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(v)) next.delete(v);
    else next.add(v);
    setter(next);
  };
  const valid = parts.size > 0 && channels.size > 0;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Share with ${COACHING_AGENT.name}`}
      subtitle={`Coaching session ${sessionDate} · Entry ${ENTRY_ID}`}
      size="lg"
      bodyClassName="p-6"
      icon={<span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand-green"><Icon d={SHARE} className="h-5 w-5" /></span>}
    >
      <p className="text-[14px] leading-relaxed text-ink-soft">
        {COACHING_AGENT.first} will see the entry in her Coaching workspace as view-only. She can tick her own next actions and acknowledge it.
      </p>

      <p className="mt-4 text-[13.5px] font-semibold text-ink">What to share</p>
      <div className="mt-2 flex flex-col gap-2">
        {rows.map((r) => {
          const on = parts.has(r.key);
          return (
            <label key={r.key} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-3.5 py-2.5 text-[14px] text-ink", on ? "border-brand-border bg-brand-wash" : "border-line bg-white")}>
              <Checkbox checked={on} onChange={() => toggle(parts, r.key, setParts)} />
              <span className="flex-1 font-medium">{r.label}</span>
              <span className="text-[12.5px] text-muted">{r.hint}</span>
            </label>
          );
        })}
      </div>

      <p className="mt-4 text-[13.5px] font-semibold text-ink">Notify {COACHING_AGENT.first}</p>
      <div className="mt-2 flex flex-wrap gap-2.5">
        {CHANNELS.map((c) => {
          const on = channels.has(c.key);
          return (
            <label key={c.key} className={cn("flex cursor-pointer items-center gap-2.5 rounded-lg border px-3.5 py-2.5 text-[14px] text-ink", on ? "border-brand-border bg-brand-wash" : "border-line bg-white")}>
              <Checkbox checked={on} onChange={() => toggle(channels, c.key, setChannels)} />
              <Icon d={c.d} className="h-4 w-4 text-slate-600" />
              {c.label}
            </label>
          );
        })}
      </div>

      <FormField label={`Message to ${COACHING_AGENT.first} (optional)`} htmlFor="share-message" className="mt-4">
        <Textarea id="share-message" rows={3} value={message} onChange={(e) => setMessage(e.target.value)} className="rounded-lg border-line" />
      </FormField>

      <p className="mt-4 flex items-center gap-2.5 rounded-lg border border-warning-border bg-warning-wash px-3.5 py-2.5 text-[13.5px] text-orange-800">
        <Icon d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 8v4M12 16h.01" className="h-4 w-4 shrink-0" />
        Unsaved changes are saved first. Sharing is recorded on the coaching history.
      </p>

      <div className="mt-4 flex justify-end gap-3">
        <Button variant="outline" className="h-11 px-6 font-semibold" onClick={onClose}>Cancel</Button>
        <Button
          variant="brand"
          className="h-11 gap-2 px-5"
          disabled={!valid}
          onClick={() => {
            onShare(`${plural(parts.size, "section")} shared with ${COACHING_AGENT.first}`);
            onClose();
          }}
        >
          <Icon d={SHARE} /> Share with {COACHING_AGENT.first}
        </Button>
      </div>
    </Modal>
  );
}

// ---------- New session ----------

export function NewSessionModal({ onClose, onCreate }: { onClose: () => void; onCreate: (s: { date: string; topic: string; focus: string[] }) => void }) {
  const [date, setDate] = useState(() => todayIso());
  const [topic, setTopic] = useState("");
  const [focus, setFocus] = useState<Set<string>>(new Set());
  const valid = date !== "" && topic.trim() !== "";

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="New coaching session"
      subtitle={`With ${COACHING_AGENT.name}`}
      size="md"
      bodyClassName="p-5"
      footer={
        <>
          <Button variant="outline" className="px-5 font-semibold" onClick={onClose}>Cancel</Button>
          <Button
            variant="brand"
            className="px-5"
            disabled={!valid}
            onClick={() => {
              onCreate({ date: longDate(date).replace(/^(\w{3})\w*/, "$1"), topic: topic.trim(), focus: [...focus] });
              onClose();
            }}
          >
            Schedule session
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Session date" htmlFor="ns-date" required><Input id="ns-date" type="date" min={todayIso()} value={date} onChange={(e) => setDate(e.target.value)} /></FormField>
        <FormField label="Topic" htmlFor="ns-topic" required><Input id="ns-topic" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="What will you work on together?" /></FormField>
        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-medium text-ink">Focus areas</p>
          <div className="flex flex-wrap gap-2">
            {COACHING_FOCUS_OPTIONS.map((f) => {
              const on = focus.has(f);
              return (
                <button
                  key={f}
                  type="button"
                  aria-pressed={on}
                  onClick={() => setFocus((prev) => { const next = new Set(prev); if (next.has(f)) next.delete(f); else next.add(f); return next; })}
                  className={cn("rounded-full border px-3.5 py-1.5 text-[13.5px] transition-colors", on ? "border-brand-border bg-brand-mint font-medium text-brand-green" : "border-line bg-white text-ink hover:bg-surface")}
                >
                  {f}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </Modal>
  );
}
