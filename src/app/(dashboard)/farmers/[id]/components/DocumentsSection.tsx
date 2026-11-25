"use client";

import { formatFileSize } from "@/features/farmers";
import { useEvidenceStore } from "@/features/grievances";
import { SectionCard } from "./SectionCard";

const uploadedOn = (iso: string) =>
  new Date(iso).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

/**
 * DUMMY: no API returns a farmer's documents yet, and grievances carry no farmer id. Until the backend provides both,
 * this lists the grievance evidence uploaded from this browser (see features/grievances/evidence).
 */
export function DocumentsSection() {
  const documents = useEvidenceStore((s) => s.documents);

  return (
    <SectionCard title="Documents" description="Grievance evidence documents" bodyClassName="p-0">
      {documents.length === 0 ? (
        <p className="px-4 py-8 text-center text-[13.5px] text-muted">No documents</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-[13.5px]">
            <thead className="bg-surface-alt text-[12.5px] font-semibold text-muted">
              <tr>
                <th className="px-4 py-2.5">Document</th>
                <th className="px-4 py-2.5">Grievance</th>
                <th className="px-4 py-2.5">Size</th>
                <th className="px-4 py-2.5">Uploaded on</th>
              </tr>
            </thead>
            <tbody>
              {documents.map((d) => (
                <tr key={d.id} className="border-t border-line">
                  <td className="px-4 py-3">
                    <div className="flex min-w-0 items-center gap-3">
                      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-brand-border-soft bg-brand-wash text-brand-green">
                        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          {d.type === "mp3" ? <><path d="M9 18V5l12-2v13" /><circle cx="6" cy="18" r="3" /><circle cx="18" cy="16" r="3" /></> : <><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" /><path d="M14 2v6h6" /></>}
                        </svg>
                      </span>
                      <div className="min-w-0">
                        <p className="truncate font-semibold text-ink" title={d.name}>{d.name}</p>
                        <p className="text-[12px] uppercase text-muted">{d.type}</p>
                      </div>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 font-medium text-ink">{d.ticketId}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{formatFileSize(d.size)}</td>
                  <td className="whitespace-nowrap px-4 py-3 text-ink-soft">{uploadedOn(d.uploadedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </SectionCard>
  );
}
