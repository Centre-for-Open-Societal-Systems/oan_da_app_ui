"use client";

import { useMemo } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import {
  ATTENDANCE_AGENTS,
  getMonthlyAttendance,
  getSingleAgentCalendar,
} from "./attendanceData";

interface MonthlyAgentCalendarProps {
  agentId: string;
  selectedMonthLabel?: string;
  monthIndex?: number;
  year?: number;
}

const WEEKDAY_HEADERS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function MonthlyAgentCalendar({
  agentId,
  selectedMonthLabel = "November 2026",
  monthIndex = 10,
  year = 2026,
}: MonthlyAgentCalendarProps) {
  const agent = useMemo(() => {
    return ATTENDANCE_AGENTS.find((a) => a.id === agentId) ?? ATTENDANCE_AGENTS[1];
  }, [agentId]);

  const monthlyRecords = useMemo(() => {
    return getMonthlyAttendance(monthIndex, year);
  }, [monthIndex, year]);

  const summary = useMemo(() => {
    return monthlyRecords.find((m) => m.agent.id === agent.id) ?? monthlyRecords[1];
  }, [monthlyRecords, agent]);

  const calendarDays = useMemo(() => {
    return getSingleAgentCalendar(agent.id, monthIndex, year);
  }, [agent, monthIndex, year]);

  // First day offset (0 = Mon, 6 = Sun)
  const prefixPaddingDays = useMemo(() => {
    return (new Date(year, monthIndex, 1).getDay() + 6) % 7;
  }, [year, monthIndex]);

  // Previous month's last day for padding days
  const prevMonthLastDay = useMemo(() => {
    return new Date(year, monthIndex, 0).getDate();
  }, [year, monthIndex]);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {/* Left: Monthly Calendar Grid (spans 2 or 3 cols) */}
      <Card className="p-4 sm:p-5 shadow-card border border-line bg-white lg:col-span-2 xl:col-span-3">
        {/* Title */}
        <div className="border-b border-line-soft pb-3.5">
          <h2 className="text-[17px] font-bold text-ink">
            {agent.name} · {selectedMonthLabel}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">
            {agent.role} · {agent.kebele} kebele
          </p>
        </div>

        {/* 7-Column Calendar Grid */}
        <div className="mt-4 overflow-x-auto">
          <div className="min-w-[620px]">
            {/* Weekday headers */}
            <div className="grid grid-cols-7 gap-1.5 pb-2 text-center text-[11px] font-semibold text-muted tracking-wider">
              {WEEKDAY_HEADERS.map((h) => (
                <div key={h}>{h}</div>
              ))}
            </div>

            {/* Day Cells Grid */}
            <div className="grid grid-cols-7 gap-1.5">
              {/* Padding days for previous month */}
              {Array.from({ length: prefixPaddingDays }).map((_, i) => {
                const dayNum = prevMonthLastDay - prefixPaddingDays + 1 + i;
                return (
                  <div
                    key={`pad-${i}`}
                    className="min-h-[82px] rounded-lg border border-dashed border-line-soft bg-surface/30 p-2 text-[12px] text-slate-300"
                  >
                    <span className="font-medium text-slate-300">{dayNum}</span>
                  </div>
                );
              })}

              {/* Nov Days 1 to 30 */}
              {calendarDays.map((day) => {
                const isCheckedIn = day.status === "checked-in";
                const isNotCheckedIn = day.status === "not-checked-in";
                const isOff = day.status === "off";

                return (
                  <div
                    key={day.dayNum}
                    className={cn(
                      "min-h-[82px] rounded-lg border p-2 text-left transition-all relative flex flex-col justify-between",
                      isCheckedIn && "border-emerald-200 bg-emerald-50/60",
                      isNotCheckedIn && "border-rose-200 bg-rose-50/60",
                      isOff && "border-line-soft bg-surface/60",
                      day.status === "upcoming" && "border-line-soft bg-white",
                      day.isToday && "ring-2 ring-brand-green border-brand-green"
                    )}
                  >
                    {/* Top: Day Number and Today badge */}
                    <div className="flex items-center justify-between">
                      <span
                        className={cn(
                          "text-[13px] font-bold",
                          day.isToday ? "text-brand-green" : "text-ink"
                        )}
                      >
                        {day.dayNum}
                      </span>
                      {day.isToday && (
                        <span className="rounded-full bg-brand-green px-1.5 py-0.5 text-[9.5px] font-bold text-white uppercase tracking-wider">
                          Today
                        </span>
                      )}
                    </div>

                    {/* Content */}
                    <div className="mt-1">
                      {isCheckedIn && (
                        <div>
                          <p className="text-[11px] font-semibold text-brand-green">
                            Checked In
                          </p>
                          <p className="mt-0.5 text-[10.5px] text-slate-600 font-medium leading-none">
                            {day.checkInTime} {day.checkOutTime ? `– ${day.checkOutTime}` : ""}
                          </p>
                        </div>
                      )}

                      {isNotCheckedIn && (
                        <div>
                          <p className="text-[11px] font-semibold text-danger">
                            Not Checked In
                          </p>
                          <p className="mt-0.5 text-[10.5px] text-muted leading-none">
                            No check-in
                          </p>
                        </div>
                      )}

                      {isOff && (
                        <p className="text-[11px] font-medium text-slate-400">
                          Off
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>

      {/* Right: Agent Summary Card */}
      <Card className="flex flex-col gap-4 p-5 shadow-card border border-line bg-white h-fit">
        {/* Agent Profile Header */}
        <div className="flex items-center gap-3 border-b border-line-soft pb-4">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-brand-mint text-[14px] font-bold text-brand-green">
            {agent.initials}
          </span>
          <div className="min-w-0 flex-1">
            <h3 className="font-bold text-ink text-[16px] truncate">{agent.name}</h3>
            <p className="text-[12.5px] text-muted truncate">{agent.role}</p>
          </div>
        </div>

        {/* Attendance Rate */}
        <div>
          <div className="flex items-center justify-between text-[13.5px]">
            <span className="font-medium text-ink-soft">Attendance rate</span>
            <span className="font-bold text-brand-green text-[16px]">{summary.rate}%</span>
          </div>
          {/* Progress bar */}
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-surface">
            <div
              className="h-full rounded-full bg-brand-green transition-all"
              style={{ width: `${summary.rate}%` }}
            />
          </div>
        </div>

        {/* Stats List */}
        <div className="flex flex-col gap-3 pt-2 text-[13px] border-t border-line-soft">
          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-ink-soft">
              <span className="h-2 w-2 rounded-full bg-brand-green" />
              Checked In (days)
            </span>
            <span className="font-bold text-ink">{summary.checkedInDays}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-ink-soft">
              <span className="h-2 w-2 rounded-full bg-danger" />
              Not Checked In (days)
            </span>
            <span className="font-bold text-danger">{summary.notCheckedInDays}</span>
          </div>

          <div className="flex items-center justify-between pt-1 border-t border-line-soft">
            <span className="text-ink-soft">Average check-in</span>
            <span className="font-bold text-ink">{summary.avgCheckIn}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
