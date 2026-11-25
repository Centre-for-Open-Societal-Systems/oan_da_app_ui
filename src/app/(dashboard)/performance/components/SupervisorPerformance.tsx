"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { EmptyState } from "@/components/ui/EmptyState";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import {
  SUPERVISOR_KPIS,
  SUPERVISOR_KPI_STATUS_TONE,
  SUPERVISOR_SCORECARD,
  WOREDA_SUMMARY,
  type SupervisorKpiRow,
  type SupervisorKpiStatus,
} from "@/features/performance";
import { DateRangeDropdown } from "../../dashboard/components/DateRangeDropdown";
import { KpiHelp } from "./KpiHelp";
import { OpenDiscussionDrawer } from "./OpenDiscussionDrawer";

const SEARCH_PLACEHOLDER = searchPlaceholder(["KPI", "Target", "Status"]);

const BAR_COLOR: Record<SupervisorKpiStatus, string> = {
  "On track": "bg-brand-green",
  "Needs support": "bg-danger",
  Ahead: "bg-blue-600",
  "Slightly behind": "bg-orange-600",
  "From Tir": "bg-line",
};
const BAR_TEXT: Record<SupervisorKpiStatus, string> = {
  "On track": "text-brand-green",
  "Needs support": "text-danger",
  Ahead: "text-blue-600",
  "Slightly behind": "text-orange-600",
  "From Tir": "text-muted",
};

// Supervisor view: cycle score, KPI template, team roll-up, then the scorecard table with a detail card for the picked KPI.
export function SupervisorPerformance() {
  const name = useAuthStore((s) => s.user?.name) ?? "Tadesse Alemu";
  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState("sk5");
  const [discussionOpen, setDiscussionOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const rows = SUPERVISOR_KPIS.filter((r) => matchesQuery(query, r));
  const { pageRows, paginationProps } = usePagination(rows);
  const selected = SUPERVISOR_KPIS.find((r) => r.id === selectedId) ?? SUPERVISOR_KPIS[0];
  const sc = SUPERVISOR_SCORECARD;

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="relative z-50 flex flex-col gap-4 px-4 py-5 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink sm:text-[22px]">My performance</h1>
          <p className="mt-1.5 text-[13.5px] text-ink-soft">
            {name} · Woreda Supervisor · {WOREDA_SUMMARY.woreda} · {sc.cycle}
          </p>
        </div>
        <DateRangeDropdown />
      </Card>

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="px-4 py-4 shadow-card">
          <p className="text-[13.5px] text-ink-soft">{sc.cycle}</p>
          <div className="mt-1 flex items-center gap-3">
            <span className="text-[30px] font-bold leading-none text-ink">{sc.score}%</span>
            <Pill tone="green">{sc.status}</Pill>
          </div>
          <div className="mt-3 h-2 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={sc.score} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-brand-green" style={{ width: `${sc.score}%` }} />
          </div>
        </Card>
        <Card className="px-4 py-4 shadow-card">
          <p className="text-[13.5px] text-ink-soft">Template</p>
          <p className="mt-1 text-[20px] font-bold text-ink">{sc.template}</p>
          <p className="mt-2 text-[12.5px] text-ink-soft">{sc.templateNote}</p>
        </Card>
        <Card className="px-4 py-4 shadow-card">
          <p className="text-[13.5px] text-ink-soft">Your team</p>
          <p className="mt-1 text-[30px] font-bold leading-none text-ink">{sc.teamScore}%</p>
          <p className="mt-3 text-[12.5px] text-ink-soft">{sc.teamNote}</p>
        </Card>
      </div>

      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">My Performance</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">Track KPI targets, achievement and progress.</p>
          </div>
          <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-surface text-[13px] font-semibold text-slate-500">
                <th className="px-4 py-3 font-semibold">S.No.</th>
                <th className="px-4 py-3 font-semibold">KPI</th>
                <th className="px-4 py-3 font-semibold">Weight</th>
                <th className="px-4 py-3 font-semibold">Target</th>
                <th className="px-4 py-3 font-semibold">So far</th>
                <th className="px-4 py-3 font-semibold">Achievement</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody className="text-[14px] text-slate-700">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6"><EmptyState title="No KPIs match your search" hint="Try a different search." /></td>
                </tr>
              )}
              {pageRows.map((r: SupervisorKpiRow) => (
                <tr
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={cn("cursor-pointer border-b border-line-soft transition-colors last:border-0 hover:bg-surface", r.id === selected.id && "bg-brand-mint/60")}
                >
                  <td className="px-4 py-3.5 text-center">{r.no}</td>
                  <td className="px-4 py-3.5">
                    <span className="flex items-center gap-2 text-ink">{r.kpi}<KpiHelp title={r.kpi} help={r.help} /></span>
                  </td>
                  <td className="px-4 py-3.5">{r.weight}%</td>
                  <td className="px-4 py-3.5">{r.target}</td>
                  <td className="px-4 py-3.5">{r.soFar}</td>
                  <td className="px-4 py-3.5">
                    <div className="flex w-[170px] items-center gap-2">
                      <div className="flex-1">
                        {r.achievement !== null && (
                          <p className={cn("text-right text-[12px] font-medium", BAR_TEXT[r.status])}>{r.achievement}%</p>
                        )}
                        <div className="h-1.5 overflow-hidden rounded-full bg-line-soft">
                          <div className={cn("h-full rounded-full", BAR_COLOR[r.status])} style={{ width: `${Math.min(100, r.achievement ?? 100)}%`, opacity: r.achievement === null ? 0.5 : 1 }} />
                        </div>
                      </div>
                      {r.achievement === null && <span className="text-muted">—</span>}
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><Pill tone={SUPERVISOR_KPI_STATUS_TONE[r.status]}>{r.status}</Pill></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <TablePagination {...paginationProps} itemLabel="results" />
      </Card>

      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[16px] font-semibold text-ink">{selected.kpi}</h2>
            <Pill tone={SUPERVISOR_KPI_STATUS_TONE[selected.status]}>{selected.status}</Pill>
          </div>
          <button
            type="button"
            onClick={() => setDiscussionOpen(true)}
            className="inline-flex h-10 items-center justify-center whitespace-nowrap rounded-md border border-line px-5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface"
          >
            Open discussions
          </button>
        </div>
        <div className="flex flex-col gap-2.5 border-t border-line px-4 py-3.5 text-[13px] text-ink-soft">
          <div className="flex flex-wrap items-center gap-1.5">
            <span>Target set by</span>
            {selected.targetChain.map((step, i) => (
              <span key={step} className="flex items-center gap-1.5">
                {i > 0 && <span aria-hidden="true">›</span>}
                <Pill tone={i === selected.targetChain.length - 1 ? "green" : "slate"} className="px-2.5 py-0.5 text-[12px]">{step}</Pill>
              </span>
            ))}
          </div>
          <p className="text-[13.5px]">{selected.note}</p>
        </div>
      </Card>

      {discussionOpen && (
        <OpenDiscussionDrawer kpi={selected} onClose={() => setDiscussionOpen(false)} onSend={(summary) => setNotice(`Reply sent. ${summary}`)} />
      )}
    </div>
  );
}
