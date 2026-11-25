import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";
import type { AgentSummary } from "@/features/dashboard";

interface SummarySectionProps {
  /** Range label shown in the heading, e.g. "Last 30 days". */
  rangeLabel: string;
  summary: AgentSummary | null;
  loading: boolean;
  error: string | null;
}

// Placeholder while the first summary loads, so the cards keep their size.
const Pending = () => <span className="inline-block h-[22px] w-10 animate-pulse rounded bg-slate-200 align-middle" />;

export function SummarySection({ rangeLabel, summary, loading, error }: SummarySectionProps) {
  const visits = summary?.visits;
  const tasks = summary?.tasks;
  const visitPct = visits && visits.planned > 0 ? Math.min(100, Math.round((visits.completed / visits.planned) * 100)) : 0;

  return (
    <div className="flex flex-col">
      <h2 className="mb-2.5 sm:mb-3 flex items-center gap-2 text-[11px] sm:text-[11.5px] font-semibold uppercase tracking-wide text-slate-600">
        Summary · {rangeLabel}
        {loading && summary && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-brand-green" aria-label="Updating" />}
      </h2>
      {error && <Banner tone="error" title="Could not load your summary" className="mb-3">{error}</Banner>}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">

        {/* Farm Visits — opens the visits list */}
        <Link href="/visits" className="block rounded-xl focus-visible:outline-2 focus-visible:outline-brand-green">
          <Card className="group flex min-h-[116px] sm:h-[128px] flex-col justify-between overflow-hidden p-3.5 sm:p-4 shadow-card border-l-4 border-l-blue-500 transition-shadow hover:shadow-md">
            <div className="flex flex-col justify-between h-full gap-2">
              <div className="flex justify-between items-start gap-2">
                <div className="min-w-0">
                  <p className="mb-0.5 sm:mb-1 text-[13px] sm:text-[14px] font-medium text-ink-soft">Farm visits</p>
                  <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2">
                    <span className="text-[22px] sm:text-[26px] font-semibold leading-none text-ink">{visits ? visits.completed : <Pending />}</span>
                    {visits && <span className="text-[12px] sm:text-[14px] text-muted">of {visits.planned} planned</span>}
                  </div>
                </div>

                <div className="h-11 w-11 sm:h-[52px] sm:w-[52px] md:h-[60px] md:w-[60px] rounded-xl bg-info-tint flex items-center justify-center text-blue-500 shrink-0 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.12] group-hover:-translate-y-1 group-hover:shadow-sm">
                  <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
              </div>

              <div className="w-full bg-slate-100 rounded-full h-1.5 mt-auto">
                <div className="h-1.5 rounded-full bg-brand-green transition-all duration-1000 ease-out" style={{ width: `${visitPct}%` }}></div>
              </div>
            </div>
          </Card>
        </Link>

        {/* Tasks */}
        <Card className="group flex min-h-[116px] sm:h-[128px] flex-col justify-between overflow-hidden p-3.5 sm:p-4 shadow-card border-l-4 border-l-violet-500 transition-shadow hover:shadow-md">
          <div className="flex justify-between items-start h-full gap-2">
            <div className="flex flex-col justify-between h-full min-w-0 flex-1">
              <div>
                <p className="mb-0.5 sm:mb-1 text-[13px] sm:text-[14px] font-medium text-ink-soft">Tasks</p>
                <div className="flex flex-wrap items-baseline gap-1.5 sm:gap-2 mb-1">
                  <span className="text-[22px] sm:text-[26px] font-semibold leading-none text-ink">{tasks ? tasks.open : <Pending />}</span>
                  {tasks && <span className="text-[12px] sm:text-[14px] text-muted">open · {tasks.done} done</span>}
                </div>
              </div>
              <div className="flex flex-wrap gap-1 sm:gap-2 mt-auto">
                {tasks && tasks.urgent > 0 && <span className="bg-red-50 border-red-200 border text-danger text-[9.5px] sm:text-[10px] tracking-wider font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">{tasks.urgent} URGENT</span>}
                {tasks && tasks.due_today > 0 && <span className="bg-amber-100 border-amber-200 border text-amber-600 text-[9.5px] sm:text-[10px] tracking-wider font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full">{tasks.due_today} DUE TODAY</span>}
                {tasks && tasks.urgent === 0 && tasks.due_today === 0 && <span className="text-[11.5px] sm:text-[12.5px] text-muted">Nothing urgent or due today</span>}
              </div>
            </div>

            <div className="h-11 w-11 sm:h-[52px] sm:w-[52px] md:h-[60px] md:w-[60px] rounded-xl bg-purple-100 flex items-center justify-center text-violet-500 shrink-0 transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-[1.12] group-hover:-translate-y-1 group-hover:shadow-sm">
              <svg className="w-6 h-6 sm:w-7 sm:h-7 md:w-8 md:h-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M16 22h2c.5 0 1-.2 1.4-.6.4-.4.6-.9.6-1.4V7.5L14.5 2H6c-.5 0-1 .2-1.4.6C4.2 3.1 4 3.6 4 4v3"></path>
                <polyline points="14 2 14 8 20 8"></polyline>
                <circle cx="8" cy="16" r="6"></circle>
                <path d="M8 14v2l1.5 1.5"></path>
              </svg>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
