"use client";

import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Spinner } from "@/components/ui/Spinner";

interface SubmitConfirmModalProps {
  farmerName: string;
  /** "Adama woreda, Kebele 07", or empty before a location is chosen. */
  place: string;
  completeTabs: number;
  totalTabs: number;
  onCancel: () => void;
  onConfirm: () => void;
  /** The registration is being sent; both buttons wait. */
  busy?: boolean;
}

// Last check before the registration goes to the supervisor.
export function SubmitConfirmModal({ farmerName, place, completeTabs, totalTabs, onCancel, onConfirm, busy = false }: SubmitConfirmModalProps) {
  const summary = ["Farmer", place, `${completeTabs} of ${totalTabs} tabs complete`].filter(Boolean).join(" · ");

  return (
    <Modal isOpen onClose={busy ? () => {} : onCancel} title="Submit this registration?" hideHeader bodyClassName="px-6 pb-6 pt-8">
      <div className="flex flex-col items-center text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-tint text-brand-green">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
          </svg>
        </span>
        <h2 id="modal-title" className="mt-5 text-[22px] font-bold text-ink">Submit this registration?</h2>
        <p className="mt-3 text-[14px] leading-relaxed text-ink-soft">
          {farmerName} will be sent to your supervisor for approval. You can still open the farmer from My Farmers while the review is pending.
        </p>
        <p className="mt-4 w-full rounded-lg border border-line bg-surface px-4 py-2.5 text-left text-[13px] font-medium text-ink">{summary}</p>
        <div className="mt-5 grid w-full grid-cols-2 gap-3">
          <Button variant="outline" onClick={onCancel} disabled={busy} className="h-11">
            Cancel
          </Button>
          <Button variant="brand" onClick={onConfirm} disabled={busy} className="h-11 gap-2">
            {busy ? (
              <Spinner />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 6L9 17l-5-5" />
              </svg>
            )}
            {busy ? "Sending to the registry…" : "Yes, submit"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
