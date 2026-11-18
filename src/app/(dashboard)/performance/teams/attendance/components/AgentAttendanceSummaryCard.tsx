"use client";

import {
  type AttendanceAgent,
  AGENT_WEEKLY_STATS,
} from "./attendanceData";

interface AgentAttendanceSummaryCardProps {
  agent?: AttendanceAgent | null;
  isAllAgents?: boolean;
  totalAgentsCount?: number;
  checkedIn?: number;
  notCheckedIn?: number;
  hoursSoFar?: string;
}

export function AgentAttendanceSummaryCard({
  agent,
  isAllAgents = false,
  totalAgentsCount = 9,
  checkedIn,
  notCheckedIn,
  hoursSoFar,
}: AgentAttendanceSummaryCardProps) {
  // If all agents are selected
  if (isAllAgents || !agent) {
    return (
      <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white px-5 py-3.5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-6 animate-fade-in">
        {/* Left: Team Avatar & Details */}
        <div className="flex items-center gap-3.5">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[13px] font-bold text-brand-green border border-emerald-100">
            TA
          </div>
          <div className="leading-tight">
            <h3 className="text-[16px] font-bold text-ink">All agents ({totalAgentsCount})</h3>
            <p className="mt-0.5 text-[13px] text-muted">
              Dembi Dima & surrounding kebeles · Q4 2026
            </p>
          </div>
        </div>

        {/* Right: 3 Metric Columns (Checked in, Not checked in, Hours so far) */}
        <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-12 pt-2 sm:pt-0 border-t border-line-soft sm:border-0">
          <div className="flex flex-col items-center text-center">
            <span className="text-[20px] font-bold text-brand-green leading-none sm:text-[22px]">
              {checkedIn ?? 15}
            </span>
            <span className="mt-1 text-[12px] font-medium text-muted">
              Checked in
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="text-[20px] font-bold text-danger leading-none sm:text-[22px]">
              {notCheckedIn ?? 3}
            </span>
            <span className="mt-1 text-[12px] font-medium text-muted">
              Not checked in
            </span>
          </div>

          <div className="flex flex-col items-center text-center">
            <span className="text-[20px] font-bold text-ink leading-none sm:text-[22px]">
              {hoursSoFar ?? "142h 20m"}
            </span>
            <span className="mt-1 text-[12px] font-medium text-muted">
              Hours so far
            </span>
          </div>
        </div>
      </div>
    );
  }

  // Single Agent mode (Exact match for Image 3 when Chaltu Fikadu or any agent is selected)
  const stats = AGENT_WEEKLY_STATS[agent.id] ?? {
    checkedIn: checkedIn ?? 1,
    notCheckedIn: notCheckedIn ?? 1,
    hoursSoFar: hoursSoFar ?? "8h 28m",
  };

  const finalCheckedIn = checkedIn !== undefined ? checkedIn : stats.checkedIn;
  const finalNotCheckedIn = notCheckedIn !== undefined ? notCheckedIn : stats.notCheckedIn;
  const finalHours = hoursSoFar !== undefined ? hoursSoFar : stats.hoursSoFar;

  return (
    <div className="flex flex-col gap-4 rounded-2xl border border-line bg-white px-5 py-3.5 shadow-card sm:flex-row sm:items-center sm:justify-between sm:px-6 animate-fade-in">
      {/* Left: Agent Avatar & Details */}
      <div className="flex items-center gap-3.5">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-[14px] font-bold text-brand-green border border-emerald-100">
          {agent.initials}
        </div>
        <div className="leading-tight">
          <h3 className="text-[16px] font-bold text-ink">{agent.name}</h3>
          <p className="mt-0.5 text-[13px] text-muted">
            {agent.role} · {agent.kebele} kebele
          </p>
        </div>
      </div>

      {/* Right: 3 Metric Columns (Checked in, Not checked in, Hours so far) */}
      <div className="flex items-center justify-between sm:justify-end gap-6 sm:gap-12 pt-2 sm:pt-0 border-t border-line-soft sm:border-0">
        {/* Metric 1: Checked in */}
        <div className="flex flex-col items-center text-center">
          <span className="text-[20px] font-bold text-brand-green leading-none sm:text-[22px]">
            {finalCheckedIn}
          </span>
          <span className="mt-1 text-[12px] font-medium text-muted">
            Checked in
          </span>
        </div>

        {/* Metric 2: Not checked in */}
        <div className="flex flex-col items-center text-center">
          <span className="text-[20px] font-bold text-danger leading-none sm:text-[22px]">
            {finalNotCheckedIn}
          </span>
          <span className="mt-1 text-[12px] font-medium text-muted">
            Not checked in
          </span>
        </div>

        {/* Metric 3: Hours so far */}
        <div className="flex flex-col items-center text-center">
          <span className="text-[20px] font-bold text-ink leading-none sm:text-[22px]">
            {finalHours}
          </span>
          <span className="mt-1 text-[12px] font-medium text-muted">
            Hours so far
          </span>
        </div>
      </div>
    </div>
  );
}
