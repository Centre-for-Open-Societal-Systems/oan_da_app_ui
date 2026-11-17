"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
  registryCode,
  profileToFarmer,
  readLivestock,
  type ApiFarmerProfile,
  type LivestockOverview,
  type Plot,
  type Visit,
} from "@/features/farmers";
import { listVisits } from "@/features/visits";
import { ProfileHeader } from "./ProfileHeader";
import { ProfileStats } from "./ProfileStats";
import { DEFAULT_PROFILE_TAB, ProfileTabs, type ProfileTab } from "./ProfileTabs";
import { ProfileOverview } from "./ProfileOverview";
import { HoldingsSection } from "./HoldingsSection";
import { CropSownSection } from "./CropSownSection";
import { LivestockHistorySection } from "./LivestockHistorySection";
import { LivestockRecordsPanel } from "./LivestockRecordsPanel";
import { VisitHistorySection } from "./VisitHistorySection";
import { DocumentsSection } from "./DocumentsSection";
import { AdvisorySection } from "./AdvisorySection";

type Loaded =
  | { source: "api"; profile: ApiFarmerProfile; photo?: string; pendingUpdates: number }
  | { source: "error"; reason: string };

/** One tab's data: undefined until its tab is first opened and the call returns. */
type Slot<T> = { ok: true; value: T } | { ok: false; error: string } | undefined;
type Visits = { items: Visit[]; total: number };

/** The data each tab needs; Crop Sown and Advisory load their own when shown. */
const TAB_NEEDS: Partial<Record<ProfileTab, ("plots" | "visits" | "livestock")[]>> = {
  Overview: ["plots", "visits", "livestock"],
  Holdings: ["plots"],
  "Livestock Details": ["livestock"],
  "Livestock history": ["livestock"],
  "Visit history": ["visits"],
};

const Loading = ({ what }: { what: string }) => <p className="py-8 text-center text-[13.5px] text-muted">Loading {what}…</p>;

export function FarmerProfileView({ id }: { id: string }) {
  // Keyed by id: another farmer starts with empty tabs.
  return <FarmerProfile key={id} id={id} />;
}

/**
 * Farmer profile from GET /farmers/{id}/profile (with photo and update-status for the header). Each tab reads its own
 * data the first time it opens: Holdings → /plots, Visit history → /visits?farmer_id=, Livestock → /livestock; Crop Sown Details
 * and Advisory load inside their panels. Errors read as the backend error table says: no access (403), not found
 * (404), registry unavailable (502/504).
 */
function FarmerProfile({ id }: { id: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [plots, setPlots] = useState<Slot<Plot[]>>();
  const [visits, setVisits] = useState<Slot<Visits>>();
  const [livestock, setLivestock] = useState<Slot<LivestockOverview>>();
  const requested = useRef(new Set<string>());

  const loadTab = useCallback((code: string, tab: ProfileTab) => {
    for (const need of TAB_NEEDS[tab] ?? []) {
      if (requested.current.has(need)) continue;
      requested.current.add(need);
      if (need === "plots") {
        fetchFarmerPlots(code).then(
          (rows) => setPlots({ ok: true, value: rows.map(apiPlotToPlot) }),
          (err) => setPlots({ ok: false, error: describeFarmerError(err) }),
        );
      } else if (need === "visits") {
        // GET /visits?farmer_id=: the farmer's visits, oldest first, so the history reverses them (newest on top).
        // That list has no outcome or completed_at; the visit's purpose stands in as its summary.
        listVisits({ farmer_id: code, limit: 50, start: 0 }).then(
          (res) => {
            const items = res.items.map((v) => apiVisitToVisit({ ...v, outcome: v.purpose, completed_at: null })).reverse();
            setVisits({ ok: true, value: { items, total: res.total } });
          },
          (err) => setVisits({ ok: false, error: describeFarmerError(err) }),
        );
      } else {
        fetchFarmerLivestock(code).then(
          (rows) => setLivestock({ ok: true, value: readLivestock(rows) }),
          (err) => setLivestock({ ok: false, error: describeLivestockError(err) }),
        );
      }
    }
  }, []);

  useEffect(() => {
    let current = true;
    (async () => {
      try {
        const profile = await fetchFarmerProfile(id);
        // The page may be open on either id; the calls after the profile use the Farmer ID.
        const code = profile.reg_id ?? id;
        const [updates, photo] = await Promise.allSettled([fetchFarmerUpdateStatus(code), fetchFarmerPhoto(code)]);
        if (!current) return;
        setLoaded({ source: "api", profile, photo: (photo.status === "fulfilled" && photo.value) || undefined, pendingUpdates: updates.status === "fulfilled" ? updates.value.total : 0 });
        // The tab the profile opens on loads straight away.
        loadTab(code, DEFAULT_PROFILE_TAB);
      } catch (err) {
        if (current) setLoaded({ source: "error", reason: describeFarmerError(err) });
      }
    })();
    return () => {
      current = false;
    };
  }, [id, loadTab]);

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

  const plotRows = plots?.ok ? plots.value : [];
  const visitRows = visits?.ok ? visits.value.items : [];
  const farmer = { ...profileToFarmer(loaded.profile, { plots: plotRows.length, visits: visits?.ok ? visits.value.total : 0 }), avatar: loaded.photo };
  const code = registryCode(farmer);
  const livestockValue = livestock?.ok ? livestock.value : null;
  const livestockError = livestock && !livestock.ok ? livestock.error : undefined;
  const notes = [plots && !plots.ok && "plots", visits && !visits.ok && "visit history", livestockError && "livestock"].filter((x): x is string => !!x);
  const incomplete = loaded.profile.incomplete_sections ?? [];

  return (
    <>
      {notes.length > 0 && (
        <Banner tone="warning">Could not load {notes.join(" and ")} for this farmer; the other tabs are up to date.</Banner>
      )}

      {incomplete.length > 0 && (
        <Banner tone="warning" title="Partial data">The registry could not deliver: {incomplete.join(", ")}. Those parts are shown as partial.</Banner>
      )}
      {loaded.pendingUpdates > 0 && (
        <Banner tone="info">{loaded.pendingUpdates === 1 ? "1 edit is" : `${loaded.pendingUpdates} edits are`} queued for the Farmer Registry and will sync in the background.</Banner>
      )}

      <ProfileHeader farmer={farmer} />
      <ProfileStats farmer={farmer} fromApi known={{ plots: !!plots?.ok, visits: !!visits?.ok }} />
      <ProfileTabs
        onSelect={(tab) => loadTab(code, tab)}
        panels={{
          Overview: <ProfileOverview farmerCode={code} livestock={livestockValue} livestockError={livestockError} plots={plotRows} visits={visitRows} />,
          Holdings: plots ? <HoldingsSection plots={plotRows} /> : <Loading what="holdings" />,
          "Crop Sown Details": <CropSownSection farmer={farmer} />,
          "Livestock Details": livestock ? <LivestockRecordsPanel overview={livestockValue} error={livestockError} farmer={farmer} /> : <Loading what="livestock" />,
          "Livestock history": livestock ? <LivestockHistorySection submissions={livestockValue?.submissions ?? []} error={!!livestockError} /> : <Loading what="livestock history" />,
          "Visit history": visits ? <VisitHistorySection visits={visitRows} /> : <Loading what="visit history" />,
          Documents: <DocumentsSection />,
          Advisory: <AdvisorySection farmerCode={code} />,
        }}
      />
    </>
  );
}
