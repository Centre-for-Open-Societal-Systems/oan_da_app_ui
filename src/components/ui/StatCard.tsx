import type { ReactNode } from "react";
import { Card } from "./Card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  /** Text, or a placeholder node while the value loads. */
  value: ReactNode;
  icon: ReactNode;
  /** Tailwind border-colour class for the left accent bar, e.g. "border-l-brand-green". */
  accent: string;
  /** Tailwind bg/text classes for the icon tile, e.g. "bg-brand-tint text-brand-green". */
  tile: string;
  /** Optional small line under the value, e.g. "Target: 10 visits". */
  hint?: ReactNode;
  /** Optional colour class for the value, defaults to the heading colour. */
  valueClassName?: string;
  className?: string;
}

// Compact KPI card with a coloured accent bar and an icon tile (profile stats, visit stats, activity report).
// Hover matches the DA dashboard summary cards: card shadow lifts, icon tile pops up (design-system wide).
export function StatCard({ label, value, icon, accent, tile, hint, valueClassName, className }: StatCardProps) {
  return (
    <Card className={cn("group flex items-center justify-between px-4 py-4 border-l-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg", accent, className)}>
      <div className="min-w-0">
        <p className="text-[13.5px] text-ink-soft">{label}</p>
        <p className={cn("mt-1.5 text-[24px] font-semibold leading-none text-ink", valueClassName)}>{value}</p>
        {hint && <div className="mt-1.5 text-[12px] text-muted">{hint}</div>}
      </div>
      <div className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-1.5 group-hover:scale-[1.15] group-hover:shadow-sm", tile)}>{icon}</div>
    </Card>
  );
}
