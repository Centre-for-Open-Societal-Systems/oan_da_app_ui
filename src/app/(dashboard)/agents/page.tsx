import type { Metadata } from "next";
import { AgentsPageHeader, ModuleStrip } from "@/features/agents";
import { AgentsRegistry } from "./components/AgentsRegistry";

export const metadata: Metadata = {
  title: "Agents | OpenAgriNet",
  description: "DA master registry — the single source of truth for the extension workforce.",
};

export default function AgentsPage() {
  return (
    <div className="flex w-full flex-col gap-4">
      <AgentsPageHeader />
      <ModuleStrip activeHref="/agents" />
      <AgentsRegistry />
    </div>
  );
}
