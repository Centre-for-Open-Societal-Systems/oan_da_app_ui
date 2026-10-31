"use client";

import Link from "next/link";
import { useCallback, useEffect, useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/Pill";
import { fetchRegistration, humanize, type RegistrationDetail } from "@/features/farmers";
import { ROLE_LABELS } from "@/lib/rbac";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";

export function SubmittedHeader() {
  return (
    <PageHeader
      title="Register a farmer"
      titleAddon={<Pill tone="green" dot>Submitted</Pill>}
      description="The registration is with your supervisor for approval."
    />
  );
}

export interface Submission {
  /** Farmer Registry intake submission id; the Farmer ID (FR-…) only exists once a supervisor approves. */
  submissionId: string | null;
  /** PENDING_APPROVAL, or DUPLICATE when this registration had been sent already. */
  status: string;
  /** ISO timestamp of the submit. */
  submittedAt: string;
}

const STATUS_TONE: Record<string, string> = {
  APPROVED: "bg-brand-mint text-brand-green",
  REJECTED: "bg-danger-wash text-red-700",
};

interface SubmittedStepProps {
  submission: Submission;
  farmerName: string;
  /** "Oromia › East Shewa › Adama woreda › Kebele 07". */
  location: string;
  onRegisterAnother: () => void;
}

const formatDateTime = (iso: string) => {
  const at = new Date(iso);
  return `${at.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}, ${at.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;
};

const formatTime = (iso: string) => new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

function Detail({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[12.5px] text-ink-soft">{label}</dt>
      <dd className="mt-1 text-[14.5px] font-medium text-ink">{children}</dd>
    </div>
  );
}

const STEP_BASE = "relative z-10 flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold";

const linkButton = "inline-flex h-11 items-center justify-center gap-2 whitespace-nowrap rounded-lg px-5 text-[14px] font-semibold transition-colors";

export function SubmittedStep({ submission, farmerName, location, onRegisterAnother }: SubmittedStepProps) {
  const user = useAuthStore((s) => s.user);
  const role = useAuthStore((s) => s.role);
  // The registry's own view of the submission: its application reference and approval state.
  const [detail, setDetail] = useState<RegistrationDetail | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkError, setCheckError] = useState<string | null>(null);
  const { submissionId } = submission;

  const check = useCallback(() => {
    if (!submissionId) return;
    setChecking(true);
    fetchRegistration(submissionId)
      .then((d) => {
        setDetail(d);
        setCheckError(null);
      })
      .catch((err: unknown) => setCheckError(err instanceof Error ? err.message : "Could not read the registration status."))
      .finally(() => setChecking(false));
  }, [submissionId]);

  // Read it once on arrival; Refresh asks again.
  useEffect(() => {
    if (!submissionId) return;
    let current = true;
    fetchRegistration(submissionId)
      .then((d) => current && setDetail(d))
      .catch(() => {}); // the status from the submit still shows; Refresh reports errors
    return () => {
      current = false;
    };
  }, [submissionId]);

  const status = detail?.status ?? (submission.status === "DUPLICATE" ? "PENDING_APPROVAL" : submission.status);

  return (
    <Card className="p-0 shadow-card">
      <div className="flex flex-col items-center px-4 pb-8 pt-10 text-center sm:px-8">
        <span className="flex h-[88px] w-[88px] items-center justify-center rounded-full bg-brand-tint">
          <span className="flex h-14 w-14 animate-check-pop items-center justify-center rounded-full bg-brand-mint text-brand-green">
            <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M5 13l4 4L19 7" />
            </svg>
          </span>
        </span>
        <h2 className="mt-6 text-[26px] font-bold text-ink">Registration submitted</h2>
        <p className="mt-2 text-[14.5px] text-ink-soft">{farmerName} has been sent to your supervisor for approval.</p>
      </div>

      <div className="flex flex-col gap-6 px-4 pb-8 sm:px-8">
        <dl className="grid grid-cols-1 gap-x-8 gap-y-5 rounded-xl border border-line bg-surface px-6 py-5 sm:grid-cols-2">
          <Detail label="Submission ID">
            <span className="break-all font-mono text-[13px]">{submissionId ?? "—"}</span>
          </Detail>
          <Detail label="Status">
            <span className="flex flex-wrap items-center gap-2">
              <span className={cn("inline-flex rounded-md px-2.5 py-0.5 text-[12.5px] font-semibold", STATUS_TONE[status] ?? "bg-warning-wash text-orange-700")}>{humanize(status) || "Pending approval"}</span>
              {submissionId && (
                <button type="button" onClick={check} disabled={checking} className="text-[12.5px] font-medium text-brand-green hover:underline disabled:opacity-60">
                  {checking ? "Checking…" : "Refresh"}
                </button>
              )}
            </span>
            {checkError && <span className="mt-1 block text-[12px] font-normal text-red-700">{checkError}</span>}
          </Detail>
          <Detail label="Application reference">{detail?.application_reference ?? "—"}</Detail>
          <Detail label="Record name">{detail?.record_name ?? "—"}</Detail>
          <Detail label="Location">{location || "Not provided"}</Detail>
          <Detail label="Submitted">{formatDateTime(submission.submittedAt)}</Detail>
          <Detail label="Submitted by">
            {user?.name ?? "You"} ({ROLE_LABELS[role]})
          </Detail>
          <Detail label="Approver">{ROLE_LABELS.Supervisor}</Detail>
        </dl>

        <div>
          <h3 className="text-[15px] font-semibold text-ink">What happens next</h3>
          <ol className="mt-4 grid grid-cols-3">
            {[
              { title: "Submitted", detail: `Today, ${formatTime(submission.submittedAt)}`, state: "done" },
              { title: "Supervisor review", detail: "Usually within 2 working days", state: "current" },
              { title: "Approved and active", detail: "Farmer appears as Active", state: "next" },
            ].map((step, i) => (
              <li key={step.title} className="relative flex flex-col items-center px-2 text-center">
                {i > 0 && <span aria-hidden className={cn("absolute right-1/2 top-[13px] h-0.5 w-full", step.state === "next" ? "bg-line" : "bg-brand-green")} />}
                <span
                  className={cn(
                    STEP_BASE,
                    step.state === "done" && "bg-brand-green text-white",
                    step.state === "current" && "border-2 border-amber-500 bg-white text-amber-600",
                    step.state === "next" && "bg-line text-gray-500"
                  )}
                >
                  {step.state === "done" ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : step.state === "current" ? (
                    <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      <circle cx="12" cy="12" r="9" />
                      <path d="M12 7v5l3 2" />
                    </svg>
                  ) : (
                    3
                  )}
                </span>
                <span className="mt-3 text-[13.5px] font-semibold text-ink">{step.title}</span>
                <span className="mt-1 text-[12px] text-ink-soft">{step.detail}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-3">
          {/* The farmer record, and so its profile, only exists in the registry once a supervisor approves; it then shows in My Farmers. */}
          <button type="button" disabled title="Available once the supervisor approves; the farmer then appears in My Farmers" className={cn(linkButton, "bg-brand-green text-white disabled:cursor-not-allowed disabled:opacity-60")}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            View farmer profile
          </button>
          <button type="button" onClick={onRegisterAnother} className={cn(linkButton, "border border-line bg-white text-ink hover:bg-surface")}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Register another farmer
          </button>
          <Link href="/farmers" className={cn(linkButton, "border border-line bg-white text-ink hover:bg-surface")}>
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
            </svg>
            Go to My Farmers
          </Link>
        </div>
      </div>
    </Card>
  );
}
