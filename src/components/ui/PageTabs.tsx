import Link from "next/link";
import { cn } from "@/lib/utils";

export interface PageTab {
  label: string;
  href: string;
}

/** Tab strip container: sits flush at the top of a card, or as a standalone card strip. */
export const TAB_STRIP =
  "flex w-full items-center overflow-x-auto rounded-t-xl border border-line bg-white shadow-card no-scrollbar";

/** One tab: divided from its neighbour; the active tab is tinted with a green underline. Shared by PageTabs and SegmentTabs. */
export const tabClass = (active: boolean) =>
  cn(
    "inline-flex min-w-[85px] sm:min-w-[110px] shrink-0 items-center justify-center gap-2 whitespace-nowrap border-r border-line px-3.5 py-2.5 sm:px-5 sm:py-3 text-[13px] sm:text-[14px] transition-colors first:rounded-tl-xl sm:flex-none",
    active
      ? "-mb-px border-b-[3px] border-b-brand-green bg-brand-wash font-semibold text-brand-green"
      : "font-medium text-ink-soft hover:bg-surface hover:text-ink",
  );

// Link tabs across sibling routes (Farmers / Visits); rendered at the top of the page header card.
export function PageTabs({ tabs, activeHref }: { tabs: PageTab[]; activeHref: string }) {
  return (
    <div className={TAB_STRIP}>
      {tabs.map((tab) => {
        const active = tab.href === activeHref;
        return (
          <Link key={tab.href} href={tab.href} aria-current={active ? "page" : undefined} className={tabClass(active)}>
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
