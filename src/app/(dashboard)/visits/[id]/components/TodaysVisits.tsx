"use client";

import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { cn } from "@/lib/utils";
import { canLogOutcome, canStartVisit, isOnPlanner, toTodaysVisit, toVisitRecord, type VisitRecord } from "@/features/visits";
import { ARRIVAL_STYLES } from "./arrivalStyles";
import { longDate, todayIso, TODAY } from "./calendar";
import { usePlannerVisits } from "./usePlannerVisits";
import { VisitLocationsButton } from "./VisitLocationsButton";

interface TodaysVisitsProps {
  daId?: string;
  reload: number;
  canAct: (visit: VisitRecord) => boolean;
  onStart: (visit: VisitRecord) => void;
  onLogOutcome: (visit: VisitRecord) => void;
}

export function TodaysVisits({ daId, reload, canAct, onStart, onLogOutcome }: TodaysVisitsProps) {
  const { items, error, loading } = usePlannerVisits({ date: todayIso, da_id: daId }, reload);
  const today = items.filter(isOnPlanner);
  const visits = today.map(toTodaysVisit);
  const records = today.map(toVisitRecord);
  // In progress first: the visit under way has to be closed before the next one is started.
  const next = records.find((r) => canAct(r) && canLogOutcome(r)) ?? records.find((r) => canAct(r) && canStartVisit(r));
  const todayLabel = longDate(TODAY);

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
        <div>
          <h3 className="text-[15px] font-semibold text-ink">Today&apos;s visits</h3>
          <p className="mt-0.5 text-[13.5px] text-ink-soft">Visits you&apos;ve arranged with farmers for {todayLabel}</p>
        </div>
        <VisitLocationsButton visits={visits} todayLabel={todayLabel} />
      </div>

      <div className="flex flex-col gap-4 p-4">
        <div className="flex gap-2.5 rounded-lg border border-line bg-surface px-4 py-3 text-[13px] leading-snug text-slate-600">
          <svg className="mt-0.5 h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" /><path d="M12 11v5M12 8h.01" />
          </svg>
          <p>You arrange and order visits directly with farmers based on their availability - the app does not assign or optimise routes.</p>
        </div>

        {error && <ErrorAlert message={error} />}
        {loading && <p className="px-1 text-[13.5px] text-muted">Loading visits…</p>}
        {!loading && !error && visits.length === 0 && <p className="px-1 text-[13.5px] text-muted">No visits planned for today.</p>}

        <ol className="flex flex-col gap-2 px-1">
          {visits.map((v, index) => {
            const style = ARRIVAL_STYLES[v.state];
            return (
              <li key={v.id} className="flex items-start gap-3 py-1 sm:items-center sm:gap-4">
                <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[12px] font-semibold", style.step)}>
                  {index + 1}
                </span>
                <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                  <div className="min-w-0">
                    <p className="text-[14.5px] font-semibold text-ink">{v.farmerName}</p>
                    <p className="mt-0.5 text-[13px] text-muted">Planned arrival · {v.plannedArrival}</p>
                  </div>
                  {v.state === "done" && (
                    <span className="w-fit rounded-full border border-brand-border bg-brand-mint px-3 py-0.5 text-[12.5px] font-medium text-brand-green">Done</span>
                  )}
                  <span className={cn("w-fit rounded-full border px-3 py-1 text-[12.5px] font-medium sm:ml-auto sm:shrink-0", style.pill)}>{v.note}</span>
                </div>
              </li>
            );
          })}
        </ol>

        {next && canLogOutcome(next) && (
          <Button type="button" variant="brand" onClick={() => onLogOutcome(next)} className="w-full gap-2">
            Log outcome · {next.farmerName}
          </Button>
        )}
        {next && !canLogOutcome(next) && (
          <Button type="button" variant="brand" onClick={() => onStart(next)} className="w-full gap-2">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M6 4l14 8-14 8V4z" /></svg>
            Start visit · {next.farmerName}
          </Button>
        )}
        {!next && visits.length > 0 && visits.every((v) => v.state === "done") && (
          <Banner tone="success" className="text-center font-medium">
            All of today&apos;s visits are done.
          </Banner>
        )}
      </div>
    </Card>
  );
}
