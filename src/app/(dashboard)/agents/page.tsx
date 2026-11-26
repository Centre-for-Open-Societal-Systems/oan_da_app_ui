import type { Metadata } from "next";
import { AgentsRegistry } from "./components/AgentsRegistry";

export const metadata: Metadata = {
  title: "Agents | OpenAgriNet",
  description: "DA master registry — the single source of truth for the extension workforce.",
};

export default function AgentsPage() {
  return (
    <div className="flex w-full flex-col gap-3.5 sm:gap-4 md:gap-5">
      <AgentsRegistry />
    </div>
  );
}
