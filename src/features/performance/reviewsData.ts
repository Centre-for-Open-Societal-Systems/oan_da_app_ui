// Sample coaching-review history for the supervisor's Reviews page until the reviews API is wired.
import type { PillTone } from "@/components/ui/Pill";

export const REVIEW_TYPES = ["Quarterly", "Semi-annual", "Annual", "Ad hoc"] as const;
export type ReviewType = (typeof REVIEW_TYPES)[number];

export type CoachingReviewStatus = "Pending Acknowledgment" | "Acknowledged" | "Completed" | "In progress";

/** List-card look per review type: left border + tint, and the tag's tone. */
export const REVIEW_TYPE_STYLE: Record<ReviewType, { card: string; tag: PillTone }> = {
  Quarterly: { card: "border-l-brand-green bg-brand-wash border-brand-border", tag: "green" },
  "Semi-annual": { card: "border-l-blue-500 bg-blue-50/60 border-blue-200", tag: "blue" },
  Annual: { card: "border-l-orange-400 bg-warning-wash border-warning-border", tag: "amber" },
  "Ad hoc": { card: "border-l-danger bg-danger-wash border-danger-border", tag: "red" },
};

export interface ReviewGoal {
  title: string;
  done: number;
  of: number;
  unit: string;
}

export interface CoachingReview {
  id: string;
  type: ReviewType;
  title: string; // list title, e.g. "Q2 2024 review"
  heading: string; // detail heading, e.g. "Q2 2026 Performance Review"
  period: string;
  date: string; // shown on the list card
  coach: string;
  status: CoachingReviewStatus;
  /** Standing label shown as a pill on the detail card. */
  rating: string;
  summary: string;
  achievements: string[];
  challenges: string[];
  goals: ReviewGoal[];
  supervisorFeedback: string;
  employeeResponse: string;
  actionPlan: { title: string; detail: string }[];
}

export const REVIEWED_AGENT = { name: "Almaz Wolde", role: "Extension Officer", lastReview: "Q2 2026" };
export const REVIEW_COACHES = ["Kassahun Tessema", "Lemlem Kassa", "Bekele Tadesse"];
export const REVIEW_COACH = { name: "Dr. Kassahun Tessema", role: "Regional Supervisor" };

const DETAIL: Omit<CoachingReview, "id" | "type" | "title" | "heading" | "period" | "date" | "coach" | "status"> = {
  rating: "High Performer",
  summary:
    "Almaz has demonstrated exceptional leadership this quarter in the Oromia central extension zone. By prioritizing modern seed treatment methodologies and leading hands-on demo workshops for local farmer co-operatives, she directly contributed to a significant uptake in pest-resilient teff cultivation. Her proactive approach to peer-led farmer coaching sessions continues to serve as an exemplary standard for the entire region.",
  achievements: [
    "Successfully onboarded 140 new female farmers into the micro-irrigation coaching track, exceeding the target of 100.",
    "Facilitated 12 village-level field demonstration days with outstanding feedback from primary cooperative leaders.",
    "Maintained a 94% registry accuracy for fertilizer distribution tracking across central cluster zones.",
  ],
  challenges: [
    "Faced transportation delays due to early onset seasonal rains, temporarily reducing weekly onsite coaching visits.",
    "Encountered initial resistance regarding digital soil-pH mapping tools among senior community elders.",
    "Limited access to stable data networks hindered real-time report uploads from remote rural sub-stations.",
  ],
  goals: [
    { title: "Active Farmer Onboarding Track", done: 140, of: 150, unit: "Farmers" },
    { title: "Agronomy Field Demo Workshops", done: 12, of: 15, unit: "Workshops" },
    { title: "Digital Soil Card Registrations", done: 12, of: 15, unit: "Workshops" },
  ],
  supervisorFeedback:
    "Almaz, your energy and commitment in Oromia central are inspiring. We will look into mobilizing better transport resources to mitigate weather-related issues. Keep championing the digital transformation.",
  employeeResponse:
    "I am incredibly proud of our team's cooperative milestones. The digital soil mapping is yielding fantastic localized insight, and I hope to expand this initiative into neighboring kebeles next season.",
  actionPlan: [
    { title: "Procure robust field kit and wet-weather gear", detail: "Ensure personal safety and continuity of onsite visits during heavy weather transitions." },
    { title: "Implement offline-first capabilities for soil mapping", detail: "Transition mapping registers to offline-compatible templates to handle internet dropouts." },
    { title: "Kebele leader engagement workshop", detail: "Co-host a tailored session with local elders to build trust and demonstrate direct yield benefits of pH-adjusted planting." },
  ],
};

const review = (r: Pick<CoachingReview, "id" | "type" | "title" | "heading" | "period" | "date" | "status">): CoachingReview => ({
  ...DETAIL,
  ...r,
  coach: "Kassahun Tessema",
});

export const COACHING_REVIEWS: CoachingReview[] = [
  review({ id: "rv-q2-26", type: "Quarterly", title: "Q2 2026 review", heading: "Q2 2026 Performance Review", period: "April 1, 2026 - June 30, 2026", date: "Jul 20, 2026", status: "Pending Acknowledgment" }),
  review({ id: "rv-q2-24", type: "Quarterly", title: "Q2 2024 review", heading: "Q2 2024 Performance Review", period: "April 1, 2024 - June 30, 2024", date: "Jul 12, 2026", status: "Completed" }),
  review({ id: "rv-q1-24", type: "Quarterly", title: "Q1 2024 review", heading: "Q1 2024 Performance Review", period: "January 1, 2024 - March 31, 2024", date: "Apr 08, 2026", status: "Completed" }),
  review({ id: "rv-23", type: "Annual", title: "2023 annual review", heading: "2023 Annual Review", period: "January 1, 2023 - December 31, 2023", date: "Jan 15, 2026", status: "Completed" }),
  review({ id: "rv-adhoc", type: "Ad hoc", title: "Coaching check-in - May 2024", heading: "Coaching check-in - May 2024", period: "May 1, 2024 - May 20, 2024", date: "May 20, 2026", status: "Completed" }),
];

// ---------- Review history (activity timeline) ----------

export const HISTORY_CATEGORIES = ["Recognition", "Training", "Coaching", "Goals", "Reviews"] as const;
export type HistoryCategory = (typeof HISTORY_CATEGORIES)[number];

export interface HistoryEvent {
  id: string;
  category: HistoryCategory;
  /** ISO date, used for the period filter. */
  date: string;
  /** "assigned" = a goal handed to the agent (neutral look), as opposed to one the agent progressed. */
  kind?: "assigned";
  title: string;
  detail: string;
  recordedBy: string;
}

export interface HistoryPeriod {
  value: string;
  label: string;
  from: string; // ISO, inclusive
  to: string; // ISO, inclusive
  badge: string;
}

export const HISTORY_PERIODS: HistoryPeriod[] = [
  { value: "q2-26", label: "Q2 2026 (Apr-Jun)", from: "2026-04-01", to: "2026-06-30", badge: "Current" },
  { value: "q1-26", label: "Q1 2026 (Jan-Mar)", from: "2026-01-01", to: "2026-03-31", badge: "Close" },
  { value: "q4-25", label: "Q4 2025 (Oct-Dec)", from: "2025-10-01", to: "2025-12-31", badge: "Close" },
  { value: "q3-25", label: "Q3 2025 (Jul-Sep)", from: "2025-07-01", to: "2025-09-30", badge: "Close" },
  { value: "fy-26", label: "FY 2026", from: "2026-01-01", to: "2026-12-31", badge: "YTD" },
];

export const HISTORY_AGENT = { name: "Almaz Wolde", role: "Development Agent" };

/** Sample timeline (newest first within a period) until the activity API is wired. */
export const HISTORY_EVENTS: HistoryEvent[] = [
  { id: "h1", category: "Recognition", date: "2026-06-12", title: "Recognition: Excellent Data Quality", detail: "Awarded for maintaining 99%+ accuracy in crop yield and soil assessments reporting across primary cooperatives this quarter.", recordedBy: "Kenenisa Bekele (Regional Director)" },
  { id: "h2", category: "Training", date: "2026-06-05", title: "Training completed: Integrated Pest Management", detail: "Successfully concluded the 15-hour specialized block on organic mitigation controls, bio-pesticides, and fall armyworm response.", recordedBy: "Ministry of Agriculture (MoA)" },
  { id: "h3", category: "Coaching", date: "2026-05-28", title: "Coaching session with Tadesse Alemu", detail: "Discussed extension outreach expansion methodologies, local cooperative training tools, and digitization barrier solutions.", recordedBy: "Tadesse Alemu (Senior Supervisor)" },
  { id: "h4", category: "Goals", date: "2026-05-15", title: "Q2 goal updated: visits target raised", detail: "Revised active farm visits metrics to accommodate local planting demands. Targeted raising visits from 45 to 60 units.", recordedBy: "Tadesse Alemu (Senior Supervisor)" },
  { id: "h5", category: "Reviews", date: "2026-05-02", title: "Data quality score 91% to 97%", detail: "Performance metrics audit reflected substantial accuracy improvements in the regional soil nutrient diagnostics records pipeline.", recordedBy: "OpenAgriNet System Audit" },
  { id: "h6", category: "Reviews", date: "2026-05-02", title: "Q1 2024 review completed", detail: "Overall evaluation score: Exceeds Expectations. Remarkable dedication to rural cooperative advisory and advisory logs compliance.", recordedBy: "Tadesse Alemu (Senior Supervisor)" },
  { id: "h7", category: "Goals", date: "2026-05-28", kind: "assigned", title: "Goal assigned: cooperative advisory training", detail: "Implement cooperative governance frameworks advisory course modules to 12 target regional multi-service cooperatives.", recordedBy: "HR Development Department" },
  { id: "h8", category: "Coaching", date: "2026-03-18", title: "Coaching check-in: field logistics", detail: "Agreed on a wet-weather gear request and a revised weekly visit route for the central cluster.", recordedBy: "Kassahun Tessema (Regional Supervisor)" },
  { id: "h9", category: "Training", date: "2026-02-10", title: "Training completed: Digital soil mapping", detail: "Completed the 8-hour practical block on soil-pH mapping tools and offline data capture.", recordedBy: "Ministry of Agriculture (MoA)" },
  { id: "h10", category: "Recognition", date: "2025-11-20", title: "Recognition: Best women-farmer outreach", detail: "Recognised for onboarding the highest number of women farmers in the woreda this quarter.", recordedBy: "Kenenisa Bekele (Regional Director)" },
  { id: "h11", category: "Reviews", date: "2025-09-15", title: "Q3 2025 review completed", detail: "Overall evaluation score: Meets Expectations. Steady visit cadence and timely monthly figures.", recordedBy: "Tadesse Alemu (Senior Supervisor)" },
];
