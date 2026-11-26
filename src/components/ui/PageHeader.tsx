import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Card } from "./Card";
import { PageTabs, type PageTab } from "./PageTabs";

interface PageHeaderProps {
  title: string;
  description?: ReactNode;
  /** Right-aligned actions (buttons / links). */
  actions?: ReactNode;
  /** Link tabs across sibling routes, rendered at the top of the card. */
  tabs?: PageTab[];
  activeHref?: string;
  /** In-page state tabs (a SegmentTabs), rendered at the top of the card — use instead of `tabs`. */
  tabBar?: ReactNode;
  /** Inline element after the title, e.g. a status pill. */
  titleAddon?: ReactNode;
  /** Show the description under the title (it is hidden on the other pages for now). */
  showDescription?: boolean;
}

// Title card shared by every portal page: tab strip on top, then title + description with actions on the right.
// Banners, stats and the page's sections follow as separate cards below it.
export function PageHeader({ title, description, actions, tabs, activeHref, tabBar, titleAddon, showDescription }: PageHeaderProps) {
  return (
    <Card className="relative p-0">
      {tabs && activeHref && <PageTabs tabs={tabs} activeHref={activeHref} />}
      {tabBar}
      <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-5 sm:py-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 sm:gap-2.5">
            <h1 className="text-[19px] sm:text-[22px] font-bold tracking-tight text-ink sm:text-2xl">{title}</h1>
            {titleAddon}
          </div>
          {/* Description is still passed and rendered, just hidden on every page for now; drop `hidden` to show it again. */}
          {description && <div className={cn("mt-1 text-[13px] sm:text-[14px] text-ink-soft", !showDescription && "hidden")}>{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-2.5">{actions}</div>}
      </div>
    </Card>
  );
}
