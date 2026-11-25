"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { cn } from "@/lib/utils";
import {
  APPRAISALS_SUMMARY,
  APPRAISAL_CYCLES,
  APPRAISAL_LIST,
  REVIEW_STATE_TONE,
  type AppraisalListRow,
} from "@/features/performance";
import { KpiHelp } from "./KpiHelp";

const SEARCH_PLACEHOLDER = searchPlaceholder(["Agent", "Kebele", "Self-appraisal", "Review", "Score"]);
const CHANNELS = ["In-app", "SMS"] as const;
const HELP = { summary: "Self-appraisals and your reviews for this half-year. Open an agent to review." };

const stat = (n: number, total: number) => `${n} of ${total}`;

function RemindDialog({ onClose, onSend }: { onClose: () => void; onSend: (summary: string) => void }) {
  const s = APPRAISALS_SUMMARY;
  const [channels, setChannels] = useState<Set<string>>(new Set(["SMS"]));
  const notYet = s.selfTotal - s.selfSent;
  // Names come from the loaded rows; the rest of the group is summarised as "N others".
  const names = [...new Set(APPRAISAL_LIST.filter((r) => r.self === "Not yet").map((r) => r.name))].slice(0, 2);
  const others = notYet - names.length;

  const toggle = (c: string) =>
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c);
      else next.add(c);
      return next;
    });

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Remind ${notYet} agents?`}
      size="md"
      bodyClassName="p-5"
      icon={
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-tint text-brand-green">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
          </svg>
        </span>
      }
      footer={
        <>
          <Button variant="outline" className="px-6 font-semibold" onClick={onClose}>Cancel</Button>
          <Button
            variant="brand"
            className="px-6"
            disabled={channels.size === 0}
            onClick={() => {
              onSend(`${notYet} agents by ${[...channels].join(" and ")}`);
              onClose();
            }}
          >
            Send reminder
          </Button>
        </>
      }
    >
      <p className="text-[14.5px] text-ink">
        {names.join(", ")}{others > 0 ? ` and ${others} others` : ""} have not sent their self-appraisal. It closes on {s.selfClosesOn}.
      </p>
      <div className="mt-4 flex gap-2" role="group" aria-label="Send by">
        {CHANNELS.map((c) => {
          const on = channels.has(c);
          return (
            <button
              key={c}
              type="button"
              aria-pressed={on}
              onClick={() => toggle(c)}
              className={cn("rounded-full border px-4 py-1.5 text-[14px] transition-colors", on ? "border-brand-green bg-brand-mint font-medium text-brand-green" : "border-line bg-white text-ink hover:bg-surface")}
            >
              {c}
            </button>
          );
        })}
      </div>
    </Modal>
  );
}

// Supervisor's Appraisals: who has sent a self-appraisal, which reviews are still to do, and the scores so far.
export function SupervisorAppraisals() {
  const router = useRouter();
  const s = APPRAISALS_SUMMARY;
  const [cycle, setCycle] = useState(APPRAISAL_CYCLES[0]);
  const [query, setQuery] = useState("");
  const [reminding, setReminding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const rows = APPRAISAL_LIST.filter((r) => matchesQuery(query, r, r.sentOn ? `Sent ${r.sentOn}` : "Not yet"));
  const { pageRows, paginationProps } = usePagination(rows);
  const open = (r: AppraisalListRow) => router.push(`/performance/teams/targets?agent=${encodeURIComponent(r.name)}&tab=appraisal`);

  const stats = [
    { label: "Self-appraisals sent", value: stat(s.selfSent, s.selfTotal), note: `${s.selfTotal - s.selfSent} not yet` },
    { label: "Your reviews done", value: stat(s.reviewsDone, s.reviewsTotal), note: `${s.reviewsTotal - s.reviewsDone} waiting for you` },
    { label: "Team score so far", value: s.teamScore, note: "Average of reviewed" },
  ];

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="relative z-30 flex flex-col gap-4 px-5 py-4 shadow-card md:flex-row md:items-center md:justify-between">
        <div className="flex flex-col items-start gap-2">
          <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-ink">
            Appraisals <KpiHelp title="Appraisals" help={HELP} />
          </h1>
          <span className="rounded-full border border-blue-200 bg-blue-100 px-3 py-0.5 text-[12.5px] font-semibold text-blue-800">{s.window}</span>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Dropdown value={cycle} onChange={setCycle} options={APPRAISAL_CYCLES} align="right" className="w-[210px]" />
          <Button variant="outline" className="h-10 px-5 font-semibold" onClick={() => setReminding(true)}>Remind agents</Button>
        </div>
      </Card>

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {stats.map((t) => (
          <Card key={t.label} className="px-5 py-4 shadow-card">
            <p className="text-[13.5px] text-ink-soft">{t.label}</p>
            <p className="mt-1 text-[28px] font-bold leading-tight text-ink">{t.value}</p>
            <p className="mt-1 text-[12.5px] text-ink-soft">{t.note}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Agent Appraisals</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">Review self-appraisals, track review status and compare scores.</p>
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-surface text-[13px] font-semibold text-slate-500">
                <th className="px-4 py-3 text-center font-semibold">S.No.</th>
                <th className="px-4 py-3 font-semibold">Agent</th>
                <th className="px-4 py-3 font-semibold">Kebele</th>
                <th className="px-4 py-3 font-semibold">Self-appraisal</th>
                <th className="px-4 py-3 font-semibold">Your review</th>
                <th className="px-4 py-3 font-semibold">Score</th>
                <th className="px-4 py-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="text-[14px] text-slate-700">
              {rows.length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6"><EmptyState title="No agents match your search" hint="Try a different search." /></td></tr>
              )}
              {pageRows.map((r) => (
                <tr key={r.id} onClick={() => open(r)} className="cursor-pointer border-b border-line-soft transition-colors last:border-0 hover:bg-brand-mint/60">
                  <td className="px-4 py-3.5 text-center">{r.no}</td>
                  <td className="px-4 py-3.5 font-medium text-ink">{r.name}</td>
                  <td className="px-4 py-3.5">{r.kebele}</td>
                  <td className="px-4 py-3.5">
                    {r.self === "Sent" ? `Sent ${r.sentOn}` : <Pill tone="amber" className="px-2.5 py-0.5 text-[12.5px]">Not yet</Pill>}
                  </td>
                  <td className="px-4 py-3.5"><Pill tone={REVIEW_STATE_TONE[r.review]} className="px-2.5 py-0.5 text-[12.5px]">{r.review}</Pill></td>
                  <td className="px-4 py-3.5">{r.score === null ? "—" : r.score.toFixed(1)}</td>
                  <td className="px-4 py-3.5 text-center">
                    <svg className="mx-auto h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label={`Review ${r.name}`}>
                      <path d="M9 6l6 6-6 6" />
                    </svg>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination {...paginationProps} itemLabel="results" />
      </Card>

      {reminding && <RemindDialog onClose={() => setReminding(false)} onSend={(summary) => setNotice(`Reminder sent to ${summary}.`)} />}
    </div>
  );
}
