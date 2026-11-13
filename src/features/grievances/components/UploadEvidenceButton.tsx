"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { uploadEvidenceDocument } from "../evidence";
import { UploadEvidenceModal } from "./UploadEvidenceModal";

/** "Upload Evidence" header button: opens the modal in "Find grievance" mode (search a Grievance ID, then upload). */
export function UploadEvidenceButton({ className }: { className?: string }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={cn(
          "inline-flex h-9 shrink-0 items-center gap-2 whitespace-nowrap rounded-md border border-brand-green bg-white px-3.5 text-[13.5px] font-semibold text-brand-green transition-colors hover:bg-brand-wash",
          className,
        )}
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><path d="M17 8l-5-5-5 5" /><path d="M12 3v12" />
        </svg>
        Upload Evidence
      </button>
      {open && (
        <UploadEvidenceModal
          onClose={() => setOpen(false)}
          // DUMMY until the backend releases the evidence-upload API: records the document in this browser only.
          onUpload={async (ticketId, file) => {
            await uploadEvidenceDocument(ticketId, file);
          }}
        />
      )}
    </>
  );
}
