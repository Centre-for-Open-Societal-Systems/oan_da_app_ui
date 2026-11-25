import type { Metadata } from "next";
import { TeamLeave } from "./TeamLeave";

export const metadata: Metadata = {
  title: "Team Leave | OpenAgriNet",
  description: "Who in the Woreda team is on leave, and who is away soon.",
};

export default function TeamLeavePage() {
  return <TeamLeave />;
}
