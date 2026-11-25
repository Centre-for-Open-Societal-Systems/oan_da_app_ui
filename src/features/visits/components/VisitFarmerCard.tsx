import { FarmerAvatar } from "@/features/farmers";
import type { VisitRecord } from "../types";

// Farmer summary strip at the top of the visit modals: avatar, name, email, phone, kebele.
export function VisitFarmerCard({ visit, phone }: { visit: VisitRecord; phone?: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-lg border border-line bg-surface px-4 py-3.5">
      <FarmerAvatar name={visit.farmerName} avatar={visit.farmerAvatar} className="h-10 w-10 text-[14px]" />
      <div className="min-w-0">
        <p className="text-[14.5px] font-semibold text-ink">{visit.farmerName}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-5 gap-y-1 text-[13px] text-slate-600">
          {visit.farmerEmail && (
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <rect x="3" y="5" width="18" height="14" rx="2" /><path d="M3 7l9 6 9-6" />
              </svg>
              {visit.farmerEmail}
            </span>
          )}
          {phone && (
            <span className="inline-flex items-center gap-1.5">
              <svg className="h-3.5 w-3.5 text-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.6a2 2 0 01-.5 2.1L8 9.7a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.8.3 1.7.6 2.6.7a2 2 0 011.7 2z" />
              </svg>
              {phone}
            </span>
          )}
          <span className="inline-flex items-center gap-1.5">
            <svg className="h-3.5 w-3.5 text-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            Farmer : {visit.kebele} kebele
          </span>
        </div>
      </div>
    </div>
  );
}
