// Sample leave policy until the leave configuration API exists.

export const POLICIES = ["Federal (base)", "Oromia", "Amhara", "Sidama", "South Ethiopia", "Somali"];
export const FEDERAL = POLICIES[0];

export type CountsAs = "Working" | "Calendar";
export type Who = "All" | "Women" | "Men";

export interface LeaveTypeRow {
  id: string;
  type: string;
  baseDays: number;
  counts: CountsAs;
  who: Who;
  /** Short label for the rules that apply to this type, if any. */
  rule: string;
  document: string;
  status: string;
  /** Notice the agent gives before the leave starts. */
  notice: string;
  legalBasis: string;
}

const row = (id: string, type: string, counts: CountsAs, who: Who, document: string, rule = ""): LeaveTypeRow => ({
  id, type, baseDays: 20, counts, who, rule, document, status: "To confirm", notice: "10 days", legalBasis: "To confirm",
});

export const LEAVE_TYPES: LeaveTypeRow[] = [
  row("lt-1", "Annual leave", "Working", "Women", "Supervisor confirms", "+ years of service"),
  row("lt-2", "Sick leave", "Calendar", "Men", "After 3 days"),
  row("lt-3", "Maternity leave", "Calendar", "All", "Medical certificate"),
  row("lt-4", "Paternity leave", "Working", "Women", "Birth certificate"),
  row("lt-5", "Bereavement leave", "Working", "All", "None"),
  row("lt-6", "Marriage leave", "Calendar", "Men", "Supervisor confirms"),
  row("lt-7", "Personal leave", "Working", "Men", "None"),
  row("lt-8", "Exam leave", "Working", "All", "Exam schedule"),
  row("lt-9", "Time off in lieu", "Calendar", "Women", "Supervisor confirms"),
  row("lt-10", "Unpaid Special leave", "Calendar", "Men", "None"),
];

/** Names offered when adding a leave type, besides the ones already on file. */
export const LEAVE_NAME_CATALOG = ["Study leave", "Adoption leave", "Compassionate leave", "Sabbatical leave", "Jury duty leave", "Religious leave"];

export const CONDITIONS = ["Year of service", "Days of service", "Gender", "Hardship", "Birth type"];
export const WHEN_OPTIONS = ["per year above 1", "less than 180", "more than 180", "equal female", "equal male", "equal birth", "equal yes"];
export const EFFECTS = ["Add days", "Not available", "Available", "Extra approval"];

export interface RuleRow {
  id: string;
  type: string;
  condition: string;
  when: string;
  effect: string;
  days: number;
  /** Maximum allowance after the rule, 0 for none. */
  cap: number;
  scope: string;
}

const rule = (id: string, type: string, condition: string, when: string, effect: string, days: number, cap: number, scope = "Federal"): RuleRow => ({ id, type, condition, when, effect, days, cap, scope });

export const RULES: RuleRow[] = [
  rule("r-1", "Annual leave", "Year of service", "per year above 1", "Add days", 1, 30),
  rule("r-2", "Annual leave", "Days of service", "less than 180", "Not available", 0, 0),
  rule("r-3", "Maternity leave", "Gender", "equal female", "Available", 0, 0),
  rule("r-4", "Paternity leave", "Gender", "equal birth", "Available", 0, 0),
  rule("r-5", "Maternity leave", "Hardship", "equal male", "Add days", 30, 0),
  rule("r-6", "Annual leave", "Birth type", "equal yes", "Add days", 2, 32, "Oromia"),
  rule("r-7", "Sick leave", "Gender", "more than 180", "Extra approval", 0, 0),
];

export const effectLabel = (r: Pick<RuleRow, "effect" | "days">) => (r.effect === "Add days" ? `Add ${r.days} ${r.days === 1 ? "day" : "days"}` : r.effect);

export interface AgentRow {
  id: string;
  name: string;
  kebele: string;
  designation: string;
  /** Months of service. */
  months: number;
}

const agent = (id: string, name: string, kebele: string, designation: string, months: number): AgentRow => ({ id, name, kebele, designation, months });

export const AGENTS: AgentRow[] = [
  agent("a-1", "Tadesse Alemu", "Dembi Dima", "DA - Crops", 60),
  agent("a-2", "Chaltu Fikadu", "Dembi Dima", "DA - Livestock", 24),
  agent("a-3", "Gemechu Dinsa", "Dembi Dima", "DA - Crops", 132),
  agent("a-4", "Meseret Tolosa", "Seden Kite", "DA - General", 8),
  agent("a-5", "Bekele Gutema", "Bacheara Oda Gibe", "DA - Natural Res.", 4),
  agent("a-6", "Hirut Abdisa", "Bari Abo", "DA - Crops", 84),
  agent("a-7", "Kedir Hussen", "Lume", "DA - Livestock", 48),
  agent("a-8", "Almaz Kebede", "Gedo", "DA - Crops", 96),
  agent("a-9", "Dawit Tesfaye", "Dendi", "DA - General", 18),
  agent("a-10", "Selam Worku", "Kebele 05", "DA - Natural Res.", 30),
];

export const ANNUAL_BASE = 20;
export const ANNUAL_CAP = 30;

export const serviceLabel = (months: number) => (months < 12 ? `${months} mths` : `${Math.floor(months / 12)} yrs`);

/** Annual allowance under the base rules: +1 day per year of service above the first, capped, nothing before 6 months. */
export function allowanceOf(a: AgentRow) {
  const years = Math.floor(a.months / 12);
  if (a.months < 6) return { years, bonus: 0, days: 0, rule: "Under 6 months" };
  const bonus = Math.max(0, years - 1);
  const raw = ANNUAL_BASE + bonus;
  const days = Math.min(raw, ANNUAL_CAP);
  return { years, bonus, days, rule: raw >= ANNUAL_CAP ? `Capped at ${ANNUAL_CAP}` : bonus > 0 ? `Years of service +${bonus}` : "-" };
}

export const ASSIGN_COUNT = 84;

export interface OverrideRow {
  id: string;
  setting: string;
  federal: string;
  value: string;
  kind: "select" | "days" | "text";
}

export const LEAVE_YEAR_OPTIONS = ["Ethiopian fiscal year", "Gregorian year"];

export const OVERRIDES: OverrideRow[] = [
  { id: "o-1", setting: "Leave year", federal: "Ethiopian fiscal year", value: "Ethiopian fiscal year", kind: "select" },
  { id: "o-2", setting: "Annual leave · base days", federal: "20", value: "20", kind: "days" },
  { id: "o-3", setting: "Annual leave · hardship woredas", federal: "", value: "+2 days, caps 32", kind: "text" },
  { id: "o-4", setting: "Maternity leave · days", federal: "120", value: "120", kind: "days" },
  { id: "o-5", setting: "Paternity leave · days", federal: "10", value: "10", kind: "days" },
  { id: "o-6", setting: "Regional holiday", federal: "", value: "Irreecha", kind: "text" },
];

export const overrideChange = (o: OverrideRow) => (o.value === o.federal ? "Same" : o.federal === "" ? "Added" : "Changed");

export interface ChainRow {
  id: string;
  type: string;
  length: string;
  steps: string[];
  delegation: "Allowed" | "Rejected";
}

export const CHAINS: ChainRow[] = [
  { id: "c-1", type: "Annual leave", length: "1 - 5 days", steps: ["Supervisor"], delegation: "Allowed" },
  { id: "c-2", type: "Annual leave", length: "6 - 30 days", steps: ["Supervisor", "Woreda office head"], delegation: "Allowed" },
  { id: "c-3", type: "Sick leave", length: "1 - 3 days", steps: ["Supervisor"], delegation: "Rejected" },
  { id: "c-4", type: "Sick leave", length: "4 days or more", steps: ["Supervisor", "Woreda office head"], delegation: "Allowed" },
  { id: "c-5", type: "Maternity leave", length: "Any length", steps: ["Supervisor", "Woreda office head"], delegation: "Allowed" },
  { id: "c-6", type: "Paternity leave", length: "Any length", steps: ["Supervisor"], delegation: "Allowed" },
  { id: "c-7", type: "Personal, bereavement, marriage", length: "Any length", steps: ["Supervisor"], delegation: "Allowed" },
  { id: "c-8", type: "Unpaid special leave", length: "Any length", steps: ["Supervisor", "Woreda office head", "Zone HR"], delegation: "Allowed" },
];
