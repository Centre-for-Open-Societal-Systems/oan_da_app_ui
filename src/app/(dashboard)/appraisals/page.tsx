import type { Metadata } from "next";
import { SupervisorAppraisals } from "../performance/components/SupervisorAppraisals";

export const metadata: Metadata = {
  title: "Appraisals | OpenAgriNet",
  description: "Self-appraisals, your reviews and scores for this half-year.",
};

export default function AppraisalsPage() {
  return <SupervisorAppraisals />;
}
