import type { TemplateBody, TemplatePatch, TemplateQuestionBody } from "./api";
import type { AssignmentMode, ResponseType, SurveyTask, SurveyType } from "./data";

export const SURVEY_TYPES: SurveyType[] = ["Satisfaction", "Service quality", "Needs assessment"];
export const SURVEY_LANGUAGES = ["English", "Amharic", "Afaan Oromoo"];
/** Languages a custom question can carry a translation for; English is the prompt itself. */
export const TRANSLATION_LANGUAGES = ["Amharic", "Afaan Oromoo"];

/** Question types a Supervisor can add; consent, Farmer ID and Kebele are added to every template by the server. */
export const QUESTION_TYPES: { value: TemplateQuestionBody["type"]; label: string; hasOptions: boolean }[] = [
  { value: "rating", label: "Rating (1–5)", hasOptions: false },
  { value: "single", label: "Single choice", hasOptions: true },
  { value: "multi", label: "Multiple choice", hasOptions: true },
  { value: "text", label: "Free text", hasOptions: false },
];

export interface TemplateQuestion {
  id: number;
  prompt: string;
  type: TemplateQuestionBody["type"];
  /** Comma-separated choices for single / multiple choice. */
  options: string;
  required: boolean;
  /** Language → prompt. */
  translations: Record<string, string>;
}

export interface TemplateInput {
  name: string;
  type: SurveyType;
  /** yyyy-mm-dd from the date inputs. */
  open: string;
  close: string;
  languages: string[];
  targetFarmers: number;
  questions: TemplateQuestion[];
  /** Woreda code; "" lets the server use the Supervisor's only Woreda. */
  woreda: string;
  assignmentMode: AssignmentMode;
  assignedDaIds: string[];
}

export const formatSurveyDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

/** yyyy-mm-dd `days` after an ISO date (local calendar). */
export const addDaysIso = (iso: string, days: number) => {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

export const optionsOf =(raw: string) => [...new Set(raw.split(",").map((o) => o.trim()).filter(Boolean))];

const hasOptions = (type: ResponseType) => QUESTION_TYPES.find((qt) => qt.value === type)?.hasOptions ?? false;

/** Problems that block publishing, in form order; empty when the template is ready. Mirrors the API validation. */
export function templateErrors(t: TemplateInput, { woredaRequired = false }: { woredaRequired?: boolean } = {}): string[] {
  const errors: string[] = [];
  if (t.name.trim().length < 3) errors.push("Give the template a name.");
  if (!t.open) errors.push("Set the Opens date.");
  if (!t.close) errors.push("Set the Closes date.");
  if (t.open && t.close && t.close < t.open) errors.push("The window must close after it opens.");
  if (t.languages.length === 0) errors.push("Pick at least one language.");
  if (!(t.targetFarmers > 0)) errors.push("Set how many farmers each DA should survey.");
  if (woredaRequired && !t.woreda) errors.push("Pick the Woreda to publish to.");
  if (t.assignmentMode === "Selected" && t.assignedDaIds.length === 0) errors.push("Pick at least one DA, or publish to the whole Woreda.");
  if (t.questions.length === 0) errors.push("Add at least one question.");
  t.questions.forEach((q, i) => {
    if (!q.prompt.trim()) errors.push(`Question ${i + 1} needs text.`);
    if (hasOptions(q.type) && optionsOf(q.options).length < 2) errors.push(`Question ${i + 1} needs at least two choices.`);
  });
  return errors;
}

function questionBodies(t: TemplateInput): TemplateQuestionBody[] {
  return t.questions.map((q) => {
    // Only the languages the survey runs in, and only filled ones.
    const translations = Object.fromEntries(
      TRANSLATION_LANGUAGES.filter((l) => t.languages.includes(l) && q.translations[l]?.trim()).map((l) => [l, q.translations[l].trim()]),
    );
    return {
      prompt: q.prompt.trim(),
      type: q.type,
      options: hasOptions(q.type) ? optionsOf(q.options) : "",
      required: q.required,
      ...(Object.keys(translations).length ? { translations } : {}),
    };
  });
}

/** POST /surveys/templates body from the form. */
export function toTemplateBody(t: TemplateInput, clientOpId: string): TemplateBody {
  return {
    name: t.name.trim(),
    type: t.type,
    open: t.open,
    close: t.close,
    languages: t.languages,
    targetFarmers: t.targetFarmers,
    questions: questionBodies(t),
    ...(t.woreda ? { woreda: t.woreda } : {}),
    assignmentMode: t.assignmentMode,
    ...(t.assignmentMode === "Selected" ? { assignedDaIds: t.assignedDaIds } : {}),
    client_op_id: clientOpId,
  };
}

/** The form state for editing an existing template: its custom questions (p4 onwards) and settings. */
export function templateInputFrom(task: SurveyTask): TemplateInput {
  const custom = (task.parameters ?? []).filter((p) => p.type !== "consent" && p.type !== "auto");
  return {
    name: task.name,
    type: task.type,
    open: task.window_open,
    close: task.window_close,
    languages: task.languages,
    targetFarmers: task.targetFarmers,
    woreda: task.woreda ?? "",
    assignmentMode: task.assignmentMode ?? "Woreda",
    assignedDaIds: task.assignedDaIds ?? [],
    questions: custom.map((p, i) => ({
      id: i + 1,
      prompt: p.prompt,
      // Seed templates may carry lookup questions; they edit as single choice.
      type: p.type === "lookup" ? "single" : (p.type as TemplateQuestion["type"]),
      options: (p.options ?? []).join(", "),
      required: p.required,
      translations: { ...(p.translations ?? {}) },
    })),
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/** PATCH body with only what changed between the loaded template and the form. */
export function templatePatch(before: TemplateInput, after: TemplateInput): TemplatePatch {
  const patch: TemplatePatch = {};
  if (after.name.trim() !== before.name) patch.name = after.name.trim();
  if (after.open !== before.open) patch.open = after.open;
  if (after.close !== before.close) patch.close = after.close;
  if (!same(after.languages, before.languages)) patch.languages = after.languages;
  if (after.targetFarmers !== before.targetFarmers) patch.targetFarmers = after.targetFarmers;
  if (!same(questionBodies(after), questionBodies(before))) patch.questions = questionBodies(after);
  if (after.assignmentMode !== before.assignmentMode || (after.assignmentMode === "Selected" && !same([...after.assignedDaIds].sort(), [...before.assignedDaIds].sort()))) {
    patch.assignmentMode = after.assignmentMode;
    patch.assignedDaIds = after.assignmentMode === "Selected" ? after.assignedDaIds : [];
  }
  return patch;
}
