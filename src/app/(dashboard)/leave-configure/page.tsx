import type { Metadata } from "next";
import { LeaveConfigure } from "./LeaveConfigure";

export const metadata: Metadata = {
  title: "Leave Configure | OpenAgriNet",
  description: "Leave policies, leave types, approval workflows and team leave settings.",
};

export default function LeaveConfigurePage() {
  return <LeaveConfigure />;
}
