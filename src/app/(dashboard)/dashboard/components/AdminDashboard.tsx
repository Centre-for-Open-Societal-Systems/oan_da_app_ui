"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { RECENT_ACTIVITY, REGISTRATIONS_TREND, type ActivityTone } from "@/features/dashboard";
import { RegistrationsTrendChart } from "./RegistrationsTrendChart";
import { PendingRegistrations } from "./PendingRegistrations";
import { DateRangeDropdown } from "./DateRangeDropdown";
import { KpiTiles, KPI_RANGES } from "./KpiTiles";

const AVATAR_TONES: Record<ActivityTone, string> = {
  green: "bg-brand-border-soft text-brand-green",
  blue: "bg-blue-100 text-blue-600",
  purple: "bg-violet-100 text-violet-600",
  amber: "bg-orange-100 text-orange-700",
};

// OAN / ATI Administrator home: registry KPIs, registration trend, recent activity and pending registrations.
export function AdminDashboard() {
  const [range, setRange] = useState("Last 30 days");
  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="relative z-50 flex w-full flex-col justify-between gap-4 px-4 py-5 shadow-card md:flex-row md:items-center">
        <div>
          <h1 className="text-[20px] font-semibold tracking-tight text-ink sm:text-[22px]">Dashboard</h1>
          <p className="hidden mt-1.5 text-[14px] text-ink-soft">National registry overview · all regions</p>
        </div>
        <DateRangeDropdown ranges={KPI_RANGES} defaultValue="Last 30 days" onChange={setRange} />
      </Card>

      <KpiTiles range={range} />

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Card className="p-0 shadow-card">
          <h2 className="border-b border-line px-5 py-3.5 text-[15px] font-semibold text-ink">Monthly Registrations Trend</h2>
          <div className="px-5 py-5">
            <RegistrationsTrendChart points={REGISTRATIONS_TREND} seriesLabel="New Farmers (2024)" />
          </div>
        </Card>

        <Card className="p-0 shadow-card">
          <h2 className="border-b border-line px-5 py-3.5 text-[15px] font-semibold text-ink">Recent Activity</h2>
          <ul className="flex flex-col gap-3 p-4">
            {RECENT_ACTIVITY.map((item) => (
              <li key={item.id} className="group flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-2.5 transition-all hover:border-brand-green/30 hover:bg-white hover:shadow-sm">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[13px] font-semibold transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:scale-110", AVATAR_TONES[item.tone])}>
                  {item.initials}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-[14px] font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 text-[13px] text-ink-soft">{item.place} · {item.at}</p>
                </div>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <PendingRegistrations />
    </div>
  );
}
