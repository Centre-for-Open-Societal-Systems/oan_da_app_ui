import type { ReactNode } from "react";
import { AgentsRoleGate } from "./components/AgentsRoleGate";

// Every /agents page (registry, DA profile, DA-ID, Fayda) is closed to the DA role: see AgentsRoleGate.
export default function AgentsLayout({ children }: { children: ReactNode }) {
  return <AgentsRoleGate>{children}</AgentsRoleGate>;
}
