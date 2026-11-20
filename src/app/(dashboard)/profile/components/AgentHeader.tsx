import { Card } from "@/components/ui/Card";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { getInitials } from "@/features/farmers";

/** The header line: from the DA Registry profile for a DA, the sample profile for other roles. */
export interface AgentHeaderInfo {
  name: string;
  role: string;
  agentId: string;
  location: string;
  email: string;
  phone: string;
  status: string;
}

const STATUS_TONE: Record<string, PillTone> = { Active: "green", "On-leave": "amber", Separated: "slate", Unassigned: "blue" };

interface AgentHeaderProps {
  info: AgentHeaderInfo;
  /** A submitted change is waiting for supervisor approval. */
  pending: boolean;
}

export function AgentHeader({ info: p, pending }: AgentHeaderProps) {
  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="flex flex-col gap-4 bg-gradient-to-r from-surface/80 via-white to-white p-4 sm:p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex items-center gap-3.5 sm:gap-4.5 min-w-0 flex-1">
          <div className="flex h-14 w-14 sm:h-16 sm:w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-green to-emerald-700 text-[20px] sm:text-[22px] font-bold text-white shadow-xs">
            {p.name && p.name !== "—" ? getInitials(p.name) : "DA"}
          </div>

          <div className="flex flex-col gap-1.5 min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
              <h1 className="text-[19px] sm:text-[22px] font-bold tracking-tight text-ink truncate">
                {p.name}
              </h1>
              <Pill tone={STATUS_TONE[p.status] ?? "green"} dot>
                {p.status}
              </Pill>
              {pending && <Pill tone="amber">Change pending approval</Pill>}
            </div>

            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[13px] sm:text-[13.5px] text-ink-soft">
              <span className="font-semibold text-brand-green">{p.role}</span>
              <span className="text-muted">•</span>
              <span className="font-mono text-xs bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded text-slate-700 font-medium">
                {p.agentId}
              </span>
              {p.location && p.location !== "—" && (
                <>
                  <span className="text-muted">•</span>
                  <span className="inline-flex items-center gap-1 text-slate-600 truncate max-w-xs sm:max-w-md">
                    <svg className="h-3.5 w-3.5 text-muted shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                      <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" /><circle cx="12" cy="10" r="3" />
                    </svg>
                    <span className="truncate">{p.location}</span>
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 pt-3 lg:pt-0 border-t border-line-soft lg:border-t-0 text-[13px] text-ink-soft shrink-0">
          {p.email && p.email !== "—" && (
            <a
              href={`mailto:${p.email}`}
              className="inline-flex max-w-[260px] sm:max-w-[280px] items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:border-brand-green hover:text-brand-green shadow-2xs"
              title={p.email}
            >
              <svg className="h-4 w-4 text-brand-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M4 4h16a2 2 0 012 2v12a2 2 0 01-2 2H4a2 2 0 01-2-2V6a2 2 0 012-2zM22 6l-10 7L2 6" />
              </svg>
              <span className="truncate">{p.email}</span>
            </a>
          )}
          {p.phone && p.phone !== "—" && (
            <a
              href={`tel:${p.phone.replace(/\s/g, "")}`}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2 text-[13px] font-medium text-ink transition-colors hover:border-brand-green hover:text-brand-green shadow-2xs"
            >
              <svg className="h-4 w-4 text-brand-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
              </svg>
              <span>{p.phone}</span>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
