import type { FilterFieldConfig } from "@/components/ui/AdvancedFiltersDrawer";
import type { FilterOption } from "@/components/ui/FilterDropdown";
import type {
  EvidenceDocument,
  PriorityFarmer,
  SubmittedOutcome,
  VisitRecord,
  VisitTimelineEntry,
} from "./types";

export const TOTAL_VISITS = 8412;

export const VISIT_STATS = {
  plannedThisWeek: 24,
  completed: 12,
  missed: 3,
  onTimeRate: "82%",
};

const FARMERS = {
  lelise: { id: "lelise-gudeta", name: "Lelise Gudeta", email: "lelise.gudeta@gmail.com", kebele: "Bako Tibe", plotRef: "BT-0472" },
  meseret: { id: "meseret-tolera", name: "Meseret Tolera", email: "meseret.tolera@gmail.com", kebele: "Bako Tibe", plotRef: "BT-0518" },
  abebe: { id: "abebe-kebede", name: "Abebe Kebede", email: "abebe.kebede@gmail.com", kebele: "Gedo", plotRef: "GD-0318" },
  hirut: { id: "hirut-fikadu", name: "Hirut Fikadu", email: "hirut.fikadu@gmail.com", kebele: "Gedo", plotRef: "GD-0342" },
  chaltu: { id: "chaltu-dinkesa", name: "Chaltu Dinkesa", email: "chaltu.dinkesa@gmail.com", kebele: "Lume", plotRef: "LM-1127" },
  tigist: { id: "tigist-worku", name: "Tigist Worku", email: "tigist.worku@gmail.com", kebele: "Lume", plotRef: "LM-1164" },
  tadesse: { id: "tadesse-alemu", name: "Tadesse Alemu", email: "tadesse.alemu@gmail.com", kebele: "Dendi", plotRef: "DN-0207", avatar: "/images/tadesse_profile.png" },
  dawit: { id: "dawit-negash", name: "Dawit Negash", email: "dawit.negash@gmail.com", kebele: "Dendi", plotRef: "DN-0233" },
  gemechu: { id: "gemechu-bekele", name: "Gemechu Bekele", email: "gemechu.bekele@gmail.com", kebele: "Adea", plotRef: "AD-0611" },
  kedir: { id: "kedir-mohammed", name: "Kedir Mohammed", email: "kedir.mohammed@gmail.com", kebele: "Adea", plotRef: "AD-0645" },
};

// Typical on-site time per visit purpose.
const DURATION_MIN: Record<string, number> = {
  "Crop inspection": 45,
  "Input advisory": 30,
  "Pest follow-up": 40,
  Registration: 60,
  "Harvest survey": 50,
  "Soil sampling": 55,
  "Follow-up": 25,
  "Livestock survey": 40,
};

const visit = (
  id: string,
  date: string,
  time: string,
  agent: string,
  farmer: (typeof FARMERS)[keyof typeof FARMERS],
  purpose: string,
  status: VisitRecord["status"],
  assignedBy?: string,
): VisitRecord => ({
  id,
  date,
  time,
  agent,
  farmerId: farmer.id,
  farmerName: farmer.name,
  farmerEmail: farmer.email,
  farmerAvatar: "avatar" in farmer ? farmer.avatar : undefined,
  kebele: farmer.kebele,
  purpose,
  status,
  plotRef: farmer.plotRef,
  durationMin: DURATION_MIN[purpose] ?? 45,
  assignedBy,
});

export const VISITS: VisitRecord[] = [
  visit("v-1001", "Sep 08, 2026", "14:20", "Almaz W.", FARMERS.lelise, "Crop inspection", "Confirmed"),
  visit("v-1002", "Sep 08, 2026", "11:30", "Almaz W.", FARMERS.chaltu, "Input advisory", "Planned"),
  visit("v-1003", "Sep 08, 2026", "09:20", "Bekele N.", FARMERS.abebe, "Pest follow-up", "Confirmed"),
  visit("v-1004", "Sep 09, 2026", "10:15", "Genet D.", FARMERS.dawit, "Registration", "Planned"),
  visit("v-1005", "Sep 10, 2026", "15:00", "Almaz W.", FARMERS.tigist, "Pest follow-up", "Planned"),
  visit("v-1006", "Sep 12, 2026", "08:40", "Dawit M.", FARMERS.meseret, "Harvest survey", "Completed"),
  visit("v-1007", "Sep 12, 2026", "13:10", "Almaz W.", FARMERS.gemechu, "Crop inspection", "Missed"),
  visit("v-1008", "Sep 14, 2026", "11:00", "Bekele N.", FARMERS.hirut, "Input advisory", "Completed"),
  visit("v-1009", "Sep 15, 2026", "10:00", "Genet D.", FARMERS.kedir, "Soil sampling", "Planned"),
  visit("v-1010", "Sep 16, 2026", "08:45", "Dawit M.", FARMERS.tadesse, "Follow-up", "Confirmed"),
  // Assigned by the Woreda supervisor to the demo DA (Tadesse Alemu) — the only visits the DA sees.
  visit("v-1011", "Sep 07, 2026", "08:30", "Tadesse A.", FARMERS.lelise, "Soil sampling", "Completed", "Almaz Tesfaye"),
  visit("v-1012", "Sep 09, 2026", "14:30", "Tadesse A.", FARMERS.meseret, "Pest follow-up", "Missed", "Almaz Tesfaye"),
  visit("v-1013", "Sep 15, 2026", "09:00", "Tadesse A.", FARMERS.hirut, "Crop inspection", "Confirmed", "Almaz Tesfaye"),
  visit("v-1014", "Sep 17, 2026", "14:00", "Tadesse A.", FARMERS.tigist, "Harvest survey", "Planned", "Almaz Tesfaye"),
  visit("v-1015", "Sep 18, 2026", "10:30", "Tadesse A.", FARMERS.chaltu, "Livestock survey", "Confirmed", "Almaz Tesfaye"),
];

/** Short agent label used in the visits table, e.g. "Tadesse Alemu" -> "Tadesse A.". */
const shortName = (name: string) => {
  const [first, last] = name.split(" ");
  return last ? `${first} ${last[0]}.` : first;
};

/** Visits a supervisor assigned to the given DA — the DA's view of the Visits page. */
export function supervisorVisitsFor(daName: string): VisitRecord[] {
  const agent = shortName(daName);
  return VISITS.filter((v) => v.assignedBy && v.agent === agent);
}

/** Stat-card figures for a set of visits (the DA's stats are computed from their assigned visits). */
export function visitStatsFor(visits: VisitRecord[]) {
  const count = (status: VisitRecord["status"]) => visits.filter((v) => v.status === status).length;
  const completed = count("Completed");
  const missed = count("Missed");
  return {
    plannedThisWeek: count("Planned") + count("Confirmed"),
    completed,
    missed,
    onTimeRate: completed + missed === 0 ? "—" : `${Math.round((completed / (completed + missed)) * 100)}%`,
  };
}

export function getVisit(id: string): VisitRecord | undefined {
  return VISITS.find((v) => v.id === id);
}

export const VISIT_AGENT_OPTIONS: FilterOption[] = [
  { value: "Almaz W.", label: "Almaz Wolde", count: 1420 },
  { value: "Bekele N.", label: "Bekele Negash", count: 1188 },
  { value: "Genet D.", label: "Genet Desta", count: 964 },
  { value: "Dawit M.", label: "Dawit Mekonnen", count: 840 },
  { value: "Tadesse A.", label: "Tadesse Alemu", count: 4 },
];

export const VISIT_KEBELE_OPTIONS: FilterOption[] = [
  { value: "Bako Tibe", label: "Bako Tibe", count: 2210 },
  { value: "Lume", label: "Lume", count: 1560 },
  { value: "Dendi", label: "Dendi", count: 1204 },
  { value: "Adea", label: "Adea", count: 980 },
  { value: "Gedo", label: "Gedo", count: 812 },
];

export const VISIT_STATUS_OPTIONS: FilterOption[] = [
  { value: "Confirmed", label: "Confirmed", count: 2318 },
  { value: "Planned", label: "Planned", count: 3104 },
  { value: "Completed", label: "Completed", count: 2640 },
  { value: "Missed", label: "Missed", count: 350 },
];

// Fields shown in the Advanced Filters drawer on the Visits page.
export const VISIT_FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "agent", label: "Agent", allLabel: "All agents", placeholder: "All Agent", options: VISIT_AGENT_OPTIONS },
  { key: "kebele", label: "kebele", allLabel: "All kebeles", placeholder: "All Kebele", options: VISIT_KEBELE_OPTIONS },
  { key: "status", label: "Status", allLabel: "All Status", placeholder: "All", options: VISIT_STATUS_OPTIONS },
];

// Status history shown in the visit details modal (mock; same for every visit).
export const VISIT_TIMELINE: VisitTimelineEntry[] = [
  { label: "Requested", by: "by Almaz Wolde", when: "Yesterday, 16:20", done: true },
  { label: "Confirmed", by: "Lelise Gudeta", when: "Yesterday, 18:05", done: true },
  { label: "Scheduled visit", when: "Today · 09:00", done: false },
];

export const RESCHEDULE_REASONS = [
  "Farmer unavailable",
  "Weather / road access",
  "Agent schedule conflict",
  "Inputs not yet delivered",
  "Other",
];

// ----- Visit planner -----

export const PRIORITY_LIST: PriorityFarmer[] = [
  { farmerId: "chaltu-dinkesa", name: "Chaltu Dinkesa", issue: "Armyworm infestation", level: "high", visitType: "Crop Survey" },
  { farmerId: "abebe-kebede", name: "Abebe Kebede", issue: "Soil salinity test", level: "medium", visitType: "Crop Survey" },
  { farmerId: "tadesse-alemu", name: "Tadesse Alemu", issue: "Irrigation audit", level: "low", visitType: "Services" },
  { farmerId: "lelise-gudeta", name: "Lelise Gudeta", issue: "Fertilizer delivery delay", level: "medium", visitType: "Follow-up" },
];

// ----- Visit outcome -----

export const OUTCOME_DRAFT = {
  farmerName: "Lelise Gudeta",
  kebele: "Bako Tibe kebele",
  dateTime: "24 Jun 08:30",
  purpose: "Advisory — teff rust management",
  farmerResponse: "Understood — will apply",
  observed: "Rust pustules on ~15% of the teff plot; farmer had not yet sprayed. Soil moisture adequate.",
  advice: "Recommended propiconazole at label rate within 3 days; demonstrated mixing; advised resistant variety next season.",
  inputs: "Fungicide advisory issued · demo done",
  nextAction: "Follow-up visit · 12 Aug 2026",
};

export const EVIDENCE_DOCUMENTS: EvidenceDocument[] = [
  { title: "Diploma in Plant Science", badge: "VERIFIED", meta: "Jimma University · issued 12 Jul 2018", file: "PDF · 1.2 MB" },
  { title: "Climate-Smart Agriculture", badge: "AGRILEARN · AUTO", meta: "Agrilearn · completed 03 Jun 2026" },
  { title: "Integrated Pest Management", badge: "PENDING VERIFICATION", meta: "Ethiopian Agricultural Transformation Institute · issued 18 Feb 2026 · expires 18 Feb 2028", file: "PDF · 842 KB" },
];

export const ACTIVITY_REPORT = {
  weekLabel: "week of 24–30 Jun 2026",
  visitsCompleted: "14 / 16",
  farmersReached: "128",
  advisoriesIssued: "2",
  issuesRaised: "2",
  followUps: "6",
};

export const SUBMITTED_OUTCOMES: SubmittedOutcome[] = [
  { farmerName: "Lelise Gudeta", kebele: "Bako Tibe kebele", purpose: "Advisory — teff rust", summary: "Fungicide advice issued; follow-up 12 Aug", date: "Jun 24, 2026" },
  { farmerName: "Abebe Kebede", kebele: "Gedo kebele", purpose: "Input check", summary: "Voucher issue logged as grievance", date: "Jun 25, 2026" },
  { farmerName: "Chaltu Dinkesa", kebele: "Lume kebele", purpose: "Registration", summary: "2 farmers registered; synced", date: "Jun 26, 2026" },
  { farmerName: "Tadesse Alemu", kebele: "Dendi kebele", purpose: "Advisory — storage", summary: "Advised hermetic bags; farmer to procure", date: "Jun 27, 2026" },
];
