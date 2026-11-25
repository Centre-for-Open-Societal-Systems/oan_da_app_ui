"use client";

import { Banner } from "@/components/ui/Banner";

interface ServiceStatusBannerProps {
  loading: boolean;
  /** Message from the last failed load (503 when the Grievance Service is down). */
  error: string | null;
  lastLoaded: Date | null;
  /** Tickets the service holds for this user, and how many of them were loaded. */
  total: number;
  shown: number;
  onRetry: () => void;
}

// Live state of the link to the external Grievance Service, from the last GET /grievances.
export function ServiceStatusBanner({ loading, error, lastLoaded, total, shown, onRetry }: ServiceStatusBannerProps) {
  const down = !!error;
  const time = lastLoaded?.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  return (
    <Banner tone={down ? "warning" : "success"}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <span className={down ? "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-orange-500 animate-pulse" : "mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-brand-green"} aria-hidden />
          <div className="min-w-0">
            <p className="font-semibold text-sm sm:text-[14.5px]">{down ? "OAN Grievance Service unavailable" : "Connected to OAN Grievance Service (external)"}</p>
            <p className="mt-0.5 text-xs sm:text-[13px] leading-relaxed">
              {down
                ? `${error} New grievances are still accepted and queued; they are forwarded once the service is back.`
                : "Native raise/track surfaces backed by the Grievance Service API — the full portal is a separate service."}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0 self-start sm:self-center">
          {time && !down && (
            <span className="rounded-md border border-brand-border bg-brand-mint px-2.5 py-1 text-xs font-semibold text-brand-green">
              API: Synced · {time}
            </span>
          )}
          {total > shown && (
            <span className="rounded-md border border-warning-border bg-warning-wash px-2.5 py-1 text-xs font-semibold text-orange-700">
              Showing latest {shown} of {total}
            </span>
          )}
          <button
            type="button"
            onClick={onRetry}
            disabled={loading}
            className="rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink shadow-xs transition-colors hover:bg-zinc-50 disabled:opacity-60 cursor-pointer"
          >
            {loading ? "Syncing…" : down ? "Retry" : "Refresh"}
          </button>
        </div>
      </div>
    </Banner>
  );
}
