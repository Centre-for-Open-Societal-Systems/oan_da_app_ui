import type { Metadata } from "next";
import { SupervisorCoaching } from "./components/SupervisorCoaching";

export const metadata: Metadata = {
  title: "Coaching | OpenAgriNet",
  description: "Coaching sessions, feedback and next actions for a development agent.",
};

export default function CoachingPage() {
  return <SupervisorCoaching />;
}
