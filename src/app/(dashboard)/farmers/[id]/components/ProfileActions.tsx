"use client";

import { useState } from "react";
import Link from "next/link";
import type { Farmer } from "@/features/farmers";
import { PlanVisitModal } from "@/features/farmers";
import { ConsentWithdrawalModal } from "@/features/farmers";
import { RaiseGrievanceModal } from "@/features/grievances";
import { cn } from "@/lib/utils";
import { RequestUpdateModal } from "./RequestUpdateModal";

type Secondary = "correction" | "consent" | "grievance";

const Icon = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg className={cn("shrink-0", className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const ICONS = {
  calendar: "M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM12 14v4M10 16h4",
  services: "M20 7H4a2 2 0 00-2 2v10a2 2 0 002 2h16a2 2 0 002-2V9a2 2 0 00-2-2zM16 7V5a2 2 0 00-2-2h-4a2 2 0 00-2 2v2M2 13h20",
  grievance: "M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01",
  correction: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4L16.5 3.5z",
  consent: "M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10zM9 12l2 2 4-4",
  arrow: "M5 12h14M13 6l6 6-6 6",
};

// Secondary actions: a full-width strip under the profile info (FR-04c onward actions + FR-03c consent).
// Every cell uses the same brand-green icon tile as Plan visit so the strip reads as one control.
const SECONDARY: { key: Secondary | "services"; label: string; hint: string; icon: string }[] = [
  { key: "services", label: "Services", hint: "Credit & marketplace", icon: ICONS.services },
  { key: "grievance", label: "Raise grievance", hint: "Via Grievance Service", icon: ICONS.grievance },
  { key: "correction", label: "Request update", hint: "Routed to Woreda", icon: ICONS.correction },
  { key: "consent", label: "Consent", hint: "View or withdraw", icon: ICONS.consent },
];

export function ProfileActionStrip({ farmer }: { farmer: Farmer }) {
  const [openModal, setOpenModal] = useState<Secondary | "visit" | null>(null);
  const close = () => setOpenModal(null);

  const cell =
    "group flex items-center gap-3 border-line px-4 py-3 text-left transition-colors border-b last:border-b-0 sm:even:border-r lg:border-b-0 lg:border-r lg:last:border-r-0";

  return (
    <>
      <div className="grid grid-cols-1 border-t border-line bg-surface-alt sm:grid-cols-2 lg:grid-cols-5">
        {/* Plan visit leads the strip (FR-05b-i). It reads like the other cells and is highlighted only while active. */}
        {(() => {
          const active = openModal === "visit";
          return (
            <button
              type="button"
              onClick={() => setOpenModal("visit")}
              aria-pressed={active}
              className={cn(
                "group flex items-center gap-3 border-b border-line px-4 py-3 text-left transition-colors sm:border-r lg:border-b-0",
                active ? "bg-gradient-to-r from-brand-green-bright to-brand-green text-white" : "hover:bg-brand-wash",
              )}
            >
              <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition-transform group-hover:scale-110", active ? "bg-white/20" : "bg-brand-tint text-brand-green")}>
                <Icon d={ICONS.calendar} className="h-[18px] w-[18px]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className={cn("text-[13.5px] font-semibold", !active && "text-ink")}>Plan visit</span>
                <span className={cn("text-[11.5px]", active ? "text-white/75" : "text-muted")}>Schedule a field visit</span>
              </span>
              <Icon d={ICONS.arrow} className={cn("h-4 w-4 transition-all group-hover:translate-x-0.5", active ? "text-white/70" : "text-slate-300 group-hover:text-brand-green")} />
            </button>
          );
        })()}
        {SECONDARY.map((a) => {
          const inner = (
            <>
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-green transition-transform group-hover:scale-110">
                <Icon d={a.icon} className="h-[18px] w-[18px]" />
              </span>
              <span className="flex min-w-0 flex-1 flex-col leading-tight">
                <span className="text-[13.5px] font-semibold text-ink">{a.label}</span>
                <span className="text-[11.5px] text-muted">{a.hint}</span>
              </span>
              <Icon d={ICONS.arrow} className="h-4 w-4 text-slate-300 transition-all group-hover:translate-x-0.5 group-hover:text-brand-green" />
            </>
          );
          return a.key === "services" ? (
            <Link key={a.key} href={`/farmers/${farmer.id}/services`} className={cn(cell, "hover:bg-brand-wash")}>{inner}</Link>
          ) : (
            <button key={a.key} type="button" aria-pressed={openModal === a.key} onClick={() => setOpenModal(a.key === "services" ? null : a.key)} className={cn(cell, "hover:bg-brand-wash", openModal === a.key && "bg-brand-wash")}>{inner}</button>
          );
        })}
      </div>

      {openModal === "visit" && <PlanVisitModal farmer={farmer} isOpen onClose={close} />}
      {openModal === "correction" && <RequestUpdateModal farmer={farmer} isOpen onClose={close} />}
      {openModal === "consent" && <ConsentWithdrawalModal farmer={farmer} isOpen onClose={close} />}
      {openModal === "grievance" && <RaiseGrievanceModal isOpen onClose={close} farmerId={farmer.regId ?? farmer.id} />}
    </>
  );
}
