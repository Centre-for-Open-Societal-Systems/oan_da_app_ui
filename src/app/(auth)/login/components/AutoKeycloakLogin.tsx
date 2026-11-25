"use client";

import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/Button";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { beginKeycloakLogin } from "@/features/auth";
import { ApiError } from "@/lib/api";
import { AuthCard } from "../../components/AuthCard";

// No login form: opening /login asks IAM for the Keycloak URL and sends the browser straight there.
export function AutoKeycloakLogin() {
  const [error, setError] = useState<string | null>(null);
  // The redirect URL is single-use (it carries a fresh state); Strict Mode runs effects twice in development.
  const started = useRef(false);

  const start = () => {
    setError(null);
    beginKeycloakLogin().catch((err: unknown) => setError(err instanceof ApiError ? err.message : "Could not start the Keycloak sign-in. Please try again."));
  };

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    start();
  }, []);

  return (
    <AuthCard tab="Agent Sign-In" title={error ? "Sign-in did not start" : "Redirecting…"} subtitle={error ? "We could not reach the sign-in service." : "Taking you to Keycloak to sign in."}>
      {error ? (
        <div className="flex flex-col gap-4">
          <ErrorAlert message={error} />
          <Button type="button" size="lg" onClick={start} className="h-11 w-full rounded-md font-semibold">
            Try again
          </Button>
        </div>
      ) : (
        <div className="flex justify-center py-4 text-brand-green">
          <Spinner className="h-6 w-6" />
        </div>
      )}
    </AuthCard>
  );
}
