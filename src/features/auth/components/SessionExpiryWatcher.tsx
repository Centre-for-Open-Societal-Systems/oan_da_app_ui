"use client";

import { useEffect } from "react";
import { refreshSession } from "../session";
import { useAuthStore } from "@/store/useAuthStore";

// Renew the Keycloak access token shortly before it lapses, so the user is not signed out mid-work. A refused renewal
// ends the session inside refreshSession (AuthGuard then shows the sign-in); a network error is retried.
const RENEW_BEFORE_MS = 60_000;
const RETRY_MS = 15_000;

export function SessionExpiryWatcher() {
  const expiresAt = useAuthStore((s) => (s.tokens?.provider === "keycloak" ? s.tokens.expiresAt : null));

  useEffect(() => {
    if (expiresAt === null) return;
    let timer: ReturnType<typeof setTimeout>;
    const renew = () => {
      // A success stores the new expiry, which re-runs this effect with a fresh timer.
      refreshSession().catch(() => {
        timer = setTimeout(renew, RETRY_MS);
      });
    };
    timer = setTimeout(renew, Math.max(0, expiresAt - RENEW_BEFORE_MS - Date.now()));
    return () => clearTimeout(timer);
  }, [expiresAt]);

  return null;
}
