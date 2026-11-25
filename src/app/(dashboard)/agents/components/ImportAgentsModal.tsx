"use client";

import { useEffect, useRef, useState, type DragEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { Spinner } from "@/components/ui/Spinner";
import {
  describeAgentError,
  fetchImportTemplate,
  importAgentsFile,
  importRowErrors,
  validateImportFile,
  type AgentImport,
  type ImportRowError,
  type ImportTemplate,
} from "@/features/agents";
import { downloadBlob } from "@/lib/download";
import { cn } from "@/lib/utils";

const ACCEPT = ".csv,.xlsx";
const MAX_ERRORS_SHOWN = 25;

const formatSize = (bytes: number) => (bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`);

interface Props {
  isOpen: boolean;
  onClose: () => void;
  /** The import the registry queued; the caller shows the outcome. */
  onImported: (imported: AgentImport) => void;
}

// §4.1 Intake: bulk import is the entry path for DA records (no manual Add DA). The file is checked first
// (POST /agent-imports/validate, nothing reaches the registry), then handed to the DA Registry with the
// administrator's own token (POST /agent-imports), where each row enters the two-stage approval.
export function ImportAgentsModal({ isOpen, onClose, onImported }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [template, setTemplate] = useState<ImportTemplate | null>(null);
  const [validation, setValidation] = useState<{ rows: number; errors: ImportRowError[]; message?: string } | null>(null);
  const [busy, setBusy] = useState<"validate" | "import" | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    fetchImportTemplate()
      .then((t) => !cancelled && setTemplate(t))
      .catch(() => {
        // The template is a convenience; validation reports the columns anyway.
      });
    return () => {
      cancelled = true;
    };
  }, [isOpen]);

  const pick = (next: File | null) => {
    setValidation(null);
    setError(null);
    if (next && template && next.size > template.max_bytes) {
      setFile(null);
      setError(`${next.name} is ${formatSize(next.size)}; the registry takes files up to ${formatSize(template.max_bytes)}.`);
      return;
    }
    setFile(next);
  };

  const close = () => {
    setFile(null);
    setValidation(null);
    setError(null);
    setBusy(null);
    onClose();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    pick(e.dataTransfer.files?.[0] ?? null);
  };

  const validate = async () => {
    if (!file) return;
    setBusy("validate");
    setError(null);
    try {
      const result = await validateImportFile(file);
      setValidation({ rows: result.rows, errors: result.errors, message: result.message });
    } catch (err) {
      setError(describeAgentError(err));
    } finally {
      setBusy(null);
    }
  };

  const runImport = async () => {
    if (!file) return;
    setBusy("import");
    setError(null);
    try {
      const imported = await importAgentsFile(file);
      onImported(imported);
      close();
    } catch (err) {
      // A refused file (400) names its rows; anything else is a registry or session problem.
      const rows = importRowErrors(err);
      if (rows.length > 0) setValidation({ rows: validation?.rows ?? 0, errors: rows, message: "Fix the rows listed and upload again." });
      else setError(describeAgentError(err));
    } finally {
      setBusy(null);
    }
  };

  const downloadTemplate = () => {
    if (!template) return;
    downloadBlob(new Blob(["﻿" + template.csv], { type: "text/csv;charset=utf-8" }), template.file_name || "DA_Import_Template.csv");
  };

  const hasRowErrors = (validation?.errors.length ?? 0) > 0;

  return (
    <Modal
      isOpen={isOpen}
      onClose={close}
      title="Import Agents (Bulk)"
      subtitle="CSV or XLSX in the DA Registry's import template v3. Each row enters the registry's two-stage approval."
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={close} disabled={busy !== null}>Cancel</Button>
          <Button variant="brandOutline" onClick={validate} disabled={!file || busy !== null}>
            {busy === "validate" && <Spinner className="mr-2" />}
            Validate only
          </Button>
          <Button variant="brand" onClick={runImport} disabled={!file || busy !== null || hasRowErrors}>
            {busy === "import" && <Spinner className="mr-2" />}
            Upload &amp; import
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Banner tone="error" onDismiss={() => setError(null)}>{error}</Banner>}
        {!file && <p className="text-[12.5px] text-muted">Choose a file to enable Validate only and Upload &amp; import.</p>}

        <div
          role="button"
          tabIndex={0}
          aria-label="Choose the import file"
          onClick={() => inputRef.current?.click()}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              inputRef.current?.click();
            }
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-6 text-center transition-colors sm:py-8",
            isDragging ? "border-brand-green bg-brand-tint" : "border-zinc-300 bg-surface hover:border-brand-green",
          )}
        >
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              pick(e.target.files?.[0] ?? null);
              e.target.value = "";
            }}
          />
          {file ? (
            <>
              <span className="text-[14px] font-semibold text-ink">{file.name}</span>
              <span className="text-[12.5px] text-muted">{formatSize(file.size)} · click to choose another file</span>
            </>
          ) : (
            <>
              <span className="text-[14px] font-medium text-ink">Drop the import file here or click to choose</span>
              <span className="text-[12.5px] text-muted">
                CSV or XLSX · template {template?.version ?? "v3"}
                {template ? ` · up to ${template.max_rows.toLocaleString()} agents, ${formatSize(template.max_bytes)}` : ""}
              </span>
            </>
          )}
        </div>

        {validation && (
          hasRowErrors ? (
            <div className="overflow-hidden rounded-lg border border-danger-border">
              <div className="flex items-center justify-between gap-3 bg-danger-wash px-4 py-2.5 text-[13px] text-red-800">
                <span className="font-semibold">
                  {validation.errors.length} row error{validation.errors.length === 1 ? "" : "s"} — nothing was sent to the registry.
                </span>
                {validation.rows > 0 && <span>{validation.rows.toLocaleString()} agents in the file</span>}
              </div>
              <table className="w-full text-left text-[13px]">
                <thead>
                  <tr className="border-y border-line bg-surface text-[12.5px] font-semibold text-slate-500">
                    <th className="px-4 py-2">Row</th>
                    <th className="px-4 py-2">Column</th>
                    <th className="px-4 py-2">Problem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line-soft text-ink-soft">
                  {validation.errors.slice(0, MAX_ERRORS_SHOWN).map((e, i) => (
                    <tr key={`${e.row}-${e.column}-${i}`}>
                      <td className="px-4 py-2 font-mono text-ink">{e.row}</td>
                      <td className="px-4 py-2">{e.column || "—"}</td>
                      <td className="px-4 py-2">{e.message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {validation.errors.length > MAX_ERRORS_SHOWN && (
                <p className="px-4 py-2 text-[12.5px] text-muted">…and {validation.errors.length - MAX_ERRORS_SHOWN} more.</p>
              )}
            </div>
          ) : (
            <Banner tone="success" title={validation.message ?? "File is ready to import"}>
              {validation.rows.toLocaleString()} agent{validation.rows === 1 ? "" : "s"} passed every check. Upload &amp; import hands the file to the DA Registry.
            </Banner>
          )
        )}

        <ul className="list-disc space-y-1 pl-5 text-[13px] text-ink-soft">
          <li>Every row is checked here first: required columns, 16-digit Fayda ID, duplicates, phone, email, EC birth month and year, joining date.</li>
          <li>A clean file is queued at the DA Registry with your own staff token; each agent then waits for the registry&rsquo;s Stage 1 and Stage 2 approval.</li>
          <li>Your imports and the rows the registry refuses show in &ldquo;Recent imports&rdquo; and &ldquo;Import exceptions&rdquo; below the registry table.</li>
        </ul>

        <div className="flex flex-wrap items-center justify-between gap-2 text-[13px]">
          <button type="button" onClick={downloadTemplate} disabled={!template} className="font-semibold text-brand-green hover:underline disabled:cursor-not-allowed disabled:opacity-60">
            Download template ({template?.version ?? "v3"}){template ? ` · ${template.columns.length} columns` : ""}
          </button>
          {template && <span className="text-muted">Required: {template.required.join(", ")}</span>}
        </div>
      </div>
    </Modal>
  );
}
