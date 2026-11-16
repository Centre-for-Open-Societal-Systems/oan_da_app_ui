import type { PillTone } from "@/components/ui/Pill";

// Supervisor (Woreda) programme-health dashboard — kebele-level roll-ups (FR-09a scope, Part 1 read-only view).

export type KebeleStatus = "On track" | "Watch" | "At risk";

export interface KebeleRow {
  kebele: string;
  farmers: number;
  agents: number;
  visitPct: number;
  lastSync: string;
  status: KebeleStatus;
}

export interface WoredaHealth {
  woreda: string;
  updatedAt: string;
  stats: { farmers: number; activeAgents: number; dataQuality: number; openGrievances: number };
  kebeles: KebeleRow[];
}

export const STATUS_TONE: Record<KebeleStatus, PillTone> = { "On track": "green", Watch: "amber", "At risk": "red" };

/** Visit % thresholds drive status: ≥ 80 On track · 60–79 Watch · < 60 At risk. */
export const statusFor = (visitPct: number): KebeleStatus => (visitPct >= 80 ? "On track" : visitPct >= 60 ? "Watch" : "At risk");

const row = (kebele: string, farmers: number, agents: number, visitPct: number, lastSync: string): KebeleRow => ({ kebele, farmers, agents, visitPct, lastSync, status: statusFor(visitPct) });

export const WOREDA_HEALTH: WoredaHealth[] = [
  {
    woreda: "Adea Woreda",
    updatedAt: "15 Sep 2026",
    stats: { farmers: 12_490, activeAgents: 22, dataQuality: 84, openGrievances: 22 },
    kebeles: [
      row("Dhankaka", 1_240, 2, 89, "15 Sep 2026, 14:30"),
      row("Godino", 1_110, 2, 85, "15 Sep 2026, 14:05"),
      row("Kajima", 820, 1, 51, "15 Sep 2026, 11:50"),
      row("Ude", 1_030, 2, 74, "15 Sep 2026, 13:10"),
      row("Hidi", 1_180, 2, 92, "15 Sep 2026, 14:45"),
      row("Gerbicha", 740, 1, 48, "15 Sep 2026, 09:40"),
      row("Babogaya", 1_560, 3, 81, "15 Sep 2026, 14:15"),
      row("Kurkura", 1_350, 2, 72, "15 Sep 2026, 12:55"),
      row("Keteba", 640, 1, 63, "15 Sep 2026, 10:25"),
      row("Hora Arsedi", 920, 2, 44, "15 Sep 2026, 08:35"),
      row("Dire Godo", 1_090, 2, 86, "15 Sep 2026, 14:20"),
      row("Yerer", 810, 2, 67, "15 Sep 2026, 12:40"),
    ],
  },
  {
    woreda: "Akaki Woreda",
    updatedAt: "15 Sep 2026",
    stats: { farmers: 8_210, activeAgents: 15, dataQuality: 79, openGrievances: 14 },
    kebeles: [
      row("Akaki 01", 1_420, 3, 86, "15 Sep 2026, 14:10"),
      row("Akaki 02", 1_180, 2, 77, "15 Sep 2026, 13:05"),
      row("Dalota", 1_320, 3, 91, "15 Sep 2026, 14:40"),
      row("Gelan", 1_510, 3, 68, "15 Sep 2026, 12:15"),
      row("Tulu Dimtu", 1_440, 2, 58, "15 Sep 2026, 10:30"),
      row("Koye", 1_340, 2, 81, "15 Sep 2026, 14:00"),
    ],
  },
  {
    woreda: "Gimbichu Woreda",
    updatedAt: "14 Sep 2026",
    stats: { farmers: 6_730, activeAgents: 11, dataQuality: 88, openGrievances: 7 },
    kebeles: [
      row("Chefe Donsa", 1_480, 3, 93, "14 Sep 2026, 16:50"),
      row("Adulala", 1_260, 2, 85, "14 Sep 2026, 16:05"),
      row("Dire", 1_390, 2, 72, "14 Sep 2026, 15:10"),
      row("Kilinto", 1_310, 2, 88, "14 Sep 2026, 16:20"),
      row("Wachu", 1_290, 2, 55, "14 Sep 2026, 11:45"),
    ],
  },
];

