import { authRequest } from "@/features/auth";
import { ApiError } from "@/lib/api";

// DA self-service profile (backend api/v1/profile_self.py; Postman "OAN DA Services - DA Registry", folder 1).
// The profile is the DA's record as the DA Registry holds it; a change goes to the Woreda Supervisor as a
// change request and reaches the registry only after approval.

/** Fields a DA may change (backend services/profile.py EDITABLE); everything else is Fayda-verified and locked. */
export interface ProfileChanges {
  mobile?: string;
  telegram?: string;
  alternate_mobile?: string;
  email?: string;
  language?: string;
  photo?: string;
  education_tier?: string;
  specialisation?: string;
}

export const EDUCATION_TIER_OPTIONS = ["Certificate", "Diploma", "Degree", "Masters"] as const;

export type ChangeRequestStatus = "Pending" | "Approved" | "Applied" | "Rejected" | "Changes requested" | "Cancelled";
export type ChangeRequestDecision = "Approve" | "Reject" | "Request changes";

/** A DA Profile Change Request row (backend services/profile.py FIELDS). `changes` maps a field to its from/to. */
export interface ChangeRequest {
  /** The request id, e.g. "DA-PCR-00012". */
  name: string;
  da_id?: string;
  /** "Contact" or "Qualifications". */
  section?: string;
  status: ChangeRequestStatus | string;
  requested_by?: string;
  reason?: string | null;
  changes?: Record<string, { from?: unknown; to?: unknown } | unknown>;
  region?: string | null;
  zone?: string | null;
  woreda?: string | null;
  approver?: string | null;
  decided_at?: string | null;
  decision_note?: string | null;
  /** "Accepted", "Failed", "Not sent": whether the approved change reached the registry. */
  registry_sync_state?: string | null;
  registry_reference?: string | null;
  /** The registry's own two-stage decision on an applied change: "Pending", "Approved", "Rejected". */
  registry_approval?: string | null;
  registry_error?: string | null;
  applied_at?: string | null;
  client_op_id?: string | null;
  creation?: string;
  modified?: string;
  [field: string]: unknown;
}

/** A certificate on an education record. The file is fetched on demand with fetchProfileDocument(document_id). */
export interface ProfileCertificate {
  name: string;
  document_id: string;
}

/** One education record of the signed-in user. */
export interface ProfileQualification {
  id: string;
  education_level?: string | null;
  education_level_label?: string | null;
  passout_year?: number | string | null;
  is_main?: boolean | null;
  certificates?: ProfileCertificate[] | null;
}

export interface ProfileFamilyMember {
  id: string;
  name?: string | null;
  relationship?: string | null;
  relationship_label?: string | null;
  /** ISO date. */
  date_of_birth?: string | null;
}

/** The signed-in user's own record as GET /profile/my_profile returns it (`profile`), codes and names side by side. */
export interface DaProfile {
  da_id: string;
  full_name: string;
  mobile?: string | null;
  email?: string | null;
  language?: string | null;
  photo?: string | null;
  education_tier?: string | null;
  specialisation?: string | null;
  region?: string | null;
  zone?: string | null;
  woreda?: string | null;
  kebele?: string | null;
  active_status?: string | null;
  /** ISO date. */
  joined_at?: string | null;
  fayda_status?: string | null;
  salutation?: string | null;
  first_name?: string | null;
  father_name?: string | null;
  grandfather_name?: string | null;
  fayda_id?: string | null;
  gender?: string | null;
  marital_status?: string | null;
  birth_month_ec?: number | null;
  /** Ethiopian calendar month name, e.g. "Ginbot". */
  birth_month_name?: string | null;
  birth_year_ec?: number | null;
  telegram_number?: string | null;
  alternate_number?: string | null;
  position?: string | null;
  country?: string | null;
  region_name?: string | null;
  zone_name?: string | null;
  woreda_name?: string | null;
  kebele_name?: string | null;
  position_code?: string | null;
  /** Gregorian date of birth (ISO), as the registry form shows it. Not sent by my_profile yet; asked for. */
  birth_date?: string | null;
  passout_year?: number | string | null;
  home_address?: string | null;
  /** The DA-ID of the person this user reports to; the name is not in the response. */
  reports_to?: string | null;
  internal_record_id?: string | null;
  record_status?: string | null;
  last_approved_at?: string | null;
  last_approved_by?: string | null;
  source?: string | null;
  qualifications?: ProfileQualification[] | null;
  family_members?: ProfileFamilyMember[] | null;
  [field: string]: unknown;
}

/** GET /profile/my_profile: the registry profile, requests still in flight, and whether the record is active. */
export interface MyProfile {
  profile: DaProfile;
  /** Open here, or applied and still waiting for the registry's own approval. */
  pending_requests: ChangeRequest[];
  validation?: { record_found?: boolean; record_status?: string | null; is_active?: boolean } | null;
}

/** The signed-in user's own registry profile, for every role; the backend finds the record from the token. */
export async function fetchMyProfile(): Promise<MyProfile> {
  const { data } = await authRequest<{ data: MyProfile }>("/da-services/profile/my_profile");
  const profile = data.profile ?? ({} as DaProfile);
  return {
    ...data,
    profile: { ...profile, qualifications: profile.qualifications ?? [], family_members: profile.family_members ?? [] },
    pending_requests: data.pending_requests ?? [],
  };
}

/**
 * GET /profile/documents/{document_id}: a short-lived (about one hour) link to a certificate on the user's own
 * record. Ask for it on every View and never cache it. 404 when the document is not on this record.
 */
export async function fetchProfileDocument(documentId: string): Promise<{ da_id?: string; document_id: string; name?: string; url: string }> {
  return (await authRequest<{ data: { da_id?: string; document_id: string; name?: string; url: string } }>(`/da-services/profile/documents/${encodeURIComponent(documentId)}`)).data;
}

/** GET /agents/{da_id}: a DA registry card, scope-checked. */
export async function fetchAgent(daId: string): Promise<Record<string, unknown>> {
  return (await authRequest<{ data: Record<string, unknown> }>(`/da-services/agents/${encodeURIComponent(daId)}`)).data;
}

const requestPath = (id: string, part = "") => `/da-services/profile/change-requests/${encodeURIComponent(id)}${part}`;

/**
 * POST /profile/change-requests: one section per request (Contact or Qualifications); a locked or unknown field
 * is refused with 400. Resend the same clientOpId on a retry so the request is not created twice. Leave `daId` out
 * for the user's own record; it is only for a Supervisor asking for a DA below them in the DA Hierarchy.
 */
export async function submitChangeRequest(changes: ProfileChanges, reason: string, clientOpId: string, daId?: string): Promise<ChangeRequest> {
  const body = { ...(daId ? { da_id: daId } : {}), changes, reason, client_op_id: clientOpId };
  return (await authRequest<{ data: ChangeRequest }>("/da-services/profile/change-requests", { method: "POST", body })).data;
}

export async function listChangeRequests({ status, daId, limit = 50, start = 0 }: { status?: ChangeRequestStatus; daId?: string; limit?: number; start?: number } = {}): Promise<{ items: ChangeRequest[]; total: number }> {
  const query = new URLSearchParams({ limit: String(limit), start: String(start) });
  if (status) query.set("status", status);
  if (daId) query.set("da_id", daId);
  const res = await authRequest<{ data: ChangeRequest[]; meta?: { total?: number } }>(`/da-services/profile/change-requests?${query}`);
  return { items: res.data, total: res.meta?.total ?? res.data.length };
}

export async function fetchChangeRequest(id: string): Promise<ChangeRequest> {
  return (await authRequest<{ data: ChangeRequest }>(requestPath(id))).data;
}

/** POST …/cancel: the DA withdraws a request that is still Pending. */
export async function cancelChangeRequest(id: string): Promise<ChangeRequest> {
  return (await authRequest<{ data: ChangeRequest }>(requestPath(id, "/cancel"), { method: "POST" })).data;
}

/** POST …/decide: Supervisor or Admin. Approve sends the change on to the DA Registry. */
export async function decideChangeRequest(id: string, decision: ChangeRequestDecision, note: string): Promise<ChangeRequest> {
  return (await authRequest<{ data: ChangeRequest }>(requestPath(id, "/decide"), { method: "POST", body: { decision, note } })).data;
}

/** The fields a change request touches, for a one-line summary: "mobile, email". */
export const changedFields = (request: ChangeRequest): string[] => Object.keys(request.changes ?? {});

/** Portal labels for the fields a change request may touch (the keys of ProfileChanges). */
export const PROFILE_FIELD_LABELS: Record<string, string> = {
  mobile: "Phone number",
  telegram: "Telegram number",
  alternate_mobile: "Alternate number",
  email: "Email",
  language: "Language",
  photo: "Profile photo",
  education_tier: "Education level",
  specialisation: "Specialisation",
  home_address: "Home address",
};

export const profileFieldLabel = (field: string): string =>
  PROFILE_FIELD_LABELS[field] ??
  field
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

const asText = (v: unknown): string => (v === null || v === undefined || v === "" ? "—" : typeof v === "string" ? v : JSON.stringify(v));

/** Each changed field with its current and requested value as text. `changes` maps a field to {from, to}; an older row may hold the bare new value. */
export function changeRows(request: ChangeRequest): { field: string; label: string; from: string; to: string }[] {
  return Object.entries(request.changes ?? {}).map(([field, v]) => {
    const pair = v && typeof v === "object" && ("from" in v || "to" in v) ? (v as { from?: unknown; to?: unknown }) : { to: v };
    return { field, label: profileFieldLabel(field), from: asText(pair.from), to: asText(pair.to) };
  });
}

/** What the profile screen says when a call fails. */
export function describeProfileError(err: unknown): string {
  if (!(err instanceof ApiError)) return err instanceof Error ? err.message : "Could not load your profile.";
  switch (err.status) {
    case 401:
      return "Your session has ended, or the DA Registry did not accept it. Sign in again.";
    case 403:
      return "Your account is not bound to a DA-ID, so there is no registry profile to show.";
    case 404:
      // The backend says which case it is: no registry id on the account, or no such record.
      return err.message || "Your record was not found in the DA Registry.";
    case 502:
    case 503:
    case 504:
      return "The DA Registry is unavailable. Try again shortly.";
    default:
      if (err.code === "DA_REGISTRY_NOT_CONFIGURED") return "Your profile could not be loaded right now. Try again later.";
      return err.message;
  }
}
