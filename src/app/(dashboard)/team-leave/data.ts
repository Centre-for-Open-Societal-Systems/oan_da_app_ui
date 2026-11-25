import { addDays } from "@/lib/ethiopian";

/** Agents in the Woreda team, for "of N agents". */
export const TEAM_SIZE = 22;

export interface TeamLeaveRow {
  id: string;
  agent: string;
  kebele: string;
  type: string;
  /** ISO dates. */
  start: string;
  end: string;
  cover: string | null;
}

export interface WaitingRequest extends TeamLeaveRow {
  /** Working days requested. */
  days: number;
  daysAgo: number;
  /** The agent's balance of this leave type before the request; null when the type is not deducted from a balance. */
  balance: { left: number; total: number } | null;
}

/** DAs who can take over a kebele, nearest first. */
export const COVER_CANDIDATES = [
  { agent: "Hirut Abdisa", kebele: "Bari Abo" },
  { agent: "Gemechu Dinsa", kebele: "Lume" },
  { agent: "Dawit Kebede", kebele: "Tulu Sangota" },
  { agent: "Tigist Mulugeta", kebele: "Seden Kite" },
];

export const firstName = (name: string) => name.split(" ")[0];

// Mock data until the team leave endpoint exists. Dates are offsets from today so the page always has people on leave.
export function mockTeam(today: string): { rows: TeamLeaveRow[]; waiting: WaitingRequest[] } {
  const at = (offset: number) => addDays(today, offset);
  return {
    rows: [
      { id: "TL-0412", agent: "Hirut Abdisa", kebele: "Bari Abo", type: "Sick leave", start: at(-3), end: at(2), cover: "Gemechu Dinsa" },
      { id: "TL-0409", agent: "Abdi Mohammed", kebele: "Gajo Kuyi", type: "Annual leave", start: at(-4), end: at(8), cover: null },
      { id: "TL-0415", agent: "Kebele Gutema", kebele: "Bachara Oda Gibe", type: "Paternity leave", start: at(-2), end: at(11), cover: "Dawit Kebede" },
      { id: "TL-0417", agent: "Chaltu Fikadu", kebele: "Dembi Dima", type: "Annual leave", start: at(10), end: at(14), cover: "Tadesse Alemu" },
      { id: "TL-0398", agent: "Meseret Bekele", kebele: "Kebele 05", type: "Sick leave", start: at(-12), end: at(-9), cover: "Hirut Abebe" },
    ],
    waiting: [
      { id: "LV-W-1", agent: "Tadesse Alemu", kebele: "Dembi Dima", type: "Annual leave", days: 4, start: at(12), end: at(15), cover: "Chaltu Fikadu", daysAgo: 2, balance: { left: 17, total: 20 } },
      { id: "LV-W-2", agent: "Meseret Tolosa", kebele: "Seden Kite", type: "Maternity leave", days: 120, start: at(20), end: at(139), cover: null, daysAgo: 1, balance: null },
      { id: "LV-W-3", agent: "Dawit Kebede", kebele: "Tulu Sangota", type: "Bereavement leave", days: 3, start: at(5), end: at(7), cover: "Tigist Mulugeta", daysAgo: 1, balance: null },
    ],
  };
}
