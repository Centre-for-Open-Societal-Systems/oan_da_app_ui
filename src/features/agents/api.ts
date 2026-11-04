import { authRequest } from "@/features/auth";
import { ApiError } from "@/lib/api";
import type { ActiveStatus, Agent, ApprovalStatus, FaydaStatus, TeamMember } from "./types";

// DA Registry reads through DA Services (docs/da-registry-integration.md in DA-services-backend). In the
// backend's "user" mode these calls carry the signed-in user's own staff IAM token to the registry (see
// features/auth/iam); a password session then gets 401. In "service" mode any DA Services session works.

/** One DA as the registry projects it (DAReference.to_dict): GET /agents, GET /agents/{da_id}, and /me `agent`. */
export interface ApiAgent {
  da_id: string;
  full_name: string;
  active_status: string;
  approval_status: string;
  region?: string | null;
  zone?: string | null;
  woreda?: string | null;
  kebele?: string | null;
  region_name?: string | null;
  zone_name?: string | null;
  woreda_name?: string | null;
  kebele_name?: string | null;
  education_tier?: string | null;
  fayda_status?: string | null;
  fayda_id?: string | null;
  phone?: string | null;
  email?: string | null;
  language?: string | null;
  specialisation?: string | null;
  position?: string | null;
  /** ISO date. */
  joined_at?: string | null;
  farmer_count?: number | null;
  photo_url?: string | null;
  /** ISO timestamp of the registry read. */
  fetched_at?: string | null;
  [field: string]: unknown;
}

export interface ListAgentsParams {
  /** Part of a DA-ID or name. */
  search?: string;
  /** Codes, e.g. "ET04", "ET04-W01". */
  region?: string;
  woreda?: string;
  kebele?: string;
  activeStatus?: string;
  educationTier?: string;
  limit?: number;
  start?: number;
}

const query = (params: Record<string, string | number | undefined>) =>
  new URLSearchParams(Object.entries(params).flatMap(([k, v]) => (v === undefined || v === "" ? [] : [[k, String(v)]]))).toString();

/** GET /da-services/agents: the DAs in the caller's scope (Supervisor: Woreda, Executive: Region, Admin: all). */
export async function listAgents({ search, region, woreda, kebele, activeStatus, educationTier, limit = 50, start = 0 }: ListAgentsParams = {}): Promise<{ agents: ApiAgent[]; total: number }> {
  const res = await authRequest<{ data: { agents: ApiAgent[]; total: number } }>(
    `/da-services/agents?${query({ search, region, woreda, kebele, active_status: activeStatus, education_tier: educationTier, limit, start })}`,
  );
  return { agents: res.data.agents ?? [], total: res.data.total ?? 0 };
}

/** GET /da-services/agents/{da_id}: one DA, read live from the registry; 403 outside the caller's scope. */
export async function fetchAgentRecord(daId: string): Promise<ApiAgent> {
  return (await authRequest<{ data: ApiAgent }>(`/da-services/agents/${encodeURIComponent(daId)}`)).data;
}

const ACTIVE_STATUSES: readonly ActiveStatus[] = ["Active", "On-leave", "Separated", "Unassigned"];
const FAYDA_STATUSES: readonly FaydaStatus[] = ["Verified", "Pending", "Mismatch"];
const APPROVAL_STATUSES: readonly ApprovalStatus[] = ["Draft", "Awaiting review", "Changes requested", "Approved", "Published", "Rejected"];

const oneOf = <T extends string>(values: readonly T[], value: unknown, fallback: T): T => ((values as readonly string[]).includes(value as string) ? (value as T) : fallback);

export const toActiveStatus = (value: unknown): ActiveStatus => oneOf(ACTIVE_STATUSES, value, "Unassigned");
/** The registry does not hold a Fayda verification state, so it reads as Pending until the Fayda module does. */
export const toFaydaStatus = (value: unknown): FaydaStatus => oneOf(FAYDA_STATUSES, value, "Pending");
export const toApprovalStatus = (value: unknown): ApprovalStatus => oneOf(APPROVAL_STATUSES, value, "Published");

const UNASSIGNED = "—";

/** "2019-03-12" → "12 Mar 2019"; anything unparsable is shown as is. */
export function formatIsoDate(iso: string | null | undefined): string {
  if (!iso) return UNASSIGNED;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

/** "2026-10-15T09:12:00+03:00" → "15 Oct 2026, 09:12" (the table's two-line stamp splits on the comma). */
export function formatIsoStamp(iso: string | null | undefined): string {
  if (!iso) return UNASSIGNED;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return `${formatIsoDate(iso)}, ${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

/** The registry record as the Agents screens render it. Names win over codes where the registry gave both. */
export function apiAgentToAgent(a: ApiAgent): Agent {
  const approvalStatus = toApprovalStatus(a.approval_status);
  return {
    daId: a.da_id,
    fullName: a.full_name || a.da_id,
    faydaId: a.fayda_id || UNASSIGNED,
    faydaStatus: toFaydaStatus(a.fayda_status),
    activeStatus: toActiveStatus(a.active_status),
    educationTier: a.education_tier || UNASSIGNED,
    kebele: a.kebele_name || a.kebele || UNASSIGNED,
    woreda: a.woreda_name || a.woreda || "",
    region: a.region_name || a.region || "",
    farmerCount: a.farmer_count ?? 0,
    approvalStatus,
    // The registry publishes to MoA itself; the portal only knows whether the record is published.
    moaPublication: approvalStatus === "Published" ? "Published" : "Not sent",
    phone: a.phone || UNASSIGNED,
    specialisation: a.specialisation || UNASSIGNED,
    joinedAt: formatIsoDate(a.joined_at),
    updatedAt: formatIsoStamp(a.fetched_at),
    source: "DA Registry",
  };
}

/** One row of GET /da-services/experts. */
export interface ApiExpert {
  da_id: string;
  full_name: string;
  specialisation?: string | null;
  phone?: string | null;
  email?: string | null;
  language?: string | null;
  kebele?: string | null;
  woreda?: string | null;
  zone?: string | null;
  region?: string | null;
  active_status?: string | null;
}

export interface ListExpertsParams {
  /** Exact match, case-insensitive, e.g. "Crop production". */
  specialisation?: string;
  /** Part of a name, specialisation or DA-ID. */
  q?: string;
  limit?: number;
  start?: number;
}

/**
 * GET /da-services/experts: the active DAs with a specialisation in the caller's scope (DA and Supervisor: their
 * Woreda), never the caller's own record. For a DA this is their Woreda team.
 */
export async function listExperts({ specialisation, q, limit = 200, start = 0 }: ListExpertsParams = {}): Promise<{ items: ApiExpert[]; total: number; bySpecialisation: Record<string, number> }> {
  const res = await authRequest<{ data: ApiExpert[]; meta?: { total?: number; by_specialisation?: Record<string, number> } }>(
    `/da-services/experts?${query({ specialisation, q, limit, start })}`,
  );
  return { items: res.data ?? [], total: res.meta?.total ?? res.data?.length ?? 0, bySpecialisation: res.meta?.by_specialisation ?? {} };
}

export function expertToTeamMember(e: ApiExpert): TeamMember {
  return {
    daId: e.da_id,
    fullName: e.full_name || e.da_id,
    kebele: e.kebele || UNASSIGNED,
    woreda: e.woreda || "",
    region: e.region || "",
    specialisation: e.specialisation || UNASSIGNED,
    activeStatus: toActiveStatus(e.active_status),
    phone: e.phone || UNASSIGNED,
    email: e.email || undefined,
    language: e.language || undefined,
  };
}

/** The signed-in DA's own registry record (the `agent` of /me) as a team row, so it sits first in My Teams. */
export function agentToTeamMember(a: ApiAgent): TeamMember {
  return {
    ...expertToTeamMember(a),
    kebele: a.kebele_name || a.kebele || UNASSIGNED,
    woreda: a.woreda_name || a.woreda || "",
    region: a.region_name || a.region || "",
    farmerCount: a.farmer_count ?? undefined,
    joinedAt: a.joined_at ? formatIsoDate(a.joined_at) : undefined,
  };
}

// ---- Bulk agent import (OAN Administrator) --------------------------------------------------------------------

/** GET /da-services/agent-imports/template: the registry's import template v3. */
export interface ImportTemplate {
  version: string;
  file_name: string;
  columns: string[];
  required: string[];
  /** The header row as CSV, ready to save. */
  csv: string;
  max_rows: number;
  max_bytes: number;
}

export async function fetchImportTemplate(): Promise<ImportTemplate> {
  return (await authRequest<{ data: ImportTemplate }>("/da-services/agent-imports/template")).data;
}

export interface ImportRowError {
  /** Line in the file, header is 1. */
  row: number;
  column: string;
  message: string;
}

export interface ImportValidation {
  valid: boolean;
  /** Agent rows in the file. */
  rows: number;
  errors: ImportRowError[];
  message?: string;
}

const fileForm = (file: File) => {
  const form = new FormData();
  form.append("file", file, file.name);
  return form;
};

/** POST /da-services/agent-imports/validate: checks columns and every row; nothing reaches the registry. */
export async function validateImportFile(file: File): Promise<ImportValidation> {
  const res = await authRequest<{ data: ImportValidation; message?: string }>("/da-services/agent-imports/validate", { method: "POST", body: fileForm(file) });
  return { ...res.data, message: res.message };
}

/** One import handed to the registry (GET /agent-imports and the answer of POST /agent-imports). */
export interface AgentImport {
  /** DA Services' own id of the import event. */
  name: string;
  /** "Queued" once the registry has the file; "Failed" when it refused it. */
  status: string;
  file_name: string | null;
  rows: number | null;
  uploaded_by?: string | null;
  registry_import_id: string | null;
  registry_document_id?: string | null;
  error: string | null;
  created_at: string;
}

/**
 * POST /da-services/agent-imports: validates, then uploads and queues the file with the admin's own token.
 * A file with row errors is refused whole as ApiError 400; `importRowErrors` reads the rows from it.
 */
export async function importAgentsFile(file: File): Promise<AgentImport> {
  return (await authRequest<{ data: AgentImport }>("/da-services/agent-imports", { method: "POST", body: fileForm(file) })).data;
}

/** The row errors a refused import (400) came with, if any. */
export function importRowErrors(err: unknown): ImportRowError[] {
  if (!(err instanceof ApiError) || !err.details || typeof err.details !== "object") return [];
  const errors = (err.details as { errors?: unknown }).errors;
  return Array.isArray(errors) ? errors.filter((e): e is ImportRowError => !!e && typeof e === "object" && typeof (e as ImportRowError).message === "string") : [];
}

/** GET /da-services/agent-imports: imports made from DA Services, newest first. */
export async function listAgentImports(limit = 20, start = 0): Promise<AgentImport[]> {
  return (await authRequest<{ data: AgentImport[] }>(`/da-services/agent-imports?${query({ limit, start })}`)).data ?? [];
}

/**
 * What the portal calls an import's state. DA Services records "Queued" (it reports "Completed" as "Queued") the
 * moment the registry accepts the file and never hears back, so that state means "the registry has it", not
 * "processed": refused rows surface in the exceptions list, accepted agents in the registry's approval tasks.
 */
export function importStatusLabel(status: string): string {
  return status === "Queued" || status === "Completed" ? "Sent to registry" : status;
}

/** One row the registry refused, as the registry reports it; the field names are the registry's own. */
export type ImportException = Record<string, unknown>;

/** GET /da-services/agent-imports/exceptions: rows the registry could not import, newest first. */
export async function listImportExceptions(page = 1, pageSize = 50): Promise<{ items: ImportException[]; total: number }> {
  const res = await authRequest<{ data: ImportException[]; meta?: { total?: number } }>(`/da-services/agent-imports/exceptions?${query({ page, page_size: pageSize })}`);
  return { items: res.data ?? [], total: res.meta?.total ?? res.data?.length ?? 0 };
}

export interface ImportExceptionView {
  id: string;
  kind: string;
  name: string;
  reference: string;
  detail: string;
  raisedAt: string;
  /** Epoch ms of `raisedAt` for ordering; 0 when the registry gave no usable time. */
  raisedAtMs: number;
}

const EXCEPTIONS_PAGE = 50;

/**
 * Every refused row the registry still lists, newest first. The contract does not promise an order, so the pages
 * are read in turn (at most `maxPages`) and ordered here.
 */
export async function listAllImportExceptions(maxPages = 10): Promise<{ items: ImportExceptionView[]; total: number; truncated: boolean }> {
  const raw: ImportException[] = [];
  let total = 0;
  let page = 1;
  for (; page <= maxPages; page++) {
    const res = await listImportExceptions(page, EXCEPTIONS_PAGE);
    raw.push(...res.items);
    total = res.total || raw.length;
    if (res.items.length < EXCEPTIONS_PAGE || raw.length >= total) break;
  }
  const items = raw.map((item, i) => describeImportException(item, i)).sort((a, b) => b.raisedAtMs - a.raisedAtMs);
  return { items, total: Math.max(total, items.length), truncated: items.length < total };
}

const firstString = (item: ImportException, keys: string[]): string | undefined => {
  for (const key of keys) {
    const v = item[key];
    if (typeof v === "string" && v.trim()) return v;
    if (typeof v === "number") return String(v);
  }
  return undefined;
};

/** The registry stamps its rows in UTC without saying so; without this a browser reads them as local time. */
const registryUtc = (value: string | undefined): string | undefined => {
  if (!value) return value;
  const iso = value.trim().replace(" ", "T");
  return /^\d{4}-\d{2}-\d{2}T/.test(iso) && !/(Z|[+-]\d{2}(:?\d{2})?)$/i.test(iso) ? `${iso}Z` : value;
};

/** Best-effort reading of a registry exception row: the registry names its fields, not the portal. */
export function describeImportException(item: ImportException, index = 0): ImportExceptionView {
  const raised = registryUtc(firstString(item, ["created_at", "created_on", "received_at", "timestamp", "updated_at"]));
  const raisedMs = raised ? new Date(raised).getTime() : Number.NaN;
  return {
    id: firstString(item, ["id", "exception_id", "message_id", "incoming_message_id", "reference_id"]) ?? `exception-${index + 1}`,
    kind: firstString(item, ["exception_type", "type", "kind", "state", "status"]) ?? "Import exception",
    name: firstString(item, ["name", "full_name", "record_name", "da_name"]) ?? "Unknown agent",
    reference: firstString(item, ["fayda_id", "foundational_id", "da_id", "reference_id"]) ?? "",
    detail: firstString(item, ["reason", "error", "message", "detail", "description", "exception_message"]) ?? "The registry gave no reason.",
    raisedAt: formatIsoStamp(raised),
    raisedAtMs: Number.isNaN(raisedMs) ? 0 : raisedMs,
  };
}

/** What a list or profile screen says when a registry-backed call fails. */
export function describeAgentError(err: unknown): string {
  if (!(err instanceof ApiError)) return err instanceof Error ? err.message : "Could not load agents.";
  switch (err.status) {
    case 401:
      return "The DA Registry needs your staff (SSO) sign-in. Sign out and sign in again with the staff account option.";
    case 403:
      return "This record is outside your Region or Woreda.";
    case 404:
      return "Agent not found in the DA Registry.";
    case 502:
    case 503:
    case 504:
      return "The DA Registry is unavailable. Try again shortly.";
    default:
      return err.message;
  }
}
