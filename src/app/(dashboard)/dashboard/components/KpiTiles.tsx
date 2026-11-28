"use client";

import { useEffect, useState, type ReactNode } from "react";
import Link from "next/link";
import { StatCard } from "@/components/ui/StatCard";
import { useAuthStore } from "@/store/useAuthStore";
import { fetchKpis, kpiTilesFor, rangeFor, type KpiKey, type KpiValue } from "@/features/dashboard";

const icon = (d: string) => (
  <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const TILES: Record<KpiKey, { label: string; href?: string; accent: string; tile: string; icon: ReactNode; ranged: boolean; pending?: string }> = {
  visitsCompleted: { label: "Visits completed", href: "/visits", accent: "border-l-blue-600", tile: "bg-blue-50 text-blue-600", ranged: true, icon: icon("M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0zM12 13a3 3 0 100-6 3 3 0 000 6z") },
  followUpsCompleted: { label: "Follow ups completed", accent: "border-l-violet-600", tile: "bg-violet-50 text-violet-700", ranged: true, pending: "API coming soon", icon: icon("M9 11l3 3L22 4M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11") },
  advisoriesCompleted: { label: "Advisories completed", accent: "border-l-brand-green", tile: "bg-brand-tint text-brand-green", ranged: true, pending: "API coming soon", icon: icon("M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z") },
  raisedGrievances: { label: "Raised grievances", href: "/grievances", accent: "border-l-danger", tile: "bg-danger-wash text-danger", ranged: false, icon: icon("M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4M12 17h.01") },
  agents: { label: "Agents", href: "/agents", accent: "border-l-orange-600", tile: "bg-warning-wash text-orange-700", ranged: false, icon: icon("M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75") },
  farmers: { label: "Farmers", href: "/farmers", accent: "border-l-cyan-600", tile: "bg-cyan-50 text-cyan-700", ranged: false, icon: icon("M12 12a4 4 0 100-8 4 4 0 000 8zM4 21a8 8 0 0116 0") },
};

/** Ranges the tiles can be asked for; a custom range needs a date picker the headers do not have yet. */
export const KPI_RANGES = ["Last 7 days", "Last 30 days", "Last 90 days", "This quarter", "This year"] as const;

const Pending = () => <span className="inline-block h-[24px] w-12 animate-pulse rounded bg-slate-200 align-middle" />;

interface KpiTilesProps {
  /** A dashboard range label ("Last 30 days"); it narrows the date-ranged tiles (visits). */
  range: string;
}

// Dashboard KPI tiles for the signed-in role, each read from its own feature API (features/dashboard/kpis.ts).
export function KpiTiles({ range }: KpiTilesProps) {
  const role = useAuthStore((s) => s.role);
  const keys = kpiTilesFor(role);
  const keyList = keys.join(",");
  // The last answer and the range it was for; tiles keep showing it while a newer range loads.
  const [answer, setAnswer] = useState<{ key: string; values: Record<KpiKey, KpiValue> } | null>(null);
  const answerKey = `${keyList}|${range}`;

  useEffect(() => {
    const dates = rangeFor(range);
    if (!dates) return;
    let current = true;
    fetchKpis(keyList.split(",") as KpiKey[], dates).then((values) => current && setAnswer({ key: `${keyList}|${range}`, values }));
    return () => {
      current = false;
    };
  }, [keyList, range]);

  const values = answer?.values;
  const loading = answer?.key !== answerKey;

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {keys.map((k) => {
        const t = TILES[k];
        const v = values?.[k];
        const value = t.pending ? "—" : !v || (loading && v.value === null) ? <Pending /> : v.error ? "—" : (v.value ?? 0).toLocaleString();
        const hint = t.pending ?? (v?.error ? <span className="text-danger">Could not load</span> : t.ranged ? range : "Current total");
        const card = <StatCard label={t.label} value={value} hint={hint} accent={t.accent} tile={t.tile} icon={t.icon} className={loading && !t.pending ? "opacity-80" : undefined} />;
        return t.href ? (
          <Link key={k} href={t.href} className="block rounded-xl focus-visible:outline-2 focus-visible:outline-brand-green">
            {card}
          </Link>
        ) : (
          <div key={k}>{card}</div>
        );
      })}
    </div>
  );
}
