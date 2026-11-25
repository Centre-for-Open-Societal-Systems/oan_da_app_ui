"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { AdvancedFiltersDrawer, type FilterFieldConfig } from "@/components/ui/AdvancedFiltersDrawer";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { matchesQuery } from "@/lib/search";
import { KeyDates } from "../lifecycle/components/KeyDates";
import { ICONS } from "../lifecycle/components/shared";
import { PageIntro, SELECT_CLASS, SummaryTile, has, optionsOf } from "../leave-admin/shared";

interface RegionRow {
  region: string;
  leaveYear: string;
  agents: number;
  onLeave: number;
  waiting: number;
  policy: string;
}

// Sample figures until the leave reporting API exists.
const ROWS: RegionRow[] = [
  { region: "South Ethiopia", leaveYear: "Ethiopian fiscal year", agents: 27410, onLeave: 512, waiting: 212, policy: "To confirm" },
  { region: "Amhara", leaveYear: "Ethiopian fiscal year", agents: 19456, onLeave: 321, waiting: 45, policy: "Federal base" },
  { region: "Sidama", leaveYear: "Ethiopian fiscal year", agents: 4563, onLeave: 64, waiting: 23, policy: "1 override" },
  { region: "Oromia", leaveYear: "Ethiopian fiscal year", agents: 9123, onLeave: 87, waiting: 46, policy: "To confirm" },
  { region: "Tigray", leaveYear: "Gregorian year", agents: 19456, onLeave: 321, waiting: 45, policy: "Federal base" },
  { region: "Somali", leaveYear: "Ethiopian fiscal year", agents: 4563, onLeave: 64, waiting: 23, policy: "2 override" },
  { region: "Jigda", leaveYear: "Not set yet", agents: 9123, onLeave: 87, waiting: 46, policy: "To confirm" },
  { region: "Shayan", leaveYear: "Ethiopian fiscal year", agents: 4563, onLeave: 64, waiting: 23, policy: "1 override" },
  { region: "Benishangul", leaveYear: "Ethiopian fiscal year", agents: 9123, onLeave: 87, waiting: 46, policy: "To confirm" },
];

const policyTone = (policy: string): PillTone => (policy === "To confirm" ? "amber" : policy === "Federal base" ? "slate" : "blue");

const EMPTY_FILTERS = { region: new Set<string>(), leaveYear: new Set<string>(), policy: new Set<string>() };
type FilterKey = keyof typeof EMPTY_FILTERS;

export function LeaveOverview() {
  const router = useRouter();
  const [scope, setScope] = useState("All regions");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const options = {
    region: optionsOf(ROWS.map((r) => r.region)),
    leaveYear: optionsOf(ROWS.map((r) => r.leaveYear)),
    policy: optionsOf(ROWS.map((r) => r.policy)),
  };
  const fields: FilterFieldConfig[] = [
    { key: "region", label: "Region", allLabel: "All Regions", placeholder: "All Regions", options: options.region },
    { key: "leaveYear", label: "Leave Year", allLabel: "All Leave Years", placeholder: "All Leave Years", options: options.leaveYear },
    { key: "policy", label: "Policy", allLabel: "All Policies", placeholder: "All Policies", options: options.policy },
  ];
  const activeCount = Object.values(filters).filter((set) => set.size > 0).length;
  const setFilter = (key: FilterKey) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [key]: next }));

  const shown = ROWS.filter(
    (r) =>
      (scope === "All regions" || r.region === scope) &&
      has(filters.region, r.region) &&
      has(filters.leaveYear, r.leaveYear) &&
      has(filters.policy, r.policy) &&
      matchesQuery(query, r.region, r.leaveYear, r.policy),
  );
  const unconfirmed = ROWS.filter((r) => r.policy === "To confirm").length;

  const filterHeader = (key: FilterKey, label: string, allLabel: string) => (
    <FilterDropdown label={label} allLabel={allLabel} options={options[key]} selected={filters[key]} onApply={setFilter(key)} />
  );
  const columns: Column<RegionRow>[] = [
    { key: "region", header: filterHeader("region", "Region", "All Regions"), cell: (r) => <span className="font-semibold text-ink">{r.region}</span> },
    { key: "leaveYear", header: filterHeader("leaveYear", "Leave Year", "All Leave Years"), cell: (r) => r.leaveYear },
    { key: "agents", header: "Agents", cell: (r) => r.agents.toLocaleString("en-US") },
    { key: "onLeave", header: "On Leave", cell: (r) => r.onLeave.toLocaleString("en-US") },
    { key: "waiting", header: "Waiting", cell: (r) => r.waiting.toLocaleString("en-US") },
    { key: "policy", header: filterHeader("policy", "Policy", "All Policies"), cell: (r) => <Pill tone={policyTone(r.policy)} className="px-2.5 py-0.5">{r.policy}</Pill> },
  ];

  return (
    <div className="flex w-full flex-col gap-5">
      <PageIntro title="Leave Overview" help="Leave across all regions: who is away today, requests waiting, statutory leave and kebeles without cover. Select a region to see its policy." description="Get a quick overview of team leave requests, approved leaves, pending approvals, and upcoming absences.">
        <Select value={scope} onChange={(e) => setScope(e.target.value)} className={SELECT_CLASS}>
          <option>All regions</option>
          {options.region.map((o) => (
            <option key={o.value}>{o.value}</option>
          ))}
        </Select>
        <Button variant="outline" className="h-10" onClick={() => router.push("/leave-configure")}>Leave Config</Button>
      </PageIntro>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="On leave today" help="Agents with approved leave that includes today, in the areas you can see." value="1,240" note="1.7% of 71,860 agents" accent="emerald" icon="M22 10L12 5 2 10l10 5 10-5zM6 12v5c3 2.5 9 2.5 12 0v-5" />
        <SummaryTile label="Request waiting" help="Leave requests still waiting for a decision. The note shows how many have waited more than 3 days." value={312} note="86 over 3 days" accent="blue" icon={ICONS.file} />
        <SummaryTile label="Maternity and Paternity" help="Agents on maternity or paternity leave right now." value={298} note="Active now" accent="amber" icon={ICONS.file} />
        <SummaryTile label="Coverage gaps" help="Kebeles where the DA is on leave and no cover DA has been named." value={56} note="Kebele without cover" accent="violet" icon={ICONS.calendar} />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="flex flex-col gap-5">
          <Card className="overflow-hidden p-0">
            <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <h3 className="text-[17px] font-bold text-ink">All leaves</h3>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <SearchInput value={query} onChange={setQuery} placeholder="Search Region, Leave year..." className="sm:[&_input]:w-[220px]" />
                <AdvancedFiltersButton activeCount={activeCount} onClick={() => setIsFiltersOpen(true)} />
              </div>
            </div>
            <DataTable columns={columns} rows={shown} rowKey={(r) => r.region} itemLabel="regions" minWidth="640px" emptyTitle="No regions match these filters" emptyHint="Clear a filter or search for another region." />
            <AdvancedFiltersDrawer
              isOpen={isFiltersOpen}
              onClose={() => setIsFiltersOpen(false)}
              fields={fields}
              filters={filters}
              onApply={(next) => setFilters({ region: next.region ?? new Set(), leaveYear: next.leaveYear ?? new Set(), policy: next.policy ?? new Set() })}
            />
          </Card>

          {unconfirmed > 0 && (
            <Banner tone="warning" title={`${unconfirmed} regions have not confirmed their leave policy`}>
              Tigray and Afar still use the Federal base without confirmation.
            </Banner>
          )}
        </div>

        <KeyDates />
      </div>
    </div>
  );
}
