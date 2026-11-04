"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { login, mockLogin } from "@/features/auth";
import { ApiError } from "@/lib/api";
import { useAuthStore } from "@/store/useAuthStore";
import { AUTH_INPUT, AUTH_LABEL, AuthCard, PasswordInput } from "../../components/AuthCard";
import { ForgotPasswordModal } from "./ForgotPasswordModal";
import { ContactAdminModal } from "./ContactAdminModal";

function loginErrorMessage(err: unknown): string {
  if (!(err instanceof ApiError)) return "Something went wrong while signing in. Please try again.";
  if (err.status === 401) return "Email or password is incorrect. Check your credentials and try again.";
  if (err.status === 0 || err.status >= 500) return "Could not reach the server. Please try again in a moment.";
  return err.message;
}

export function LoginCard() {
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);
  const [isContactOpen, setIsContactOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();
  const signIn = useAuthStore((s) => s.signIn);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);

  // A live session skips the form — refreshing /login should not ask a signed-in agent to sign in again.
  useEffect(() => {
    if (hasHydrated && isAuthenticated) router.replace("/dashboard");
  }, [hasHydrated, isAuthenticated, router]);

  // The backend checks the credentials; identity, role and the token pair all come from its response.
  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isSubmitting) return;
    const form = new FormData(e.currentTarget);
    setError(null);
    setIsSubmitting(true);
    try {
      // Mock-data roles (Super Admin) sign in locally; everyone else goes to the backend.
      const mock = mockLogin(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
      if (mock) {
        signIn(mock.user, mock.role, undefined, mock.profile);
        router.push("/dashboard");
        return;
      }
      const { user, role, tokens, profile } = await login(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
      signIn(user, role, tokens, profile);
      router.push("/dashboard");
    } catch (err) {
      setError(loginErrorMessage(err));
      setIsSubmitting(false);
    }
  };

  // Automatically clear URL query parameters if they exist
  useEffect(() => {
    if (window.location.search) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  return (
    <>
      <AuthCard tab="Agent Sign-In" title="Sign in to your account" subtitle="Enter your credentials to access the agent portal.">
        <form className="flex flex-col gap-4 short:gap-3" onSubmit={handleLogin}>
          {error && <ErrorAlert message={error} />}

          <div className="flex flex-col gap-1.5">
            <label className={AUTH_LABEL} htmlFor="email">Email or username</label>
            <Input
              id="email"
              name="email"
              type="text"
              autoComplete="username"
              placeholder="Enter your email or username"
              required
              autoFocus
              className={AUTH_INPUT}
              startAdornment={
                <svg className="h-4 w-4 text-zinc-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
              }
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label className={AUTH_LABEL} htmlFor="password">Password</label>
            <PasswordInput id="password" name="password" autoComplete="current-password" />
          </div>

          <div className="mt-1 flex items-center justify-between text-sm">
            <label className="group flex cursor-pointer items-center gap-2 font-medium text-zinc-700">
              <span className="relative flex items-center justify-center">
                <input
                  type="checkbox"
                  name="remember"
                  defaultChecked
                  className="peer h-[18px] w-[18px] cursor-pointer appearance-none rounded border-2 border-zinc-300 bg-white transition-all duration-300 checked:border-brand-green checked:bg-brand-green group-hover:border-emerald-500 group-hover:shadow-[0_0_0_4px_rgba(22,163,74,0.12)] group-active:scale-95"
                />
                <svg
                  className="pointer-events-none absolute h-3.5 w-3.5 scale-50 text-white opacity-0 transition-all duration-300 ease-out peer-checked:scale-100 peer-checked:opacity-100"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={3.5}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 13l4 4L19 7" />
                </svg>
              </span>
              <span className="transition-colors duration-300 group-hover:text-emerald-800">Remember me</span>
            </label>
            <button
              type="button"
              onClick={() => setIsForgotPasswordOpen(true)}
              className="font-semibold text-brand-green transition-all duration-300 hover:text-brand-green-dark hover:underline"
            >
              Forgot password?
            </button>
          </div>

          <Button type="submit" variant="brand" size="lg" disabled={isSubmitting} className="group/submit mt-2 short:mt-1 h-11 short:h-10 w-full gap-2 rounded-md shadow-[0_8px_20px_-8px_rgba(22,163,74,0.6)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_12px_24px_-8px_rgba(22,163,74,0.7)] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-80 disabled:hover:scale-100">
            {isSubmitting ? (
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity={0.3} strokeWidth={3} />
                <path d="M21 12a9 9 0 00-9-9" stroke="currentColor" strokeWidth={3} strokeLinecap="round" />
              </svg>
            ) : null}
            <span className="font-semibold">{isSubmitting ? "Signing in…" : "Sign in"}</span>
            {!isSubmitting && (
              <svg className="h-4 w-4 transition-transform duration-300 group-hover/submit:translate-x-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.25} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            )}
          </Button>

          <p className="text-center text-sm text-zinc-500">
            Need help?{" "}
            <button type="button" onClick={() => setIsContactOpen(true)} className="font-semibold text-brand-green transition-colors hover:text-brand-green-dark hover:underline">
              Contact your administrator.
            </button>
          </p>

          <div className="-mx-5 -mb-5 flex items-center justify-center gap-1.5 rounded-b-[20px] border-t border-zinc-200 bg-white/70 px-5 py-3 text-xs text-zinc-500 sm:-mx-6 sm:-mb-6 md:-mx-8 md:-mb-8 md:short:-mx-6 md:short:-mb-6 tiny:-mx-4 tiny:-mb-4 md:tiny:-mx-5 md:tiny:-mb-5">
            <svg className="h-3.5 w-3.5 text-brand-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="M9 12l2 2 4-4" />
            </svg>
            Secure sign-in · Ministry of Agriculture — Ethiopia
          </div>
        </form>
      </AuthCard>

      <ForgotPasswordModal
        isOpen={isForgotPasswordOpen}
        onClose={() => setIsForgotPasswordOpen(false)}
      />
      <ContactAdminModal isOpen={isContactOpen} onClose={() => setIsContactOpen(false)} />
    </>
  );
}
