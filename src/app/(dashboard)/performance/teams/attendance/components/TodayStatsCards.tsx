"use client";

import { Card } from "@/components/ui/Card";

interface TodayStatsCardsProps {
  checkedInCount?: number;
  notCheckedInCount?: number;
  totalAgents?: number;
}

export function TodayStatsCards({
  checkedInCount = 7,
  notCheckedInCount = 2,
  totalAgents = 9,
}: TodayStatsCardsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Checked In Card */}
      <Card className="flex items-center justify-between p-5 shadow-card border border-line bg-white">
        <div>
          <p className="text-[13.5px] font-medium text-ink-soft">Checked in</p>
          <p className="mt-1 text-[32px] sm:text-[36px] font-bold tracking-tight text-ink leading-none">
            {checkedInCount}
          </p>
          <p className="mt-1.5 text-[12.5px] text-muted">
            of {totalAgents} agents
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand-mint text-brand-green">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
      </Card>

      {/* Not Checked In Card */}
      <Card className="flex items-center justify-between p-5 shadow-card border border-line bg-white">
        <div>
          <p className="text-[13.5px] font-medium text-ink-soft">Not checked in</p>
          <p className="mt-1 text-[32px] sm:text-[36px] font-bold tracking-tight text-ink leading-none">
            {notCheckedInCount}
          </p>
          <p className="mt-1.5 text-[12.5px] text-muted">
            Yet to check in
          </p>
        </div>

        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-danger-wash text-danger">
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="15" y1="9" x2="9" y2="15" />
            <line x1="9" y1="9" x2="15" y2="15" />
          </svg>
        </div>
      </Card>
    </div>
  );
}
