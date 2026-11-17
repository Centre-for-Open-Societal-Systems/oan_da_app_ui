"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { describeFarmerError } from "@/features/farmers";
import { AdvisoryQaList, formatVisitTime, listFarmerAdvisory, VisitStatusPill, type FarmerAdvisory, type VisitStatus } from "@/features/visits";
import { SectionCard } from "./SectionCard";

const PILL_STATUSES: readonly VisitStatus[] = ["Confirmed", "Planned", "Completed", "Missed"];
/** Cancelled / rescheduled visits show as Missed, the closest pill (as the Visits table does). */
const pillStatus = (status: string): VisitStatus => ((PILL_STATUSES as readonly string[]).includes(status) ? (status as VisitStatus) : "Missed");

// Questions and answers captured on this farmer's Advisory visits (Plan a visit → Visit type: Advisory), read from
// the backend each time the tab opens, so they survive a reload and every user who may see the visit sees them.
export function AdvisorySection({ farmerCode }: { farmerCode: string }) {
  const [loaded, setLoaded] = useState<{ entries: FarmerAdvisory[]; error: string | null } | null>(null);

  useEffect(() => {
    let current = true;
    listFarmerAdvisory(farmerCode).then(
      (entries) => current && setLoaded({ entries, error: null }),
      (err: unknown) => current && setLoaded({ entries: [], error: describeFarmerError(err) }),
    );
    return () => {
      current = false;
    };
  }, [farmerCode]);

  if (!loaded) return <p className="py-8 text-center text-[13.5px] text-muted">Loading advisory…</p>;

  const { entries, error } = loaded;
  return (
    <SectionCard title="Advisory" bodyClassName={entries.length ? "flex flex-col gap-4" : undefined}>
      {error ? (
        <EmptyState tone="error" title="Advisory could not be loaded" hint={error} />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No advisory questions yet"
          hint="Use Plan a visit and choose the Advisory visit type to record the farmer's questions and your answers."
        />
      ) : (
        entries.map((entry) => (
          <article key={entry.visitId} className="overflow-hidden rounded-xl border border-line">
            <header className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface px-4 py-2.5">
              <p className="text-[13.5px] font-semibold text-ink">Advisory visit · {formatVisitTime(entry.scheduledAt)}</p>
              <VisitStatusPill status={pillStatus(entry.status)} />
            </header>
            <AdvisoryQaList items={entry.items} />
          </article>
        ))
      )}
    </SectionCard>
  );
}
