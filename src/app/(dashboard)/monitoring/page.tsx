import type { Metadata } from "next";
import { SupervisorMonitoring } from "../performance/components/SupervisorMonitoring";

export const metadata: Metadata = {
  title: "Monitoring | OpenAgriNet",
  description: "KPI results rolled up by area, down to woredas and agents.",
};

export default function MonitoringPage() {
  return <SupervisorMonitoring />;
}
