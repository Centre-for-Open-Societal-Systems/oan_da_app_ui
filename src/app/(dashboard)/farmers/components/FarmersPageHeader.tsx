import type { ReactNode } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { FARMER_PAGE_TABS } from "@/features/farmers";

interface FarmersPageHeaderProps {
  actions?: ReactNode;
}

export function FarmersPageHeader({ actions }: FarmersPageHeaderProps = {}) {
  return (
    <PageHeader
      tabs={FARMER_PAGE_TABS}
      activeHref="/farmers"
      title="My Farmers"
      description="Farmers linked to you across your kebeles; the total is shown on the list below"
      actions={
        <div className="flex w-full sm:w-auto items-center gap-2 sm:gap-2.5">
          {actions}
          <Link
            href="/farmers/new"
            className="inline-flex h-9 sm:h-10 flex-1 sm:flex-initial items-center justify-center gap-1.5 sm:gap-2 whitespace-nowrap rounded-md bg-brand-green px-3.5 sm:px-4 text-[13px] sm:text-[14px] font-semibold text-white transition-colors hover:bg-brand-green-dark"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>New farmer</span>
          </Link>
        </div>
      }
    />
  );
}
