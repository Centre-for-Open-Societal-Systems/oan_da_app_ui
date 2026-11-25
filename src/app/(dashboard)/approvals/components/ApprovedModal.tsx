"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import type { ApprovalResult } from "./approvals";

// Result of an approval. Approving hands the change to the DA Registry, which runs its own two-stage approval, so
// this reports what reached the registry and never says the DA's record has changed. A registry failure comes back
// on a successful decide call (registry_sync_state "Failed"), so it is shown here rather than as an error.
export function ApprovedModal({ result, onClose }: { result: ApprovalResult | null; onClose: () => void }) {
  const total = result ? result.sent + result.failed.length : 0;
  const allSent = result?.failed.length === 0;
  const title = allSent ? "Sent to the DA Registry" : "Approved, but not sent to the registry";
  return (
    <Modal
      isOpen={result !== null}
      onClose={onClose}
      title={title}
      hideHeader
      bodyClassName="px-6 pb-6 pt-8"
      footer={
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      }
    >
      {result && (
        <div className="flex flex-col items-center text-center">
          <span className={cn("flex h-16 w-16 animate-check-pop items-center justify-center rounded-full", allSent ? "bg-brand-tint text-brand-green" : "bg-warning-wash text-amber-600")}>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {allSent ? <path d="M5 13l4 4L19 7" /> : <path d="M12 8v5M12 17h.01" />}
            </svg>
          </span>
          <h2 id="modal-title" className="mt-5 text-[20px] font-semibold text-ink">{title}</h2>
          <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
            {total === 1 ? "The request was approved here." : `${total} requests were approved here.`} The DA Registry runs its own two-stage approval, and the DA&apos;s profile changes only after that.
          </p>
          <span className={cn("mt-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[13px] font-semibold", allSent ? "border-brand-border bg-brand-mint text-brand-green" : "border-warning-border-strong bg-warning-wash text-orange-700")}>
            {result.sent} of {total} sent · {result.failed.length} failed
          </span>
          {result.failed.length > 0 && (
            <ul className="mt-4 w-full space-y-1 text-left text-[13px] text-danger">
              {result.failed.map((f) => (
                <li key={f.id}>
                  {f.id}: {f.error}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Modal>
  );
}
