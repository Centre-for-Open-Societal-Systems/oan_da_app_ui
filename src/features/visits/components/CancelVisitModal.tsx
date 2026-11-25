"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Textarea } from "@/components/ui/Textarea";
import { cancelVisit, type ApiVisit } from "../api";
import type { VisitRecord } from "../types";

interface CancelVisitModalProps {
  visit: VisitRecord;
  onClose: () => void;
  onCancelled: (visit: ApiVisit) => void;
}

// Cancel a visit that has not been closed yet (POST /visits/{id}/cancel); the reason is kept on the visit.
export function CancelVisitModal({ visit, onClose, onCancelled }: CancelVisitModalProps) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!reason.trim()) {
      setError("Give a reason for cancelling.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      onCancelled(await cancelVisit(visit.id, reason.trim()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not cancel the visit. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Cancel Visit"
      subtitle={`${visit.farmerName} · ${visit.date}, ${visit.time}`}
      bodyClassName="px-4 py-4 sm:px-6"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving} className="sm:mr-auto">
            Keep visit
          </Button>
          <Button variant="danger" onClick={submit} disabled={saving}>
            {saving ? "Cancelling…" : "Cancel visit"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {error && <Banner tone="error" title="Visit not cancelled">{error}</Banner>}
        <FormField label="Reason" htmlFor="cancel-reason" required hint="Required. Kept on the visit record.">
          <Textarea id="cancel-reason" rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Farmer moved" />
        </FormField>
        <p className="text-[12.5px] text-muted">The visit stays in the record as Cancelled. Plan a new visit if it is still needed.</p>
      </div>
    </Modal>
  );
}
