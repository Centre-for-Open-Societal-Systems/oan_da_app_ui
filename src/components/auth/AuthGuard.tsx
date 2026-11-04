"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";
import { PageLoader } from "@/components/ui/PageLoader";

// Dashboard routes are for signed-in users only. There is no auth backend yet (FSD Part 1), so the
// check is the persisted client session: wait for rehydration, then bounce anonymous visitors to
// /login rather than rendering a role-scoped page for a role nobody picked.
export function AuthGuard({ children, expiredFallback }: { children: React.ReactNode; expiredFallback?: React.ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const sessionExpired = useAuthStore((s) => s.sessionExpired);

  useEffect(() => {
    // Without an expiredFallback (dialog hidden), an expired session goes straight to /login.
    if (hasHydrated && !isAuthenticated && (!sessionExpired || !expiredFallback)) router.replace("/login");
  }, [hasHydrated, isAuthenticated, sessionExpired, expiredFallback, router]);

  // The session ran out: keep the user here and offer the re-login instead of bouncing them away.
  if (sessionExpired && expiredFallback) return <>{expiredFallback}</>;

  // Nothing is rendered until the session is known, so a signed-out visitor never sees the shell.
  if (!hasHydrated || !isAuthenticated) {
    return <PageLoader fullScreen label="Loading your session…" />;
  }

  return (
    <>
      {children}
    </>
  );
}
