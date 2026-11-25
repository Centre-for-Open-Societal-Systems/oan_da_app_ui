"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { fetchTodayPlan, todayIso, type TodayItem } from "@/features/dashboard";

const STATUS_STYLE: Record<TodayItem["status"], string> = {
  Upcoming: "bg-blue-100 text-blue-600",
  "Due today": "bg-amber-100 text-amber-700",
  Overdue: "bg-red-50 text-danger",
  Done: "bg-emerald-100 text-brand-green",
};

const ROW = "group flex items-center border-b border-line-soft px-3.5 sm:px-5 py-2.5 sm:py-3 transition-colors last:border-0";

function PlanRow({ item }: { item: TodayItem }) {
  const content = (
    <>
      <div className="w-[56px] sm:w-[68px] shrink-0">
        <span className="rounded-md bg-slate-100 px-2 py-0.5 sm:px-2.5 sm:py-1 text-[11px] sm:text-[12.5px] font-medium text-slate-600">{item.time ?? "Any time"}</span>
      </div>

      <div className="min-w-0 flex-1 px-2.5 sm:px-4">
        <p className={cn("truncate text-[13px] sm:text-[14px] font-medium text-ink", item.kind === "visit" && "transition-colors group-hover:text-brand-green", item.status === "Done" && "text-muted line-through")}>{item.title}</p>
        <p className="mt-0.5 truncate text-[11.5px] sm:text-[13px] text-muted">{item.subtitle}</p>
      </div>

      <span className={cn("shrink-0 rounded-full px-2 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-semibold uppercase tracking-wide border-b border-danger-border", STATUS_STYLE[item.status])}>{item.status}</span>
    </>
  );

  // Visits open in the planner. Tasks have no page in the portal yet, so their rows are not links.
  return item.kind === "visit" ? (
    <Link href={item.href} className={cn(ROW, "hover:bg-surface")}>{content}</Link>
  ) : (
    <div className={ROW}>{content}</div>
  );
}

// Today's Plan from GET /dashboard/today: the DA's visits and tasks for today, in clock order.
export function TodayPlanListSection() {
  const [state, setState] = useState<{ items: TodayItem[] | null; error: string | null }>({ items: null, error: null });

  useEffect(() => {
    let current = true;
    fetchTodayPlan(todayIso())
      .then((items) => current && setState({ items, error: null }))
      .catch((err: unknown) => current && setState({ items: null, error: err instanceof Error ? err.message : "Please try again in a moment." }));
    return () => {
      current = false;
    };
  }, []);

  const { items, error } = state;

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="flex items-center justify-between border-b border-line px-4 py-3 sm:px-5 sm:py-3.5">
        <h3 className="text-[14px] sm:text-[15px] font-semibold text-ink">
          Today&apos;s Plan
          {items && items.length > 0 && <span className="ml-2 rounded-full bg-slate-100 px-2 py-0.5 text-[11px] sm:text-[12px] font-medium text-muted">{items.length}</span>}
        </h3>
        <Link href="/visits/v-1001" className="flex items-center gap-1 text-[12px] sm:text-[13px] font-semibold text-brand-green transition-all hover:underline">
          View calendar <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
      <div className="flex flex-col">
        {error ? (
          <p className="px-4 py-5 sm:px-5 sm:py-6 text-center text-[13px] sm:text-[13.5px] text-danger">Could not load today&apos;s plan. {error}</p>
        ) : !items ? (
          [0, 1, 2].map((i) => (
            <div key={i} className={ROW}>
              <div className="h-6 w-[52px] animate-pulse rounded-md bg-slate-100" />
              <div className="ml-4 flex-1 space-y-1.5">
                <div className="h-3.5 w-1/2 animate-pulse rounded bg-slate-100" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-slate-100" />
              </div>
            </div>
          ))
        ) : items.length === 0 ? (
          <div className="px-4 py-6 sm:px-5 sm:py-8 text-center">
            <p className="text-[13.5px] sm:text-[14px] font-medium text-ink">Nothing planned for today</p>
            <p className="mt-1 text-[12px] sm:text-[13px] text-muted">Visits and tasks scheduled for today will show up here.</p>
          </div>
        ) : (
          items.map((item) => <PlanRow key={`${item.kind}-${item.id}`} item={item} />)
        )}
      </div>
    </Card>
  );
}
