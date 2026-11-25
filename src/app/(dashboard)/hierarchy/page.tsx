import type { Metadata } from "next";
import { OrgHierarchy } from "./components/OrgHierarchy";

export const metadata: Metadata = {
  title: "Org Hierarchy | OpenAgriNet",
  description: "Reference hierarchy for DA assignment, farmer linkage and role scoping, with the supervisors and teams of each woreda.",
};

export default function HierarchyPage() {
  return <OrgHierarchy />;
}
