"use client";

import { useMemo, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import {
  ATTENDANCE_AGENTS,
  formatDayMonth,
  formatWeekLabel,
  getCurrentWeekStartIso,
  getRecentMonthsList,
  getTodayAttendanceForDate,
  getTodayDate,
  getTodayIso,
  getTodayLabel,
  getWeeklyAttendance,
  getWeeklyStats,
  type AttendanceTab,
  type CustomRangeState,
} from "./attendanceData";
import { AttendanceHeader } from "./AttendanceHeader";
import { AttendanceControls } from "./AttendanceControls";
import { AgentAttendanceSummaryCard } from "./AgentAttendanceSummaryCard";
import { TodayStatsCards } from "./TodayStatsCards";
import { TodayAttendanceTable } from "./TodayAttendanceTable";
import { WeeklyAttendanceTable } from "./WeeklyAttendanceTable";
import { SingleAgentWeeklyView } from "./SingleAgentWeeklyView";
import { MonthlyAttendanceGrid } from "./MonthlyAttendanceGrid";
import { MonthlyAgentCalendar } from "./MonthlyAgentCalendar";
import { CustomDateAttendance } from "./CustomDateAttendance";
import { ExportAttendanceModal } from "./ExportAttendanceModal";
import { SendAttendanceReminderModal } from "./SendAttendanceReminderModal";

interface TeamAttendanceWorkspaceProps {
  initialAgent?: string;
  initialTab?: AttendanceTab;
}

export function TeamAttendanceWorkspace({
  initialAgent,
  initialTab = "week",
}: TeamAttendanceWorkspaceProps) {
  const [tab, setTab] = useState<AttendanceTab>(initialTab);
  const [notice, setNotice] = useState<string | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);

  const todayIso = getTodayIso();
  const todayDate = getTodayDate();
  const defaultWeekStartIso = getCurrentWeekStartIso();
  const recentMonths = getRecentMonthsList(4);
  const currentMonthEntry = recentMonths[recentMonths.length - 1];

  // Custom date range state (shared between Controls and CustomDateAttendance)
  const [customRange, setCustomRange] = useState<CustomRangeState>(() => {
    const startIso = "2026-11-09";
    const endIso = todayIso;
    const sDate = new Date(2026, 10, 9);
    let totalDays = 0;
    let workingDays = 0;
    const cur = new Date(sDate);
    while (cur <= todayDate) {
      totalDays++;
      if (cur.getDay() !== 0 && cur.getDay() !== 6) workingDays++;
      cur.setDate(cur.getDate() + 1);
    }
    return {
      start: startIso,
      end: endIso,
      totalDays: totalDays || 10,
      workingDays: workingDays || 8,
      label: `09 Nov – ${formatDayMonth(endIso)} ${todayDate.getFullYear()}`,
    };
  });

  // Date states for Today, Week, Month
  const [currentDateLabel, setCurrentDateLabel] = useState(() => getTodayLabel());
  const [currentDateIso, setCurrentDateIso] = useState(() => todayIso);

  const [selectedWeekLabel, setSelectedWeekLabel] = useState(() => formatWeekLabel(defaultWeekStartIso));
  const [selectedWeekStartIso, setSelectedWeekStartIso] = useState(() => defaultWeekStartIso);

  const [selectedMonthLabel, setSelectedMonthLabel] = useState(() => currentMonthEntry.label);
  const [selectedMonthIndex, setSelectedMonthIndex] = useState(() => currentMonthEntry.monthIndex);
  const [selectedMonthYear, setSelectedMonthYear] = useState(() => currentMonthEntry.year);

  // Dynamic counts for Today tab based on currentDateIso
  const todayStats = useMemo(() => {
    const recs = getTodayAttendanceForDate(currentDateIso, todayIso);
    const checkedIn = recs.filter((r) => r.status === "Checked In").length;
    return { checkedIn, notCheckedIn: recs.length - checkedIn };
  }, [currentDateIso, todayIso]);

  // Initialize selected agents: default to "TA" (Tadesse Alemu) matching Image 1
  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(() => {
    if (initialAgent) {
      // Find matching agent by id or daId or name
      const found = ATTENDANCE_AGENTS.find(
        (a) =>
          a.id.toLowerCase() === initialAgent.toLowerCase() ||
          a.name.toLowerCase().includes(initialAgent.toLowerCase())
      );
      if (found) return new Set([found.id]);
    }
    return new Set(["TA"]);
  });

  const isSingleAgent = selectedAgentIds.size === 1;
  const singleAgentId = isSingleAgent ? [...selectedAgentIds][0] : undefined;

  const currentAgent = useMemo(() => {
    if (singleAgentId) {
      return ATTENDANCE_AGENTS.find((a) => a.id === singleAgentId);
    }
    return ATTENDANCE_AGENTS[0];
  }, [singleAgentId]);

  const singleAgentWeekStats = useMemo(() => {
    if (!currentAgent) return undefined;
    const weekly = getWeeklyAttendance(selectedWeekStartIso, todayIso);
    const agentRec = weekly.find((r) => r.agent.id === currentAgent.id);
    if (!agentRec) return undefined;
    return getWeeklyStats([agentRec]);
  }, [currentAgent, selectedWeekStartIso, todayIso]);

  return (
    <div className="flex w-full flex-col gap-4 animate-fade-in">
      {/* Notice Banner */}
      {notice && (
        <Banner tone="success" onDismiss={() => setNotice(null)}>
          {notice}
        </Banner>
      )}

      {/* Header */}
      <AttendanceHeader
        onExport={() => setExportOpen(true)}
        onSendReminder={() => setReminderOpen(true)}
        agentName="Tadesse Alemu"
        kebele="Bako Tibe kebele"
      />

      {/* Controls Bar: Tabs, Date Navigation, Multi-Agent Selector */}
      <AttendanceControls
        activeTab={tab}
        onTabChange={setTab}
        selectedAgentIds={selectedAgentIds}
        onAgentSelectionChange={setSelectedAgentIds}
        checkedInCount={todayStats.checkedIn}
        notCheckedInCount={todayStats.notCheckedIn}
        customRange={customRange}
        onCustomRangeChange={setCustomRange}
        onDateChange={(label, iso) => {
          setCurrentDateLabel(label);
          setCurrentDateIso(iso);
        }}
        onWeekChange={(label, startIso) => {
          setSelectedWeekLabel(label);
          setSelectedWeekStartIso(startIso);
        }}
        onMonthChange={(label, mIdx, yr) => {
          setSelectedMonthLabel(label);
          setSelectedMonthIndex(mIdx);
          setSelectedMonthYear(yr);
        }}
      />

      {/* Main Content by Tab */}
      {tab === "today" && (
        <div className="flex flex-col gap-4">
          <TodayStatsCards
            checkedInCount={todayStats.checkedIn}
            notCheckedInCount={todayStats.notCheckedIn}
            totalAgents={9}
          />
          <TodayAttendanceTable
            selectedAgentIds={selectedAgentIds}
            selectedDate={currentDateLabel}
            selectedDateIso={currentDateIso}
          />
        </div>
      )}

      {tab === "week" && (
        <>
          {isSingleAgent && currentAgent ? (
            <div className="flex flex-col gap-4 animate-fade-in">
              <AgentAttendanceSummaryCard
                agent={currentAgent}
                checkedIn={singleAgentWeekStats?.checkedIn}
                notCheckedIn={singleAgentWeekStats?.notCheckedIn}
                hoursSoFar={singleAgentWeekStats?.hoursSoFar}
              />
              <SingleAgentWeeklyView
                agent={currentAgent}
                selectedWeekStartIso={selectedWeekStartIso}
              />
            </div>
          ) : (
            <WeeklyAttendanceTable
              selectedAgentIds={selectedAgentIds}
              selectedWeekLabel={selectedWeekLabel}
              selectedWeekStartIso={selectedWeekStartIso}
            />
          )}
        </>
      )}

      {tab === "month" && (
        <>
          {isSingleAgent && singleAgentId ? (
            <MonthlyAgentCalendar
              agentId={singleAgentId}
              selectedMonthLabel={selectedMonthLabel}
              monthIndex={selectedMonthIndex}
              year={selectedMonthYear}
            />
          ) : (
            <MonthlyAttendanceGrid
              selectedAgentIds={selectedAgentIds}
              onSelectAgent={(agentId) => setSelectedAgentIds(new Set([agentId]))}
              selectedMonthLabel={selectedMonthLabel}
              selectedMonthIndex={selectedMonthIndex}
              selectedMonthYear={selectedMonthYear}
            />
          )}
        </>
      )}

      {tab === "custom" && (
        <CustomDateAttendance
          selectedAgentIds={selectedAgentIds}
          customRange={customRange}
        />
      )}

      {/* Export Attendance Modal */}
      <ExportAttendanceModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        initialDateRange={
          tab === "today"
            ? `Today · ${currentDateLabel}`
            : tab === "week"
            ? selectedWeekLabel
            : tab === "month"
            ? selectedMonthLabel
            : customRange?.label || `01 Nov – ${formatDayMonth(todayIso)} ${todayDate.getFullYear()}`
        }
        initialSelectedAgentIds={selectedAgentIds}
        onExport={(format) => {
          setNotice(`Exported attendance report successfully (${format.toUpperCase()}).`);
        }}
      />

      {/* Send Reminder Modal */}
      <SendAttendanceReminderModal
        isOpen={reminderOpen}
        onClose={() => setReminderOpen(false)}
        onSend={() => {
          setNotice("Check-in reminder sent to un-checked-in agents.");
        }}
      />
    </div>
  );
}
