"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { LIFECYCLE_DA, type LifecycleRequest, type LifecycleTransition } from "./lifecycle";

export type DecisionResult = "approved" | "first-approved" | "forwarded" | "rejected";

const COPY: Record<DecisionResult, { title: string; pill: string }> = {
  approved: { title: "Request approved", pill: "Approved" },
  "first-approved": { title: "Approved and forwarded", pill: "Sent for second approval" },
  forwarded: { title: "Forwarded to Admin", pill: "Awaiting Admin" },
  rejected: { title: "Request rejected", pill: "Rejected" },
};

// Centred confirmation after a decision is recorded (same layout as the other success popups).
export function DecisionResultModal({ result, transition, request, onClose }: { result: DecisionResult; transition: LifecycleTransition; request: LifecycleRequest; onClose: () => void }) {
  const rejected = result === "rejected";
  const { title, pill } = COPY[result];
  const what = <span className="font-semibold text-brand-green">{transition.title.toLowerCase()}</span>;
  const who = <span className="font-semibold text-brand-green">{LIFECYCLE_DA.name}</span>;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={title}
      hideHeader
      className="relative"
      bodyClassName="px-6 pb-6 pt-8"
      footer={
        <Button variant={rejected ? "danger" : "brand"} onClick={onClose} className="h-11 w-full">
          Done
        </Button>
      }
    >
      <button type="button" onClick={onClose} aria-label="Close" className="group absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full border border-slate-200/80 bg-slate-100 text-slate-500 transition-all duration-200 hover:scale-105 hover:border-red-400 hover:bg-red-50 hover:text-red-600 active:scale-95 cursor-pointer shadow-2xs hover:shadow-xs">
        <svg className="h-3.5 w-3.5 transition-transform duration-300 ease-in-out group-hover:rotate-90" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
          <path d="M6 6l12 12M18 6L6 18" />
        </svg>
      </button>
      <div className="flex flex-col items-center text-center">
        <span className={cn("flex h-[72px] w-[72px] items-center justify-center rounded-full", rejected ? "bg-danger-wash" : "bg-brand-tint")}>
          <span className={cn("flex h-12 w-12 animate-check-pop items-center justify-center rounded-full text-white", rejected ? "bg-danger" : "bg-brand-green")}>
            <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d={rejected ? "M6 6l12 12M18 6L6 18" : "M5 13l4 4L19 7"} />
            </svg>
          </span>
        </span>
        <h2 id="modal-title" className="mt-5 text-[22px] font-bold text-ink">{title}</h2>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
          {result === "approved" && <>The {what} request {request.id} for {who} has been approved. It takes effect on the effective date.</>}
          {result === "first-approved" && <>Your approval of the {what} request {request.id} for {who} is recorded. It now goes to the second approver.</>}
          {result === "forwarded" && <>The {what} request {request.id} for {who} has been forwarded to the Admin for the final approval.</>}
          {rejected && <>The {what} request {request.id} for {who} has been rejected. {LIFECYCLE_DA.name} can see your reason.</>}
        </p>
        <span
          className={cn(
            "mt-4 inline-flex items-center gap-2 rounded-full border px-3.5 py-1 text-[13px] font-semibold",
            rejected ? "border-danger-border bg-danger-wash text-danger" : "border-brand-border bg-brand-mint text-brand-green"
          )}
        >
          <span className="h-2 w-2 rounded-full bg-current" aria-hidden="true" />
          {pill}
        </span>
      </div>
    </Modal>
  );
}
