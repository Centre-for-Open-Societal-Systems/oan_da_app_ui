"use client";

import { useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { RowAction } from "@/components/ui/RowAction";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { cn, todayIso } from "@/lib/utils";
import { CERTIFICATE_TYPES, fileMeta, formatFileSize, type Certificate } from "@/features/farmers";
import { Banner } from "@/components/ui/Banner";

interface UploadCertificateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (certificate: Certificate) => void;
}

const FORM_ID = "upload-certificate-form";
const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// "2026-02-18" -> "18 Feb 2026"
function formatDate(iso: string) {
  const [y, m, d] = iso.split("-");
  return `${d} ${MONTHS[Number(m) - 1]} ${y}`;
}

export function UploadCertificateModal({ isOpen, onClose, onSubmit }: UploadCertificateModalProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [issueDate, setIssueDate] = useState(todayIso());
  const [expiryDate, setExpiryDate] = useState("2028-02-18");

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setFileError(null);
      setIssueDate(todayIso());
      setExpiryDate("2028-02-18");
    }
  }, [isOpen]);

  const pickFile = (candidate: File | undefined) => {
    if (!candidate) return;
    if (!ACCEPTED_TYPES.includes(candidate.type)) {
      setFileError("Only PDF, JPG or PNG files are supported.");
      return;
    }
    if (candidate.size > MAX_SIZE_BYTES) {
      setFileError("File must be 5 MB or smaller.");
      return;
    }
    setFileError(null);
    setFile(candidate);
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    pickFile(e.target.files?.[0]);
    e.target.value = "";
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    pickFile(e.dataTransfer.files?.[0]);
  };

  const reset = () => {
    setFile(null);
    setFileError(null);
    setIssueDate(todayIso());
    setExpiryDate("2028-02-18");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!file) {
      setFileError("Choose a certificate file to upload.");
      return;
    }
    const data = new FormData(e.currentTarget);
    const name = String(data.get("name") ?? "").trim();
    const organisation = String(data.get("organisation") ?? "").trim();
    if (!name || !organisation || !issueDate) return;

    const issued = `issued ${formatDate(issueDate)}`;
    const expires = expiryDate ? ` · expires ${formatDate(expiryDate)}` : "";

    onSubmit({
      id: `${Date.now()}-${name}`,
      title: name,
      status: "pending",
      issuer: `${organisation} · ${issued}${expires}`,
      fileMeta: fileMeta(file),
      url: URL.createObjectURL(file),
    });
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Upload Certificate"
      subtitle="Add a certificate to your record"
      size="lg"
      bodyClassName="px-4 py-4 sm:px-6"
      footer={
        <>
          <Button type="button" variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="brand" className="gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12" />
            </svg>
            Upload &amp; submit for verification
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
        {/* File */}
        <div className="flex flex-col gap-2">
            <p className="text-[14px] font-medium text-ink">
              Certificate file <span className="text-danger">*</span>
            </p>
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => inputRef.current?.click()}
              className={cn(
                "flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed bg-surface-alt px-4 py-6 text-center transition-colors hover:border-brand-green/50",
                isDragging ? "border-brand-green bg-brand-tint" : "border-gray-300",
              )}
            >
              <svg className="h-5 w-5 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
              </svg>
              <p className="mt-2.5 text-[13.5px] font-semibold text-ink">
                {file ? "Choose a different file from your computer" : "Choose a file from your computer"}
              </p>
              <p className="mt-1 text-[12.5px] text-muted">PDF, JPG, PNG · max 5 MB</p>
            </div>

            {file && (
              <div className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-mint px-3.5 py-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-white text-brand-green">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6" />
                  </svg>
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{file.name}</p>
                  <p className="mt-0.5 text-[12.5px] text-ink-soft">{formatFileSize(file.size)} · selected from this computer</p>
                </div>
                <RowAction tone="danger" icon="remove" onClick={() => setFile(null)}>
                  Remove
                </RowAction>
              </div>
            )}
            {fileError && <p className="text-[12.5px] text-danger">{fileError}</p>}

            <input ref={inputRef} type="file" accept="application/pdf,image/jpeg,image/png" className="hidden" onChange={handleInputChange} />
        </div>

        <FormField label="Certificate name" htmlFor="cert-name" required>
          <Input id="cert-name" name="name" className="h-10" defaultValue="Integrated Pest Management" required />
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Issuing organisation" htmlFor="cert-org" required>
            <Input id="cert-org" name="organisation" className="h-10" defaultValue="Ethiopian Agricultural Transformation Institute" required />
          </FormField>
          <FormField label="Certificate type" htmlFor="cert-type" required>
            <Select id="cert-type" name="type" className="h-10" defaultValue={CERTIFICATE_TYPES[0]}>
              {CERTIFICATE_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Issue date" htmlFor="cert-issued" required>
            <DatePicker
              id="cert-issued"
              name="issueDate"
              value={issueDate}
              onChange={setIssueDate}
              placeholder="Select issue date"
              maxDate={todayIso()}
              className="h-10 w-full"
              required
            />
          </FormField>
          <FormField label="Expiry date" htmlFor="cert-expires">
            <DatePicker
              id="cert-expires"
              name="expiryDate"
              value={expiryDate}
              onChange={setExpiryDate}
              placeholder="Select expiry date"
              minDate={issueDate || undefined}
              className="h-10 w-full"
            />
          </FormField>
          <FormField label="Credential / reference ID" htmlFor="cert-ref">
            <Input id="cert-ref" name="reference" className="h-10" defaultValue="ATI-IPM-2026-0417" />
          </FormField>
        </div>

        <FormField label="Notes (optional)" htmlFor="cert-notes">
          <Input id="cert-notes" name="notes" className="h-10" defaultValue="5-day residential course · field assessment passed" />
        </FormField>

        <Banner tone="warning">
          Certificates are submitted to your Woreda Extension Officer for verification. The record shows
          &ldquo;Pending verification&rdquo; until approved, and is not counted toward qualification tiers until then.
        </Banner>
      </form>
    </Modal>
  );
}
