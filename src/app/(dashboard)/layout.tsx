import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { Sidebar } from "@/components/layout/Sidebar";
import { AuthGuard } from "@/components/auth/AuthGuard";
import { SessionExpiryWatcher } from "@/features/auth";
import { NotificationBell } from "@/features/notifications";
import { LifecycleHydration } from "./lifecycle/components/LifecycleHydration";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    // Session-expired dialog hidden for now (not removed): re-add expiredFallback={<SessionExpiredDialog />} to show it again.
    <AuthGuard>
      <LifecycleHydration />
      <SessionExpiryWatcher />
      <div className="flex h-screen w-full bg-page">
        <Sidebar />
        <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
          <Header notifications={<NotificationBell />} />
          <main className="relative flex-1 overflow-y-auto p-4 md:p-6 lg:px-8 lg:py-6">
            {children}
          </main>
        </div>
      </div>
    </AuthGuard>
  );
}
