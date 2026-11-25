"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Pill } from "@/components/ui/Pill";
import { Textarea } from "@/components/ui/Textarea";
import { fileDate } from "@/lib/download";
import { downloadTable } from "@/lib/export";
import { cn } from "@/lib/utils";
import { RadioFilterPopup } from "./RadioFilterPopup";
import {
  COACHING_REVIEWS,
  REVIEWED_AGENT,
  REVIEW_COACH,
  REVIEW_COACHES,
  REVIEW_TYPES,
  REVIEW_TYPE_STYLE,
  type CoachingReview,
  type ReviewType,
} from "@/features/performance";

const ALL = "All";
const toneOf = (pct: number) => (pct >= 75 ? { box: "border-brand-border bg-brand-mint", bar: "bg-brand-green", chip: "bg-brand-mint text-brand-green" } : { box: "border-warning-border bg-warning-wash", bar: "bg-orange-400", chip: "bg-warning-wash text-orange-700" });

const Icon = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);
const CHECK = "M5 13l4 4L19 7";

// One collapsible section of the review detail.
function Section({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  const [open, setOpen] = useState(true);
  return (
    <section className="overflow-hidden rounded-xl border border-line bg-white">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-expanded={open} className="flex w-full items-center justify-between gap-3 bg-surface/60 px-5 py-3.5 text-left">
        <span>
          <span className="block text-[16px] font-semibold text-ink">{title}</span>
          <span className="block text-[12.5px] text-ink-soft">{subtitle}</span>
        </span>
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line bg-white text-slate-500">
          <Icon d="M6 9l6 6 6-6" className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open && <div className="border-t border-line px-5 py-4">{children}</div>}
    </section>
  );
}

function Bullets({ title, items, dot }: { title: string; items: string[]; dot: string }) {
  return (
    <div>
      <p className="flex items-center gap-2 text-[14.5px] font-semibold text-ink"><span className={cn("h-1.5 w-1.5 rounded-full", dot)} />{title}</p>
      <ul className="mt-3 flex flex-col gap-3">
        {items.map((t) => (
          <li key={t} className="flex gap-2.5 text-[13.5px] leading-relaxed text-ink-soft">
            <span className={cn("mt-2 h-1.5 w-1.5 shrink-0 rounded-full", dot)} />
            {t}
          </li>
        ))}
      </ul>
    </div>
  );
}

function StartReviewModal({ onClose, onStart }: { onClose: () => void; onStart: (r: CoachingReview) => void }) {
  const [type, setType] = useState<ReviewType>("Quarterly");
  const [start, setStart] = useState("2026-07-01");
  const [end, setEnd] = useState("2026-09-30");
  const [coach, setCoach] = useState("");
  const [note, setNote] = useState("");
  const valid = start !== "" && end !== "" && start <= end && coach !== "";

  const fmt = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  const create = () => {
    if (!valid) return;
    const template = COACHING_REVIEWS[0];
    onStart({
      ...template,
      id: `rv-${Date.now()}`,
      type,
      title: `${type} review`,
      heading: `${type} Review`,
      period: `${fmt(start)} - ${fmt(end)}`,
      date: fmt(new Date().toISOString().slice(0, 10)),
      coach,
      status: "In progress",
      summary: note.trim() || "Review started. Add a summary once the period closes.",
      achievements: [],
      challenges: [],
      goals: [],
      supervisorFeedback: "",
      employeeResponse: "",
      actionPlan: [],
    });
    onClose();
  };

  return (
    <Modal isOpen onClose={onClose} title="Start a new review" subtitle="Deploy a benchmark to woreda extension officers" size="lg" bodyClassName="p-6"
      footer={
        <>
          <Button variant="outline" className="px-5 font-semibold" onClick={onClose}>Cancel</Button>
          <Button variant="brand" className="px-5" disabled={!valid} onClick={create}>Start review</Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-4 rounded-xl border border-brand-border border-l-4 border-l-brand-green bg-brand-mint px-4 py-3.5">
          <span className="h-[52px] w-[52px] shrink-0"><PersonAvatar label={REVIEWED_AGENT.name} /></span>
          <div>
            <p className="text-[17px] font-semibold text-ink">{REVIEWED_AGENT.name}</p>
            <p className="text-[13.5px] text-ink-soft">{REVIEWED_AGENT.role} · Last review: {REVIEWED_AGENT.lastReview}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-medium text-ink">Review type</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Review type">
            {REVIEW_TYPES.map((t) => (
              <button key={t} type="button" role="radio" aria-checked={type === t} onClick={() => setType(t)}
                className={cn("rounded-lg border px-4 py-2 text-[14px] transition-colors", type === t ? "border-brand-green bg-brand-mint font-semibold text-brand-green" : "border-line bg-white text-ink hover:bg-surface")}>
                {t}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Review period start" htmlFor="rv-start" required><Input id="rv-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} /></FormField>
          <FormField label="Review period end" htmlFor="rv-end" required hint={start && end && start > end ? "End must be after the start." : "On or after the start date."} hintTone={start && end && start > end ? "error" : "muted"}>
            <Input id="rv-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
          </FormField>
        </div>

        <FormField label="Coach / reviewer" htmlFor="rv-coach" required>
          <Dropdown id="rv-coach" value={coach} onChange={setCoach} options={REVIEW_COACHES} placeholder="Kassahun Tessema" />
        </FormField>

        <FormField label="Kickoff note (optional)" htmlFor="rv-note">
          <Textarea id="rv-note" rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="What should this review focus on?" className="rounded-lg border-line" />
        </FormField>

        {!valid && <p className="text-[12.5px] text-muted">Complete every field marked * to enable Start review.</p>}
      </div>
    </Modal>
  );
}

// Supervisor's Reviews: an agent's coaching-review history on the left, the selected review's detail on the right.
export function SupervisorReviews() {
  const [reviews, setReviews] = useState<CoachingReview[]>(COACHING_REVIEWS);
  const [selectedId, setSelectedId] = useState(COACHING_REVIEWS[0].id);
  const [typeFilter, setTypeFilter] = useState(ALL);
  const [starting, setStarting] = useState(false);
  const [done, setDone] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const visible = reviews.filter((r) => typeFilter === ALL || r.type === typeFilter);
  const selected = reviews.find((r) => r.id === selectedId) ?? reviews[0];
  const pending = selected.status === "Pending Acknowledgment";

  const acknowledge = () => {
    setReviews((prev) => prev.map((r) => (r.id === selected.id ? { ...r, status: "Acknowledged" } : r)));
    setDone(true);
  };
  const download = () => {
    const rows = [
      { section: "Summary", content: selected.summary },
      { section: "Achievements", content: selected.achievements.join(" | ") },
      { section: "Challenges", content: selected.challenges.join(" | ") },
      { section: "Goals & Targets", content: selected.goals.map((g) => `${g.title}: ${g.done}/${g.of} ${g.unit}`).join(" | ") },
      { section: "Supervisor feedback", content: selected.supervisorFeedback },
      { section: "Employee response", content: selected.employeeResponse },
      { section: "Action plan", content: selected.actionPlan.map((a, i) => `${i + 1}. ${a.title}`).join(" | ") },
    ];
    downloadTable("pdf", `review-${selected.id}-${fileDate()}`, rows, [
      { header: "Section", value: (r) => r.section },
      { header: "Content", value: (r) => r.content },
    ], selected.heading);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="relative z-30 flex flex-col gap-4 px-5 py-4 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-ink">Reviews</h1>
          <p className="mt-1 text-[14px] text-ink-soft">Structured coaching reviews for {REVIEWED_AGENT.name}</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="brand" className="h-11 gap-2 px-5" onClick={() => setStarting(true)}>
            <Icon d="M12 5v14M5 12h14" className="h-4 w-4" /> Start new review
          </Button>
          <RadioFilterPopup label="Filter by review type" value={typeFilter} onChange={setTypeFilter} withApply options={[ALL, ...REVIEW_TYPES].map((t) => ({ value: t, label: t }))} className="w-[170px]" />
        </div>
      </Card>

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[380px_1fr]">
        <Card className="self-start overflow-hidden p-0 shadow-card">
          <div className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <h2 className="text-[20px] font-bold text-ink">Review History</h2>
              <p className="mt-0.5 text-[12.5px] text-ink-soft">Quarterly · Annual · Coaching reviews</p>
            </div>
            <Link href="/reviews/history" className="text-[14px] font-semibold text-brand-green hover:underline">Full history</Link>
          </div>
          <ul className="flex flex-col gap-3 p-4">
            {visible.length === 0 && <li className="py-6 text-center text-[13.5px] text-ink-soft">No {typeFilter.toLowerCase()} reviews yet.</li>}
            {visible.map((r) => {
              const style = REVIEW_TYPE_STYLE[r.type];
              return (
                <li key={r.id}>
                  <button type="button" onClick={() => setSelectedId(r.id)} aria-current={r.id === selected.id}
                    className={cn("w-full rounded-lg border border-l-4 px-3.5 py-3 text-left transition-shadow", style.card, r.id === selected.id && "shadow-md ring-1 ring-brand-green/30")}>
                    <Pill tone={style.tag} className="px-2 py-0 text-[11px]">{r.type === "Semi-annual" ? "Semi-annual" : r.type}</Pill>
                    <div className="mt-1.5 flex items-start justify-between gap-3">
                      <p className="text-[15px] font-semibold text-ink">{r.title}</p>
                      <span className="shrink-0 text-[12.5px] text-ink-soft">{r.date}</span>
                    </div>
                    <div className="mt-0.5 flex items-end justify-between gap-3">
                      <p className="text-[12.5px] text-ink-soft">Coach: {r.coach}</p>
                      <Pill tone={r.status === "Pending Acknowledgment" || r.status === "In progress" ? "amber" : "green"} className="px-2.5 py-0 text-[12px]">
                        {r.status === "Pending Acknowledgment" ? "Pending" : r.status === "Acknowledged" ? "Completed" : r.status}
                      </Pill>
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <Card className="overflow-hidden p-0 shadow-card">
          <div className="flex flex-wrap items-start justify-between gap-3 px-5 py-4">
            <div className="flex items-start gap-3.5">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-50 text-indigo-600">
                <Icon d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" className="h-5 w-5" />
              </span>
              <div>
                <h2 className="text-[20px] font-bold text-ink">{selected.heading}</h2>
                <p className="mt-0.5 text-[13px] text-ink-soft">Review Period: {selected.period} • Status: {selected.status}</p>
              </div>
            </div>
            <Pill tone="green" className="px-3 py-0.5 text-[13px]">{selected.rating}</Pill>
          </div>

          <div className="flex flex-col gap-4 border-t border-line px-5 py-5">
            <Section title="Summary" subtitle="Performance overview and key highlights">
              <p className="text-[13.5px] leading-relaxed text-ink-soft">{selected.summary}</p>
            </Section>

            {(selected.achievements.length > 0 || selected.challenges.length > 0) && (
              <Section title="Achievements & Challenges" subtitle="Key accomplishments and areas for improvement">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                  <Bullets title="Achievements" items={selected.achievements} dot="bg-brand-green" />
                  <Bullets title="Challenges" items={selected.challenges} dot="bg-orange-700" />
                </div>
              </Section>
            )}

            {selected.goals.length > 0 && (
              <Section title="Goals & Targets" subtitle="Progress tracking for key objectives">
                <div className="flex flex-col gap-3">
                  {selected.goals.map((g) => {
                    const pct = Math.round((g.done / g.of) * 100);
                    const t = toneOf(pct);
                    return (
                      <div key={g.title} className={cn("rounded-lg border px-4 py-3", t.box)}>
                        <div className="flex items-center justify-between gap-3 text-[14px]">
                          <span className="font-semibold text-ink">{g.title}</span>
                          <span className="flex items-center gap-2 text-[13px] text-ink-soft">
                            {g.done} / {g.of} {g.unit}
                            <span className={cn("rounded-full px-2.5 py-0.5 text-[12.5px] font-bold", t.chip)}>{pct}%</span>
                          </span>
                        </div>
                        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/70" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
                          <div className={cn("h-full rounded-full", t.bar)} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Section>
            )}

            {(selected.supervisorFeedback || selected.employeeResponse) && (
              <Section title="Feedback" subtitle="Supervisor and employee responses">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                    <Pill tone="blue" className="px-2.5 py-0 text-[12px]">Supervisor Feedback</Pill>
                    <div className="mt-3 flex items-center gap-2.5">
                      <span className="h-8 w-8"><PersonAvatar /></span>
                      <div><p className="text-[14px] font-semibold text-ink">{REVIEW_COACH.name}</p><p className="text-[12px] text-ink-soft">{REVIEW_COACH.role}</p></div>
                    </div>
                    <p className="mt-3 text-[13px] italic leading-relaxed text-ink-soft">“{selected.supervisorFeedback}”</p>
                  </div>
                  <div className="rounded-xl border border-brand-border bg-brand-mint p-4">
                    <Pill tone="green" className="px-2.5 py-0 text-[12px]">Employee Response</Pill>
                    <div className="mt-3 flex items-center gap-2.5">
                      <span className="h-8 w-8"><PersonAvatar /></span>
                      <div><p className="text-[14px] font-semibold text-ink">{REVIEWED_AGENT.name}</p><p className="text-[12px] text-ink-soft">{REVIEWED_AGENT.role}</p></div>
                    </div>
                    <p className="mt-3 text-[13px] italic leading-relaxed text-ink-soft">“{selected.employeeResponse}”</p>
                  </div>
                </div>
              </Section>
            )}

            {selected.actionPlan.length > 0 && (
              <Section title="Action Plan" subtitle="Next steps and improvement initiatives">
                <ol className="flex flex-col gap-3">
                  {selected.actionPlan.map((a, i) => (
                    <li key={a.title} className="flex items-start gap-3.5 rounded-lg border border-line px-4 py-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-brand-green bg-brand-mint text-[12.5px] font-semibold text-brand-green">{i + 1}</span>
                      <div>
                        <p className="text-[14.5px] font-semibold text-ink">{a.title}</p>
                        <p className="mt-0.5 text-[13px] text-ink-soft">{a.detail}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </Section>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line bg-surface px-5 py-4">
            <Button variant="outline" className="gap-2 px-4 font-semibold" onClick={download}>
              <Icon d="M12 4v11m0 0l-4-4m4 4l4-4M4 17v2a1 1 0 001 1h14a1 1 0 001-1v-2" /> Download PDF
            </Button>
            {pending && (
              <Button variant="brand" className="gap-2 px-5" onClick={acknowledge}>
                <Icon d={CHECK} /> Acknowledge review
              </Button>
            )}
          </div>
        </Card>
      </div>

      {starting && (
        <StartReviewModal
          onClose={() => setStarting(false)}
          onStart={(r) => {
            setReviews((prev) => [r, ...prev]);
            setSelectedId(r.id);
            setTypeFilter(ALL);
            setNotice(`${r.heading} started for ${REVIEWED_AGENT.name}.`);
          }}
        />
      )}

      <Modal
        isOpen={done}
        onClose={() => setDone(false)}
        title="Action completed"
        size="md"
        bodyClassName="p-5"
        icon={<span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-green"><Icon d={CHECK} className="h-5 w-5" /></span>}
        footer={
          <>
            <Button variant="outline" className="px-6 font-semibold text-muted" onClick={() => setDone(false)}>Done</Button>
            <Button variant="brand" className="px-5" onClick={() => { setDone(false); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Back to Reviews</Button>
          </>
        }
      >
        <p className="text-[14.5px] text-ink">You&apos;ve confirmed receipt of your {selected.heading}.</p>
        <ul className="mt-4 flex flex-col gap-3 rounded-xl bg-surface px-4 py-4 text-[14px] text-ink">
          {["Status updated to Acknowledged", "Timestamp and your confirmation recorded", `Your coach, ${selected.coach}, has been notified`].map((t) => (
            <li key={t} className="flex items-center gap-3">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-green text-white"><Icon d={CHECK} className="h-3 w-3" /></span>
              {t}
            </li>
          ))}
        </ul>
      </Modal>
    </div>
  );
}
