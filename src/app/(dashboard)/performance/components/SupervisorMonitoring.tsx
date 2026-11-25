"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExportButton } from "@/components/ui/ExportButton";
import { Banner } from "@/components/ui/Banner";
import { Pill } from "@/components/ui/Pill";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { fileDate, type CsvColumn } from "@/lib/download";
import { downloadTable, formatLabel } from "@/lib/export";
import { cn } from "@/lib/utils";
import {
  APPRAISAL_CYCLES,
  FIGURES_STATUS_TONE,
  MONITOR_KPIS,
  MONITOR_KPI_FILTER,
  MONITOR_TREE,
  TEAM_MEMBERS,
  TEAM_SUMMARY,
  achievementTone,
  type MonitorArea,
  type TeamMemberRow,
} from "@/features/performance";
import { BAR } from "./SupervisorTeam";
import { KpiHelp } from "./KpiHelp";

const ALL_KPIS = "all";
const KPI_OPTIONS = [{ value: ALL_KPIS, label: "All KPIs" }, ...MONITOR_KPI_FILTER.map((k) => ({ value: k.key, label: k.label }))];
const woredaAverage = MONITOR_KPIS.reduce((s, k) => s + k.pct, 0) / MONITOR_KPIS.length;

const HELP = { summary: "KPI results rolled up by area. Select an area to drill down to woredas and agents." };
const clamp = (n: number) => Math.max(0, Math.min(100, Math.round(n)));

function Chevron({ label }: { label: string }) {
  return (
    <svg className="mx-auto h-4 w-4 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-label={label}>
      <path d="M9 6l6 6-6 6" />
    </svg>
  );
}

function Bar({ pct }: { pct: number }) {
  const tone = BAR[achievementTone(pct)];
  return (
    <div className="w-[140px]">
      <p className={cn("text-right text-[12px] font-medium", tone.text)}>{pct}%</p>
      <div className={cn("h-1.5 overflow-hidden rounded-full", tone.track)}>
        <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Supervisor's Monitoring: KPI results rolled up by area (Federal › Region › Zone › Woreda), then per agent.
export function SupervisorMonitoring() {
  const [path, setPath] = useState<MonitorArea[]>([MONITOR_TREE, MONITOR_TREE.children![0], MONITOR_TREE.children![0].children![0], MONITOR_TREE.children![0].children![0].children![0]]);
  const [kpi, setKpi] = useState(ALL_KPIS);
  const [cycle, setCycle] = useState(APPRAISAL_CYCLES[0]);
  const [selected, setSelected] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const node = path[path.length - 1];
  const showAgents = node.children === undefined;
  const s = node.summary;

  const kpiPct = kpi === ALL_KPIS ? woredaAverage : (MONITOR_KPIS.find((k) => k.key === kpi)?.pct ?? woredaAverage);
  // An agent's value for a KPI scales their overall result by how the KPI fares against the woreda average.
  const factor = kpiPct / woredaAverage;
  const agents = TEAM_MEMBERS.map((m) => ({ ...m, pct: clamp(m.halfYear * factor) }));
  const agent = agents.find((m) => m.id === selected);
  const { pageRows: agentRows, paginationProps: agentPaging } = usePagination(agents);
  const areas = node.children ?? [];
  const { pageRows: areaRows, paginationProps: areaPaging } = usePagination(areas);

  const drill = (a: MonitorArea) => {
    setPath((p) => [...p, a]);
    setSelected(null);
  };
  const goTo = (i: number) => {
    setPath((p) => p.slice(0, i + 1));
    setSelected(null);
  };

  const panel = MONITOR_KPIS.map((k) => ({ ...k, value: agent ? clamp(agent.halfYear * (k.pct / woredaAverage)) : k.pct }));

  const stats = [
    { label: "Agents", value: s.agents.toLocaleString(), note: `in ${s.kebeles.toLocaleString()} kebeles`, help: "Agents in this area with a template this cycle.", tone: "text-ink" },
    { label: `${TEAM_SUMMARY.figuresMonth} figures in`, value: `${s.figuresIn}%`, note: TEAM_SUMMARY.figuresDue, help: "Share of agents who have added this month’s figures.", tone: "text-ink" },
    { label: "Achievement so far", value: `${s.achievement}%`, note: "Woreda average", help: "Average half-year achievement of agents in this area.", tone: "text-ink" },
    { label: "May need support", value: String(s.needSupport), note: "agents, for coaching", help: "Agents below 60% for two months running, for coaching. Not shown to agents.", tone: "text-ink" },
  ];

  const agentColumns: CsvColumn<TeamMemberRow & { pct: number }>[] = [
    { header: "Agent", value: (r) => r.name },
    { header: "Kebele", value: (r) => r.kebele },
    { header: `${TEAM_SUMMARY.figuresMonth} figures`, value: (r) => r.figures },
    { header: "Achievement (%)", value: (r) => r.pct },
  ];
  const areaColumns: CsvColumn<MonitorArea>[] = [
    { header: "Area", value: (r) => r.name },
    { header: "Agents", value: (r) => r.summary.agents },
    { header: `${TEAM_SUMMARY.figuresMonth} figures in (%)`, value: (r) => r.summary.figuresIn },
    { header: "Achievement (%)", value: (r) => r.summary.achievement },
  ];
  const exportReport = (format: Parameters<typeof downloadTable>[0]) => {
    const base = `monitoring-${node.name.toLowerCase().replace(/\s+/g, "-")}-${fileDate()}`;
    if (showAgents) downloadTable(format, base, agents, agentColumns, `Monitoring – ${node.name}`);
    else downloadTable(format, base, areas, areaColumns, `Monitoring – ${node.name}`);
    setNotice(`Exported ${node.name} (${formatLabel(format)}).`);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="relative z-30 flex flex-col gap-4 px-5 py-4 shadow-card lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-[22px] font-bold tracking-tight text-ink">
            Monitoring <KpiHelp title="Monitoring" help={HELP} />
          </h1>
          <nav aria-label="Area" className="mt-1.5 flex flex-wrap items-center gap-1.5 text-[14px]">
            {path.map((a, i) => (
              <span key={a.name} className="flex items-center gap-1.5">
                {i > 0 && <span className="text-slate-400" aria-hidden="true">›</span>}
                {i === path.length - 1 ? (
                  <span className="font-semibold text-ink" aria-current="page">{a.name}</span>
                ) : (
                  <button type="button" onClick={() => goTo(i)} className="font-medium text-brand-green hover:underline">{a.name}</button>
                )}
              </span>
            ))}
          </nav>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Dropdown value={kpi} onChange={setKpi} options={KPI_OPTIONS} align="right" className="w-[180px]" />
          <Dropdown value={cycle} onChange={setCycle} options={APPRAISAL_CYCLES} align="right" className="w-[200px]" />
          <ExportButton className="h-10 bg-brand-green px-5 text-[14px] text-white hover:bg-brand-green-dark" onExport={exportReport} />
        </div>
      </Card>

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((t) => (
          <Card key={t.label} className="px-5 py-4 shadow-card">
            <p className="flex items-center gap-2 text-[13.5px] text-ink-soft">{t.label} <KpiHelp title={t.label} help={{ summary: t.help }} /></p>
            <p className={cn("mt-1 text-[28px] font-bold leading-tight", t.tone)}>{t.value}</p>
            <p className="mt-1 text-[12.5px] text-ink-soft">{t.note}</p>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1fr_380px]">
        <Card className="self-start overflow-hidden p-0 shadow-card">
          <div className="overflow-x-auto">
            {showAgents ? (
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-surface text-[13px] font-semibold text-slate-500">
                    <th className="px-4 py-3 text-center font-semibold">S.No.</th>
                    <th className="px-4 py-3 font-semibold">Agent</th>
                    <th className="px-4 py-3 font-semibold">Kebele</th>
                    <th className="px-4 py-3 font-semibold">{TEAM_SUMMARY.figuresMonth} figures</th>
                    <th className="px-4 py-3 font-semibold">Achievement</th>
                    <th className="px-4 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="text-[14px] text-slate-700">
                  {agentRows.map((m) => (
                    <tr
                      key={m.id}
                      onClick={() => setSelected((cur) => (cur === m.id ? null : m.id))}
                      aria-selected={selected === m.id}
                      className={cn("cursor-pointer border-b border-line-soft transition-colors last:border-0 hover:bg-brand-mint/60", selected === m.id && "bg-brand-mint/60")}
                    >
                      <td className="px-4 py-3 text-center">{m.no}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{m.name}</td>
                      <td className="px-4 py-3">{m.kebele}</td>
                      <td className="px-4 py-3"><Pill tone={FIGURES_STATUS_TONE[m.figures]} className="px-2.5 py-0.5 text-[12.5px]">{m.figures}</Pill></td>
                      <td className="px-4 py-3"><Bar pct={m.pct} /></td>
                      <td className="px-4 py-3 text-center"><Chevron label={`Show KPIs for ${m.name}`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : areas.length === 0 ? (
              <div className="px-4 py-8"><EmptyState title={`No areas loaded for ${node.name} yet`} hint="Pick another area from the path above." /></div>
            ) : (
              <table className="w-full min-w-[640px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-surface text-[13px] font-semibold text-slate-500">
                    <th className="px-4 py-3 text-center font-semibold">S.No.</th>
                    <th className="px-4 py-3 font-semibold">Area</th>
                    <th className="px-4 py-3 font-semibold">Agents</th>
                    <th className="px-4 py-3 font-semibold">{TEAM_SUMMARY.figuresMonth} figures in</th>
                    <th className="px-4 py-3 font-semibold">Achievement</th>
                    <th className="px-4 py-3 text-center font-semibold">Action</th>
                  </tr>
                </thead>
                <tbody className="text-[14px] text-slate-700">
                  {areaRows.map((a, i) => (
                    <tr key={a.name} onClick={() => drill(a)} className="cursor-pointer border-b border-line-soft transition-colors last:border-0 hover:bg-brand-mint/60">
                      <td className="px-4 py-3 text-center">{(areaPaging.page - 1) * areaPaging.pageSize + i + 1}</td>
                      <td className="px-4 py-3 font-semibold text-ink">{a.name}</td>
                      <td className="px-4 py-3">{a.summary.agents.toLocaleString()}</td>
                      <td className="px-4 py-3">{a.summary.figuresIn}%</td>
                      <td className="px-4 py-3"><Bar pct={a.summary.achievement} /></td>
                      <td className="px-4 py-3 text-center"><Chevron label={`Open ${a.name}`} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {showAgents ? <TablePagination {...agentPaging} itemLabel="results" /> : areas.length > 0 && <TablePagination {...areaPaging} itemLabel="results" />}
        </Card>

        <Card className="self-start overflow-hidden p-0 shadow-card">
          <h2 className="flex items-center gap-2 border-b border-line px-5 py-4 text-[16px] font-semibold text-ink">
            By KPI <KpiHelp title="By KPI" help={{ summary: "Average achievement on each KPI in this area." }} />
          </h2>
          <div className="flex flex-col gap-3.5 px-5 py-4">
            {panel.map((k) => {
              const tone = BAR[achievementTone(k.value)];
              return (
                <div key={k.key}>
                  <div className="flex items-center justify-between text-[14px] text-ink">
                    <span>{k.label}</span>
                    <span className="font-semibold">{k.value}%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-line" role="progressbar" aria-valuenow={k.value} aria-valuemin={0} aria-valuemax={100}>
                    <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${k.value}%` }} />
                  </div>
                </div>
              );
            })}
            <p className="text-[12.5px] text-ink-soft">
              {agent ? (
                <>Showing {agent.name}. <button type="button" onClick={() => setSelected(null)} className="font-semibold text-brand-green hover:underline">Show everyone</button></>
              ) : showAgents ? (
                "Select an agent to see their KPIs."
              ) : (
                "Select an area to drill down."
              )}
            </p>
          </div>
        </Card>
      </div>
    </div>
  );
}
