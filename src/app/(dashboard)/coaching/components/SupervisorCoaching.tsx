"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Input } from "@/components/ui/Input";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Pill } from "@/components/ui/Pill";
import { Textarea } from "@/components/ui/Textarea";
import { cn, todayIso } from "@/lib/utils";
import {
  COACHING_AGENT,
  COACHING_PROGRESS,
  COACHING_SESSIONS,
  COACHING_SUPERVISOR,
  EMPTY_ENTRY,
  SAMPLE_ENTRY,
  type CoachingEntry,
  type CoachingItem,
  type CoachingSession,
} from "@/features/performance";
import { NewSessionModal, SavedModal, ShareModal } from "./CoachingModals";

const Icon = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const todayLabel = () => new Date().toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="overflow-hidden rounded-xl border border-line">
      <h3 className="border-b border-line bg-surface px-4 py-2.5 text-[13.5px] font-semibold text-ink">{title}</h3>
      {children}
    </section>
  );
}

// Checklist rows (improvement areas / next actions) with an owner pill, a date and an add-row input.
function Checklist({ items, onChange, owner, placeholder }: { items: CoachingItem[]; onChange: (items: CoachingItem[]) => void; owner: string; placeholder: string }) {
  const [draft, setDraft] = useState("");
  const add = () => {
    if (!draft.trim()) return;
    onChange([...items, { id: `n-${Date.now()}`, text: draft.trim(), owner, date: todayLabel(), done: false }]);
    setDraft("");
  };
  return (
    <>
      <ul>
        {items.map((it) => (
          <li key={it.id} className="flex items-center gap-3 border-b border-line-soft px-4 py-3 last:border-b-0">
            <Checkbox checked={it.done} onChange={() => onChange(items.map((x) => (x.id === it.id ? { ...x, done: !x.done } : x)))} aria-label={it.text} />
            <span className={cn("min-w-0 flex-1 text-[13.5px] text-ink", it.done && "text-ink-soft line-through")}>{it.text}</span>
            <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[12.5px] font-semibold text-blue-700">{it.owner}</span>
            <span className="hidden whitespace-nowrap text-[12.5px] text-muted sm:block">{it.date}</span>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 border-t border-line-soft px-4 py-2.5">
        <Input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && add()} placeholder={placeholder} className="h-9 text-[13.5px]" />
        <Button variant="outline" size="sm" className="shrink-0 font-semibold" onClick={add} disabled={!draft.trim()}>Add</Button>
      </div>
    </>
  );
}

// Supervisor's Coaching workspace for one agent: sessions on the left, the active session's entry on the right.
export function SupervisorCoaching() {
  const a = COACHING_AGENT;
  const [sessions, setSessions] = useState<CoachingSession[]>(COACHING_SESSIONS);
  const [selectedId, setSelectedId] = useState(COACHING_SESSIONS[0].id);
  const [entries, setEntries] = useState<Record<string, CoachingEntry>>({ [COACHING_SESSIONS[0].id]: SAMPLE_ENTRY });
  const [newRec, setNewRec] = useState("");
  const [creating, setCreating] = useState(false);
  const [saved, setSaved] = useState<{ at: string } | null>(null);
  const [sharing, setSharing] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const session = sessions.find((s) => s.id === selectedId) ?? sessions[0];
  const entry = entries[session.id];
  const patch = (p: Partial<CoachingEntry>) => entry && setEntries((prev) => ({ ...prev, [session.id]: { ...entry, ...p } }));
  const active = session.status === "Scheduled";

  const save = () => {
    const at = new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit", hour12: false }).replace(",", "");
    setSaved({ at });
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-[26px] font-bold tracking-tight text-ink">Coaching · {a.name}</h1>
            <p className="mt-1 text-[14px] text-ink-soft">{a.role} · {a.place}</p>
          </div>
          <Link href="/performance/teams/targets?tab=goals" className="inline-flex h-11 items-center whitespace-nowrap rounded-md bg-brand-green px-6 text-[14px] font-semibold text-white transition-colors hover:bg-brand-green-dark">
            Development plan
          </Link>
        </div>
        <div className="flex flex-col gap-3 border-t border-line px-5 py-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-4">
            <span className="relative h-14 w-14 shrink-0">
              <PersonAvatar label={a.name} />
              <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white bg-brand-green" title="Online" />
            </span>
            <div>
              <p className="text-[15.5px] font-semibold text-ink">{a.name}</p>
              <p className="text-[13px] text-ink-soft">{a.title}</p>
              <p className="text-[12.5px] text-muted">Joined {a.joined}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2.5 text-[13px]">
            <span className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-ink-soft">Farmers Managed: <b className="text-ink">{a.farmers}</b></span>
            <span className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-ink-soft">Visit Rate: <b className="text-brand-green">{a.visitRate}%</b></span>
            <span className="rounded-full border border-line bg-surface px-3.5 py-1.5 text-ink-soft">Reporting: <b className="text-ink">{a.reporting}% Accuracy</b></span>
          </div>
        </div>
      </Card>

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[400px_1fr]">
        <div className="flex flex-col gap-4">
          <Card className="overflow-hidden p-0 shadow-card">
            <div className="flex items-center justify-between border-b border-line px-5 py-4">
              <h2 className="text-[18px] font-bold text-ink">Coaching sessions</h2>
              <Link href="/reviews/history" className="text-[14px] font-semibold text-brand-green hover:underline">History</Link>
            </div>
            <ul className="flex flex-col gap-3 p-4">
              {sessions.map((s) => {
                const sel = s.id === session.id;
                const next = s.status === "Scheduled";
                return (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(s.id)}
                      aria-current={sel}
                      className={cn("w-full rounded-lg border px-4 py-3 text-left transition-colors", sel ? "border-brand-green bg-brand-wash" : "border-line bg-white hover:bg-surface")}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className={cn("text-[13px]", sel && next ? "font-semibold text-ink" : "text-ink-soft")}>{next ? "Next: " : ""}{s.date}</span>
                        {next ? (
                          <span className="rounded-md border border-brand-border bg-white px-2 py-0.5 text-[11px] font-bold uppercase tracking-wide text-ink">Scheduled</span>
                        ) : (
                          <Pill tone="green" className="px-2.5 py-0 text-[12px]">Completed</Pill>
                        )}
                      </div>
                      <p className={cn("mt-2 text-[14.5px] text-ink", next && "font-semibold")}>{s.topic}</p>
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="px-4 pb-4">
              <Button variant="brand" className="h-11 w-full gap-2 text-[14.5px]" onClick={() => setCreating(true)}>
                <Icon d="M12 5v14M5 12h14" /> New session
              </Button>
            </div>
          </Card>

          <Card className="overflow-hidden p-0 shadow-card">
            <div className="border-b border-line px-5 py-4">
              <h2 className="text-[18px] font-bold text-ink">Progress since last session</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">Key performance changes since {COACHING_PROGRESS.since}</p>
            </div>
            <div className="flex flex-col gap-3 p-4">
              {COACHING_PROGRESS.metrics.map((m) => (
                <div key={m.label} className={cn("flex items-center justify-between rounded-lg border border-l-4 px-3.5 py-3", m.tone === "good" ? "border-brand-border border-l-brand-green bg-brand-wash" : "border-danger-border border-l-danger bg-danger-wash")}>
                  <div>
                    <p className="text-[11.5px] font-semibold uppercase tracking-wide text-ink-soft">{m.label}</p>
                    <p className="mt-0.5 text-[18px] font-bold text-ink">{m.value}</p>
                  </div>
                  <span className={cn("inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-semibold", m.tone === "good" ? "border-brand-border bg-brand-mint text-brand-green" : "border-danger-border bg-danger-wash text-danger")}>
                    <Icon d={m.direction === "up" ? "M7 17L17 7M8 7h9v9" : "M7 7l10 10M17 8v9H8"} className="h-3.5 w-3.5" />
                    {m.change}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        </div>

        <Card className="flex flex-col self-start overflow-hidden p-0 shadow-card">
          <div className="border-b border-line px-5 py-4">
            <h2 className="text-[18px] font-bold text-ink">{active ? "Active Session" : "Session"}: {session.date}</h2>
            <p className="mt-0.5 text-[13px] text-ink-soft">Use this space to guide, document, and support {a.first}&apos;s field activities</p>
          </div>

          {!entry ? (
            <div className="flex flex-col items-start gap-3 px-5 py-6">
              <p className="text-[14.5px] font-semibold text-ink">{session.topic}</p>
              <p className="text-[13.5px] text-ink-soft">This session is completed. Its coaching entry is kept in the coaching history.</p>
              <Link href="/reviews/history" className="text-[14px] font-semibold text-brand-green hover:underline">Open history</Link>
            </div>
          ) : (
            <>
              <div className="flex flex-col gap-4 px-5 py-4">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[13px] text-ink-soft">Focus areas</span>
                  {entry.focus.length === 0 && <span className="text-[13px] text-muted">None chosen</span>}
                  {entry.focus.map((f) => (
                    <span key={f} className="inline-flex items-center gap-1.5 rounded-full border border-brand-border bg-brand-mint px-3 py-1 text-[13px] font-medium text-brand-green">
                      <Icon d="M5 13l4 4L19 7" className="h-3.5 w-3.5" />{f}
                    </span>
                  ))}
                </div>

                <div>
                  <p className="mb-1.5 text-[13px] text-ink-soft">Feedback</p>
                  <div className="rounded-lg border border-brand-border border-l-4 border-l-brand-green bg-brand-wash px-4 py-3">
                    <p className="flex items-center gap-2.5 text-[14.5px] font-semibold text-brand-green">
                      <Icon d="M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9L12 3zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8L19 15z" className="h-4 w-4" />
                      <input value={entry.feedbackTitle} onChange={(e) => patch({ feedbackTitle: e.target.value })} placeholder="Headline" aria-label="Feedback headline" disabled={!active} className="w-full bg-transparent outline-none placeholder:font-normal placeholder:text-muted" />
                    </p>
                    <Textarea rows={3} value={entry.feedback} onChange={(e) => patch({ feedback: e.target.value })} placeholder={`How is ${a.first} doing?`} aria-label="Feedback" disabled={!active} className="mt-1 resize-none border-0 bg-transparent p-0 text-[13.5px] leading-relaxed text-ink-soft shadow-none focus:ring-0" />
                  </div>
                </div>

                <Block title="Improvement areas">
                  <Checklist items={entry.improvements} onChange={(improvements) => patch({ improvements })} owner={a.first} placeholder="Add an improvement area" />
                </Block>

                <Block title="Recommendations">
                  <ul className="flex flex-col gap-2 p-3">
                    {entry.recommendations.map((r) => (
                      <li key={r} className="flex items-start gap-2.5 rounded-md border border-line-soft bg-surface px-3 py-2 text-[13.5px] text-ink-soft">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-blue-600" />{r}
                      </li>
                    ))}
                  </ul>
                  <div className="flex gap-2 border-t border-line-soft px-4 py-2.5">
                    <Input value={newRec} onChange={(e) => setNewRec(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newRec.trim()) { patch({ recommendations: [...entry.recommendations, newRec.trim()] }); setNewRec(""); } }} placeholder="Add a recommendation" className="h-9 text-[13.5px]" />
                    <Button variant="outline" size="sm" className="shrink-0 font-semibold" disabled={!newRec.trim()} onClick={() => { patch({ recommendations: [...entry.recommendations, newRec.trim()] }); setNewRec(""); }}>Add</Button>
                  </div>
                </Block>

                <Block title="Next actions">
                  <Checklist items={entry.actions} onChange={(actions) => patch({ actions })} owner={COACHING_SUPERVISOR} placeholder="Add a next action" />
                </Block>

                <div className="flex items-center justify-between border-t border-line pt-4 text-[13.5px]">
                  <span className="font-medium text-ink-soft">Review date:</span>
                  <input type="date" min={todayIso()} value={entry.reviewDate} onChange={(e) => patch({ reviewDate: e.target.value })} aria-label="Review date" className="rounded-md border border-line bg-white px-2.5 py-1.5 text-[13.5px] font-semibold text-ink outline-none focus:border-brand-green" />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-5 py-4">
                <Button variant="outline" className="h-11 gap-2 px-4 font-semibold" onClick={() => setSharing(true)}>
                  <Icon d="M18 8a3 3 0 100-6 3 3 0 000 6zM6 15a3 3 0 100-6 3 3 0 000 6zM18 22a3 3 0 100-6 3 3 0 000 6zM8.6 13.5l6.8 4M15.4 6.5l-6.8 4" /> Share with {a.first}
                </Button>
                <Button variant="brand" className="h-11 px-6" onClick={save}>Save coaching entry</Button>
              </div>
            </>
          )}
        </Card>
      </div>

      {creating && (
        <NewSessionModal
          onClose={() => setCreating(false)}
          onCreate={({ date, topic, focus }) => {
            const id = `s-${Date.now()}`;
            setSessions((prev) => [{ id, date, topic, status: "Scheduled" }, ...prev.map((s) => (s.status === "Scheduled" ? { ...s, status: "Completed" as const } : s))]);
            setEntries((prev) => ({ ...prev, [id]: { ...EMPTY_ENTRY, focus } }));
            setSelectedId(id);
            setNotice(`Session scheduled for ${date}.`);
          }}
        />
      )}
      {saved && entry && <SavedModal sessionDate={session.date} entry={entry} savedAt={saved.at} onClose={() => setSaved(null)} onShare={() => { setSaved(null); setSharing(true); }} />}
      {sharing && entry && <ShareModal sessionDate={session.date} entry={entry} onClose={() => setSharing(false)} onShare={(summary) => setNotice(`${summary}.`)} />}
    </div>
  );
}
