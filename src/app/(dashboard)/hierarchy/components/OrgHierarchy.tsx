"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { canEditStructure, canManageTeams } from "@/features/hierarchy";
import { useAuthStore } from "@/store/useAuthStore";
import { HierarchyTree } from "./HierarchyTree";
import { SupervisorsTeams } from "./SupervisorsTeams";

type Tab = "hierarchy" | "teams";

const TABS = [
  {
    key: "hierarchy" as const,
    label: "Hierarchy",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <rect x="2" y="17" width="6" height="4" rx="1" />
        <rect x="16" y="17" width="6" height="4" rx="1" />
        <path d="M12 7v4m0 0H5v6m7-6h7v6" />
      </svg>
    ),
  },
  {
    key: "teams" as const,
    label: "Supervisors and teams",
    icon: (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
];

const HIERARCHY_TEXT = "Who reports to whom, from the region down to each Development Agent. Targets, appraisals and leave follow these reporting lines.";
const TEAMS_TEXT = "Who supervises whom in each woreda. Targets, figures, appraisals and leave follow each agent’s “Reports to”.";
const DA_TEAMS_TEXT = "Your team and who you report to. Your targets, figures, appraisals and leave follow your “Reports to”.";

const PlusIcon = () => (
  <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" aria-hidden="true">
    <path d="M12 5v14M5 12h14" />
  </svg>
);

// Org Hierarchy: the employee tree (from the user's place down) and the supervisors and teams of a woreda, per role. UI only.
export function OrgHierarchy() {
  const role = useAuthStore((s) => s.role);
  const [tab, setTab] = useState<Tab>("hierarchy");

  const actions =
    tab === "hierarchy" ? (
      canEditStructure(role) ? (
        <Button variant="brand" className="w-full gap-2 sm:w-auto rounded-xl shadow-xs">
          <PlusIcon />
          Add employee
        </Button>
      ) : undefined
    ) : (
      canManageTeams(role) && (
        <div className="flex flex-row items-center gap-2.5 w-full sm:w-auto">
          <Button variant="outline" className="flex-1 sm:flex-initial h-10 px-4 font-semibold rounded-xl text-[13.5px] sm:text-[14px] shadow-2xs">
            Assign kebeles
          </Button>
          <Button variant="brand" className="flex-1 sm:flex-initial h-10 px-4.5 gap-2 rounded-xl shadow-xs text-[13.5px] sm:text-[14px]">
            <PlusIcon />
            New team
          </Button>
        </div>
      )
    );

  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader
        title="Org Hierarchy"
        description={tab === "hierarchy" ? HIERARCHY_TEXT : role === "DA" ? DA_TEAMS_TEXT : TEAMS_TEXT}
        showDescription
        tabBar={<SegmentTabs tabs={TABS} active={tab} onChange={setTab} label="Org hierarchy views" />}
        actions={actions || undefined}
      />
      {tab === "hierarchy" ? <HierarchyTree /> : <SupervisorsTeams />}
    </div>
  );
}
