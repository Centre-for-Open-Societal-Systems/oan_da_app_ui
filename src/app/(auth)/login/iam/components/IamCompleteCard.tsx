"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { Spinner } from "@/components/ui/Spinner";
import { completeIamLogin, iamLoginErrorMessage } from "@/features/auth";
import { LOGIN_ERROR_MESSAGES, readIamSession, safeReturnPath } from "@/lib/iam";
import { useAuthStore } from "@/store/useAuthStore";
import { AuthCard } from "../../../components/AuthCard";

/** Dev only: who the IAM token says we are, so a refused sign-in can be read without the backend's logs. */
function describeToken(token: string): string {
  try {
    const payload = token.split(".")[1];
    const json = JSON.parse(decodeURIComponent(Array.from(atob(payload.replace(/-/g, "+").replace(/_/g, "/")), (c) => `%${c.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
    const roles = Object.entries((json.resource_access ?? {}) as Record<string, { roles?: string[] }>).map(([client, v]) => `${client}: ${(v.roles ?? []).join(", ") || "none"}`);
    const exp = typeof json.exp === "number" ? new Date(json.exp * 1000).toLocaleTimeString() : "?";
    return `Token user: ${json.preferred_username ?? json.email ?? json.sub ?? "?"} · expires ${exp} · issuer ${json.iss ?? "?"} · client roles → ${roles.join(" | ") || "none"}`;
  } catch {
    return "Token could not be decoded.";
  }
}

// Last step of the staff IAM sign-in. The IAM has landed the browser here (via /api/auth/iam/complete) with its
// token cookies on the shared parent domain; this app's server reads them back (/api/auth/iam/session), then
// /da-services/me gives the identity, role and scope and the session is stored like a password sign-in.
export function IamCompleteCard() {
  const router = useRouter();
  const search = useSearchParams();
  const signIn = useAuthStore((s) => s.signIn);
  const [error, setError] = useState<string | null>(null);
  const [showOriginHint, setShowOriginHint] = useState(false);
  const [tokenInfo, setTokenInfo] = useState<string | null>(null);
  const returnPath = safeReturnPath(search.get("returnUrl"));

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let tokens;
      try {
        tokens = await readIamSession();
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : LOGIN_ERROR_MESSAGES.iam_failed);
        return;
      }
      if (!tokens) {
        if (!cancelled) {
          setError(LOGIN_ERROR_MESSAGES.iam_failed);
          // The usual cause on a developer machine: the app was opened as localhost, where the IAM's cookies never arrive.
          setShowOriginHint(process.env.NODE_ENV !== "production" && !window.location.hostname.endsWith("oanstaging.com"));
        }
        return;
      }
      if (process.env.NODE_ENV !== "production") setTokenInfo(describeToken(tokens.accessToken));
      try {
        const { user, role, profile, tokens: session } = await completeIamLogin(tokens);
        if (cancelled) return;
        signIn(user, role, session, profile);
        router.replace(returnPath);
      } catch (err) {
        if (!cancelled) setError(iamLoginErrorMessage(err));
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [returnPath, router, signIn]);

  return (
    <AuthCard tab="Agent Sign-In" title={error ? "Sign-in did not complete" : "Completing your sign-in…"} subtitle={error ? "You can go back and try again." : "Reading your staff session and loading your role."}>
      {error ? (
        <div className="flex flex-col gap-4">
          <ErrorAlert message={error} />
          {showOriginHint && (
            <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-[13px] text-amber-900">
              Open the app as <span className="font-mono">https://da-local.development.oanstaging.com:3000</span> (see README, &ldquo;Staff sign-in&rdquo;): the IAM&rsquo;s cookies
              only reach that domain, never localhost.
            </p>
          )}
          {tokenInfo && <p className="break-all rounded-md border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-[11.5px] text-zinc-700">{tokenInfo}</p>}
          <Link href="/login" className="inline-flex h-11 w-full items-center justify-center rounded-md bg-brand-green text-[15px] font-semibold text-white transition-colors hover:bg-brand-green-dark">
            Back to sign in
          </Link>
        </div>
      ) : (
        <div className="flex items-center justify-center gap-3 py-6 text-[14px] text-zinc-600">
          <Spinner className="h-5 w-5 text-brand-green" />
          Signing you in…
        </div>
      )}
    </AuthCard>
  );
}
