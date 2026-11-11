"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { SurveyTemplate, TemplateParam } from "@/features/surveys";

type Answer = string | string[];

// Phone chrome strings per language; question text stays in the source language until translations exist.
const UI: Record<string, { next: string; back: string; finish: string }> = {
  Amharic: { next: "ቀጣይ", back: "ተመለስ", finish: "ጨርስ" },
  "Afaan Oromo": { next: "Itti fufi", back: "Deebi'i", finish: "Xumuri" },
};
const ui = (lang: string) => UI[lang] ?? { next: "Next", back: "Back", finish: "Finish" };

const MOCK_AUTO: Record<string, string> = { "Farmer ID": "FRM-OR-004215", Kebele: "Bako 01" };
const MOCK_VISITS = ["Visit · 04 Nov 2026 · Crop advisory", "Visit · 21 Oct 2026 · Input distribution", "Visit · 02 Oct 2026 · Training"];

const optionsFor = (q: TemplateParam) => (q.kind === "yesno" ? ["Yes", "No"] : q.kind === "consent" ? q.options ?? ["Yes, I agree", "No, I don't want to"] : q.options ?? []);

const visible = (q: TemplateParam, answers: Record<string, Answer>) => {
  if (!q.condition) return true;
  const a = answers[q.condition.paramId];
  if (a === undefined) return q.condition.op === "notEquals";
  const hit = Array.isArray(a) ? a.includes(q.condition.value) : a === q.condition.value;
  return q.condition.op === "equals" ? hit : !hit;
};

const Choice = ({ label, on, multi, onClick }: { label: string; on: boolean; multi?: boolean; onClick: () => void }) => (
  <button type="button" role={multi ? "checkbox" : "radio"} aria-checked={on} onClick={onClick}
    className={cn("flex w-full items-center gap-2 rounded-lg border px-3.5 py-3 text-left text-[13.5px] transition-colors", on ? "border-brand-green bg-brand-mint font-semibold text-brand-green" : "border-line bg-white text-ink hover:bg-surface")}>
    {on && <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 13l4 4L19 7" /></svg>}
    {label}
  </button>
);

const FIELD = "w-full rounded-lg border border-line bg-white px-3 text-[13.5px] text-ink outline-none focus:border-brand-green";

function QuestionInput({ q, value, onChange }: { q: TemplateParam; value: Answer | undefined; onChange: (v: Answer) => void }) {
  switch (q.kind) {
    case "consent":
    case "single":
    case "yesno":
      return <div role="radiogroup" className="flex flex-col gap-2">{optionsFor(q).map((o) => <Choice key={o} label={o} on={value === o} onClick={() => onChange(o)} />)}</div>;
    case "multi": {
      const picked = Array.isArray(value) ? value : [];
      return <div className="flex flex-col gap-2">{optionsFor(q).map((o) => <Choice key={o} multi label={o} on={picked.includes(o)} onClick={() => onChange(picked.includes(o) ? picked.filter((x) => x !== o) : [...picked, o])} />)}</div>;
    }
    case "rating":
      return (
        <div role="radiogroup" className="grid grid-cols-5 gap-1.5">
          {["1", "2", "3", "4", "5"].map((n) => (
            <button key={n} type="button" role="radio" aria-checked={value === n} onClick={() => onChange(n)}
              className={cn("h-11 rounded-lg border text-[15px] font-semibold", value === n ? "border-brand-green bg-brand-mint text-brand-green" : "border-line bg-white text-ink")}>{n}</button>
          ))}
        </div>
      );
    case "short":
      return <input className={cn(FIELD, "h-10")} maxLength={100} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="Type the answer" />;
    case "long":
      return <textarea className={cn(FIELD, "resize-none py-2")} rows={4} maxLength={300} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="Type or dictate the answer" />;
    case "number":
      return <input type="number" className={cn(FIELD, "h-10")} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="0" />;
    case "date":
      return <input type="date" className={cn(FIELD, "h-10")} value={(value as string) ?? ""} onChange={(e) => onChange(e.target.value)} />;
    case "lookup":
      return <div role="radiogroup" className="flex flex-col gap-2">{MOCK_VISITS.map((o) => <Choice key={o} label={o} on={value === o} onClick={() => onChange(o)} />)}</div>;
    case "auto":
      return (
        <div className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-3.5 py-3 text-[13.5px] text-blue-800">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 11V8a5 5 0 0110 0v3M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z" /></svg>
          {MOCK_AUTO[q.title] ?? "Filled from the registry"}
        </div>
      );
  }
}

// P7.9: tap through the template as a DA would in the field, with skip logic applied.
export function MobilePreviewModal({ template, onClose }: { template: SurveyTemplate; onClose: () => void }) {
  const [lang, setLang] = useState(template.languages.find((l) => l.name === "English")?.name ?? template.languages[0]?.name ?? "English");
  const [answers, setAnswers] = useState<Record<string, Answer>>({});
  const [history, setHistory] = useState<number[]>([0]);
  const [ended, setEnded] = useState<"done" | "declined" | null>(null);

  const index = history[history.length - 1];
  const q = template.params[index];
  const shown = template.params.filter((p) => visible(p, answers)).length;
  const position = template.params.slice(0, index + 1).filter((p) => visible(p, answers)).length;
  const value = q ? (q.kind === "auto" ? "auto" : answers[q.id]) : undefined;
  const answered = value !== undefined && value !== "" && !(Array.isArray(value) && value.length === 0);
  const canNext = !q || !q.required || answered || q.kind === "auto";
  const t = ui(lang);
  const pending = !template.languages.find((l) => l.name === lang)?.translated;

  const restart = () => { setAnswers({}); setHistory([0]); setEnded(null); };
  const next = () => {
    if (!q) return;
    if (q.kind === "consent" && answers[q.id] === optionsFor(q)[1]) return setEnded("declined");
    let n = index + 1;
    while (n < template.params.length && !visible(template.params[n], answers)) n++;
    if (n >= template.params.length) return setEnded("done");
    setHistory((h) => [...h, n]);
  };
  const back = () => (ended ? setEnded(null) : history.length > 1 && setHistory((h) => h.slice(0, -1)));

  return (
    <Modal isOpen onClose={onClose} title="Preview on mobile" subtitle={`${template.name} — as farmers will see it, offline-capable.`} size="xl" bodyClassName="p-6"
      footer={<Button variant="outline" className="px-5 font-semibold" onClick={onClose}>Close preview</Button>}
    >
      <div className="flex flex-col gap-6 md:flex-row">
        <div className="mx-auto w-[280px] shrink-0 rounded-[38px] bg-zinc-900 p-2.5 shadow-xl">
          <div className="flex h-[540px] flex-col overflow-hidden rounded-[30px] bg-surface">
            <div className="flex items-center gap-3 border-b border-line bg-white px-4 py-3.5">
              <button type="button" onClick={back} aria-label={t.back} disabled={history.length === 1 && !ended} className="text-ink disabled:text-slate-300">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M19 12H5M11 18l-6-6 6-6" /></svg>
              </button>
              <p className="truncate text-[14px] font-semibold text-ink">{template.name.replace(/\s+v\d+$/, "")}</p>
            </div>

            {ended || !q ? (
              <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
                <span className={cn("flex h-14 w-14 items-center justify-center rounded-full", ended === "declined" ? "bg-slate-100 text-slate-500" : "bg-brand-mint text-brand-green")}>
                  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={ended === "declined" ? "M6 6l12 12M18 6L6 18" : "M5 13l4 4L19 7"} /></svg>
                </span>
                <p className="text-[16px] font-semibold text-ink">{ended === "declined" ? "Survey ended" : "Response saved"}</p>
                <p className="text-[12.5px] text-ink-soft">{ended === "declined" ? "The farmer declined consent, so no answers are recorded." : "Stored on the device and synced when the DA is back online."}</p>
                <button type="button" onClick={restart} className="mt-2 text-[13px] font-semibold text-brand-green hover:underline">Restart preview</button>
              </div>
            ) : (
              <>
                <div className="px-4 pt-3">
                  <div className="h-1.5 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-brand-green transition-all" style={{ width: `${(position / shown) * 100}%` }} /></div>
                  <p className="mt-1.5 text-[11.5px] text-ink-soft">Question {position} of {shown}</p>
                </div>
                <div className="flex-1 overflow-y-auto px-4 py-4">
                  <p className="text-[16px] font-semibold leading-snug text-ink">{q.title}{q.required && q.kind !== "auto" && <span className="text-danger"> *</span>}</p>
                  {(q.helpText || q.kind === "rating") && <p className="mt-1 text-[12px] text-ink-soft">{q.helpText ?? q.detail}</p>}
                  <div className="mt-4"><QuestionInput q={q} value={answers[q.id]} onChange={(v) => setAnswers((a) => ({ ...a, [q.id]: v }))} /></div>
                </div>
                <div className="p-4">
                  <button type="button" onClick={next} disabled={!canNext}
                    className="h-12 w-full rounded-xl bg-brand-green text-[15px] font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:bg-slate-300">
                    {position === shown ? t.finish : `${t.next} →`}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 flex-col gap-4">
          <div>
            <p className="text-[13.5px] font-medium text-ink">Preview language</p>
            <div className="mt-2 flex flex-wrap gap-2">
              {template.languages.map((l) => (
                <button key={l.name} type="button" onClick={() => setLang(l.name)} aria-pressed={lang === l.name}
                  className={cn("rounded-full border px-4 py-1.5 text-[13px] transition-colors", lang === l.name ? "border-brand-green bg-brand-green font-semibold text-white" : "border-line bg-white text-ink hover:bg-surface")}>
                  {l.name}
                </button>
              ))}
            </div>
          </div>
          <div className="rounded-r-xl border-l-4 border-brand-green bg-brand-wash px-4 py-3">
            <p className="text-[14px] font-semibold text-ink">This preview is interactive</p>
            <p className="mt-1 text-[13px] text-ink-soft">
              Tap through all {template.params.length} questions exactly as a DA would see them offline in the field
              {template.params.some((p) => p.condition) ? `, including skip logic on ${template.params.map((p, i) => (p.condition ? `Q${i + 1}` : "")).filter(Boolean).join(", ")}` : ""}.
            </p>
          </div>
          {pending && (
            <p className="rounded-lg border border-amber-200 bg-amber-50 px-3.5 py-2.5 text-[12.5px] text-amber-800">
              {lang} translation is pending — questions show in the source language until it is translated.
            </p>
          )}
        </div>
      </div>
    </Modal>
  );
}
