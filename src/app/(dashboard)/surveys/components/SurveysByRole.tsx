"use client";

import type { ReactNode } from "react";
import { useAuthStore } from "@/store/useAuthStore";
import { isSurveyOfficer } from "@/features/surveys";

// The role lives in the client-side auth store, so only this switch runs on the client; the page renders both views.
export function SurveysByRole({ officer, agent }: { officer: ReactNode; agent: ReactNode }) {
  const role = useAuthStore((s) => s.role);
  return isSurveyOfficer(role) ? officer : agent;
}
