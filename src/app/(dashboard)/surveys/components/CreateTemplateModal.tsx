"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { DatePicker } from "@/components/ui/DatePicker";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { todayIso } from "@/lib/utils";
import { AreaPicker, type AreaSelection } from "@/features/geo";
import { listAgents, type ApiAgent } from "@/features/agents";
import {
  DEFAULT_TARGET_FARMERS,
  QUESTION_TYPES,
  SURVEY_LANGUAGES,
  questionTypesFor,
  SURVEY_TYPES,
  TRANSLATION_LANGUAGES,
  addDaysIso,
  createSurveyTemplate,
  describeSurveyError,
  getSurveyTemplate,
  newOpId,
  patchSurveyTemplate,
  templateErrors,
  templateInputFrom,
  templatePatch,
  toTemplateBody,
  type SurveyTask,
  type TemplateInput,
  type TemplateQuestion,
} from "@/features/surveys";

interface CreateTemplateModalProps {
  onClose: () => void;
  /** Called with the saved survey (for an edit, possibly a new version with a new id). */
  onSaved: (task: SurveyTask, mode: "created" | "updated" | "versioned") => void;
  /** Edit this template instead of creating one. */
  template?: SurveyTask;
}

const blankQuestion = (id: number): TemplateQuestion => ({ id, prompt: "", type: "rating", options: "", required: true, translations: {} });

/** Answer boxes shown for a choice question. */
const CHOICE_SLOTS = 4;
/** The choices of a question as one box each (kept comma-separated in the draft), padded to CHOICE_SLOTS. */
const choiceSlots = (options: string) => {
  const slots = options === "" ? [] : options.split(",");
  return [...slots, ...Array<string>(Math.max(0, CHOICE_SLOTS - slots.length)).fill("")];
};

const agentLabel =(a: ApiAgent) => `${a.full_name} · ${a.da_id}`;

// Supervisor / Admin: create = publish (POST /surveys/templates), or edit an existing template (PATCH).
export function CreateTemplateModal({ onClose, onSaved, template }: CreateTemplateModalProps) {
  const editing = Boolean(template);
  const initial = useMemo<TemplateInput>(
    () =>
      template
        ? templateInputFrom(template)
        : {
            name: "",
            type: SURVEY_TYPES[0],
            open: todayIso(),
            // Two weeks by default; the Supervisor can change it.
            close: addDaysIso(todayIso(), 14),
            languages: ["English"],
            targetFarmers: DEFAULT_TARGET_FARMERS,
            questions: [blankQuestion(1)],
            // Set by the area picker: a Supervisor's own Woreda (from /me), else the one picked.
            woreda: "",
            assignmentMode: "Woreda",
            assignedDaIds: [],
          },
    [template],
  );
  const [draft, setDraft] = useState<TemplateInput>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One id per form: a retry after a network error returns the template already created.
  const [opId] = useState(() => newOpId("srv"));

  // DAs of the Woreda for Selected mode, keyed by Woreda so a change shows "Loading" until its list arrives.
  const [agentList, setAgentList] = useState<{ woreda: string; rows?: ApiAgent[]; error?: string } | null>(null);

  // A new template names its Woreda; an existing one keeps it.
  const woredaRequired = !editing;
  const errors = templateErrors(draft, { woredaRequired });

  const agentWoreda = draft.woreda ?? "";
  const agents = agentList?.woreda === agentWoreda ? agentList.rows ?? null : null;
  const agentsError = agentList?.woreda === agentWoreda ? agentList.error ?? null : null;
  useEffect(() => {
    if (draft.assignmentMode !== "Selected") return;
    let current = true;
    listAgents({ woreda: agentWoreda || undefined, limit: 500 })
      .then(({ agents: rows }) => current && setAgentList({ woreda: agentWoreda, rows }))
      .catch((err: unknown) => current && setAgentList({ woreda: agentWoreda, rows: [], error: describeSurveyError(err) }));
    return () => {
      current = false;
    };
  }, [draft.assignmentMode, agentWoreda]);

  const patch = (next: Partial<TemplateInput>) => setDraft((d) => ({ ...d, ...next }));
  // The area picker reports its Woreda (a Supervisor's own from /me, else the one picked); DAs picked for another go.
  const pickArea = useCallback((area: AreaSelection) => {
    const woreda = area.woreda?.code ?? "";
    setDraft((d) => (d.woreda === woreda ? d : { ...d, woreda, assignedDaIds: [] }));
  }, []);
  const patchQuestion = (id: number, next: Partial<TemplateQuestion>) =>
    setDraft((d) => ({ ...d, questions: d.questions.map((q) => (q.id === id ? { ...q, ...next } : q)) }));

  const translationLanguages = TRANSLATION_LANGUAGES.filter((l) => draft.languages.includes(l));
  const agentOptions = (agents ?? []).map(agentLabel);
  const selectedAgentLabels = (agents ?? []).filter((a) => draft.assignedDaIds.includes(a.da_id)).map(agentLabel);

  const submit = async () => {
    if (errors.length > 0) {
      setShowErrors(true);
      return;
    }
    setSaving(true);
    setError(null);
    try {
      if (template) {
        const body = templatePatch(initial, draft);
        if (Object.keys(body).length === 0) {
          onClose();
          return;
        }
        const savedId = await patchSurveyTemplate(template.id, body);
        onSaved(await getSurveyTemplate(savedId), savedId !== template.id ? "versioned" : "updated");
      } else {
        onSaved(await getSurveyTemplate(await createSurveyTemplate(toTemplateBody(draft, opId))), "created");
      }
    } catch (err) {
      setError(describeSurveyError(err));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={editing ? "Edit Template" : "Create Template"}
      subtitle={editing ? `${template!.name} · template ${template!.templateVersion}` : "Publishing opens the survey for the DAs right away — there is no separate draft or approval step."}
      size="xl"
      bodyClassName="p-4 sm:p-6 max-h-[75vh] overflow-y-auto"
      footer={
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 w-full">
          <Button type="button" variant="outline" className="h-10 sm:h-10.5 rounded-xl px-5 font-semibold border-line justify-center" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="brand" className="h-10 sm:h-10.5 rounded-xl px-6 font-semibold shadow-xs justify-center" onClick={submit} disabled={saving}>
            {saving ? (editing ? "Saving…" : "Publishing…") : editing ? "Save changes" : "Publish to DAs"}
          </Button>
        </div>
      }
    >
      <div className="flex flex-col gap-4 sm:gap-5">
        {error && <Banner tone="error" title={editing ? "Couldn't save the template" : "Couldn't publish the template"} onDismiss={() => setError(null)}>{error}</Banner>}
        {showErrors && errors.length > 0 && (
          <Banner tone="error" title="Fix these before publishing">
            <ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </Banner>
        )}
        {editing && template!.collected > 0 && (
          <Banner tone="info">
            {template!.collected} response{template!.collected === 1 ? " is" : "s are"} already collected. Changing the questions publishes a new template version with zero responses; the current version and its responses stay as they are.
          </Banner>
        )}

        {/* Template Basic Info */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Template name" htmlFor="tpl-name" required hint="At least 3 characters." hintTone={draft.name.trim().length > 0 && draft.name.trim().length < 3 ? "error" : "muted"}>
            <Input id="tpl-name" className="h-10 sm:h-10.5 rounded-xl" value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Meher input satisfaction" />
          </FormField>
          <FormField label="Survey type" htmlFor="tpl-type" required hint={editing ? "Can't be changed after publishing." : undefined}>
            <Select id="tpl-type" className="h-10 sm:h-10.5 rounded-xl font-medium" value={draft.type} disabled={editing} onChange={(e) => patch({ type: e.target.value as TemplateInput["type"] })}>
              {SURVEY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </FormField>
        </div>

        {/* Collection Window with Modern Animated DatePicker */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Opens" htmlFor="tpl-open" required hint={showErrors && !draft.open ? "Pick the date the survey opens." : undefined} hintTone="error">
            <DatePicker
              id="tpl-open"
              value={draft.open}
              minDate={editing ? undefined : todayIso()}
              onChange={(date) => {
                patch({ open: date });
                if (draft.close && date && draft.close < date) {
                  patch({ open: date, close: date });
                }
              }}
              placeholder="Select open date"
              className="h-10 sm:h-10.5 rounded-xl"
              clearable={false}
            />
          </FormField>
          <FormField
            label="Closes"
            htmlFor="tpl-close"
            required
            hint={showErrors && !draft.close ? "Pick the date the survey closes." : "On or after the Opens date."}
            hintTone={(showErrors && !draft.close) || (draft.close !== "" && draft.close < draft.open) ? "error" : "muted"}
          >
            <DatePicker
              id="tpl-close"
              value={draft.close}
              minDate={draft.open || (editing ? undefined : todayIso())}
              onChange={(date) => patch({ close: date })}
              placeholder="Select close date"
              className="h-10 sm:h-10.5 rounded-xl"
              clearable={false}
            />
          </FormField>
        </div>

        {!editing && (
          <AreaPicker
            depth="woreda"
            required
            idPrefix="tpl"
            onChange={pickArea}
            error={showErrors && woredaRequired && !draft.woreda ? "Pick the Woreda the survey is for." : undefined}
          />
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {editing && (
            <FormField label="Woreda" htmlFor="tpl-woreda" hint="Can't be changed after publishing.">
              <Input id="tpl-woreda" className="h-10 sm:h-10.5 rounded-xl bg-surface-muted" value={draft.woreda || "—"} disabled readOnly />
            </FormField>
          )}
          <FormField label="Assign to" htmlFor="tpl-mode" required>
            <Select id="tpl-mode" className="h-10 sm:h-10.5 rounded-xl font-medium" value={draft.assignmentMode} onChange={(e) => patch({ assignmentMode: e.target.value as TemplateInput["assignmentMode"] })}>
              <option value="Woreda">Every DA in the Woreda</option>
              <option value="Selected">Selected DAs only</option>
            </Select>
          </FormField>
        </div>

        {draft.assignmentMode === "Selected" && (
          <FormField label="DAs" htmlFor="tpl-das" required hint={agentsError ?? (agents && agents.length === 0 ? "No DAs found in this Woreda." : "Only DAs of the Woreda can be assigned.")} hintTone={agentsError ? "error" : "muted"}>
            <MultiSelectDropdown
              id="tpl-das"
              options={agentOptions}
              selected={selectedAgentLabels}
              disabled={!agents || agents.length === 0}
              placeholder={agents ? "Select DAs…" : "Loading DAs…"}
              onChange={(labels) => patch({ assignedDaIds: (agents ?? []).filter((a) => labels.includes(agentLabel(a))).map((a) => a.da_id) })}
            />
          </FormField>
        )}

        {/* Languages Selection */}
        <fieldset className="rounded-xl border border-line-soft bg-surface-subtle/30 p-3.5 sm:p-4">
          <legend className="text-[13px] sm:text-[13.5px] font-semibold text-ink px-1">
            Languages <span className="text-danger">*</span>
          </legend>
          <div className="mt-1.5 flex flex-wrap gap-4 sm:gap-6">
            {SURVEY_LANGUAGES.map((lang) => (
              <label key={lang} className="flex cursor-pointer items-center gap-2 text-[13px] sm:text-[13.5px] font-medium text-slate-700 select-none">
                <Checkbox checked={draft.languages.includes(lang)} disabled readOnly />
                <span>{lang}</span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Questions Section */}
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 border-t border-line-soft pt-3">
            <p className="text-[14px] sm:text-[15px] font-bold text-ink">
              Questions <span className="text-danger">*</span>
            </p>
            <span className="text-[12px] sm:text-[12.5px] text-muted">
              Consent, Farmer ID and Kebele are added automatically
            </span>
          </div>

          {draft.questions.map((q, i) => {
            const withOptions = QUESTION_TYPES.find((qt) => qt.value === q.type)?.hasOptions;
            return (
              <div key={q.id} className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/40 p-4 sm:p-4.5 shadow-2xs transition-all hover:border-slate-300">
                <div className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-brand-wash px-2.5 py-1 text-[12px] font-bold text-brand-green border border-brand-green/20">
                    Question {i + 1}
                  </span>
                  {draft.questions.length > 1 && (
                    <button
                      type="button"
                      onClick={() => patch({ questions: draft.questions.filter((o) => o.id !== q.id) })}
                      className="inline-flex items-center gap-1 text-[12px] sm:text-[12.5px] font-semibold text-rose-600 hover:text-rose-700 hover:bg-rose-50 px-2 py-1 rounded-lg transition-colors"
                    >
                      <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="3 6 5 6 21 6" />
                        <path d="M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                      </svg>
                      <span>Remove</span>
                    </button>
                  )}
                </div>

                <FormField label="Question (English)" htmlFor={`tpl-q-${q.id}`} required>
                  <Input id={`tpl-q-${q.id}`} className="h-10 sm:h-10.5 rounded-xl bg-white" value={q.prompt} onChange={(e) => patchQuestion(q.id, { prompt: e.target.value })} placeholder="What should the DA ask the farmer?" />
                </FormField>

                {translationLanguages.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {translationLanguages.map((lang) => (
                      <FormField key={lang} label={`Question (${lang})`} htmlFor={`tpl-q-${q.id}-${lang}`} hint="Optional · DAs see English when empty">
                        <Input
                          id={`tpl-q-${q.id}-${lang}`}
                          className="h-10 sm:h-10.5 rounded-xl bg-white"
                          value={q.translations[lang] ?? ""}
                          onChange={(e) => patchQuestion(q.id, { translations: { ...q.translations, [lang]: e.target.value } })}
                        />
                      </FormField>
                    ))}
                  </div>
                )}

                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr] items-end">
                  <FormField label="Answer type" htmlFor={`tpl-qt-${q.id}`}>
                    <Select id={`tpl-qt-${q.id}`} className="h-10 sm:h-10.5 rounded-xl bg-white font-medium" value={q.type} onChange={(e) => patchQuestion(q.id, { type: e.target.value as TemplateQuestion["type"] })}>
                      {questionTypesFor(q.type).map((qt) => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
                    </Select>
                  </FormField>

                  <div className="pb-0.5">
                    <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-line bg-white px-3.5 py-2.5 text-[13px] font-medium text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs select-none">
                      <Checkbox checked={q.required} onChange={() => patchQuestion(q.id, { required: !q.required })} />
                      <span>Required question</span>
                    </label>
                  </div>
                </div>

                {withOptions && (
                  <FormField label="Answers" htmlFor={`tpl-qo-${q.id}-0`} required hint={q.type === "multi" ? "Fill at least two. The farmer can pick more than one." : "Fill at least two. The farmer picks one."}>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {choiceSlots(q.options).map((choice, n, slots) => (
                        <Input
                          key={n}
                          id={`tpl-qo-${q.id}-${n}`}
                          aria-label={`Answer ${n + 1}`}
                          className="h-10 sm:h-10.5 rounded-xl bg-white"
                          value={choice}
                          placeholder={`Answer ${n + 1}`}
                          onChange={(e) => patchQuestion(q.id, { options: slots.map((c, k) => (k === n ? e.target.value.replace(/,/g, "") : c)).join(",") })}
                        />
                      ))}
                    </div>
                  </FormField>
                )}

                {q.type === "text" && (
                  <FormField label="Answer preview" htmlFor={`tpl-qa-${q.id}`} hint="Preview only: DA types the farmer's answer here (up to 500 characters).">
                    <Textarea id={`tpl-qa-${q.id}`} rows={2} className="rounded-xl bg-white" placeholder="Farmer's answer text will appear here…" disabled readOnly />
                  </FormField>
                )}
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => patch({ questions: [...draft.questions, blankQuestion(Math.max(0, ...draft.questions.map((q) => q.id)) + 1)] })}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-brand-green/40 bg-brand-wash/30 text-[13.5px] font-semibold text-brand-green transition-all hover:bg-brand-wash hover:border-brand-green shadow-2xs active:scale-[0.99]"
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Add another question</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
