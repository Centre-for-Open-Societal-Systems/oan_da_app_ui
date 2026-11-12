import type { PillTone } from "@/components/ui/Pill";

// FR-09d Farmer Satisfaction Surveys. Shapes follow the DA Services Surveys API (see api.ts).

export type ResponseType = "consent" | "auto" | "lookup" | "rating" | "single" | "multi" | "text";

export interface Parameter {
  id: string;
  order: number;
  /** English prompt. */
  prompt: string;
  type: ResponseType;
  required: boolean;
  options?: string[];
  helper?: string;
  prefill?: string;
  /** Non-English prompts keyed by language ("Amharic", "Afaan Oromoo"). */
  translations?: Record<string, string>;
  /** Only shown when the referenced parameter has this value (skip logic; seed templates only). */
  condition?: { parameterId: string; equals: string };
}

export type ResponseStatus = "Draft" | "Queued" | "Synced" | "Rejected" | "Conflict" | "Declined";
export type SurveyType = "Satisfaction" | "Service quality" | "Needs assessment";
export type SurveyStatus = "Open" | "Closing soon" | "Closed";
export type AssignmentMode = "Woreda" | "Selected";

/** A published survey template / assigned survey task (serialize_survey). */
export interface SurveyTask {
  id: string;
  name: string;
  templateVersion: string;
  type: SurveyType;
  /** Display dates, e.g. "08 Sep 2026". */
  window: { open: string; close: string };
  /** ISO yyyy-mm-dd, for edits and the capture window check. */
  window_open: string;
  window_close: string;
  languages: string[];
  targetFarmers: number;
  collected: number;
  queued: number;
  status: SurveyStatus;
  estMinutes: number;
  /** Canonical farmer ids already answered (one response per farmer per survey, across DAs). */
  answered: string[];
  region?: string | null;
  zone?: string | null;
  woreda?: string | null;
  created_by_user?: string | null;
  assignmentMode?: AssignmentMode;
  /** Template list / detail and create / patch responses only. */
  assignedDaIds?: string[];
  /** Absent on list rows. */
  parameters?: Parameter[];
}

export const RESPONSE_TONE: Record<ResponseStatus, PillTone> = { Draft: "slate", Queued: "amber", Synced: "green", Rejected: "red", Conflict: "purple", Declined: "slate" };
export const SURVEY_STATUS_TONE: Record<SurveyStatus, PillTone> = { Open: "green", "Closing soon": "amber", Closed: "slate" };

/** Prompt in the chosen language, falling back to English. */
export const promptIn = (p: Parameter, language: string) => (language === "English" ? p.prompt : p.translations?.[language]?.trim() || p.prompt);
