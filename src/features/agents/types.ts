// DA Registry domain (FSD Part 1 §3.2, §3.3, §4.1, §5).

export type FaydaStatus = "Verified" | "Pending" | "Mismatch";
export type ActiveStatus = "Active" | "On-leave" | "Separated" | "Unassigned";
// The registry's own tiers plus the labels Master Data may hand back; keep the known ones for filters.
export type EducationTier = "Certificate" | "Diploma" | "Degree" | "Masters" | "MSc" | "PhD" | (string & {});
export type ApprovalStatus = "Draft" | "Awaiting review" | "Changes requested" | "Approved" | "Published" | "Rejected";

export interface Agent {
  daId: string;
  fullName: string;
  faydaId: string;
  faydaStatus: FaydaStatus;
  activeStatus: ActiveStatus;
  educationTier: EducationTier;
  kebele: string;
  woreda: string;
  region: string;
  farmerCount: number;
  approvalStatus: ApprovalStatus;
  /** Separate from approval (§4.1): MoA publication has its own receipt / retry state. */
  moaPublication: "Published" | "Pending" | "Failed" | "Not sent";
  phone: string;
  specialisation: string;
  joinedAt: string;
  updatedAt: string;
  source: "Bulk import" | "MoA sync" | "DA Registry";
}

/** A colleague as GET /da-services/experts lists them: work contacts, not a registry record (see features/agents/api). */
export interface TeamMember {
  daId: string;
  fullName: string;
  kebele: string;
  woreda: string;
  region: string;
  specialisation: string;
  activeStatus: ActiveStatus;
  phone: string;
  email?: string;
  language?: string;
  /** Known for the signed-in DA's own registry record only. */
  farmerCount?: number;
  joinedAt?: string;
}

export type IssuanceState = "Generated" | "Queued" | "Exception" | "Failed-retry";

export interface IssuanceEvent {
  daId: string;
  fullName: string;
  faydaMatch: "Match" | "Mismatch" | "Pending";
  uniqueness: "Unique" | "Duplicate" | "Pending";
  state: IssuanceState;
  reason?: string;
  generatedAt: string;
  retryCount: number;
}

export type ExceptionKind = "Duplicate identity" | "Fayda mismatch" | "Missing mandatory field" | "Invalid Kebele reference" | "Failed sync";

export interface DataException {
  id: string;
  kind: ExceptionKind;
  daId: string;
  fullName: string;
  detail: string;
  raisedAt: string;
}

export interface FaydaCheck {
  daId: string;
  fullName: string;
  faydaId: string;
  registryName: string;
  faydaName: string;
  dobMatch: boolean;
  result: FaydaStatus;
  duplicateOf?: string;
  checkedAt: string;
}

export interface AuditEntry {
  actor: string;
  role: string;
  action: string;
  note?: string;
  at: string;
}

export interface OnboardingRecord {
  daId: string;
  fullName: string;
  woreda: string;
  kebele: string;
  source: Agent["source"];
  autoCheck: "Passed" | "Warnings" | "Failed";
  autoCheckNotes: string[];
  status: ApprovalStatus;
  submittedAt: string;
  audit: AuditEntry[];
}

export type SyncDirection = "OAN → MoA" | "MoA → OAN";
export type SyncOutcome = "Success" | "Failed" | "Pending" | "Reconciled";

export interface SyncEvent {
  id: string;
  entityType: "DA record" | "Kebele assignment" | "Lifecycle" | "Approval";
  entityRef: string;
  direction: SyncDirection;
  outcome: SyncOutcome;
  detail: string;
  retryCount: number;
  at: string;
}
