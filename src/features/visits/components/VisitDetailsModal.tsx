"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import { getFarmer } from "@/features/farmers";
import { canAddEvidence, fetchVisit, formatVisitTime, type ApiVisitDetail } from "../api";
import { VISIT_TIMELINE } from "../data";
import type { VisitRecord, VisitTimelineEntry } from "../types";
import { VisitFarmerCard } from "./VisitFarmerCard";
import { VisitStatusPill } from "./VisitStatusPill";
import { VisitEvidence } from "./VisitEvidence";

interface VisitDetailsModalProps {
  visit: VisitRecord | null;
  onClose: () => void;
  onReschedule: (visit: VisitRecord) => void;
}

export function VisitDetailsModal({ visit, onClose, onReschedule }: VisitDetailsModalProps) {
  if (!visit) return null;
  return <VisitDetails visit={visit} onClose={onClose} onReschedule={onReschedule} />;
}

const toTimeline = (detail: ApiVisitDetail): VisitTimelineEntry[] =>
  detail.timeline.map((e) => ({ label: e.label, by: e.by ?? undefined, when: formatVisitTime(e.when), done: e.done }));

function VisitDetails({ visit, onClose, onReschedule }: VisitDetailsModalProps & { visit: VisitRecord }) {
  const farmer = getFarmer(visit.farmerId);
  // Backend visits carry a physical status; their timeline and stored evidence come from GET /visits/{id}.
  const isApiVisit = visit.physicalStatus !== undefined;
  const [detail, setDetail] = useState<ApiVisitDetail | null>(null);

  useEffect(() => {
    if (!isApiVisit) return;
    let current = true;
    fetchVisit(visit.id)
      .then((d) => current && setDetail(d))
      .catch(() => {
        // The table row is enough to show the modal; the timeline stays empty.
      });
    return () => {
      current = false;
    };
  }, [isApiVisit, visit.id]);

  const timeline = isApiVisit ? (detail ? toTimeline(detail) : []) : VISIT_TIMELINE;

  const info: { label: string; value: string; highlight?: boolean; small?: boolean }[] = [
    { label: "Agent", value: visit.agent },
    { label: "Purpose", value: visit.purpose },
    { label: "Date & time", value: isApiVisit ? `${visit.date}, ${visit.time}` : `Today - ${visit.time}`, highlight: true },
    { label: "Plot reference", value: visit.plotRef, small: true },
    { label: "Kebele", value: visit.kebele, small: true },
    { label: "Estimated duration", value: `${visit.durationMin} min`, highlight: true },
  ];

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Visit Details"
      titleAddon={<VisitStatusPill status={visit.status} className="min-w-0" />}
      size="xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="button" variant="brand" onClick={() => onReschedule(visit)}>
            Reschedule
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <VisitFarmerCard visit={visit} phone={farmer?.phone} />

        <div className="grid grid-cols-1 overflow-hidden rounded-lg border border-line md:grid-cols-2">
          {/* Visit information */}
          <section className="border-b border-line md:border-b-0 md:border-r">
            <h3 className="border-b border-line bg-surface px-4 py-3 text-[14.5px] font-semibold text-ink">
              Visit Information
            </h3>
            <dl>
              {info.map((row) => (
                <div key={row.label} className="flex items-center justify-between gap-4 border-b border-line px-4 py-3.5 last:border-0">
                  <dt className={cn("text-slate-600", row.small ? "text-[12.5px]" : "text-[14px]")}>{row.label}</dt>
                  <dd className={cn("text-[14px] font-semibold", row.highlight ? "text-brand-green" : "text-ink")}>{row.value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* Status timeline */}
          <section>
            <h3 className="border-b border-line bg-surface px-4 py-3 text-[14.5px] font-semibold text-ink">
              Status timeline
            </h3>
            <ol className="px-4 py-4">
              {timeline.map((entry, index) => {
                const isLast = index === timeline.length - 1;
                return (
                  <li key={entry.label} className={cn("relative pl-6", !isLast && "pb-5")}>
                    <span
                      className={cn(
                        "absolute left-0 top-1.5 h-3 w-3 rounded-full border-2",
                        entry.done ? "border-brand-green bg-brand-green" : "border-slate-300 bg-white",
                      )}
                    />
                    {!isLast && <span className="absolute bottom-0 left-[5px] top-[18px] w-px bg-slate-200" />}
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className={cn("text-[14px]", entry.done ? "font-semibold text-ink" : "text-slate-600")}>{entry.label}</p>
                        {entry.by && <p className="mt-0.5 text-[13px] text-muted">{entry.by}</p>}
                      </div>
                      <p className="shrink-0 text-[12.5px] text-muted">{entry.when}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </section>
        </div>

        {/* Visits from the API only: sample records have no backend id to attach evidence to. */}
        {canAddEvidence(visit) && <VisitEvidence visitId={visit.id} existing={detail?.attachments} />}
      </div>
    </Modal>
  );
}
