"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchInput } from "@/components/ui/SearchInput";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { canEditStructure, canManageTeams } from "@/features/hierarchy";
import { useAuthStore } from "@/store/useAuthStore";
import { HierarchyTree } from "./HierarchyTree";
import { SupervisorsTeams } from "./SupervisorsTeams";

type Tab = "hierarchy" | "teams";

const TABS = [
  { key: "hierarchy" as const, label: "Hierarchy" },
  { key: "teams" as const, label: "Supervisors and teams" },
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
  const [query, setQuery] = useState("");

  const actions =
    tab === "hierarchy" ? (
      <>
        <SearchInput value={query} onChange={setQuery} placeholder="Search employees..." />
        {canEditStructure(role) && (
          <Button variant="brand" className="w-full gap-2 sm:w-auto">
            <PlusIcon />
            Add employee
          </Button>
        )}
      </>
    ) : (
      canManageTeams(role) && (
        <>
          <Button variant="outline" className="w-full font-semibold sm:w-auto">
            Assign kebeles
          </Button>
          <Button variant="brand" className="w-full gap-2 sm:w-auto">
            <PlusIcon />
            New team
          </Button>
        </>
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
      {tab === "hierarchy" ? <HierarchyTree query={query} /> : <SupervisorsTeams />}
    </div>
  );
}
