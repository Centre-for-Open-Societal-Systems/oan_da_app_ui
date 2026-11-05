"use client";

import { useEffect, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import {
  apiPlotToPlot,
  apiVisitToVisit,
  describeFarmerError,
  describeLivestockError,
  fetchFarmerLivestock,
  fetchFarmerPhoto,
  fetchFarmerPlots,
  fetchFarmerProfile,
  fetchFarmerUpdateStatus,
  fetchFarmerVisits,
  profileToFarmer,
  readLivestock,
  type Farmer,
  type LivestockOverview,
  type Plot,
  type Visit,
} from "@/features/farmers";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { ProfileTabs } from "./ProfileTabs";
import { ProfileOverview } from "./ProfileOverview";
import { HoldingsSection } from "./HoldingsSection";
import { CropSownSection } from "./CropSownSection";
import { LivestockHistorySection } from "./LivestockHistorySection";
import { LivestockRecordsPanel } from "./LivestockRecordsPanel";
import { VisitHistorySection } from "./VisitHistorySection";
import { DocumentsSection } from "./DocumentsSection";
import { AdvisorySection } from "./AdvisorySection";

type Loaded =
  | { source: "api"; farmer: Farmer; plots: Plot[]; visits: Visit[]; notes: string[]; incomplete: string[]; pendingUpdates: number; livestock: LivestockOverview | null; livestockError?: string }
  | { source: "error"; reason: string };

/**
 * Farmer profile from GET /farmers/{id}/profile, with Holdings from /plots and Visit history from /visits.
 * Errors read as the backend error table says: no access (403), not found (404), registry unavailable (502/504).
 */
export function FarmerProfileView({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);

  useEffect(() => {
    let current = true;
    (async () => {
      try {
        const profile = await fetchFarmerProfile(id);
        // The page may be open on either id; the calls after the profile use the Farmer ID.
        const code = profile.reg_id ?? id;
        // Plots and visits are tabs; one failing still leaves a usable profile.
        const [plots, visits, updates, photo, animals] = await Promise.allSettled([fetchFarmerPlots(code), fetchFarmerVisits(code), fetchFarmerUpdateStatus(code), fetchFarmerPhoto(code), fetchFarmerLivestock(code)]);
        const plotRows = plots.status === "fulfilled" ? plots.value.map(apiPlotToPlot) : [];
        const visitRows = visits.status === "fulfilled" ? visits.value.items.map(apiVisitToVisit) : [];
        const notes = [plots.status === "rejected" && "plots", visits.status === "rejected" && "visit history", animals.status === "rejected" && "livestock"].filter((x): x is string => !!x);
        const farmer = { ...profileToFarmer(profile, { plots: plotRows.length, visits: visits.status === "fulfilled" ? visits.value.total : 0 }), avatar: (photo.status === "fulfilled" && photo.value) || undefined };
        if (current) setLoaded({ source: "api", farmer, plots: plotRows, visits: visitRows, notes, incomplete: profile.incomplete_sections ?? [], pendingUpdates: updates.status === "fulfilled" ? updates.value.total : 0, livestock: animals.status === "fulfilled" ? readLivestock(animals.value) : null, livestockError: animals.status === "rejected" ? describeLivestockError(animals.reason) : undefined });
      } catch (err) {
        if (current) setLoaded({ source: "error", reason: describeFarmerError(err) });
      }
    })();
    return () => {
      current = false;
    };
  }, [id]);

  if (!loaded) {
    return (
      <Card className="px-4 py-10 text-center text-[13.5px] text-muted shadow-card">Loading farmer profile…</Card>
    );
  }

  if (loaded.source === "error") {
    return (
      <Card className="shadow-card">
        <EmptyState tone="error" title="Farmer not available" hint={loaded.reason} />
      </Card>
    );
  }

  const { farmer } = loaded;
  const fromApi = loaded.source === "api";

  return (
    <>
      {fromApi && loaded.notes.length > 0 && (
        <Banner tone="warning">Could not load {loaded.notes.join(" and ")} for this farmer; the other tabs are up to date.</Banner>
      )}

      {fromApi && loaded.incomplete.length > 0 && (
        <Banner tone="warning" title="Partial data">The registry could not deliver: {loaded.incomplete.join(", ")}. Those parts are shown as partial.</Banner>
      )}
      {fromApi && loaded.pendingUpdates > 0 && (
        <Banner tone="info">{loaded.pendingUpdates === 1 ? "1 edit is" : `${loaded.pendingUpdates} edits are`} queued for the Farmer Registry and will sync in the background.</Banner>
      )}

      <ProfileHeader farmer={farmer} />
      <ProfileStats farmer={farmer} fromApi={fromApi} />
      <ProfileTabs
        panels={{
          Overview: <ProfileOverview livestock={loaded.livestock} livestockError={loaded.livestockError} visits={fromApi ? loaded.visits : undefined} />,
          Holdings: fromApi ? <HoldingsSection plots={loaded.plots} /> : <HoldingsSection />,
          "Crop Sown Details": <CropSownSection farmer={farmer} />,
          "Livestock Details": <LivestockRecordsPanel overview={loaded.livestock} error={loaded.livestockError} farmer={farmer} />,
          "Livestock history": <LivestockHistorySection submissions={loaded.livestock?.submissions ?? []} error={!!loaded.livestockError} />,
          "Visit history": fromApi ? <VisitHistorySection visits={loaded.visits} /> : <VisitHistorySection />,
          Documents: <DocumentsSection />,
          Advisory: <AdvisorySection farmerId={farmer.id} />,
        }}
      />
    </>
  );
}
