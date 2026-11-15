import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import { authRequest, getAccessToken } from "@/features/auth";
import { ApiError, currentCsrfToken } from "@/lib/api";
import { downloadBlob } from "@/lib/download";
import { useAuthStore } from "@/store/useAuthStore";

// Evidence: documents attached to a grievance after it is filed. DA Services passes them on to the Grievance Service,
// which checks each file's type from its content and virus-scans it. A new file is "Pending" until that scan finishes
// and can be opened only once it is "Clean". Contract: oan_da_app_services/docs/grievance-da-http.md (Evidence).

/** The Grievance Service's limits; DA Services and the service enforce them again. */
export const MAX_EVIDENCE_FILES = 10;
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
/** JPG, PNG, PDF and MP3: the only types the Grievance Service accepts. */
export const EVIDENCE_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "mp3"];
export const EVIDENCE_TYPES_LABEL = "PDF, PNG, JPG, MP3 Audio";

/** One document on a grievance, as POST and GET /grievances/{ticket_id}/attachments return it. */
export interface GrievanceAttachment {
  attachment_id: string;
  file_name: string;
  mime_type: string | null;
  size_bytes: number | null;
  document_type: string | null;
  /** "Pending", "Clean" or "Infected"; anything other than "Clean" cannot be opened. */
  scan_status: string | null;
  scanned_at: string | null;
  uploaded_at: string | null;
  /** True only once the virus scan passed. */
  viewable: boolean;
}

const attachmentsPath = (ticketId: string) => `/da-services/grievances/${encodeURIComponent(ticketId)}/attachments`;

/**
 * POST /grievances/{ticket_id}/attachments (multipart, one file): attaches `file` to the grievance. A refused file
 * (type, size, the 10-document limit) throws an ApiError whose message is the reason for that file.
 */
export async function uploadGrievanceEvidence(ticketId: string, file: File, documentType?: string): Promise<GrievanceAttachment> {
  const body = new FormData();
  body.append("files", file, file.name);
  if (documentType) body.append("document_type", documentType);
  try {
    const data = (await authRequest<{ data: { attachments?: GrievanceAttachment[] } | null }>(attachmentsPath(ticketId), { method: "POST", body })).data;
    const uploaded = data?.attachments?.[0];
    if (!uploaded) throw new ApiError("The document was not attached. Try again.", 502);
    return uploaded;
  } catch (err) {
    // A 400 names each refused file under `details`; show this file's own reason rather than the summary line.
    if (err instanceof ApiError && err.details?.[file.name]) throw new ApiError(err.details[file.name], err.status, err.details, err.code);
    throw err;
  }
}

/** GET /grievances/{ticket_id}/attachments: every document on the grievance, oldest first, and how many more fit. */
export async function listGrievanceEvidence(ticketId: string): Promise<{ items: GrievanceAttachment[]; remaining: number }> {
  const res = await authRequest<{ data: GrievanceAttachment[] | null; meta?: { remaining?: number } | null }>(attachmentsPath(ticketId));
  const items = res.data ?? [];
  const remaining = typeof res.meta?.remaining === "number" ? res.meta.remaining : Math.max(0, MAX_EVIDENCE_FILES - items.length);
  return { items, remaining };
}

/**
 * GET /grievances/{ticket_id}/attachments/{attachment_id}/view: the file itself (raw bytes, not the JSON envelope).
 * 409 while its scan is not Clean, 404 when it is not on this ticket.
 */
export async function fetchGrievanceEvidenceFile(ticketId: string, attachmentId: string): Promise<Blob> {
  const path = `/api/v1${attachmentsPath(ticketId)}/${encodeURIComponent(attachmentId)}/view`;
  const headers: Record<string, string> = {};
  // An IAM session's credentials are its cookies (the /api/v1 proxy adds the Bearer); other sessions send their token.
  if (useAuthStore.getState().tokens?.provider !== "iam") {
    const token = await getAccessToken();
    if (!token) throw new ApiError("Your session has ended. Please sign in again.", 401);
    headers.Authorization = `Bearer ${token}`;
  }
  const csrf = currentCsrfToken();
  if (csrf) headers["X-CSRF-Token"] = csrf;

  let res: Response;
  try {
    res = await fetch(path, { headers });
  } catch {
    throw new ApiError("Could not reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const text = (key: string) => (data && typeof data[key] === "string" ? (data[key] as string) : undefined);
    throw new ApiError(text("message") ?? `Could not open the document (${res.status}).`, res.status, undefined, text("code"));
  }
  return res.blob();
}

/**
 * Opens a Clean document in `tab` (a window the caller opened during the click, so the browser does not block it), or
 * saves it when there is no tab or `download` is set.
 */
export async function openGrievanceEvidence(ticketId: string, attachment: GrievanceAttachment, { tab, download = false }: { tab?: Window | null; download?: boolean } = {}): Promise<void> {
  let blob: Blob;
  try {
    blob = await fetchGrievanceEvidenceFile(ticketId, attachment.attachment_id);
  } catch (err) {
    tab?.close();
    throw err;
  }
  if (download || !tab) {
    tab?.close();
    downloadBlob(blob, attachment.file_name || attachment.attachment_id);
    return;
  }
  const url = URL.createObjectURL(blob);
  tab.location.href = url;
  // The tab has loaded the bytes long before this; freeing the URL earlier would blank a slow PDF viewer.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

/** What to show for a scan status, and the pill tone for it. */
export function evidenceScanLabel(status: string | null): { label: string; tone: "green" | "amber" | "red" } {
  if (status === "Clean") return { label: "Ready", tone: "green" };
  if (status === "Infected") return { label: "Blocked", tone: "red" };
  return { label: "Scanning", tone: "amber" };
}

// --- Farmer profile "Documents" tab ------------------------------------------------------------------------------

/** One evidence document uploaded from this browser. */
export interface EvidenceDocument {
  id: string;
  ticketId: string;
  name: string;
  size: number;
  /** File extension, lower case (e.g. "pdf"). */
  type: string;
  /** ISO time it was submitted. */
  uploadedAt: string;
}

interface EvidenceState {
  documents: EvidenceDocument[];
  add: (doc: EvidenceDocument) => void;
}

/**
 * DUMMY listing only: no API returns a farmer's documents yet, and grievances carry no farmer id. The upload itself is
 * real (uploadEvidenceDocument); this keeps the name, size and type of what this browser uploaded (never the file) so
 * the farmer profile's Documents tab can list it. Replace with the backend call once it is released.
 */
export const useEvidenceStore = create<EvidenceState>()(
  persist(
    (set) => ({
      documents: [],
      add: (doc) => set((s) => ({ documents: [doc, ...s.documents] })),
    }),
    { name: "da-grievance-evidence", storage: createJSONStorage(() => localStorage) },
  ),
);

/** Uploads one evidence document to the grievance, then notes it for the Documents tab. Throws when it is refused. */
export async function uploadEvidenceDocument(ticketId: string, file: File): Promise<EvidenceDocument> {
  const uploaded = await uploadGrievanceEvidence(ticketId, file);
  const doc: EvidenceDocument = {
    id: uploaded.attachment_id,
    ticketId,
    name: uploaded.file_name || file.name,
    size: uploaded.size_bytes ?? file.size,
    type: file.name.split(".").pop()?.toLowerCase() ?? "",
    uploadedAt: new Date().toISOString(),
  };
  useEvidenceStore.getState().add(doc);
  return doc;
}
