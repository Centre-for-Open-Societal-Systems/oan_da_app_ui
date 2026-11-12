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
import { ApiError } from "@/lib/api";
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

type CaptureStatus = "In progress" | "Submitting" | ResponseStatus | null;

// FR-09d response capture: farmer from the DA's Kebele → consent → question by question → POST /surveys/{id}/responses.
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
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<SurveyAnswers>({});
  const [status, setStatus] = useState<CaptureStatus>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
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
  const current = visibleParams[step];
  const started = status === "In progress" || status === "Submitting";

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

  // p2 / p3 are pre-filled from the picked farmer; the server overwrites them with the resolved farmer's values.
  const prefillFor = (p: Parameter) => (p.prefill === "Farmer Registry" ? farmer?.reg_id ?? farmer?.farmer_id ?? "" : p.prefill === "DA assignment" ? farmer?.kebele ?? "" : "");
  const valueOf = (p: Parameter) => (p.type === "auto" ? prefillFor(p) : answers[p.id]);
  const isAnswered = (p: Parameter) => {
    const v = valueOf(p);
    return Array.isArray(v) ? v.length > 0 : Boolean(v);
  };
  const canContinue = current ? !current.required || isAnswered(current) : false;
  const set = (pid: string, v: string | string[]) => setAnswers((a) => ({ ...a, [pid]: v }));

  const resetCapture = () => {
    setAnswers({});
    setStep(0);
    setSubmitError(null);
    opId.current = null;
  };

  const start = () => {
    resetCapture();
    setStatus("In progress");
  };

  const consentParam = parameters.find((p) => p.type === "consent");

  const submit = async (consent: "granted" | "declined") => {
    if (!farmer) return;
    setStatus("Submitting");
    setSubmitError(null);
    opId.current ??= newOpId("rsp");
    const body: SurveyAnswers = {};
    if (consent === "granted") {
      for (const p of visibleParams) {
        if (p.type === "consent") continue;
        const v = valueOf(p);
        if (v === undefined || v === "" || (Array.isArray(v) && v.length === 0)) continue;
        body[p.id] = v;
      }
    }
    try {
      const saved = await submitSurveyResponse(task.id, {
        farmer_id: farmer.farmer_id,
        consent,
        answers: body,
        sync_state: "Synced",
        client_op_id: opId.current,
        ...(!isDA && daId ? { da_id: daId } : {}),
      });
      setStatus((saved.sync_state as ResponseStatus) ?? (consent === "declined" ? "Declined" : "Synced"));
      refresh();
    } catch (err) {
      // A duplicate is final for this farmer: refresh answered[] instead of retrying.
      if (err instanceof ApiError && err.status === 409) {
        refresh();
        opId.current = null;
      }
      setSubmitError(describeSurveyError(err, "submit"));
      setStatus("In progress");
    }
  };

  const next = () => {
    if (!current) return;
    // A declined consent ends the response; it is still recorded (as Declined) and the farmer can be asked again.
    if (current.type === "consent" && answers[current.id] === "declined") {
      submit("declined");
      return;
    }
    if (step < visibleParams.length - 1) setStep(step + 1);
    else submit("granted");
  };

  const progress = started && visibleParams.length ? Math.round(((step + 1) / visibleParams.length) * 100) : 0;
  const done = status === "Synced" || status === "Queued";
  const needsCollector = !isDA && !daId;

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink href="/surveys" label="Back to Surveys" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[320px_1fr]">
        {/* Task context */}
        <Card className="shadow-card">
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
            <div><dt className="text-[11.5px] font-semibold uppercase tracking-wider text-muted">Progress</dt><dd className="text-ink">{task.collected} of {task.targetFarmers} farmers{task.queued > 0 ? ` · ${task.queued} queued` : ""}</dd></div>
          </dl>

          {readOnly && (
            <Banner tone="info" className="mt-4">{closed ? "This survey window is closed. No new responses can be submitted." : `This survey opens on ${task.window.open}.`}</Banner>
          )}

          {!isDA && (
            <div className="mt-5">
              <label htmlFor="collector" className="text-[14px] font-medium text-ink">Collecting for DA</label>
              <Select id="collector" value={daId} disabled={started} onChange={(e) => setDaId(e.target.value)} className="mt-1.5">
                <option value="">{agents ? (agents.length ? "Select DA…" : "No DA found") : "Loading DAs…"}</option>
                {agents?.map((a) => <option key={a.da_id} value={a.da_id}>{a.full_name} — {a.da_id}</option>)}
              </Select>
            </div>
          )}

          <div className="mt-5">
            <label htmlFor="farmer" className="text-[14px] font-medium text-ink">Farmer</label>
            <Select id="farmer" value={farmerId} disabled={started || readOnly} onChange={(e) => { setFarmerId(e.target.value); setStatus(null); resetCapture(); }} className="mt-1.5">
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

          {task.languages.length > 1 && (
            <div className="mt-4">
              <label htmlFor="lang" className="text-[14px] font-medium text-ink">Question language</label>
              <Select id="lang" value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1.5">
                {task.languages.map((l) => <option key={l}>{l}</option>)}
              </Select>
            </div>
          )}

          {!started && !done && (
            <Button type="button" variant="brand" disabled={!farmer || duplicate || readOnly || needsCollector || !consentParam} onClick={start} className="mt-4 w-full">
              Start response
            </Button>
          )}
          {status && status !== "In progress" && status !== "Submitting" && (
            <div className="mt-4 flex items-center gap-2 text-[13px]"><span className="text-muted">Response status</span><Pill tone={RESPONSE_TONE[status]} dot>{status}</Pill></div>
          )}
        </Card>

        {/* Capture */}
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
          ) : !started || !current ? (
            <div className="flex min-h-[320px] flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-[15px] font-semibold text-ink">{readOnly ? "Capture is not available" : "Select a farmer to begin"}</p>
              <p className="max-w-md text-[13.5px] text-ink-soft">{parameters.length} questions · consent first, Farmer ID and Kebele pre-filled from the farmer record.</p>
            </div>
          ) : (
            <div className="flex flex-col">
              <div className="flex items-center justify-between border-b border-line px-5 py-3.5">
                <span className="text-[13px] font-medium text-ink-soft">Question {step + 1} of {visibleParams.length}</span>
                <div className="flex items-center gap-3">
                  <div className="h-1.5 w-32 rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-brand-green transition-all" style={{ width: `${progress}%` }} /></div>
                  <Pill tone="slate">{current.type}</Pill>
                </div>
              </div>
              <div className="flex flex-col gap-4 p-5">
                {submitError && <Banner tone="error" title="Couldn't submit the response" onDismiss={() => setSubmitError(null)}>{submitError}</Banner>}
                <p className="text-[17px] font-semibold leading-snug text-ink">{promptIn(current, language)}{current.required && <span className="ml-1 text-danger">*</span>}</p>
                {current.helper && <p className="-mt-2 text-[13px] text-muted">{current.helper}</p>}
                <QuestionInput param={current} value={valueOf(current)} onChange={(v) => set(current.id, v)} />
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-line bg-surface px-5 py-3">
                <button type="button" disabled={step === 0 || status === "Submitting"} onClick={() => setStep(step - 1)} className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-md border border-zinc-200 bg-white px-3.5 text-[13.5px] font-medium text-ink transition-colors hover:bg-zinc-50 disabled:opacity-50">Back</button>
                <button type="button" disabled={!canContinue || status === "Submitting"} onClick={next} className="inline-flex h-9 shrink-0 items-center whitespace-nowrap rounded-md bg-brand-green px-3.5 text-[13.5px] font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-50">
                  {status === "Submitting" ? "Submitting…" : current.type === "consent" && answers[current.id] === "declined" ? "End response" : step === visibleParams.length - 1 ? "Submit response" : "Save & continue"}
                </button>
              </div>
            </div>
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
