"use client";

import { useAuthStore } from "@/store/useAuthStore";
import { FarmerAvatar } from "./FarmerAvatar";

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

// Grey summary card shown at the top of the farmer-profile modals: the signed-in agent, from their /me record.
export function AttributionCard({ subtitle }: { subtitle: string }) {
  const agent = useAuthStore((s) => s.profile?.agent);
  const accountName = useAuthStore((s) => s.user?.name);
  const name = text(agent?.full_name) || accountName || "";
  const avatar = text(agent?.photo_url) || undefined;

  return (
    <div className="flex items-center gap-3 rounded-lg border border-line bg-surface px-4 py-3.5">
      <FarmerAvatar name={name} avatar={avatar} className="h-10 w-10 text-[14px]" />
      <div className="min-w-0">
        <p className="text-[14.5px] font-semibold text-ink">{name}</p>
        <p className="mt-0.5 truncate text-[13px] text-muted">{subtitle}</p>
      </div>
    </div>
  );
}
