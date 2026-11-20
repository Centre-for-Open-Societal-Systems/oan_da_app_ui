"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type RefObject } from "react";
import { cn } from "@/lib/utils";
import { CERTIFICATE_BADGE, certificateFromFile, type Certificate } from "../qualifications";

const ACTION = "inline-flex h-8 items-center gap-1.5 rounded-md border px-3 text-[13px] font-semibold transition-colors";

interface CertificateDocumentsProps {
  certificates: Certificate[];
  /** Called with the new pending records for every file dropped or browsed. */
  onAdd: (added: Certificate[]) => void;
  /** Pass a ref to open the file picker from outside (e.g. a header "Upload certificate" button). */
  inputRef?: RefObject<HTMLInputElement | null>;
  className?: string;
}

// Certificates list + compact drop bar; uploads are added as pending until a supervisor verifies them.
export function CertificateDocuments({ certificates, onAdd, inputRef, className }: CertificateDocumentsProps) {
  const localRef = useRef<HTMLInputElement>(null);
  const fileInput = inputRef ?? localRef;
  const [isDragging, setIsDragging] = useState(false);

  const addFiles = (files: FileList | null) => {
    if (!files?.length) return;
    onAdd(Array.from(files).map(certificateFromFile));
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    addFiles(e.target.files);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className={cn("flex flex-col gap-4", className)}>
      <div>
        <h3 className="text-[15px] font-semibold text-ink">Certificates &amp; documents</h3>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          Upload certificates for supervisor verification.
        </p>
      </div>

      <ul className="overflow-hidden rounded-xl border border-line bg-white shadow-2xs divide-y divide-line">
        {certificates.map((cert) => {
          const badge = CERTIFICATE_BADGE[cert.status];
          return (
            <li key={cert.id} className="flex flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3.5 transition-colors hover:bg-surface/40">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-border bg-brand-tint text-brand-green shadow-2xs">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" />
                  <path d="M14 2v6h6" />
                </svg>
              </span>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2.5">
                  <span className="text-[14px] font-semibold text-ink">{cert.title}</span>
                  <span className={cn("inline-flex items-center rounded-[12px] px-3 py-0.5 text-[11px] font-bold uppercase tracking-wide shadow-2xs", badge.className)}>
                    {badge.label}
                  </span>
                </div>
                <p className="mt-0.5 truncate text-[12.5px] text-ink-soft">{cert.issuer}</p>
              </div>

              <div className="flex w-full items-center justify-between gap-3 pl-[56px] text-[13px] sm:w-auto sm:shrink-0 sm:flex-col sm:items-end sm:gap-1.5 sm:pl-0">
                <span className="font-mono text-[12px] text-muted">{cert.fileMeta ?? "—"}</span>
                <div className="flex items-center gap-2">
                  <a
                    href={cert.url ?? "#"}
                    target={cert.url ? "_blank" : undefined}
                    rel="noreferrer"
                    onClick={(e) => { if (!cert.url) e.preventDefault(); }}
                    className={cn(ACTION, "rounded-lg border-brand-border bg-brand-mint text-brand-green hover:bg-brand-tint shadow-2xs")}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7-10-7-10-7z" /><circle cx="12" cy="12" r="3" />
                    </svg>
                    View
                  </a>
                </div>
              </div>
            </li>
          );
        })}
      </ul>

      {/* Compact drop bar */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={cn(
          "flex items-center justify-center gap-2.5 rounded-xl border-2 border-dashed bg-surface/50 px-4 py-4 text-[13px] text-ink-soft transition-colors",
          isDragging ? "border-brand-green bg-brand-tint/60" : "border-slate-300 hover:border-brand-green/60 hover:bg-surface"
        )}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="text-brand-green shrink-0">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
        </svg>
        <span>
          Drag a file here or{" "}
          <button type="button" onClick={() => fileInput.current?.click()} className="font-semibold text-brand-green hover:underline cursor-pointer">
            browse your computer
          </button>
          {" "}· PDF, JPG or PNG · max 5 MB
        </span>
      </div>

      <input
        ref={fileInput}
        type="file"
        multiple
        accept="image/jpeg,image/png,application/pdf"
        className="hidden"
        onChange={handleInputChange}
      />
    </div>
  );
}
