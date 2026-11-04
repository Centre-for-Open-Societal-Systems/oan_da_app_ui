"use client";

import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import { APPROVAL_REQUEST_TONE, type ApprovalRequest } from "@/features/agents";
import { isOpen } from "./approvals";
import { ApprovalAuditTrail } from "./ApprovalAuditTrail";

interface ApprovalDetailProps {
  request: ApprovalRequest;
  note: string;
  onNoteChange: (value: string) => void;
  /** False while a decision is being saved or for a role that may only read the queue. */
  canDecide: boolean;
  /** Opens the review dialog (reject / request changes) prefilled with the note. */
  onReview: () => void;
  onApprove: () => void;
}

export function ApprovalDetail({ request: selected, note, onNoteChange, canDecide, onReview, onApprove }: ApprovalDetailProps) {
  const open = isOpen(selected) && canDecide;
  return (
    <Card className="flex animate-fade-in flex-col p-0 shadow-card">
      <div className="border-b border-line px-5 py-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[13px] uppercase tracking-wide text-slate-600">DA {selected.kind}</span>
            <Pill tone={APPROVAL_REQUEST_TONE[selected.status]}>{selected.status}</Pill>
          </div>
          <span className="text-[12px] text-slate-600">ID: {selected.id}</span>
        </div>
        <h2 className="mt-2.5 text-[20px] font-semibold tracking-tight text-ink">
          {selected.kind === "Onboarding" ? `DA onboarding - ${selected.data[0].value}` : selected.title}
        </h2>
        <p className="mt-2 flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-orange-100 text-[10px] font-semibold text-orange-700">{selected.submittedBy.initials}</span>
          Submitted by <span className="font-semibold text-ink">{selected.submittedBy.name}</span> (Agent ID: {selected.submittedBy.agentId})
          <span className="h-1 w-1 rounded-full bg-subtle" aria-hidden="true" />
          {selected.woreda}
        </p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-6 p-5 md:grid-cols-2">
        <section className="self-start overflow-hidden rounded-lg border border-line">
          <h3 className="border-b border-line bg-surface px-4 py-3 text-[14px] font-semibold text-ink">Submitted data</h3>
          <dl className="divide-y divide-line">
            {selected.data.map((row) => (
              <div key={row.label} className="flex items-center justify-between gap-4 px-4 py-3.5 text-[14px]">
                <dt className="text-ink-soft">{row.label}</dt>
                <dd className={cn("text-right font-semibold", row.verified ? "flex items-center gap-1 text-brand-green" : "text-ink")}>
                  {row.value}
                  {row.verified && (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <div className="flex flex-col gap-5">
          <ApprovalAuditTrail trail={selected.trail} />

          <FormField label="Reviewer feedback note" htmlFor="reviewer-note">
            <Textarea
              id="reviewer-note"
              rows={4}
              value={note}
              disabled={!open}
              onChange={(e) => onNoteChange(e.target.value)}
              placeholder="Add a note for the agent..."
              className="bg-surface disabled:opacity-60"
            />
          </FormField>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-line px-5 py-4 md:flex-row md:items-center md:justify-between">
        <p className="flex items-center gap-2 text-[13px] text-ink-soft">
          <svg className="h-4 w-4 shrink-0 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
          </svg>
          Approve sends the change to the DA Registry for its own two-stage approval
        </p>
        <div className="flex flex-wrap gap-3">
          <Button variant="dangerOutline" disabled={!open} onClick={onReview}>
            Reject
          </Button>
          <button
            type="button"
            disabled={!open}
            onClick={onReview}
            className="inline-flex shrink-0 whitespace-nowrap h-10 items-center justify-center rounded-md border border-warning-border-strong bg-white px-4 text-sm font-semibold text-orange-700 transition-colors hover:bg-warning-wash hover:text-orange-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Request changes
          </button>
          <Button variant="brand" disabled={!open} onClick={onApprove}>
            Approve
          </Button>
        </div>
      </div>
    </Card>
  );
}
