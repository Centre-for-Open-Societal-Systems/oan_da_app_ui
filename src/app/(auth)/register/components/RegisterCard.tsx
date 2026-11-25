"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ErrorAlert } from "@/components/ui/ErrorAlert";
import { SELF_REGISTER_ROLES, useRegisteredAccountsStore, type DemoAccount } from "@/features/auth";
import { WOREDAS } from "@/features/agents";
import { ROLE_LABELS, type Role } from "@/lib/rbac";
import { useAuthStore } from "@/store/useAuthStore";
import { AUTH_INPUT, AUTH_LABEL, AuthCard, PasswordInput } from "../../components/AuthCard";

function Field({ label, htmlFor, required, hint, children }: { label: string; htmlFor: string; required?: boolean; hint?: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className={AUTH_LABEL} htmlFor={htmlFor}>{label}{required && <span className="ml-1 text-danger">*</span>}</label>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

// Self-registration for any of the five portal roles, laid out like the sign-in card.
export function RegisterCard() {
  const router = useRouter();
  const register = useRegisteredAccountsStore((s) => s.register);
  const signIn = useAuthStore((s) => s.signIn);
  const hasHydrated = useAuthStore((s) => s.hasHydrated);
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated);
  const [role, setRole] = useState<Role>("DA");
  const [woreda, setWoreda] = useState(WOREDAS[0]);
  const [error, setError] = useState<string | null>(null);

  // Already signed in: nothing to register.
  useEffect(() => {
    if (hasHydrated && isAuthenticated) router.replace("/dashboard");
  }, [hasHydrated, isAuthenticated, router]);

  const submit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const phone = String(form.get("phone") ?? "").trim();
    const password = String(form.get("password") ?? "");
    const confirm = String(form.get("confirm") ?? "");

    if (name.length < 3) return setError("Enter your full name.");
    if (!/^\+?251\s?9\d(\s?\d){7}$/.test(phone)) return setError("Use an Ethiopian mobile number, e.g. +251 91 234 5678.");
    if (password.length < 8) return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords do not match.");

    const account: DemoAccount = { email, password, role, name };
    if (!register(account)) return setError("An account with this email already exists. Sign in instead.");

    setError(null);
    signIn({ id: email, name, email }, role);
    router.push("/dashboard");
  };

  return (
    <AuthCard tab="Agent Registration" title="Create your account" subtitle="Register to access the agent portal." wide>
      <form className="flex flex-col gap-3 short:gap-2.5" onSubmit={submit}>
        {error && <ErrorAlert message={error} />}

        <Field label="Full name" htmlFor="name" required hint="At least 3 characters.">
          <Input id="name" name="name" required placeholder="Enter your full name" className={AUTH_INPUT} />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 short:gap-2.5">
          <Field label="Email address" htmlFor="email" required>
            <Input id="email" name="email" type="email" required placeholder="Enter your email address" className={AUTH_INPUT} />
          </Field>
          <Field label="Mobile number" htmlFor="phone" required hint="Ethiopian mobile number, e.g. +251 91 234 5678.">
            <Input id="phone" name="phone" type="tel" required placeholder="+251 91 234 5678" className={AUTH_INPUT} />
          </Field>
          <Field label="Role" htmlFor="role">
            <Select id="role" value={role} onChange={(e) => setRole(e.target.value as Role)} className="bg-white short:h-10">
              {SELF_REGISTER_ROLES.map((r) => <option key={r} value={r}>{ROLE_LABELS[r]}</option>)}
            </Select>
          </Field>
          <Field label="Woreda" htmlFor="woreda">
            <Select id="woreda" value={woreda} onChange={(e) => setWoreda(e.target.value)} className="bg-white short:h-10">
              {WOREDAS.map((w) => <option key={w} value={w}>{w}</option>)}
            </Select>
          </Field>
          <Field label="Password" htmlFor="password" required hint="At least 8 characters.">
            <PasswordInput id="password" name="password" placeholder="Min. 8 characters" />
          </Field>
          <Field label="Confirm password" htmlFor="confirm" required hint="Must match the password.">
            <PasswordInput id="confirm" name="confirm" />
          </Field>
        </div>

        <Button type="submit" variant="brand" size="lg" className="mt-1 h-11 short:h-10 w-full rounded-md transition-transform duration-300 hover:scale-[1.02] active:scale-[0.98]">
          <span className="font-semibold">Register</span>
        </Button>

        <p className="text-center text-sm text-zinc-500">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-green transition-colors hover:text-brand-green-dark hover:underline">
            Sign in
          </Link>
        </p>
        <p className="m-0 text-center text-xs text-slate-400">
          Ministry of Agriculture — Ethiopia
        </p>
      </form>
    </AuthCard>
  );
}
