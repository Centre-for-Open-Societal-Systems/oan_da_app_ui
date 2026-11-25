import type { Metadata } from "next";
import { TEAM_MEMBERS } from "@/features/performance";
import { SetTargets, type Tab } from "../../components/SetTargets";

export const metadata: Metadata = {
  title: "Set Targets | OpenAgriNet",
  description: "Set an agent's half-year targets and follow up on discussions.",
};

const TABS: Tab[] = ["targets", "goals", "figures", "appraisal"];

export default async function SetTargetsPage(props: { searchParams: Promise<{ agent?: string; tab?: string }> }) {
  const { agent, tab } = await props.searchParams;
  const member = TEAM_MEMBERS.find((m) => m.name === agent) ?? TEAM_MEMBERS[0];
  const initialTab = TABS.find((t) => t === tab);
  return <SetTargets key={`${member.name}-${initialTab}`} agent={member} initialTab={initialTab} />;
}
