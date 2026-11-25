import type { Metadata } from "next";
import { SupervisorTeam } from "../components/SupervisorTeam";

export const metadata: Metadata = {
  title: "My Team | OpenAgriNet",
  description: "Your agents' monthly figures, half-year progress and waiting target discussions.",
};

export default function SupervisorTeamPage() {
  return <SupervisorTeam />;
}
