"use client";

import { useEffect, useRef } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { refreshProfile } from "../me";

// Once the stored session is back (AuthHydration), re-read /me so a role or scope an Admin changed since the
// last sign-in shows up without signing in again. Runs once per page load (a refresh), and only for a session that
// was already stored then: a sign-in reads /me itself (login, Keycloak callback), so it is not read a second time.
export function ProfileSync() {
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const done = useRef(false);

  useEffect(() => {
    if (!hasHydrated || done.current) return;
    done.current = true;
    if (useAuthStore.getState().tokens) void refreshProfile();
  }, [hasHydrated]);

  return null;
}
