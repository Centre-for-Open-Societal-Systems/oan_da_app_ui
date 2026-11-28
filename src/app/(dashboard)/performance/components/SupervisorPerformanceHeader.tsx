"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { WOREDA_SUMMARY } from "@/features/performance";
import { useScopeAreaNames } from "@/features/geo";
import { DateRangeDropdown } from "../../dashboard/components/DateRangeDropdown";

export function SupervisorPerformanceHeader() {
  // Every Region from the geo Master Data; the first one until the user picks.
  const regions = useScopeAreaNames("region", []);
  const [picked, setRegion] = useState("");
  const region = picked || regions[0] || "";

  return (
    <Card className="relative z-50 flex flex-col gap-4 px-4 py-5 shadow-card md:flex-row md:items-center md:justify-between">
      <div>
        <h1 className="text-[20px] font-semibold tracking-tight text-ink sm:text-[22px]">My Performance</h1>
        <p className="hidden mt-1.5 text-[14px] text-ink-soft">
          {WOREDA_SUMMARY.woreda} · {WOREDA_SUMMARY.agentCount} development agents
        </p>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
        <Dropdown
          value={region}
          onChange={setRegion}
          options={regions}
          align="right"
          className="sm:w-[170px] [&>button]:h-9 [&>button]:rounded-lg [&>button]:border-zinc-200"
          renderValue={(o) => <span className="text-[13.5px] text-slate-700">Region: {o.label}</span>}
        />
        {/* Same period picker as the role dashboards */}
        <DateRangeDropdown />
        <Link
          href="/performance/kpi-entry"
          className="inline-flex shrink-0 whitespace-nowrap h-9 items-center justify-center gap-1.5 rounded-md bg-brand-green px-3.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-green-dark"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
            <path d="M12 5v14M5 12h14" />
          </svg>
          KPI entry / import
        </Link>
      </div>
    </Card>
  );
}
