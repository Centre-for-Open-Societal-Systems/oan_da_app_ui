"use client";

import { useRef, useState, useEffect, type ReactNode } from "react";
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
  const scrollRef = useRef<HTMLDivElement>(null);
  const [activeDot, setActiveDot] = useState(0);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const handleScroll = () => {
      const maxScroll = el.scrollWidth - el.clientWidth;
      if (maxScroll <= 0) {
        setActiveDot(0);
        return;
      }
      const ratio = el.scrollLeft / maxScroll;
      if (ratio < 0.33) {
        setActiveDot(0);
      } else if (ratio < 0.67) {
        setActiveDot(1);
      } else {
        setActiveDot(2);
      }
    };

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollToDot = (dotIndex: number) => {
    const el = scrollRef.current;
    if (!el) return;
    const maxScroll = el.scrollWidth - el.clientWidth;
    if (maxScroll <= 0) return;
    const targetScroll = (dotIndex / 2) * maxScroll;
    el.scrollTo({ left: targetScroll, behavior: "smooth" });
    setActiveDot(dotIndex);
  };

  if (cards.length === 0) return null;

  return (
    <div className="flex flex-col gap-2.5">
      {/* Horizontally scrollable cards with increased size and NO green scrollbar line */}
      <div
        ref={scrollRef}
        className="flex items-stretch gap-3.5 sm:gap-4 overflow-x-auto no-scrollbar scroll-smooth pt-1 pb-1 -mx-0.5 px-0.5 overscroll-x-contain"
      >
        {cards.map((card) => {
          const isAll = card.status === "All";
          const tone = isAll ? "blue" : statusTone(card.status);
          const style = TONE_STYLES[tone];
          const isActive = active === card.status;
          return (
            <button
              key={card.status}
              type="button"
              onClick={() => onSelect(card.status)}
              aria-pressed={isActive}
              className="text-left shrink-0 w-[220px] sm:w-[245px] md:w-[265px]"
            >
              <Card
                className={cn(
                  "group flex h-full items-center justify-between gap-3.5 border-l-[5px] p-4 sm:p-5 shadow-card transition-all duration-200 hover:shadow-md cursor-pointer rounded-2xl min-h-[105px] sm:min-h-[115px]",
                  style.accent,
                  isActive ? "bg-surface ring-2 ring-brand-green/70 shadow-sm" : "hover:-translate-y-0.5",
                )}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] sm:text-[14.5px] font-semibold leading-snug text-ink-soft" title={card.label}>
                    {card.label}
                  </p>
                  <p className="mt-1 text-[26px] sm:text-[30px] font-bold leading-none text-ink tracking-tight">
                    {card.count}
                  </p>
                </div>
                <div
                  className={cn(
                    "flex h-12 w-12 sm:h-14 sm:w-14 shrink-0 items-center justify-center rounded-xl transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-1.5 group-hover:scale-[1.1] group-hover:shadow-sm [&>svg]:h-6 [&>svg]:w-6 sm:[&>svg]:h-7 sm:[&>svg]:w-7",
                    style.tile,
                  )}
                >
                  {iconFor(tone)}
                </div>
              </Card>
            </button>
          );
        })}
      </div>

      {/* 3 Dots Navigation Indicator */}
      <div className="flex items-center justify-center gap-2 pt-1 pb-1">
        {[0, 1, 2].map((idx) => (
          <button
            key={idx}
            type="button"
            onClick={() => scrollToDot(idx)}
            aria-label={`Scroll to card set ${idx + 1}`}
            className={cn(
              "transition-all duration-300 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green",
              activeDot === idx
                ? "w-6 h-2 bg-brand-green shadow-xs"
                : "w-2 h-2 bg-zinc-300 hover:bg-zinc-400"
            )}
          />
        ))}
      </div>
    </div>
  );
}
