"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { NotFoundIllustration } from "./NotFoundIllustration";
import { NotFoundQuickLinks } from "./NotFoundQuickLinks";
import { SupportContactModal } from "./SupportContactModal";

interface Error404CardProps {
  /** Optional override for the displayed path; defaults to the current route pathname. */
  requestedPath?: string;
}

export function Error404Card({ requestedPath }: Error404CardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [supportOpen, setSupportOpen] = useState(false);

  const displayPath = requestedPath ?? (pathname || "/404-error");

  const handleGoBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <>
      <Card className="flex min-h-[calc(100dvh-8.5rem)] w-full flex-col items-center justify-center px-6 py-10 text-center shadow-card">
        <NotFoundIllustration />

        <span className="mt-4 inline-flex items-center rounded-full border border-brand-border-soft bg-brand-mint px-3 py-0.5 text-[12px] font-semibold text-brand-green">
          Error 404
        </span>

        <h1 className="mt-4 text-2xl font-bold tracking-tight text-ink sm:text-[28px]">
          Page not found
        </h1>

        <p className="mt-2.5 max-w-md text-[13.5px] leading-relaxed text-muted">
          We could not load this page. The link may be broken, the page may have moved, or the data is not available right now.
        </p>

        {/* Primary & Secondary Actions */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/dashboard"
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand-green-bright px-4 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-green-dark"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M3 10.5L12 3l9 7.5" />
              <path d="M5 9.5V20a1 1 0 001 1h4v-6h4v6h4a1 1 0 001-1V9.5" />
            </svg>
            <span>Go to Dashboard</span>
          </Link>

          <button
            type="button"
            onClick={() => router.refresh()}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-brand-green bg-white px-4 text-[13.5px] font-semibold text-brand-green-bright transition-colors hover:bg-brand-wash"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M23 4v6h-6" />
              <path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" />
            </svg>
            <span>Try again</span>
          </button>

          <button
            type="button"
            onClick={handleGoBack}
            className="inline-flex h-10 items-center gap-2 rounded-lg border border-line bg-white px-4 text-[13.5px] font-semibold text-ink-soft transition-colors hover:bg-surface"
          >
            <svg
              className="h-4 w-4"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M19 12H5M12 19l-7-7 7-7" />
            </svg>
            <span>Go back</span>
          </button>
        </div>

        <NotFoundQuickLinks />

        {/* Support & Error Diagnostics */}
        <div className="mt-7 flex flex-col items-center gap-1.5">
          <button
            type="button"
            onClick={() => setSupportOpen(true)}
            className="inline-flex items-center gap-1.5 text-[12.5px] font-semibold text-brand-green transition-colors hover:text-brand-green-dark"
          >
            <svg
              className="h-3.5 w-3.5"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <rect x="3" y="5" width="18" height="14" rx="2" />
              <path d="M3 7l9 6 9-6" />
            </svg>
            <span>Still stuck? Contact support</span>
          </button>
          <p className="text-[11.5px] text-subtle">
            Error code: 404 · Requested path: <span className="font-mono">{displayPath}</span>
          </p>
        </div>
      </Card>

      <SupportContactModal
        isOpen={supportOpen}
        onClose={() => setSupportOpen(false)}
        requestedPath={displayPath}
      />
    </>
  );
}

