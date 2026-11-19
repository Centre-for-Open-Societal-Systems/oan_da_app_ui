"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Banner } from "@/components/ui/Banner";
import { PageHeader } from "@/components/ui/PageHeader";
import { describeAgentError, listMyTeam, type TeamMember } from "@/features/agents";
import { useAuthStore } from "@/store/useAuthStore";
import { TeamTable } from "./TeamTable";

// A DA's team is the other Development Agents posted in their Kebele, with the DA's own record first. GET
// /da-services/my-team answers exactly that list from the DA Registry.
export function MyTeam() {
  const myDaId = useAuthStore((s) => s.profile?.daId ?? "");
  const [loaded, setLoaded] = useState<{ team: TeamMember[]; error: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyTeam()
      .then((team) => !cancelled && setLoaded({ team, error: null }))
      .catch((err: unknown) => !cancelled && setLoaded({ team: [], error: describeAgentError(err) }));
    return () => {
      cancelled = true;
    };
  }, []);

  const team = loaded?.team ?? [];
  const me = team.find((m) => m.daId === myDaId) ?? team[0];
  const description = me && me.kebele !== "—"
    ? `Development Agents in ${me.kebele} Kebele${me.woreda ? `, ${me.woreda} Woreda` : ""}`
    : "The Development Agents in your Kebele, from the DA Registry.";

  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader
        title="My Teams"
        description={description}
        actions={
          <Link href="/advisors" className="inline-flex h-10 items-center gap-2 whitespace-nowrap rounded-md bg-brand-green px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-green-dark">
            Advisors
          </Link>
        }
      />

      {loaded?.error && (
        <Banner tone="error" title="Your team could not be loaded">
          {loaded.error}
        </Banner>
      )}

      <TeamTable team={team} myDaId={me?.daId ?? myDaId} loading={loaded === null} />
    </div>
  );
}
