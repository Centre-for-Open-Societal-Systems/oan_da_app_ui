"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import { MIN_NOTE } from "./approvals";

interface ReviewDecisionModalProps {
  /** Ids under review; null keeps the dialog closed. */
  reviewIds: string[] | null;
  reason: string;
  reasonError: boolean;
  onReasonChange: (value: string) => void;
  onClose: () => void;
  onSubmit: (decision: "changes" | "reject") => void;
}

// Reject / Request changes — reason is mandatory and goes to the applicant + audit trail.
export function ReviewDecisionModal({ reviewIds, reason, reasonError, onReasonChange, onClose, onSubmit }: ReviewDecisionModalProps) {
  return (
    <Modal
      isOpen={reviewIds !== null}
      onClose={onClose}
      title="Record Review Decision"
      bodyClassName="px-4 py-4 sm:px-6"
      footer={
        <>
          <Button variant="outline" onClick={onClose} className="sm:mr-auto">
            Cancel
          </Button>
          <Button variant="dangerOutline" onClick={() => onSubmit("changes")}>
            Request changes
          </Button>
          <Button variant="danger" onClick={() => onSubmit("reject")}>
            Reject
          </Button>
        </>
      }
    >
      <p className="text-[13.5px] leading-relaxed text-muted">
        Return {reviewIds && reviewIds.length > 1 ? `these ${reviewIds.length} DA submissions to their applicants` : "this DA submission to the applicant"} or reject it. The applicant is notified and the audit trail is updated.
      </p>
      <FormField
        label="Reason"
        htmlFor="review-reason"
        required
        hint={`At least ${MIN_NOTE} characters.`}
        hintTone={reasonError || (reason.trim().length > 0 && reason.trim().length < MIN_NOTE) ? "error" : "muted"}
        className="mt-4 [&>label]:text-[13px] [&>label]:text-slate-600"
      >
        <Textarea
          id="review-reason"
          rows={3}
          value={reason}
          onChange={(e) => onReasonChange(e.target.value)}
          placeholder="e.g. Education certificate unclear — please re-upload."
          className={cn("border-zinc-200", reasonError && "border-danger")}
        />
      </FormField>
    </Modal>
  );
}
