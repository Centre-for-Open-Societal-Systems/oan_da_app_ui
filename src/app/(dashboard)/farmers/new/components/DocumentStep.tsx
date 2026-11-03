"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
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

  const message = problem ?? errors.document;
  return (
    <div className="flex flex-col gap-3">
      <input ref={input} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={(e) => void upload(e.target.files?.[0])} />
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-line px-4 py-5">
        <Button type="button" variant="outline" onClick={() => input.current?.click()} disabled={uploading}>
          {form.document ? "Replace document" : "Choose ID document"}
        </Button>
        {uploading && (
          <span className="flex items-center gap-2 text-[13.5px] text-muted">
            <Spinner className="h-4 w-4" /> Uploading…
          </span>
        )}
        {!uploading && form.document && (
          <span className="text-[13.5px] text-ink">
            <span className="font-semibold">{form.document.name}</span> uploaded <span className="text-muted">(document {form.document.id})</span>
          </span>
        )}
        {!uploading && !form.document && <span className="text-[13.5px] text-muted">PDF, JPEG or PNG, up to 5 MB.</span>}
      </div>
      {message && (
        <p role="alert" className="text-[13px] text-danger">
          {message}
        </p>
      )}
    </div>
  );
}
