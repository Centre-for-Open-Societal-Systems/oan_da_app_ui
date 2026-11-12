import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SurveysByRole } from "../../components/SurveysByRole";
import { TemplateDetail } from "./components/TemplateDetail";

export const metadata: Metadata = {
  title: "Survey template | OpenAgriNet",
  description: "A published survey template: questions, translations, assignment and window.",
};

export default async function SurveyTemplatePage(props: PageProps<"/surveys/templates/[id]">) {
  const { id } = await props.params;
  return (
    <SurveysByRole
      officer={<TemplateDetail id={id} />}
      agent={<Card className="shadow-card"><EmptyState title="Supervisors only" hint="Survey templates are published by Woreda supervisors." /></Card>}
    />
  );
}
