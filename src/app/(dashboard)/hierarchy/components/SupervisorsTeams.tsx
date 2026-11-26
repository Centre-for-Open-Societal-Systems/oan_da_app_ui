"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill } from "@/components/ui/Pill";
import { Select } from "@/components/ui/Select";
import {
  canManageTeams,
  chainTo,
  selfIn,
  teamOfKebele,
  teamsModeFor,
  woredasFor,
  type ChangeLogEntry,
  type IndividualAssignment,
  type Team,
} from "@/features/hierarchy";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { useViewer, SpecialismTag } from "./HierarchyTree";

interface StatProps {
  label: string;
  value: React.ReactNode;
  subtitle?: string;
  accentBarColor: string;
  iconBox: string;
  icon: React.ReactNode;
}

function Stat({ label, value, subtitle, accentBarColor, iconBox, icon }: StatProps) {
  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-white p-3.5 sm:p-5 cursor-default select-none",
        "shadow-card transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-lg hover:border-slate-300/90",
      )}
    >
      <div className={cn("absolute left-0 top-0 bottom-0 w-1.25 sm:w-1.5 transition-all duration-300 ease-out group-hover:w-2", accentBarColor)} />
      <div className="flex items-start justify-between gap-2.5 pl-1">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] sm:text-[12px] font-bold text-ink-soft tracking-wider uppercase truncate">{label}</p>
          <div className="mt-1 sm:mt-1.5 text-[22px] sm:text-[28px] font-bold leading-tight text-ink tracking-tight transition-transform duration-300 ease-out group-hover:translate-x-0.5">
            {value}
          </div>
          {subtitle && (
            <p className="mt-0.5 text-[11px] sm:text-[11.5px] text-muted truncate hidden sm:block">
              {subtitle}
            </p>
          )}
        </div>
        <span
          className={cn(
            "flex h-9 w-9 sm:h-11 sm:w-11 shrink-0 items-center justify-center rounded-xl",
            "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            "group-hover:-translate-y-1 group-hover:scale-[1.12] group-hover:shadow-sm",
            iconBox,
          )}
        >
          {icon}
        </span>
      </div>
    </div>
  );
}

function teamColumns(editable: boolean): Column<Team>[] {
  const cols: Column<Team>[] = [
    {
      key: "sno",
      header: "S.No.",
      align: "center",
      className: "w-16 min-w-[64px] whitespace-nowrap",
      cell: (_t, index) => <span className="text-[13px] font-medium text-muted">{index + 1}</span>,
    },
    {
      key: "team",
      header: "Team",
      className: "min-w-[150px]",
      cell: (t) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200/60 text-[11.5px] font-bold shadow-2xs">
            {t.name.split(" ").map((w) => w[0]).join("")}
          </span>
          <span className="font-semibold text-ink text-[13.5px]">{t.name}</span>
        </div>
      ),
    },
    {
      key: "kebeles",
      header: "Kebeles",
      className: "min-w-[260px]",
      cell: (t) => (
        <div className="flex flex-wrap gap-1.5 py-1 max-w-[360px]">
          {t.kebeles.map((k) => (
            <span key={k} className="inline-flex items-center rounded-md bg-surface px-2 py-0.5 text-[11.5px] font-medium text-slate-700 border border-line-soft whitespace-nowrap shadow-3xs">
              {k}
            </span>
          ))}
        </div>
      ),
    },
    {
      key: "agents",
      header: "Agents",
      align: "center",
      className: "min-w-[90px]",
      cell: (t) => (
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11.5px] font-semibold text-brand-green border border-brand-green/20">
          <svg className="h-3 w-3 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
            <circle cx="9" cy="7" r="4" />
          </svg>
          <span>{t.agents}</span>
        </span>
      ),
    },
    {
      key: "lead",
      header: "Lead · Reports to",
      className: "min-w-[160px]",
      cell: (t) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-ink text-[13px]">{t.lead}</span>
          <span className="text-[10.5px] text-slate-500 font-medium px-1.5 py-0.2 rounded bg-slate-100 border border-slate-200/50">Lead</span>
        </div>
      ),
    },
    {
      key: "delegate",
      header: "Delegate",
      className: "min-w-[140px]",
      cell: (t) => <span className="text-[13px] text-ink-soft">{t.delegate || "—"}</span>,
    },
    {
      key: "individual",
      header: "Individual",
      align: "center",
      className: "min-w-[100px]",
      cell: (t) => (
        t.individual > 0 ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11.5px] font-bold bg-amber-50 text-amber-800 border border-amber-200/80">
            {t.individual}
          </span>
        ) : (
          <span className="text-[13px] text-muted">0</span>
        )
      ),
    },
    {
      key: "status",
      header: "Status",
      className: "min-w-[110px]",
      cell: (t) => (
        <Pill tone={t.status === "Active" ? "green" : "slate"} dot>
          {t.status}
        </Pill>
      ),
    },
  ];
  if (editable)
    cols.push({
      key: "edit",
      header: <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-400">Actions</span>,
      align: "right",
      className: "min-w-[90px]",
      cell: (t) => (
        <button
          type="button"
          title={`Edit ${t.name}`}
          aria-label={`Edit ${t.name}`}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-white text-ink-soft hover:border-brand-green hover:text-brand-green hover:bg-emerald-50 transition-all shadow-2xs cursor-pointer active:scale-95"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
          </svg>
        </button>
      ),
    });
  return cols;
}

function individualColumns(editable: boolean): Column<IndividualAssignment>[] {
  const cols: Column<IndividualAssignment>[] = [
    {
      key: "sno",
      header: "S.No.",
      align: "center",
      className: "w-16 min-w-[64px] whitespace-nowrap",
      cell: (_a, index) => <span className="text-[13px] font-medium text-muted">{index + 1}</span>,
    },
    {
      key: "agent",
      header: "Agent",
      className: "min-w-[160px]",
      cell: (a) => (
        <div className="flex items-center gap-2.5">
          <span className="flex h-7.5 w-7.5 shrink-0 items-center justify-center rounded-full bg-purple-50 text-purple-700 border border-purple-200/60 text-[11px] font-bold shadow-2xs">
            {a.agent.split(" ").map((w) => w[0]).join("")}
          </span>
          <span className="font-semibold text-ink text-[13.5px]">{a.agent}</span>
        </div>
      ),
    },
    {
      key: "kebele",
      header: "Kebele · Team",
      className: "min-w-[200px]",
      cell: (a) => (
        <span className="text-[13px] text-ink">
          <span className="font-medium text-slate-800">{a.kebele}</span>
          <span className="text-slate-300"> · </span>
          <span className="text-slate-500 font-medium">{a.team}</span>
        </span>
      ),
    },
    {
      key: "specialism",
      header: "Specialism",
      className: "min-w-[160px]",
      cell: (a) => <SpecialismTag specialism={a.specialism} />,
    },
    {
      key: "reportsTo",
      header: "Reports to",
      className: "min-w-[160px]",
      cell: (a) => (
        <div className="flex items-center gap-1.5">
          <span className="font-semibold text-ink text-[13px]">{a.reportsTo}</span>
          <span className="inline-flex items-center rounded bg-slate-100 px-1.5 py-0.2 text-[10.5px] font-medium text-slate-600">Lead</span>
        </div>
      ),
    },
    {
      key: "why",
      header: "Why",
      className: "min-w-[150px]",
      cell: (a) => <span className="text-[12.5px] text-ink-soft">{a.why}</span>,
    },
    {
      key: "since",
      header: "Since",
      className: "min-w-[130px]",
      cell: (a) => <span className="text-[12.5px] font-medium text-slate-500 whitespace-nowrap">{a.since}</span>,
    },
    {
      key: "scope",
      header: "Scope",
      className: "min-w-[110px]",
      cell: () => <Pill tone="blue">Individual</Pill>,
    },
  ];

  if (editable) {
    cols.push({
      key: "actions",
      header: <span className="text-[11.5px] font-bold uppercase tracking-wider text-slate-400">Actions</span>,
      align: "right",
      className: "min-w-[90px]",
      cell: (a) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            title={`Edit ${a.agent}`}
            aria-label={`Edit ${a.agent}`}
            className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-line bg-white text-ink-soft hover:border-brand-green hover:text-brand-green hover:bg-emerald-50 transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 20h9M16.5 3.5a2.12 2.12 0 013 3L7 19l-4 1 1-4z" />
            </svg>
          </button>
          <button
            type="button"
            title={`Remove individual assignment for ${a.agent}`}
            aria-label={`Remove individual assignment for ${a.agent}`}
            className="inline-flex h-7.5 w-7.5 items-center justify-center rounded-lg border border-line bg-white text-ink-soft hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-all shadow-2xs cursor-pointer active:scale-95"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
            </svg>
          </button>
        </div>
      ),
    });
  }

  return cols;
}

function ChangeLog({ entries }: { entries: ChangeLogEntry[] }) {
  if (entries.length === 0) return null;
  return (
    <Card className="rounded-2xl border border-line bg-white shadow-card p-0 overflow-hidden">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3.5 border-b border-line-soft bg-surface/30">
        <div className="flex items-center gap-2">
          <h2 className="text-[16px] sm:text-[17px] font-bold text-ink">Change log</h2>
          <span
            title="Changes to teams, kebeles and reporting lines"
            className="inline-flex h-4.5 w-4.5 items-center justify-center rounded-full border border-slate-300 text-[10.5px] font-bold text-ink-soft cursor-help hover:border-slate-400"
          >
            ?
          </span>
        </div>
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11.5px] font-medium text-slate-600 border border-slate-200">
          {entries.length} recent changes
        </span>
      </div>
      <ol className="px-4 sm:px-6 py-4 flex flex-col">
        {entries.map((entry, index) => {
          const isFirst = index === 0;
          const isLast = index === entries.length - 1;
          return (
            <li key={`${entry.on}-${entry.text}-${index}`} className={cn("relative pl-7 sm:pl-8", !isLast && "pb-6")}>
              {/* Timeline progress line connecting to next event */}
              {!isLast && (
                <span
                  className="absolute left-[7px] top-3.5 bottom-0 w-[2px] bg-gradient-to-b from-brand-green/70 via-emerald-200 to-slate-200"
                  aria-hidden="true"
                />
              )}
              {/* Timeline dot */}
              <span
                className={cn(
                  "absolute left-0 top-1 z-10 flex h-4 w-4 items-center justify-center rounded-full border-2 bg-white transition-all shadow-2xs",
                  isFirst ? "border-brand-green ring-4 ring-emerald-50" : "border-slate-300 ring-2 ring-white",
                )}
              >
                <span className={cn("h-1.5 w-1.5 rounded-full", isFirst ? "bg-brand-green" : "bg-slate-400")} />
              </span>
              <div className="min-w-0 flex-1 -mt-0.5">
                <p className="text-[13.5px] sm:text-[14px] text-ink font-semibold leading-snug">{entry.text}</p>
                <p className="mt-1 text-[12px] text-ink-soft flex items-center gap-1.5 flex-wrap">
                  <span className="font-medium text-slate-700">{entry.by}</span>
                  <span className="text-muted">·</span>
                  <span className="text-muted">{entry.on}</span>
                </p>
              </div>
            </li>
          );
        })}
      </ol>
      <div className="border-t border-line-soft px-4 sm:px-6 py-3 bg-surface/20">
        <button type="button" className="inline-flex items-center gap-1 text-[13px] font-semibold text-brand-green hover:underline cursor-pointer">
          <span>Full history</span>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 18l6-6-6-6" />
          </svg>
        </button>
      </div>
    </Card>
  );
}

const Location = ({ children }: { children: React.ReactNode }) => (
  <div className="inline-flex self-start items-center gap-2 rounded-xl border border-line-soft bg-white/95 px-3.5 py-2 text-[13px] sm:text-[13.5px] font-semibold text-ink shadow-2xs">
    <span className="flex h-5 w-5 items-center justify-center rounded-md bg-emerald-50 text-brand-green">
      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
        <circle cx="12" cy="10" r="3" />
      </svg>
    </span>
    <span className="text-slate-500 font-medium">Scope:</span>
    <span>{children}</span>
  </div>
);

// Supervisors and teams of a woreda, by role (see teamsModeFor):
//   DA         → their own team, who they report to, and changes to their team;
//   Supervisor → their woreda's teams, which they manage;
//   Admin      → any woreda, managed; Executive → woredas of their region, read only; Comms → any woreda, read only.
// UI only: static sample data, no API.
export function SupervisorsTeams() {
  const role = useAuthStore((s) => s.role);
  const viewer = useViewer();
  const mode = teamsModeFor(role);
  const editable = canManageTeams(role);
  const woredas = woredasFor(role, viewer);
  const [picked, setPicked] = useState(woredas[0]?.id ?? "");
  const woreda = woredas.find((w) => w.id === picked) ?? woredas[0];

  if (!woreda) return <Card className="py-8 text-center text-[14px] text-muted rounded-2xl shadow-card">No woredas in your scope.</Card>;
  const path = `${woreda.region} › ${woreda.name} woreda`;
  const agents = woreda.teams.reduce((n, t) => n + t.agents, 0);

  // ---- DA: own team -----------------------------------------------------------------------------------------
  if (mode === "own") {
    const self = selfIn(role, viewer);
    const team = teamOfKebele(woreda.teams, self?.place ?? viewer.kebele);
    const supervisor = self ? chainTo(self.id).at(-2) : undefined;
    const mentions = (text: string) => !!team && (text.includes(team.name) || team.kebeles.some((k) => text.includes(k)) || (!!self && text.includes(self.name)));
    return (
      <div className="flex flex-col gap-4">
        <Location>
          {path}
          {self && <span className="text-ink-soft"> · {self.place} kebele</span>}
        </Location>
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <Stat
            label="My team"
            value={team?.name ?? "—"}
            subtitle="assigned team"
            accentBarColor="bg-emerald-500"
            iconBox="bg-emerald-50 text-emerald-600"
            icon={
              <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                <path d="M16 3.13a4 4 0 010 7.75" />
              </svg>
            }
          />
          <Stat
            label="Reports to"
            value={supervisor?.name ?? team?.lead ?? "—"}
            subtitle="direct supervisor"
            accentBarColor="bg-blue-500"
            iconBox="bg-blue-50 text-blue-600"
            icon={
              <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <polyline points="16 11 18 13 22 9" />
              </svg>
            }
          />
          <Stat
            label="Delegate"
            value={team?.delegate ?? "—"}
            subtitle="stand-in reviewer"
            accentBarColor="bg-purple-500"
            iconBox="bg-purple-50 text-purple-600"
            icon={
              <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10" />
                <polyline points="12 6 12 12 14 14" />
              </svg>
            }
          />
          <Stat
            label="Agents in team"
            value={team?.agents ?? "—"}
            subtitle="peers in kebele"
            accentBarColor="bg-amber-500"
            iconBox="bg-amber-50 text-amber-600"
            icon={
              <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            }
          />
        </div>
        <Card className="rounded-2xl border border-line bg-white shadow-card overflow-hidden p-0">
          <DataTable
            title={
              <div className="flex items-center gap-2.5">
                <h2 className="text-[16px] sm:text-[17px] font-bold text-ink">My team</h2>
                <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11.5px] font-medium text-slate-600 border border-slate-200">
                  {team ? "1 active team" : "No team"}
                </span>
              </div>
            }
            columns={teamColumns(false)}
            rows={team ? [team] : []}
            rowKey={(t) => t.id}
            paginate={false}
            minWidth="860px"
            emptyTitle="You are not in a team yet"
            emptyHint="Your supervisor adds your kebele to a team."
          />
        </Card>
        <ChangeLog entries={woreda.changeLog.filter((e) => mentions(e.text))} />
      </div>
    );
  }

  // ---- Supervisor / Admin / Executive / Comms: a woreda's teams -----------------------------------------------
  return (
    <div className="flex flex-col gap-4">
      {mode === "browse" && woredas.length > 1 ? (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 rounded-2xl border border-line bg-white p-3.5 sm:p-4 shadow-card">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200/50">
              <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </div>
            <div>
              <p className="text-[13.5px] sm:text-[14px] font-bold text-ink">Woreda Scope</p>
              <p className="text-[12px] text-ink-soft">Inspect teams and supervisor assignments per woreda</p>
            </div>
          </div>
          <div className="w-full sm:w-[280px]">
            <Select value={woreda.id} onChange={(e) => setPicked(e.target.value)} aria-label="Woreda" className="h-10 rounded-xl font-medium">
              {woredas.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.region} › {w.name} woreda
                </option>
              ))}
            </Select>
          </div>
        </div>
      ) : (
        <Location>{path}</Location>
      )}

      {/* 4 Interactive Stat Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <Stat
          label="Supervisors"
          value={woreda.supervisors}
          subtitle="woreda supervisors"
          accentBarColor="bg-emerald-500"
          iconBox="bg-emerald-50 text-emerald-600"
          icon={
            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <polyline points="16 11 18 13 22 9" />
            </svg>
          }
        />
        <Stat
          label="Teams"
          value={woreda.teams.length}
          subtitle={`${woreda.teams.length} active teams`}
          accentBarColor="bg-blue-500"
          iconBox="bg-blue-50 text-blue-600"
          icon={
            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
          }
        />
        <Stat
          label="Agents"
          value={agents}
          subtitle="in this woreda"
          accentBarColor="bg-purple-500"
          iconBox="bg-purple-50 text-purple-600"
          icon={
            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          }
        />
        <Stat
          label="Set individually"
          value={woreda.individuals.length}
          subtitle="custom reporting"
          accentBarColor="bg-amber-500"
          iconBox="bg-amber-50 text-amber-600"
          icon={
            <svg className="h-5 w-5 sm:h-6 sm:w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          }
        />
      </div>

      {/* Teams in woreda table */}
      <Card className="rounded-2xl border border-line bg-white shadow-card overflow-hidden p-0">
        <DataTable
          title={
            <div className="flex items-center gap-2.5">
              <h2 className="text-[16px] sm:text-[17px] font-bold text-ink">Teams in {woreda.name} woreda</h2>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11.5px] font-medium text-slate-600 border border-slate-200">
                {woreda.teams.length} teams
              </span>
            </div>
          }
          columns={teamColumns(editable)}
          rows={woreda.teams}
          rowKey={(t) => t.id}
          paginate={false}
          minWidth="860px"
          emptyTitle="No teams yet"
          emptyHint="Create a team to group this woreda's kebeles under a supervisor."
        />
      </Card>

      {/* Set individually table */}
      <Card className="rounded-2xl border border-line bg-white shadow-card overflow-hidden p-0">
        <DataTable
          title={
            <div className="flex items-center gap-2.5">
              <h2 className="text-[16px] sm:text-[17px] font-bold text-ink">Set individually</h2>
              <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-[11.5px] font-medium text-slate-600 border border-slate-200">
                {woreda.individuals.length} assigned
              </span>
            </div>
          }
          columns={individualColumns(editable)}
          rows={woreda.individuals}
          rowKey={(a) => a.agent}
          paginate={false}
          minWidth="860px"
          emptyTitle="No agents set individually"
          emptyHint="Every agent reports to their team lead."
        />
        {editable && (
          <div className="border-t border-line-soft px-4 sm:px-6 py-3.5 bg-surface/30">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/50 px-3.5 py-1.5 text-[13px] font-semibold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-400 transition-all duration-150 cursor-pointer shadow-2xs active:scale-95"
            >
              <svg className="h-4 w-4 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
              <span>Set an agent individually</span>
            </button>
          </div>
        )}
      </Card>

      {/* Change log */}
      <ChangeLog entries={woreda.changeLog} />
    </div>
  );
}
