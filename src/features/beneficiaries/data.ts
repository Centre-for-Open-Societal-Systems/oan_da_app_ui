import type { PillTone } from "@/components/ui/Pill";
import type { ApiSegment } from "./api";

// Beneficiary Segments are the Model Farmer packages (Appendix C.3); they come from GET /beneficiary-segments.
// The API has no colour or icon, so each package takes one by its place in the list.

export type SegmentIcon = "leaf" | "cash" | "drop" | "people";

const LOOKS: { tone: PillTone; icon: SegmentIcon }[] = [
  { tone: "green", icon: "leaf" },
  { tone: "blue", icon: "cash" },
  { tone: "amber", icon: "drop" },
  { tone: "purple", icon: "people" },
];

export const segmentLook = (index: number) => LOOKS[index % LOOKS.length];

/** A package's title, or its id while the list is loading or when it is no longer active. */
export const segmentTitle = (segments: ApiSegment[], id: string) => segments.find((s) => s.name === id)?.title || id;
