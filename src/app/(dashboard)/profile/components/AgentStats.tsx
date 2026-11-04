import type { ReactNode } from "react";
import { StatCard } from "@/components/ui/StatCard";
import { Pill } from "@/components/ui/Pill";
import { AGENT_STATS } from "@/features/farmers";

// Rounded-square icon tiles, per the profile mockup.
const TILE = "h-12 w-12 rounded-xl";

const icon = (paths: ReactNode) => (
  <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {paths}
  </svg>
);

/** "4.2" years and "Since Jul 2022" from an ISO joining date; the sample values when there is none. */
function serviceFrom(joinedAt: string | null | undefined): { years: string; since: string } {
  if (!joinedAt) return { years: "—", since: "Joining date not in the registry" };
  const d = new Date(joinedAt);
  if (Number.isNaN(d.getTime())) return { years: "—", since: joinedAt };
  const years = Math.max(0, (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000));
  return { years: years.toFixed(1), since: `Since ${d.toLocaleDateString("en-GB", { month: "short", year: "numeric" })}` };
}

interface AgentStatsProps {
  /** ISO joining date from the registry profile; null when the registry has none, undefined for the sample profile. */
  joinedAt?: string | null;
  /** The assigned kebele's name from the registry profile; null when unassigned, undefined for the sample profile. */
  kebele?: string | null;
}

// Years of service and the kebele come from the DA Registry profile; certifications stay the Agrilearn sample
// until that API exists.
export function AgentStats({ joinedAt, kebele }: AgentStatsProps) {
  const s = AGENT_STATS;
  const service = joinedAt === undefined ? { years: s.yearsOfService, since: s.serviceSince } : serviceFrom(joinedAt);
  const kebeles = kebele === undefined ? { count: String(s.kebelesAssigned), hint: s.kebeles } : { count: kebele ? "1" : "0", hint: kebele ?? "Not assigned yet" };

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      <StatCard
        label="Years of service"
        value={service.years}
        hint={service.since}
        accent="border-l-blue-600"
        tile={`${TILE} bg-info-tint text-blue-600`}
        icon={icon(<><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M8 3v4M16 3v4M3 10h18" /></>)}
      />
      <StatCard
        label="Kebeles assigned"
        value={kebeles.count}
        hint={kebeles.hint}
        accent="border-l-orange-500"
        tile={`${TILE} bg-orange-50 text-orange-500`}
        icon={icon(<><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" /></>)}
      />
      <StatCard
        label="Certifications"
        value={String(s.certifications)}
        hint={
          <span className="flex items-center gap-1.5">
            <Pill tone="red">{s.certificationsPending} Pending</Pill>
            verification
          </span>
        }
        accent="border-l-violet-600"
        tile={`${TILE} bg-purple-100 text-violet-600`}
        icon={icon(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z" /><path d="M14 2v6h6M8 13h8M8 17h5" /></>)}
      />
    </div>
  );
}
