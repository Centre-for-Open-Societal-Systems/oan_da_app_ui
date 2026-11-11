"use client";

import { useEffect, type ReactNode } from "react";
import { cn } from "@/lib/utils";

export interface ToastState {
  tone: "success" | "error";
  message: ReactNode;
  action?: { label: string; onClick: () => void };
}

// Bottom-centre toast for save / publish outcomes. Success auto-hides; an error stays until retried or dismissed.
export function SurveyToast({ toast, onDismiss }: { toast: ToastState | null; onDismiss: () => void }) {
  useEffect(() => {
    if (!toast || toast.tone === "error") return;
    const t = setTimeout(onDismiss, 6000);
    return () => clearTimeout(t);
  }, [toast, onDismiss]);

  if (!toast) return null;
  const success = toast.tone === "success";
  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-6 z-[120] flex justify-center px-4">
      <div
        role={success ? "status" : "alert"}
        className={cn(
          "pointer-events-auto flex max-w-[860px] animate-slide-down items-center gap-3 rounded-xl border px-4 py-3 text-[14px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]",
          success ? "border-brand-border bg-brand-mint text-emerald-900" : "border-danger-border bg-danger-wash text-red-800",
        )}
      >
        <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white", success ? "bg-brand-green" : "bg-danger")}>
          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d={success ? "M5 13l4 4L19 7" : "M12 8v5M12 16.5h.01"} />
          </svg>
        </span>
        <span className="min-w-0 flex-1">{toast.message}</span>
        {toast.action && (
          <button type="button" onClick={toast.action.onClick}
            className={cn("shrink-0 rounded-md border bg-white px-3 py-1 text-[13px] font-semibold transition-colors", success ? "border-brand-border text-brand-green hover:bg-brand-wash" : "border-danger-border text-danger hover:bg-white/70")}>
            {toast.action.label}
          </button>
        )}
        <button type="button" onClick={onDismiss} aria-label="Dismiss" className="shrink-0 rounded p-0.5 opacity-60 hover:opacity-100">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        </button>
      </div>
    </div>
  );
}
