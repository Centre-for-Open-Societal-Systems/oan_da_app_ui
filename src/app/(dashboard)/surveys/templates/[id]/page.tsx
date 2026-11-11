import type { Metadata } from "next";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RolePerformance } from "../../../performance/components/RolePerformance";
import { TemplateBuilder } from "./components/TemplateBuilder";

export const metadata: Metadata = {
  title: "Survey template | OpenAgriNet",
  description: "Design, translate and publish a survey template.",
};

// Templates live in the client-side catalog store, so the builder reads the id itself.
export default function SurveyTemplatePage() {
  return (
    <RolePerformance
      supervisor={<TemplateBuilder />}
      agent={<Card className="shadow-card"><EmptyState title="Supervisors only" hint="Survey templates are designed and published by Woreda supervisors." /></Card>}
    />
  );
}
