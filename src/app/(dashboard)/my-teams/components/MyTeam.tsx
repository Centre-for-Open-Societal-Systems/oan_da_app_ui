"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { AgentsRegistry } from "../../agents/components/AgentsRegistry";

// A DA's My Teams: the same grid as the officers' registry (AgentsRegistry, read-only for a DA), listing every
// Development Agent posted to the DA's Kebele (GET /da-services/agents/my-team), the DA included.
export function MyTeam() {
  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader
        title="My Teams"
        description="The Development Agents posted to your Kebele, from the DA Registry."
        actions={
          <Link
            href="/advisors"
            className="w-full sm:w-auto inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-xl bg-brand-green px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-green-dark shadow-xs"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
              <path d="M16 3.13a4 4 0 0 1 0 7.75" />
            </svg>
            <span>Advisors</span>
          </Link>
        }
      />
      <AgentsRegistry />
    </div>
  );
}
