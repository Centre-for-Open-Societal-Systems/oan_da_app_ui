"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import {
  RESPONSE_TONE,
  canWriteSurveys,
  describeSurveyError,
  downloadSurveyResponses,
  getSurveyResults,
  listSurveyTemplates,
  type SurveyResults,
  type SurveyTask,
} from "@/features/surveys";
import { AnswersTile } from "./AnswersTile";
import { CreateTemplateModal } from "./CreateTemplateModal";
import { TemplatesView } from "./TemplatesView";

export type View = "templates" | "results";

const Icon = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

function KpiCard({ title, accent, icon, iconBox, value, children }: { title: string; accent: string; icon: ReactNode; iconBox: string; value: ReactNode; children?: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-line border-l-4 bg-white p-5", accent)}>
      <p className="text-[15px] font-medium text-ink-soft">{title}</p>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>{value}</div>
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl", iconBox)}>{icon}</span>
      </div>
      {children && <div className="mt-3">{children}</div>}
    </div>
  );
}

function ResultsPanel({ results }: { results: SurveyResults }) {
  const ratings = results.parameters.filter((p) => p.type === "rating" && p.summary.average != null);
  const avg = ratings.length ? ratings.reduce((n, p) => n + (p.summary.average ?? 0), 0) / ratings.length : null;

  return (
    <div className="flex flex-col gap-5 px-5 py-5">
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <KpiCard title="Collected" accent="border-l-brand-green" iconBox="bg-brand-mint text-brand-green" icon={<Icon d="M6 20V12M12 20V6M18 20v-5" className="h-7 w-7" />}
          value={<p className="text-[32px] font-bold leading-none text-ink">{results.collected}<span className="ml-1 text-[14px] font-medium text-ink-soft">response{results.collected === 1 ? "" : "s"}</span></p>}>
          <p className="text-[12.5px] text-ink-soft">Farmers surveyed so far · {results.queued} queued</p>
        </KpiCard>
        <KpiCard title="Average rating" accent="border-l-blue-600" iconBox="bg-blue-50 text-blue-600" icon={<Icon d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z" className="h-7 w-7" />}
          value={<p className="text-[32px] font-bold leading-none text-ink">{avg == null ? "—" : avg.toFixed(1)}<span className="ml-1 text-[14px] font-medium text-ink-soft">/ 5</span></p>}>
          <p className="text-[12.5px] text-ink-soft">Mean of {ratings.length} rating question{ratings.length === 1 ? "" : "s"}</p>
        </KpiCard>
        <KpiCard title="By status" accent="border-l-amber-500" iconBox="bg-amber-50 text-amber-600" icon={<Icon d="M9 11l3 3 8-8M20 12v7a2 2 0 01-2 2H6a2 2 0 01-2-2V5a2 2 0 012-2h9" className="h-7 w-7" />}
          value={
            <div className="flex flex-wrap gap-1.5">
              {Object.keys(results.by_status).length === 0 ? <span className="text-[14px] text-ink-soft">No responses yet</span> : Object.entries(results.by_status).map(([s, n]) => (
                <Pill key={s} tone={(RESPONSE_TONE as Record<string, PillTone>)[s] ?? "slate"} dot>{s} · {n}</Pill>
              ))}
            </div>
          } />
      </div>
    </div>
  );
}

function SurveyResultsView({ initialSurvey }: { initialSurvey?: string }) {
  const [surveys, setSurveys] = useState<SurveyTask[] | null>(null);
  const [surveysError, setSurveysError] = useState<string | null>(null);
  const [surveyId, setSurveyId] = useState(initialSurvey ?? "");
  // Keyed by survey id, so switching surveys shows "Loading" until the new survey's answer arrives.
  const [loaded, setLoaded] = useState<{ id: string; results?: SurveyResults; error?: string } | null>(null);
  const results = loaded?.id === surveyId ? loaded.results ?? null : null;
  const resultsError = loaded?.id === surveyId ? loaded.error ?? null : null;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  // A Supervisor with one Woreda opens the Answers grid on it (the Woreda of their profile).
  const scopeWoredas = useAuthStore((st) => st.profile?.scope?.woredas);
  const ownWoreda = useAuthStore((st) => st.role) === "Supervisor" && scopeWoredas?.length === 1 ? scopeWoredas[0] : "";

  useEffect(() => {
    listSurveyTemplates()
      .then(({ items }) => {
        setSurveys(items);
        setSurveyId((id) => id || items[0]?.id || "");
      })
      .catch((err: unknown) => setSurveysError(describeSurveyError(err)));
  }, []);

  useEffect(() => {
    if (!surveyId) return;
    let current = true;
    getSurveyResults(surveyId)
      .then((r) => current && setLoaded({ id: surveyId, results: r }))
      .catch((err: unknown) => current && setLoaded({ id: surveyId, error: describeSurveyError(err) }));
    return () => {
      current = false;
    };
  }, [surveyId]);

  const exportXlsx = async () => {
    setExporting(true);
    setExportError(null);
    try {
      await downloadSurveyResponses(surveyId);
    } catch (err) {
      setExportError(describeSurveyError(err));
    } finally {
      setExporting(false);
    }
  };

  if (surveysError) return <Card className="shadow-card"><EmptyState tone="error" title="Couldn't load surveys" hint={surveysError} /></Card>;
  if (surveys && surveys.length === 0) return <Card className="shadow-card"><EmptyState title="No surveys yet" hint="Results appear once a template is published and DAs submit responses." /></Card>;

  return (
    <>
      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between">
          <h2 className="text-[16px] sm:text-[18px] font-semibold text-ink">Survey Results</h2>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center w-full md:w-auto">
            <Select aria-label="Survey" className="h-9 sm:h-10 w-full sm:w-80" value={surveyId} onChange={(e) => setSurveyId(e.target.value)} disabled={!surveys}>
              {!surveys && <option value="">Loading surveys…</option>}
              {surveys?.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.templateVersion} ({s.status})</option>)}
            </Select>
            <Button variant="outline" className="h-9 sm:h-10 w-full sm:w-auto gap-2 px-4 font-semibold" disabled={!surveyId || exporting} onClick={exportXlsx}>
              <Icon d="M12 3v12M7 10l5 5 5-5M5 21h14" /> {exporting ? "Exporting…" : "Export Excel"}
            </Button>
          </div>
        </div>
        {exportError && <div className="px-5 pt-4"><Banner tone="error" onDismiss={() => setExportError(null)}>{exportError}</Banner></div>}
        {resultsError ? (
          <div className="p-5"><Banner tone="error" title="Couldn't load results">{resultsError}</Banner></div>
        ) : results ? (
          <ResultsPanel results={results} />
        ) : (
          <p className="px-5 py-10 text-center text-[14px] text-ink-soft">{surveyId ? "Loading results…" : "Pick a survey."}</p>
        )}
      </Card>

      {surveyId && <AnswersTile key={surveyId} surveyId={surveyId} defaultWoreda={ownWoreda} />}
    </>
  );
}

// Officer Surveys (Supervisor, Admin, Executive): Templates (published catalog) or Results (aggregates, responses, export).
export function SupervisorSurveys({ initialView = "results", initialSurvey }: { initialView?: View; initialSurvey?: string }) {
  const role = useAuthStore((s) => s.role);
  const canWrite = canWriteSurveys(role);
  const [view, setView] = useState<View>(initialView);
  const [creating, setCreating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const isTemplates = view === "templates";

  const toggle = (
    <div role="tablist" aria-label="Surveys view" className="inline-flex shrink-0 overflow-hidden rounded-lg border border-line">
      {(["templates", "results"] as const).map((v) => (
        <button key={v} type="button" role="tab" aria-selected={view === v} onClick={() => setView(v)}
          className={cn("px-4 py-2.5 text-[13.5px] font-medium capitalize transition-colors", view === v ? "bg-brand-green text-white" : "bg-white text-ink hover:bg-surface")}>
          {v}
        </button>
      ))}
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-4">
      <Card className="flex flex-col gap-4 px-5 py-4 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-ink">{isTemplates ? "Survey templates" : "Surveys"}</h1>
          <p className="mt-1 text-[13.5px] text-ink-soft">
            {isTemplates ? "Publish a survey to the DAs of a Woreda, or to selected DAs." : "Farmer feedback collected by DAs · results per survey and the full Excel export."}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {isTemplates && canWrite && (
            <Button variant="brand" className="h-11 gap-2 px-5" onClick={() => setCreating(true)}>
              <Icon d="M12 5v14M5 12h14" /> New Template
            </Button>
          )}
          {toggle}
        </div>
      </Card>

      {isTemplates ? <TemplatesView reloadKey={reloadKey} notice={notice} onDismissNotice={() => setNotice(null)} /> : <SurveyResultsView initialSurvey={initialSurvey} />}

      {creating && (
        <CreateTemplateModal
          onClose={() => setCreating(false)}
          onSaved={(task) => {
            setCreating(false);
            setNotice(`“${task.name}” (template ${task.templateVersion}) is published and open for the DAs.`);
            setReloadKey((k) => k + 1);
          }}
        />
      )}
    </div>
  );
}