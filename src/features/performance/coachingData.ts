// Sample coaching workspace for the supervisor's Coaching page until the coaching API is wired.
export const COACHING_AGENT = {
  name: "Almaz Wolde",
  first: "Almaz",
  role: "Development Agent",
  place: "Boku Shanan kebele, Adola district",
  title: "Farmers Manager",
  joined: "October 2022",
  farmers: 120,
  visitRate: 94,
  reporting: 98,
};

export const COACHING_SUPERVISOR = "Kassahun";

export type SessionStatus = "Scheduled" | "Completed";

export interface CoachingSession {
  id: string;
  /** Display date, e.g. "Nov 24, 2024". */
  date: string;
  topic: string;
  status: SessionStatus;
}

export const COACHING_SESSIONS: CoachingSession[] = [
  { id: "s1", date: "Nov 24, 2024", topic: "Visit planning efficiency & fertilizer distribution reporting", status: "Scheduled" },
  { id: "s2", date: "Oct 28, 2024", topic: "Data quality validation & offline form synchronization", status: "Completed" },
  { id: "s3", date: "Sep 15, 2024", topic: "Introduction to digital crop yield projections tools", status: "Completed" },
  { id: "s4", date: "Aug 02, 2024", topic: "SMS alert broadcasts configuration for smallholder farmers", status: "Completed" },
];

export const COACHING_FOCUS_OPTIONS = ["Data quality", "Visit planning", "Weekly reports timeliness", "Farmer registration", "Training delivery"];

export interface ProgressMetric {
  label: string;
  value: string;
  change: string;
  /** "good" = green, "bad" = red; direction is only the arrow. */
  tone: "good" | "bad";
  direction: "up" | "down";
}

export const COACHING_PROGRESS: { since: string; metrics: ProgressMetric[] } = {
  since: "Oct 28",
  metrics: [
    { label: "Offline data entry errors", value: "0.8%", change: "Down 4.2%", tone: "bad", direction: "down" },
    { label: "On-time weekly reports", value: "98%", change: "Up 8%", tone: "good", direction: "up" },
    { label: "Farmer adoption rate", value: "82%", change: "Up 5%", tone: "good", direction: "up" },
  ],
};

export interface CoachingItem {
  id: string;
  text: string;
  owner: string;
  date: string;
  done: boolean;
}

export interface CoachingEntry {
  focus: string[];
  feedbackTitle: string;
  feedback: string;
  improvements: CoachingItem[];
  recommendations: string[];
  actions: CoachingItem[];
  /** ISO date. */
  reviewDate: string;
}

export const ENTRY_ID = "CE-2026-0412";

export const SAMPLE_ENTRY: CoachingEntry = {
  focus: ["Data quality", "Visit planning", "Weekly reports timeliness"],
  feedbackTitle: "Positive growth observed!",
  feedback:
    "Almaz has made excellent progress in reducing offline synchronization lag. Her recent data entries for the Ada'a wheat project are accurate and comprehensive. Let's build on this momentum by optimizing her travel routes for farmer group visits.",
  improvements: [
    { id: "i1", text: "Schedule visits proactively during community market days to minimize travel overhead", owner: "Almaz", date: "Jun 15, 2026", done: false },
    { id: "i2", text: "Conduct secondary validation of farmer field coordinates on the portal map weekly", owner: "Almaz", date: "Jun 15, 2026", done: false },
    { id: "i3", text: "Conduct secondary validation of farmer field coordinates on the portal map weekly", owner: "Almaz", date: "Jun 15, 2026", done: true },
  ],
  recommendations: [
    "Leverage the offline-first map templates for Ada'a during rainy days to prevent coordination delay.",
    "Team up with neighboring Kebele lead to share transport logistics during peak fertilizer allocation.",
  ],
  actions: [
    { id: "a1", text: "Share feedback report with Boku Shanan supervisor", owner: "Kassahun", date: "Jun 15, 2026", done: false },
    { id: "a2", text: "Setup map training follow-up workshop session", owner: "Kassahun", date: "Jun 15, 2026", done: false },
    { id: "a3", text: "Publish updated visit timetable on district board", owner: "Almaz", date: "Jun 15, 2026", done: false },
  ],
  reviewDate: "2024-12-18",
};

export const EMPTY_ENTRY: CoachingEntry = {
  focus: [],
  feedbackTitle: "",
  feedback: "",
  improvements: [],
  recommendations: [],
  actions: [],
  reviewDate: "",
};
