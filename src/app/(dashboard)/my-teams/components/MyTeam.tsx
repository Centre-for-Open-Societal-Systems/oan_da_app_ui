"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Banner } from "@/components/ui/Banner";
import { PageHeader } from "@/components/ui/PageHeader";
import { agentToTeamMember, describeAgentError, expertToTeamMember, listExperts, type ApiAgent, type TeamMember } from "@/features/agents";
import { useAuthStore } from "@/store/useAuthStore";
import { TeamTable } from "./TeamTable";

/** The `agent` of /me is the DA's registry record when the registry answered; anything else is not one. */
const asApiAgent = (value: Record<string, unknown> | null | undefined): ApiAgent | null =>
  value && typeof value.da_id === "string" ? (value as unknown as ApiAgent) : null;

// A DA's team is the other Development Agents in their Kebele (GET /da-services/experts is scoped to the Woreda by the
// backend, so the Kebele is narrowed here), with the DA's own registry record (from /me) first.
export function MyTeam() {
  const profile = useAuthStore((s) => s.profile);
  const me = useMemo(() => {
    const record = asApiAgent(profile?.agent);
    return record ? agentToTeamMember(record) : null;
  }, [profile?.agent]);
  const [loaded, setLoaded] = useState<{ items: TeamMember[]; error: string | null } | null>(null);

  useEffect(() => {
    let cancelled = false;
    listExperts()
      .then(({ items }) => !cancelled && setLoaded({ items: items.map(expertToTeamMember), error: null }))
      .catch((err: unknown) => !cancelled && setLoaded({ items: [], error: describeAgentError(err) }));
    return () => {
      cancelled = true;
    };
  }, []);

  // The registry may give a Kebele as its code or its name. A DA with no Kebele on record sees their Woreda.
  const record = asApiAgent(profile?.agent);
  const myKebeles = [record?.kebele, record?.kebele_name].filter((k): k is string => !!k);
  const colleagues = (loaded?.items ?? []).filter((m) => myKebeles.length === 0 || myKebeles.includes(m.kebele));
  const team = me ? [me, ...colleagues.filter((m) => m.daId !== me.daId)] : colleagues;
  const description = myKebeles.length > 0 && me
    ? `Development Agents in ${me.kebele} Kebele, ${me.woreda} Woreda`
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

      <TeamTable team={team} myDaId={me?.daId ?? profile?.daId ?? ""} loading={loaded === null} />
    </div>
  );
}
