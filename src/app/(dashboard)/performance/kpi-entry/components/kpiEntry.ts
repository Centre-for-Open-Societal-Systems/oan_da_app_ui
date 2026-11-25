import { DEVELOPMENT_AGENTS, KPI_IMPORT_MAX_BYTES, REPORTING_PERIODS } from "@/features/performance";

export type Mode = "bulk" | "manual";

export const MODES: { value: Mode; title: string; description: string }[] = [
  { value: "bulk", title: "Bulk Excel/CSV Import", description: "Upload large registers using standardized templates." },
  { value: "manual", title: "Manual Form Entry", description: "Type development agent KPI records individually." },
];

export interface ManualForm {
  period: string;
  woreda: string;
  agent: string;
  kebele: string;
  visits: string;
  farmerCases: string;
  needs: string;
  supportActions: string;
  reviews: string;
  training: string;
  quality: string;
  notes: string;
}

export type FormErrors = Partial<Record<keyof ManualForm, string>>;

export type Notice = { tone: "success" | "error"; text: string };

export const INITIAL_FORM: ManualForm = {
  period: REPORTING_PERIODS[0],
  // Woreda and Kebele are picked from the geo Master Data (ManualEntrySteps).
  woreda: "",
  agent: DEVELOPMENT_AGENTS[0],
  kebele: "",
  visits: "",
  farmerCases: "",
  needs: "",
  supportActions: "",
  reviews: "",
  training: "",
  quality: "",
  notes: "",
};

export const REQUIRED: (keyof ManualForm)[] = ["period", "woreda", "agent", "kebele", "visits", "farmerCases", "training", "quality"];

export const SELECT_FIELDS = [
  { key: "period", label: "Reporting Period", options: REPORTING_PERIODS },
  // Woreda and Kebele options are read from the geo Master Data by ManualEntrySteps.
  { key: "woreda", label: "Woreda", options: [] as string[] },
  { key: "agent", label: "Development Agent", options: DEVELOPMENT_AGENTS },
  { key: "kebele", label: "Assigned Kebele", options: [] as string[] },
] as const;

type MetricKey = "visits" | "farmerCases" | "needs" | "supportActions" | "reviews" | "training" | "quality";

export const METRICS: { key: MetricKey; label: string; unit: string; hint: string; max?: number }[] = [
  { key: "visits", label: "Visits Conducted", unit: "Visits", hint: "Target: 18 visits" },
  { key: "farmerCases", label: "Active Farmer Cases", unit: "Farmers", hint: "Target: 120 active" },
  { key: "needs", label: "Needs Identified", unit: "Issues", hint: "Agronomic / technical" },
  { key: "supportActions", label: "Support Actions Logged", unit: "Actions", hint: "Delivered this period" },
  { key: "reviews", label: "Reviews Conducted", unit: "Surveys", hint: "Mandatory review count" },
  { key: "training", label: "Training Completion", unit: "%", hint: "Agent training progress", max: 100 },
  { key: "quality", label: "Quality Score Assessed", unit: "%", hint: "Subjective coordinator score", max: 100 },
];

// Import template columns = the manual form's fields, in form order.
export const TEMPLATE_HEADERS = [
  "Reporting Period",
  "Woreda / Region",
  "Development Agent",
  "Assigned Kebele",
  ...METRICS.map((m) => (m.unit === "%" ? `${m.label} (%)` : m.label)),
  "Operational Notes & Observations",
];
export const TEMPLATE_EXAMPLE = [REPORTING_PERIODS[0], "<Woreda name>", DEVELOPMENT_AGENTS[0], "<Kebele name>", 18, 120, 6, 9, 4, 90, 85, "Met all agricultural milestones for Kebele 01."];

// Draft kept for this browser session only (see lib/drafts).
export const DRAFT_KEY = "kpi-entry";

export const formatSize = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / (1024 * 1024)).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);

/** Error message for an unacceptable import file, or null when it can be queued. */
export function importFileError(file: File): string | null {
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext !== "xlsx" && ext !== "csv") return "Only .xlsx or .csv files are accepted.";
  if (file.size > KPI_IMPORT_MAX_BYTES) return "File is larger than 5 MB.";
  return null;
}

/** Per-field errors for the manual form (empty object when valid). */
export function validateManualForm(form: ManualForm): FormErrors {
  const next: FormErrors = {};
  REQUIRED.forEach((key) => {
    if (!form[key].trim()) next[key] = "Required";
  });
  METRICS.forEach(({ key, max }) => {
    const raw = form[key].trim();
    if (!raw) return;
    const n = Number(raw);
    if (!Number.isFinite(n) || n < 0) next[key] = "Enter a positive number";
    else if (max !== undefined && n > max) next[key] = `Must be ${max} or less`;
  });
  return next;
}
