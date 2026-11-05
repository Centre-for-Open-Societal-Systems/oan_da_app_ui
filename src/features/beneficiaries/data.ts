import type { PillTone } from "@/components/ui/Pill";

// Rule-based beneficiary segments (Appendix C.3). Rules are edited by Supervisor/Admin only (Appendix D row 1).
export interface Segment {
  id: string;
  name: string;
  rule: string;
  scheme: string;
  members: number;
  tone: PillTone;
  icon: "leaf" | "cash" | "drop" | "people";
}

export const SEGMENTS: Segment[] = [
  { id: "seg-input", name: "Input subsidy — teff & wheat", rule: "primary crop ∈ {Teff, Wheat} AND land ≥ 0.5 ha", scheme: "MoA input voucher 2026/27", members: 142, tone: "green", icon: "leaf" },
  { id: "seg-credit", name: "Credit-eligible smallholders", rule: "Fayda verified AND no open credit application", scheme: "Access to Credit (partner banks)", members: 123, tone: "blue", icon: "cash" },
  { id: "seg-drought", name: "Drought-response kebeles", rule: "kebele ∈ {Gedo, Adea}", scheme: "Emergency seed distribution", members: 118, tone: "amber", icon: "drop" },
  { id: "seg-women", name: "Women-headed households", rule: "household head = female", scheme: "Livelihood grant (ATI)", members: 64, tone: "purple", icon: "people" },
];

export const segmentName = (id: string) => SEGMENTS.find((s) => s.id === id)?.name ?? id;

export type BeneficiaryStatus = "Enrolled" | "Pending verification" | "Removed";

export interface Beneficiary {
  avatar?: string;
  id: string;
  name: string;
  kebele: string;
  crop: string;
  livestock: string;
  segmentId: string;
  status: BeneficiaryStatus;
  linkedAt: string;
}
