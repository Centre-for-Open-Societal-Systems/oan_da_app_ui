"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { SearchInput } from "@/components/ui/SearchInput";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { cn } from "@/lib/utils";
import {
  formatDayMonth,
  getMonthlyAttendance,
  getTodayDate,
  getTodayIso,
  type MonthDayStatus,
} from "./attendanceData";

interface MonthlyAttendanceGridProps {
  selectedAgentIds: Set<string>;
  onSelectAgent: (agentId: string) => void;
  selectedMonthLabel?: string;
  selectedMonthIndex?: number;
  selectedMonthYear?: number;
}

// Day of week initials
const DAY_INITIALS = ["S", "M", "T", "W", "T", "F", "S"];

export function MonthlyAttendanceGrid({
  selectedAgentIds,
  onSelectAgent,
  selectedMonthLabel = "November 2026",
  selectedMonthIndex = getTodayDate().getMonth(),
  selectedMonthYear = getTodayDate().getFullYear(),
}: MonthlyAttendanceGridProps) {
  const [query, setQuery] = useState("");
  const today = getTodayDate();
  const isCurrentMonth =
    selectedMonthIndex === today.getMonth() && selectedMonthYear === today.getFullYear();
  const todayDayNum = today.getDate();
  const todayShortLabel = formatDayMonth(getTodayIso());
  const daysInMonthCount = useMemo(() => {
    return new Date(selectedMonthYear, selectedMonthIndex + 1, 0).getDate();
  }, [selectedMonthYear, selectedMonthIndex]);

  const daysList = useMemo(() => {
    return Array.from({ length: daysInMonthCount }, (_, i) => i + 1);
  }, [daysInMonthCount]);

  const getDayInitial = (day: number) => {
    const d = new Date(selectedMonthYear, selectedMonthIndex, day);
    return DAY_INITIALS[d.getDay()];
  };

  const monthlyRecords = useMemo(() => {
    return getMonthlyAttendance(selectedMonthIndex, selectedMonthYear);
  }, [selectedMonthIndex, selectedMonthYear]);

  const filteredRecords = useMemo(() => {
    return monthlyRecords.filter((record) => {
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
  }, [monthlyRecords, selectedAgentIds, query]);

  const { pageRows, paginationProps } = usePagination(filteredRecords);

  return (
    <Card className="overflow-hidden p-0 shadow-card border border-line bg-white">
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between border-b border-line-soft">
        <div>
          <h2 className="text-[16px] font-semibold text-ink">
            Monthly attendance – {selectedMonthLabel}
          </h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">
            One square per day. Select an agent name to open their calendar.
          </p>
        </div>

        <SearchInput
          value={query}
          onChange={setQuery}
          placeholder="Search agent or kebele"
          className="w-full sm:w-72 shrink-0"
        />
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1020px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface text-[12px] font-semibold text-slate-500">
              <th className="px-4 py-3 min-w-[170px]">Agent</th>
              <th className="px-2 py-3 text-center">
                <div className="flex items-center justify-between gap-1 px-1">
                  {daysList.map((day) => (
                    <div key={day} className="flex w-5 flex-col items-center text-[10.5px]">
                      <span className="text-muted">{getDayInitial(day)}</span>
                      <span className={cn("font-medium", isCurrentMonth && day === todayDayNum ? "text-brand-green font-bold" : "text-slate-600")}>
                        {day}
                      </span>
                    </div>
                  ))}
                </div>
              </th>
              <th className="px-3 py-3 text-center whitespace-nowrap text-[12px]">Checked In</th>
              <th className="px-3 py-3 text-center whitespace-nowrap text-[12px]">Not Checked In</th>
              <th className="px-4 py-3 text-center whitespace-nowrap text-[12px]">Rate</th>
            </tr>
          </thead>
          <tbody className="text-[13px] text-slate-700 divide-y divide-line-soft">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted">
                  No agents found matching your filter criteria.
                </td>
              </tr>
            ) : (
              pageRows.map((r) => (
              <tr key={r.agent.id} className="transition-colors hover:bg-surface/50">
                {/* Agent Clickable */}
                <td className="px-4 py-3.5">
                  <button
                    type="button"
                    onClick={() => onSelectAgent(r.agent.id)}
                    className="flex items-center gap-2.5 text-left group"
                  >
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-mint text-[11px] font-bold text-brand-green group-hover:scale-105 transition-transform">
                      {r.agent.initials}
                    </span>
                    <span className="font-semibold text-ink group-hover:text-brand-green transition-colors">
                      {r.agent.name}
                    </span>
                  </button>
                </td>

                {/* 30 Day Squares */}
                <td className="px-2 py-3.5">
                  <div className="flex items-center justify-between gap-1 px-1">
                    {daysList.map((day) => {
                      const status: MonthDayStatus = r.days[day] || "checked-in";
                      const isToday = isCurrentMonth && day === todayDayNum;

                      return (
                        <div
                          key={day}
                          title={`Day ${day}: ${status}`}
                          className={cn(
                            "h-4.5 w-4.5 rounded-sm transition-transform hover:scale-110",
                            status === "checked-in" && "bg-emerald-400",
                            status === "not-checked-in" && "bg-rose-300",
                            status === "off" && "bg-slate-100",
                            status === "upcoming" && "bg-slate-50 border border-slate-200",
                            isToday && "ring-2 ring-brand-green ring-offset-0.5"
                          )}
                        />
                      );
                    })}
                  </div>
                </td>

                <td className="px-3 py-3.5 text-center font-semibold text-slate-700">
                  {r.checkedInDays}
                </td>
                <td className="px-3 py-3.5 text-center font-semibold text-danger">
                  {r.notCheckedInDays}
                </td>
                <td className="px-4 py-3.5 text-center font-bold text-slate-800">
                  {r.rate}%
                </td>
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {/* Footer Legend */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line-soft px-4 py-3 text-[12px] text-muted">
        <div className="flex items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-emerald-400" />
            Checked In
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-rose-300" />
            Not Checked In
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm bg-slate-100" />
            Off
          </span>
        </div>

        {isCurrentMonth ? (
          <div>
            Green outline = today ({todayShortLabel})
          </div>
        ) : (
          <div />
        )}
      </div>

      {/* Pagination Footer */}
      <TablePagination {...paginationProps} itemLabel="agents" />
    </Card>
  );
}
