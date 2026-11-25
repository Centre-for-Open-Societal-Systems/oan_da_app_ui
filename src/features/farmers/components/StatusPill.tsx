import { cn } from "@/lib/utils";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { Tooltip } from "@/components/ui/Tooltip";
import type { CropOutcome, FarmerActivity, FarmerStatus } from "../types";

const TONES: Record<FarmerStatus | FarmerActivity | CropOutcome, PillTone> = {
  Verified: "green",
  Active: "green",
  Inactive: "slate",
  Successful: "green",
  Pending: "amber",
  "Below average": "amber",
  Flagged: "red",
  Average: "slate",
};

interface StatusPillProps {
  status: FarmerStatus | FarmerActivity | CropOutcome;
  /** Shown in a hover tooltip — e.g. why a farmer is Pending or Flagged. */
  reason?: string;
  className?: string;
}

export function StatusPill({ status, reason, className }: StatusPillProps) {
  const pill = (
    <Pill tone={TONES[status]} className={cn(reason && "cursor-help", className)}>
      {status}
      {reason && (
        <svg className="h-3 w-3 opacity-70" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      )}
    </Pill>
  );
  return reason ? <Tooltip content={reason}>{pill}</Tooltip> : pill;
}
