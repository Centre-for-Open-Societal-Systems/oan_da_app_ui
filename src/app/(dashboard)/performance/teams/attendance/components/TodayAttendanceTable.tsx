"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import {
  getTodayAttendanceForDate,
  getTodayIso,
  getTodayLabel,
} from "./attendanceData";

interface TodayAttendanceTableProps {
  selectedAgentIds: Set<string>;
  selectedDate?: string;
  selectedDateIso?: string;
}

export function TodayAttendanceTable({
  selectedAgentIds,
  selectedDate = getTodayLabel(),
  selectedDateIso = getTodayIso(),
}: TodayAttendanceTableProps) {
  const [query, setQuery] = useState("");
  const todayIso = getTodayIso();

  const records = useMemo(() => {
    return getTodayAttendanceForDate(selectedDateIso, todayIso);
  }, [selectedDateIso, todayIso]);

  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      // Must match selected agents
      if (selectedAgentIds.size > 0 && !selectedAgentIds.has(record.agent.id)) {
        return false;
      }
      // Must match search query
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      return (
        record.agent.name.toLowerCase().includes(q) ||
        record.agent.kebele.toLowerCase().includes(q) ||
        record.agent.role.toLowerCase().includes(q)
      );
    });
  }, [records, selectedAgentIds, query]);

  const { pageRows, paginationProps } = usePagination(filteredRecords);

  return (
    <Card className="overflow-hidden p-0 shadow-card border border-line bg-white rounded-2xl">
      {/* Header */}
      <div className="flex flex-col gap-3 p-4 sm:p-5 sm:flex-row sm:items-center sm:justify-between border-b border-line-soft">
        <div>
          <h2 className="text-[15px] sm:text-[16px] font-bold text-ink">
            {selectedDateIso !== todayIso ? `Attendance for ${selectedDate}` : "Today's attendance"}
          </h2>
          <p className="mt-0.5 text-[12px] sm:text-[12.5px] text-ink-soft">
            {selectedDateIso !== todayIso
              ? `Check-in, check-out and hours for ${selectedDate}.`
              : "Check-in, check-out and hours for each agent today."}
          </p>
        </div>

        <div className="w-full sm:w-72">
          <SearchInput
            value={query}
            onChange={setQuery}
            placeholder="Search agent or kebele"
            className="w-full"
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[760px] border-collapse text-left">
          <thead>
            <tr className="border-b border-line bg-surface text-[13.5px] font-semibold text-slate-500">
              <th className="w-16 px-4 py-3 text-center">S.No.</th>
              <th className="px-4 py-3">Agent</th>
              <th className="px-4 py-3">Kebele</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Check-in</th>
              <th className="px-4 py-3">Check-out</th>
              <th className="px-4 py-3">Hours</th>
            </tr>
          </thead>
          <tbody className="text-[13.5px] text-slate-700 divide-y divide-line-soft">
            {pageRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted">
                  No agents found matching your filter criteria.
                </td>
              </tr>
            ) : (
              pageRows.map((r, idx) => {
                const isCheckedIn = r.status === "Checked In";
                const serialNo = (paginationProps.page - 1) * paginationProps.pageSize + idx + 1;
                return (
                  <tr key={r.agent.id} className="transition-colors hover:bg-surface/50">
                    <td className="px-4 py-3.5 text-center text-muted font-medium">
                      {serialNo}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-mint text-[11px] font-bold text-brand-green">
                          {r.agent.initials}
                        </span>
                        <span className="font-semibold text-ink">{r.agent.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {r.agent.kebele}
                    </td>
                    <td className="px-4 py-3.5">
                      <Pill tone={isCheckedIn ? "green" : "red"} dot>
                        {r.status}
                      </Pill>
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-700">
                      {r.checkIn}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-400">
                      {r.checkOut}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-700">
                      {r.hours}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <TablePagination {...paginationProps} itemLabel="agents" />
    </Card>
  );
}
