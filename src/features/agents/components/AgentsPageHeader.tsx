"use client";

import type { ReactNode } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { useAuthStore } from "@/store/useAuthStore";

interface AgentsPageHeaderProps {
  actions?: ReactNode;
}

// Shared by every Agents module screen (master registry, DA-ID, Fayda, Registry sync): the header always names
// the parent module; the active tab's name lives on its table section instead. The Supervisor knows the registry
// of their Woreda as "My Teams".
export function AgentsPageHeader({ actions }: AgentsPageHeaderProps = {}) {
  const isSupervisor = useAuthStore((s) => s.role) === "Supervisor";
  return (
    <PageHeader
      title={isSupervisor ? "My Teams" : "Agents"}
      description="Single source of truth for Development Agents. Records enter by bulk import or MoA sync and are published after Woreda approval."
      actions={actions}
    />
  );
}
