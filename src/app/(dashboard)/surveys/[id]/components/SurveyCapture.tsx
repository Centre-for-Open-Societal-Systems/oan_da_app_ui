"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Textarea } from "@/components/ui/Textarea";
import { Checkbox } from "@/components/ui/Checkbox";
import { EmptyState } from "@/components/ui/EmptyState";
import { BackLink } from "@/components/ui/BackLink";
import { cn, todayIso } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import { describeFarmerError, listFarmers, type ApiFarmer } from "@/features/farmers";
import { listAgents, type ApiAgent } from "@/features/agents";
import {
  RESPONSE_TONE,
  SURVEY_STATUS_TONE,
  describeSurveyError,
  getSurvey,
  newOpId,
  promptIn,
  submitSurveyResponse,
  type Parameter,
  type ResponseStatus,
  type SurveyAnswers,
  type SurveyTask,
} from "@/features/surveys";

type CaptureStatus = "Submitting" | ResponseStatus | null;

// FR-09d response capture: farmer from the DA's Kebele → consent → the questions one at a time (Previous / Next, or jump
// to any question by its number) → POST /surveys/{id}/responses.
// Submitted responses are final; there is no draft. One completed response per farmer per survey, across all DAs.
export function SurveyCapture({ id }: { id: string }) {
  const role = useAuthStore((s) => s.role);
  const isDA = role === "DA";
  const [task, setTask] = useState<SurveyTask | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [farmers, setFarmers] = useState<ApiFarmer[] | null>(null);
  const [farmersError, setFarmersError] = useState<string | null>(null);
  const [agents, setAgents] = useState<ApiAgent[] | null>(null);
  const [daId, setDaId] = useState("");

  const [farmerId, setFarmerId] = useState("");
  const [language, setLanguage] = useState("English");
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [status, setStatus] = useState<CaptureStatus>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  /** Set by a submit attempt that left a required question empty; marks those questions. */
  const [showErrors, setShowErrors] = useState(false);
  const [step, setStep] = useState(0);
  /** Kept across retries of the same response so the server can return the row already stored. */
  const opId = useRef<string | null>(null);

  const refresh = useCallback(
    () =>
      getSurvey(id)
        .then(setTask)
        .catch((err: unknown) => setLoadError(describeSurveyError(err))),
    [id],
  );
  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    let current = true;
    listFarmers({ pageSize: 500 })
      .then(({ items }) => current && setFarmers(items))
      .catch((err: unknown) => current && setFarmersError(describeFarmerError(err)));
    return () => {
      current = false;
    };
  }, []);

  // A Supervisor / Admin collects on behalf of a DA of the survey's Woreda.
  useEffect(() => {
    if (isDA || !task) return;
    let current = true;
    listAgents({ woreda: task.woreda ?? undefined, limit: 500 })
      .then(({ agents: rows }) => current && setAgents(task.assignmentMode === "Selected" && task.assignedDaIds?.length ? rows.filter((a) => task.assignedDaIds!.includes(a.da_id)) : rows))
      .catch(() => current && setAgents([]));
    return () => {
      current = false;
    };
  }, [isDA, task]);

  const answered = useMemo(() => new Set(task?.answered ?? []), [task]);
  // Capture needs a Kebele, so farmers without one are not offered.
  const capturable = useMemo(() => (farmers ?? []).filter((f) => f.kebele), [farmers]);
  const farmer = capturable.find((f) => f.farmer_id === farmerId);
  const isAnsweredFarmer = (f: ApiFarmer) => answered.has(f.farmer_id) || (f.reg_id ? answered.has(f.reg_id) : false);
  const duplicate = Boolean(farmer && isAnsweredFarmer(farmer));

  const parameters = useMemo(() => task?.parameters ?? [], [task]);
  const visibleParams = useMemo(() => parameters.filter((p) => !p.condition || answers[p.condition.parameterId] === p.condition.equals), [parameters, answers]);

  if (loadError) {
    return (
      <div className="flex w-full flex-col gap-4">
        <BackLink href="/surveys" label="Back to Surveys" />
        <Card className="shadow-card"><EmptyState tone="error" title="Couldn't open this survey" hint={loadError} actionLabel="Retry" onAction={() => { setLoadError(null); refresh(); }} /></Card>
      </div>
    );
  }
  if (!task) {
    return (
      <div className="flex w-full flex-col gap-4">
        <BackLink href="/surveys" label="Back to Surveys" />
        <Card className="shadow-card"><p className="py-10 text-center text-[14px] text-ink-soft">Loading survey…</p></Card>
      </div>
    );
  }

  const today = todayIso();
  const notOpenYet = today < task.window_open;
  const closed = task.status === "Closed";
  const readOnly = closed || notOpenYet;
  const submitting = status === "Submitting";
  const done = status === "Synced" || status === "Queued";
  const needsCollector = !isDA && !daId;

  // p2 / p3 are pre-filled from the picked farmer; the server overwrites them with the resolved farmer's values.
  const prefillFor = (p: Parameter) => (p.prefill === "Farmer Registry" ? farmer?.reg_id ?? farmer?.farmer_id ?? "" : p.prefill === "DA assignment" ? farmer?.kebele ?? "" : "");
  const valueOf = (p: Parameter) => (p.type === "auto" ? prefillFor(p) : answers[p.id]);
  const isAnswered = (p: Parameter) => {
    const v = valueOf(p);
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  };
  const set = (pid: string, v: string | string[]) => setAnswers((a) => ({ ...a, [pid]: v }));

  const resetCapture = () => {
    setAnswers({});
    setStep(0);
    setSubmitError(null);
    setShowErrors(false);
    opId.current = null;
  };

  const consentParam = parameters.find((p) => p.type === "consent");
  const consent = consentParam ? answers[consentParam.id] : undefined;
  const declined = consent === "declined";
  // A declined consent ends the response: only the consent question stays on the form.
  // Farmer ID and Kebele are filled in from the picked farmer (shown beside the farmer picker), so they are not steps.
  const shown = declined && consentParam ? [consentParam] : visibleParams.filter((p) => p.type !== "auto");
  // The questions the Supervisor wrote: what the DA counts as "the questions" of the survey.
  const questions = shown.filter((p) => p.type !== "consent");
  const questionNo = (p: Parameter) => questions.indexOf(p) + 1;
  const missing = shown.filter((p) => p.required && !isAnswered(p));
  const answeredCount = questions.filter(isAnswered).length;
  // The question on screen; the index is clamped because declining consent shortens the list.
  const index = Math.min(step, Math.max(0, shown.length - 1));
  const current = shown[index];
  const isLast = index === shown.length - 1;
  // The form opens as soon as a farmer who can still be surveyed is picked.
  const canCapture = Boolean(farmer) && !duplicate && !readOnly && !needsCollector && Boolean(consentParam);

  const submit = async (given: "granted" | "declined") => {
    if (!farmer) return;
    setStatus("Submitting");
    setSubmitError(null);
    opId.current ??= newOpId("rsp");
    const body: SurveyAnswers = {};
    if (given === "granted") {
      for (const p of visibleParams) {
        if (p.type === "consent") continue;
        const v = valueOf(p);
        if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) continue;
        body[p.id] = v;
      }
    }
    try {
      const state: ResponseStatus = given === "declined" ? "Declined" : "Synced";
      await submitSurveyResponse(task.id, {
        farmer_id: farmer.farmer_id,
        consent: given,
        answers: body,
        ...(farmer.kebele ? { kebele: farmer.kebele } : {}),
        sync_state: state,
        client_op_id: opId.current,
        ...(!isDA && daId ? { da_id: daId } : {}),
      });
      setStatus(state);
      refresh();
    } catch (err) {
      setSubmitError(describeSurveyError(err));
      setStatus(null);
    }
  };

  const onSubmit = () => {
    if (declined) {
      submit("declined");
      return;
    }
    if (missing.length > 0) {
      // Go to the first question still waiting for an answer.
      setShowErrors(true);
      setStep(shown.indexOf(missing[0]));
      return;
    }
    submit("granted");
  };

  const progress = questions.length ? Math.round((answeredCount / questions.length) * 100) : 0;
  const questionTotal = parameters.filter((p) => p.type !== "consent" && p.type !== "auto").length;

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink href="/surveys" label="Back to Surveys" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Task context */}
        <Card className="self-start shadow-card">
          <h1 className="text-[18px] font-semibold leading-tight text-ink">{task.name}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Pill tone="blue">Template {task.templateVersion}</Pill>
            <Pill tone="slate">{task.type}</Pill>
            <Pill tone="green">~{task.estMinutes} min</Pill>
            <Pill tone={SURVEY_STATUS_TONE[task.status]} dot>{task.status}</Pill>
          </div>
          <dl className="mt-4 space-y-2 text-[13px]">
            <div><dt className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">Window</dt><dd className="text-ink">{task.window.open} → {task.window.close}</dd></div>
            <div><dt className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">Languages</dt><dd className="text-ink">{task.languages.join(" · ")}</dd></div>
            <div><dt className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">Progress</dt><dd className="text-ink">{farmers ? `${task.collected} of ${capturable.length} farmers` : `${task.collected} collected`}{task.queued > 0 ? ` · ${task.queued} queued` : ""}</dd></div>
          </dl>

          {readOnly && (
            <Banner tone="info" className="mt-4">{closed ? "This survey window is closed. No new responses can be submitted." : `This survey opens on ${task.window.open}.`}</Banner>
          )}

          {!isDA && (
            <div className="mt-5">
              <label htmlFor="collector" className="text-[14px] font-medium text-ink">Collecting for DA</label>
              <Select id="collector" value={daId} disabled={submitting} onChange={(e) => setDaId(e.target.value)} className="mt-1.5">
                <option value="">{agents ? (agents.length ? "Select DA…" : "No DA found") : "Loading DAs…"}</option>
                {agents?.map((a) => <option key={a.da_id} value={a.da_id}>{a.full_name} — {a.da_id}</option>)}
              </Select>
            </div>
          )}

          <div className="mt-5">
            <label htmlFor="farmer" className="text-[14px] font-medium text-ink">Farmer</label>
            <Select id="farmer" value={farmerId} disabled={submitting || readOnly} onChange={(e) => { setFarmerId(e.target.value); setStatus(null); resetCapture(); }} className="mt-1.5">
              <option value="">{farmers ? (capturable.length === 0 ? "No farmer in your Kebele" : "Select farmer…") : "Loading farmers…"}</option>
              {capturable.map((f) => (
                <option key={f.farmer_id} value={f.farmer_id}>
                  {f.farmer_name}{f.reg_id ? ` (${f.reg_id})` : ""} — {f.kebele}{isAnsweredFarmer(f) ? " · answered" : ""}
                </option>
              ))}
            </Select>
            {farmersError && <p className="mt-1.5 text-[12.5px] font-medium text-danger">{farmersError}</p>}
            {duplicate && !done && <p className="mt-1.5 text-[12.5px] font-medium text-danger">A response for this farmer already exists for this survey — one response per farmer.</p>}
          </div>

          {farmer && (
            <dl className="mt-3 space-y-1.5 rounded-lg border border-line bg-surface px-3 py-2.5 text-[13px]">
              <div className="flex justify-between gap-3"><dt className="text-ink-soft">Farmer ID</dt><dd className="font-medium text-ink">{farmer.reg_id ?? farmer.farmer_id}</dd></div>
              <div className="flex justify-between gap-3"><dt className="text-ink-soft">Kebele</dt><dd className="font-medium text-ink">{farmer.kebele}</dd></div>
            </dl>
          )}

          {task.languages.length > 1 && (
            <div className="mt-4">
              <label htmlFor="lang" className="text-[14px] font-medium text-ink">Question language</label>
              <Select id="lang" value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1.5">
                {task.languages.map((l) => <option key={l}>{l}</option>)}
              </Select>
            </div>
          )}

          {status && !submitting && (
            <div className="mt-4 flex items-center gap-2 text-[13px]"><span className="text-muted">Response status</span><Pill tone={RESPONSE_TONE[status]} dot>{status}</Pill></div>
          )}
        </Card>

        {/* Capture: every question of the survey on one form */}
        <Card className="overflow-hidden p-0 shadow-card">
          {done ? (
            <div className="p-5">
              <Banner tone={status === "Synced" ? "success" : "warning"} title={status === "Synced" ? "Response submitted" : "Response queued"}>
                {`Response for ${farmer?.farmer_name ?? "the farmer"} is stored and counted toward ${task.name}. A second response for this farmer is blocked.`}
              </Banner>
              <Button type="button" variant="brandOutline" onClick={() => { setFarmerId(""); setStatus(null); resetCapture(); }} className="mt-4">Next farmer</Button>
            </div>
          ) : status === "Declined" ? (
            <div className="p-5">
              <Banner tone="info" title="Consent declined — response ended">Only the declined consent is recorded. The farmer is not counted as a respondent and can be asked again later.</Banner>
              <Button type="button" variant="outline" onClick={() => { setStatus(null); resetCapture(); }} className="mt-4">Back</Button>
            </div>
          ) : !canCapture ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-[15px] font-semibold text-ink">
                {readOnly ? "Capture is not available" : duplicate ? "This farmer has already answered" : farmer && needsCollector ? "Select the DA you are collecting for" : "Select a farmer to begin"}
              </p>
              <p className="max-w-md text-[13.5px] text-ink-soft">{questionTotal} question{questionTotal === 1 ? "" : "s"} · consent is taken first.</p>
            </div>
          ) : (
            <form className="flex flex-col" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} noValidate>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-3.5">
                <div>
                  <h2 className="text-[16px] font-semibold text-ink">Response for {farmer!.farmer_name}</h2>
                  <p className="text-[12.5px] text-ink-soft">Use Previous / Next or the question numbers. Questions marked <span className="text-danger">*</span> must be answered.</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-[13px] font-medium text-ink-soft">{answeredCount} of {questionTotal} answered</span>
                  <div className="h-1.5 w-32 rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-brand-green transition-all" style={{ width: `${progress}%` }} /></div>
                </div>
              </div>

              {submitError && <div className="px-5 pt-4"><Banner tone="error" title="Couldn't submit the response" onDismiss={() => setSubmitError(null)}>{submitError}</Banner></div>}
              {showErrors && missing.length > 0 && (
                <div className="px-5 pt-4"><Banner tone="error" title="Some questions still need an answer">{missing.length} required question{missing.length === 1 ? " is" : "s are"} not answered yet. Their numbers are marked in red.</Banner></div>
              )}

              <nav aria-label="Questions" className="flex flex-wrap gap-2 border-b border-line-soft px-5 py-3">
                {shown.map((p, n) => {
                  const answered = isAnswered(p);
                  const flagged = showErrors && p.required && !answered;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => setStep(n)}
                      aria-current={n === index ? "step" : undefined}
                      aria-label={`${p.type === "consent" ? "Consent" : `Question ${questionNo(p)}`}${answered ? ", answered" : flagged ? ", needs an answer" : ""}`}
                      className={cn(
                        "flex h-8 min-w-8 items-center justify-center rounded-full border px-3 text-[13px] font-semibold transition-colors",
                        n === index ? "border-brand-green bg-brand-green text-white" : flagged ? "border-danger bg-white text-danger" : answered ? "border-brand-border bg-brand-mint text-brand-green" : "border-line bg-white text-ink-soft hover:border-brand-green",
                      )}
                    >
                      {p.type === "consent" ? "Consent" : questionNo(p)}
                    </button>
                  );
                })}
              </nav>

              {current && (
                <div className="flex min-h-[220px] flex-col gap-4 px-5 py-5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-[13px] font-medium text-ink-soft">{current.type === "consent" ? "Consent" : `Question ${questionNo(current)} of ${questionTotal}`}</span>
                    <Pill tone="slate">{current.type}</Pill>
                  </div>
                  <p className="text-[17px] font-semibold leading-snug text-ink">{current.type !== "consent" && <span className="mr-1.5 text-brand-green">Question {questionNo(current)}:</span>}{promptIn(current, language)}{current.required && <span className="ml-1 text-danger">*</span>}</p>
                  {current.helper && <p className="-mt-2 text-[13px] text-muted">{current.helper}</p>}
                  <QuestionInput param={current} value={valueOf(current)} onChange={(v) => set(current.id, v)} />
                  {showErrors && current.required && !isAnswered(current) && <p className="text-[12.5px] font-medium text-danger">This question needs an answer.</p>}
                </div>
              )}

              {declined && <p className="px-5 pb-4 text-[13px] text-ink-soft">The farmer declined, so the other questions are not asked. Ending records only the declined consent.</p>}

              <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line bg-surface px-5 py-3">
                <Button type="button" variant="outline" disabled={submitting || index === 0} onClick={() => setStep(index - 1)}>Previous</Button>
                {isLast ? (
                  <Button type="submit" variant="brand" disabled={submitting || !consent}>
                    {submitting ? "Submitting…" : declined ? "End response" : "Submit response"}
                  </Button>
                ) : (
                  // Navigation only: answers are checked when the response is submitted.
                  <Button type="button" variant="brand" disabled={submitting} onClick={() => setStep(index + 1)}>Next</Button>
                )}
              </div>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

function QuestionInput({ param, value, onChange }: { param: Parameter; value: string | string[] | undefined; onChange: (v: string | string[]) => void }) {
  const str = typeof value === "string" ? value : "";
  const arr = Array.isArray(value) ? value : [];
  const option = (label: string, selected: boolean, onClick: () => void) => (
    <button key={label} type="button" onClick={onClick} className={cn("flex items-center gap-3 rounded-lg border px-4 py-3 text-left text-[14px] transition-all", selected ? "border-brand-green bg-brand-wash text-brand-green" : "border-line bg-white text-ink hover:border-brand-green/30 hover:shadow-sm")}>
      {label}
    </button>
  );

  switch (param.type) {
    case "consent":
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {option("Farmer consents — continue", str === "granted", () => onChange("granted"))}
          {option("Farmer declines — end response", str === "declined", () => onChange("declined"))}
        </div>
      );
    case "auto":
      return <input readOnly value={str} className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 font-mono text-sm text-ink-soft" aria-label={`${param.prompt} (pre-filled from ${param.prefill})`} />;
    case "lookup":
    case "single":
      return <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">{param.options?.map((o) => option(o, str === o, () => onChange(o)))}</div>;
    case "multi":
      return (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {param.options?.map((o) => (
            <label key={o} className={cn("flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 text-[14px]", arr.includes(o) ? "border-brand-green bg-brand-wash" : "border-line bg-white")}>
              <Checkbox checked={arr.includes(o)} onChange={() => onChange(arr.includes(o) ? arr.filter((x) => x !== o) : [...arr, o])} /> {o}
            </label>
          ))}
        </div>
      );
    case "rating":
      return (
        <div className="flex gap-2">
          {[1, 2, 3, 4, 5].map((n) => (
            <button key={n} type="button" onClick={() => onChange(String(n))} aria-label={`${n} of 5`} className={cn("flex h-12 w-12 items-center justify-center rounded-lg border text-[16px] font-semibold transition-colors", str === String(n) ? "border-brand-green bg-brand-green text-white" : "border-line bg-white text-ink hover:border-brand-green")}>{n}</button>
          ))}
        </div>
      );
    case "text":
      return <Textarea rows={4} maxLength={500} value={str} onChange={(e) => onChange(e.target.value)} />;
  }
}
