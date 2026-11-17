"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthStore } from "@/store/useAuthStore";

// Shared by every Agents module screen (master registry, DA-ID, Fayda, Registry sync): the header always names
// the parent module; the active tab's name lives on its table section instead. The Supervisor knows the registry
// of their Woreda as "My Teams".
export function AgentsPageHeader() {
  const isSupervisor = useAuthStore((s) => s.role) === "Supervisor";
  return (
    <PageHeader
      title={isSupervisor ? "My Teams" : "Agents"}
      description="Single source of truth for Development Agents. Records enter by bulk import or MoA sync and are published after Woreda approval."
    />
  );
}
