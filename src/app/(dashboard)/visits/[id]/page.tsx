import type { Metadata } from "next";
import { VisitPlanner } from "./components/VisitPlanner";

export const metadata: Metadata = {
  title: "Visit Planner | OpenAgriNet",
};

export default async function VisitPlannerPage(props: PageProps<"/visits/[id]">) {
  const { id } = await props.params;
  return <VisitPlanner visitId={id} />;
}
