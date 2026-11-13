"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { todayIso } from "@/lib/utils";
import { getFarmer } from "@/features/farmers";
import { rescheduleVisit, type ApiVisit } from "../api";
import { RESCHEDULE_REASONS } from "../data";
import type { VisitRecord } from "../types";
import { VisitFarmerCard } from "./VisitFarmerCard";
import { VisitStatusPill } from "./VisitStatusPill";

interface RescheduleVisitModalProps {
  visit: VisitRecord | null;
  onClose: () => void;
  /** Backend visits only: the new Planned visit that replaces this one. */
  onRescheduled?: (visit: ApiVisit) => void;
}

export function RescheduleVisitModal({ visit, onClose, onRescheduled }: RescheduleVisitModalProps) {
  if (!visit) return null;
  return <RescheduleForm visit={visit} onClose={onClose} onRescheduled={onRescheduled} />;
}

// Backend visits (they carry a physical status) are moved with POST /visits/{id}/reschedule; sample visits
// just close the dialog as before.
function RescheduleForm({ visit, onClose, onRescheduled }: RescheduleVisitModalProps & { visit: VisitRecord }) {
  const farmer = getFarmer(visit.farmerId);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (visit.physicalStatus === undefined) {
      onClose();
      return;
    }
    const form = new FormData(e.currentTarget);
    setSaving(true);
    setError(null);
    try {
      const moved = await rescheduleVisit(visit.id, {
        date: String(form.get("date")),
        time: String(form.get("time")),
        reason: String(form.get("reason")),
      });
      onRescheduled?.(moved);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reschedule the visit. Please try again.");
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Reschedule Visit"
      titleAddon={<VisitStatusPill status={visit.status} className="min-w-0" />}
      size="xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="submit" form="reschedule-visit-form" variant="brand" disabled={saving}>
            {saving ? "Rescheduling…" : "Confirm reschedule"}
          </Button>
        </>
      }
    >
      <form id="reschedule-visit-form" className="flex flex-col gap-4" onSubmit={submit}>
        {error && <Banner tone="error" title="Visit not rescheduled">{error}</Banner>}

        <VisitFarmerCard visit={visit} phone={farmer?.phone} />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="New date" htmlFor="reschedule-date" required>
            <Input id="reschedule-date" name="date" type="date" min={todayIso()} className="h-10 text-muted" defaultValue={todayIso()} required />
          </FormField>
          <FormField label="New time" htmlFor="reschedule-time" required>
            <Input id="reschedule-time" name="time" type="time" className="h-10 text-muted" required />
          </FormField>
        </div>

        <FormField label="Reason for rescheduling" htmlFor="reschedule-reason" required>
          <Select id="reschedule-reason" name="reason" className="h-10" defaultValue="" required>
            <option value="" disabled>Select a reason</option>
            {RESCHEDULE_REASONS.map((reason) => (
              <option key={reason} value={reason}>{reason}</option>
            ))}
          </Select>
        </FormField>

        <Banner tone="info">{visit.farmerName} will be notified of the new time by SMS once confirmed.</Banner>
      </form>
    </Modal>
  );
}
