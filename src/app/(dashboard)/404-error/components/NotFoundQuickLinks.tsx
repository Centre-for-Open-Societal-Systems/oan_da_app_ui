import Link from "next/link";

const QUICK_LINKS = [
  {
    href: "/dashboard",
    title: "Dashboard",
    subtitle: "Today's overview",
    tileClass: "bg-brand-mint text-brand-green",
    iconPath: "M4 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM14 5a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1V5zM4 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1H5a1 1 0 01-1-1v-4zM14 15a1 1 0 011-1h4a1 1 0 011 1v4a1 1 0 01-1 1h-4a1 1 0 01-1-1v-4z",
  },
  {
    href: "/farmers",
    title: "My Farmers",
    subtitle: "Farmer list",
    tileClass: "bg-brand-mint text-brand-green",
    iconPath: "M12 20v-8m0 0c0-4 2.8-6.5 6.5-6.5 0 4-2.8 6.5-6.5 6.5zm0 2c0-3.4-2.4-5.5-5.5-5.5 0 3.4 2.4 5.5 5.5 5.5zM8 20h8",
  },
  {
    href: "/grievances",
    title: "Grievances",
    subtitle: "Open cases",
    tileClass: "bg-warning-wash text-amber-600",
    iconPath: "M12 9v3m0 3.5h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z",
  },
] as const;

export function NotFoundQuickLinks() {
  return (
    <div className="mt-8 w-full max-w-[540px]">
      <p className="text-[12.5px] font-medium text-muted">Or open one of these</p>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {QUICK_LINKS.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3 text-left transition-colors hover:border-brand-border hover:bg-brand-wash/40"
          >
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${item.tileClass}`}>
              <svg
                className="h-[18px] w-[18px]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d={item.iconPath} />
              </svg>
            </span>
            <span className="min-w-0">
              <span className="block truncate text-[13px] font-bold text-ink">{item.title}</span>
              <span className="block truncate text-[11.5px] text-muted">{item.subtitle}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

