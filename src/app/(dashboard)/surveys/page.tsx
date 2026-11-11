import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/Pill";
import { RolePerformance } from "../performance/components/RolePerformance";
import { SupervisorSurveys } from "./components/SupervisorSurveys";
import { SurveyTasks } from "./components/SurveyTasks";

export const metadata: Metadata = {
  title: "Surveys | OpenAgriNet",
  description: "Farmer satisfaction survey response collection.",
};

export default async function SurveysPage(props: PageProps<"/surveys">) {
  const { view } = await props.searchParams;
  // Supervisors get templates + results analytics; DAs keep their assigned-survey task list.
  return (
    <RolePerformance
      supervisor={<SupervisorSurveys initialView={view === "templates" ? "templates" : "results"} />}
      agent={
        <div className="flex w-full flex-col gap-4">
          <PageHeader
            title="Surveys"
            titleAddon={<Pill tone="slate">Analyse — Part 2 preview</Pill>}
            description="Field collection of farmer satisfaction surveys: assigned task → consent → question-by-question capture → offline sync → results. Templates are versioned; a deployment stays bound to the version it was published with."
          />
          <SurveyTasks />
        </div>
      }
    />
  );
}
