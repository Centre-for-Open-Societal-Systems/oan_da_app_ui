import type { Metadata } from "next";
import { TeamAttendanceWorkspace } from "./components/TeamAttendanceWorkspace";
import type { AttendanceTab } from "./components/attendanceData";

export const metadata: Metadata = {
  title: "Team Attendance | OpenAgriNet",
  description: "Monitor agent daily check-in, weekly hours, and monthly attendance records.",
};

const VALID_TABS: AttendanceTab[] = ["today", "week", "month", "custom"];

export default async function TeamAttendancePage(props: {
  searchParams: Promise<{ agent?: string; tab?: string }>;
}) {
  const { agent, tab } = await props.searchParams;
  const initialTab = VALID_TABS.find((t) => t === tab) ?? "today";

  return <TeamAttendanceWorkspace initialAgent={agent} initialTab={initialTab} />;
}
