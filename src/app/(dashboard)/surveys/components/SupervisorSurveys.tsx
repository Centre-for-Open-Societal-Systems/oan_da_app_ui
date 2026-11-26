"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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

function KpiCard({
  title,
  accentBarColor,
  icon,
  iconBox,
  value,
  children,
}: {
  title: string;
  accentBarColor: string;
  icon: ReactNode;
  iconBox: string;
  value: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div
      className={cn(
        "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-line bg-white p-4.5 sm:p-5 cursor-default select-none",
        "shadow-card transition-all duration-300 ease-out",
        "hover:-translate-y-1 hover:shadow-lg hover:border-slate-300/90"
      )}
    >
      {/* Crisp vertical accent strip that expands on hover */}
      <div
        className={cn(
          "absolute left-0 top-0 bottom-0 w-1.25 sm:w-1.5 transition-all duration-300 ease-out group-hover:w-2",
          accentBarColor
        )}
      />
      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] sm:text-[13.5px] font-semibold text-ink-soft tracking-tight">{title}</p>
          <div className="mt-2 flex items-baseline transition-transform duration-300 ease-out group-hover:translate-x-0.5">
            {value}
          </div>
        </div>
        <span
          className={cn(
            "flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl",
            "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            "group-hover:-translate-y-1.5 group-hover:scale-[1.14] group-hover:shadow-sm",
            iconBox
          )}
        >
          {icon}
        </span>
      </div>
      {children && <div className="mt-3.5 pt-2.5 border-t border-line-soft pl-1">{children}</div>}
    </div>
  );
}

function ResultsPanel({ results }: { results: SurveyResults }) {
  const ratings = results.parameters.filter((p) => p.type === "rating" && p.summary.average != null);
  const avg = ratings.length ? ratings.reduce((n, p) => n + (p.summary.average ?? 0), 0) / ratings.length : null;

  const statusEntries = Object.entries(results.by_status);
  const isSingleStatus = statusEntries.length === 1;
  const syncedCount = results.by_status["Synced"] ?? results.collected;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 sm:gap-4 p-4 sm:p-5 bg-surface-subtle/30">
      <KpiCard
        title="Collected Responses"
        accentBarColor="bg-brand-green"
        iconBox="bg-brand-mint/70 text-brand-green"
        icon={<Icon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" className="h-5 w-5 sm:h-6 sm:w-6" />}
        value={
          <div className="flex items-baseline gap-1.5">
            <span className="text-[26px] sm:text-[28px] md:text-[30px] font-bold leading-none text-ink tracking-tight">
              {results.collected}
            </span>
            <span className="text-[13px] sm:text-[13.5px] font-medium text-ink-soft">
              {results.collected === 1 ? "response" : "responses"}
            </span>
          </div>
        }
      >
        <p className="text-[12px] sm:text-[12.5px] text-ink-soft">
          Farmers surveyed so far · <span className="font-semibold text-ink">{results.queued}</span> queued
        </p>
      </KpiCard>

      <KpiCard
        title="Average Rating"
        accentBarColor="bg-blue-600"
        iconBox="bg-blue-50 text-blue-600"
        icon={<Icon d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" className="h-5 w-5 sm:h-6 sm:w-6" />}
        value={
          <div className="flex items-baseline gap-1">
            <span className="text-[26px] sm:text-[28px] md:text-[30px] font-bold leading-none text-ink tracking-tight">
              {avg == null ? "—" : avg.toFixed(1)}
            </span>
            <span className="text-[13.5px] sm:text-[14px] font-medium text-ink-soft">/ 5</span>
          </div>
        }
      >
        <p className="text-[12px] sm:text-[12.5px] text-ink-soft">
          Mean of {ratings.length} rating question{ratings.length === 1 ? "" : "s"}
        </p>
      </KpiCard>

      <KpiCard
        title="By Status"
        accentBarColor="bg-amber-500"
        iconBox="bg-amber-50 text-amber-600"
        icon={<Icon d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" className="h-5 w-5 sm:h-6 sm:w-6" />}
        value={
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[26px] sm:text-[28px] md:text-[30px] font-bold leading-none text-ink tracking-tight">
              {syncedCount}
            </span>
            <div className="flex items-center gap-1.5 flex-wrap">
              {statusEntries.length === 0 ? (
                <span className="text-[13px] text-ink-soft">No responses</span>
              ) : (
                statusEntries.map(([s, n]) => (
                  <Pill key={s} tone={(RESPONSE_TONE as Record<string, PillTone>)[s] ?? "slate"} dot className="text-[11.5px] py-0.5 px-2.5 font-semibold">
                    {isSingleStatus ? s : `${s} · ${n}`}
                  </Pill>
                ))
              )}
            </div>
          </div>
        }
      >
        <p className="text-[12px] sm:text-[12.5px] text-ink-soft">Distribution of sync & delivery states</p>
      </KpiCard>
    </div>
  );
}

function SurveyResultsView({ initialSurvey }: { initialSurvey?: string }) {
  const [surveys, setSurveys] = useState<SurveyTask[] | null>(null);
  const [surveysError, setSurveysError] = useState<string | null>(null);
  const [surveyId, setSurveyId] = useState(initialSurvey ?? "");
  const [loaded, setLoaded] = useState<{ id: string; results?: SurveyResults; error?: string } | null>(null);
  const results = loaded?.id === surveyId ? loaded.results ?? null : null;
  const resultsError = loaded?.id === surveyId ? loaded.error ?? null : null;
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);
  const scopeWoredas = useAuthStore((st) => st.profile?.scope?.woredas);
  const ownWoreda = useAuthStore((st) => st.role) === "Supervisor" && scopeWoredas?.length === 1 ? scopeWoredas[0] : "";

  const selectedSurvey = surveys?.find((s) => s.id === surveyId);

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

  if (surveysError)
    return (
      <Card className="rounded-2xl shadow-card">
        <EmptyState tone="error" title="Couldn't load surveys" hint={surveysError} />
      </Card>
    );
  if (surveys && surveys.length === 0)
    return (
      <Card className="rounded-2xl shadow-card">
        <EmptyState title="No surveys yet" hint="Results appear once a template is published and DAs submit responses." />
      </Card>
    );

  return (
    <>
      <Card className="overflow-hidden rounded-2xl border border-line bg-white p-0 shadow-card">
        <div className="flex flex-col gap-3.5 border-b border-line px-4 py-3.5 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between bg-white">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-[16px] sm:text-[18px] font-bold text-ink">Survey Results</h2>
              {selectedSurvey && (
                <span className="inline-flex items-center rounded-full bg-surface px-2.5 py-0.5 text-[11px] sm:text-[11.5px] font-medium text-ink-soft border border-line-soft">
                  Template {selectedSurvey.templateVersion}
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] sm:text-[12.5px] text-ink-soft">
              Filter by published survey template to review response metrics and individual farmer feedback
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto shrink-0">
            <Select
              aria-label="Survey"
              className="h-10 w-full sm:w-80 rounded-xl font-medium"
              value={surveyId}
              onChange={(e) => setSurveyId(e.target.value)}
              disabled={!surveys}
            >
              {!surveys && <option value="">Loading surveys…</option>}
              {surveys?.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} · {s.templateVersion} ({s.status})
                </option>
              ))}
            </Select>
            <Button
              variant="outline"
              className="h-10 w-full sm:w-auto gap-2 px-4 rounded-xl font-semibold border-line hover:border-brand-green hover:text-brand-green justify-center"
              disabled={!surveyId || exporting}
              onClick={exportXlsx}
            >
              <Icon d="M12 3v12M7 10l5 5 5-5M5 21h14" />
              {exporting ? "Exporting…" : "Export Excel"}
            </Button>
          </div>
        </div>

        {exportError && (
          <div className="px-5 pt-4">
            <Banner tone="error" onDismiss={() => setExportError(null)}>
              {exportError}
            </Banner>
          </div>
        )}

        {resultsError ? (
          <div className="p-5">
            <Banner tone="error" title="Couldn't load results">
              {resultsError}
            </Banner>
          </div>
        ) : results ? (
          <ResultsPanel results={results} />
        ) : (
          <div className="flex items-center justify-center p-10 text-[14px] text-ink-soft">
            <svg className="mr-2 h-5 w-5 animate-spin text-brand-green" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            {surveyId ? "Loading results…" : "Pick a survey."}
          </div>
        )}
      </Card>

      {surveyId && <AnswersTile key={surveyId} surveyId={surveyId} defaultWoreda={ownWoreda} />}
    </>
  );
}

// Officer Surveys (Supervisor, Admin, Executive): Templates (published catalog) or Results (aggregates, responses, export).
export function SupervisorSurveys({ initialView = "results", initialSurvey }: { initialView?: View; initialSurvey?: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const role = useAuthStore((s) => s.role);
  const canWrite = canWriteSurveys(role);

  // Sync initial view from prop or search param
  const paramView = searchParams.get("view");
  const [view, setView] = useState<View>(paramView === "templates" || paramView === "results" ? paramView : initialView);
  const [creating, setCreating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const [notice, setNotice] = useState<string | null>(null);
  const isTemplates = view === "templates";

  const handleTabChange = (newView: View) => {
    setView(newView);
    const params = new URLSearchParams(searchParams.toString());
    params.set("view", newView);
    router.replace(`/surveys?${params.toString()}`, { scroll: false });
  };

  const toggle = (
    <div
      role="tablist"
      aria-label="Surveys view"
      className="inline-flex w-full sm:w-auto items-center rounded-xl border border-slate-200/90 bg-slate-100/70 p-1 text-[13px] font-medium text-slate-600 shadow-2xs shrink-0"
    >
      <button
        type="button"
        role="tab"
        aria-selected={view === "templates"}
        onClick={() => handleTabChange("templates")}
        className={cn(
          "flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-3.5 sm:px-4 py-2 font-medium transition-all duration-200 select-none",
          view === "templates"
            ? "bg-brand-green text-white shadow-xs font-semibold"
            : "text-ink-soft hover:text-ink hover:bg-white/60"
        )}
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <polyline points="14 2 14 8 20 8" />
          <line x1="16" y1="13" x2="8" y2="13" />
          <line x1="16" y1="17" x2="8" y2="17" />
          <polyline points="10 9 9 9 8 9" />
        </svg>
        <span>Templates</span>
      </button>

      <button
        type="button"
        role="tab"
        aria-selected={view === "results"}
        onClick={() => handleTabChange("results")}
        className={cn(
          "flex flex-1 sm:flex-none items-center justify-center gap-2 rounded-lg px-3.5 sm:px-4 py-2 font-medium transition-all duration-200 select-none",
          view === "results"
            ? "bg-brand-green text-white shadow-xs font-semibold"
            : "text-ink-soft hover:text-ink hover:bg-white/60"
        )}
      >
        <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <path d="M18 20V10" />
          <path d="M12 20V4" />
          <path d="M6 20v-6" />
        </svg>
        <span>Results</span>
      </button>
    </div>
  );

  return (
    <div className="flex w-full flex-col gap-4 min-w-0 max-w-full">
      {/* Header Card */}
      <Card className="flex flex-col gap-4 rounded-2xl border border-line bg-white p-4 sm:p-5 shadow-card md:flex-row md:items-center md:justify-between min-w-0 max-w-full">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5">
            <h1 className="text-[20px] sm:text-[24px] font-bold tracking-tight text-ink">
              {isTemplates ? "Survey Templates" : "Surveys"}
            </h1>
            <span className="inline-flex items-center rounded-full bg-brand-wash px-2.5 py-0.5 text-[11.5px] font-semibold text-brand-green border border-brand-green/20">
              {isTemplates ? "Catalog & Creation" : "Metrics & Feedback"}
            </span>
          </div>
          <p className="mt-1 text-[13px] sm:text-[13.5px] text-ink-soft">
            {isTemplates
              ? "Publish a survey to the DAs of a Woreda, or to selected DAs across your jurisdiction."
              : "Farmer feedback collected by DAs · results per survey and the full Excel export."}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-2.5 sm:gap-3 w-full md:w-auto">
          {isTemplates && canWrite && (
            <Button
              variant="brand"
              className="h-10 sm:h-10.5 w-full sm:w-auto gap-2 px-4 sm:px-5 rounded-xl font-semibold shadow-xs justify-center"
              onClick={() => setCreating(true)}
            >
              <Icon d="M12 5v14M5 12h14" />
              <span>New Template</span>
            </Button>
          )}
          {toggle}
        </div>
      </Card>

      {isTemplates ? (
        <TemplatesView reloadKey={reloadKey} notice={notice} onDismissNotice={() => setNotice(null)} />
      ) : (
        <SurveyResultsView initialSurvey={initialSurvey} />
      )}

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