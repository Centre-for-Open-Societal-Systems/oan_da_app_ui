// Supervisor's Training view: one compliance row per agent in the woreda, derived from the sample agent
// performance list until the Agrilearn compliance API is wired.
import type { FilterFieldConfig } from "@/components/ui/AdvancedFiltersDrawer";
import type { FilterOption } from "@/components/ui/FilterDropdown";
import type { PillTone } from "@/components/ui/Pill";
import { AGENT_PERFORMANCE, WOREDA_SUMMARY } from "./supervisorData";

export type IncentiveStatus = "Eligible" | "At risk" | "Not eligible";

export const INCENTIVE_STATUS_TONE: Record<IncentiveStatus, PillTone> = {
  Eligible: "green",
  "At risk": "amber",
  "Not eligible": "red",
};

/** Mandatory Agrilearn courses every agent has to complete. */
export const MANDATORY_COURSE_COUNT = 5;

export interface TeamComplianceRow {
  id: string;
  daId: string;
  name: string;
  kebele: string;
  woreda: string;
  mandatoryDone: number;
  /** Percentage of mandatory courses completed. */
  compliance: number;
  certificates: number;
  lastSync: string;
  incentive: IncentiveStatus;
}

const incentiveFor = (compliance: number): IncentiveStatus =>
  compliance >= 80 ? "Eligible" : compliance >= 60 ? "At risk" : "Not eligible";

export const TEAM_COMPLIANCE: TeamComplianceRow[] = [...AGENT_PERFORMANCE]
  .sort((a, b) => a.name.localeCompare(b.name))
  .map((agent, i) => {
    const mandatoryDone = Math.round((agent.training / 100) * MANDATORY_COURSE_COUNT);
    const compliance = Math.round((mandatoryDone / MANDATORY_COURSE_COUNT) * 100);
    return {
      id: agent.id,
      daId: agent.daId,
      name: agent.name,
      kebele: agent.kebele,
      woreda: WOREDA_SUMMARY.woreda,
      mandatoryDone,
      compliance,
      certificates: mandatoryDone,
      lastSync: `0${5 - (i % 3)} Oct 2026, 06:00`,
      incentive: incentiveFor(compliance),
    };
  });

const optionsFor = (pick: (row: TeamComplianceRow) => string): FilterOption[] => {
  const counts = new Map<string, number>();
  TEAM_COMPLIANCE.forEach((row) => counts.set(pick(row), (counts.get(pick(row)) ?? 0) + 1));
  return [...counts].map(([value, count]) => ({ value, label: value, count }));
};

export const COMPLIANCE_AGENT_OPTIONS = optionsFor((r) => r.name);
export const COMPLIANCE_INCENTIVE_OPTIONS = optionsFor((r) => r.incentive);

export const COMPLIANCE_FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "agent", label: "Agent", allLabel: "All agents", placeholder: "All Agents", options: COMPLIANCE_AGENT_OPTIONS },
  // Kebele and Woreda are filled in by the component from the geo Master Data (useAreaFilterOptions).
  { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All Kebeles", options: [] },
  { key: "woreda", label: "Woreda", allLabel: "All woredas", placeholder: "All Woredas", options: [] },
  { key: "incentive", label: "Incentive", allLabel: "All statuses", placeholder: "All Statuses", options: COMPLIANCE_INCENTIVE_OPTIONS },
];

// --- One agent's training & compliance detail ---

export type MandatoryCourseStatus = "Complete" | "In Progress" | "Not Started";

export const MANDATORY_COURSE_STATUS_TONE: Record<MandatoryCourseStatus, PillTone> = {
  Complete: "green",
  "In Progress": "amber",
  "Not Started": "slate",
};

const MANDATORY_COURSES = [
  { title: "Agent ethics & safeguarding", code: "AGR-ETH-101", dueDate: "10 Oct 2026" },
  { title: "Farmer registration & data quality", code: "AGR-REG-102", dueDate: "10 Oct 2026" },
  { title: "Climate-smart crop advisory", code: "AGR-CSA-103", dueDate: "15 Oct 2026" },
  { title: "Field visits & reporting standards", code: "AGR-VIS-104", dueDate: "15 Oct 2026" },
  { title: "Integrated pest management", code: "AGR-IPM-105", dueDate: "20 Oct 2026" },
] as const;

const UNITS_PER_COURSE = 5;

export interface AgentMandatoryCourse {
  title: string;
  code: string;
  status: MandatoryCourseStatus;
  dueDate: string;
  unitsDone: number;
  unitsTotal: number;
  completedOn?: string;
}

export interface AgentCertificateRecord {
  title: string;
  code: string;
  issuer: string;
  issuedOn: string;
  credentialId: string;
  source: string;
}

export interface AgentTrainingDetail {
  agent: TeamComplianceRow;
  courses: AgentMandatoryCourse[];
  certificates: AgentCertificateRecord[];
  /** Mandatory courses not yet complete. */
  outstanding: number;
  /** Next due date among the outstanding courses. */
  nextDue?: string;
}

export const getTeamAgent = (daId: string) => TEAM_COMPLIANCE.find((r) => r.daId === daId);

/** Courses completed in order, the next one in progress at 60%, the rest not started. */
export function getAgentTraining(daId: string): AgentTrainingDetail | undefined {
  const agent = getTeamAgent(daId);
  if (!agent) return undefined;

  const courses: AgentMandatoryCourse[] = MANDATORY_COURSES.map((course, i) => {
    if (i < agent.mandatoryDone) {
      return { ...course, status: "Complete", unitsDone: UNITS_PER_COURSE, unitsTotal: UNITS_PER_COURSE, completedOn: `0${i + 1} Oct 2026` };
    }
    const inProgress = i === agent.mandatoryDone;
    return { ...course, status: inProgress ? "In Progress" : "Not Started", unitsDone: inProgress ? 3 : 0, unitsTotal: UNITS_PER_COURSE };
  });

  const certificates: AgentCertificateRecord[] = courses
    .filter((c) => c.status === "Complete")
    .map((c, i) => ({
      title: c.title,
      code: c.code,
      issuer: "Agrilearn",
      issuedOn: c.completedOn ?? "",
      credentialId: `DEMO-AGR-26-${agent.daId.slice(-4)}-0${i + 1}`,
      source: "Agrilearn-auto",
    }));

  const open = courses.filter((c) => c.status !== "Complete");
  return { agent, courses, certificates, outstanding: open.length, nextDue: open[0]?.dueDate };
}
