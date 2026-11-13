import { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { FARMER_PAGE_TABS } from "@/features/farmers";
import { PlanVisitButton } from "@/features/farmers";
import { UploadEvidenceButton } from "@/features/grievances";
import { VisitsStats } from "./components/VisitsStats";
import { VisitsTable } from "./components/VisitsTable";

export const metadata: Metadata = {
  title: "Visits | OpenAgriNet",
  description: "Planned and completed field visits.",
};

export default function VisitsPage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader
        tabs={FARMER_PAGE_TABS}
        activeHref="/visits"
        title="Visits"
        description="Planned and completed field visits. Visits are planned from farmer availability the DA gathers offline - no app-mandated routes."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <UploadEvidenceButton />
            <PlanVisitButton className="shrink-0" />
          </div>
        }
      />

      <VisitsStats />
      <VisitsTable />
    </div>
  );
}
