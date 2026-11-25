"use client";

import { useEffect, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { Dropdown } from "@/components/ui/Dropdown";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import { getInitials } from "@/features/farmers";
import { MAX_DEFERRAL_DAYS, MIN_DEFERRAL_REASON, NODAL_OFFICERS, type NodalOfficer } from "../data";

export interface DeferralRequest {
  reason: string;
  days: number;
  approver: NodalOfficer;
}

interface DeferSlaModalProps {
  onClose: () => void;
  onSubmit: (request: DeferralRequest) => void;
}

export function DeferSlaModal({ onClose, onSubmit }: DeferSlaModalProps) {
  const [mounted, setMounted] = useState(false);
  const [reason, setReason] = useState("");
  const [days, setDays] = useState("7");
  const [approverName, setApproverName] = useState("");

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const approver = NODAL_OFFICERS.find((o) => o.name === approverName) ?? null;
  const daysNum = Number(days);
  const reasonOk = reason.trim().length >= MIN_DEFERRAL_REASON;
  const daysOk = Number.isInteger(daysNum) && daysNum >= 1 && daysNum <= MAX_DEFERRAL_DAYS;
  const canSubmit = reasonOk && daysOk && approver !== null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !approver) return;
    onSubmit({ reason: reason.trim(), days: daysNum, approver });
  };

  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-ink/40 p-4 backdrop-blur-[2px]"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <form
        onSubmit={handleSubmit}
        role="dialog"
        aria-modal="true"
        aria-labelledby="defer-sla-title"
        className="flex w-full max-w-[450px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-6 py-4">
          <div className="flex items-start gap-2.5">
            <svg className="mt-0.5 h-5 w-5 text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18M12 14v4M10 16h4" />
            </svg>
            <div>
              <h2 id="defer-sla-title" className="text-[16px] font-semibold text-ink">Defer SLA</h2>
              <p className="mt-0.5 text-[12.5px] text-muted">Requires approval from a Senior Nodal Officer (L2)</p>
            </div>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-subtle transition-colors hover:bg-zinc-100 hover:text-ink">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex flex-col gap-5 bg-surface-alt px-6 py-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="defer-reason" className="text-[14px] font-medium text-ink">
              Reason for Deferral <span className="text-danger">*</span>{" "}
              <span className="text-[13px] font-normal text-subtle">(min. {MIN_DEFERRAL_REASON} characters)</span>
            </label>
            <Textarea
              id="defer-reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Describe why the SLA requires extension — e.g. awaiting lab results, pending inter-agency coordination, seasonal factor..."
              className="bg-surface text-[15px] placeholder:text-subtle"
            />
            <p className={cn("text-[12px]", reasonOk ? "text-brand-green" : "text-orange-600")}>
              {reason.trim().length} / {MIN_DEFERRAL_REASON} minimum characters
            </p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="defer-days" className="text-[14px] font-medium text-ink">
              Defer by (additional days) <span className="text-danger">*</span>
            </label>
            <Input
              id="defer-days"
              type="number"
              min={1}
              max={MAX_DEFERRAL_DAYS}
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className={cn("bg-surface", !daysOk && days !== "" && "border-danger focus:border-danger focus:ring-danger")}
            />
            <p className="text-[12px] text-muted">Maximum {MAX_DEFERRAL_DAYS} additional days. Subject to approver discretion.</p>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="defer-approver" className="text-[14px] font-medium text-ink">
              Senior Nodal Officer (L2) Approver <span className="text-danger">*</span>
            </label>
            <Dropdown
              id="defer-approver"
              value={approverName}
              onChange={setApproverName}
              placeholder="Select Senior Nodal Officer"
              options={NODAL_OFFICERS.map((o) => ({ value: o.name, label: o.name, description: `${o.organisation} · ${o.email}` }))}
              className="[&>button]:bg-surface [&>button]:text-[15px]"
            />
            {approver && (
              <div className="flex items-center gap-3 rounded-lg bg-slate-100 px-3 py-2.5">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-success-ink text-[11px] font-semibold text-white">
                  {getInitials(approver.name)}
                </span>
                <p className="min-w-0 text-[12.5px] leading-snug text-slate-600">
                  <span className="font-medium text-ink">{approver.name}</span> · {approver.organisation} ·
                  <br />
                  {approver.email}
                </p>
              </div>
            )}
          </div>

          {!canSubmit && <p className="text-[12.5px] text-muted">Complete every field marked * to enable Submit for Approval.</p>}
          <Banner tone="warning">Deferral requests are logged in the audit trail. The approver will be notified and must explicitly approve or reject
              the request. SLA clock continues until approval is granted.</Banner>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-line px-6 py-4">
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="brand" disabled={!canSubmit} className="gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" /></svg>
            Submit for Approval
          </Button>
        </div>
      </form>
    </div>,
    document.body,
  );
}
