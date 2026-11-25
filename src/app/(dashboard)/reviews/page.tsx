import type { Metadata } from "next";
import { RolePerformance } from "../performance/components/RolePerformance";
import { ReviewsWorkspace } from "./components/ReviewsWorkspace";
import { SupervisorReviews } from "./components/SupervisorReviews";

export const metadata: Metadata = {
  title: "Reviews | OpenAgriNet",
  description: "Review and support development agents in your woreda.",
};

const TABS = ["Reviews", "Goals", "Dev plan", "Coaching", "Recognition", "Trends"] as const;

export default async function ReviewsPage(props: PageProps<"/reviews">) {
  const { tab } = await props.searchParams;
  const activeTab = typeof tab === "string" ? TABS.find((item) => item.toLowerCase() === tab.toLowerCase()) ?? "Reviews" : "Reviews";
  // Supervisors get the coaching-review history; Admin keeps the registry-style workspace.
  return <RolePerformance supervisor={<SupervisorReviews />} agent={<ReviewsWorkspace key={activeTab} initialTab={activeTab} />} />;
}
