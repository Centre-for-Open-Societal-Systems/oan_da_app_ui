"use client";

import { useState } from "react";
import { TopHeader } from "./TopHeader";
import { KpiTiles, KPI_RANGES } from "./KpiTiles";

const DEFAULT_RANGE = "Last 30 days";

// DA home header + KPI tiles: the date range picked in the header narrows the date-ranged tiles.
export function AgentOverview() {
  const [range, setRange] = useState<string>(DEFAULT_RANGE);

  return (
    <>
      <TopHeader ranges={KPI_RANGES} range={range} onRangeChange={setRange} />
      <KpiTiles range={range} />
    </>
  );
}
