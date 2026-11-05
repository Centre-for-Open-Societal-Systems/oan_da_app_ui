"use client";

import { useState } from "react";
import { BackLink } from "@/components/ui/BackLink";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { cn } from "@/lib/utils";
import { APPRAISAL, TARGET_AGREEMENT_TONE, TARGET_ROWS, TEAM_SUMMARY, type TargetRow, type TeamMemberRow } from "@/features/performance";
import { KpiHelp } from "./KpiHelp";
import { AppraisalTab } from "./AppraisalTab";
import { LocalGoalsTab } from "./LocalGoalsTab";
import { OpenDiscussionDrawer } from "./OpenDiscussionDrawer";

export type Tab = "targets" | "goals" | "figures" | "appraisal";
const TABS: { key: Tab; label: string }[] = [
  { key: "targets", label: "Targets" },
  { key: "goals", label: "Local goals" },
  { key: "figures", label: "Monthly figures" },
  { key: "appraisal", label: "Appraisal" },
];

const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("");
const withUnit = (n: number, unit: string) => (unit === "%" ? `${n}%` : unit ? `${n} ${unit}` : String(n));

// Supervisor sets one agent's half-year targets; the agent is then asked to agree (or discuss).
export function SetTargets({ agent, initialTab = "targets" }: { agent: TeamMemberRow; initialTab?: Tab }) {
  const first = agent.name.split(" ")[0];
  const [tab, setTab] = useState<Tab>(initialTab);
  const [rows, setRows] = useState<TargetRow[]>(TARGET_ROWS);
  const [values, setValues] = useState<Record<string, string>>(() => Object.fromEntries(TARGET_ROWS.map((r) => [r.id, String(r.proposed)])));
  const [confirming, setConfirming] = useState(false);
  const [replying, setReplying] = useState<TargetRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const invalid = (r: TargetRow) => values[r.id] === "" || Number(values[r.id]) < 0 || (r.unit === "%" && Number(values[r.id]) > 100);
  const hasInvalid = rows.some((r) => !r.fixed && invalid(r));
  const changed = rows.filter((r) => !r.fixed && !invalid(r) && Number(values[r.id]) !== r.agreed);

  const save = () => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.fixed || invalid(r)) return r;
        const next = Number(values[r.id]);
        return next === r.agreed && r.agreement !== "Discussing" ? r : { ...r, agreed: next, proposed: next, agreement: "Agreed" };
      }),
    );
    setConfirming(false);
    setNotice(`Targets saved for ${agent.name}. ${first} will be asked to agree by 15 Hamle.`);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink href="/performance/teams" />

      <Card className="flex flex-col gap-4 px-5 py-4 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-4">
          <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-brand-mint text-[16px] font-bold text-brand-green">{initials(agent.name)}</span>
          <div>
            <h1 className="text-[18px] font-semibold text-ink">{agent.name}</h1>
            {tab === "appraisal" ? (
              <p className="text-[13.5px] text-ink-soft">{TEAM_SUMMARY.cycle} · self-appraisal sent {APPRAISAL.selfSent}</p>
            ) : (
              <p className="text-[13.5px] text-ink-soft">Development Agent {agent.role.replace("DA ", "")} · {agent.kebele} kebele</p>
            )}
          </div>
        </div>
        {tab === "appraisal" ? (
          <Pill tone="amber" className="px-3 py-1 text-[13px]">Review due {APPRAISAL.reviewDue}</Pill>
        ) : (
          <dl className="flex flex-wrap gap-x-8 gap-y-2">
            {[
              ["Template", agent.role],
              ["Half-year", TEAM_SUMMARY.cycle],
              ["So far", `${agent.halfYear}%`],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[12.5px] text-ink-soft">{label}</dt>
                <dd className="text-[14.5px] font-semibold text-ink">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </Card>

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <div>
        <SegmentTabs tabs={TABS} active={tab} onChange={setTab} label="Agent targets" />
        {tab === "appraisal" ? (
          <AppraisalTab agent={agent} />
        ) : (
        <Card className="rounded-t-none border-t-0 p-4 shadow-card">
          {tab === "goals" ? (
            <LocalGoalsTab first={first} />
          ) : tab !== "targets" ? (
            <EmptyState title={`${TABS.find((t) => t.key === tab)?.label} — Part 2 preview`} hint="This tab opens in Part 2." />
          ) : (
            <div className="overflow-x-auto rounded-xl border border-line">
              <table className="w-full min-w-[820px] border-collapse text-left">
                <thead>
                  <tr className="bg-surface text-[13px] font-semibold text-slate-500">
                    <th className="px-5 py-3.5 font-semibold">KPI</th>
                    <th className="px-4 py-3.5 font-semibold">Weight</th>
                    <th className="px-4 py-3.5 font-semibold">National target</th>
                    <th className="px-4 py-3.5 font-semibold">Target for {first}</th>
                    <th className="px-4 py-3.5 font-semibold">Agreement</th>
                    <th className="px-4 py-3.5" />
                  </tr>
                </thead>
                <tbody className="text-[14px] text-slate-700">
                  {rows.map((r) => (
                    <tr key={r.id} className={cn("border-t border-line-soft", r.agreement === "Discussing" && "bg-brand-mint/60")}>
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-2 text-ink">{r.kpi}<KpiHelp title={r.kpi} help={r.help} /></span>
                      </td>
                      <td className="px-4 py-3.5">{r.weight}%</td>
                      <td className="px-4 py-3.5">{withUnit(r.national, r.unit)}</td>
                      <td className="px-4 py-2.5">
                        <div
                          className={cn(
                            "flex h-10 w-[150px] items-center rounded-lg border px-3 focus-within:border-brand-green focus-within:ring-1 focus-within:ring-brand-green",
                            r.fixed ? "border-line bg-surface" : !r.fixed && invalid(r) ? "border-danger bg-white" : "border-line bg-white",
                          )}
                        >
                          <input
                            type="number"
                            min={0}
                            max={r.unit === "%" ? 100 : undefined}
                            value={values[r.id]}
                            disabled={r.fixed}
                            onChange={(e) => setValues((v) => ({ ...v, [r.id]: e.target.value }))}
                            aria-label={`${r.kpi} target for ${first}`}
                            className="w-full min-w-0 bg-transparent text-[14px] text-ink outline-none disabled:text-muted"
                          />
                          {r.unit && <span className="text-[12.5px] text-muted">{r.unit}</span>}
                        </div>
                      </td>
                      <td className="px-4 py-3.5"><Pill tone={TARGET_AGREEMENT_TONE[r.agreement]} className="px-2.5 py-0.5 text-[12.5px]">{r.agreement}</Pill></td>
                      <td className="px-4 py-3.5">
                        {r.agreement === "Discussing" && (
                          <button type="button" onClick={() => setReplying(r)} className="text-[14px] font-semibold text-brand-green hover:underline">Reply</button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        )}
      </div>

      {tab === "targets" && (
        <Card className="flex flex-col gap-3 px-5 py-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[13.5px] text-ink-soft">Changes are saved with your name and the date. Every target needs a value of 0 or more; percent targets go up to 100.{hasInvalid && " Fix the outlined targets to enable Save targets."}</p>
          <Button variant="brand" className="h-10 px-6" disabled={hasInvalid} onClick={() => setConfirming(true)}>Save targets</Button>
        </Card>
      )}

      <Modal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        title={`Save ${first}’s targets?`}
        size="md"
        icon={
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-tint text-brand-green">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="9" /><path d="M8 12.5l3 3 5-6" />
            </svg>
          </span>
        }
        bodyClassName="p-5"
        footer={
          <>
            <Button variant="outline" className="px-6 font-semibold" onClick={() => setConfirming(false)}>Cancel</Button>
            <Button variant="brand" className="px-6" onClick={save}>Save for {first}</Button>
          </>
        }
      >
        <p className="text-[14.5px] text-ink">{agent.name} will be asked to agree to the {rows.length} targets. Changes are saved with your name and the date.</p>
        <dl className="mt-4 grid grid-cols-[110px_1fr] gap-x-4 gap-y-3 rounded-xl bg-surface px-4 py-4 text-[14px]">
          <dt className="text-ink-soft">Targets</dt>
          <dd className="font-medium text-ink">{rows.length} KPIs</dd>
          <dt className="text-ink-soft">Changed</dt>
          <dd className="font-medium text-ink">
            {changed.length === 0 ? "No changes" : changed.map((r) => <span key={r.id} className="block">{r.kpi}: {withUnit(r.agreed, r.unit)} → {withUnit(Number(values[r.id]), r.unit)}</span>)}
          </dd>
          <dt className="text-ink-soft">Agree by</dt>
          <dd className="font-medium text-ink">15 Hamle</dd>
          <dt className="text-ink-soft">Logged</dt>
          <dd className="font-medium text-ink">Your name and today’s date</dd>
        </dl>
      </Modal>

      {replying && (
        <OpenDiscussionDrawer
          kpi={{ kpi: replying.kpi, target: withUnit(replying.national, replying.unit), weight: replying.weight }}
          onClose={() => setReplying(null)}
          onSend={(summary) => setNotice(`Reply sent. ${summary}`)}
        />
      )}
    </div>
  );
}
