"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { describeFarmerError, fetchFarmerProfile, getFarmer, profileToFarmer, type Farmer } from "@/features/farmers";
import { ServicesWorkspace } from "./ServicesWorkspace";

// The farmer behind the Services page: a sample farmer directly, anyone else from GET /farmers/{id}/profile.
export function ServicesLoader({ id }: { id: string }) {
  const [sample] = useState(() => getFarmer(id));
  const [loaded, setLoaded] = useState<{ farmer: Farmer } | { error: string } | null>(null);

  useEffect(() => {
    if (sample) return;
    let current = true;
    fetchFarmerProfile(id)
      .then((profile) => current && setLoaded({ farmer: profileToFarmer(profile, { plots: 0, visits: 0 }) }))
      .catch((err: unknown) => current && setLoaded({ error: describeFarmerError(err) }));
    return () => {
      current = false;
    };
  }, [id, sample]);

  if (sample) return <ServicesWorkspace farmer={sample} />;
  if (!loaded) return <Card className="px-4 py-10 text-center text-[13.5px] text-muted shadow-card">Loading services…</Card>;
  if ("error" in loaded) {
    return (
      <Card className="shadow-card">
        <EmptyState tone="error" title="Farmer not available" hint={loaded.error} />
      </Card>
    );
  }
  return <ServicesWorkspace farmer={loaded.farmer} />;
}
