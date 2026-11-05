"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { todayIso } from "@/lib/utils";
import {
  QUESTION_TYPES,
  SURVEY_LANGUAGES,
  SURVEY_TYPES,
  surveyFromTemplate,
  templateErrors,
  useSurveyTemplatesStore,
  type SurveyTask,
  type TemplateInput,
  type TemplateQuestion,
} from "@/features/surveys";

interface CreateTemplateModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called with the published survey so the page can confirm it. */
  onCreated: (task: SurveyTask) => void;
}

const blankQuestion = (id: number): TemplateQuestion => ({ id, prompt: "", type: "rating", options: "", required: true });

// Supervisor builds a survey template; publishing it opens the survey for every DA under Assigned surveys.
export function CreateTemplateModal({ isOpen, onClose, onCreated }: CreateTemplateModalProps) {
  const created = useSurveyTemplatesStore((s) => s.created);
  const addSurvey = useSurveyTemplatesStore((s) => s.add);
  const [draft, setDraft] = useState<TemplateInput>(() => ({
    name: "",
    type: SURVEY_TYPES[0],
    open: todayIso(),
    close: "",
    languages: ["English", "Amharic"],
    targetFarmers: 20,
    questions: [blankQuestion(1)],
  }));
  const [showErrors, setShowErrors] = useState(false);
  const errors = templateErrors(draft);

  const patch = (next: Partial<TemplateInput>) => setDraft((d) => ({ ...d, ...next }));
  const patchQuestion = (id: number, next: Partial<TemplateQuestion>) =>
    patch({ questions: draft.questions.map((q) => (q.id === id ? { ...q, ...next } : q)) });
  const toggleLanguage = (lang: string) =>
    patch({ languages: draft.languages.includes(lang) ? draft.languages.filter((l) => l !== lang) : [...draft.languages, lang] });

  const publish = () => {
    if (errors.length > 0) {
      setShowErrors(true);
      return;
    }
    const task = surveyFromTemplate(draft, created.length + 1);
    addSurvey(task);
    onCreated(task);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Template"
      subtitle="Published templates appear under Assigned surveys for every DA."
      size="xl"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
          <Button type="button" variant="brand" onClick={publish}>Publish to DAs</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {showErrors && errors.length > 0 && (
          <Banner tone="error" title="Fix these before publishing">
            <ul className="list-disc pl-4">{errors.map((e) => <li key={e}>{e}</li>)}</ul>
          </Banner>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Template name" htmlFor="tpl-name" required hint="At least 3 characters." hintTone={draft.name.trim().length > 0 && draft.name.trim().length < 3 ? "error" : "muted"}>
            <Input id="tpl-name" className="h-10" value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Meher input satisfaction" />
          </FormField>
          <FormField label="Survey type" htmlFor="tpl-type" required>
            <Select id="tpl-type" className="h-10" value={draft.type} onChange={(e) => patch({ type: e.target.value as SurveyTask["type"] })}>
              {SURVEY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Opens" htmlFor="tpl-open" required hint="Today or later." hintTone={draft.open !== "" && draft.open < todayIso() ? "error" : "muted"}>
            <Input id="tpl-open" type="date" min={todayIso()} className="h-10" value={draft.open} onChange={(e) => patch({ open: e.target.value })} />
          </FormField>
          <FormField label="Closes" htmlFor="tpl-close" required hint="On or after the Opens date." hintTone={draft.close !== "" && draft.close < draft.open ? "error" : "muted"}>
            <Input id="tpl-close" type="date" className="h-10" value={draft.close} min={draft.open || undefined} onChange={(e) => patch({ close: e.target.value })} />
          </FormField>
          <FormField label="Farmers per DA" htmlFor="tpl-target" required hint="At least 1.">
            <Input id="tpl-target" type="number" min={1} className="h-10" value={draft.targetFarmers || ""} onChange={(e) => patch({ targetFarmers: Number(e.target.value) })} />
          </FormField>
        </div>

        <fieldset>
          <legend className="text-[14px] font-medium text-ink">Languages <span className="text-danger">*</span></legend>
          <div className="mt-2 flex flex-wrap gap-5">
            {SURVEY_LANGUAGES.map((lang) => (
              <label key={lang} className="flex cursor-pointer items-center gap-2 text-[13.5px] text-slate-700">
                <Checkbox checked={draft.languages.includes(lang)} onChange={() => toggleLanguage(lang)} /> {lang}
              </label>
            ))}
          </div>
        </fieldset>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-[14px] font-medium text-ink">Questions <span className="text-danger">*</span></p>
            <span className="text-[12.5px] text-muted">Consent, Farmer ID and Kebele are added automatically</span>
          </div>

          {draft.questions.map((q, i) => {
            const hasOptions = QUESTION_TYPES.find((qt) => qt.value === q.type)?.hasOptions;
            return (
              <div key={q.id} className="flex flex-col gap-3 rounded-xl border border-line bg-surface-alt p-3.5">
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-brand-mint px-2.5 py-0.5 text-[12px] font-semibold text-brand-green">Q{i + 1}</span>
                  {draft.questions.length > 1 && (
                    <button type="button" onClick={() => patch({ questions: draft.questions.filter((o) => o.id !== q.id) })} className="text-[12.5px] font-medium text-danger hover:underline">
                      Remove
                    </button>
                  )}
                </div>
                <FormField label="Question" htmlFor={`tpl-q-${q.id}`} required>
                  <Input id={`tpl-q-${q.id}`} className="h-10 bg-white" value={q.prompt} onChange={(e) => patchQuestion(q.id, { prompt: e.target.value })} placeholder="What should the DA ask the farmer?" />
                </FormField>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_1fr]">
                  <FormField label="Answer type" htmlFor={`tpl-qt-${q.id}`}>
                    <Select id={`tpl-qt-${q.id}`} className="h-10 bg-white" value={q.type} onChange={(e) => patchQuestion(q.id, { type: e.target.value as TemplateQuestion["type"] })}>
                      {QUESTION_TYPES.map((qt) => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
                    </Select>
                  </FormField>
                  {hasOptions && (
                    <FormField label="Choices" htmlFor={`tpl-qo-${q.id}`} required hint="At least two; separate choices with commas">
                      <Input id={`tpl-qo-${q.id}`} className="h-10 bg-white" value={q.options} onChange={(e) => patchQuestion(q.id, { options: e.target.value })} placeholder="Yes, Partly, No" />
                    </FormField>
                  )}
                </div>
                <label className="flex w-fit cursor-pointer items-center gap-2 text-[13px] text-slate-700">
                  <Checkbox checked={q.required} onChange={() => patchQuestion(q.id, { required: !q.required })} /> Required
                </label>
              </div>
            );
          })}

          <button
            type="button"
            onClick={() => patch({ questions: [...draft.questions, blankQuestion(Math.max(0, ...draft.questions.map((q) => q.id)) + 1)] })}
            className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-dashed border-brand-green/50 text-[13.5px] font-semibold text-brand-green transition-colors hover:bg-brand-wash"
          >
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add question
          </button>
        </div>
      </div>
    </Modal>
  );
}
