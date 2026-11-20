"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
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

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[340px_1fr]">
        {/* Task context */}
        <Card className="self-start shadow-card p-4 sm:p-5 lg:sticky lg:top-4">
          {/* Header with status dot, title, and Open status pill */}
          <div>
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className={cn(
                    "h-2.5 w-2.5 rounded-full shrink-0",
                    task.status === "Open" ? "bg-emerald-500" : task.status === "Closing soon" ? "bg-amber-500" : "bg-slate-400",
                  )}
                />
                <h1 className="text-[18px] sm:text-[19px] font-bold leading-tight text-ink truncate">{task.name}</h1>
              </div>
              <span
                className={cn(
                  "rounded-full px-3 py-0.5 text-[12px] font-medium shrink-0",
                  task.status === "Open"
                    ? "border border-emerald-200 bg-emerald-50 text-emerald-700"
                    : task.status === "Closing soon"
                      ? "border border-amber-200 bg-amber-50 text-amber-700"
                      : "border border-slate-200 bg-slate-50 text-slate-600",
                )}
              >
                {task.status}
              </span>
            </div>
            <p className="mt-1 text-[13px] text-ink-soft leading-relaxed">
              Review survey info and select a farmer to begin collection
            </p>
          </div>

          <div className="my-3.5 border-t border-line-soft" />

          {/* Tags row */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full border border-blue-200 bg-blue-50/70 px-3 py-1 text-[12px] font-medium text-blue-700">
              Template {task.templateVersion}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[12px] font-medium text-slate-700">
              {task.type}
            </span>
            {task.estMinutes && (
              <span className="rounded-full border border-emerald-200 bg-emerald-50/70 px-3 py-1 text-[12px] font-medium text-emerald-700">
                ~{task.estMinutes} min
              </span>
            )}
          </div>

          {/* Info Box with 3 rows & icons (Window, Languages, Progress) */}
          <div className="mt-4 rounded-xl border border-slate-200/80 bg-white p-3.5 sm:p-4 space-y-3">
            {/* Window */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0 text-blue-500">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Window</p>
                <p className="text-[13.5px] font-semibold text-ink">{task.window.open} → {task.window.close}</p>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Languages */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0 text-emerald-600">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="2" y1="12" x2="22" y2="12" />
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Languages</p>
                <p className="text-[13.5px] font-semibold text-ink">{task.languages.join(" · ")}</p>
              </div>
            </div>

            <div className="border-t border-slate-100" />

            {/* Progress */}
            <div className="flex items-start gap-3">
              <div className="mt-0.5 shrink-0 text-amber-500">
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <line x1="6" y1="20" x2="6" y2="14" />
                  <line x1="12" y1="20" x2="12" y2="4" />
                  <line x1="18" y1="20" x2="18" y2="10" />
                </svg>
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-muted">Progress</p>
                <p className="text-[13.5px] font-semibold text-ink">
                  {farmers ? `${task.collected} of ${capturable.length} farmers` : `${task.collected} collected`}
                  {task.queued > 0 ? ` · ${task.queued} queued on device` : ""}
                </p>
              </div>
            </div>
          </div>

          {readOnly && (
            <Banner tone="info" className="mt-4">{closed ? "This survey window is closed. No new responses can be submitted." : `This survey opens on ${task.window.open}.`}</Banner>
          )}

          {!isDA && (
            <div className="mt-4">
              <label htmlFor="collector" className="text-[13.5px] sm:text-[14px] font-semibold text-ink">Collecting for DA</label>
              <Select id="collector" value={daId} disabled={submitting} onChange={(e) => setDaId(e.target.value)} className="mt-1.5 w-full">
                <option value="">{agents ? (agents.length ? "Select DA…" : "No DA found") : "Loading DAs…"}</option>
                {agents?.map((a) => <option key={a.da_id} value={a.da_id}>{a.full_name} — {a.da_id}</option>)}
              </Select>
            </div>
          )}

          <div className="mt-4">
            <label htmlFor="farmer" className="text-[14px] font-semibold text-ink">Farmer</label>
            <Select id="farmer" value={farmerId} disabled={submitting || readOnly} onChange={(e) => { setFarmerId(e.target.value); setStatus(null); resetCapture(); }} className="mt-1.5 w-full">
              <option value="">{farmers ? (capturable.length === 0 ? "No farmer in your Kebele" : "Select farmer....") : "Loading farmers…"}</option>
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
            <dl className="mt-3 space-y-1.5 rounded-lg border border-line bg-surface p-3 text-[13px]">
              <div className="flex justify-between items-center gap-3"><dt className="text-ink-soft">Farmer ID</dt><dd className="font-mono text-[12px] font-medium text-ink">{farmer.reg_id ?? farmer.farmer_id}</dd></div>
              <div className="flex justify-between items-center gap-3"><dt className="text-ink-soft">Kebele</dt><dd className="font-medium text-ink">{farmer.kebele}</dd></div>
            </dl>
          )}

          {task.languages.length > 1 && (
            <div className="mt-4">
              <label htmlFor="lang" className="text-[13.5px] sm:text-[14px] font-semibold text-ink">Question language</label>
              <Select id="lang" value={language} onChange={(e) => setLanguage(e.target.value)} className="mt-1.5 w-full">
                {task.languages.map((l) => <option key={l}>{l}</option>)}
              </Select>
            </div>
          )}

          {status && !submitting && (
            <div className="mt-4 flex items-center justify-between rounded-lg border border-line bg-surface px-3 py-2 text-[13px]">
              <span className="font-medium text-muted">Response status</span>
              <Pill tone={RESPONSE_TONE[status]} dot>{status}</Pill>
            </div>
          )}
        </Card>

        {/* Capture: every question of the survey on one form */}
        <Card className="overflow-hidden p-0 shadow-card flex flex-col h-full min-h-[520px]">
          {done ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10 text-center min-h-[480px]">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-brand-mint text-brand-green mb-4 shadow-sm">
                <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <path d="M20 6L9 17l-5-5" />
                </svg>
              </div>
              <h2 className="text-[20px] sm:text-[22px] font-bold text-ink">
                {status === "Synced" ? "Response submitted successfully" : "Response queued for sync"}
              </h2>
              <p className="mt-1.5 max-w-md text-[13.5px] sm:text-[14px] text-ink-soft leading-relaxed">
                Response for <strong className="font-semibold text-ink">{farmer?.farmer_name ?? "the farmer"}</strong> is stored and counted toward <strong className="font-semibold text-ink">{task.name}</strong>. A second response for this farmer is blocked.
              </p>

              {/* Summary metadata card */}
              <div className="mt-6 w-full max-w-md rounded-xl border border-line bg-surface p-4 text-left text-[13px] shadow-xs space-y-2.5">
                <div className="flex justify-between items-center text-ink-soft">
                  <span>Farmer</span>
                  <span className="font-medium text-ink">{farmer?.farmer_name}</span>
                </div>
                <div className="flex justify-between items-center text-ink-soft">
                  <span>Farmer ID</span>
                  <span className="font-mono text-ink text-[12px]">{farmer?.reg_id ?? farmer?.farmer_id}</span>
                </div>
                <div className="flex justify-between items-center text-ink-soft">
                  <span>Kebele</span>
                  <span className="font-medium text-ink">{farmer?.kebele}</span>
                </div>
                <div className="flex justify-between items-center text-ink-soft pt-1.5 border-t border-line-soft">
                  <span>Status</span>
                  <Pill tone={RESPONSE_TONE[status]} dot>{status}</Pill>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row items-center gap-3 w-full max-w-md justify-center">
                <Button
                  type="button"
                  variant="brand"
                  onClick={() => { setFarmerId(""); setStatus(null); resetCapture(); }}
                  className="w-full sm:w-auto h-10 px-6 font-semibold"
                >
                  Next farmer
                </Button>
                <Link
                  href="/surveys"
                  className="inline-flex items-center justify-center h-10 px-5 text-[13.5px] font-medium text-ink-soft hover:text-ink transition-colors"
                >
                  Back to Surveys
                </Link>
              </div>
            </div>
          ) : status === "Declined" ? (
            <div className="flex flex-1 flex-col items-center justify-center p-6 sm:p-10 text-center min-h-[480px]">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600 mb-4 shadow-sm">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
                </svg>
              </div>
              <h2 className="text-[19px] sm:text-[20px] font-bold text-ink">Consent declined — response ended</h2>
              <p className="mt-1.5 max-w-md text-[13px] sm:text-[13.5px] text-ink-soft leading-relaxed">
                Only the declined consent is recorded. The farmer is not counted as a respondent and can be asked again later.
              </p>
              <Button type="button" variant="outline" onClick={() => { setStatus(null); resetCapture(); }} className="mt-6 h-10 px-6">
                Back to questions
              </Button>
            </div>
          ) : !canCapture ? (
            <div className="flex flex-1 min-h-[480px] flex-col items-center justify-center gap-2 p-8 text-center">
              <p className="text-[15px] font-semibold text-ink">
                {readOnly ? "Capture is not available" : duplicate ? "This farmer has already answered" : farmer && needsCollector ? "Select the DA you are collecting for" : "Select a farmer to begin"}
              </p>
              <p className="max-w-md text-[13.5px] text-ink-soft">{questionTotal} question{questionTotal === 1 ? "" : "s"} · consent is taken first.</p>
            </div>
          ) : (
            <form className="flex flex-1 flex-col h-full justify-between" onSubmit={(e) => { e.preventDefault(); onSubmit(); }} noValidate>
              <div className="flex flex-col">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-line px-4 py-3.5 sm:px-5">
                  <div>
                    <h2 className="text-[15px] sm:text-[16px] font-semibold text-ink">Response for {farmer!.farmer_name}</h2>
                    <p className="text-[12px] sm:text-[12.5px] text-ink-soft">Use Previous / Next or the question numbers. Questions marked <span className="text-danger">*</span> must be answered.</p>
                  </div>
                  <div className="flex flex-col items-start sm:items-end gap-1.5 shrink-0">
                    <span className="text-[12.5px] sm:text-[13px] font-medium text-ink-soft">{answeredCount} of {questionTotal} answered</span>
                    <div className="h-2 w-32 sm:w-36 rounded-full bg-slate-200 overflow-hidden">
                      <div className="h-full rounded-full bg-brand-green transition-all duration-300" style={{ width: `${progress}%` }} />
                    </div>
                  </div>
                </div>

                {submitError && <div className="px-4 pt-3.5 sm:px-5 sm:pt-4"><Banner tone="error" title="Couldn't submit the response" onDismiss={() => setSubmitError(null)}>{submitError}</Banner></div>}
                {showErrors && missing.length > 0 && (
                  <div className="px-4 pt-3.5 sm:px-5 sm:pt-4"><Banner tone="error" title="Some questions still need an answer">{missing.length} required question{missing.length === 1 ? " is" : "s are"} not answered yet. Their numbers are marked in red.</Banner></div>
                )}

                <nav aria-label="Questions" className="flex items-center gap-2 overflow-x-auto no-scrollbar border-b border-line-soft px-4 py-3 sm:px-5">
                  {shown.map((p, n) => {
                    const answered = isAnswered(p);
                    const flagged = showErrors && p.required && !answered;
                    const isCurrent = n === index;
                    return (
                      <button
                        key={p.id}
                        type="button"
                        onClick={() => setStep(n)}
                        aria-current={isCurrent ? "step" : undefined}
                        aria-label={`${p.type === "consent" ? "Consent" : `Question ${questionNo(p)}`}${answered ? ", answered" : flagged ? ", needs an answer" : ""}`}
                        className={cn(
                          "flex h-8 sm:h-8.5 min-w-8 shrink-0 items-center justify-center rounded-full border px-3 text-[12.5px] sm:text-[13px] font-semibold transition-all",
                          isCurrent
                            ? "border-brand-green bg-brand-green text-white shadow-xs"
                            : flagged
                              ? "border-danger bg-red-50 text-danger"
                              : answered
                                ? "border-brand-border bg-brand-mint text-brand-green font-medium"
                                : "border-line bg-white text-ink-soft hover:border-brand-green/60 hover:text-ink",
                        )}
                      >
                        {p.type === "consent" ? (
                          <span>Consent{answered && !isCurrent ? " ✓" : ""}</span>
                        ) : (
                          <span>{questionNo(p)}{answered && !isCurrent ? " ✓" : ""}</span>
                        )}
                      </button>
                    );
                  })}
                </nav>

                {current && (
                  <div className="flex flex-col gap-4 px-4 py-5 sm:px-6 sm:py-6">
                    <div className="flex items-start justify-between gap-3">
                      <span className="text-[12.5px] sm:text-[13px] font-medium text-ink-soft">
                        {current.type === "consent" ? "Consent" : `Question ${questionNo(current)} of ${questionTotal}`}
                      </span>
                      <Pill tone="slate">{current.type}</Pill>
                    </div>
                    <p className="text-[16px] sm:text-[17px] font-semibold leading-snug text-ink">
                      {current.type !== "consent" && <span className="mr-1.5 text-brand-green">Question {questionNo(current)}:</span>}
                      {promptIn(current, language)}
                      {current.required && <span className="ml-1 text-danger">*</span>}
                    </p>
                    {current.helper && <p className="-mt-2 text-[12.5px] sm:text-[13px] text-muted leading-relaxed">{current.helper}</p>}
                    <QuestionInput param={current} value={valueOf(current)} onChange={(v) => set(current.id, v)} />
                    {showErrors && current.required && !isAnswered(current) && (
                      <p className="text-[12.5px] font-medium text-danger">This question needs an answer.</p>
                    )}
                  </div>
                )}

                {declined && <p className="px-4 sm:px-6 pb-4 text-[13px] text-ink-soft">The farmer declined, so the other questions are not asked. Ending records only the declined consent.</p>}
              </div>

              {/* Pinned to bottom of the card */}
              <div className="mt-auto flex items-center justify-between gap-2.5 border-t border-line bg-surface px-4 py-3 sm:px-5 sm:py-3.5">
                <Button type="button" variant="outline" className="h-10 px-4 sm:px-5 font-semibold text-[13.5px]" disabled={submitting || index === 0} onClick={() => setStep(index - 1)}>
                  Previous
                </Button>
                {isLast ? (
                  <Button
                    type="submit"
                    variant={declined ? "outline" : "brand"}
                    className={cn("h-10 px-5 sm:px-6 font-semibold text-[13.5px]", declined && "border-amber-600 text-amber-700 hover:bg-amber-50")}
                    disabled={submitting || !consent}
                  >
                    {submitting ? "Submitting…" : declined ? "End response (Declined)" : "Submit response"}
                  </Button>
                ) : (
                  // Navigation: requires consent if on consent step
                  <Button
                    type="button"
                    variant="brand"
                    className="h-10 px-5 sm:px-6 font-semibold text-[13.5px]"
                    disabled={submitting || (current?.type === "consent" && !consent)}
                    onClick={() => setStep(index + 1)}
                  >
                    Next
                  </Button>
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

  const option = (label: string, selected: boolean, onClick: () => void, subtitle?: string) => (
    <button
      key={label}
      type="button"
      onClick={onClick}
      className={cn(
        "flex gap-3 rounded-xl border p-3.5 sm:p-4 text-left transition-all",
        subtitle ? "items-start" : "items-center",
        selected
          ? "border-brand-green bg-brand-wash text-brand-green shadow-xs ring-1 ring-brand-green/30"
          : "border-line bg-white text-ink hover:border-brand-green/40 hover:bg-slate-50/60 hover:shadow-xs",
      )}
    >
      <span
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border transition-colors",
          subtitle && "mt-0.5",
          selected ? "border-brand-green bg-brand-green" : "border-slate-300 bg-white",
        )}
      >
        {selected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] sm:text-[14px] font-medium leading-snug">{label}</p>
        {subtitle && <p className="mt-0.5 text-[12px] text-ink-soft leading-normal">{subtitle}</p>}
      </div>
    </button>
  );

  switch (param.type) {
    case "consent":
      return (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {option(
            "Farmer consents — continue",
            str === "granted",
            () => onChange("granted"),
            "Consent granted to take part in this survey",
          )}
          {option(
            "Farmer declines — end response",
            str === "declined",
            () => onChange("declined"),
            "Declined consent ends the response immediately",
          )}
        </div>
      );
    case "auto":
      return (
        <input
          readOnly
          value={str}
          className="h-11 w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 font-mono text-sm text-ink-soft"
          aria-label={`${param.prompt} (pre-filled from ${param.prefill})`}
        />
      );
    case "lookup":
    case "single":
      return (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {param.options?.map((o) => option(o, str === o, () => onChange(o)))}
        </div>
      );
    case "multi":
      return (
        <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          {param.options?.map((o) => {
            const checked = arr.includes(o);
            return (
              <label
                key={o}
                className={cn(
                  "flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 sm:p-4 text-left transition-all",
                  checked
                    ? "border-brand-green bg-brand-wash text-brand-green shadow-xs ring-1 ring-brand-green/30"
                    : "border-line bg-white text-ink hover:border-brand-green/40 hover:bg-slate-50/60 hover:shadow-xs",
                )}
              >
                <div className="shrink-0">
                  <Checkbox
                    checked={checked}
                    onChange={() =>
                      onChange(checked ? arr.filter((x) => x !== o) : [...arr, o])
                    }
                  />
                </div>
                <span className="text-[13.5px] sm:text-[14px] font-medium leading-snug min-w-0 flex-1">
                  {o}
                </span>
              </label>
            );
          })}
        </div>
      );
    case "rating":
      return (
        <div className="space-y-2">
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {[1, 2, 3, 4, 5].map((n) => {
              const selected = str === String(n);
              return (
                <button
                  key={n}
                  type="button"
                  onClick={() => onChange(String(n))}
                  aria-label={`${n} of 5`}
                  className={cn(
                    "flex h-11 w-11 sm:h-12 sm:w-12 items-center justify-center rounded-xl border text-[16px] sm:text-[17px] font-bold transition-all",
                    selected
                      ? "border-brand-green bg-brand-green text-white shadow-sm ring-2 ring-brand-green/20 scale-105"
                      : "border-line bg-white text-ink hover:border-brand-green/60 hover:bg-slate-50",
                  )}
                >
                  {n}
                </button>
              );
            })}
          </div>
          <div className="flex items-center justify-between text-[11.5px] sm:text-[12px] text-muted max-w-[280px] sm:max-w-[320px] px-0.5">
            <span>1 (Very dissatisfied)</span>
            <span>5 (Very satisfied)</span>
          </div>
        </div>
      );
    case "text":
      return (
        <div className="space-y-1.5">
          <Textarea
            rows={4}
            maxLength={500}
            value={str}
            onChange={(e) => onChange(e.target.value)}
            placeholder="Type farmer's response here…"
            className="w-full text-[14px]"
          />
          <div className="flex justify-end text-[11.5px] text-muted">
            {str.length} / 500 characters
          </div>
        </div>
      );
  }
}