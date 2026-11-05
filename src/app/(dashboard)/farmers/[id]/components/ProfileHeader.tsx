import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import type { Farmer } from "@/features/farmers";
import { FarmerAvatar, farmerActivity } from "@/features/farmers";
import { ProfileActionStrip } from "./ProfileActions";

export function ProfileHeader({ farmer }: { farmer: Farmer }) {
  const activity = farmerActivity(farmer.status);

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="px-4 py-5">
        <div className="flex items-start gap-5">
          <FarmerAvatar name={farmer.name} avatar={farmer.avatar} size="lg" />

          <div className="flex flex-col gap-2">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-[20px] font-semibold tracking-tight text-ink sm:text-[22px]">
                Farmer profile - {farmer.name}
              </h1>
              <Pill tone={activity === "Active" ? "green" : "slate"}>
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d="M12 2l7 3v6c0 5-3.4 9.3-7 11-3.6-1.7-7-6-7-11V5l7-3zm-1 13.2l5-5-1.4-1.4-3.6 3.6-1.6-1.6L8 12.2l3 3z" />
                </svg>
                {activity}
              </Pill>
            </div>

            <Pill tone="blue" dot className="w-fit">
              Sourced from Farmer Registry · read-only
            </Pill>

            <div className="flex flex-wrap items-center gap-x-6 gap-y-1.5 text-[13.5px] text-slate-600">
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
                  <circle cx="12" cy="10" r="3" />
                </svg>
                {farmer.woreda}, {farmer.region}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M22 16.9v3a2 2 0 01-2.2 2 19.8 19.8 0 01-8.6-3.1 19.5 19.5 0 01-6-6A19.8 19.8 0 012.1 4.2 2 2 0 014.1 2h3a2 2 0 012 1.7c.1.9.4 1.8.7 2.6a2 2 0 01-.5 2.1L8 9.7a16 16 0 006 6l1.3-1.3a2 2 0 012.1-.4c.8.3 1.7.6 2.6.7a2 2 0 011.7 2z" />
                </svg>
                {farmer.phone}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <svg className="h-4 w-4 text-subtle" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="5" width="18" height="14" rx="2" />
                  <path d="M3 7l9 6 9-6" />
                </svg>
                {farmer.email || "NA"}
              </span>
            </div>
          </div>
        </div>

      </div>

      <ProfileActionStrip farmer={farmer} />
    </Card>
  );
}
