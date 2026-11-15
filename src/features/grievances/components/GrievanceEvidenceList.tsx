"use client";

import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Pill";
import { Spinner } from "@/components/ui/Spinner";
import { formatGrievanceTime } from "../api";
import { evidenceScanLabel, listGrievanceEvidence, MAX_EVIDENCE_FILES, openGrievanceEvidence, type GrievanceAttachment } from "../evidence";

const formatFileSize = (bytes: number | null) => (bytes == null ? "" : bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

/** Why a document that is not Clean cannot be opened. */
const withheld = (a: GrievanceAttachment) => (a.scan_status === "Infected" ? "Failed the virus scan and cannot be opened." : "Being scanned for viruses. Refresh in a moment.");

/**
 * The evidence documents on a grievance (GET /grievances/{id}/attachments), each with its virus-scan status. A Clean
 * document opens in a new tab or downloads; a Pending or Infected one is listed but cannot be opened.
 */
export function GrievanceEvidenceList({ ticketId }: { ticketId: string }) {
  /** What the last read returned, and for which ticket; null until the first one finishes. */
  const [loaded, setLoaded] = useState<{ ticketId: string; items: GrievanceAttachment[]; error: string | null } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  /** The document being opened or downloaded, and what went wrong with the last one. */
  const [busy, setBusy] = useState<string | null>(null);
  const [openError, setOpenError] = useState<string | null>(null);

  const read = useCallback(
    () =>
      listGrievanceEvidence(ticketId)
        .then(({ items }) => ({ ticketId, items, error: null }))
        .catch((err: unknown) => ({ ticketId, items: [], error: err instanceof Error ? err.message : "Could not load the evidence documents." })),
    [ticketId],
  );

  useEffect(() => {
    let current = true;
    void read().then((next) => current && setLoaded(next));
    return () => {
      current = false;
    };
  }, [read]);

  const refresh = async () => {
    setRefreshing(true);
    setOpenError(null);
    setLoaded(await read());
    setRefreshing(false);
  };

  const open = async (attachment: GrievanceAttachment, download: boolean) => {
    // The tab is opened now, inside the click, and pointed at the file once it arrives; opened later it would be blocked.
    const tab = download ? null : window.open("", "_blank");
    setBusy(attachment.attachment_id);
    setOpenError(null);
    try {
      await openGrievanceEvidence(ticketId, attachment, { tab, download });
    } catch (err) {
      setOpenError(`${attachment.file_name}: ${err instanceof Error ? err.message : "could not be opened."}`);
    } finally {
      setBusy(null);
    }
  };

  const state = loaded && loaded.ticketId === ticketId ? loaded : null;
  const items = state?.items ?? [];

  return (
    <section aria-labelledby="grievance-evidence-title" className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <h3 id="grievance-evidence-title" className="text-[15px] font-semibold text-ink">
          Evidence documents{state && !state.error ? ` (${items.length}/${MAX_EVIDENCE_FILES})` : ""}
        </h3>
        <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={!state || refreshing} className="gap-2">
          {refreshing && <Spinner className="h-3.5 w-3.5" />}
          Refresh
        </Button>
      </div>

      {!state ? (
        <p className="flex items-center gap-2 text-[13.5px] text-muted"><Spinner className="h-4 w-4" /> Loading documents…</p>
      ) : state.error ? (
        <p role="alert" className="text-[13.5px] text-danger">{state.error}</p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-line bg-surface px-4 py-4 text-[13.5px] text-muted">No evidence documents on this grievance.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {items.map((a) => {
            const scan = evidenceScanLabel(a.scan_status);
            const working = busy === a.attachment_id;
            return (
              <li key={a.attachment_id} className="flex flex-wrap items-center gap-3 rounded-xl border border-line bg-white px-3 py-2.5">
                <div className="min-w-0 flex-1 basis-[220px]">
                  <p className="truncate text-[13.5px] font-semibold text-ink" title={a.file_name}>{a.file_name}</p>
                  <p className="text-[12px] text-muted">
                    {[formatFileSize(a.size_bytes), a.document_type, a.uploaded_at ? formatGrievanceTime(a.uploaded_at) : ""].filter(Boolean).join(" · ")}
                  </p>
                  {!a.viewable && <p className="mt-0.5 text-[12px] text-ink-soft">{withheld(a)}</p>}
                </div>
                <Pill tone={scan.tone} className="px-2.5 py-0.5">{scan.label}</Pill>
                {a.viewable && (
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="brandOutline" size="sm" disabled={working} onClick={() => void open(a, false)} className="gap-2" aria-label={`Open ${a.file_name}`}>
                      {working && <Spinner className="h-3.5 w-3.5" />}
                      Open
                    </Button>
                    <Button variant="outline" size="sm" disabled={working} onClick={() => void open(a, true)} aria-label={`Download ${a.file_name}`}>
                      Download
                    </Button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {openError && <p role="alert" className="text-[13px] text-danger">{openError}</p>}
    </section>
  );
}
