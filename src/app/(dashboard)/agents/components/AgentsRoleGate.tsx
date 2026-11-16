"use client";

import { useEffect, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/useAuthStore";

// The agents registry is for officers; a DA sees their team on My Teams instead, so a DA opening any /agents URL
// lands there.
export function AgentsRoleGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isDA = useAuthStore((s) => s.role) === "DA";

  useEffect(() => {
    if (hasHydrated && isDA) router.replace("/my-teams");
  }, [hasHydrated, isDA, router]);

  if (!hasHydrated || isDA) return null;
  return children;
}
