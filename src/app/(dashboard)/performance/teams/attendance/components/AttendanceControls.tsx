"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import {
  ATTENDANCE_AGENTS,
  formatDayMonth,
  formatIsoDate,
  formatShortDateLabel,
  formatShortMonthYear,
  formatWeekLabel,
  formatWeekSubBarLabel,
  getCurrentWeekStartIso,
  getTodayDate,
  getTodayIso,
  getTodayLabel,
  parseIsoDate,
  type AttendanceTab,
  type CustomRangeState,
} from "./attendanceData";
import { CustomDateRangePicker } from "./CustomDateRangePicker";
import { AgentDropdownMenu } from "./AgentDropdownMenu";

interface AttendanceControlsProps {
  activeTab: AttendanceTab;
  onTabChange: (tab: AttendanceTab) => void;
  selectedAgentIds: Set<string>;
  onAgentSelectionChange: (ids: Set<string>) => void;
  checkedInCount?: number;
  notCheckedInCount?: number;
  customRange?: CustomRangeState;
  onCustomRangeChange?: (range: CustomRangeState) => void;
  onDateChange?: (label: string, iso: string) => void;
  onWeekChange?: (label: string, startIso: string) => void;
  onMonthChange?: (label: string, monthIndex: number, year: number) => void;
}

export function AttendanceControls({
  activeTab,
  onTabChange,
  selectedAgentIds,
  onAgentSelectionChange,
  checkedInCount = 7,
  notCheckedInCount = 2,
  customRange,
  onCustomRangeChange,
  onDateChange,
  onWeekChange,
  onMonthChange,
}: AttendanceControlsProps) {
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Picker tab target (set explicitly in each trigger handler when opening the calendar)
  const [pickerActiveTab, setPickerActiveTab] = useState<AttendanceTab>(activeTab);

  const todayIso = getTodayIso();
  const todayLabel = getTodayLabel();
  const todayDate = getTodayDate();
  const currentWeekStartIso = getCurrentWeekStartIso();

  // Custom date range state (strictly <= today)
  const [customPickerOpen, setCustomPickerOpen] = useState(false);
  const [customStart, setCustomStart] = useState(customRange?.start || "2026-11-09");
  const [customEnd, setCustomEnd] = useState(customRange?.end || todayIso);
  const [customTotalDays, setCustomTotalDays] = useState(customRange?.totalDays || 10);
  const [customWorkingDays, setCustomWorkingDays] = useState(customRange?.workingDays || 8);

  // Unlimited past navigation states (capped at today / current week / current month)
  const [selectedDayIso, setSelectedDayIso] = useState(() => todayIso);
  const [selectedWeekStartIso, setSelectedWeekStartIso] = useState(() => currentWeekStartIso);
  const [selectedMonth, setSelectedMonth] = useState(() => ({
    monthIndex: todayDate.getMonth(),
    year: todayDate.getFullYear(),
  }));

  const getWorkingDaysInMonth = (mIdx: number, yr: number) => {
    const daysInM = new Date(yr, mIdx + 1, 0).getDate();
    let count = 0;
    for (let d = 1; d <= daysInM; d++) {
      const day = new Date(yr, mIdx, d).getDay();
      if (day !== 0 && day !== 6) count++;
    }
    return count;
  };

  // Computed start & end for picker based on active tab
  const pickerStartDate = useMemo(() => {
    if (activeTab === "today") return selectedDayIso;
    if (activeTab === "week") return selectedWeekStartIso;
    if (activeTab === "month") {
      return `${selectedMonth.year}-${String(selectedMonth.monthIndex + 1).padStart(2, "0")}-01`;
    }
    return customRange ? customRange.start : customStart;
  }, [activeTab, selectedDayIso, selectedWeekStartIso, selectedMonth, customRange, customStart]);

  const pickerEndDate = useMemo(() => {
    if (activeTab === "today") return selectedDayIso;
    if (activeTab === "week") {
      const sun = parseIsoDate(selectedWeekStartIso);
      sun.setDate(sun.getDate() + 6);
      const sunIso = formatIsoDate(sun);
      return sunIso > todayIso ? todayIso : sunIso;
    }
    if (activeTab === "month") {
      if (
        selectedMonth.monthIndex === todayDate.getMonth() &&
        selectedMonth.year === todayDate.getFullYear()
      ) {
        return todayIso;
      }
      const lastDay = new Date(selectedMonth.year, selectedMonth.monthIndex + 1, 0).getDate();
      return `${selectedMonth.year}-${String(selectedMonth.monthIndex + 1).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
    }
    return customRange ? customRange.end : customEnd;
  }, [activeTab, selectedDayIso, selectedWeekStartIso, selectedMonth, customRange, customEnd, todayIso, todayDate]);

  const [appliedSingleDate, setAppliedSingleDate] = useState<string | null>(null);
  const [appliedRangeDate, setAppliedRangeDate] = useState<string | null>(null);

  const isCurrentMonthSelected =
    selectedMonth.year === todayDate.getFullYear() &&
    selectedMonth.monthIndex === todayDate.getMonth();

  // Future navigation disabled; past navigation is unlimited!
  const isNextDisabled =
    (activeTab === "today" && (selectedDayIso >= todayIso || appliedSingleDate === todayLabel)) ||
    (activeTab === "week" && selectedWeekStartIso >= currentWeekStartIso && !appliedRangeDate) ||
    (activeTab === "month" && isCurrentMonthSelected);

  const isPrevDisabled = false;

  const handlePrevDate = () => {
    if (activeTab === "today") {
      setAppliedSingleDate(null);
      const prev = parseIsoDate(selectedDayIso);
      prev.setDate(prev.getDate() - 1);
      const prevIso = formatIsoDate(prev);
      setSelectedDayIso(prevIso);
      onDateChange?.(formatShortDateLabel(prevIso), prevIso);
    } else if (activeTab === "week") {
      setAppliedRangeDate(null);
      const prev = parseIsoDate(selectedWeekStartIso);
      prev.setDate(prev.getDate() - 7);
      const prevStartIso = formatIsoDate(prev);
      setSelectedWeekStartIso(prevStartIso);
      onWeekChange?.(formatWeekLabel(prevStartIso), prevStartIso);
    } else if (activeTab === "month") {
      const prevDate = new Date(selectedMonth.year, selectedMonth.monthIndex - 1, 1);
      const nextM = { monthIndex: prevDate.getMonth(), year: prevDate.getFullYear() };
      setSelectedMonth(nextM);
      onMonthChange?.(formatShortMonthYear(nextM.monthIndex, nextM.year), nextM.monthIndex, nextM.year);
    }
  };

  const handleNextDate = () => {
    if (isNextDisabled) return;
    if (activeTab === "today") {
      setAppliedSingleDate(null);
      const next = parseIsoDate(selectedDayIso);
      next.setDate(next.getDate() + 1);
      const nextIso = formatIsoDate(next) > todayIso ? todayIso : formatIsoDate(next);
      setSelectedDayIso(nextIso);
      onDateChange?.(formatShortDateLabel(nextIso), nextIso);
    } else if (activeTab === "week") {
      setAppliedRangeDate(null);
      const next = parseIsoDate(selectedWeekStartIso);
      next.setDate(next.getDate() + 7);
      const candidate = formatIsoDate(next);
      const nextStartIso = candidate > currentWeekStartIso ? currentWeekStartIso : candidate;
      setSelectedWeekStartIso(nextStartIso);
      onWeekChange?.(formatWeekLabel(nextStartIso), nextStartIso);
    } else if (activeTab === "month") {
      const nextDate = new Date(selectedMonth.year, selectedMonth.monthIndex + 1, 1);
      const capped =
        nextDate.getFullYear() > todayDate.getFullYear() ||
        (nextDate.getFullYear() === todayDate.getFullYear() &&
          nextDate.getMonth() > todayDate.getMonth())
          ? { monthIndex: todayDate.getMonth(), year: todayDate.getFullYear() }
          : { monthIndex: nextDate.getMonth(), year: nextDate.getFullYear() };
      setSelectedMonth(capped);
      onMonthChange?.(formatShortMonthYear(capped.monthIndex, capped.year), capped.monthIndex, capped.year);
    }
  };

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    }
    if (dropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dropdownOpen]);

  const allSelected = selectedAgentIds.size === ATTENDANCE_AGENTS.length;
  const isSingle = selectedAgentIds.size === 1;
  const singleAgent = isSingle
    ? ATTENDANCE_AGENTS.find((a) => selectedAgentIds.has(a.id))
    : null;

  const formatCustomRangeLabel = () => {
    if (customRange?.label) return customRange.label;
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    const [, sm, sd] = customStart.split("-").map(Number);
    const [ey, em, ed] = customEnd.split("-").map(Number);
    return `${String(sd).padStart(2, "0")} ${months[sm - 1]} – ${String(ed).padStart(2, "0")} ${months[em - 1]} ${ey}`;
  };

  const handleTabClick = (tab: AttendanceTab) => {
    onTabChange(tab);
    if (tab === "today") {
      setAppliedSingleDate(null);
      setSelectedDayIso(todayIso);
      onDateChange?.(todayLabel, todayIso);
    } else if (tab === "week") {
      setAppliedRangeDate(null);
      setSelectedWeekStartIso(currentWeekStartIso);
      onWeekChange?.(formatWeekLabel(currentWeekStartIso), currentWeekStartIso);
    } else if (tab === "month") {
      const curM = { monthIndex: todayDate.getMonth(), year: todayDate.getFullYear() };
      setSelectedMonth(curM);
      onMonthChange?.(formatShortMonthYear(curM.monthIndex, curM.year), curM.monthIndex, curM.year);
    } else if (tab === "custom") {
      setPickerActiveTab("custom");
      setCustomPickerOpen(true);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-3.5 rounded-2xl border border-line bg-white p-3.5 sm:p-4 md:p-5 shadow-card">
        {/* Top Controls Row: Desktop single row, Tablet/Mobile responsive flow */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          {/* Left: Tab Switcher & Date Controls */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-2.5 md:gap-3 min-w-0">
            {/* Segment Tabs */}
            <div className="inline-flex w-full sm:w-auto items-center rounded-xl border border-slate-200/90 bg-slate-100/70 p-1 text-[13px] font-medium text-slate-600 shadow-2xs shrink-0">
              {(["today", "week", "month", "custom"] as const).map((t) => {
                const isActive = activeTab === t;
                const labels: Record<string, string> = {
                  today: "Today",
                  week: "Week",
                  month: "Month",
                  custom: "Custom",
                };
                return (
                  <button
                    key={t}
                    type="button"
                    onClick={() => handleTabClick(t)}
                    className={cn(
                      "flex-1 sm:flex-initial flex h-8 sm:h-8.5 items-center justify-center rounded-lg px-2.5 sm:px-3.5 text-[12.5px] sm:text-[13px] md:text-[13.5px] transition-all font-medium cursor-pointer select-none whitespace-nowrap",
                      isActive
                        ? "bg-brand-green font-semibold text-white shadow-xs"
                        : "text-slate-600 hover:text-ink hover:bg-white/60"
                    )}
                  >
                    {labels[t]}
                  </button>
                );
              })}
            </div>

            {/* Date Navigator / Date Range Button */}
            {activeTab !== "custom" ? (
              <div className="flex items-center gap-1.5 w-full sm:w-auto shrink-0">
                <button
                  type="button"
                  aria-label="Previous date"
                  disabled={isPrevDisabled}
                  onClick={handlePrevDate}
                  className={cn(
                    "flex h-8.5 w-8.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-2xs transition-colors",
                    isPrevDisabled
                      ? "opacity-30 cursor-not-allowed text-slate-400"
                      : "text-slate-600 hover:bg-surface hover:text-ink cursor-pointer"
                  )}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M15 19l-7-7 7-7" />
                  </svg>
                </button>

                {/* Date button - opens Calendar modal on click */}
                <button
                  type="button"
                  onClick={() => {
                    setPickerActiveTab(activeTab);
                    setCustomPickerOpen(true);
                  }}
                  title="Click to select date or range"
                  className="flex h-8.5 sm:h-9 flex-1 sm:flex-initial items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3 sm:px-3.5 text-[12.5px] sm:text-[13.5px] font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 hover:border-slate-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <svg className="h-4 w-4 text-brand-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="whitespace-nowrap">
                    {activeTab === "today" && (appliedSingleDate || formatShortDateLabel(selectedDayIso))}
                    {activeTab === "week" && (appliedRangeDate || formatWeekLabel(selectedWeekStartIso))}
                    {activeTab === "month" && formatShortMonthYear(selectedMonth.monthIndex, selectedMonth.year)}
                  </span>
                </button>

                <button
                  type="button"
                  aria-label="Next date"
                  disabled={isNextDisabled}
                  onClick={handleNextDate}
                  className={cn(
                    "flex h-8.5 w-8.5 sm:h-9 sm:w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white shadow-2xs transition-colors",
                    isNextDisabled
                      ? "opacity-30 cursor-not-allowed text-slate-400"
                      : "text-slate-600 hover:bg-surface hover:text-ink cursor-pointer"
                  )}
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
            ) : (
              /* Custom Tab: Date Range Dropdown Trigger Button */
              <button
                type="button"
                onClick={() => {
                  setPickerActiveTab("custom");
                  setCustomPickerOpen(true);
                }}
                className="flex h-8.5 sm:h-9 w-full sm:w-auto shrink-0 items-center justify-between sm:justify-start gap-2 rounded-lg border border-slate-200 bg-white px-3 sm:px-3.5 text-[12.5px] sm:text-[13.5px] font-semibold text-slate-800 shadow-2xs hover:bg-slate-50 transition-colors cursor-pointer whitespace-nowrap"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <svg className="h-4 w-4 text-brand-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                  <span className="whitespace-nowrap">{formatCustomRangeLabel()}</span>
                </div>
                <svg className="h-4 w-4 text-slate-500 shrink-0 ml-0.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>
            )}
          </div>

          {/* Right: Multi-Agent Filter Dropdown with strictly no text wrapping */}
          <div className="relative shrink-0 w-full sm:w-auto" ref={dropdownRef}>
            <button
              type="button"
              onClick={() => setDropdownOpen((o) => !o)}
              className="inline-flex w-full sm:w-auto shrink-0 items-center justify-between sm:justify-start gap-2.5 rounded-lg border border-slate-200 bg-white px-3 sm:px-3.5 py-1.5 text-[12.5px] sm:text-[13.5px] font-semibold text-slate-800 shadow-2xs hover:bg-surface transition-colors h-8.5 sm:h-9 cursor-pointer whitespace-nowrap"
            >
              <div className="flex shrink-0 items-center gap-1.5 whitespace-nowrap">
                {isSingle && singleAgent ? (
                  <>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-mint text-[11px] font-bold text-brand-green">
                      {singleAgent.initials}
                    </span>
                    <span className="text-ink font-semibold whitespace-nowrap truncate max-w-[140px] sm:max-w-none">
                      {singleAgent.name}
                    </span>
                  </>
                ) : (
                  <>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-brand-mint text-[10.5px] font-bold text-brand-green">
                      TA
                    </span>
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10.5px] font-bold text-blue-700">
                      CF
                    </span>
                    {selectedAgentIds.size > 2 && (
                      <span className="text-[12px] text-muted font-semibold whitespace-nowrap">
                        +{selectedAgentIds.size - 2}
                      </span>
                    )}
                    <span className="text-ink font-semibold ml-0.5 whitespace-nowrap">
                      {allSelected
                        ? "All agents (9)"
                        : selectedAgentIds.size === 0
                        ? "All agents (9)"
                        : `${selectedAgentIds.size} agents`}
                    </span>
                  </>
                )}
              </div>

              <svg
                className={cn("h-4 w-4 shrink-0 text-slate-500 transition-transform ml-1", dropdownOpen && "rotate-180")}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M6 9l6 6 6-6" />
              </svg>
            </button>

            {/* Dropdown Popup Menu with Checkboxes on the Left */}
            {dropdownOpen && (
              <AgentDropdownMenu
                selectedAgentIds={selectedAgentIds}
                onChange={onAgentSelectionChange}
                onClose={() => setDropdownOpen(false)}
                className="absolute right-0 top-full mt-1.5 z-20"
              />
            )}
          </div>
        </div>

        {/* Sub-bar: Status Pill Badges & Duration/Time */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 border-t border-line-soft pt-3">
          {/* Status Badges */}
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11.5px] sm:text-[12px] font-semibold text-brand-green shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-brand-green" />
              {activeTab === "today" ? `Checked In · ${checkedInCount}` : "Checked In"}
            </span>

            <span className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11.5px] sm:text-[12px] font-semibold text-danger shadow-2xs">
              <span className="h-1.5 w-1.5 rounded-full bg-danger" />
              {activeTab === "today" ? `Not checked in · ${notCheckedInCount}` : "Not Checked In"}
            </span>
          </div>

          {/* Timestamp / Period Note */}
          <div className="text-[11.5px] sm:text-[12px] text-slate-500 font-medium">
            {activeTab === "today" && "As of 13:18 · times in EAT"}
            {activeTab === "week" && (isSingle ? "1 agent selected" : formatWeekSubBarLabel(selectedWeekStartIso))}
            {activeTab === "month" && (
              isCurrentMonthSelected
                ? `1 – ${new Date(todayDate.getFullYear(), todayDate.getMonth() + 1, 0).getDate()} ${formatDayMonth(todayIso).split(" ")[1]} · data up to ${formatDayMonth(todayIso)}`
                : `${formatShortMonthYear(selectedMonth.monthIndex, selectedMonth.year)} · ${getWorkingDaysInMonth(selectedMonth.monthIndex, selectedMonth.year)} working days`
            )}
            {activeTab === "custom" && `${customRange ? customRange.totalDays : customTotalDays} days · ${customRange ? customRange.workingDays : customWorkingDays} working days`}
          </div>
        </div>
      </div>

      {/* Custom Date Range Picker Modal (matching Image 6) */}
      <CustomDateRangePicker
        isOpen={customPickerOpen}
        onClose={() => setCustomPickerOpen(false)}
        activeTab={pickerActiveTab}
        startDate={pickerStartDate}
        endDate={pickerEndDate}
        onApply={(start, end, total, working, quickKey) => {
          const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
          const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

          let rangeLabel = "";
          if (start === end) {
            // Single date picked (e.g. on Today tab)
            const [y, m, d] = start.split("-").map(Number);
            const dateObj = new Date(y, m - 1, d);
            rangeLabel = `${daysOfWeek[dateObj.getDay()]}, ${String(d).padStart(2, "0")} ${months[m - 1]} ${y}`;
            setSelectedDayIso(start);
            setAppliedSingleDate(rangeLabel);
            onDateChange?.(rangeLabel, start);
          } else {
            // Range picked (e.g. on Week / Custom tab)
            const [, sm, sd] = start.split("-").map(Number);
            const [ey, em, ed] = end.split("-").map(Number);
            rangeLabel = `${String(sd).padStart(2, "0")} ${months[sm - 1]} – ${String(ed).padStart(2, "0")} ${months[em - 1]} ${ey}`;
            setSelectedWeekStartIso(start);
            setAppliedRangeDate(rangeLabel);
            onWeekChange?.(rangeLabel, start);
          }

          const newRange: CustomRangeState = {
            start,
            end,
            totalDays: total,
            workingDays: working,
            label: rangeLabel,
          };

          setCustomStart(start);
          setCustomEnd(end);
          setCustomTotalDays(total);
          setCustomWorkingDays(working);
          onCustomRangeChange?.(newRange);

          if (quickKey === "today" || quickKey === "yesterday") {
            const targetIso = start;
            setSelectedDayIso(targetIso);
            setAppliedSingleDate(null);
            onDateChange?.(formatShortDateLabel(targetIso), targetIso);
            onTabChange("today");
          } else if (quickKey === "thisWeek" || quickKey === "lastWeek") {
            setSelectedWeekStartIso(start);
            setAppliedRangeDate(null);
            onWeekChange?.(formatWeekLabel(start), start);
            onTabChange("week");
          } else if (quickKey === "thisMonth" || quickKey === "lastMonth") {
            const [sy, sm] = start.split("-").map(Number);
            const targetM = { monthIndex: sm - 1, year: sy };
            setSelectedMonth(targetM);
            onMonthChange?.(formatShortMonthYear(targetM.monthIndex, targetM.year), targetM.monthIndex, targetM.year);
            onTabChange("month");
          } else if (quickKey === "custom") {
            if (activeTab === "month") {
              const [sy, sm] = start.split("-").map(Number);
              const targetM = { monthIndex: sm - 1, year: sy };
              setSelectedMonth(targetM);
              onMonthChange?.(formatShortMonthYear(targetM.monthIndex, targetM.year), targetM.monthIndex, targetM.year);
            } else if (start !== end && activeTab === "today") {
              onTabChange("custom");
            }
          }
        }}
      />
    </>
  );
}
