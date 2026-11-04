"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import type { TodaysVisit } from "@/features/visits";
import { ARRIVAL_STYLES } from "./arrivalStyles";

// Parcel coordinates when known, otherwise the kebele name.
const mapsUrl = (v: TodaysVisit) => {
  const query = v.lat != null && v.lng != null ? `${v.lat},${v.lng}` : `${v.kebele ?? v.farmerName}, Ethiopia`;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
};

// "View locations" link in the Today's visits header, and the modal listing each visit with a Maps link.
export function VisitLocationsButton({ visits, todayLabel }: { visits: TodaysVisit[]; todayLabel: string }) {
  const [locationsOpen, setLocationsOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setLocationsOpen(true)} className="inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-brand-green hover:underline">
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3" />
        </svg>
        View locations
      </button>

      <Modal
        isOpen={locationsOpen}
        onClose={() => setLocationsOpen(false)}
        title="Today's Visit Locations"
        subtitle={`${visits.length} visits · ${todayLabel} · in the order you arranged them`}
        size="lg"
        footer={
          <Button type="button" variant="outline" onClick={() => setLocationsOpen(false)}>
            Close
          </Button>
        }
      >
        <ol className="flex flex-col gap-2.5">
          {visits.map((v, index) => {
            const style = ARRIVAL_STYLES[v.state];
            return (
              <li key={v.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-line px-4 py-3">
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold", style.step)}>
                  {index + 1}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[14.5px] font-semibold text-ink">{v.farmerName}</p>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Planned arrival · {v.plannedArrival}
                    {v.kebele && ` · ${v.kebele} kebele`}
                    {v.parcel && ` · parcel ${v.parcel}`}
                  </p>
                  {v.lat != null && v.lng != null && (
                    <p className="mt-0.5 text-[12.5px] text-subtle">
                      {v.lat.toFixed(4)}°N, {v.lng.toFixed(4)}°E
                    </p>
                  )}
                </div>
                <a
                  href={mapsUrl(v)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 whitespace-nowrap h-8 items-center gap-1.5 rounded-md border border-brand-green bg-white px-3 text-[13px] font-semibold text-brand-green transition-colors hover:bg-brand-wash"
                >
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
                  </svg>
                  Open in Maps
                </a>
              </li>
            );
          })}
        </ol>
      </Modal>
    </>
  );
}
