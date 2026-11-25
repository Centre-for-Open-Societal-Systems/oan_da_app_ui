"use client";

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { createPortal } from "react-dom";
import { useEffect, useState } from "react";

interface ForgotPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ForgotPasswordModal({ isOpen, onClose }: ForgotPasswordModalProps) {
  const [mounted, setMounted] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  const close = () => {
    setSentTo(null);
    onClose();
  };

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0); return () => clearTimeout(t);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="w-full max-w-[600px] rounded-xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-zinc-200 px-7 py-6">
          <div className="pr-4">
            <h2 className="text-2xl font-bold tracking-tight text-zinc-900">Forgot password?</h2>
            <p className="mt-1 text-[15px] text-zinc-500">
              Enter your email address and we&apos;ll send you a link to reset your password.
            </p>
          </div>
          <button
            type="button"
            onClick={close}
            className="group mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-700 transition-colors hover:bg-zinc-50 active:scale-95"
            aria-label="Close"
          >
            <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="px-6 pt-8 pb-10 sm:px-12">
          {sentTo ? (
            <div className="flex flex-col gap-4 rounded-lg border border-brand-border bg-brand-mint px-5 py-4 text-[14px] text-emerald-800" role="status">
              <p className="font-semibold">Reset link sent</p>
              <p className="leading-relaxed">
                If an agent account exists for <span className="font-semibold">{sentTo}</span>, a reset link valid for 30 minutes is on its way. Didn&apos;t get it? Your Woreda administrator can
                reset your password from User management, or you can sign in with FAYDA ID using a one-time code sent to your Fayda-registered phone.
              </p>
              <Button type="button" variant="brand" size="lg" onClick={close} className="h-11 w-full rounded-lg">
                <span className="font-semibold text-[15px]">Back to sign in</span>
              </Button>
            </div>
          ) : (
          <form className="flex flex-col gap-6" onSubmit={(e) => { e.preventDefault(); setSentTo(String(new FormData(e.currentTarget).get("email") ?? "")); }}>
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-bold text-zinc-700" htmlFor="reset-email">Email address<span className="ml-1 text-danger">*</span></label>
              <Input
                id="reset-email"
                name="email"
                type="email"
                placeholder="Enter your email address"
                required
                className="bg-white text-[15px] transition-shadow duration-300 hover:border-emerald-400 focus:shadow-[0_0_0_3px_rgba(22,163,74,0.12)]"
                startAdornment={
                  <svg className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                  </svg>
                }
              />
            </div>

            <Button type="submit" variant="brand" size="lg" className="h-11 w-full rounded-lg transition-transform duration-300 hover:scale-[1.01] active:scale-[0.98]">
              <span className="font-semibold text-[15px]">Send reset link</span>
            </Button>
          </form>
          )}

          {/* Footer */}
          <div className="mt-8 flex flex-col items-center gap-3 text-sm">
            <p className="text-zinc-600">
              Remember your password?{" "}
              <button type="button" onClick={close} className="font-semibold text-brand-green transition-colors hover:text-brand-green-dark">
                Back to sign in
              </button>
            </p>
            <p className="text-xs text-slate-400">
              Ministry of Agriculture — Ethiopia
            </p>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
