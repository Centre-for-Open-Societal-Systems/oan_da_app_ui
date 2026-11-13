"use client";

import { useRef, useState, type DragEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/utils";
import { fetchGrievance, formatGrievanceTime } from "../api";
import { GrievanceStatusPill } from "./GrievancePills";

export const MAX_EVIDENCE_FILES = 10;
export const MAX_EVIDENCE_BYTES = 10 * 1024 * 1024;
/** PDF, PNG, JPG, CSV, Excel (XLS / XLSX) and MP3 audio. */
const ACCEPTED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "csv", "xls", "xlsx", "mp3"];
const ACCEPT_ATTR = ACCEPTED_EXTENSIONS.map((e) => `.${e}`).join(",") + ",audio/mpeg";

const extensionOf = (name: string) => name.split(".").pop()?.toLowerCase() ?? "";
const formatFileSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

/**
 * Splits picked files into those to add and the reasons others were skipped: wrong type, over 10 MB, already
 * selected, or past the 10-document limit.
 */
export function pickEvidence(current: File[], picked: File[]): { added: File[]; skipped: string[] } {
  const added: File[] = [];
  const skipped: string[] = [];
  for (const f of picked) {
    if (!ACCEPTED_EXTENSIONS.includes(extensionOf(f.name))) skipped.push(`${f.name}: file type not allowed`);
    else if (f.size > MAX_EVIDENCE_BYTES) skipped.push(`${f.name}: larger than 10 MB`);
    else if ([...current, ...added].some((p) => p.name === f.name && p.size === f.size)) skipped.push(`${f.name}: already selected`);
    else if (current.length + added.length >= MAX_EVIDENCE_FILES) skipped.push(`${f.name}: limit of ${MAX_EVIDENCE_FILES} documents reached`);
    else added.push(f);
  }
  return { added, skipped };
}

type Outcome = { ok: true } | { ok: false; reason: string };

const FileIcon = ({ name }: { name: string }) => (
  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {extensionOf(name) === "mp3" ? <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></> : <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></>}
  </svg>
);

const plural = (n: number) => `${n} document${n === 1 ? "" : "s"}`;

/** The grievance found by "Find grievance". */
interface FoundGrievance {
  ticketId: string;
  subject: string;
  category: string;
  status: string;
  submittedAt: string;
}

interface UploadEvidenceModalProps {
  /** The grievance to attach to. Leave unset to show "Find grievance" first (e.g. from Visits). */
  ticketId?: string;
  onClose: () => void;
  onUpload: (ticketId: string, file: File) => Promise<void>;
}

/**
 * "Upload evidence": up to 10 documents (PDF, PNG, JPG, CSV, Excel, MP3; 10 MB each), picked by click or drag and
 * drop. Without a `ticketId` the user first searches a Grievance ID (GET /grievances/{id}); upload unlocks once it is
 * found. Submit sends each file through `onUpload`, then the modal switches to "Evidence submission result" listing
 * which were submitted and which failed; "Retry failed" resends only the failed ones.
 */
export function UploadEvidenceModal({ ticketId, onClose, onUpload }: UploadEvidenceModalProps) {
  const findMode = !ticketId;
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FoundGrievance | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const target = ticketId ?? found?.ticketId;

  const search = async () => {
    const id = query.trim();
    if (!id) {
      setSearchError("Enter a Grievance ID.");
      return;
    }
    setSearching(true);
    setSearchError(null);
    setFound(null);
    try {
      const g = await fetchGrievance(id);
      setFound({ ticketId: g.ticket_number || g.ticket_id || id, subject: g.subject, category: g.category, status: g.status, submittedAt: formatGrievanceTime(g.created_at) });
    } catch (err) {
      setSearchError(err instanceof ApiError && err.status === 404 ? `No grievance found with ID ${id}.` : err instanceof Error ? err.message : "Could not search the grievance. Please try again.");
    } finally {
      setSearching(false);
    }
  };

  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [skipped, setSkipped] = useState<string[]>([]);
  const [dragging, setDragging] = useState(false);
  const [saving, setSaving] = useState(false);
  /** Set when Submit is pressed with no document; cleared once one is added. */
  const [noFiles, setNoFiles] = useState(false);
  /** Per-file outcome once submitted; null while still picking files. */
  const [results, setResults] = useState<Map<File, Outcome> | null>(null);

  const remaining = MAX_EVIDENCE_FILES - files.length;
  const full = remaining <= 0;
  /** The dropzone is off while no grievance is found or the 10-document limit is reached. */
  const locked = full || !target;

  const add = (list: FileList | null) => {
    if (!list?.length) return;
    const { added, skipped: why } = pickEvidence(files, Array.from(list));
    setSkipped(why);
    if (added.length) {
      setFiles([...files, ...added]);
      setNoFiles(false);
    }
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (!locked) add(e.dataTransfer.files);
  };

  const close = () => {
    if (!saving) onClose();
  };

  /** Uploads `batch` one by one and merges the outcomes into `results`. */
  const send = async (batch: File[]) => {
    if (!target) return;
    setSaving(true);
    const next = new Map(results ?? []);
    for (const f of batch) {
      try {
        await onUpload(target, f);
        next.set(f, { ok: true });
      } catch (err) {
        next.set(f, { ok: false, reason: err instanceof Error ? err.message : "Failed to submit" });
      }
    }
    setResults(next);
    setSaving(false);
  };

  const submit = () => {
    if (!target) {
      setSearchError("Search a valid Grievance ID before submitting.");
      return;
    }
    if (!files.length) {
      setNoFiles(true);
      return;
    }
    void send(files);
  };

  if (results) {
    const failed = files.filter((f) => results.get(f)?.ok === false);
    const done = files.length - failed.length;
    return (
      <Modal
        isOpen
        onClose={close}
        title="Evidence submission result"
        subtitle={`Review the submission status of your ${plural(files.length)} for grievance ${target}.`}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={close} disabled={saving}>Close</Button>
            {failed.length > 0 && (
              <Button variant="brand" onClick={() => void send(failed)} disabled={saving} className="gap-2">
                {saving && <Spinner className="h-4 w-4" />}
                Retry failed ({failed.length})
              </Button>
            )}
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="rounded-xl border border-line bg-surface-alt px-4 py-3" role="status">
            {done > 0 && <p className="text-[14.5px] font-semibold text-brand-green">{plural(done)} successfully submitted</p>}
            {failed.length > 0 ? (
              <p className={cn("text-[13px] text-danger", done > 0 && "mt-1")}>
                {plural(failed.length)} failed to submit. You can retry the failed {failed.length === 1 ? "document" : "documents"}.
              </p>
            ) : (
              <p className="mt-1 text-[13px] text-muted">All documents are attached to the grievance.</p>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-semibold text-ink">Submission results ({plural(files.length)})</p>
            <ul className="flex flex-col gap-2">
              {files.map((f) => {
                const r = results.get(f);
                const ok = r?.ok === true;
                return (
                  <li key={`${f.name}-${f.size}`} className={cn("flex items-center gap-3 rounded-xl border px-3 py-2.5", ok ? "border-brand-border bg-brand-wash" : "border-danger-border bg-danger-wash")}>
                    <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border bg-white", ok ? "border-brand-border-soft text-brand-green" : "border-danger-border text-danger")}>
                      <FileIcon name={f.name} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13.5px] font-semibold text-ink" title={f.name}>{f.name}</p>
                      <p className={cn("truncate text-[12px]", ok ? "text-brand-green" : "text-danger")} title={r && !r.ok ? r.reason : undefined}>
                        {formatFileSize(f.size)} · {ok ? "Successfully submitted" : "Failed to submit"}
                      </p>
                    </div>
                    <span className={cn("shrink-0 text-[13px] font-semibold", ok ? "text-brand-green" : "text-danger")}>{ok ? "Submitted" : "Failed"}</span>
                  </li>
                );
              })}
            </ul>
          </div>

          {failed.length > 0 && done > 0 && (
            <p className="text-[12.5px] leading-relaxed text-muted">
              The {plural(done)} submitted {done === 1 ? "is" : "are"} saved. Retrying will only resubmit the failed {failed.length === 1 ? "document" : "documents"}; successful submissions will not be duplicated.
            </p>
          )}
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      isOpen
      onClose={close}
      title="Upload evidence"
      subtitle={findMode ? "Search for a grievance, review its details, then upload your documents." : `Attach up to ${MAX_EVIDENCE_FILES} supporting documents to grievance ${ticketId}.`}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={saving}>Cancel</Button>
          <Button variant="brand" onClick={submit} disabled={saving} className="gap-2">
            {saving && <Spinner className="h-4 w-4" />}
            Submit{files.length ? ` (${files.length})` : ""}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {findMode && (
          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-semibold text-ink">Find grievance</p>
            <form
              className="flex flex-col gap-1.5"
              onSubmit={(e) => {
                e.preventDefault();
                void search();
              }}
            >
              <label htmlFor="evidence-grievance-id" className="text-[13px] text-ink-soft">Grievance ID <span className="text-danger">*</span></label>
              <div className="flex gap-2">
                <input
                  id="evidence-grievance-id"
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setSearchError(null);
                    if (found) setFound(null);
                  }}
                  placeholder="e.g. GRV-2026-00128"
                  aria-invalid={!!searchError}
                  aria-describedby="evidence-grievance-hint"
                  disabled={saving}
                  className={cn(
                    "h-10 min-w-0 flex-1 rounded-md border bg-white px-3 text-[14px] text-ink outline-none transition-colors placeholder:text-muted focus:border-brand-green",
                    searchError ? "border-danger-border" : "border-line",
                  )}
                />
                <Button type="submit" variant="brand" disabled={searching || saving} className="h-10 shrink-0 gap-2 px-5">
                  {searching && <Spinner className="h-4 w-4" />}
                  Search
                </Button>
              </div>
              <p id="evidence-grievance-hint" role={searchError ? "alert" : undefined} className={cn("text-[12.5px]", searchError ? "font-medium text-danger" : "text-muted")}>
                {searchError ?? (found ? "Grievance verified. You can now upload documents." : "Search a valid Grievance ID to enable document upload.")}
              </p>
            </form>

            {found && (
              <div className="rounded-xl border border-line bg-surface-alt px-4 py-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-[14.5px] font-semibold text-brand-green">Grievance found · {found.ticketId}</p>
                  <GrievanceStatusPill status={found.status} />
                </div>
                <dl className="mt-3 grid grid-cols-1 gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
                  <div className="min-w-0">
                    <dt className="text-muted">Details</dt>
                    <dd className="mt-0.5 font-medium text-ink">{found.subject || "—"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted">Category</dt>
                    <dd className="mt-0.5 font-medium text-ink">{found.category || "—"}</dd>
                  </div>
                  <div className="min-w-0">
                    <dt className="text-muted">Submitted</dt>
                    <dd className="mt-0.5 font-medium text-ink">{found.submittedAt || "—"}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
        )}

        <div className="flex flex-col gap-2">
          <p className="text-[14px] font-semibold text-ink">{findMode ? "Upload evidence" : "Evidence documents"} <span className="text-danger">*</span></p>
          <div
            role="button"
            tabIndex={locked ? -1 : 0}
            aria-disabled={locked}
            aria-label="Browse or drop evidence documents"
            aria-describedby={noFiles ? "evidence-required" : undefined}
            onClick={() => !locked && inputRef.current?.click()}
            onKeyDown={(e) => {
              if (!locked && (e.key === "Enter" || e.key === " ")) {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              if (!locked) setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={cn(
              "flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-7 text-center transition-colors focus:outline-none focus-visible:border-brand-green",
              locked
                ? "cursor-not-allowed border-line bg-surface opacity-60"
                : dragging
                  ? "cursor-pointer border-brand-green bg-brand-wash"
                  : noFiles
                    ? "cursor-pointer border-danger-border bg-danger-wash hover:border-danger"
                    : "cursor-pointer border-line bg-surface-alt hover:border-brand-green/50 hover:bg-brand-wash/50",
            )}
          >
            <span className="flex h-11 w-11 items-center justify-center rounded-full bg-brand-tint text-brand-green">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
              </svg>
            </span>
            <span className="text-[14px] font-semibold text-ink">{full ? "Document limit reached" : !target ? "Find a grievance to upload documents" : "Click to browse or drag and drop documents"}</span>
            <span className="text-[12.5px] text-muted">PDF, PNG, JPG, CSV, XL, MP3 Audio · Up to {MAX_EVIDENCE_FILES} documents · 10 MB per document</span>
            <input ref={inputRef} type="file" multiple accept={ACCEPT_ATTR} className="hidden" onChange={(e) => { add(e.target.files); e.target.value = ""; }} />
          </div>
          {noFiles && (
            <p id="evidence-required" role="alert" className="flex items-center gap-1.5 text-[12.5px] font-medium text-danger">
              <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10" /><path d="M12 8v4M12 16h.01" /></svg>
              Select at least one document to submit.
            </p>
          )}
          {skipped.length > 0 && (
            <ul className="flex flex-col gap-0.5 text-[12.5px] text-danger">
              {skipped.map((s) => <li key={s}>{s}</li>)}
            </ul>
          )}
        </div>

        {files.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-[14px] font-semibold text-ink">Selected documents ({files.length}/{MAX_EVIDENCE_FILES})</p>
            <ul className="flex flex-col gap-2">
              {files.map((f) => (
                <li key={`${f.name}-${f.size}`} className="flex items-center gap-3 rounded-xl border border-brand-border bg-brand-wash px-3 py-2.5">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-brand-border-soft bg-white text-brand-green">
                    <FileIcon name={f.name} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13.5px] font-semibold text-ink" title={f.name}>{f.name}</p>
                    <p className="text-[12px] text-muted">{formatFileSize(f.size)} · Ready to submit</p>
                  </div>
                  <button type="button" disabled={saving} onClick={() => { setFiles(files.filter((p) => p !== f)); setSkipped([]); }}
                    className="shrink-0 rounded-md px-2 py-1 text-[13px] font-semibold text-danger transition-colors hover:bg-danger-wash disabled:opacity-50" aria-label={`Remove ${f.name}`}>
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        <p className="text-[12.5px] leading-relaxed text-muted">
          {full ? "You have reached the limit of 10 documents." : `You can add ${remaining} more document${remaining === 1 ? "" : "s"}.`} Each document must be 10 MB or smaller.
          <br />
          {target ? `Selected documents will be attached to ${target} on submission.` : "Documents will be attached to the grievance when you submit."}
        </p>
      </div>
    </Modal>
  );
}
