import type { Metadata } from "next";
import { LeaveOverview } from "./LeaveOverview";

export const metadata: Metadata = {
  title: "Leave Overview | OpenAgriNet",
  description: "Leave requests, approved leaves, pending approvals and upcoming absences by region.",
};

export default function LeaveOverviewPage() {
  return <LeaveOverview />;
}
