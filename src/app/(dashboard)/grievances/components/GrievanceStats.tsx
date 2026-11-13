import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import type { PillTone } from "@/components/ui/Pill";
import { statusTone } from "@/features/grievances";
import { cn } from "@/lib/utils";

/** A stat card: the Grievance Service summary gives one per status (plus an "All" card). */
export interface GrievanceStatCard {
  status: string;
  label: string;
  count: number;
}

interface GrievanceStatsProps {
  cards: GrievanceStatCard[];
  /** The selected status code, or "All". */
  active: string;
  onSelect: (status: string) => void;
}

// Tone (from the status name) → the card's left accent bar and icon tile classes.
const TONE_STYLES: Record<PillTone, { accent: string; tile: string }> = {
  blue: { accent: "border-l-blue-600", tile: "bg-info-tint text-blue-600" },
  green: { accent: "border-l-brand-green", tile: "bg-green-100 text-brand-green" },
  red: { accent: "border-l-danger", tile: "bg-danger-tint text-danger" },
  amber: { accent: "border-l-orange-500", tile: "bg-orange-50 text-orange-600" },
  purple: { accent: "border-l-violet-600", tile: "bg-violet-tint text-violet-600" },
  slate: { accent: "border-l-slate-500", tile: "bg-slate-100 text-slate-600" },
};

function iconFor(tone: PillTone): ReactNode {
  switch (tone) {
    case "green":
      return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2a10 10 0 100 20 10 10 0 000-20zm-1.2 14.2l-3.5-3.5 1.4-1.4 2.1 2.1 4.6-4.6 1.4 1.4-6 6z" /></svg>;
    case "red":
      return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M15 9l-6 6M9 9l6 6" /></svg>;
    case "amber":
      return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="M12 16v-4M12 8h.01" /></svg>;
    case "purple":
      return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>;
    case "blue":
      return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="3" r="1.8" /><circle cx="18.4" cy="5.6" r="1.8" /><circle cx="21" cy="12" r="1.8" /><circle cx="18.4" cy="18.4" r="1.8" /><circle cx="12" cy="21" r="1.8" /><circle cx="5.6" cy="18.4" r="1.8" /><circle cx="3" cy="12" r="1.8" /><circle cx="5.6" cy="5.6" r="1.8" /></svg>;
    default:
      return <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 12l10 5 10-5M2 17l10 5 10-5" /></svg>;
  }
}

// Clicking a card filters the table to that status; the "All" card clears it.
export function GrievanceStats({ cards, active, onSelect }: GrievanceStatsProps) {
  if (cards.length === 0) return null;
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
      {cards.map((card) => {
        const isAll = card.status === "All";
        const tone = isAll ? "blue" : statusTone(card.status);
        const style = TONE_STYLES[tone];
        const isActive = active === card.status;
        return (
          <button key={card.status} type="button" onClick={() => onSelect(card.status)} aria-pressed={isActive} className="text-left">
            <Card
              className={cn(
                "group flex h-full items-center justify-between gap-2 border-l-4 px-3 py-3.5 shadow-card transition-shadow hover:shadow-md sm:px-4 sm:py-4",
                style.accent,
                isActive && "bg-surface ring-1 ring-brand-green",
              )}
            >
              <div className="min-w-0">
                <p className="truncate text-[13px] leading-snug text-ink-soft sm:text-[14px]" title={card.label}>{card.label}</p>
                <p className="mt-1.5 text-[22px] font-semibold leading-none text-ink sm:text-[24px]">{card.count}</p>
              </div>
              <div className={cn("flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-1.5 group-hover:scale-[1.15] group-hover:shadow-sm [&>svg]:h-5 [&>svg]:w-5 sm:h-14 sm:w-14 sm:[&>svg]:h-6 sm:[&>svg]:w-6", style.tile)}>{iconFor(tone)}</div>
            </Card>
          </button>
        );
      })}
    </div>
  );
}
