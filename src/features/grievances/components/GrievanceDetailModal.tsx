"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { caseFromApi, fetchGrievance, fetchGrievanceTimeline } from "../api";
import { buildCase } from "../data";
import type { Grievance } from "../types";
import { GrievancePriorityPill, GrievanceStatusPill } from "./GrievancePills";
import { GrievanceTimeline } from "./GrievanceTimeline";

interface GrievanceDetailModalProps {
  grievance: Grievance;
  onClose: () => void;
}

export function GrievanceDetailModal({ grievance, onClose }: GrievanceDetailModalProps) {
  // API tickets start from the table row and fill in from GET /grievances/{id} and its timeline; sample rows use the sample case.
  const [data, setData] = useState(() => (grievance.fromApi ? caseFromApi(grievance) : buildCase(grievance)));
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!grievance.fromApi) return;
    let current = true;
    Promise.all([fetchGrievance(grievance.ticketId), fetchGrievanceTimeline(grievance.ticketId).catch(() => [])])
      .then(([detail, timeline]) => current && setData(caseFromApi(grievance, detail, timeline)))
      .catch((err: unknown) => current && setLoadError(err instanceof Error ? err.message : "Could not load this grievance."));
    return () => {
      current = false;
    };
  }, [grievance]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  if (!mounted) return null;

  const location = grievance.location || [grievance.woreda, grievance.region].filter(Boolean).join(", ");
  const slaDue = data.sla.dueOn;
  const summary: { label: string; value: React.ReactNode }[] = [
    { label: "Ticket ID", value: grievance.ticketId },
    { label: "Submitted", value: grievance.submittedAt },
    { label: "Category", value: grievance.category || "—" },
    ...(data.submitter.name && data.submitter.name !== "—" ? [{ label: "Submitted by", value: data.submitter.name }] : []),
    ...(location ? [{ label: "Location", value: location }] : []),
    ...(slaDue && slaDue !== "—" ? [{ label: "SLA due", value: slaDue }] : []),
    { label: "Status", value: <GrievanceStatusPill status={grievance.status} className="px-2.5 py-0.5" /> },
  ];

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-ink/40 p-3 backdrop-blur-[2px] sm:p-6"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="grievance-title"
        className="my-auto w-full min-w-0 max-w-[820px] overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-4 sm:gap-4 sm:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-medium text-slate-600">{grievance.ticketId}</span>
              {grievance.priority && <GrievancePriorityPill priority={grievance.priority} className="px-2.5 py-0.5" />}
            </div>
            <h2 id="grievance-title" className="mt-2 text-[17px] font-semibold text-ink">{grievance.title}</h2>
            {loadError && <p className="mt-1 text-[13px] text-danger">{loadError}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="mt-1 shrink-0 rounded-md p-1 text-subtle transition-colors hover:bg-zinc-100 hover:text-ink"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-5 px-3 py-4 sm:px-6 sm:py-5">
          <dl className="grid grid-cols-[110px_minmax(0,1fr)] items-center gap-x-4 gap-y-3 rounded-xl bg-surface px-5 py-4 text-[14px] sm:grid-cols-[130px_minmax(0,1fr)]">
            {summary.map((row) => (
              <div key={row.label} className="contents">
                <dt className="text-slate-500">{row.label}:</dt>
                <dd className="min-w-0 font-medium text-ink">{row.value}</dd>
              </div>
            ))}
          </dl>

          <GrievanceTimeline messages={data.thread} status={grievance.status} />
        </div>
      </div>
    </div>,
    document.body,
  );
}
