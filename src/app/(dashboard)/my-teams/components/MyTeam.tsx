"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Banner } from "@/components/ui/Banner";
import { PageHeader } from "@/components/ui/PageHeader";
import { agentToTeamMember, describeAgentError, listMyTeam, type ApiAgent, type TeamMember } from "@/features/agents";
import { useAuthStore } from "@/store/useAuthStore";
import { TeamTable } from "./TeamTable";

/** The `agent` of /me is the DA's registry record when the registry answered; anything else is not one. */
const asApiAgent = (value: Record<string, unknown> | null | undefined): ApiAgent | null =>
  value && typeof value.da_id === "string" ? (value as unknown as ApiAgent) : null;

// A DA's team is the Development Agents in their Kebele (GET /da-services/agents/my-team: for a DA the backend
// scopes it to their Kebele), with the DA's own registry record (from /me) first.
export function MyTeam() {
  const profile = useAuthStore((s) => s.profile);
  const me = useMemo(() => {
    const record = asApiAgent(profile?.agent);
    return record ? agentToTeamMember(record) : null;
  }, [profile?.agent]);
  const [loaded, setLoaded] = useState<{ items: TeamMember[]; kebeles: string[]; error: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listMyTeam({ limit: 200 })
      .then(({ areas, agents }) => !cancelled && setLoaded({ items: agents.map(agentToTeamMember), kebeles: areas, error: null }))
      .catch((err: unknown) => !cancelled && setLoaded({ items: [], kebeles: [], error: describeAgentError(err) }));
    return () => {
      cancelled = true;
    };
  }, []);

  const colleagues = loaded?.items ?? [];
  const team = me ? [me, ...colleagues.filter((m) => m.daId !== me.daId)] : colleagues;
  // Name the Kebele as the rows show it (its name where the registry gave one), else the code the backend resolved.
  const kebeleLabel = (me && me.kebele !== "—" ? me.kebele : colleagues[0]?.kebele) || loaded?.kebeles.join(", ");
  const woreda = me?.woreda || colleagues[0]?.woreda;
  const description = loaded && loaded.kebeles.length === 0 && !loaded.error
    ? "No Kebele posting was found for you, so there is no team to show yet."
    : kebeleLabel
      ? `Development Agents in ${kebeleLabel} Kebele${woreda ? `, ${woreda} Woreda` : ""}`
      : "The Development Agents in your Kebele, from the DA Registry.";

  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader
        title="My Teams"
        description={description}
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

      {loaded?.error && (
        <Banner tone="error" title="Your team could not be loaded">
          {loaded.error}
        </Banner>
      )}

      <TeamTable team={team} myDaId={me?.daId ?? profile?.daId ?? ""} loading={loaded === null} />
    </div>
  );
}
