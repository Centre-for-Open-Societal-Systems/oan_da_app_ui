import type { Metadata } from "next";
import { GovernmentCalendar } from "./GovernmentCalendar";

export const metadata: Metadata = {
  title: "Government Calendar | OpenAgriNet",
  description: "Public holidays, regional holidays and government observances.",
};

export default function GovernmentCalendarPage() {
  return <GovernmentCalendar />;
}
