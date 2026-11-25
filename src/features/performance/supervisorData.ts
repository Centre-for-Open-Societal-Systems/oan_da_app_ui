// Sample woreda performance data until the KPI aggregation API is wired.
import type { FilterFieldConfig } from "@/components/ui/AdvancedFiltersDrawer";
import type { FilterOption } from "@/components/ui/FilterDropdown";
import type { PillTone } from "@/components/ui/Pill";

export const REGIONS = ["Oromia", "Amhara", "Sidama", "SNNP", "Tigray"];
export const PERIODS = ["Last 7 days", "Last 30 days", "Last 90 days", "This quarter", "This year"];

export const WOREDA_SUMMARY = {
  woreda: "Adama woreda",
  agentCount: 24,
};

export interface SupervisorPerformanceStat {
  key: string;
  label: string;
  value: string;
  accent: string; // border-l-* class
  tile: string; // icon tile bg/text classes
  icon: "calendar" | "userCheck" | "handshake" | "alert" | "training";
}

export const SUPERVISOR_PERFORMANCE_STATS: SupervisorPerformanceStat[] = [
  { key: "agents", label: "Agents", value: "24", accent: "border-l-blue-600", tile: "bg-info-tint text-blue-600", icon: "calendar" },
  { key: "active", label: "Active today", value: "19", accent: "border-l-brand-green", tile: "bg-brand-tint text-brand-green", icon: "userCheck" },
  { key: "visits", label: "Visits (week)", value: "312", accent: "border-l-orange-600", tile: "bg-orange-50 text-orange-600", icon: "handshake" },
  { key: "reviews", label: "Pending reviews", value: "6", accent: "border-l-danger", tile: "bg-danger-tint text-danger", icon: "alert" },
  { key: "training", label: "Training", value: "88%", accent: "border-l-violet-600", tile: "bg-violet-tint text-violet-600", icon: "training" },
];

/** Supervisor scorecard: cycle score, KPI template and the team roll-up shown above the KPI table. */
export const SUPERVISOR_SCORECARD = {
  cycle: "Hamle – Tahsas 2019",
  score: 76,
  status: "On track",
  template: "Woreda Supervisor",
  templateNote: "7 KPIs · set by Federal PMS team",
  teamScore: 74,
  teamNote: "22 agents in 7 kebeles",
};

export type SupervisorKpiStatus = "On track" | "Needs support" | "Ahead" | "Slightly behind" | "From Tir";

export const SUPERVISOR_KPI_STATUS_TONE: Record<SupervisorKpiStatus, PillTone> = {
  "On track": "green",
  "Needs support": "red",
  Ahead: "blue",
  "Slightly behind": "amber",
  "From Tir": "slate",
};

export interface SupervisorKpiHelp {
  summary: string;
  counted?: string;
  outOf?: string;
  enteredBy?: string;
  evidence?: string;
}

export interface SupervisorKpiRow {
  id: string;
  no: number;
  kpi: string;
  /** Plain-language definition shown on the "?" help card. */
  help: SupervisorKpiHelp;
  weight: number; // %
  target: string;
  soFar: string; // "—" when not reported yet
  achievement: number | null; // % of target; null until reported
  status: SupervisorKpiStatus;
  /** Target cascade from national down to this supervisor. */
  targetChain: string[];
  note: string;
}

const KPI_BASE: Omit<SupervisorKpiRow, "id" | "no">[] = [
  { kpi: "Agents with monthly figures on time", help: { summary: "Worked out automatically from the submission dates of agents' monthly figures.", counted: "Agents whose monthly figures were submitted by the deadline", outOf: "Agents you supervise", enteredBy: "System" }, weight: 20, target: "90%", soFar: "82%", achievement: 94, status: "On track", targetChain: ["National 90%", "Oromia 90%", "West Shewa 90%", "Ayana 90%"], note: "20 of 22 agents submitted on time this month." },
  { kpi: "Kebeles visited each month", help: { summary: "Record a visit when you meet agents at their kebele or FTC.", counted: "Kebele-months with at least one supervision visit", outOf: "Kebele-months in your woreda", enteredBy: "Supervisor", evidence: "Optional photo" }, weight: 15, target: "80%", soFar: "75%", achievement: 94, status: "On track", targetChain: ["National 80%", "Oromia 80%", "West Shewa 80%", "Ayana 80%"], note: "5 of 7 kebeles visited so far." },
  { kpi: "Coaching sessions held with agents", help: { summary: "One session a month meets the target.", counted: "Coaching or review sessions held with agents", enteredBy: "Supervisor", evidence: "Optional document" }, weight: 5, target: "6", soFar: "4", achievement: 67, status: "On track", targetChain: ["National 6", "Oromia 6", "West Shewa 6", "Ayana 6"], note: "2 sessions remain before the cycle closes." },
  { kpi: "Self-appraisals reviewed on time", help: { summary: "Worked out automatically from the review dates.", counted: "Self-appraisals reviewed within 10 days", outOf: "Self-appraisals submitted", enteredBy: "System" }, weight: 15, target: "95%", soFar: "—", achievement: null, status: "From Tir", targetChain: ["National 95%", "Oromia 95%", "West Shewa 95%", "Ayana 95%"], note: "Self-appraisals open in Tir, so nothing is reported yet." },
  { kpi: "Target discussions answered on time", help: { summary: "Worked out automatically when you confirm or update a discussed target.", counted: "Discussions answered within 10 days", outOf: "Discussions requested", enteredBy: "System" }, weight: 10, target: "90%", soFar: "67%", achievement: 79, status: "Needs support", targetChain: ["National 90%", "Oromia 90%", "West Shewa 90%", "Ayana 90%"], note: "3 discussions are waiting; the oldest is 4 days old." },
  { kpi: "Farmer registrations validated on time", help: { summary: "Worked out from approval dates in the Farmer Registry.", counted: "Registrations validated within 5 working days", outOf: "Registrations received", enteredBy: "Farmer Registry" }, weight: 10, target: "90%", soFar: "93%", achievement: 100, status: "Ahead", targetChain: ["National 90%", "Oromia 90%", "West Shewa 90%", "Ayana 90%"], note: "All pending registrations are within the validation window." },
  { kpi: "Team KPI achievement", help: { summary: "The average result of the agents you supervise.", counted: "Sum of agents' overall achievement", outOf: "Number of agents", enteredBy: "System" }, weight: 25, target: "80%", soFar: "74%", achievement: 93, status: "Slightly behind", targetChain: ["National 80%", "Oromia 80%", "West Shewa 80%", "Ayana 80%"], note: "4 agents are below target; see Reviews for follow-up." },
];

// Sample scorecard of 42 KPI rows until the PMS API is wired (the 7 template KPIs repeat per tracked period).
export const SUPERVISOR_KPIS: SupervisorKpiRow[] = Array.from({ length: 42 }, (_, i) => ({
  ...KPI_BASE[i % KPI_BASE.length],
  id: `sk${i + 1}`,
  no: i + 1,
}));

export type FiguresStatus = "In" | "Not yet" | "Draft" | "In · by you";

export const FIGURES_STATUS_TONE: Record<FiguresStatus, PillTone> = {
  In: "green",
  "Not yet": "amber",
  Draft: "slate",
  "In · by you": "blue",
};

export interface TeamMemberRow {
  id: string;
  no: number;
  name: string;
  kebele: string;
  role: string;
  figures: FiguresStatus;
  halfYear: number; // % of the half-year target so far
  waiting: number; // open target discussions
}

/** Header tiles of the supervisor's My Team page. */
export const TEAM_SUMMARY = {
  figuresMonth: "Tikimt",
  figuresIn: 14,
  figuresTotal: 22,
  figuresDue: "Due Hidar 5",
  achievement: 74,
  cycle: "Hamle – Tahsas 2019",
  discussionsWaiting: 3,
  oldestWaitingDays: 4,
  enteredByYou: 2,
};

const TEAM_BASE: Omit<TeamMemberRow, "id" | "no">[] = [
  { name: "Tadesse Alemu", kebele: "Dembi Dima", role: "DA – Crops", figures: "In", halfYear: 78, waiting: 1 },
  { name: "Chaltu Fikadu", kebele: "Dembi Dima", role: "DA – Livestock", figures: "Not yet", halfYear: 71, waiting: 0 },
  { name: "Gemechu Dinsa", kebele: "Dembi Gobu", role: "DA – Crops", figures: "In", halfYear: 83, waiting: 0 },
  { name: "Meseret Tolosa", kebele: "Seden Kite", role: "DA – General", figures: "Draft", halfYear: 69, waiting: 1 },
  { name: "Bekele Gutema", kebele: "Bachara Oda Gibe", role: "DA – Natural Res.", figures: "Not yet", halfYear: 58, waiting: 0 },
  { name: "Hirut Abdisa", kebele: "Bari Abo", role: "DA – Crops", figures: "In · by you", halfYear: 80, waiting: 0 },
  { name: "Abdi Mohammed", kebele: "Gajo Kuyi", role: "DA – Livestock", figures: "Not yet", halfYear: 64, waiting: 1 },
  { name: "Tigist Mulugeta", kebele: "Tulu Sangota", role: "DA – General", figures: "In", halfYear: 76, waiting: 0 },
  { name: "Dawit Kebede", kebele: "Tulu Sangota", role: "DA – Natural Res.", figures: "In", halfYear: 72, waiting: 0 },
];

// Sample roster of 42 rows until the PMS API is wired (the 9 sample agents repeat).
export const TEAM_MEMBERS: TeamMemberRow[] = Array.from({ length: 42 }, (_, i) => ({
  ...TEAM_BASE[i % TEAM_BASE.length],
  id: `tm${i + 1}`,
  no: i + 1,
}));

export type TargetAgreement = "Agreed" | "Discussing" | "Fixed";

export const TARGET_AGREEMENT_TONE: Record<TargetAgreement, PillTone> = {
  Agreed: "green",
  Discussing: "blue",
  Fixed: "slate",
};

export interface TargetRow {
  id: string;
  kpi: string;
  help: SupervisorKpiHelp;
  weight: number; // %
  national: number;
  unit: string; // "" when the number is a plain count
  /** Value currently agreed with the agent; the supervisor edits away from it. */
  agreed: number;
  /** Value the page opens with (differs from `agreed` while a discussion is open). */
  proposed: number;
  agreement: TargetAgreement;
  /** Set centrally, not editable. */
  fixed?: boolean;
}

/** Targets the supervisor sets per agent for the half-year (sample: same template for every agent). */
export const TARGET_ROWS: TargetRow[] = [
  { id: "t1", kpi: "Farmers registered and approved", help: { summary: "Farmers you registered who were approved by the Farmer Registry.", counted: "Registered farmers approved", enteredBy: "Farmer Registry" }, weight: 10, national: 100, unit: "farmers", agreed: 100, proposed: 100, agreement: "Agreed" },
  { id: "t2", kpi: "Advisory visits completed", help: { summary: "Advisory visits the agent completed against the visits planned.", counted: "Advisory visits completed", outOf: "Visits planned", enteredBy: "Agent" }, weight: 20, national: 90, unit: "%", agreed: 90, proposed: 90, agreement: "Agreed" },
  { id: "t3", kpi: "Farmers applying the advised practice", help: { summary: "Farmers who started the practice the agent advised.", counted: "Farmers applying the advised practice", outOf: "Farmers advised", enteredBy: "Agent", evidence: "Optional photo" }, weight: 20, national: 60, unit: "%", agreed: 60, proposed: 50, agreement: "Discussing" },
  { id: "t4", kpi: "Farmers trained", help: { summary: "Farmers reached through trainings in the half-year.", counted: "Farmers trained", enteredBy: "Agent" }, weight: 15, national: 60, unit: "farmers", agreed: 60, proposed: 60, agreement: "Agreed" },
  { id: "t5", kpi: "Demonstrations established", help: { summary: "Demonstration plots or sessions set up.", counted: "Demonstrations established", enteredBy: "Agent", evidence: "Optional photo" }, weight: 10, national: 2, unit: "", agreed: 2, proposed: 2, agreement: "Agreed" },
  { id: "t6", kpi: "Crop surveys completed", help: { summary: "Crop surveys completed against those planned.", counted: "Crop surveys completed", outOf: "Crop surveys planned", enteredBy: "Agent" }, weight: 10, national: 95, unit: "%", agreed: 95, proposed: 95, agreement: "Agreed" },
  { id: "t7", kpi: "Women among farmers trained", help: { summary: "Share of trained farmers who are women.", counted: "Women trained", outOf: "Farmers trained", enteredBy: "Agent" }, weight: 10, national: 40, unit: "%", agreed: 40, proposed: 40, agreement: "Agreed" },
  { id: "t8", kpi: "Months with figures entered on time", help: { summary: "Worked out automatically from the submission dates of monthly figures.", counted: "Months with figures in by the deadline", enteredBy: "System" }, weight: 5, national: 5, unit: "months", agreed: 5, proposed: 5, agreement: "Fixed", fixed: true },
];

export type LocalGoalStatus = "On track" | "Needs attention" | "Needs support";

export const LOCAL_GOAL_STATUS_TONE: Record<LocalGoalStatus, PillTone> = {
  "On track": "green",
  "Needs attention": "amber",
  "Needs support": "red",
};

export interface LocalGoal {
  id: string;
  goal: string;
  /** KPI whose result this goal's progress counts towards. */
  feedsKpi: string;
  target: string; // "2 field days"
  done: number;
  of: number;
  due: string; // "30 Tikimt"
  status: LocalGoalStatus;
}

/** Ethiopian-calendar month ends offered as due dates in the add-goal form. */
export const GOAL_DUE_OPTIONS = ["30 Tikimt 2019", "30 Hidar 2019", "30 Tahsas 2019"];

export const LOCAL_GOALS: LocalGoal[] = [
  { id: "g1", goal: "Hold 2 farmer field days on row planting", feedsKpi: "Farmers applying the advised practice", target: "2 field days", done: 1, of: 2, due: "30 Tikimt", status: "On track" },
  { id: "g2", goal: "Register 25 households in sub-kebele 3", feedsKpi: "Farmers registered and approved", target: "25 households", done: 18, of: 25, due: "15 Hidar", status: "On track" },
  { id: "g3", goal: "Follow up 12 farmers given improved maize seed", feedsKpi: "Advisory visits completed", target: "12 farmers", done: 4, of: 12, due: "10 Hidar", status: "Needs attention" },
  { id: "g4", goal: "Compost training for women farmers", feedsKpi: "Women among farmers trained", target: "1 session", done: 0, of: 1, due: "5 Tikimt", status: "Needs support" },
];

/** Half-year appraisal: dates and the score mix chosen for the cycle (KPI results / supervisor rating / self-rating). */
export const APPRAISAL = {
  selfSent: "12 Tir",
  reviewDue: "22 Tir",
  mixName: "Standard mix",
  mix: { kpi: 70, rating: 20, self: 10 },
  scale: [
    { value: 1, label: "Needs support" },
    { value: 3, label: "Meets expectations" },
    { value: 5, label: "Outstanding" },
  ],
  comments: "Strong half-year. Farmer visits and surveys were consistently on time. For the next half-year, let us plan more training sessions that women farmers can attend, perhaps at the FTC on market days.",
};

export interface AppraisalCriterion {
  id: string;
  label: string;
  hint: string;
  weight: number; // %
  /** Agent's own rating (1–5) from the self-appraisal. */
  self: number;
  /** Supervisor's rating (1–5); the page opens with a first-pass value. */
  rating: number;
}

export const APPRAISAL_CRITERIA: AppraisalCriterion[] = [
  { id: "c1", label: "Quality of advice to farmers", hint: "Is the advice correct, practical and suited to the farmer's land and season?", weight: 25, self: 4, rating: 4 },
  { id: "c2", label: "Working with farmers and communities", hint: "How well the agent builds trust and works with farmers, kebele leaders and groups.", weight: 20, self: 4, rating: 4 },
  { id: "c3", label: "Including women and youth", hint: "Effort to reach women and young farmers in visits, trainings and demonstrations.", weight: 20, self: 4, rating: 3 },
  { id: "c4", label: "Reliability and conduct", hint: "Punctuality, honest reporting and professional conduct.", weight: 20, self: 4, rating: 5 },
  { id: "c5", label: "Teamwork and cooperation", hint: "Cooperation with other agents, the supervisor and the woreda office.", weight: 15, self: 4, rating: 4 },
];

/** Weighted average of 1–5 ratings, using each criterion's weight. */
export const weightedRating = (items: { weight: number; value: number }[]) => {
  const total = items.reduce((sum, i) => sum + i.weight, 0);
  return total === 0 ? 0 : items.reduce((sum, i) => sum + i.value * i.weight, 0) / total;
};

/** Appraisal cycles the Appraisals page can show (newest first). */
export const APPRAISAL_CYCLES = ["Hamle – Tahsas 2019", "Tir – Sene 2018", "Hamle – Tahsas 2018"];

/** Header tiles and windows of the supervisor's Appraisals page (sample until the PMS API is wired). */
export const APPRAISALS_SUMMARY = {
  window: "Self-appraisal 1 – 10 Tir · reviews by 22 Tir",
  selfClosesOn: "10 Tir",
  selfSent: 17,
  selfTotal: 22,
  reviewsDone: 9,
  reviewsTotal: 17,
  teamScore: "76.2",
};

export type SelfAppraisalState = "Sent" | "Not yet";
export type ReviewState = "To do" | "Done" | "Waiting";

export const REVIEW_STATE_TONE: Record<ReviewState, PillTone> = { "To do": "amber", Done: "green", Waiting: "slate" };

export interface AppraisalListRow {
  id: string;
  no: number;
  name: string;
  kebele: string;
  self: SelfAppraisalState;
  sentOn?: string; // "12 Tir"
  review: ReviewState;
  score: number | null;
}

const APPRAISAL_BASE: Omit<AppraisalListRow, "id" | "no">[] = [
  { name: "Tadesse Alemu", kebele: "Dembi Dima", self: "Sent", sentOn: "12 Tir", review: "To do", score: null },
  { name: "Gemechu Dinsa", kebele: "Dembi Gobu", self: "Sent", sentOn: "9 Tir", review: "Done", score: 82.4 },
  { name: "Hirut Abdisa", kebele: "Bari Abo", self: "Sent", sentOn: "10 Tir", review: "Done", score: 80.1 },
  { name: "Chaltu Fikadu", kebele: "Dembi Dima", self: "Sent", sentOn: "11 Tir", review: "To do", score: null },
  { name: "Tigist Mulugeta", kebele: "Tulu Sangota", self: "Sent", sentOn: "8 Tir", review: "Done", score: 77.0 },
  { name: "Meseret Tolosa", kebele: "Seden Kite", self: "Not yet", review: "Waiting", score: null },
  { name: "Bekele Gutema", kebele: "Bachara Oda Gibe", self: "Not yet", review: "Waiting", score: null },
  { name: "Dawit Kebede", kebele: "Tulu Sangota", self: "Sent", sentOn: "10 Tir", review: "Done", score: 73.5 },
];

// Sample roster of 42 rows: the 8 sample agents repeat, starting the second lap at Chaltu as in the design.
export const APPRAISAL_LIST: AppraisalListRow[] = Array.from({ length: 42 }, (_, i) => ({
  ...APPRAISAL_BASE[i < 8 ? i : (i - 8 + 3) % 8],
  id: `ap${i + 1}`,
  no: i + 1,
}));

/** KPI roll-up shown in Monitoring's "By KPI" panel (woreda average; an agent's own values scale from it). */
export const MONITOR_KPIS = [
  { key: "visits", label: "Advisory visits completed", pct: 86 },
  { key: "surveys", label: "Crop surveys completed", pct: 97 },
  { key: "registered", label: "Farmers registered and approved", pct: 61 },
  { key: "trained", label: "Farmers trained", pct: 66 },
  { key: "applying", label: "Farmers applying the advised practice", pct: 57 },
  { key: "women", label: "Women among farmers trained", pct: 35 },
  { key: "figures", label: "Months with figures on time", pct: 60 },
];

/** KPIs offered in the "All KPIs" filter (the figures-on-time KPI is fixed, so it is not a filter choice). */
export const MONITOR_KPI_FILTER = MONITOR_KPIS.filter((k) => ["visits", "registered", "trained", "applying", "women"].includes(k.key));

export interface MonitorSummary {
  agents: number;
  kebeles: number;
  figuresIn: number; // %
  achievement: number; // %
  needSupport: number;
}

export interface MonitorArea {
  name: string;
  summary: MonitorSummary;
  children?: MonitorArea[];
}

const area = (name: string, agents: number, kebeles: number, figuresIn: number, achievement: number, needSupport: number, children?: MonitorArea[]): MonitorArea => ({
  name,
  summary: { agents, kebeles, figuresIn, achievement, needSupport },
  children,
});

/** Federal → region → zone → woreda; a woreda opens its agents. Sample numbers until the roll-up API is wired. */
export const MONITOR_TREE: MonitorArea = area("Federal", 5120, 1710, 61, 72, 148, [
  area("Oromia", 1980, 660, 64, 74, 62, [
    area("West Shewa", 420, 140, 64, 74, 14, [
      area("Bako Tibe", 84, 28, 64, 74, 3),
      area("Ambo", 96, 32, 66, 76, 3),
      area("Ginchi", 72, 24, 60, 71, 4),
      area("Dendi", 88, 29, 65, 75, 2),
    ]),
    area("East Shewa", 510, 170, 63, 73, 18, []),
    area("Arsi", 560, 187, 65, 75, 17, []),
    area("Jimma", 490, 163, 62, 72, 13, []),
  ]),
  area("Amhara", 1450, 483, 60, 71, 44, []),
  area("Sidama", 610, 203, 63, 73, 17, []),
  area("SNNP", 640, 213, 58, 70, 15, []),
  area("Tigray", 440, 147, 59, 70, 10, []),
]);

/** Achievement bar tone: red below 60, amber below 75, green from 75. */
export const achievementTone = (pct: number): "red" | "amber" | "green" => (pct < 60 ? "red" : pct < 75 ? "amber" : "green");

export type TierCode = "T1" | "T2" | "T3" | "T4";

export interface PerformanceTier {
  code: TierCode;
  name: string;
  count: number;
  rule: string;
  tone: "green" | "blue" | "amber" | "red";
}

// Proposed 4-tier scheme — tiers are auto-assigned by the backend KPI engine each period.
export const PERFORMANCE_TIERS: PerformanceTier[] = [
  { code: "T1", name: "Star performer", count: 6, tone: "green", rule: "Quality ≥ 90% · Visits ≥ 100% of target · Training 100% · 0 open grievances" },
  { code: "T2", name: "On track", count: 11, tone: "blue", rule: "Quality 75–89% · Visits ≥ 80% of target · Training ≥ 80%" },
  { code: "T3", name: "Needs support", count: 5, tone: "amber", rule: "Quality 60–74% OR Visits < 80% target OR Training < 80%" },
  { code: "T4", name: "At risk", count: 2, tone: "red", rule: "Quality < 60% OR Training < 60% OR mandatory course overdue OR SLA breach" },
];

/** Editable thresholds behind the 4 tier rules (percentages). */
export interface TierThresholds {
  t1Quality: number;
  t1Visits: number;
  t1Training: number;
  t2Quality: number;
  t2Visits: number;
  t2Training: number;
  t3Quality: number;
  t4Training: number;
}

export const DEFAULT_TIER_THRESHOLDS: TierThresholds = {
  t1Quality: 90,
  t1Visits: 100,
  t1Training: 100,
  t2Quality: 75,
  t2Visits: 80,
  t2Training: 80,
  t3Quality: 60,
  t4Training: 60,
};

/** Rule text per tier, as shown on the tier cards. */
export function tierRules(t: TierThresholds): Record<TierCode, string> {
  return {
    T1: `Quality ≥ ${t.t1Quality}% · Visits ≥ ${t.t1Visits}% of target · Training ${t.t1Training >= 100 ? "100%" : `≥ ${t.t1Training}%`} · 0 open grievances`,
    T2: `Quality ${t.t2Quality}–${t.t1Quality - 1}% · Visits ≥ ${t.t2Visits}% of target · Training ≥ ${t.t2Training}%`,
    T3: `Quality ${t.t3Quality}–${t.t2Quality - 1}% OR Visits < ${t.t2Visits}% target OR Training < ${t.t2Training}%`,
    T4: `Quality < ${t.t3Quality}% OR Training < ${t.t4Training}% OR mandatory course overdue OR SLA breach`,
  };
}

export type AgentPerformanceStatus = "On track" | "Needs support" | "Check in";

export const PERFORMANCE_STATUS_TONE: Record<AgentPerformanceStatus, PillTone> = {
  "On track": "green",
  "Needs support": "red",
  "Check in": "amber",
};

export interface AgentPerformanceRow {
  id: string;
  daId: string;
  name: string;
  kebele: string;
  visits: number;
  quality: number; // %
  training: number; // %
  status: AgentPerformanceStatus;
  /** Tier assigned by the KPI engine for the current period. */
  tier: TierCode;
}

export const AGENT_PERFORMANCE: AgentPerformanceRow[] = [
  { id: "p1", daId: "DA-OR-0412", name: "Almaz W.", kebele: "Kebele 05", visits: 18, quality: 94, training: 100, status: "On track", tier: "T1" },
  { id: "p2", daId: "DA-OR-0418", name: "Bekele N.", kebele: "Kebele 12", visits: 15, quality: 82, training: 92, status: "On track", tier: "T2" },
  { id: "p3", daId: "DA-OR-0431", name: "Chaltu D.", kebele: "Kebele 07", visits: 11, quality: 88, training: 84, status: "Check in", tier: "T2" },
  { id: "p4", daId: "DA-OR-0447", name: "Dawit G.", kebele: "Kebele 09", visits: 9, quality: 71, training: 76, status: "Needs support", tier: "T3" },
  { id: "p5", daId: "DA-OR-0452", name: "Hana T.", kebele: "Chefe", visits: 20, quality: 96, training: 100, status: "On track", tier: "T1" },
  { id: "p6", daId: "DA-OR-0463", name: "Kedir A.", kebele: "Kebele 01", visits: 16, quality: 79, training: 88, status: "On track", tier: "T2" },
  { id: "p7", daId: "DA-OR-0470", name: "Lensa M.", kebele: "Kebele 07", visits: 12, quality: 66, training: 82, status: "Check in", tier: "T3" },
  { id: "p8", daId: "DA-OR-0488", name: "Mulugeta F.", kebele: "Kebele 09", visits: 17, quality: 85, training: 95, status: "On track", tier: "T2" },
  { id: "p9", daId: "DA-OR-0491", name: "Selam K.", kebele: "Chefe", visits: 19, quality: 91, training: 100, status: "On track", tier: "T1" },
  { id: "p10", daId: "DA-OR-0503", name: "Yared B.", kebele: "Kebele 12", visits: 7, quality: 55, training: 52, status: "Needs support", tier: "T4" },
];

export const TOTAL_DA_IDENTIFIERS = 8412;

const optionsFor = (pick: (row: AgentPerformanceRow) => string): FilterOption[] => {
  const counts = new Map<string, number>();
  AGENT_PERFORMANCE.forEach((row) => counts.set(pick(row), (counts.get(pick(row)) ?? 0) + 1));
  return [...counts].map(([value, count]) => ({ value, label: value, count }));
};

export const PERFORMANCE_AGENT_OPTIONS = optionsFor((r) => r.name);
export const PERFORMANCE_KEBELE_OPTIONS = optionsFor((r) => r.kebele);
export const PERFORMANCE_STATUS_OPTIONS = optionsFor((r) => r.status);
export const PERFORMANCE_TIER_OPTIONS: FilterOption[] = PERFORMANCE_TIERS.map((t) => ({
  value: t.code,
  label: `${t.code} · ${t.name}`,
  count: AGENT_PERFORMANCE.filter((r) => r.tier === t.code).length,
}));

export const PERFORMANCE_FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "agent", label: "Agent", allLabel: "All agents", placeholder: "All Agents", options: PERFORMANCE_AGENT_OPTIONS },
  { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All Kebeles", options: PERFORMANCE_KEBELE_OPTIONS },
  { key: "status", label: "Status", allLabel: "All Status", placeholder: "All Status", options: PERFORMANCE_STATUS_OPTIONS },
  { key: "tier", label: "Tier", allLabel: "All tiers", placeholder: "All Tiers", options: PERFORMANCE_TIER_OPTIONS },
];

// KPI entry / import form options
export const REPORTING_PERIODS = ["Q3 2026 (Jul - Sep)", "Q2 2026 (Apr - Jun)", "Q1 2026 (Jan - Mar)", "Q4 2025 (Oct - Dec)"];
export const WOREDA_REGIONS = ["Adama Woreda, Oromia", "Bishoftu Woreda, Oromia", "Dendi Woreda, Oromia"];
export const DEVELOPMENT_AGENTS = ["Almaz Wolde", "Bekele Negash", "Chaltu Dida", "Tadesse Alemu"];
export const ASSIGNED_KEBELES = ["Adama, Kebele 01", "Adama, Kebele 05", "Adama, Kebele 07", "Adama, Kebele 12"];

export const KPI_IMPORT_MAX_BYTES = 5 * 1024 * 1024;
