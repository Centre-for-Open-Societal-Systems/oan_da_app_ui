import { authRequest } from "@/features/auth";

// Farmer gatherings on DA Services (backend docs/gatherings-frontend.md): a DA invites 1-20 farmers to one meeting.
// The server stamps the address and region / zone / woreda / kebele from the DA's kebele assignment, so the page sends
// only the venue, an optional landmark and an optional map pin.

/** A gathering invites at most this many farmers. */
export const MAX_GATHERING_FARMERS = 20;

/** One invitee: all three fields are required, the server does not look the farmer up. */
export interface GatheringFarmer {
  /** Farmer ID (`FR-…`). */
  farmer_id: string;
  farmer_name: string;
  phone: string;
}

/** Body of POST /api/v1/da-services/gatherings. */
export interface PlanGatheringRequest {
  /** Frappe User (email) of the DA the gathering belongs to. Required, no session fallback. */
  user: string;
  title: string;
  purpose?: string;
  /** Site-local "2026-11-20 09:00:00", no offset. */
  scheduled_at: string;
  location: { name: string; landmark?: string; lat?: number; lng?: number };
  farmers: GatheringFarmer[];
  /** Default true. SMS rows are queued; the gateway is not wired yet. */
  notify_farmers_sms: boolean;
  /** Same id on a retry returns the gathering already created. */
  client_op_id?: string;
}

/** The planned gathering (subset the portal shows). */
export interface PlannedGathering {
  /** Gathering id. */
  name: string;
  status: string;
  scheduled_at: string;
  title?: string;
  location?: { name?: string; landmark?: string; address?: string };
  attendees?: { farmer_id: string; farmer_name: string; phone: string; sms_status?: string }[];
}

/** POST /api/v1/da-services/gatherings (201, status Planned). */
export async function planGathering(body: PlanGatheringRequest): Promise<PlannedGathering> {
  const res = await authRequest<{ data: PlannedGathering }>("/da-services/gatherings", { method: "POST", body });
  return res.data;
}
