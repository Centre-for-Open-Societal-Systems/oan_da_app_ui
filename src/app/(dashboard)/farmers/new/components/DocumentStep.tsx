"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { cn } from "@/lib/utils";
import { describeFarmerError, documentProblem, uploadIdentityDocument } from "@/features/farmers";
import type { StepProps } from "./FarmerStep";

// The ID document is uploaded as soon as it is chosen (POST /farmers/registrations/documents); the registration then names
// it by its document_id.
export function DocumentStep({ form, update, errors }: StepProps) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const upload = async (file: File | undefined) => {
    if (!file) return;
    const local = documentProblem(file);
    if (local) return setProblem(local);
    setProblem(null);
    setUploading(true);
    try {
      update({ document: { id: await uploadIdentityDocument(file), name: file.name } });
    } catch (err) {
      setProblem(describeFarmerError(err));
    } finally {
      setUploading(false);
      if (input.current) input.current.value = "";
    }
  };

  const removeDoc = () => {
    update({ document: undefined });
    setProblem(null);
  };

  const message = problem ?? errors.document;

  return (
    <div className="flex flex-col gap-4">
      <input
        ref={input}
        type="file"
        accept="application/pdf,image/jpeg,image/png"
        className="hidden"
        onChange={(e) => void upload(e.target.files?.[0])}
      />

      {/* Uploaded Card State */}
      {form.document && !uploading ? (
        <div className="overflow-hidden rounded-xl border border-line bg-white p-4 sm:p-5 shadow-xs transition-all hover:border-slate-300">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-brand-green border border-brand-green/20">
                <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                  <polyline points="14 2 14 8 20 8" />
                  <line x1="16" y1="13" x2="8" y2="13" />
                  <line x1="16" y1="17" x2="8" y2="17" />
                  <polyline points="10 9 9 9 8 9" />
                </svg>
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="truncate text-sm sm:text-[15px] font-bold text-ink">
                    {form.document.name}
                  </h4>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-brand-green border border-brand-green/30">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                    Uploaded
                  </span>
                </div>
                <p className="mt-1 truncate text-xs text-muted font-mono">
                  Document ID: <span className="text-slate-600 font-semibold">{form.document.id}</span>
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => input.current?.click()}
                disabled={uploading}
                className="gap-1.5 text-xs font-semibold text-slate-700 hover:text-brand-green hover:border-brand-green"
              >
                <svg className="h-3.5 w-3.5 text-slate-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
                </svg>
                Replace document
              </Button>
              <button
                type="button"
                onClick={removeDoc}
                className="inline-flex items-center justify-center h-8 w-8 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                title="Remove document"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Empty / Upload Dropzone State */
        <div
          onClick={() => !uploading && input.current?.click()}
          className={cn(
            "group flex flex-col items-center justify-center rounded-xl border-2 border-dashed px-6 py-8 sm:py-10 text-center transition-all cursor-pointer",
            uploading
              ? "border-brand-green bg-emerald-50/20 cursor-wait"
              : message
                ? "border-danger/60 bg-rose-50/30 hover:border-danger hover:bg-rose-50/50"
                : "border-slate-200 bg-slate-50/50 hover:border-brand-green hover:bg-emerald-50/30 shadow-2xs"
          )}
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-brand-green border border-brand-green/20 mb-3 group-hover:scale-105 transition-transform">
            {uploading ? (
              <Spinner className="h-6 w-6 text-brand-green" />
            ) : (
              <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
              </svg>
            )}
          </div>

          <h3 className="text-[15px] font-bold text-ink">
            {uploading ? "Uploading document…" : "Upload Identity Document"}
          </h3>
          <p className="mt-1 text-xs sm:text-[13px] text-muted max-w-sm">
            {uploading
              ? "Please wait while your document is being uploaded."
              : "Drag and drop your file here, or click to choose from your device."}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <span className="rounded-md bg-slate-200/60 px-2 py-0.5 text-[11px] font-medium text-slate-600">PDF</span>
            <span className="rounded-md bg-slate-200/60 px-2 py-0.5 text-[11px] font-medium text-slate-600">JPEG</span>
            <span className="rounded-md bg-slate-200/60 px-2 py-0.5 text-[11px] font-medium text-slate-600">PNG</span>
            <span className="text-[11px] text-slate-400">· Up to 5 MB</span>
          </div>

          {!uploading && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                input.current?.click();
              }}
              className="mt-4 gap-2 text-xs font-semibold pointer-events-auto"
            >
              Choose ID document
            </Button>
          )}
        </div>
      )}

      {message && (
        <div role="alert" className="flex items-center gap-2 rounded-lg bg-rose-50 border border-rose-200 px-3.5 py-2.5 text-[13px] text-rose-700">
          <svg className="h-4 w-4 shrink-0 text-rose-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          <span>{message}</span>
        </div>
      )}
    </div>
  );
}
