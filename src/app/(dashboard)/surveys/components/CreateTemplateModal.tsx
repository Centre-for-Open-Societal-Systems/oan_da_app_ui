"use client";

import { useEffect, useMemo, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { MultiSelectDropdown } from "@/components/ui/MultiSelectDropdown";
import { todayIso } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { listAreas, type AdminArea } from "@/features/assignments";
import { listAgents, type ApiAgent } from "@/features/agents";
import {
  QUESTION_TYPES,
  SURVEY_LANGUAGES,
  SURVEY_TYPES,
  TRANSLATION_LANGUAGES,
  addDaysIso,
  createSurveyTemplate,
  describeSurveyError,
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

const NO_WOREDAS: string[] = [];

const agentLabel =(a: ApiAgent) => `${a.full_name} · ${a.da_id}`;

// Supervisor / Admin: create = publish (POST /surveys/templates), or edit an existing template (PATCH).
export function CreateTemplateModal({ onClose, onSaved, template }: CreateTemplateModalProps) {
  const role = useAuthStore((s) => s.role);
  const scopeWoredas = useAuthStore((s) => s.profile?.scope.woredas ?? NO_WOREDAS);
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
            languages: ["English", "Amharic"],
            targetFarmers: 20,
            questions: [blankQuestion(1)],
            // A Supervisor with one Woreda publishes there; others pick one.
            woreda: role === "Supervisor" && scopeWoredas.length === 1 ? scopeWoredas[0] : "",
            assignmentMode: "Woreda",
            assignedDaIds: [],
          },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [template],
  );
  const [draft, setDraft] = useState<TemplateInput>(initial);
  const [showErrors, setShowErrors] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // One id per form: a retry after a network error returns the template already created.
  const [opId] = useState(() => newOpId("srv"));

  const [woredas, setWoredas] = useState<AdminArea[] | null>(null);
  // DAs of the Woreda for Selected mode, keyed by Woreda so a change shows "Loading" until its list arrives.
  const [agentList, setAgentList] = useState<{ woreda: string; rows?: ApiAgent[]; error?: string } | null>(null);

  const woredaRequired = !editing && !(role === "Supervisor" && scopeWoredas.length === 1);
  const errors = templateErrors(draft, { woredaRequired });

  useEffect(() => {
    if (editing) return;
    let current = true;
    listAreas({ level: "Woreda" })
      .then((rows) => {
        if (!current) return;
        // A Supervisor with Woreda grants only picks among them; a Region / Zone grant is checked by the server.
        setWoredas(role === "Supervisor" && scopeWoredas.length > 0 ? rows.filter((w) => scopeWoredas.includes(w.code)) : rows);
      })
      .catch(() => current && setWoredas([]));
    return () => {
      current = false;
    };
  }, [editing, role, scopeWoredas]);

  const agentWoreda = draft.woreda || (scopeWoredas.length === 1 ? scopeWoredas[0] : "");
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
  const patchQuestion = (id: number, next: Partial<TemplateQuestion>) =>
    setDraft((d) => ({ ...d, questions: d.questions.map((q) => (q.id === id ? { ...q, ...next } : q)) }));
  const toggleLanguage = (lang: string) =>
    patch({ languages: draft.languages.includes(lang) ? draft.languages.filter((l) => l !== lang) : [...draft.languages, lang] });

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
        const saved = await patchSurveyTemplate(template.id, body);
        onSaved(saved, saved.id !== template.id ? "versioned" : "updated");
      } else {
        onSaved(await createSurveyTemplate(toTemplateBody(draft, opId)), "created");
      }
    } catch (err) {
      setError(describeSurveyError(err, "save"));
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
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button type="button" variant="brand" onClick={submit} disabled={saving}>
            {saving ? (editing ? "Saving…" : "Publishing…") : editing ? "Save changes" : "Publish to DAs"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
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

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Template name" htmlFor="tpl-name" required hint="At least 3 characters." hintTone={draft.name.trim().length > 0 && draft.name.trim().length < 3 ? "error" : "muted"}>
            <Input id="tpl-name" className="h-10" value={draft.name} onChange={(e) => patch({ name: e.target.value })} placeholder="e.g. Meher input satisfaction" />
          </FormField>
          <FormField label="Survey type" htmlFor="tpl-type" required hint={editing ? "Can't be changed after publishing." : undefined}>
            <Select id="tpl-type" className="h-10" value={draft.type} disabled={editing} onChange={(e) => patch({ type: e.target.value as TemplateInput["type"] })}>
              {SURVEY_TYPES.map((t) => <option key={t}>{t}</option>)}
            </Select>
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <FormField label="Opens" htmlFor="tpl-open" required hint={showErrors && !draft.open ? "Pick the date the survey opens." : undefined} hintTone="error">
            <Input id="tpl-open" type="date" min={editing ? undefined : todayIso()} className="h-10" value={draft.open} onChange={(e) => patch({ open: e.target.value })} />
          </FormField>
          <FormField label="Closes" htmlFor="tpl-close" required hint={showErrors && !draft.close ? "Pick the date the survey closes." : "On or after the Opens date."} hintTone={(showErrors && !draft.close) || (draft.close !== "" && draft.close < draft.open) ? "error" : "muted"}>
            <Input id="tpl-close" type="date" className="h-10" value={draft.close} min={draft.open || undefined} onChange={(e) => patch({ close: e.target.value })} />
          </FormField>
          <FormField label="Farmers per DA" htmlFor="tpl-target" required hint="At least 1.">
            <Input id="tpl-target" type="number" min={1} className="h-10" value={draft.targetFarmers || ""} onChange={(e) => patch({ targetFarmers: Number(e.target.value) })} />
          </FormField>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Woreda" htmlFor="tpl-woreda" required={woredaRequired} hint={editing ? "Can't be changed after publishing." : !woredaRequired ? "Your assigned Woreda." : undefined}>
            {editing || !woredaRequired ? (
              <Input id="tpl-woreda" className="h-10" value={draft.woreda || "Your assigned Woreda"} disabled readOnly />
            ) : (
              <Select id="tpl-woreda" className="h-10" value={draft.woreda} onChange={(e) => patch({ woreda: e.target.value, assignedDaIds: [] })}>
                <option value="">{woredas ? (woredas.length ? "Select Woreda…" : "No Woreda available") : "Loading…"}</option>
                {woredas?.map((w) => <option key={w.code} value={w.code}>{w.name_en} ({w.code})</option>)}
              </Select>
            )}
          </FormField>
          <FormField label="Assign to" htmlFor="tpl-mode" required>
            <Select id="tpl-mode" className="h-10" value={draft.assignmentMode} onChange={(e) => patch({ assignmentMode: e.target.value as TemplateInput["assignmentMode"] })}>
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
            const withOptions = QUESTION_TYPES.find((qt) => qt.value === q.type)?.hasOptions;
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
                <FormField label="Question (English)" htmlFor={`tpl-q-${q.id}`} required>
                  <Input id={`tpl-q-${q.id}`} className="h-10 bg-white" value={q.prompt} onChange={(e) => patchQuestion(q.id, { prompt: e.target.value })} placeholder="What should the DA ask the farmer?" />
                </FormField>
                {translationLanguages.length > 0 && (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {translationLanguages.map((lang) => (
                      <FormField key={lang} label={`Question (${lang})`} htmlFor={`tpl-q-${q.id}-${lang}`} hint="Optional · DAs see English when empty">
                        <Input
                          id={`tpl-q-${q.id}-${lang}`}
                          className="h-10 bg-white"
                          value={q.translations[lang] ?? ""}
                          onChange={(e) => patchQuestion(q.id, { translations: { ...q.translations, [lang]: e.target.value } })}
                        />
                      </FormField>
                    ))}
                  </div>
                )}
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_1fr]">
                  <FormField label="Answer type" htmlFor={`tpl-qt-${q.id}`}>
                    <Select id={`tpl-qt-${q.id}`} className="h-10 bg-white" value={q.type} onChange={(e) => patchQuestion(q.id, { type: e.target.value as TemplateQuestion["type"] })}>
                      {QUESTION_TYPES.map((qt) => <option key={qt.value} value={qt.value}>{qt.label}</option>)}
                    </Select>
                  </FormField>
                  {withOptions && (
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
