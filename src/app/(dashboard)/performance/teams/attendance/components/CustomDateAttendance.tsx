"use client";

import { useMemo, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { PAGE_SIZES, TablePagination } from "@/components/ui/TablePagination";
import { cn } from "@/lib/utils";
import {
  ATTENDANCE_AGENTS,
  getAgentDayAttendance,
  getTodayIso,
  type AttendanceAgent,
  type CustomRangeState,
} from "./attendanceData";

interface CustomDateAttendanceProps {
  selectedAgentIds: Set<string>;
  customRange?: CustomRangeState;
}

export interface CustomAttendanceDailyRecord {
  id: string;
  sNo: number;
  dateIso: string;
  dateFormatted: string;
  agent: AttendanceAgent;
  kebele: string;
  status: "Checked In" | "Not Checked In";
  checkIn: string;
  checkOut: string;
  hours: string;
}

export interface CustomAttendanceSummaryRecord {
  sNo: number;
  agent: AttendanceAgent;
  kebele: string;
  status: "Checked In" | "Not Checked In";
  statusDetail: string;
  attendedDays: number;
  totalWorkingDays: number;
  rate: number;
  avgCheckIn: string;
  avgCheckOut: string;
  totalHours: string;
}

// Generate all working days in reverse chronological order (newest to oldest)
function getWorkingDaysInRange(startIso: string, endIso: string) {
  const [sy, sm, sd] = startIso.split("-").map(Number);
  const [ey, em, ed] = endIso.split("-").map(Number);
  const cur = new Date(ey, em - 1, ed);
  const start = new Date(sy, sm - 1, sd);

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  const days: { iso: string; formatted: string; dayNum: number }[] = [];

  while (cur >= start) {
    const dayOfWeek = cur.getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
    if (!isWeekend) {
      const y = cur.getFullYear();
      const m = cur.getMonth() + 1;
      const d = cur.getDate();
      const iso = `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const formatted = `${dayNames[dayOfWeek]}, ${String(d).padStart(2, "0")} ${months[m - 1]} ${y}`;
      days.push({ iso, formatted, dayNum: d });
    }
    cur.setDate(cur.getDate() - 1);
  }
  return days;
}

export function CustomDateAttendance({
  selectedAgentIds,
  customRange,
}: CustomDateAttendanceProps) {
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZES[0]);

  const isSingleAgent = selectedAgentIds.size === 1;
  const isSingleDay = !customRange || customRange.start === customRange.end;

  // Filter agents based on selection
  const targetedAgents = useMemo(() => {
    return ATTENDANCE_AGENTS.filter((a) => {
      if (selectedAgentIds.size > 0 && !selectedAgentIds.has(a.id)) {
        return false;
      }
      return true;
    });
  }, [selectedAgentIds]);

  // Mode: if single day, show daily records. If multi-day range, allow toggling between summary and daily logs
  const [viewMode, setViewMode] = useState<"daily" | "summary">(() => {
    return isSingleAgent ? "daily" : "summary";
  });

  // Effective mode
  const currentView = isSingleDay ? "daily" : viewMode;

  // Generate Daily Logs across the custom date range
  const dailyRecords = useMemo<CustomAttendanceDailyRecord[]>(() => {
    const todayIso = getTodayIso();
    const startIso = customRange?.start || "2026-11-09";
    const endIso = customRange?.end || todayIso;
    const workingDays = getWorkingDaysInRange(startIso, endIso);

    const records: CustomAttendanceDailyRecord[] = [];
    let sNo = 1;

    for (const day of workingDays) {
      if (day.iso > todayIso) continue;
      for (const agent of targetedAgents) {
        const detail = getAgentDayAttendance(agent, day.iso, todayIso);
        const isCheckedIn = detail.status === "Checked In";

        records.push({
          id: `${day.iso}-${agent.id}`,
          sNo: sNo++,
          dateIso: day.iso,
          dateFormatted: day.formatted,
          agent,
          kebele: agent.kebele,
          status: isCheckedIn ? "Checked In" : "Not Checked In",
          checkIn: isCheckedIn ? detail.checkIn || "08:15" : "—",
          checkOut: isCheckedIn ? (detail.checkOut === "..." ? "—" : detail.checkOut || "17:15") : "—",
          hours: isCheckedIn ? detail.hours : "—",
        });
      }
    }

    return records;
  }, [customRange, targetedAgents]);

  // Generate Summary Records for multiple agents
  const summaryRecords = useMemo<CustomAttendanceSummaryRecord[]>(() => {
    const workingDays = customRange?.workingDays || 7;

    return targetedAgents.map((agent, index) => {
      const hasAbsence = agent.id === "CF" || agent.id === "BG" || agent.id === "AM";
      const missedCount = hasAbsence ? (workingDays > 20 ? 2 : 1) : 0;
      const attendedDays = Math.max(0, workingDays - missedCount);
      const rate = Math.round((attendedDays / Math.max(1, workingDays)) * 100);

      const totalH = attendedDays * 8;
      const extraM = ((agent.name.charCodeAt(0) * 7) % 45) + 10;

      return {
        sNo: index + 1,
        agent,
        kebele: agent.kebele,
        status: rate >= 80 ? "Checked In" : "Not Checked In",
        statusDetail: `${attendedDays}/${workingDays} days`,
        attendedDays,
        totalWorkingDays: workingDays,
        rate,
        avgCheckIn: agent.id === "CF" ? "08:55" : "08:12",
        avgCheckOut: "17:15",
        totalHours: `${totalH}h ${extraM}m`,
      };
    });
  }, [customRange, targetedAgents]);

  // Filter daily records by query
  const filteredDailyRecords = useMemo(() => {
    if (!query.trim()) return dailyRecords;
    const q = query.toLowerCase();
    return dailyRecords.filter(
      (r) =>
        r.agent.name.toLowerCase().includes(q) ||
        r.kebele.toLowerCase().includes(q) ||
        r.dateFormatted.toLowerCase().includes(q) ||
        r.status.toLowerCase().includes(q)
    );
  }, [dailyRecords, query]);

  // Filter summary records by query
  const filteredSummaryRecords = useMemo(() => {
    if (!query.trim()) return summaryRecords;
    const q = query.toLowerCase();
    return summaryRecords.filter(
      (r) =>
        r.agent.name.toLowerCase().includes(q) ||
        r.kebele.toLowerCase().includes(q) ||
        r.agent.role.toLowerCase().includes(q)
    );
  }, [summaryRecords, query]);

  // Active records depending on view
  const totalCount = currentView === "daily" ? filteredDailyRecords.length : filteredSummaryRecords.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const currentPage = Math.min(page, totalPages);

  const paginatedDaily = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredDailyRecords.slice(start, start + pageSize);
  }, [filteredDailyRecords, currentPage, pageSize]);

  const paginatedSummary = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredSummaryRecords.slice(start, start + pageSize);
  }, [filteredSummaryRecords, currentPage, pageSize]);

  // Stats calculation for the summary pill bar
  const stats = useMemo(() => {
    if (currentView === "daily") {
      const checkedIn = filteredDailyRecords.filter((r) => r.status === "Checked In").length;
      const notCheckedIn = filteredDailyRecords.length - checkedIn;
      const rate = filteredDailyRecords.length > 0 ? Math.round((checkedIn / filteredDailyRecords.length) * 100) : 100;
      return { total: filteredDailyRecords.length, checkedIn, notCheckedIn, rate };
    }
    const totalWorking = (customRange?.workingDays || 7) * targetedAgents.length;
    const attended = filteredSummaryRecords.reduce((acc, r) => acc + r.attendedDays, 0);
    const rate = totalWorking > 0 ? Math.round((attended / totalWorking) * 100) : 100;
    return { total: filteredSummaryRecords.length, checkedIn: attended, notCheckedIn: totalWorking - attended, rate };
  }, [currentView, filteredDailyRecords, filteredSummaryRecords, customRange, targetedAgents]);

  return (
    <Card className="overflow-hidden p-0 shadow-card border border-line bg-white animate-fade-in rounded-2xl">
      {/* Top Table Tabs: Team Summary & Daily Logs */}
      {!isSingleDay && (
        <div className="flex items-stretch border-b border-line-soft bg-slate-50/50">
          <button
            type="button"
            onClick={() => {
              setViewMode("summary");
              setPage(1);
            }}
            className={cn(
              "px-4 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-[13.5px] transition-all cursor-pointer font-semibold select-none flex items-center gap-2",
              currentView === "summary"
                ? "bg-white text-brand-green border-b-2 border-brand-green -mb-px font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border-b-2 border-transparent"
            )}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>{isSingleAgent ? "Agent Summary" : "Team Summary"}</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setViewMode("daily");
              setPage(1);
            }}
            className={cn(
              "px-4 sm:px-6 py-2.5 sm:py-3 text-[13px] sm:text-[13.5px] transition-all cursor-pointer font-semibold select-none flex items-center gap-2",
              currentView === "daily"
                ? "bg-white text-brand-green border-b-2 border-brand-green -mb-px font-bold shadow-2xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-white/60 border-b-2 border-transparent"
            )}
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            <span>Daily Logs</span>
          </button>
          <div className="flex-1" />
        </div>
      )}

      {/* Header Row: Title, Subtitle & Summary Pills on Left; Search Box Cleanly Aligned on Right */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5 sm:gap-4 px-4 sm:px-5 py-4 border-b border-line-soft bg-white">
        <div className="flex flex-col gap-1 min-w-0">
          <h2 className="text-[15px] sm:text-[16px] font-bold text-slate-900 leading-snug">
            Custom date attendance
          </h2>
          <p className="text-[12px] sm:text-[12.5px] text-slate-500">
            {isSingleAgent
              ? `Daily attendance logs for ${targetedAgents[0]?.name || "agent"} across ${customRange?.label || "selected period"}.`
              : "View attendance records for a specific date or period."}
          </p>

          {/* Inline Period & Summary Pills */}
          <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12px] sm:text-[12.5px]">
            <span className="font-semibold text-slate-700">Period:</span>
            <span className="inline-flex items-center rounded-md bg-white px-2.5 py-0.5 font-medium text-slate-800 border border-slate-200 shadow-2xs">
              {customRange?.label || `09 Nov – ${getTodayIso()}`}
            </span>

            <span className="text-slate-300">|</span>

            <span className="text-slate-600 font-medium">
              {customRange ? customRange.workingDays : 7} working days ({customRange ? customRange.totalDays : 9} days)
            </span>

            <span className="text-slate-300">|</span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] sm:text-[11.5px] font-semibold text-brand-green">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
              {currentView === "daily" ? `${stats.checkedIn} Checked In` : `${stats.checkedIn} Present`}
            </span>

            {stats.notCheckedIn > 0 && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] sm:text-[11.5px] font-semibold text-danger">
                <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                {stats.notCheckedIn} Not Checked In
              </span>
            )}

            <span className="text-slate-300">|</span>

            <span className="font-bold text-brand-green">
              Attendance: {stats.rate}%
            </span>
          </div>
        </div>

        <div className="w-full lg:w-72 shrink-0">
          <SearchInput
            value={query}
            onChange={(val) => {
              setQuery(val);
              setPage(1);
            }}
            placeholder={isSingleAgent ? "Search date or status" : "Search agent or kebele"}
            className="w-full"
          />
        </div>
      </div>

      {/* Table Content */}
      <div className="overflow-x-auto">
        {currentView === "daily" ? (
          /* DAILY RECORDS TABLE (Used when single agent is selected or toggled to daily logs) */
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-surface text-[13px] font-semibold text-slate-500">
                <th className="w-16 px-4 py-3 text-center">S.No.</th>
                <th className="px-4 py-3 min-w-[170px]">Date</th>
                {!isSingleAgent && <th className="px-4 py-3">Agent</th>}
                <th className="px-4 py-3">Kebele</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Check-in</th>
                <th className="px-4 py-3">Check-out</th>
                <th className="px-4 py-3">Hours</th>
              </tr>
            </thead>
            <tbody className="text-[13.5px] text-slate-700 divide-y divide-line-soft">
              {paginatedDaily.length === 0 ? (
                <tr>
                  <td colSpan={isSingleAgent ? 7 : 8} className="px-4 py-8 text-center text-muted">
                    No attendance records found for this period.
                  </td>
                </tr>
              ) : (
                paginatedDaily.map((r, idx) => {
                  const isCheckedIn = r.status === "Checked In";
                  const displayIndex = (currentPage - 1) * pageSize + idx + 1;
                  return (
                    <tr key={r.id} className="transition-colors hover:bg-surface/50">
                      <td className="px-4 py-3.5 text-center text-muted font-medium">
                        {displayIndex}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {r.dateFormatted}
                      </td>
                      {!isSingleAgent && (
                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-2">
                            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-mint text-[10px] font-bold text-brand-green">
                              {r.agent.initials}
                            </span>
                            <span className="font-semibold text-ink">{r.agent.name}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3.5 text-slate-600 font-medium">
                        {r.kebele}
                      </td>
                      <td className="px-4 py-3.5">
                        <Pill tone={isCheckedIn ? "green" : "red"} dot>
                          {r.status}
                        </Pill>
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-700">
                        {r.checkIn}
                      </td>
                      <td className="px-4 py-3.5 font-medium text-slate-500">
                        {r.checkOut}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">
                        {r.hours}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        ) : (
          /* TEAM SUMMARY TABLE (Used for multiple agents across range) */
          <table className="w-full min-w-[780px] border-collapse text-left">
            <thead>
              <tr className="border-b border-line bg-surface text-[13px] font-semibold text-slate-500">
                <th className="w-16 px-4 py-3 text-center">S.No.</th>
                <th className="px-4 py-3">Agent</th>
                <th className="px-4 py-3">Kebele</th>
                <th className="px-4 py-3">Attendance</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Avg Check-in</th>
                <th className="px-4 py-3">Avg Check-out</th>
                <th className="px-4 py-3">Total Hours</th>
              </tr>
            </thead>
            <tbody className="text-[13.5px] text-slate-700 divide-y divide-line-soft">
              {paginatedSummary.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-muted">
                    No agents found matching your filter criteria.
                  </td>
                </tr>
              ) : (
                paginatedSummary.map((r, idx) => (
                  <tr key={r.agent.id} className="transition-colors hover:bg-surface/50">
                    <td className="px-4 py-3.5 text-center text-muted font-medium">
                      {(currentPage - 1) * pageSize + idx + 1}
                    </td>
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-brand-mint text-[11px] font-bold text-brand-green">
                          {r.agent.initials}
                        </span>
                        <div className="min-w-0">
                          <p className="font-semibold text-ink leading-tight">{r.agent.name}</p>
                          <p className="text-[11.5px] text-muted">{r.agent.role}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5 text-slate-600 font-medium">
                      {r.kebele}
                    </td>
                    <td className="px-4 py-3.5">
                      <Pill tone={r.rate >= 80 ? "green" : "red"} dot>
                        {r.statusDetail}
                      </Pill>
                    </td>
                    <td className="px-4 py-3.5 font-bold text-slate-800">
                      {r.rate}%
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-700">
                      {r.avgCheckIn}
                    </td>
                    <td className="px-4 py-3.5 font-medium text-slate-500">
                      {r.avgCheckOut}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-slate-800">
                      {r.totalHours}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer & Pagination */}
      <TablePagination
        page={currentPage}
        pageSize={pageSize}
        total={totalCount}
        itemLabel={currentView === "daily" ? "records" : "agents"}
        onPageChange={setPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setPage(1);
        }}
      />
    </Card>
  );
}
