import { cn } from "@/lib/utils";

// Toolbar trigger for AdvancedFiltersDrawer; turns green and shows a count when any filter is applied.
export function AdvancedFiltersButton({ activeCount, onClick, className }: { activeCount: number; onClick: () => void; className?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "inline-flex h-10 items-center justify-center gap-2 whitespace-nowrap rounded-lg border bg-white px-4 text-sm font-medium transition-colors",
        activeCount > 0 ? "border-brand-green text-brand-green hover:bg-brand-wash" : "border-gray-200 text-gray-700 hover:bg-gray-50",
        className,
      )}
    >
      <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
        <path d="M4 6h16M4 12h10M4 18h6" />
        <circle cx="17" cy="12" r="2" />
        <circle cx="13" cy="18" r="2" />
      </svg>
      <span><span className="hidden sm:inline">Advanced </span>Filters</span>
      {activeCount > 0 && (
        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-green px-1.5 text-[11px] font-semibold text-white">
          {activeCount}
        </span>
      )}
    </button>
  );
}
