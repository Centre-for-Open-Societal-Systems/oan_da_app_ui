"use client";

import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { tabClass } from "@/components/ui/PageTabs";

// Advisory shows the Q&A captured on Advisory visits; AdvisoryNotesSection (Part 2 notes) stays unused for now.
const TABS = ["Overview", "Holdings", "Crop Sown Details", "Livestock Details", "Livestock history", "Visit history", "Documents", "Advisory"] as const;
export type ProfileTab = (typeof TABS)[number];

// Hidden for now: the Overview and Livestock history tabs (their panels are still passed in). Remove one from this list to bring it back.
const HIDDEN_TABS: ProfileTab[] = ["Overview", "Livestock history"];
const VISIBLE_TABS = TABS.filter((tab) => !HIDDEN_TABS.includes(tab));
/** The tab the profile opens on. */
export const DEFAULT_PROFILE_TAB: ProfileTab = VISIBLE_TABS[0];

// Only the tab switch runs on the client; each panel is rendered by the page and passed in. `onSelect` tells the page
// which tab was opened, so it can load that tab's data only then.
export function ProfileTabs({ panels, onSelect }: { panels: Record<ProfileTab, ReactNode>; onSelect?: (tab: ProfileTab) => void }) {
  const [active, setActive] = useState<ProfileTab>(DEFAULT_PROFILE_TAB);

  return (
    <Card className="overflow-hidden border border-line p-0 shadow-card">
      <div className="flex w-full items-center overflow-x-auto border-b border-line bg-white no-scrollbar scroll-smooth" role="tablist">
        {VISIBLE_TABS.map((tab) => {
          const isActive = active === tab;
          return (
            <button
              key={tab}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => {
                setActive(tab);
                onSelect?.(tab);
              }}
              className={tabClass(isActive)}
            >
              {tab}
            </button>
          );
        })}
      </div>

      <div key={active} className="animate-fade-in p-3.5 sm:p-4 md:p-5">
        {active === "Overview" ? panels.Overview : <div className="min-h-[560px]">{panels[active]}</div>}
      </div>
    </Card>
  );
}
