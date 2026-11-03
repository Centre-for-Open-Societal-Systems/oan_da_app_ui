"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { completeKeycloakLogin } from "@/features/auth";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { AuthCard } from "../../components/AuthCard";

const NO_COOKIE_MESSAGE =
  "Keycloak signed you in, but IAM's session cookie did not reach this portal. IAM sets it for its shared cookie domain (*.development.oanstaging.com on dev), so the portal must be opened on an https address under that domain.";

/** An error Keycloak or IAM reported in the URL; its text is shown as is. */
class ReportedError extends Error {}

function callbackErrorMessage(err: unknown): string {
  if (err instanceof ReportedError) return err.message;
  if (err instanceof ApiError) {
    if (err.status === 401) return NO_COOKIE_MESSAGE;
    return err.message;
  }
  return "Something went wrong while signing in. Please try again.";
}

// /auth/callback: where IAM returns the browser after the Keycloak sign-in (the login's return_url). Reads who IAM's
// cookies belong to, stores the session in the browser (the auth store persists to localStorage) and opens the dashboard.
export function KeycloakCallback() {
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const [error, setError] = useState<string | null>(null);
  // The handoff is single-shot; Strict Mode runs effects twice in development.
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // IAM or Keycloak can come back with an error instead of a session (?error=…&error_description=…).
    const params = new URLSearchParams(window.location.search);
    const failure = params.get("error_description") ?? params.get("error");
    (failure ? Promise.reject(new ReportedError(failure)) : completeKeycloakLogin(params))
      .then(({ user, role, tokens, profile }) => {
        signIn(user, role, tokens, profile);
        router.replace("/dashboard");
      })
      .catch((err: unknown) => setError(callbackErrorMessage(err)));
  }, [router, signIn]);

  return (
    <AuthCard tab="Agent Sign-In" title={error ? "Sign-in did not finish" : "Signing you in…"} subtitle={error ? "Keycloak sign-in could not be completed." : "Finishing your Keycloak sign-in."}>
      {error ? (
        <div className="flex flex-col gap-4">
          <ErrorAlert message={error} />
          <Link href="/login" className="text-center text-sm font-semibold text-brand-green hover:text-brand-green-dark hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <div className="flex justify-center py-4 text-brand-green">
          <Spinner className="h-6 w-6" />
        </div>
      )}
    </AuthCard>
  );
}
