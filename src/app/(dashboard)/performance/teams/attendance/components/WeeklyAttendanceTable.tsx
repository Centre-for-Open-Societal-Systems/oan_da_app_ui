"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { cn } from "@/lib/utils";
import {
  formatIsoDate,
  getCurrentWeekStartIso,
  getTodayIso,
  getWeeklyAttendance,
  getWeeklyStats,
  parseIsoDate,
} from "./attendanceData";

interface WeeklyAttendanceTableProps {
  selectedAgentIds: Set<string>;
  selectedWeekLabel?: string;
  selectedWeekStartIso?: string;
}

export function WeeklyAttendanceTable({
  selectedAgentIds,
  selectedWeekLabel = "16 – 22 Nov 2026",
  selectedWeekStartIso = getCurrentWeekStartIso(),
}: WeeklyAttendanceTableProps) {
  const [query, setQuery] = useState("");
  const todayIso = getTodayIso();
  const effectiveWeekStart = selectedWeekStartIso || getCurrentWeekStartIso();

  const weekColumns = useMemo(() => {
    const start = parseIsoDate(effectiveWeekStart);
    const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return Array.from({ length: 7 }, (_, i) => {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);
      const curIso = formatIsoDate(cur);
      const isToday = curIso === todayIso;
      const isWeekend = i >= 5;
      return {
        dayName: dayNames[i],
        dayNum: cur.getDate(),
        dateStr: `${cur.getDate()} ${months[cur.getMonth()]} ${cur.getFullYear()}`,
        iso: curIso,
        isToday,
        isWeekend,
      };
    });
  }, [effectiveWeekStart, todayIso]);

  const weeklyRecords = useMemo(() => {
    return getWeeklyAttendance(effectiveWeekStart, todayIso);
  }, [effectiveWeekStart, todayIso]);

  const filteredRecords = useMemo(() => {
    return weeklyRecords.filter((record) => {
      if (selectedAgentIds.size > 0 && !selectedAgentIds.has(record.agent.id)) {
        return false;
      }
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        record.agent.name.toLowerCase().includes(q) ||
        record.agent.kebele.toLowerCase().includes(q) ||
        record.agent.role.toLowerCase().includes(q)
      );
    });
  }, [weeklyRecords, selectedAgentIds, query]);

  const weeklyStats = useMemo(() => {
    return getWeeklyStats(filteredRecords);
  }, [filteredRecords]);

  const { pageRows, paginationProps } = usePagination(filteredRecords);

  const isCurrentWeek = effectiveWeekStart === getCurrentWeekStartIso();

  return (
    <Card className="overflow-hidden p-0 shadow-card border border-line bg-white">
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-line-soft">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">
            Weekly attendance
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">
            One row per agent · {selectedWeekLabel}. Times show check-in.
          </p>
        </div>

        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search agent or kebele"
          className="w-full sm:w-72 shrink-0"
        />
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[940px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface text-[13px] font-semibold text-slate-500">
              <th className="px-4 py-3 min-w-[180px]">Agent</th>
              {weekColumns.map((col) => (
                <th key={col.iso} className="px-3 py-3 text-center min-w-[100px]">
                  <div className="flex flex-col items-center">
                    <span className="text-[11px] font-semibold tracking-wider text-muted uppercase">
                      {col.dayName}
                    </span>
                    <span
                      className={cn(
                        "mt-0.5 flex h-6 w-6 items-center justify-center rounded-full text-[12.5px] font-bold",
                        col.isToday
                          ? "bg-brand-green text-white"
                          : "text-slate-700"
                      )}
                    >
                      {col.dayNum}
                    </span>
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="text-[13px] text-slate-700 divide-y divide-line-soft">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted">
                  No agents found matching your filter criteria.
                </td>
              </tr>
            ) : (
              pageRows.map((r) => (
              <tr key={r.agent.id} className="transition-colors hover:bg-surface/50">
                {/* Agent info */}
                <td className="px-4 py-3.5">
                  <div className="flex items-center gap-2.5">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-mint text-[11px] font-bold text-brand-green">
                      {r.agent.initials}
                    </span>
                    <div className="min-w-0 leading-tight">
                      <p className="font-semibold text-ink">{r.agent.name}</p>
                      <p className="text-[11.5px] text-muted">{r.agent.role}</p>
                    </div>
                  </div>
                </td>

                {/* Day status columns */}
                {r.days.map((day) => {
                  const isCheckedIn = day.status === "Checked In";
                  const isNotCheckedIn = day.status === "Not Checked In";
                  const isOff = day.status === "Off";

                  return (
                    <td key={day.iso} className="px-3 py-3.5 text-center">
                      {isCheckedIn && (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[12px] font-semibold text-brand-green shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            Checked In
                          </span>
                          <span className="mt-1 text-[11.5px] text-slate-500 font-medium">
                            {day.checkIn} {day.checkOut ? `→ ${day.checkOut}` : ""}
                          </span>
                        </div>
                      )}

                      {isNotCheckedIn && (
                        <div className="flex flex-col items-center">
                          <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[12px] font-semibold text-danger shadow-2xs">
                            <span className="h-1.5 w-1.5 rounded-full bg-current" />
                            Not Checked In
                          </span>
                          <span className="mt-1 text-[11.5px] text-muted">
                            No check-in
                          </span>
                        </div>
                      )}

                      {isOff && (
                        <span className="text-[12px] font-medium text-slate-300">
                          Off
                        </span>
                      )}

                      {day.status === "Upcoming" && (
                        <span className="text-[13px] text-slate-300">—</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="flex flex-wrap items-center justify-between border-t border-line-soft px-4 py-3 text-[12.5px]">
        <div className="flex items-center gap-3">
          <span className="text-muted font-medium">
            {isCurrentWeek ? "Team this week so far" : `Team summary · ${selectedWeekLabel}`}
          </span>
          <span className="text-brand-green font-semibold">
            Checked in: {weeklyStats.checkedIn}
          </span>
          <span className="text-danger font-semibold">
            Not checked in: {weeklyStats.notCheckedIn}
          </span>
        </div>

        <div className="font-semibold text-brand-green">
          Attendance rate {weeklyStats.rate}%
        </div>
      </div>

      {/* Pagination Footer */}
      <TablePagination {...paginationProps} itemLabel="agents" />
    </Card>
  );
}
