import type { ReactNode } from "react";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SessionExpiredDialog } from "@/features/auth";
import { NotificationBell } from "@/features/notifications";
import { DashboardHeader } from "./DashboardHeader";
import { ScopeLabelNames } from "./ScopeLabelNames";
import { LifecycleHydration } from "./lifecycle/components/LifecycleHydration";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    // When the token can no longer be renewed, the user gets the "Session expired" popup and its button opens /login.
    <AuthGuard expiredFallback={<SessionExpiredDialog />}>
      <LifecycleHydration />
      <ScopeLabelNames />
      <div className="flex h-screen w-full bg-page">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <DashboardHeader notifications={<NotificationBell />} />
          <main className="relative flex-1 overflow-y-auto p-4 md:p-6 lg:px-8 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
