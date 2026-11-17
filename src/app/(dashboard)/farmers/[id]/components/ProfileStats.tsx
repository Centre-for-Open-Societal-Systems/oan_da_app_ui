import { StatCard } from "@/components/ui/StatCard";
import { PLOTS } from "@/features/farmers";
import type { Farmer } from "@/features/farmers";

/**
 * `fromApi`: land is the registry's own total (farmer.landHa), not the sample plots. `known`: whether the plots and
 * visits counts are loaded yet (their tabs load them); an unknown count shows "—".
 */
export function ProfileStats({ farmer, fromApi = false, known = { plots: true, visits: true } }: { farmer: Farmer; fromApi?: boolean; known?: { plots: boolean; visits: boolean } }) {
  const totalLandHa = fromApi ? farmer.landHa : PLOTS.slice(0, farmer.totalPlots).reduce((sum, plot) => sum + plot.areaHa, 0);

  const stats = [
    {
      label: "Total plots",
      value: known.plots ? String(farmer.totalPlots) : "—",
      accent: "border-l-brand-green",
      tile: "bg-brand-tint text-brand-green",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <rect x="3" y="3" width="8" height="8" rx="1.5" />
          <rect x="13" y="3" width="8" height="8" rx="1.5" />
          <rect x="3" y="13" width="8" height="8" rx="1.5" />
          <rect x="13" y="13" width="8" height="8" rx="1.5" />
        </svg>
      ),
    },
    {
      label: "Total land",
      value: `${totalLandHa.toFixed(1)} ha`,
      accent: "border-l-blue-600",
      tile: "bg-info-tint text-blue-600",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M8 3H5a2 2 0 00-2 2v3M16 3h3a2 2 0 012 2v3M8 21H5a2 2 0 01-2-2v-3M16 21h3a2 2 0 002-2v-3" />
        </svg>
      ),
    },
    {
      label: "Visits",
      value: known.visits ? String(farmer.visits) : "—",
      accent: "border-l-violet-600",
      tile: "bg-purple-100 text-violet-600",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <rect x="3" y="4" width="18" height="17" rx="2" />
          <path d="M8 2v4M16 2v4M3 10h18M9 15l2 2 4-4" />
        </svg>
      ),
    },
    {
      label: "Last visit",
      value: farmer.lastVisit,
      accent: "border-l-danger",
      tile: "bg-danger-tint text-danger",
      icon: (
        <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M14 21H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v6M8 2v4M16 2v4M3 10h18" />
          <circle cx="18" cy="18" r="4" />
          <path d="M18 16.5V18l1 1" />
        </svg>
      ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 sm:gap-4">
      {stats.map((stat) => (
        <StatCard key={stat.label} label={stat.label} value={stat.value} accent={stat.accent} tile={stat.tile} icon={stat.icon} />
      ))}
    </div>
  );
}
