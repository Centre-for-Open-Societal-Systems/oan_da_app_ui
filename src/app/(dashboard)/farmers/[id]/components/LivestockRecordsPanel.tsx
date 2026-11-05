"use client";

import { Banner } from "@/components/ui/Banner";
import { livestockDetailsTabs, noLivestockHolding, type Farmer, type LivestockOverview } from "@/features/farmers";
import { useAuthStore } from "@/store/useAuthStore";
import { LivestockDetailsSection } from "./LivestockDetailsSection";

// The profile's "Livestock Details": the farmer's newest holding, shown in full.
export function LivestockRecordsPanel({ overview, error, farmer }: { overview: LivestockOverview | null; error?: string; farmer: Farmer }) {
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

  const [newest] = overview.holdings;
  return <LivestockDetailsSection key={newest.key} tabs={livestockDetailsTabs(newest, farmer.name)} />;
}
