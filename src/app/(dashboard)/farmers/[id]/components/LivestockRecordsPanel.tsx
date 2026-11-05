"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Select } from "@/components/ui/Select";
import { headCount, livestockDetailsTabs, noLivestockHolding, type Farmer, type LivestockHolding, type LivestockOverview } from "@/features/farmers";
import { useAuthStore } from "@/store/useAuthStore";
import { LivestockDetailsSection } from "./LivestockDetailsSection";

const holdingLabel = (h: LivestockHolding) => {
  const place = [h.holding.kebele, h.holding.woreda].filter((p) => typeof p === "string" && p).join(", ");
  return `${h.label}${place ? ` · ${place}` : ""} · ${headCount(h)} heads · ${h.status}`;
};

// The profile's "Livestock Details": a farmer can have several holdings, so one is picked (newest first) and shown in full.
export function LivestockRecordsPanel({ overview, error, farmer }: { overview: LivestockOverview | null; error?: string; farmer: Farmer }) {
  const [selected, setSelected] = useState<string>();
  const signedInWithSso = useAuthStore((s) => s.tokens?.provider === "iam" || s.tokens?.provider === "oidc");

  if (error) return <Banner tone="error" title="Livestock details could not be loaded">{error}</Banner>;
  // With no records the sections still show: the Farmer tab from the profile, the rest as "None recorded".
  if (!overview?.holdings.length) {
    return (
      <div className="flex flex-col gap-4">
        <Banner tone="info" title="No livestock on record">
          The registry returned no livestock submissions or records for {farmer.regId ?? farmer.id}. A submitted livestock report shows here.
        </Banner>
        {/* The Livestock collection: calls are forwarded to the staff host and need the SSO token and its CSRF value. */}
        {!signedInWithSso && (
          <Banner tone="warning" title="This result may be incomplete">
            You are signed in with the username and password login. Livestock data needs the SSO sign-in, so sign in with SSO and check again.
          </Banner>
        )}
        <LivestockDetailsSection tabs={livestockDetailsTabs(noLivestockHolding(farmer), farmer.name)} />
      </div>
    );
  }

  const current = overview.holdings.find((h) => h.key === selected) ?? overview.holdings[0];
  return (
    <div className="flex flex-col gap-4">
      {overview.holdings.length > 1 && (
        <div className="flex flex-col gap-2">
          <label htmlFor="livestock-holding" className="text-[14px] font-medium text-ink">
            Holding ({overview.holdings.length})
          </label>
          <Select id="livestock-holding" value={current.key} onChange={(e) => setSelected(e.target.value)}>
            {overview.holdings.map((h) => (
              <option key={h.key} value={h.key}>
                {holdingLabel(h)}
              </option>
            ))}
          </Select>
        </div>
      )}
      <LivestockDetailsSection key={current.key} tabs={livestockDetailsTabs(current, farmer.name)} />
    </div>
  );
}
