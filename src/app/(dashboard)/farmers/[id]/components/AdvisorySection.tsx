"use client";

import { useEffect, useState } from "react";
import { EmptyState } from "@/components/ui/EmptyState";
import { describeFarmerError } from "@/features/farmers";
import { AdvisoryQaList, listFarmerAdvisory, type FarmerAdvisoryQa } from "@/features/visits";
import { SectionCard } from "./SectionCard";

// Questions and answers captured on this farmer's Advisory visits (Plan a visit → Visit type: Advisory), read from
// GET /farmers/{id}/advisory each time the tab opens, so they survive a reload and every user who may see the visit sees them.
export function AdvisorySection({ farmerCode }: { farmerCode: string }) {
  const [loaded, setLoaded] = useState<{ entries: FarmerAdvisoryQa[]; error: string | null } | null>(null);

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
    <SectionCard title="Advisory">
      {error ? (
        <EmptyState tone="error" title="Advisory could not be loaded" hint={error} />
      ) : entries.length === 0 ? (
        <EmptyState
          title="No advisory questions yet"
          hint="Use Plan a visit and choose the Advisory visit type to record the farmer's questions and your answers."
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-line">
          <AdvisoryQaList items={entries} />
        </div>
      )}
    </SectionCard>
  );
}
