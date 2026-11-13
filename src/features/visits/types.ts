export type VisitStatus = "Confirmed" | "Planned" | "Completed" | "Missed";

export interface VisitRecord {
  id: string;
  date: string;
  time: string;
  agent: string;
  farmerId: string;
  farmerName: string;
  farmerEmail: string;
  farmerAvatar?: string;
  kebele: string;
  purpose: string;
  status: VisitStatus;
  plotRef: string;
  durationMin: number;
  /** Supervisor who assigned this visit to the DA; absent when the DA planned it themselves. */
  assignedBy?: string;
  /** Backend physical status (e.g. "In progress"); absent on sample records. */
  physicalStatus?: string;
}

export interface VisitTimelineEntry {
  label: string;
  by?: string;
  when: string;
  done: boolean;
}

export type PlannerStatus = "scheduled" | "completed" | "overdue";

export interface PlannerVisit {
  id: string;
  time: string;
  farmerName: string;
  kebele: string;
  status: PlannerStatus;
}

export type PriorityLevel = "high" | "medium" | "low";

export interface PriorityFarmer {
  /** Registry id, so Schedule can preselect the farmer. */
  farmerId: string;
  name: string;
  issue: string;
  level: PriorityLevel;
  /** Visit type the issue calls for; preselected in the Schedule form. */
  visitType: string;
}

export type ArrivalState = "done" | "confirmed" | "tentative";

export interface TodaysVisit {
  id: string;
  farmerName: string;
  plannedArrival: string;
  state: ArrivalState;
  note: string;
  /** Kebele and registered parcel, shown in "View locations". */
  kebele?: string;
  parcel?: string;
  /** Parcel coordinates (decimal degrees) for the Maps link. */
  lat?: number;
  lng?: number;
}

export type EvidenceBadge = "VERIFIED" | "AGRILEARN · AUTO" | "PENDING VERIFICATION";

export interface EvidenceDocument {
  title: string;
  badge: EvidenceBadge;
  meta: string;
  file?: string;
}

export interface SubmittedOutcome {
  farmerName: string;
  kebele: string;
  purpose: string;
  summary: string;
  date: string;
}
