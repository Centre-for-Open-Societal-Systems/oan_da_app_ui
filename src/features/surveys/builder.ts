// Supervisor survey-template catalog and builder (mock data until the survey template API exists).

export type ParamKind = "consent" | "single" | "multi" | "rating" | "yesno" | "short" | "long" | "number" | "date" | "lookup" | "auto";

export interface ParamKindMeta {
  kind: ParamKind;
  label: string;
  hint: string;
  /** Uppercase chip on the parameter row. */
  badge: string;
  /** Tailwind classes for the chip and the icon tile. */
  tone: string;
  tile: string;
  /** SVG path(s) for the 24×24 icon. */
  icon: string;
  hasOptions: boolean;
}

export const PARAM_KINDS: ParamKindMeta[] = [
  { kind: "consent", label: "Consent", hint: "Yes / No · survey ends if declined", badge: "Consent", tone: "border-brand-border bg-brand-mint text-brand-green", tile: "bg-brand-mint text-brand-green", icon: "M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9", hasOptions: false },
  { kind: "single", label: "Single choice", hint: "One answer from a list", badge: "Single choice", tone: "border-sky-200 bg-sky-50 text-sky-700", tile: "bg-blue-50 text-blue-600", icon: "M9 6h11M9 12h11M9 18h11M4.5 6h.01M4.5 12h.01M4.5 18h.01", hasOptions: true },
  { kind: "multi", label: "Multi-select", hint: "Several answers from a list", badge: "Multi-select", tone: "border-violet-200 bg-violet-50 text-violet-700", tile: "bg-violet-50 text-violet-600", icon: "M3.5 6l1.5 1.5L8 4.5M3.5 12l1.5 1.5L8 10.5M3.5 18l1.5 1.5L8 16.5M11 6h10M11 12h10M11 18h10", hasOptions: true },
  { kind: "rating", label: "Rating 1-5", hint: "Satisfaction scale", badge: "Rating 1-5", tone: "border-amber-200 bg-amber-50 text-amber-700", tile: "bg-amber-50 text-amber-600", icon: "M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z", hasOptions: false },
  { kind: "yesno", label: "Yes / No", hint: "Simple two-way answer", badge: "Yes / No", tone: "border-brand-border bg-brand-mint text-brand-green", tile: "bg-brand-mint text-brand-green", icon: "M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9", hasOptions: false },
  { kind: "short", label: "Short text", hint: "One line · up to 100 characters", badge: "Short text", tone: "border-slate-200 bg-slate-50 text-slate-600", tile: "bg-slate-100 text-slate-600", icon: "M5 5h14M12 5v14M9 19h6", hasOptions: false },
  { kind: "long", label: "Long text", hint: "Up to 300 characters · voice-to-text", badge: "Long text", tone: "border-slate-200 bg-white text-slate-600", tile: "bg-slate-100 text-slate-600", icon: "M4 6h16M4 10h16M4 14h16M4 18h10", hasOptions: false },
  { kind: "number", label: "Number", hint: "Whole or decimal number", badge: "Number", tone: "border-orange-200 bg-orange-50 text-orange-700", tile: "bg-orange-50 text-orange-600", icon: "M5 9h14M5 15h14M10 3L8 21M16 3l-2 18", hasOptions: false },
  { kind: "date", label: "Date", hint: "Date picker", badge: "Date", tone: "border-pink-200 bg-pink-50 text-pink-700", tile: "bg-pink-50 text-pink-600", icon: "M7 3v3M17 3v3M4 9h16M5 5h14a1 1 0 011 1v13a1 1 0 01-1 1H5a1 1 0 01-1-1V6a1 1 0 011-1z", hasOptions: false },
  { kind: "lookup", label: "Lookup", hint: "Link to a visit or farmer record", badge: "Lookup", tone: "border-violet-200 bg-violet-50 text-violet-700", tile: "bg-violet-50 text-violet-600", icon: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1", hasOptions: false },
  { kind: "auto", label: "Auto-filled", hint: "Read-only value from the registry", badge: "Auto-filled", tone: "border-blue-200 bg-blue-50 text-blue-700", tile: "bg-blue-50 text-blue-600", icon: "M7 11V8a5 5 0 0110 0v3M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z", hasOptions: false },
];

export const kindMeta = (kind: ParamKind) => PARAM_KINDS.find((k) => k.kind === kind) ?? PARAM_KINDS[0];

export interface TemplateParam {
  id: string;
  kind: ParamKind;
  title: string;
  /** Grey line under the title (scale anchors, options summary, source…). */
  detail: string;
  helpText?: string;
  options?: string[];
  required: boolean;
  offline: boolean;
  /** Skip logic: only shown when the referenced parameter's answer is (or is not) the value. */
  condition?: { paramId: string; op: "equals" | "notEquals"; value: string };
  needsTranslation?: boolean;
}

export type TemplateStatus = "Active" | "Draft" | "Archived";
export type ApprovalState = "none" | "requested" | "approved";

export interface SurveyTemplate {
  id: string;
  name: string;
  description: string;
  type: string;
  status: TemplateStatus;
  version: number;
  /** Language → translated. The first language is the source text. */
  languages: { name: string; translated: boolean }[];
  params: TemplateParam[];
  approval: ApprovalState;
  /** Epoch ms of the last save; drives "Autosaved … ago" and "Last edited". */
  savedAt: number;
  /** Still being set up by its author (highlighted in the catalog). */
  beingCreated?: boolean;
}

export const TEMPLATE_TYPES = ["Farmer satisfaction", "Service feedback", "Input services", "Training", "Advisory", "Grievance", "Market access", "Soil health", "Irrigation", "Financial services"];
export const TEMPLATE_LANGUAGES = ["English", "Amharic", "Afaan Oromo", "Tigrinya", "Somali"];

export const TEMPLATE_SETTINGS = [
  { label: "Audience", value: "Farmers linked to a DA" },
  { label: "Frequency", value: "Once per season" },
  { label: "Collection", value: "Mobile · offline-capable" },
  { label: "Anonymity", value: "Anonymised in reports", highlight: true },
];

const p = (id: string, kind: ParamKind, title: string, detail: string, extra: Partial<TemplateParam> = {}): TemplateParam => ({ id, kind, title, detail, required: true, offline: true, ...extra });

/** Every new template starts with consent and the farmer / kebele context. */
export const STANDARD_PARAMS: TemplateParam[] = [
  p("q1", "consent", "Consent to take part in this survey", "Yes / No · survey ends if declined", { options: ["Yes, I agree", "No, I don't want to"], helpText: "The survey will end if you decline." }),
  p("q2", "auto", "Farmer ID", "Read-only · from Farmer Registry (Fayda-verified)"),
  p("q3", "auto", "Kebele", "Read-only · from the DA's assignment"),
];

const DA_FEEDBACK_PARAMS: TemplateParam[] = [
  ...STANDARD_PARAMS,
  p("q4", "lookup", "Related visit", "Links the response to a visit record", { required: false }),
  p("q5", "rating", "Overall satisfaction with extension services", "1 = very dissatisfied · 5 = very satisfied"),
  p("q6", "rating", "Timeliness of the DA's visits", "1 = always late · 5 = always on time"),
  p("q7", "rating", "Usefulness of the advice provided", "1 = not useful · 5 = very useful"),
  p("q8", "rating", "Conduct and professionalism of the DA", "1 = poor · 5 = excellent"),
  p("q9", "multi", "Services received this season", "Advisory · Input supply · Credit linkage · Training · Market linkage", { options: ["Advisory", "Input supply", "Credit linkage", "Training", "Market linkage"] }),
  p("q10", "single", "Was the advice applied on your plot?", "Yes · Partly · No", { options: ["Yes", "Partly", "No"] }),
  p("q11", "single", "Observed change in yield", "Increased · No change · Decreased · Too early to tell · shown only if Q10 ≠ No", { options: ["Increased", "No change", "Decreased", "Too early to tell"], required: false, condition: { paramId: "q10", op: "notEquals", value: "No" } }),
  p("q12", "long", "Suggestions to improve the service", "Optional · max 300 characters · voice-to-text enabled", { required: false, needsTranslation: true }),
];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
// Fixed reference point so seeded "last edited" dates stay stable between renders.
const NOW = Date.parse("2026-11-11T10:00:00Z");
const allTranslated = (n: number) => TEMPLATE_LANGUAGES.slice(0, n).map((name) => ({ name, translated: true }));

const seed = (id: string, name: string, description: string, type: string, count: number, langs: number, status: TemplateStatus, savedAt: number): SurveyTemplate => ({
  id, name, description, type, status, version: Number(name.match(/v(\d+)$/)?.[1] ?? 1), languages: allTranslated(langs),
  params: DA_FEEDBACK_PARAMS.slice(0, count).map((q): TemplateParam => ({ ...q, needsTranslation: false })).concat(
    Array.from({ length: Math.max(0, count - DA_FEEDBACK_PARAMS.length) }, (_, i) => p(`x${i}`, "rating", `Additional rating ${i + 1}`, "1 = poor · 5 = excellent")),
  ),
  approval: "approved", savedAt,
});

export const SEED_TEMPLATES: SurveyTemplate[] = [
  seed("tpl-farmer-satisfaction-v3", "Farmer Satisfaction v3", "Season-end satisfaction with extension services", "Farmer satisfaction", 12, 5, "Active", Date.parse("2026-06-12T09:00:00Z")),
  {
    id: "tpl-da-service-feedback-v1", name: "DA Service Feedback v1", description: "Farmer feedback on DA conduct, timeliness and usefulness of advisory · collected offline during visits",
    type: "Service feedback", status: "Draft", version: 1,
    languages: [{ name: "Amharic", translated: true }, { name: "Afaan Oromo", translated: true }, { name: "Tigrinya", translated: false }, { name: "Somali", translated: false }, { name: "English", translated: false }],
    params: DA_FEEDBACK_PARAMS, approval: "none", savedAt: NOW - 2 * 60_000, beingCreated: true,
  },
  seed("tpl-input-distribution-v2", "Input Distribution Feedback v2", "Fertiliser & seed delivery experience", "Input services", 9, 5, "Active", Date.parse("2026-05-28T09:00:00Z")),
  seed("tpl-training-effectiveness-v1", "Training Effectiveness v1", "Post-training knowledge & applicability", "Training", 10, 3, "Active", Date.parse("2026-05-14T09:00:00Z")),
  seed("tpl-crop-advisory-v2", "Crop Advisory Usefulness v2", "Relevance of advisory content by crop", "Advisory", 8, 5, "Active", Date.parse("2026-04-02T09:00:00Z")),
  seed("tpl-grievance-followup-v1", "Grievance Follow-up Check v1", "Satisfaction with grievance resolution", "Grievance", 7, 2, "Archived", Date.parse("2026-02-19T09:00:00Z")),
  seed("tpl-market-price-v2", "Market Price Awareness v2", "Awareness of current market prices and sales channels", "Market access", 8, 4, "Active", Date.parse("2026-06-18T09:00:00Z")),
  seed("tpl-soil-testing-v1", "Soil Testing Follow-up v1", "Follow-up on soil test recommendations and adoption", "Soil health", 6, 3, "Active", Date.parse("2026-06-05T09:00:00Z")),
  seed("tpl-irrigation-support-v1", "Irrigation Support Check v1", "Availability and usefulness of irrigation support services", "Irrigation", 9, 5, "Active", Date.parse("2026-05-22T09:00:00Z")),
  { ...seed("tpl-credit-access-v1", "Credit Access Feedback v1", "Ease of access to credit and loan repayment experience", "Financial services", 11, 4, "Draft", NOW - HOUR), approval: "none" },
  seed("tpl-livestock-advisory-v1", "Livestock Advisory Feedback v1", "Usefulness of animal health and feed advice", "Advisory", 9, 3, "Active", NOW - 120 * DAY),
  seed("tpl-cooperative-services-v1", "Cooperative Services Check v1", "Member experience with cooperative services", "Market access", 7, 2, "Archived", NOW - 200 * DAY),
];

// ---- derived values -------------------------------------------------------------------------------

export const isParamComplete = (q: TemplateParam) => q.title.trim() !== "" && (!kindMeta(q.kind).hasOptions || (q.options?.filter(Boolean).length ?? 0) >= 2);

export function readinessOf(t: SurveyTemplate) {
  const translated = t.languages.filter((l) => l.translated).length;
  const pendingLanguages = t.languages.filter((l) => !l.translated).map((l) => l.name);
  const untranslatedParams = t.params.filter((q) => q.needsTranslation).length;
  const checklist = [
    { key: "params", label: "All parameters defined", done: t.params.length > 0 && t.params.every(isParamComplete) },
    { key: "required", label: "Required fields marked", done: t.params.some((q) => q.required) },
    { key: "skip", label: "Skip logic validated", done: t.params.every((q, i) => !q.condition || t.params.slice(0, i).some((prev) => prev.id === q.condition!.paramId)) },
    { key: "consent", label: "Consent question present", done: t.params.some((q) => q.kind === "consent") },
    { key: "languages", label: `All ${t.languages.length} languages translated`, done: pendingLanguages.length === 0 && untranslatedParams === 0 },
    { key: "approval", label: "Approved by Woreda supervisor", done: t.approval === "approved" },
  ];
  return {
    defined: t.params.filter(isParamComplete).length,
    total: t.params.length,
    required: t.params.filter((q) => q.required).length,
    translated,
    pendingLanguages,
    untranslatedParams,
    // About 20 seconds per question.
    estMinutes: Math.max(1, Math.ceil((t.params.length * 20) / 60)),
    checklist,
    ready: checklist.every((c) => c.done),
  };
}

export function relativeTime(ms: number, now = Date.now()) {
  const diff = Math.max(0, now - ms);
  const min = Math.floor(diff / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} minute${min === 1 ? "" : "s"} ago`;
  const hours = Math.floor(min / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  return new Date(ms).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

export const formatStamp = (ms: number) =>
  `${new Date(ms).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}, ${new Date(ms).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`;

/** "v3" → "v4" at the end of a template name. */
export const bumpVersionName = (name: string, version: number) => (/\sv\d+$/.test(name) ? name.replace(/v\d+$/, `v${version}`) : `${name} v${version}`);
