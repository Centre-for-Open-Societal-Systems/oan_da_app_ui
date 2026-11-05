"use client";

import { useRef, useState, type ChangeEvent, type DragEvent, type ReactNode } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Select } from "@/components/ui/Select";
import { CERTIFICATE_TYPES, REVIEW_OWNER, useCertificatesStore, type CertificateType } from "@/features/performance";
import { cn, todayIso } from "@/lib/utils";

const MAX_SIZE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["application/pdf", "image/jpeg", "image/png"];
const DA_NAME = "Abebe Kebede";

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);
/** "2026-09-28" → "28 Sep 2026". */
const displayDate = (iso: string) => new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-GB", { timeZone: "UTC", day: "2-digit", month: "short", year: "numeric" });

interface Form {
  name: string;
  issuer: string;
  credentialId: string;
  notes: string;
  type: CertificateType | "";
  issuedOn: string;
  expiresOn: string;
}
const blankForm = (): Form => ({ name: "", issuer: "", credentialId: "", notes: "", type: "", issuedOn: todayIso(), expiresOn: "" });

function Panel({ title, children, className }: { title: string; children: ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-xl border border-line bg-white shadow-card", className)}>
      <h3 className="border-b border-line px-5 py-4 text-[15.5px] font-semibold text-ink">{title}</h3>
      <div className="px-5 py-5">{children}</div>
    </section>
  );
}

// DA uploads an external credential; it enters as Pending verification for the Woreda. Agrilearn certificates sync on their own.
export function AddCertificateModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const add = useCertificatesStore((s) => s.add);
  const inputRef = useRef<HTMLInputElement>(null);
  const [form, setForm] = useState<Form>(blankForm);
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const set = (key: keyof Form) => (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const errors: Partial<Record<keyof Form, string>> = {};
  if (!form.name.trim()) errors.name = "Enter the certificate name.";
  if (!form.issuer.trim()) errors.issuer = "Enter the issuing organisation.";
  if (!form.credentialId.trim()) errors.credentialId = "Enter the credential or reference ID.";
  if (!form.type) errors.type = "Choose a certificate type.";
  if (!form.issuedOn) errors.issuedOn = "Enter the issue date.";
  else if (form.issuedOn > new Date().toISOString().slice(0, 10)) errors.issuedOn = "Issue date cannot be in the future.";
  if (form.expiresOn && form.issuedOn && form.expiresOn <= form.issuedOn) errors.expiresOn = "Expiry date must be after the issue date.";
  const show = (key: keyof Form) => (submitted ? errors[key] : undefined);

  const close = () => {
    setForm(blankForm());
    setFile(null);
    setFileError(null);
    setSubmitted(false);
    onClose();
  };

  const pick = (list: FileList | null) => {
    const picked = list?.[0];
    if (!picked) return;
    if (!ACCEPTED_TYPES.includes(picked.type) || picked.size > MAX_SIZE_BYTES) {
      setFileError(`${picked.name} was not added — use a PDF, JPG or PNG up to 5 MB.`);
      return;
    }
    setFileError(null);
    setFile(picked);
  };

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(errors).length > 0) return;
    add({
      id: `EXT-${Date.now()}`,
      name: form.name.trim(),
      issuer: form.issuer.trim(),
      credentialId: form.credentialId.trim(),
      provenance: "External upload",
      status: "Pending verification",
      type: form.type as CertificateType,
      issuedOn: displayDate(form.issuedOn),
      expiresOn: form.expiresOn ? displayDate(form.expiresOn) : undefined,
      notes: form.notes.trim() || undefined,
      uploadedBy: DA_NAME,
      reviewOwner: REVIEW_OWNER,
      document: file ? { name: file.name, meta: `${file.type === "application/pdf" ? "PDF" : file.type.split("/")[1].toUpperCase()} • ${formatSize(file.size)}`, url: URL.createObjectURL(file) } : undefined,
    });
    close();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Add External Certificate"
      subtitle="Upload an external credential for Woreda review. Agrilearn earned certificates sync automatically and cannot be added here."
      size="xl"
      className="max-w-[1040px]"
      bodyClassName="p-6"
      footer={
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={close}>Cancel</Button>
          <Button variant="brand" onClick={submit}>Submit for Verification</Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-[1.9fr_1fr]">
        <Panel title="Certificate Metadata">
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <FormField label="Certificate name" htmlFor="cert-name" required hint={show("name")} hintTone="error">
              <Input id="cert-name" value={form.name} onChange={set("name")} placeholder="Enter certificate name" />
            </FormField>
            <FormField label="Issuing organisation" htmlFor="cert-issuer" required hint={show("issuer")} hintTone="error">
              <Input id="cert-issuer" value={form.issuer} onChange={set("issuer")} placeholder="Enter issuing organisation" />
            </FormField>
            <FormField label="Credential / reference ID" htmlFor="cert-ref" required hint={show("credentialId")} hintTone="error" className="sm:col-span-2">
              <Input id="cert-ref" value={form.credentialId} onChange={set("credentialId")} placeholder="Enter credential / reference ID" />
            </FormField>
            <FormField label="Notes (optional)" htmlFor="cert-notes" className="sm:col-span-2">
              <Input id="cert-notes" value={form.notes} onChange={set("notes")} placeholder="Write here..." />
            </FormField>
            <FormField
              label="Certificate type"
              htmlFor="cert-type"
              required
              hint={show("type") ?? `Options: ${CERTIFICATE_TYPES.join(" • ")}`}
              hintTone={show("type") ? "error" : "muted"}
              className="sm:col-span-2"
            >
              <Select id="cert-type" value={form.type} onChange={set("type")}>
                <option value="" disabled>Select certificate type</option>
                {CERTIFICATE_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </Select>
            </FormField>
            <FormField label="Issue date" htmlFor="cert-issued" required hint={show("issuedOn")} hintTone="error">
              <Input id="cert-issued" type="date" value={form.issuedOn} onChange={set("issuedOn")} />
            </FormField>
            <FormField label="Expiry date (optional)" htmlFor="cert-expiry" hint={show("expiresOn")} hintTone="error">
              <Input id="cert-expiry" type="date" value={form.expiresOn} min={form.issuedOn || undefined} onChange={set("expiresOn")} />
            </FormField>
          </div>
        </Panel>

        <Panel title="Supporting Document">
          <div
            role="button"
            tabIndex={0}
            aria-label="Upload supporting document"
            onClick={() => inputRef.current?.click()}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            onDragOver={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e: DragEvent<HTMLDivElement>) => {
              e.preventDefault();
              setIsDragging(false);
              pick(e.dataTransfer.files);
            }}
            className={cn(
              "flex cursor-pointer flex-col items-center rounded-lg border-2 border-dashed px-4 py-7 text-center transition-colors",
              isDragging ? "border-brand-green bg-brand-mint" : "border-line bg-surface hover:border-brand-green/60",
            )}
          >
            <svg className="h-7 w-7 text-ink-soft" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
            </svg>
            <p className="mt-2 text-[13.5px] font-semibold text-ink">Drag and drop your file here or click to browse</p>
            <p className="mt-1.5 text-[12.5px] text-ink-soft">Accepted formats: .pdf, .jpg, .png<br />(Max size: 5MB)</p>
            <span className="mt-3 rounded-md border border-brand-green bg-white px-4 py-1.5 text-[13.5px] font-semibold text-brand-green">Browse</span>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,image/jpeg,image/png"
              className="hidden"
              onChange={(e) => {
                pick(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
          {fileError && <p className="mt-2 text-[12.5px] text-danger">{fileError}</p>}
          {file && (
            <div className="mt-3 flex items-center justify-between gap-3 rounded-lg border border-line px-3 py-2.5">
              <div className="min-w-0">
                <p className="truncate text-[13.5px] font-medium text-ink">{file.name}</p>
                <p className="text-[12px] text-muted">{formatSize(file.size)}</p>
              </div>
              <button type="button" onClick={() => setFile(null)} className="shrink-0 text-[13px] font-semibold text-danger hover:underline">Remove</button>
            </div>
          )}
        </Panel>
      </div>
    </Modal>
  );
}
