import Link from "next/link";
import { Card } from "@/components/ui/Card";

export function QuickActionsSection() {
  const actions = [
    { title: "Crop Sown Survey", desc: "Log yield and pest surveys", icon: "clipboard-list", href: "/farmers/crop-report" },
    { title: "Livestock Survey", desc: "Log herd counts and vaccinations", icon: "livestock", href: "/farmers/livestock-report" },
    { title: "Start Farm Visit", desc: "Activate GPS route and inspection logs", icon: "location", href: "/visits/v-1001" },
    { title: "Sync Queue", desc: "Offline captures and conflicts", icon: "sync", href: "/sync" },
  ];

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="border-b border-line px-5 py-3.5">
        <h3 className="text-[15px] font-semibold text-ink">Quick actions</h3>
      </div>
      <div className="grid grid-cols-1 gap-4 px-4 py-4 md:grid-cols-2 xl:grid-cols-4">
        {actions.map((act) => (
          <Link key={act.href} href={act.href} className="group flex items-center gap-3 rounded-lg border border-line bg-white px-4 py-5 transition-all hover:border-brand-green/30 hover:shadow-sm">
            <div className="w-[48px] h-[48px] flex shrink-0 items-center justify-center rounded-lg bg-brand-tint text-brand-green group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)]">
              {act.icon === "clipboard-list" && (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <g clipPath="url(#clip0_707_7149)">
                    <path d="M15.9988 3.99918H17.9986C18.529 3.99918 19.0376 4.20991 19.4127 4.58502C19.7877 4.96012 19.9984 5.46887 19.9984 5.99934V20.0005C19.9984 20.5309 19.7877 21.0397 19.4127 21.4148C19.0376 21.7899 18.529 22.0006 17.9986 22.0006H5.9998C5.46942 22.0006 4.96076 21.7899 4.58573 21.4148C4.21069 21.0397 4 20.5309 4 20.0005V5.99934C4 5.46887 4.21069 4.96012 4.58573 4.58502C4.96076 4.20991 5.46942 3.99918 5.9998 3.99918H7.9996M11.9992 10.9997H15.9988M11.9992 16.0001H15.9988M7.9996 10.9997H8.0096M7.9996 16.0001H8.0096M8.9995 1.99902H14.9989C15.5511 1.99902 15.9988 2.44677 15.9988 2.9991V4.99926C15.9988 5.55159 15.5511 5.99934 14.9989 5.99934H8.9995C8.44727 5.99934 7.9996 5.55159 7.9996 4.99926V2.9991C7.9996 2.44677 8.44727 1.99902 8.9995 1.99902Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                  </g>
                  <defs>
                    <clipPath id="clip0_707_7149">
                      <rect width="24" height="24" fill="white" />
                    </clipPath>
                  </defs>
                </svg>

              )}
              {act.icon === "livestock" && (
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M5 4l2 3M19 4l-2 3M7 7h10a2 2 0 012 2v3a7 7 0 01-14 0V9a2 2 0 012-2z" />
                  <path d="M9 17h6M10 12h.01M14 12h.01" />
                </svg>
              )}
              {act.icon === "sync" && (
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" />
                </svg>
              )}
              {act.icon === "location" && (
                <svg width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </div>
            <div className="flex-1">
              <h4 className="text-[15px] font-medium text-ink transition-colors group-hover:text-brand-green">{act.title}</h4>
              <p className="mt-0.5 text-[12.5px] leading-snug text-muted">{act.desc}</p>
            </div>
            <div className="text-subtle transition-all group-hover:translate-x-1 group-hover:text-brand-green">
              <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 12h14M13 6l6 6-6 6" />
              </svg>
            </div>
          </Link>
        ))}
      </div>
    </Card>
  );
}
