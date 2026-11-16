import { Metadata } from "next";
import { RoleDashboard } from "./components/RoleDashboard";
import { AgentOverview } from "./components/AgentOverview";
import { TodayPlanListSection } from "./components/TodayPlanListSection";
import { QuickActionsSection } from "./components/QuickActionsSection";
import { SupervisorDashboard } from "./components/SupervisorDashboard";
import { ExecutiveDashboard } from "./components/ExecutiveDashboard";
import { AdminDashboard } from "./components/AdminDashboard";
import { CommsDashboard } from "./components/CommsDashboard";
import { SuperAdminDashboard } from "./components/SuperAdminDashboard";

export const metadata: Metadata = {
  title: "Dashboard | OpenAgriNet",
  description: "Overview of your agricultural tasks and progress.",
};

export default function DashboardPage() {
  return (
    <RoleDashboard
      supervisor={<SupervisorDashboard />}
      executive={<ExecutiveDashboard />}
      admin={<AdminDashboard />}
      comms={<CommsDashboard />}
      superAdmin={<SuperAdminDashboard />}
      agent={
        <div className="flex w-full flex-col gap-3 sm:gap-4">
          <AgentOverview />
          <TodayPlanListSection />
          <QuickActionsSection />
        </div>
      }
    />
  );
}
