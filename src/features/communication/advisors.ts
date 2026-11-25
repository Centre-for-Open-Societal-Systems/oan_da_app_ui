import type { PillTone } from "@/components/ui/Pill";

// MoA subject-matter experts a DA can reference for specialist advisory support.
// A reference directory only — not an HR record of MoA staff.

export type AdvisorStatus = "Active" | "On leave" | "Inactive";

export const EXPERTISE_AREAS = ["Crop protection", "Soil fertility", "Livestock health", "Irrigation", "Horticulture", "Agronomy", "Natural resources", "Agri-finance"] as const;
export type ExpertiseArea = (typeof EXPERTISE_AREAS)[number];

export interface Advisor {
  id: string;
  name: string;
  expertise: ExpertiseArea;
  unit: string;
  region: string;
  woreda: string;
  phone: string;
  email: string;
  status: AdvisorStatus;
  /** "DD Mon YYYY, HH:MM" in EAT. */
  updatedAt: string;
  availability: string;
}

export const ADVISOR_STATUS_TONE: Record<AdvisorStatus, PillTone> = { Active: "green", "On leave": "amber", Inactive: "red" };

/** Date part of `updatedAt` for compact table cells. */
export const advisorUpdatedDate = (a: Advisor) => a.updatedAt.split(",")[0];

/** Second half of the "Directory status" line on the advisor page. */
export const advisorStatusNote = (a: Advisor) => (a.status === "Active" ? "available in directory" : a.availability.toLowerCase());
