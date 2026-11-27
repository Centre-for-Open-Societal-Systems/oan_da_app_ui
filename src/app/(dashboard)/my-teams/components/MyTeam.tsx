"use client";

import { AgentsRegistry } from "../../agents/components/AgentsRegistry";

// A DA's My Teams: the same page as the officers' registry (AgentsRegistry, read-only for a DA, with the Advisors
// link in its header), listing every Development Agent posted to the DA's Kebele (GET /da-services/agents/my-team),
// the DA included.
export function MyTeam() {
  return (
    <div className="flex w-full flex-col gap-3.5 sm:gap-4 md:gap-5">
      <AgentsRegistry />
    </div>
  );
}
