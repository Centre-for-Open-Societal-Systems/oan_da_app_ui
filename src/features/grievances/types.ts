export type GrievanceStatus =
  | "Pending Submit"
  | "Submitted"
  | "More Info Needed"
  | "Assigned"
  | "In Progress"
  | "Under Review"
  | "Resolved"
  | "Rejected"
  | "Pending Submitter"
  | "Closed";

export type GrievancePriority = "Low" | "Medium" | "High" | "Critical";

export type GrievanceCategory = "Inputs" | "Schemes" | "Payments" | "Markets" | "Extension" | "Land";

export interface Grievance {
  ticketId: string;
  title: string;
  submitter: string;
  region: string;
  woreda: string;
  /** Free-text location label from the Grievance Service list (e.g. a Kebele name). */
  location?: string;
  type: string;
  /** A sample category, or the Grievance Service category name (e.g. "Supply Chain") for API records. */
  category: string;
  /** The Grievance Service status code/label (its own vocabulary); sample rows use the names below. */
  status: string;
  /** The service list carries no priority, so this is set only on sample rows and from the detail. */
  priority?: GrievancePriority;
  submittedAt: string; // e.g. "May 28, 2026, 10:42 AM"
  attachments: number;
  responses: number;
  /** FR-12: raised by the DA on behalf of a farmer, by the farmer directly, or for the DA themselves. */
  raisedBy: "OnBehalf" | "Farmer" | "DA";
  /** Set on records loaded from GET /grievances: the detail modal then reads the ticket from the API. */
  fromApi?: boolean;
}

/** Statuses the table, its filter and the stat cards work with. */
export type GrievanceBucket = Extract<GrievanceStatus, "Assigned" | "In Progress" | "More Info Needed" | "Rejected" | "Resolved" | "Closed">;

/** One entry in a grievance's communication thread. */
export type ThreadMessage =
  | {
      kind: "submission";
      id: string;
      author: string;
      role: string;
      at: string;
      body: string;
      attachments: string[];
    }
  | {
      kind: "dept-response";
      id: string;
      author: string;
      role: string;
      at: string;
      responseNo: number;
      outcome: string; // e.g. "Partially Resolved"
      actionTaken: string;
      resolutionSummary: string;
      proposedClosure: string; // ISO date
    }
  | {
      kind: "status-change";
      id: string;
      from: GrievanceStatus;
      to: GrievanceStatus;
      by: string;
      at: string;
    }
  | {
      /** A Grievance Service timeline event (GET /grievances/{id}/timeline), e.g. "assigned" or "escalated". */
      kind: "event";
      id: string;
      action: string;
      actor: string;
      at: string;
      detail: string;
    }
  | {
      kind: "internal-note";
      id: string;
      author: string;
      role: string;
      at: string;
      body: string;
    };

export interface GrievanceCase {
  grievance: Grievance;
  thread: ThreadMessage[];
  submitter: {
    name: string;
    kind: string; // "Individual Farmer"
    faydaId: string;
    avatar?: string;
    kebele: string;
    channel: string;
    submittedOn: string;
  };
  sla: {
    consumedPct: number;
    submittedOn: string;
    dueOn: string;
  };
}
