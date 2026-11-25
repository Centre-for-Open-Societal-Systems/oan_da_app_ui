import type { FilterFieldConfig } from "@/components/ui/AdvancedFiltersDrawer";
import type { FilterOption } from "@/components/ui/FilterDropdown";
import type {
  Grievance,
  GrievanceBucket,
  GrievanceCase,
  GrievanceCategory,
  GrievanceStatus,
  ThreadMessage,
} from "./types";

// Sample records until the Grievance Service API is wired through src/proxy.ts.
type GrievanceRecord = Omit<Grievance, "ticketId"> & { category: GrievanceCategory };

const RECORDS: GrievanceRecord[] = [
  { title: "Fertiliser allocation delivered 6 weeks late, crop season missed", submitter: "Jijiga Woreda Agriculture Office", region: "Somali", woreda: "Jijiga", type: "Fertilizer non-delivery or shortage", category: "Inputs", status: "Assigned", priority: "High", submittedAt: "May 28, 2026, 10:42 AM", attachments: 2, responses: 1, raisedBy: "OnBehalf" },
  { title: "PSNP safety net scheme payment not disbursed for Q1 2026", submitter: "Almaz Worku", region: "Oromia", woreda: "Sebeta", type: "Government scheme benefit not received", category: "Schemes", status: "Submitted", priority: "High", submittedAt: "May 27, 2026, 4:15 PM", attachments: 1, responses: 0, raisedBy: "Farmer" },
  { title: "Teff produce payment overdue by 45 days", submitter: "Debrezion Farmers Cooperative", region: "Amhara", woreda: "Bahir Dar Zuria", type: "Payment delay (>SLA)", category: "Payments", status: "Pending Submit", priority: "Critical", submittedAt: "May 26, 2026, 9:03 AM", attachments: 3, responses: 0, raisedBy: "Farmer" },
  { title: "Certified maize seed supplied with poor germination rate", submitter: "Abebe Bekele", region: "Oromia", woreda: "Bishoftu", type: "Seed quality / germination failure", category: "Inputs", status: "In Progress", priority: "High", submittedAt: "May 25, 2026, 2:20 PM", attachments: 3, responses: 1, raisedBy: "OnBehalf" },
  { title: "Livestock market levy charged twice at Ambo cattle market", submitter: "Gemechu Tafa", region: "Oromia", woreda: "Ambo", type: "Market malpractice", category: "Markets", status: "More Info Needed", priority: "Medium", submittedAt: "May 24, 2026, 1:30 PM", attachments: 1, responses: 1, raisedBy: "Farmer" },
  { title: "Weighing scale irregularity at Nekemte grain market", submitter: "Nekemte Traders Association", region: "Oromia", woreda: "Nekemte", type: "Market malpractice", category: "Markets", status: "Under Review", priority: "Medium", submittedAt: "May 23, 2026, 11:05 AM", attachments: 2, responses: 1, raisedBy: "Farmer" },
  { title: "Extension agent visit not conducted for two consecutive months", submitter: "Hana Alemu", region: "SNNPR", woreda: "Dale", type: "Extension service gap", category: "Extension", status: "Resolved", priority: "Low", submittedAt: "May 22, 2026, 3:48 PM", attachments: 1, responses: 1, raisedBy: "OnBehalf" },
  { title: "Boundary dispute over irrigated plot near Koka reservoir", submitter: "Koka Kebele Farmers Group", region: "Oromia", woreda: "Lume", type: "Land / plot dispute", category: "Land", status: "Rejected", priority: "Medium", submittedAt: "May 21, 2026, 11:20 AM", attachments: 4, responses: 1, raisedBy: "Farmer" },
  { title: "Pesticide batch expired before distribution", submitter: "Adama Input Dealer", region: "Oromia", woreda: "Adama", type: "Input quality complaint", category: "Inputs", status: "Resolved", priority: "High", submittedAt: "May 20, 2026, 8:55 AM", attachments: 2, responses: 1, raisedBy: "Farmer" },
  { title: "Cooperative dividend payment miscalculated", submitter: "Fogera Rice Cooperative", region: "Amhara", woreda: "Fogera", type: "Payment discrepancy", category: "Payments", status: "In Progress", priority: "Medium", submittedAt: "May 19, 2026, 10:10 AM", attachments: 1, responses: 1, raisedBy: "OnBehalf" },
  { title: "Improved wheat seed not delivered to Lemu Bilbilo kebeles", submitter: "Tesfaye Gudina", region: "Oromia", woreda: "Lemu Bilbilo", type: "Seed non-delivery", category: "Inputs", status: "Submitted", priority: "Critical", submittedAt: "May 18, 2026, 4:35 PM", attachments: 2, responses: 0, raisedBy: "OnBehalf" },
  { title: "Coffee seedlings from woreda nursery arrived diseased", submitter: "Mulugeta Dukale", region: "Sidama", woreda: "Aleta Wondo", type: "Input quality complaint", category: "Inputs", status: "Under Review", priority: "High", submittedAt: "May 16, 2026, 9:40 AM", attachments: 3, responses: 1, raisedBy: "Farmer" },
  { title: "Irrigation water rotation skipped our kebele for three weeks", submitter: "Ziway Irrigation Users Association", region: "Oromia", woreda: "Adami Tulu", type: "Irrigation access", category: "Land", status: "Assigned", priority: "High", submittedAt: "May 15, 2026, 12:15 PM", attachments: 1, responses: 1, raisedBy: "Farmer" },
  { title: "Sesame sale proceeds withheld by union for 60 days", submitter: "Humera Sesame Producers Union", region: "Tigray", woreda: "Kafta Humera", type: "Payment delay (>SLA)", category: "Payments", status: "Pending Submit", priority: "Critical", submittedAt: "May 14, 2026, 3:05 PM", attachments: 2, responses: 0, raisedBy: "OnBehalf" },
  { title: "Livestock vaccination campaign missed remote kebeles", submitter: "Fatuma Abdi", region: "Somali", woreda: "Kebri Dahar", type: "Extension service gap", category: "Extension", status: "In Progress", priority: "Medium", submittedAt: "May 12, 2026, 10:25 AM", attachments: 1, responses: 1, raisedBy: "OnBehalf" },
  { title: "Crop insurance claim for hail damage not processed", submitter: "Yohannes Asfaw", region: "Amhara", woreda: "Debre Tabor", type: "Government scheme benefit not received", category: "Schemes", status: "Resolved", priority: "Medium", submittedAt: "May 10, 2026, 2:50 PM", attachments: 4, responses: 1, raisedBy: "Farmer" },
  { title: "Enset processing equipment grant promised but not received", submitter: "Tsehay Wolde", region: "SNNPR", woreda: "Wolkite", type: "Government scheme benefit not received", category: "Schemes", status: "More Info Needed", priority: "Low", submittedAt: "May 8, 2026, 11:45 AM", attachments: 1, responses: 1, raisedBy: "Farmer" },
  { title: "Broker underpaid potato harvest at Shashemene market", submitter: "Kedir Hussein", region: "Oromia", woreda: "Shashemene", type: "Market malpractice", category: "Markets", status: "Rejected", priority: "Low", submittedAt: "May 6, 2026, 9:15 AM", attachments: 1, responses: 1, raisedBy: "OnBehalf" },
  { title: "Land certificate issued with wrong plot area", submitter: "Birtukan Mekonnen", region: "Amhara", woreda: "Gondar Zuria", type: "Land / plot dispute", category: "Land", status: "Resolved", priority: "Medium", submittedAt: "May 4, 2026, 4:05 PM", attachments: 2, responses: 1, raisedBy: "Farmer" },
  { title: "Soil testing results not shared after sample collection", submitter: "Desta Gebremedhin", region: "Tigray", woreda: "Raya Azebo", type: "Extension service gap", category: "Extension", status: "Under Review", priority: "Low", submittedAt: "May 2, 2026, 1:10 PM", attachments: 1, responses: 1, raisedBy: "OnBehalf" },
  { title: "Field allowance for August not paid to DA", submitter: "Tadesse Alemu", region: "Oromia", woreda: "Bako Tibe", type: "Payment delay (>SLA)", category: "Payments", status: "In Progress", priority: "High", submittedAt: "May 29, 2026, 9:30 AM", attachments: 1, responses: 1, raisedBy: "DA" },
  { title: "Demonstration plot inputs not supplied to FTC", submitter: "Tadesse Alemu", region: "Oromia", woreda: "Bako Tibe", type: "Fertilizer non-delivery or shortage", category: "Inputs", status: "Submitted", priority: "Medium", submittedAt: "May 17, 2026, 11:15 AM", attachments: 2, responses: 0, raisedBy: "DA" },
  { title: "Mandatory refresher training venue changed without notice", submitter: "Tadesse Alemu", region: "Oromia", woreda: "Bako Tibe", type: "Extension service gap", category: "Extension", status: "Resolved", priority: "Low", submittedAt: "May 5, 2026, 2:40 PM", attachments: 0, responses: 1, raisedBy: "DA" },
];

const REGION_CODES: Record<string, string> = { Somali: "SOMA", Oromia: "OROM", Amhara: "AMHA", SNNPR: "SNNP", Sidama: "SIDA", Tigray: "TIGR" };
const CATEGORY_CODES: Record<GrievanceCategory, string> = {
  Inputs: "INP", Schemes: "SCH", Payments: "PAY", Markets: "MKT", Extension: "EXT", Land: "LND",
};

export const GRIEVANCES: Grievance[] = RECORDS.map((r, i) => {
  const woredaCode = r.woreda.replace(/[^A-Za-z]/g, "").slice(0, 4).toUpperCase();
  return {
    ...r,
    ticketId: `${REGION_CODES[r.region]}-${woredaCode}-${CATEGORY_CODES[r.category]}-${String(9900 + i).padStart(5, "0")}`,
  };
});

export const TOTAL_GRIEVANCES = GRIEVANCES.length;

/** Stat-card order; the table's Status column and filter use the same statuses so the two always agree. */
export const GRIEVANCE_BUCKETS: GrievanceBucket[] = ["Assigned", "In Progress", "More Info Needed", "Rejected", "Resolved", "Closed"];

/** Stat-card counts for a set of records (pass the table's filtered rows so the cards match the table). Other statuses count only under All. */
export function grievanceStatsFor(list: Grievance[]): Record<"All" | GrievanceBucket, number> {
  const counts = { All: 0, Assigned: 0, "In Progress": 0, "More Info Needed": 0, Rejected: 0, Resolved: 0, Closed: 0 };
  for (const g of list) {
    counts.All += 1;
    if (g.status in counts) counts[g.status as GrievanceBucket] += 1;
  }
  return counts;
}

export const GRIEVANCE_STATS = grievanceStatsFor(GRIEVANCES);

function toOptions<T extends string>(values: T[]): FilterOption[] {
  const counts = new Map<T, number>();
  for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  return [...counts.entries()].map(([value, count]) => ({ value, label: value, count }));
}

export const GRIEVANCE_CATEGORY_OPTIONS = toOptions(GRIEVANCES.map((g) => g.category));
export const GRIEVANCE_STATUS_OPTIONS: FilterOption[] = GRIEVANCE_BUCKETS.map((b) => ({ value: b, label: b, count: GRIEVANCE_STATS[b] }));

export const GRIEVANCE_REGION_OPTIONS = toOptions(GRIEVANCES.map((g) => g.region));

export const GRIEVANCE_FILTER_FIELDS: FilterFieldConfig[] = [
  { key: "category", label: "Category", allLabel: "All categories", placeholder: "All Categories", options: GRIEVANCE_CATEGORY_OPTIONS },
  { key: "status", label: "Status", allLabel: "All statuses", placeholder: "All Statuses", options: GRIEVANCE_STATUS_OPTIONS },
  { key: "region", label: "Region", allLabel: "All regions", placeholder: "All Regions", options: GRIEVANCE_REGION_OPTIONS },
];

// ---------------------------------------------------------------------------
// Case detail (thread, submitter, SLA) — same sample thread for every record
// until the Grievance Service exposes per-ticket detail.
// ---------------------------------------------------------------------------

export const RESPONSE_TYPES = ["Partially Resolved", "Resolved", "Rejected", "Needs More Info", "Escalated"];
export const CASE_STATUSES: GrievanceStatus[] = ["Submitted", "Assigned", "In Progress", "More Info Needed", "Pending Submitter", "Resolved", "Closed"];
export const OFFICERS = ["Tigist Alemu", "Dawit Haile", "Selam Bekele", "Biruk Tesfaye", "Lemma Kassa", "Hana Girma"];
export const DEPARTMENTS = [
  "Ministry of Agriculture (MoA)",
  "Agricultural Transformation Institute (ATI)",
  "Ethiopian Agricultural Business Corporation (EABC)",
  "Cooperative Promotion Agency",
  "Agricultural Finance Institute (AFI)",
  "Inputs Supply & Distribution Agency",
  "Market Development & Trade Bureau",
  "Regional Bureau of Agriculture",
  "Woreda Agriculture & Natural Resource Office",
  "Irrigation & Lowlands Development Authority",
];

/** Senior Nodal Officers (L2) who can approve an SLA deferral. */
export interface NodalOfficer {
  name: string;
  organisation: string;
  email: string;
}

export const NODAL_OFFICERS: NodalOfficer[] = [
  { name: "Fikadu Negash", organisation: "Ministry of Agriculture (MoA)", email: "fikadu.negash@gmail.com" },
  { name: "Meseret Tadesse", organisation: "Agricultural Transformation Institute (ATI)", email: "meseret.tadesse@gmail.com" },
  { name: "Yonas Bekele", organisation: "Regional Bureau of Agriculture", email: "yonas.bekele@gmail.com" },
  { name: "Almaz Girma", organisation: "Woreda Agriculture & Natural Resource Office", email: "almaz.girma@gmail.com" },
];

export const MAX_DEFERRAL_DAYS = 30;
export const MIN_DEFERRAL_REASON = 20;

export function buildCase(grievance: Grievance): GrievanceCase {
  const thread: ThreadMessage[] = [
    {
      kind: "submission",
      id: "m1",
      author: grievance.submitter,
      role: "Individual Farmer",
      at: "10 Apr 2026, 14:53",
      body: "I purchased 50 kg of certified maize seed from the cooperative input store in Bishoftu in March 2026. After planting, germination rate was less than 40%, causing significant crop failure on my 2-hectare plot. I raised this with the store manager but received no response.",
      attachments: ["document_1.pdf", "document_2.pdf", "document_3.pdf"],
    },
    {
      kind: "dept-response",
      id: "m2",
      author: "Tigist Alemu",
      role: "Inputs Officer",
      at: "28 Apr 2026, 19:40",
      responseNo: 1,
      outcome: "Partially Resolved",
      actionTaken: "Seed batch samples sent to National Quality Control Laboratory for testing.",
      resolutionSummary: "Investigation is ongoing. Lab results expected by 5 May 2026. Farmer's plot has been documented.",
      proposedClosure: "2026-05-10",
    },
    { kind: "status-change", id: "m3", from: "Assigned", to: "In Progress", by: "Tigist Alemu", at: "28 Apr 2026" },
    {
      kind: "internal-note",
      id: "m4",
      author: "Tigist Alemu",
      role: "Inputs Officer",
      at: "28 Apr 2026, 19:40",
      body: "Batch number recorded. Coordinating with quality lab — results in 7 days.",
    },
  ];

  return {
    grievance,
    thread,
    submitter: {
      name: grievance.submitter,
      kind: "Individual Farmer",
      faydaId: "FYD-9821-0034",
      avatar: "/images/tadesse_profile.png",
      kebele: "Kebele 01",
      channel: "Field Officer Assisted",
      submittedOn: "20 Apr 2026",
    },
    sla: { consumedPct: 100, submittedOn: "10 Jul 2026", dueOn: "14 Jul 2026" },
  };
}

/** Table filter options with counts from a set of records (the live list from GET /grievances). */
export function grievanceFilterOptions(list: Grievance[]) {
  const stats = grievanceStatsFor(list);
  const category = toOptions(list.map((g) => g.category));
  const status: FilterOption[] = GRIEVANCE_BUCKETS.map((b) => ({ value: b, label: b, count: stats[b] }));
  const region = toOptions(list.map((g) => g.region).filter(Boolean));
  const fields: FilterFieldConfig[] = [
    { key: "category", label: "Category", allLabel: "All categories", placeholder: "All Categories", options: category },
    { key: "status", label: "Status", allLabel: "All statuses", placeholder: "All Statuses", options: status },
    ...(region.length > 0 ? [{ key: "region", label: "Region", allLabel: "All regions", placeholder: "All Regions", options: region }] : []),
  ];
  return { category, status, region, fields };
}
