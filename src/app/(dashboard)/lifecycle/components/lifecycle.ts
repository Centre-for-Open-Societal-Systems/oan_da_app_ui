// Sample DA lifecycle record: the transitions an officer can initiate and the approved history, until the lifecycle API is wired.

export type LifecycleTone = "blue" | "violet" | "cyan" | "amber" | "orange" | "red" | "rose" | "green";
export type LifecycleCategory = "Assignment" | "Availability" | "Service";

export interface LifecycleTransition {
  code: string;
  title: string;
  description: string;
  /** The status the DA moves to once the transition takes effect. */
  outcome: string;
  tone: LifecycleTone;
  category: LifecycleCategory;
  /** Label of the extra field the initiate form asks for (new kebele, grade …). */
  targetLabel?: string;
  /** What the DA has today, shown as "From" in the submit summary. */
  from: string;
  /** The DA hands their farmers over to a successor before the change takes effect. */
  handover?: boolean;
  /** A second sign-off after the Woreda approver (e.g. zone / regional HR on a separation). */
  secondApprover?: string;
  /** Sub-types the initiate form offers, e.g. within or across woreda for a transfer. */
  scopes?: string[];
}

export interface TransitionGroup {
  category: LifecycleCategory;
  title: string;
  description: string;
  transitions: LifecycleTransition[];
}

export const TRANSITION_GROUPS: TransitionGroup[] = [
  {
    category: "Assignment",
    title: "Assignment & role",
    description: "Change where the DA works or what they do.",
    transitions: [
      { code: "TR", title: "Transfer", description: "Reassign to another kebele or woreda", outcome: "Active · new location", tone: "blue", category: "Assignment", targetLabel: "New kebele / woreda", from: "Bako Tibe kebele, Adama", handover: true, scopes: ["Within woreda (kebele to kebele)", "To another woreda"] },
      { code: "PR", title: "Promotion / role change", description: "Change grade or supervisory role", outcome: "Active · new grade", tone: "violet", category: "Assignment", targetLabel: "New grade or role", from: "DA II · Development Agent", scopes: ["Grade promotion", "Role change", "Grade promotion and role change"] },
      { code: "SC", title: "Specialization change", description: "Advisory domain updated.", outcome: "Active (new specialisation)", tone: "cyan", category: "Assignment", targetLabel: "New specialization", from: "Horticulture", scopes: ["Specialisation change"] },
    ],
  },
  {
    category: "Availability",
    title: "Availability",
    description: "Pause, suspend or restore the DA's active status.",
    transitions: [
      { code: "LV", title: "Leave / suspension", description: "Temporary leave or suspension", outcome: "On Leave", tone: "amber", category: "Availability", targetLabel: "End date", from: "Active", handover: true },
      { code: "RA", title: "Reactivation", description: "Restore an inactive DA to service", outcome: "Active", tone: "green", category: "Availability", from: "Inactive" },
      { code: "DE", title: "Deactivation", description: "Suspend system access", outcome: "Inactive", tone: "orange", category: "Availability", from: "Active" },
    ],
  },
  {
    category: "Service",
    title: "End of service",
    description: "Permanent changes. Handover and clearance are required.",
    transitions: [
      { code: "RT", title: "Retirement", description: "End of service — retirement", outcome: "Separated · retired", tone: "red", category: "Service", from: "Active", handover: true },
      { code: "SP", title: "Separation", description: "Permanent separation from service", outcome: "Separated", tone: "rose", category: "Service", from: "Active", handover: true, secondApprover: "Zone / regional HR" },
    ],
  },
];

export const LIFECYCLE_STAGES = [
  { label: "Onboarded", done: true },
  { label: "Active", done: true },
  { label: "In service", done: true },
  { label: "Transition", done: false },
  { label: "Separated", done: false },
];

export const LIFECYCLE_DA = {
  name: "Almaz Wolde",
  initials: "AW",
  role: "Development Agent",
  status: "Active",
  statusSince: "12 Jan 2026",
  location: "Adama woreda, Oromia",
  phone: "+251 91 234 5678",
  email: "almaz.wolde@moa.gov.et",
  approver: "Woreda Extension Officer",
  approverName: "Dr. Tewodros M. (Woreda)",
  farmers: "248 farmers · 3 sub-kebeles",
};

export const SERVICE_SNAPSHOT = [
  { label: "Service since", value: "12 Jan 2023" },
  { label: "Grade", value: "DA II" },
  { label: "Specialization", value: "Horticulture" },
  { label: "Assignment", value: "Bako Tibe kebele, Adama" },
];

export const TRANSITION_STEPS = [
  { title: "Initiate", detail: "Pick an action, then add reason, date and evidence." },
  { title: "Review", detail: "The approver checks eligibility and handover." },
  { title: "Approve", detail: "Woreda Extension Officer signs off." },
  { title: "Effective", detail: "Status changes on the effective date and the audit entry is sealed." },
];

export interface LifecycleEvent {
  id: string;
  title: string;
  category: LifecycleCategory;
  change: string;
  tone: LifecycleTone;
  note: string;
  effective: string;
  approver: string;
  recordedAt: string;
  status: "Approved" | "Pending approval" | "Withdrawn" | "Rejected";
  /** Set for requests raised from a full-page form; links the entry to /lifecycle/requests/<id>. */
  requestId?: string;
}

export const LIFECYCLE_HISTORY: LifecycleEvent[] = [
  { id: "LC-6", title: "Promotion", category: "Assignment", change: "Grade DA I → DA II", tone: "violet", note: "Completed competency assessment; recommended by supervisor.", effective: "01 Jun 2024", approver: LIFECYCLE_DA.approverName, recordedAt: "28 May 2024 · 14:02", status: "Approved" },
  { id: "LC-5", title: "Specialization update", category: "Assignment", change: "Cereals → Horticulture", tone: "cyan", note: "Regional advisory need; reassigned focus area.", effective: "15 Mar 2024", approver: LIFECYCLE_DA.approverName, recordedAt: "12 Mar 2024 · 09:20", status: "Approved" },
  { id: "LC-4", title: "Reactivation", category: "Availability", change: "On Leave → Active", tone: "green", note: "Returned from statutory leave.", effective: "02 Apr 2024", approver: LIFECYCLE_DA.approverName, recordedAt: "01 Apr 2024 · 16:45", status: "Approved" },
  { id: "LC-3", title: "Leave / suspension", category: "Availability", change: "Active → On Leave", tone: "amber", note: "Statutory maternity leave (02 Jan – 01 Apr 2024).", effective: "02 Jan 2024", approver: LIFECYCLE_DA.approverName, recordedAt: "20 Dec 2023 · 11:10", status: "Approved" },
  { id: "LC-2", title: "Transfer", category: "Assignment", change: "Lume → Bako Tibe kebele", tone: "blue", note: "Staffing rebalance across Adama woreda.", effective: "10 Jan 2023", approver: LIFECYCLE_DA.approverName, recordedAt: "04 Jan 2023 · 10:05", status: "Approved" },
  { id: "LC-1", title: "Onboarding", category: "Service", change: "Draft → Active", tone: "green", note: "Initial DA registration; Fayda verified, DA-ID issued.", effective: "12 Jan 2023", approver: LIFECYCLE_DA.approverName, recordedAt: "12 Jan 2023 · 08:30", status: "Approved" },
];

/** DAs in the same woreda who can take over the farmers during a handover. */
export const SUCCESSOR_OPTIONS = ["Kedir Hussen — Bako Tibe kebele", "Meseret Bekele — Kebele 05", "Tolosa Gemechu — Gedo kebele", "Hirut Abebe — Lume kebele"];

/** Where a request sits on the DA → Supervisor → Admin route. */
export type ReviewStage = "Awaiting Supervisor" | "Awaiting Admin" | "Approved" | "Rejected" | "Withdrawn";

export function reviewStage(r: Pick<LifecycleRequest, "status" | "supervisorDecision">): ReviewStage {
  if (r.status !== "Pending approval") return r.status;
  return r.supervisorDecision ? "Awaiting Admin" : "Awaiting Supervisor";
}

/** "09 Oct 2026" from an ISO date or timestamp. */
export const formatDate = (iso: string) => new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** "09 Oct 2026, 08:40" from an ISO timestamp. */
export const formatDateTime = (iso: string) => `${formatDate(iso)}, ${new Date(iso).toTimeString().slice(0, 5)}`;

const dayBefore = (iso: string) => new Date(new Date(iso).getTime() - 86_400_000).toISOString();

/** The values an officer fills in on an initiate form. */
export interface RequestFields {
  scope: string;
  target: string;
  effective: string;
  successor: string;
  reason: string;
  /** New role, on a promotion / role change. */
  role: string;
  /** Competency assessment backing a promotion. */
  assessment: string;
  /** System access while on leave (Full access / Read-only / Suspended). */
  access?: string;
  /** Notice period on a separation (30 days served / Waived / Not served). */
  notice?: string;
  /** Leave taken as a half day on the first / last day. */
  halfStart?: boolean;
  halfEnd?: boolean;
}

/** A submitted Assignment & role request, shown on /lifecycle/requests/<id>. */
export interface LifecycleRequest extends RequestFields {
  id: string;
  auditId: string;
  /** Transition code (TR, PR, SC). */
  code: string;
  document: { name: string; size: number } | null;
  submittedAt: string;
  status: "Pending approval" | "Approved" | "Withdrawn" | "Rejected";
  decidedAt?: string;
  comment?: string;
  /** Supervisor's review: the request reaches the Admin only after this. */
  supervisorDecision?: { at: string; comment: string };
  /** Set when the Supervisor or the Admin turns the request down; `comment` carries the reason. */
  rejectedBy?: "Supervisor" | "Admin";
  /** First sign-off on a transition that needs two approvals; the request stays pending until the second. */
  firstDecision?: { at: string; comment: string };
}

/** Copy and choices for the full-page initiate form used by the Assignment & role transitions. */
export interface AssignmentForm {
  /** URL segment: /lifecycle/initiate/<slug>. */
  slug: string;
  code: string;
  summary: string;
  detailsTitle: string;
  detailsSubtitle: string;
  scopeLabel?: string;
  currentLabel: string;
  /** What the DA has today, shown locked beside the new value. */
  currentValue: string;
  targetLabel: string;
  targetOptions: string[];
  /** Summary row label for the main change ("Grade", "Specialization"); without it the summary shows From/To. */
  changeLabel?: string;
  /** "Transition" summary row, when it reads differently from "<title> · <type>". */
  transitionLine?: string;
  /** Optional second current/new pair (role on a promotion, advisory focus on a specialization). Required unless the
   *  type is a grade-only change or the pair is `optional`. */
  role?: { currentLabel: string; current: string; label: string; options: string[]; rowLabel: string; optional?: boolean };
  /** Evidence section: the assessment or certification, time in grade and the document upload. */
  assessment?: { title: string; subtitle: string; label: string; rowLabel: string; placeholder: string; options: string[]; tenureLabel: string; tenure: string };
  /** "Current" line of the transition preview. */
  previewCurrent: string;
  /** "After approval" line of the transition preview, from the chosen values. */
  previewAfter: (fields: RequestFields) => string;
  documentLabel: string;
  /** Last step of the approval route, once the effective date is known. */
  effectiveNote: (date: string, fields: RequestFields) => string;
  /** The same step on the request pages, once the values are final (defaults to `effectiveNote`). */
  requestNote?: (date: string, fields: RequestFields) => string;
  /** "What happens next" on the form, from the chosen values. */
  next: (fields: RequestFields) => string[];
  /** "Next steps" once the request is approved. */
  approvedNext: (request: LifecycleRequest) => string[];
}

/** What every full-page transition shares with the request pages: preview, approval route and next steps. */
export type TransitionCopy = Pick<AssignmentForm, "slug" | "code" | "summary" | "previewCurrent" | "previewAfter" | "effectiveNote" | "requestNote" | "next" | "approvedNext">;

/** New grade and/or role, e.g. "DA III · Senior Development Agent". */
export const gradeAndRole = (f: RequestFields) => [f.target, f.role].filter(Boolean).join(" · ");

/** "Grade changes to DA III on 01 Dec 2026." — or the role, when only the role changes. */
const promotionChange = (f: RequestFields, date: string) => (f.target ? `Grade changes to ${f.target} on ${date}.` : `Role changes to ${f.role} on ${date}.`);

const AUDIT_NEXT ="An audit entry records reason, approver and timestamp.";

export const ASSIGNMENT_FORMS: AssignmentForm[] = [
  {
    slug: "transfer",
    code: "TR",
    summary: `Reassign ${LIFECYCLE_DA.name} to another kebele or woreda. Routes to the ${LIFECYCLE_DA.approver} for approval.`,
    detailsTitle: "Transfer details",
    detailsSubtitle: "Where the DA moves and from when.",
    scopeLabel: "Transfer type",
    currentLabel: "Current assignment",
    currentValue: "Bako Tibe kebele, Adama",
    targetLabel: "New assignment",
    targetOptions: ["Gedo kebele, Adama", "Lume kebele, Adama", "Kebele 05, Adama", "Dendi woreda, West Shewa"],
    previewCurrent: "Active · Bako Tibe kebele",
    previewAfter: (f) => `Active · ${f.target.split(",")[0]}`,
    documentLabel: "Upload transfer order letter",
    effectiveNote: (d, f) => `Assignment changes to ${f.target ? f.target.split(",")[0] : "the new kebele"} on ${d}.`,
    approvedNext: (r) => [
      `Complete the farmer handover to ${r.successor.split(" — ")[0]} by ${formatDate(dayBefore(r.effective))}.`,
      `Assignment changes to ${r.target.split(",")[0]} on ${formatDate(r.effective)}.`,
      "The mobile app re-syncs the new kebele at next login.",
    ],
    next: () => ["Farmers in Bako Tibe move to the successor DA.", "The mobile app re-syncs the new kebele at next login.", AUDIT_NEXT],
  },
  {
    slug: "promotion",
    code: "PR",
    summary: "Change grade or supervisory role. Needs a completed competency assessment and a supervisor recommendation.",
    detailsTitle: "Role & grade",
    detailsSubtitle: "Current position and the proposed change.",
    scopeLabel: "Change type",
    currentLabel: "Current grade",
    currentValue: "DA II",
    targetLabel: "New grade",
    targetOptions: ["DA III", "DA IV", "Senior DA"],
    changeLabel: "Grade",
    role: { currentLabel: "Current role", current: "Development Agent", label: "New role", options: ["Senior Development Agent", "Kebele Team Lead", "Woreda Supervisor"], rowLabel: "Role" },
    assessment: { title: "Assessment", subtitle: "Evidence that supports the change.", label: "Competency assessment", rowLabel: "Assessment", placeholder: "Select an assessment", options: ["ASM-2026-0412 · 86 / 100", "ASM-2025-1187 · 78 / 100"], tenureLabel: "Time at current grade", tenure: "2 yrs 4 mths" },
    previewCurrent: "Active · DA II",
    previewAfter: (f) => `Active · ${f.target || f.role}`,
    documentLabel: "Upload competency assessment report",
    effectiveNote: (d) => `Grade and role update on ${d} and the audit entry is sealed.`,
    requestNote: (d, f) => promotionChange(f, d),
    approvedNext: (r) => [
      promotionChange(r, formatDate(r.effective)),
      r.role ? "Supervisory permissions are added to the profile." : "Permissions stay the same; only the grade changes.",
      "KPI targets are re-baselined at the next review cycle.",
    ],
    next: () => [
      "Grade and role update in the DA registry on the effective date.",
      "Supervisory permissions are added when a supervisory role is chosen.",
      "KPI targets are re-baselined for the new grade at the next review.",
    ],
  },
  {
    slug: "specialization",
    code: "SC",
    summary: "Advisory domain updated. Reassign the DA's specialization based on regional advisory need and completed certification.",
    detailsTitle: "Advisory domain",
    detailsSubtitle: "Current specialization and the proposed change.",
    scopeLabel: "Change type",
    currentLabel: "Current specialization",
    currentValue: "Horticulture",
    targetLabel: "New specialization",
    targetOptions: ["Livestock & Animal Health", "Cereals", "Natural resource management", "Soil & water conservation", "Agri-business"],
    changeLabel: "Specialization",
    transitionLine: "Specialisation change · Active → Active (new specialisation)",
    role: {
      currentLabel: "Current advisory focus",
      current: "Crop advisory — Horticulture",
      label: "New advisory focus",
      options: ["Livestock & animal health advisory", "Cereal crop advisory", "Natural resource advisory", "Market linkage advisory"],
      rowLabel: "Advisory focus",
      optional: true,
    },
    assessment: {
      title: "Justification",
      subtitle: "Evidence that supports the specialization change.",
      label: "Certification / training reference",
      rowLabel: "Certification",
      placeholder: "Select a certification",
      options: ["ALH-2026-0193 · Agrilearn · 92 / 100", "NRM-2025-0877 · Agrilearn · 81 / 100"],
      tenureLabel: "Time in current specialization",
      tenure: "2 yrs 8 mths",
    },
    previewCurrent: "Active · Horticulture",
    previewAfter: (f) => `Active · ${f.target}`,
    documentLabel: "Upload specialization certificate or advisory need memo",
    effectiveNote: (d) => `Specialization updates on ${d} and the audit entry is sealed.`,
    requestNote: (d, f) => `Specialization changes to ${f.target} on ${d}.`,
    approvedNext: (r) => [
      `Specialization changes to ${r.target} on ${formatDate(r.effective)}.`,
      "Advisory assignments are updated to reflect the new domain.",
      "Farmer caseload is reviewed for domain fit at the next cycle.",
    ],
    next: (f) => [
      "Advisory domain updates in the DA registry on the effective date.",
      `Farmer assignments tagged to ${f.target || "the new domain"} are prioritized in My Farmers.`,
      "KPI targets are re-baselined for the new advisory domain at the next review.",
    ],
  },
];

export const assignmentFormFor = (code: string) => ASSIGNMENT_FORMS.find((f) => f.code === code);

/** The transition card a form belongs to (title, tone, from, scopes …). */
export const transitionFor = (code: string) => TRANSITION_GROUPS.flatMap((g) => g.transitions).find((t) => t.code === code);
