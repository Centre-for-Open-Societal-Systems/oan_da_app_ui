export type AttendanceTab = "today" | "week" | "month" | "custom";

export interface CustomRangeState {
  start: string;
  end: string;
  totalDays: number;
  workingDays: number;
  label: string;
}

export interface AttendanceAgent {
  id: string;
  name: string;
  role: string;
  kebele: string;
  initials: string;
  phone: string;
}

export interface TodayAttendanceRecord {
  sNo: number;
  agent: AttendanceAgent;
  status: "Checked In" | "Not Checked In";
  checkIn: string;
  checkOut: string;
  hours: string;
}

export interface WeekDayAttendance {
  date: string;
  iso: string;
  dayName: string;
  dayNum: number;
  isToday?: boolean;
  isWeekend?: boolean;
  status: "Checked In" | "Not Checked In" | "Off" | "Upcoming";
  checkIn?: string;
  checkOut?: string;
  hours?: string;
  minutesWorked?: number;
  location?: string;
}

export interface WeeklyAttendanceRecord {
  agent: AttendanceAgent;
  days: WeekDayAttendance[];
}

export type MonthDayStatus = "checked-in" | "not-checked-in" | "off" | "upcoming";

export interface MonthlyAttendanceRecord {
  agent: AttendanceAgent;
  days: Record<number, MonthDayStatus>;
  checkedInDays: number;
  notCheckedInDays: number;
  rate: number;
  avgCheckIn: string;
}

export interface SingleAgentCalendarDay {
  dayNum: number;
  dayName: string;
  dateStr: string;
  status: MonthDayStatus;
  checkInTime?: string;
  checkOutTime?: string;
  isToday?: boolean;
  isWeekend?: boolean;
}

export const ATTENDANCE_AGENTS: AttendanceAgent[] = [
  { id: "TA", name: "Tadesse Alemu", role: "DA – Crops", kebele: "Bako Tibe", initials: "TA", phone: "+251 91 123 4567" },
  { id: "CF", name: "Chaltu Fikadu", role: "DA – Livestock", kebele: "Dembi Dima", initials: "CF", phone: "+251 92 234 5678" },
  { id: "GD", name: "Gemechu Dinsa", role: "DA – Crops", kebele: "Dembi Gobu", initials: "GD", phone: "+251 93 345 6789" },
  { id: "MT", name: "Meseret Tolosa", role: "DA – General", kebele: "Seden Kite", initials: "MT", phone: "+251 91 456 7890" },
  { id: "BG", name: "Bekele Gutema", role: "DA – Natural Res.", kebele: "Bachara Oda Gibe", initials: "BG", phone: "+251 92 567 8901" },
  { id: "HA", name: "Hirut Abdisa", role: "DA – Crops", kebele: "Bari Abo", initials: "HA", phone: "+251 93 678 9012" },
  { id: "AM", name: "Abdi Mohammed", role: "DA – Livestock", kebele: "Gajo Kuyi", initials: "AM", phone: "+251 91 789 0123" },
  { id: "TM", name: "Tigist Mulugeta", role: "DA – General", kebele: "Tulu Sangota", initials: "TM", phone: "+251 92 890 1234" },
  { id: "DK", name: "Dawit Kebede", role: "DA – Natural Res.", kebele: "Tulu Sangota", initials: "DK", phone: "+251 93 901 2345" },
];

export interface AgentWeeklyStats {
  checkedIn: number;
  notCheckedIn: number;
  hoursSoFar: string;
}

const SHORT_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const FULL_MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];
const SHORT_DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const UPPER_WEEK_DAYS = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];

export function getTodayDate(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function formatIsoDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function getTodayIso(): string {
  return formatIsoDate(getTodayDate());
}

export function formatShortDateLabel(iso: string): string {
  const d = parseIsoDate(iso);
  return `${SHORT_DAYS[d.getDay()]}, ${String(d.getDate()).padStart(2, "0")} ${SHORT_MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function getTodayLabel(): string {
  return formatShortDateLabel(getTodayIso());
}

export function formatDayMonth(iso: string): string {
  const d = parseIsoDate(iso);
  return `${d.getDate()} ${SHORT_MONTHS[d.getMonth()]}`;
}

export function getWeekStartMonday(d: Date): Date {
  const copy = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const dayOfWeek = copy.getDay(); // 0 = Sun, 1 = Mon, ...
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  copy.setDate(copy.getDate() + diff);
  return copy;
}

export function getCurrentWeekStartIso(): string {
  return formatIsoDate(getWeekStartMonday(getTodayDate()));
}

export function formatWeekLabel(weekStartIso: string): string {
  const mon = parseIsoDate(weekStartIso);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const monDay = String(mon.getDate()).padStart(2, "0");
  const sunDay = String(sun.getDate()).padStart(2, "0");
  if (mon.getMonth() === sun.getMonth()) {
    return `${monDay} – ${sunDay} ${SHORT_MONTHS[sun.getMonth()]} ${sun.getFullYear()}`;
  }
  return `${monDay} ${SHORT_MONTHS[mon.getMonth()]} – ${sunDay} ${SHORT_MONTHS[sun.getMonth()]} ${sun.getFullYear()}`;
}

export function formatWeekSubBarLabel(weekStartIso: string): string {
  const mon = parseIsoDate(weekStartIso);
  const sun = new Date(mon);
  sun.setDate(mon.getDate() + 6);
  const crossMonth = mon.getMonth() !== sun.getMonth();
  const monStr = `Mon ${mon.getDate()}${crossMonth ? ` ${SHORT_MONTHS[mon.getMonth()]}` : ""}`;
  const sunStr = `Sun ${sun.getDate()}${crossMonth ? ` ${SHORT_MONTHS[sun.getMonth()]}` : ""}`;
  return `${monStr} – ${sunStr} · weekends are off`;
}

export function getRecentDaysList(count = 7): { label: string; iso: string }[] {
  const today = getTodayDate();
  return Array.from({ length: count }, (_, idx) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (count - 1 - idx));
    const iso = formatIsoDate(d);
    return { label: formatShortDateLabel(iso), iso };
  });
}

export function getRecentWeeksList(count = 6): { label: string; startIso: string }[] {
  const currentMonday = getWeekStartMonday(getTodayDate());
  return Array.from({ length: count }, (_, idx) => {
    const mon = new Date(currentMonday);
    mon.setDate(currentMonday.getDate() - (count - 1 - idx) * 7);
    const startIso = formatIsoDate(mon);
    return { label: formatWeekLabel(startIso), startIso };
  });
}

export function formatShortMonthYear(monthIndex: number, year: number): string {
  return `${SHORT_MONTHS[monthIndex]} ${year}`;
}

export function formatFullMonthYear(monthIndex: number, year: number): string {
  return `${FULL_MONTHS[monthIndex]} ${year}`;
}

export function getRecentMonthsList(count = 4): { label: string; monthIndex: number; year: number }[] {
  const today = getTodayDate();
  return Array.from({ length: count }, (_, idx) => {
    const d = new Date(today.getFullYear(), today.getMonth() - (count - 1 - idx), 1);
    return {
      label: formatShortMonthYear(d.getMonth(), d.getFullYear()),
      monthIndex: d.getMonth(),
      year: d.getFullYear(),
    };
  });
}

export const TODAY_ATTENDANCE: TodayAttendanceRecord[] = [
  { sNo: 1, agent: ATTENDANCE_AGENTS[0], status: "Checked In", checkIn: "08:51", checkOut: "—", hours: "4h 27m" },
  { sNo: 2, agent: ATTENDANCE_AGENTS[1], status: "Checked In", checkIn: "08:57", checkOut: "—", hours: "4h 21m" },
  { sNo: 3, agent: ATTENDANCE_AGENTS[2], status: "Checked In", checkIn: "08:45", checkOut: "—", hours: "4h 33m" },
  { sNo: 4, agent: ATTENDANCE_AGENTS[3], status: "Checked In", checkIn: "07:52", checkOut: "—", hours: "5h 26m" },
  { sNo: 5, agent: ATTENDANCE_AGENTS[4], status: "Not Checked In", checkIn: "—", checkOut: "—", hours: "—" },
  { sNo: 6, agent: ATTENDANCE_AGENTS[5], status: "Checked In", checkIn: "07:46", checkOut: "—", hours: "5h 32m" },
  { sNo: 7, agent: ATTENDANCE_AGENTS[6], status: "Not Checked In", checkIn: "—", checkOut: "—", hours: "—" },
  { sNo: 8, agent: ATTENDANCE_AGENTS[7], status: "Checked In", checkIn: "07:40", checkOut: "—", hours: "5h 38m" },
  { sNo: 9, agent: ATTENDANCE_AGENTS[8], status: "Checked In", checkIn: "08:47", checkOut: "—", hours: "4h 31m" },
];

const MONTHLY_ABSENCES: Record<string, Record<string, number[]>> = {
  // key: `${year}-${monthIndex}` (monthIndex: 10 = Nov, 9 = Oct, 8 = Sep, 7 = Aug)
  "2026-10": {
    TA: [3],
    CF: [6],
    GD: [11],
    MT: [],
    BG: [17],
    HA: [12],
    AM: [2, 9, 17],
    TM: [],
    DK: [],
  },
  "2026-9": {
    TA: [7],
    CF: [14],
    GD: [21],
    MT: [],
    BG: [19],
    HA: [13],
    AM: [5, 27],
    TM: [],
    DK: [],
  },
  "2026-8": {
    TA: [8],
    CF: [15],
    GD: [22],
    MT: [],
    BG: [9],
    HA: [16],
    AM: [3, 24],
    TM: [],
    DK: [],
  },
  "2026-7": {
    TA: [11],
    CF: [18],
    GD: [],
    MT: [],
    BG: [25],
    HA: [12],
    AM: [4, 19],
    TM: [],
    DK: [],
  },
};

const AGENT_AVG_CHECKIN: Record<string, string> = {
  TA: "08:14",
  CF: "08:21",
  GD: "08:32",
  MT: "07:55",
  BG: "08:05",
  HA: "08:18",
  AM: "08:44",
  TM: "08:02",
  DK: "08:10",
};

function parseHoursToMinutes(hoursStr: string): number {
  const match = hoursStr.match(/(\d+)h\s*(\d+)m/);
  if (!match) return 0;
  return Number(match[1]) * 60 + Number(match[2]);
}

function formatMinutesToHours(totalMinutes: number): string {
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export interface AgentDayAttendanceDetail {
  iso: string;
  dateLabel: string;
  dayName: string;
  dayNum: number;
  isToday: boolean;
  isWeekend: boolean;
  status: "Checked In" | "Not Checked In" | "Off" | "Upcoming";
  checkIn?: string;
  checkOut?: string;
  hours: string;
  minutesWorked: number;
  location?: string;
}

export function getAgentDayAttendance(
  agent: AttendanceAgent,
  iso: string,
  todayIso: string = getTodayIso()
): AgentDayAttendanceDetail {
  const dateObj = parseIsoDate(iso);
  const year = dateObj.getFullYear();
  const monthIndex = dateObj.getMonth();
  const day = dateObj.getDate();
  const dayOfWeek = dateObj.getDay(); // 0 = Sun, 6 = Sat
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const isToday = iso === todayIso;
  const isFuture = iso > todayIso;
  const monFirstIdx = (dayOfWeek + 6) % 7;

  const base = {
    iso,
    dateLabel: `${day} ${SHORT_MONTHS[monthIndex]}`,
    dayName: UPPER_WEEK_DAYS[monFirstIdx],
    dayNum: day,
    isToday,
    isWeekend,
  };

  if (isWeekend) {
    return {
      ...base,
      status: "Off",
      hours: "—",
      minutesWorked: 0,
    };
  }

  if (isFuture) {
    return {
      ...base,
      status: "Upcoming",
      hours: "—",
      minutesWorked: 0,
    };
  }

  if (isToday) {
    const todayRec = TODAY_ATTENDANCE.find((r) => r.agent.id === agent.id);
    if (todayRec && todayRec.status === "Checked In") {
      return {
        ...base,
        status: "Checked In",
        checkIn: todayRec.checkIn,
        checkOut: "...",
        hours: todayRec.hours,
        minutesWorked: parseHoursToMinutes(todayRec.hours),
        location: agent.kebele,
      };
    }
    return {
      ...base,
      status: "Not Checked In",
      hours: "—",
      minutesWorked: 0,
    };
  }

  // Past weekday (< todayIso)
  const monthKey = `${year}-${monthIndex}`;
  let absences = MONTHLY_ABSENCES[monthKey]?.[agent.id];
  if (!absences) {
    const hash =
      year * 31 +
      (monthIndex + 1) * 17 +
      agent.id.charCodeAt(0) * 7 +
      agent.id.charCodeAt(1) * 13;
    if (agent.id === "MT" || agent.id === "TM" || agent.id === "DK") {
      absences = [];
    } else if (agent.id === "AM") {
      absences = [(hash % 11) + 2, ((hash * 3) % 11) + 16];
    } else if (hash % 2 === 0) {
      absences = [(hash % 24) + 2];
    } else {
      absences = [];
    }
  }
  if (absences.includes(day)) {
    return {
      ...base,
      status: "Not Checked In",
      hours: "—",
      minutesWorked: 0,
    };
  }

  // Deterministic realistic check-in (07:40 - 08:55) & check-out (17:00 - 17:28)
  const seed = day * 13 + (monthIndex + 1) * 7 + agent.id.charCodeAt(0) * 5 + agent.id.charCodeAt(1) * 3;
  const inTotalMinutes = 7 * 60 + 40 + (seed % 76); // 07:40 to 08:55
  const outTotalMinutes = 17 * 60 + ((seed * 3) % 29); // 17:00 to 17:28
  const worked = Math.max(0, outTotalMinutes - inTotalMinutes);

  const checkIn = `${String(Math.floor(inTotalMinutes / 60)).padStart(2, "0")}:${String(inTotalMinutes % 60).padStart(2, "0")}`;
  const checkOut = `${String(Math.floor(outTotalMinutes / 60)).padStart(2, "0")}:${String(outTotalMinutes % 60).padStart(2, "0")}`;

  return {
    ...base,
    status: "Checked In",
    checkIn,
    checkOut,
    hours: formatMinutesToHours(worked),
    minutesWorked: worked,
    location: agent.kebele,
  };
}

export function getTodayAttendanceForDate(
  dateIso: string = getTodayIso(),
  todayIso: string = getTodayIso()
): TodayAttendanceRecord[] {
  return ATTENDANCE_AGENTS.map((agent, idx) => {
    const detail = getAgentDayAttendance(agent, dateIso, todayIso);
    const isCheckedIn = detail.status === "Checked In";
    return {
      sNo: idx + 1,
      agent,
      status: isCheckedIn ? "Checked In" : "Not Checked In",
      checkIn: isCheckedIn ? detail.checkIn || "08:15" : "—",
      checkOut: isCheckedIn ? (detail.checkOut === "..." ? "—" : detail.checkOut || "17:10") : "—",
      hours: isCheckedIn ? detail.hours : "—",
    };
  });
}

export function getWeeklyAttendance(
  weekStartIso: string = getCurrentWeekStartIso(),
  todayIso: string = getTodayIso()
): WeeklyAttendanceRecord[] {
  const start = parseIsoDate(weekStartIso);

  return ATTENDANCE_AGENTS.map((agent) => {
    const days: WeekDayAttendance[] = Array.from({ length: 7 }, (_, i) => {
      const cur = new Date(start);
      cur.setDate(start.getDate() + i);
      const curIso = formatIsoDate(cur);
      const detail = getAgentDayAttendance(agent, curIso, todayIso);

      return {
        date: detail.dateLabel,
        iso: curIso,
        dayName: UPPER_WEEK_DAYS[i],
        dayNum: cur.getDate(),
        isToday: detail.isToday,
        isWeekend: i >= 5,
        status: detail.status,
        checkIn: detail.checkIn,
        checkOut: detail.checkOut,
        hours: detail.hours,
        minutesWorked: detail.minutesWorked,
        location: detail.location,
      };
    });

    return { agent, days };
  });
}

export function getWeeklyStats(records: WeeklyAttendanceRecord[]): {
  checkedIn: number;
  notCheckedIn: number;
  rate: number;
  hoursSoFar: string;
} {
  let checkedIn = 0;
  let notCheckedIn = 0;
  let totalMinutes = 0;

  for (const record of records) {
    for (const day of record.days) {
      if (day.status === "Checked In") {
        checkedIn++;
        totalMinutes += day.minutesWorked || 0;
      } else if (day.status === "Not Checked In") {
        notCheckedIn++;
      }
    }
  }

  const totalPassed = checkedIn + notCheckedIn;
  const rate = totalPassed > 0 ? Math.round((checkedIn / totalPassed) * 100) : 0;

  return {
    checkedIn,
    notCheckedIn,
    rate,
    hoursSoFar: formatMinutesToHours(totalMinutes),
  };
}

export const WEEK_COLUMNS = Array.from({ length: 7 }, (_, i) => {
  const start = getWeekStartMonday(getTodayDate());
  const cur = new Date(start);
  cur.setDate(start.getDate() + i);
  const curIso = formatIsoDate(cur);
  return {
    dayName: UPPER_WEEK_DAYS[i],
    dayNum: cur.getDate(),
    dateStr: `${cur.getDate()} ${SHORT_MONTHS[cur.getMonth()]} ${cur.getFullYear()}`,
    isToday: curIso === getTodayIso(),
    isWeekend: i >= 5,
  };
});

export const WEEKLY_ATTENDANCE: WeeklyAttendanceRecord[] = getWeeklyAttendance();

export const AGENT_WEEKLY_STATS: Record<string, AgentWeeklyStats> = Object.fromEntries(
  WEEKLY_ATTENDANCE.map((rec) => {
    const s = getWeeklyStats([rec]);
    return [rec.agent.id, { checkedIn: s.checkedIn, notCheckedIn: s.notCheckedIn, hoursSoFar: s.hoursSoFar }];
  })
);

export function getMonthlyAttendance(
  monthIndex: number = getTodayDate().getMonth(),
  year: number = getTodayDate().getFullYear()
): MonthlyAttendanceRecord[] {
  const todayIso = getTodayIso();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return ATTENDANCE_AGENTS.map((agent) => {
    const days: Record<number, MonthDayStatus> = {};
    let checkedInDays = 0;
    let notCheckedInDays = 0;

    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
      const detail = getAgentDayAttendance(agent, iso, todayIso);

      if (detail.status === "Off") {
        days[day] = "off";
      } else if (detail.status === "Upcoming") {
        days[day] = "upcoming";
      } else if (detail.status === "Not Checked In") {
        days[day] = "not-checked-in";
        notCheckedInDays++;
      } else {
        days[day] = "checked-in";
        checkedInDays++;
      }
    }

    const totalWorkingPassed = checkedInDays + notCheckedInDays;
    const rate =
      totalWorkingPassed > 0
        ? Math.round((checkedInDays / totalWorkingPassed) * 100)
        : 100;

    return {
      agent,
      days,
      checkedInDays,
      notCheckedInDays,
      rate,
      avgCheckIn: AGENT_AVG_CHECKIN[agent.id] || "08:15",
    };
  });
}

export const MONTHLY_ATTENDANCE: MonthlyAttendanceRecord[] = getMonthlyAttendance();

export function getSingleAgentCalendar(
  agentId: string,
  monthIndex: number = getTodayDate().getMonth(),
  year: number = getTodayDate().getFullYear()
): SingleAgentCalendarDay[] {
  const agent = ATTENDANCE_AGENTS.find((a) => a.id === agentId) ?? ATTENDANCE_AGENTS[0];
  const todayIso = getTodayIso();
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  const days: SingleAgentCalendarDay[] = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const iso = `${year}-${String(monthIndex + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    const dateObj = new Date(year, monthIndex, d);
    const detail = getAgentDayAttendance(agent, iso, todayIso);

    const status: MonthDayStatus =
      detail.status === "Off"
        ? "off"
        : detail.status === "Upcoming"
        ? "upcoming"
        : detail.status === "Not Checked In"
        ? "not-checked-in"
        : "checked-in";

    days.push({
      dayNum: d,
      dayName: SHORT_DAYS[dateObj.getDay()],
      dateStr: `${d} ${SHORT_MONTHS[monthIndex]} ${year}`,
      status,
      checkInTime: detail.checkIn,
      checkOutTime: detail.checkOut === "..." ? undefined : detail.checkOut,
      isToday: detail.isToday,
      isWeekend: detail.isWeekend,
    });
  }
  return days;
}
