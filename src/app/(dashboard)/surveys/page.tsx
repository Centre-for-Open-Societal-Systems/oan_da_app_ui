import type { Metadata } from "next";
import { PageHeader } from "@/components/ui/PageHeader";
import { SupervisorSurveys } from "./components/SupervisorSurveys";
import { SurveyTasks } from "./components/SurveyTasks";
import { SurveysByRole } from "./components/SurveysByRole";

export const metadata: Metadata = {
  title: "Surveys | OpenAgriNet",
  description: "Farmer satisfaction survey templates, response collection and results.",
};

export default async function SurveysPage(props: PageProps<"/surveys">) {
  const { view, survey } = await props.searchParams;
  const surveyId = typeof survey === "string" ? survey : undefined;
  // Officers (Supervisor, Admin, Executive) get templates + results; DAs get their assigned-survey list.
  return (
    <SurveysByRole
      officer={<SupervisorSurveys key={`${view}-${surveyId ?? ""}`} initialView={view === "templates" ? "templates" : "results"} initialSurvey={surveyId} />}
      agent={
        <div className="flex w-full flex-col gap-4">
          <PageHeader title="Surveys" description="Farmer satisfaction surveys assigned to you: pick a farmer, take consent, capture the answers. Each survey stays on the template version it was published with." />
          <SurveyTasks />
        </div>
      }
    />
  );
}
