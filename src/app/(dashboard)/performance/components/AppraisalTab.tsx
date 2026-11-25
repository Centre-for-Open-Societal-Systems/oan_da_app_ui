"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import { APPRAISAL, APPRAISAL_CRITERIA, weightedRating, type TeamMemberRow } from "@/features/performance";
import { KpiHelp } from "./KpiHelp";

const SCORE_HELP = { summary: "How the half-year score is built from the score mix chosen for this cycle. Final once the review is submitted." };
const RATINGS = [1, 2, 3, 4, 5];
const round1 = (n: number) => Math.round(n * 10) / 10;

// Appraisal tab: rate the agent on each criterion (1–5), see the half-year score build up, comment, then submit.
export function AppraisalTab({ agent }: { agent: TeamMemberRow }) {
  const first = agent.name.split(" ")[0];
  const [ratings, setRatings] = useState<Record<string, number>>(() => Object.fromEntries(APPRAISAL_CRITERIA.map((c) => [c.id, c.rating])));
  const [comments, setComments] = useState(APPRAISAL.comments);
  const [notice, setNotice] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const yourRating = weightedRating(APPRAISAL_CRITERIA.map((c) => ({ weight: c.weight, value: ratings[c.id] })));
  const selfRating = weightedRating(APPRAISAL_CRITERIA.map((c) => ({ weight: c.weight, value: c.self })));
  const { mix } = APPRAISAL;
  const parts = [
    { label: "KPI results", note: `${agent.halfYear}% × ${mix.kpi}%`, value: (agent.halfYear * mix.kpi) / 100 },
    { label: "Your rating", note: `${yourRating.toFixed(1)} of 5 × ${mix.rating}%`, value: (yourRating / 5) * mix.rating },
    { label: "Self-rating", note: `${selfRating.toFixed(1)} of 5 × ${mix.self}%`, value: (selfRating / 5) * mix.self },
  ];
  const total = parts.reduce((sum, p) => sum + p.value, 0);

  return (
    <div className="flex flex-col gap-4">
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <Card className="grid grid-cols-1 gap-4 rounded-t-none border-t-0 p-4 shadow-card xl:grid-cols-[1fr_380px]">
        <div className="overflow-hidden rounded-xl border border-line">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-4">
            <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">
              Rated criteria <KpiHelp title="Rated criteria" help={{ summary: "Rate each criterion from 1 to 5. Each carries the weight shown." }} />
            </h2>
            <p className="text-[12.5px] text-ink-soft">{APPRAISAL.scale.map((s) => `${s.value} ${s.label}`).join(" · ")}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[560px] border-collapse text-left">
              <thead>
                <tr className="bg-surface text-[13px] font-semibold text-slate-500">
                  <th className="px-5 py-3 font-semibold">Criterion</th>
                  <th className="px-3 py-3 font-semibold">Weight</th>
                  <th className="px-3 py-3 font-semibold">{first}</th>
                  <th className="px-3 py-3 font-semibold">Your rating</th>
                </tr>
              </thead>
              <tbody className="text-[14px] text-slate-700">
                {APPRAISAL_CRITERIA.map((c) => (
                  <tr key={c.id} className="border-t border-line-soft">
                    <td className="px-5 py-3.5">
                      <span className="flex items-center gap-2 text-ink">{c.label}<KpiHelp title={c.label} help={{ summary: c.hint }} /></span>
                    </td>
                    <td className="px-3 py-3.5">{c.weight}%</td>
                    <td className="px-3 py-3.5">
                      <span className="inline-flex h-6 min-w-6 items-center justify-center rounded-full bg-slate-100 px-2 text-[12px] font-semibold text-slate-600" title={`${first}'s self-rating`}>{c.self}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1.5" role="radiogroup" aria-label={`Your rating for ${c.label}`}>
                        {RATINGS.map((n) => (
                          <button
                            key={n}
                            type="button"
                            role="radio"
                            aria-checked={ratings[c.id] === n}
                            disabled={submitted}
                            onClick={() => setRatings((r) => ({ ...r, [c.id]: n }))}
                            className={cn(
                              "h-9 w-9 rounded-lg border text-[14px] font-medium transition-colors disabled:cursor-not-allowed",
                              ratings[c.id] === n ? "border-brand-green bg-brand-green text-white" : "border-line bg-white text-ink-soft hover:border-brand-green hover:text-brand-green",
                            )}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <aside className="flex flex-col self-start overflow-hidden rounded-xl border border-line">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h2 className="flex items-center gap-2 text-[16px] font-semibold text-ink">Score preview <KpiHelp title="Score preview" help={SCORE_HELP} /></h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[12px] font-semibold text-slate-600">{APPRAISAL.mixName}</span>
          </div>
          <div className="px-5">
            {parts.map((p) => (
              <div key={p.label} className="flex items-start justify-between border-b border-line-soft py-3">
                <div>
                  <p className="text-[14px] text-ink">{p.label}</p>
                  <p className="mt-0.5 text-[12px] text-ink-soft">{p.note}</p>
                </div>
                <p className="text-[15px] font-semibold text-ink">{round1(p.value).toFixed(1)}</p>
              </div>
            ))}
            <div className="flex items-center justify-between pt-3.5">
              <p className="text-[15px] font-semibold text-ink">Half-year score</p>
              <p className="text-[24px] font-bold text-brand-green">{round1(total).toFixed(1)}</p>
            </div>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-brand-mint" role="progressbar" aria-valuenow={Math.round(total)} aria-valuemin={0} aria-valuemax={100}>
              <div className="h-full rounded-full bg-brand-green" style={{ width: `${Math.min(100, total)}%` }} />
            </div>
            <p className="mt-2 text-[12px] text-ink-soft">Scores stay private to {first}, you and the woreda office.</p>
          </div>
          <div className="mt-4 flex gap-3 px-5 pb-5">
            <Button variant="outline" className="h-10 flex-1 font-semibold" disabled={submitted} onClick={() => setNotice(`Draft saved for ${first}.`)}>Save draft</Button>
            <Button
              variant="brand"
              className="h-10 flex-1"
              disabled={submitted}
              onClick={() => {
                setSubmitted(true);
                setNotice(`Review submitted for ${first}. Half-year score ${round1(total).toFixed(1)}.`);
              }}
            >
              {submitted ? "Submitted" : "Submit review"}
            </Button>
          </div>
        </aside>
      </Card>

      <Card className="overflow-hidden p-0 shadow-card">
        <h2 className="border-b border-line px-5 py-3.5 text-[16px] font-semibold text-ink">Comments for {first}</h2>
        <div className="p-4">
          <Textarea rows={4} value={comments} disabled={submitted} onChange={(e) => setComments(e.target.value)} aria-label={`Comments for ${first}`} className="rounded-lg border-line" />
        </div>
      </Card>
    </div>
  );
}
