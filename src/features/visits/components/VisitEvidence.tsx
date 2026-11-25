"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { EVIDENCE_ACCEPT, EVIDENCE_KINDS, EVIDENCE_MAX_MB, evidenceProblem, formatVisitTime, uploadVisitEvidence, type ApiVisitDetail, type EvidenceKind, type VisitAttachment } from "../api";

type Gps = { lat: number; lng: number };

interface VisitEvidenceProps {
  visitId: string;
  /** Evidence already stored on the visit (from GET /visits/{id}); undefined while it loads. */
  existing?: ApiVisitDetail["attachments"];
}

// Evidence on a visit: a photo of the crop, land or animals, or a scanned document, geo-tagged with the
// device's position when the browser can get one (POST /visits/{id}/attachments).
export function VisitEvidence({ visitId, existing = [] }: VisitEvidenceProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [kind, setKind] = useState<EvidenceKind>("Crop");
  const [file, setFile] = useState<File | null>(null);
  const [gps, setGps] = useState<Gps | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Stored from this dialog, with the file picked (so it can be opened again); listed above what the visit already had.
  const [uploaded, setUploaded] = useState<(VisitAttachment & { local: File })[]>([]);
  const earlier = existing.filter((a) => !uploaded.some((u) => u.file === a.file));

  // Position for the geo-tag, asked once when the section opens; uploads go without one if it never comes.
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGps({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setGps(null),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }, []);

  const pick = (next: File | null) => {
    setFile(next);
    setError(next ? evidenceProblem(next) : null);
  };

  const upload = async () => {
    if (!file || evidenceProblem(file)) return;
    setUploading(true);
    setError(null);
    try {
      const stored = await uploadVisitEvidence(visitId, { file, kind, gps: gps ?? undefined });
      // The same bytes sent again come back as the row already stored; list it once.
      setUploaded((prev) => [{ ...stored, local: file }, ...prev.filter((a) => a.name !== stored.name)]);
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the file. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="overflow-hidden rounded-lg border border-line">
      <h3 className="flex items-center justify-between border-b border-line bg-surface px-4 py-3 text-[14.5px] font-semibold text-ink">
        Evidence
        <span className={cn("text-[12px] font-medium", gps ? "text-brand-green" : "text-muted")}>
          {gps ? `Geo-tag ${gps.lat.toFixed(4)}°, ${gps.lng.toFixed(4)}°` : "No location — uploads without a geo-tag"}
        </span>
      </h3>

      <div className="flex flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center">
        <Select aria-label="Evidence kind" value={kind} onChange={(e) => setKind(e.target.value as EvidenceKind)} className="h-10 sm:w-[140px]">
          {EVIDENCE_KINDS.map((k) => <option key={k}>{k}</option>)}
        </Select>
        <input
          ref={inputRef}
          type="file"
          accept={EVIDENCE_ACCEPT}
          aria-label="Evidence file"
          onChange={(e) => pick(e.target.files?.[0] ?? null)}
          className="min-w-0 flex-1 text-[13.5px] text-ink-soft file:mr-3 file:h-10 file:cursor-pointer file:rounded-md file:border file:border-line file:bg-white file:px-3 file:text-[13.5px] file:font-medium file:text-ink hover:file:bg-zinc-50"
        />
        <Button type="button" variant="brand" onClick={upload} disabled={!file || !!error || uploading} className="h-10 shrink-0">
          {uploading ? "Uploading…" : "Upload"}
        </Button>
      </div>
      <p className={cn("px-4 pb-3 text-[12.5px]", error ? "text-danger" : "text-muted")}>
        {error ?? `JPG, PNG, WEBP or PDF, up to ${EVIDENCE_MAX_MB} MB.`}
      </p>

      {uploaded.length + earlier.length > 0 && (
        <ul className="divide-y divide-line-soft border-t border-line">
          {uploaded.map((a) => (
            <EvidenceRow
              key={a.name}
              kind={a.kind}
              file={a.file}
              detail={`${a.gps.lat != null && a.gps.lng != null ? "Geo-tagged" : "No geo-tag"} · ${a.sync_state}`}
              onView={() => openLocalFile(a.local)}
            />
          ))}
          {earlier.map((a) => (
            <EvidenceRow key={a.file} kind={a.kind} file={a.file} detail={a.captured_at ? `Captured ${formatVisitTime(a.captured_at)}` : ""} />
          ))}
        </ul>
      )}
    </section>
  );
}

/** Opens a file picked on this device in a new tab (image or PDF viewer). */
function openLocalFile(file: File) {
  const url = URL.createObjectURL(file);
  window.open(url, "_blank", "noopener");
  // The tab has the bytes long before this; freeing the URL earlier would blank a slow PDF viewer.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

// A saved file can be opened only once the backend serves visit evidence (it has no view route yet).
const NO_VIEW_ROUTE = "Opening a saved file needs the visit evidence view API (not available yet).";

function EvidenceRow({ kind, file, detail, onView }: { kind: string; file: string; detail: string; onView?: () => void }) {
  const name = file.split("/").pop();
  return (
    <li className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13.5px]">
      <span className="min-w-0 truncate text-ink">
        <span className="mr-2 rounded bg-slate-100 px-1.5 py-0.5 text-[11.5px] font-medium text-slate-600">{kind}</span>
        {name}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {detail && <span className="text-[12px] text-muted">{detail}</span>}
        <button
          type="button"
          onClick={onView}
          disabled={!onView}
          aria-label={`View ${name}`}
          title={onView ? `View ${name}` : NO_VIEW_ROUTE}
          className="inline-flex h-7 w-7 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 transition-colors hover:border-brand-green hover:text-brand-green disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-slate-200 disabled:hover:text-slate-500"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
        </button>
      </span>
    </li>
  );
}
