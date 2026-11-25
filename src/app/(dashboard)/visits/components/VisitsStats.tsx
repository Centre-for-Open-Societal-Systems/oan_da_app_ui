"use client";

import { StatCard } from "@/components/ui/StatCard";
import { useAuthStore } from "@/store/useAuthStore";
import { VISIT_STATS, supervisorVisitsFor, visitStatsFor } from "@/features/visits";

export function VisitsStats() {
  // A DA's figures cover only the visits their supervisor assigned to them.
  const isDA = useAuthStore((s) => s.role === "DA");
  const daName = useAuthStore((s) => s.user?.name ?? "");
  const stats = isDA ? visitStatsFor(supervisorVisitsFor(daName)) : VISIT_STATS;

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
      <StatCard
        label="Planned this week"
        value={String(stats.plannedThisWeek)}
        accent="border-l-blue-600"
        tile="bg-info-tint text-blue-600"
        icon={
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M8 3v4M16 3v4M3 10h18" />
          </svg>
        }
      />
      <StatCard
        label="Completed"
        value={String(stats.completed)}
        accent="border-l-brand-green"
        tile="bg-brand-tint text-brand-green"
        valueClassName="text-brand-green"
        icon={
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M8.5 12.5l2.5 2.5 4.5-5" />
          </svg>
        }
      />
      <StatCard
        label="Missed / rescheduled"
        value={String(stats.missed)}
        accent="border-l-danger"
        tile="bg-danger-tint text-danger"
        valueClassName="text-orange-700"
        icon={
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 3l10 18H2L12 3z" />
            <path d="M12 10v4M12 17.5h.01" />
          </svg>
        }
      />
      <StatCard
        label="On-time rate"
        value={stats.onTimeRate}
        accent="border-l-brand-green"
        tile="bg-brand-tint text-brand-green"
        icon={
          <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
            <path d="M3 17l6-6 4 4 8-8v4h2V3h-8v2h4l-6 6-4-4-7 7z" />
            <circle cx="5" cy="20" r="1.2" /><circle cx="9" cy="20" r="1.2" /><circle cx="13" cy="20" r="1.2" /><circle cx="17" cy="20" r="1.2" /><circle cx="21" cy="20" r="1.2" />
            <circle cx="17" cy="16" r="1.2" /><circle cx="21" cy="16" r="1.2" /><circle cx="21" cy="12" r="1.2" />
          </svg>
        }
      />
    </div>
  );
}
