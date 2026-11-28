import { Pill, type PillTone } from "@/components/ui/Pill";

/** Colour per backend physical_status; a status not listed here shows in slate. */
const TONES: Record<string, PillTone> = {
  Planned: "blue",
  Confirmed: "green",
  "In progress": "amber",
  "Physical Visit Complete": "slate",
  Missed: "red",
  Rescheduled: "purple",
  Cancelled: "slate",
  Superseded: "slate",
};

/** A visit's physical_status from the visits API, shown as it is. */
export function VisitStatusPill({ status, className }: { status: string; className?: string }) {
  return (
    <Pill tone={TONES[status] ?? "slate"} className={className}>
      {status}
    </Pill>
  );
}
