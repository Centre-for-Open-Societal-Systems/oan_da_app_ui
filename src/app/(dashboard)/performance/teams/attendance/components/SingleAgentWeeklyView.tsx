"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  type AttendanceAgent,
  formatIsoDate,
  getAgentDayAttendance,
  getCurrentWeekStartIso,
  getTodayIso,
  parseIsoDate,
} from "./attendanceData";

interface SingleAgentWeeklyViewProps {
  agent: AttendanceAgent;
  selectedWeekStartIso?: string;
}

export function SingleAgentWeeklyView({
  agent,
  selectedWeekStartIso = getCurrentWeekStartIso(),
}: SingleAgentWeeklyViewProps) {
  const todayIso = getTodayIso();

  const weekDays = useMemo(() => {
    const startIso = selectedWeekStartIso || getCurrentWeekStartIso();
    const start = parseIsoDate(startIso);
    const dayNames = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

    return Array.from({ length: 7 }, (_, i) => {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);
      const curIso = formatIsoDate(cur);
      const detail = getAgentDayAttendance(agent, curIso, todayIso);

      return {
        dayName: dayNames[i],
        dayNum: cur.getDate(),
        dateStr: `${cur.getDate()} ${months[cur.getMonth()]} ${cur.getFullYear()}`,
        iso: curIso,
        isToday: detail.isToday,
        isWeekend: i >= 5,
        status: detail.status,
        checkIn: detail.checkIn,
        checkOut: detail.checkOut,
        location: detail.location,
      };
    });
  }, [selectedWeekStartIso, agent, todayIso]);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white p-5 shadow-card animate-fade-in">
      {/* Scrollable Container for Tablet/Mobile responsiveness */}
      <div className="overflow-x-auto no-scrollbar">
        <div className="min-w-[800px]">
          {/* Top 7-Column Headers */}
          <div className="grid grid-cols-7 gap-3 text-center mb-3">
            {weekDays.map((col) => (
              <div key={col.dateStr} className="flex flex-col items-center">
                <span className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">
                  {col.dayName}
                </span>
                <div className="mt-1 flex h-7 w-7 items-center justify-center">
                  {col.isToday ? (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-brand-green text-[13px] font-bold text-white shadow-xs">
                      {col.dayNum}
                    </span>
                  ) : (
                    <span className="text-[14px] font-bold text-slate-800">
                      {col.dayNum}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* 7 Day Cards Grid */}
          <div className="grid grid-cols-7 gap-3">
            {weekDays.map((day) => {
              const isCheckedIn = day.status === "Checked In";
              const isNotCheckedIn = day.status === "Not Checked In";
              const isUpcoming = day.status === "Upcoming";
              const isOff = day.status === "Off";

              // Checked In Day Card (Image 2 - Monday)
              if (isCheckedIn) {
                return (
                  <div
                    key={day.dateStr}
                    className="flex flex-col justify-between rounded-2xl border border-emerald-200/90 bg-[#f0fdf4] p-4 min-h-[220px] shadow-2xs"
                  >
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-brand-green shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
                        Checked In
                      </span>

                      <div className="mt-4">
                        <p className="text-[17px] font-bold text-ink leading-tight">
                          {day.checkIn || "08:55"}
                        </p>
                        <p className="mt-0.5 text-[11.5px] font-medium text-muted">
                          Check-in
                        </p>
                      </div>

                      <div className="mt-3">
                        <p className="text-[17px] font-bold text-ink leading-tight">
                          {day.checkOut || "17:23"}
                        </p>
                        <p className="mt-0.5 text-[11.5px] font-medium text-muted">
                          Check-out
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto pt-3 flex items-center gap-1 text-[11.5px] font-medium text-brand-green">
                      <svg
                        className="h-3.5 w-3.5 shrink-0 text-brand-green"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                        aria-hidden="true"
                      >
                        <path
                          fillRule="evenodd"
                          d="M11.54 22.351l.07.04.028.016a.76.76 0 00.723 0l.028-.015.071-.041a16.975 16.975 0 001.144-.742 19.58 19.58 0 002.683-2.282c1.944-1.99 3.963-4.98 3.963-8.827a8.25 8.25 0 00-16.5 0c0 3.846 2.02 6.837 3.963 8.827a19.58 19.58 0 002.682 2.282 16.975 16.975 0 001.145.742zM12 13.5a3 3 0 100-6 3 3 0 000 6z"
                          clipRule="evenodd"
                        />
                      </svg>
                      <span className="truncate">{day.location || agent.kebele || "Dembi Dima"}</span>
                    </div>
                  </div>
                );
              }

              // Not Checked In Day Card (Image 2 - Tuesday)
              if (isNotCheckedIn) {
                return (
                  <div
                    key={day.dateStr}
                    className="flex flex-col justify-between rounded-2xl border border-rose-200/90 bg-[#fff1f2] p-4 min-h-[220px] shadow-2xs"
                  >
                    <div>
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-white px-2.5 py-0.5 text-[11.5px] font-semibold text-danger shadow-2xs">
                        <span className="h-1.5 w-1.5 rounded-full bg-danger" />
                        Not Checked In
                      </span>

                      <div className="mt-4">
                        <p className="text-[17px] font-bold text-ink leading-tight">—</p>
                        <p className="mt-0.5 text-[11.5px] font-medium text-muted">
                          Check-in
                        </p>
                      </div>

                      <div className="mt-3">
                        <p className="text-[17px] font-bold text-ink leading-tight">—</p>
                        <p className="mt-0.5 text-[11.5px] font-medium text-muted">
                          Check-out
                        </p>
                      </div>
                    </div>

                    <div className="mt-auto pt-3 text-[11.5px] font-medium text-danger">
                      No check-in recorded
                    </div>
                  </div>
                );
              }

              // Upcoming Day Card (Image 2 - Wed, Thu, Fri)
              if (isUpcoming) {
                return (
                  <div
                    key={day.dateStr}
                    className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-4"
                  >
                    <span className="text-[13px] font-medium text-slate-400">
                      Upcoming
                    </span>
                  </div>
                );
              }

              // Off Weekend Card (Image 2 - Sat, Sun)
              if (isOff) {
                return (
                  <div
                    key={day.dateStr}
                    className="flex min-h-[220px] items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-4"
                  >
                    <span className="text-[13px] font-medium text-slate-400">
                      Off
                    </span>
                  </div>
                );
              }

              return null;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
