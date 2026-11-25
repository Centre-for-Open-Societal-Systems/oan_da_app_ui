"use client";

import { useState, useEffect, type ReactNode } from "react";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/contexts/SidebarContext";
import { cn } from "@/lib/utils";
import { UserProfile } from "@/components/layout/UserProfile";
import { LanguageSelector } from "@/components/layout/LanguageSelector";
import { SearchModal, type SearchFn } from "@/components/layout/SearchModal";
import { pageTitleFor } from "@/lib/rbac";
import { useAuthStore } from "@/store/useAuthStore";

interface HeaderProps {
  /** The notification bell; it talks to the backend, so the layout passes it in (components never import features). */
  notifications?: ReactNode;
  /** Global search's farmer, agent and kebele lookups; the layout passes them in for the same reason. */
  searchFarmers?: SearchFn;
  searchAgents?: SearchFn;
  searchKebeles?: SearchFn;
}

export function Header({ notifications, searchFarmers, searchAgents, searchKebeles }: HeaderProps) {
  const { toggle, isOpen, toggleMobile } = useSidebar();
  const pathname = usePathname();
  const role = useAuthStore((s) => s.role);
  const pageTitle = pageTitleFor(pathname, role);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleSidebar = () => {
    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      toggle();
    } else {
      toggleMobile();
    }
  };

  return (
    <header className="relative z-[60] flex h-16 items-center justify-between gap-2 bg-white px-3 shadow-md sm:gap-3 sm:px-4 md:px-6">
      {/* Left section: Hamburger + Page Title */}
      <div className="flex min-w-0 flex-1 items-center gap-1.5 sm:gap-3 mr-2">
        <button
          type="button"
          // Below lg the sidebar is an off-canvas drawer; on desktop the button collapses the rail
          onClick={handleToggleSidebar}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
          aria-expanded={isOpen}
          className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 flex-col items-center justify-center gap-[4.5px] rounded-lg text-ink transition-colors duration-200 hover:bg-brand-green-bright hover:text-white active:scale-95"
        >
          <span className="block h-[2px] w-4 sm:w-5 rounded-full bg-current transition-all duration-300 ease-in-out" />
          <span className={cn("block h-[2px] rounded-full bg-current transition-all duration-300 ease-in-out", isOpen ? "w-4 sm:w-5" : "w-2.5 sm:w-3")} />
          <span className="block h-[2px] w-4 sm:w-5 rounded-full bg-current transition-all duration-300 ease-in-out" />
        </button>
        <h2 
          title={pageTitle}
          className="truncate text-[16px] font-bold tracking-tight text-ink sm:text-[18px] md:text-[20px] lg:text-[22px]"
        >
          {pageTitle}
        </h2>
      </div>

      {/* Right section — responsive across mobile, tablet, laptop, and desktop */}
      <div className="flex shrink-0 items-center gap-1.5 sm:gap-2 md:gap-2.5 lg:gap-3 xl:gap-3.5">
        {/* Search input (visible on xl+ where there is ample horizontal space alongside the sidebar) */}
        <div 
          className="relative hidden cursor-text xl:block xl:w-56 2xl:w-72" 
          onClick={() => setIsSearchOpen(true)}
        >
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
            <svg className="h-4 w-4 text-subtle" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <input
            type="text"
            readOnly
            placeholder="Search portal..."
            className="pointer-events-none block w-full cursor-text rounded-lg border border-transparent bg-slate-100 py-2 pl-9 pr-3 text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none"
          />
        </div>
        
        {/* Search icon button (visible below xl: mobile, tablet, and smaller desktop/laptop) */}
        <button
          type="button"
          onClick={() => setIsSearchOpen(true)}
          aria-label="Search portal"
          className="flex h-9 w-9 sm:h-10 sm:w-10 items-center justify-center rounded-full border border-zinc-200 bg-white text-slate-600 shadow-sm transition-colors hover:bg-slate-50 hover:text-slate-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-brand-green/40 xl:hidden"
        >
          <svg className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </button>

        <SearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} searchFarmers={searchFarmers} searchAgents={searchAgents} searchKebeles={searchKebeles} />

        {/* Notifications */}
        {notifications}

        {/* Vertical divider */}
        <div className="mx-0.5 hidden h-6 sm:h-7 w-px bg-zinc-200 sm:block" />

        {/* Language selector */}
        <LanguageSelector />

        {/* User Profile */}
        <UserProfile />
      </div>
    </header>
  );
}
