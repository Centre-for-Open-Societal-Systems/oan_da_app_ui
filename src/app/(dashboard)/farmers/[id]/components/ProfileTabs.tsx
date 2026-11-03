"use client";

import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";

// Advisory shows the Q&A captured on Advisory visits; AdvisoryNotesSection (Part 2 notes) stays unused for now.
const TABS = ["Overview", "Holdings", "Crop Sown Details", "Livestock Details", "Livestock history", "Visit history", "Documents", "Advisory"] as const;
export type ProfileTab = (typeof TABS)[number];

// Hidden for now: the Overview and Livestock history tabs (their panels are still passed in). Remove one from this list to bring it back.
const HIDDEN_TABS: ProfileTab[] = ["Overview", "Livestock history"];
const VISIBLE_TABS = TABS.filter((tab) => !HIDDEN_TABS.includes(tab));

// Only the tab switch runs on the client; each panel is rendered by the page and passed in.
export function ProfileTabs({ panels }: { panels: Record<ProfileTab, ReactNode> }) {
  const [active, setActive] = useState<ProfileTab>(VISIBLE_TABS[0]);

  return (
    <Card className="overflow-hidden border border-line p-0 shadow-card">
      <div className="flex w-full items-center overflow-x-auto border-b border-line bg-white no-scrollbar" role="tablist">
        {VISIBLE_TABS.map((tab) => {
          const isActive = active === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab)}
              className={cn(
                "shrink-0 whitespace-nowrap border-r border-line px-5 py-3.5 text-[14px] transition-colors first:rounded-tl-xl",
                isActive
                  ? "-mb-px border-b-[3px] border-b-brand-green bg-brand-wash font-semibold text-brand-green"
                  : "font-medium text-ink-soft hover:bg-surface hover:text-ink",
              )}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div key={active} className="animate-fade-in p-4">
        {active === "Overview" ? panels.Overview : <div className="min-h-[560px]">{panels[active]}</div>}
      </div>
    </Card>
  );
}
