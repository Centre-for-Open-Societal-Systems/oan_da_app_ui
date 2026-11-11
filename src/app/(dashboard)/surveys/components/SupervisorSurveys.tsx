"use client";

import { useState, type ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { ExportButton } from "@/components/ui/ExportButton";
import { PersonAvatar } from "@/components/ui/PersonAvatar";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { fileDate } from "@/lib/download";
import { downloadTable } from "@/lib/export";
import { matchesQuery } from "@/lib/search";
import { cn } from "@/lib/utils";
import {
  REGIONAL_SCORES,
  RESULT_DATE_RANGES,
  RESULT_REGIONS,
  RESULT_SURVEY_TYPES,
  SURVEY_ANALYTICS,
  SURVEY_RESPONSES,
  type SurveyResponse,
} from "@/features/surveys";
import { CUSTOM_RANGE, DateFilterMenu, formatRange, MultiFilterMenu } from "./SurveyFilterMenu";
import { Button } from "@/components/ui/Button";
import { NewTemplateModal } from "./NewTemplateModal";
import { TemplatesView } from "./TemplatesView";

export type View = "templates" | "results";

const Icon = ({ d, className = "h-4 w-4" }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d={d} />
  </svg>
);

const rateBar = (pct: number) => (pct >= 80 ? "bg-brand-green" : pct >= 60 ? "bg-amber-500" : "bg-red-500");

function Delta({ value }: { value: string }) {
  return (
    <span className="mt-1.5 inline-flex items-center gap-1 rounded bg-brand-mint px-1.5 py-0.5 text-[12px] font-semibold text-brand-green">
      <Icon d="M7 17L17 7M9 7h8v8" className="h-3 w-3" /> {value}
    </span>
  );
}

function KpiCard({ title, accent, icon, iconBox, value, children }: { title: string; accent: string; icon: ReactNode; iconBox: string; value: ReactNode; children: ReactNode }) {
  return (
    <div className={cn("rounded-xl border border-line border-l-4 bg-white p-5", accent)}>
      <p className="text-[15px] font-medium text-ink-soft">{title}</p>
      <div className="mt-3 flex items-start justify-between gap-4">
        <div>{value}</div>
        <span className={cn("flex h-14 w-14 shrink-0 items-center justify-center rounded-xl", iconBox)}>{icon}</span>
      </div>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function SurveyAnalytics() {
  const [surveyTypes, setSurveyTypes] = useState<string[]>([RESULT_SURVEY_TYPES[0].value]);
  const [regions, setRegions] = useState<string[]>([]); // empty = All Region
  const [range, setRange] = useState("30d");
  const [customRange, setCustomRange] = useState({ from: "", to: "" });
  const { responseRate: rr, averageScore: avg } = SURVEY_ANALYTICS;

  const rangeLabel = range === CUSTOM_RANGE ? formatRange(customRange) : RESULT_DATE_RANGES.find((o) => o.value === range)?.label ?? range;
  const regionScores = regions.length === 0 ? REGIONAL_SCORES : REGIONAL_SCORES.filter((r) => regions.includes(r.region));

  const exportReport = (format: Parameters<typeof downloadTable>[0]) =>
    downloadTable(format, `survey-analytics-${fileDate()}`, regionScores, [
      { header: "Region", value: (r) => r.region },
      { header: "Score (out of 5)", value: (r) => r.score.toFixed(1) },
    ], `${surveyTypes.join(", ")} · ${regions.length ? regions.join(", ") : "All regions"} · ${rangeLabel}`);

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-4">
        <h2 className="text-[18px] font-semibold text-ink">Survey Analytics</h2>
        <ExportButton onExport={exportReport} />
      </div>

      <div className="grid grid-cols-1 gap-4 border-b border-line px-5 py-4 md:grid-cols-3">
        <MultiFilterMenu label="Survey type" unit="survey types" options={RESULT_SURVEY_TYPES} selected={surveyTypes} onChange={setSurveyTypes} />
        <MultiFilterMenu label="Region" unit="regions" allLabel="All Region" options={RESULT_REGIONS} selected={regions} onChange={setRegions} />
        <DateFilterMenu label="Date range" options={RESULT_DATE_RANGES} value={range} onChange={setRange} customRange={customRange} onCustomRange={setCustomRange} />
      </div>

      <div className="flex flex-col gap-5 px-5 py-5">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <KpiCard
            title="Response rate"
            accent="border-l-brand-green"
            iconBox="bg-brand-mint text-brand-green"
            icon={<Icon d="M6 20V12M12 20V6M18 20v-5" className="h-7 w-7" />}
            value={<><p className="text-[32px] font-bold leading-none text-ink">{rr.pct}%</p><Delta value={rr.delta} /></>}
          >
            <p className="text-[12.5px] text-ink-soft">n = {rr.completed.toLocaleString()} of {rr.invited.toLocaleString()} invited · {rr.margin} margin (95% CI)</p>
          </KpiCard>
          <KpiCard
            title="Average score"
            accent="border-l-blue-600"
            iconBox="bg-blue-50 text-blue-600"
            icon={<Icon d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9L12 3z" className="h-7 w-7" />}
            value={<><p className="text-[32px] font-bold leading-none text-ink">{avg.score.toFixed(1)}<span className="ml-1 text-[14px] font-medium text-ink-soft">/ {avg.outOf}</span></p><Delta value={avg.delta} /></>}
          >
            <div className="h-1.5 overflow-hidden rounded-full bg-slate-100" role="progressbar" aria-valuenow={avg.score} aria-valuemin={0} aria-valuemax={avg.outOf}>
              <div className="h-full rounded-full bg-blue-600" style={{ width: `${(avg.score / avg.outOf) * 100}%` }} />
            </div>
            <p className="mt-2 text-[12.5px] text-ink-soft">{avg.topBoxPct}% of respondents scored 4 or 5</p>
            <p className="text-[12.5px] text-ink-soft">Based on {avg.completed.toLocaleString()} completed responses</p>
          </KpiCard>
        </div>

        <div className="rounded-xl border border-line">
          <div className="border-b border-line px-4 py-3.5">
            <h3 className="text-[17px] font-semibold text-ink">Regional comparison</h3>
            <p className="text-[12.5px] text-ink-soft">Aggregate satisfaction score, {rangeLabel}</p>
          </div>
          <div className="flex flex-col gap-5 px-4 py-4">
            {regionScores.length === 0 && <p className="text-[13px] text-ink-soft">No scores yet for the selected regions.</p>}
            {regionScores.map((r) => (
              <div key={r.region}>
                <div className="flex items-center justify-between text-[13.5px]">
                  <span className="font-semibold text-ink">{r.region}</span>
                  <span className="text-[12.5px] text-muted">{r.score.toFixed(1)} / 5.0</span>
                </div>
                <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-slate-100">
                  <div className={cn("h-full rounded-full", r.bar)} style={{ width: `${(r.score / 5) * 100}%` }} />
                </div>
              </div>
            ))}
            <p className="flex items-center gap-2 rounded-lg border border-line bg-surface px-3 py-2 text-[12.5px] text-ink-soft">
              <Icon d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01" className="h-4 w-4 shrink-0" />
              Scores calculated from aggregate local zone feedback.
            </p>
          </div>
        </div>
      </div>
    </Card>
  );
}

function SurveyResponses() {
  const [query, setQuery] = useState("");
  const rows = SURVEY_RESPONSES.filter((r) => matchesQuery(query, r.farmerName, r.farmerId, r.assignedDa));

  const columns: Column<SurveyResponse>[] = [
    { key: "sno", header: "S.No.", cell: (r) => rows.indexOf(r) + 1 },
    {
      key: "farmer", header: "Farmer Name", cell: (r) => (
        <span className="flex items-center gap-2.5">
          <span className="h-8 w-8 shrink-0"><PersonAvatar label={r.farmerName} /></span>
          <span className="font-semibold text-ink">{r.farmerName}</span>
        </span>
      ),
    },
    { key: "id", header: "Farmer ID", cell: (r) => r.farmerId },
    { key: "region", header: "Region", cell: (r) => r.region },
    { key: "zone", header: "Zone", cell: (r) => r.zone },
    { key: "kebele", header: "Kebele", cell: (r) => r.kebele },
    { key: "da", header: "Assigned DA", cell: (r) => r.assignedDa },
    {
      key: "rate", header: "Response Rate", cell: (r) => (
        <span className="flex items-center gap-2.5">
          <span className="h-1.5 w-14 overflow-hidden rounded-full bg-slate-100"><span className={cn("block h-full rounded-full", rateBar(r.responseRate))} style={{ width: `${r.responseRate}%` }} /></span>
          {r.responseRate}%
        </span>
      ),
    },
    { key: "date", header: "Date of Response", cell: (r) => <span className="whitespace-nowrap">{r.date}</span> },
  ];

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="flex flex-col gap-3 px-5 py-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-[18px] font-semibold text-ink">Survey Responses</h2>
          <p className="text-[12.5px] text-ink-soft">Farmer feedback collected by DAs, Jan–Jun 2024</p>
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search by farmer name, farmer ID or DA…" />
      </div>
      <DataTable itemLabel="results" columns={columns} rows={rows} rowKey={(r) => r.id} minWidth="1100px" emptyTitle="No responses match your search" emptyHint="Try a different name, ID or DA." />
    </Card>
  );
}

// Supervisor's Surveys: Templates (catalog → builder) or Results (analytics + collected responses).
export function SupervisorSurveys({ initialView = "results" }: { initialView?: View }) {
  const [view, setView] = useState<View>(initialView);
  const [creating, setCreating] = useState(false);
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
        {isTemplates ? (
          <div>
            <h1 className="text-[24px] font-bold tracking-tight text-ink">Survey templates</h1>
            <p className="mt-1 text-[13.5px] text-ink-soft">Reusable instruments. Design once, translate, then deploy to the field.</p>
          </div>
        ) : (
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-[24px] font-bold tracking-tight text-ink">Surveys</h1>
              <Pill tone="amber" className="px-2.5 py-0.5 text-[11.5px] uppercase">Draft</Pill>
              <Pill tone="slate" className="px-2.5 py-0.5 text-[11.5px] uppercase">Autosaved 2 min ago</Pill>
            </div>
            <p className="mt-1 text-[13.5px] text-ink-soft">Farmer feedback on DA conduct, timeliness and usefulness of advisory · collected offline during visits</p>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3">
          {isTemplates && (
            <Button variant="brand" className="h-11 gap-2 px-5" onClick={() => setCreating(true)}>
              <Icon d="M12 5v14M5 12h14" /> New Template
            </Button>
          )}
          {toggle}
        </div>
      </Card>

      {isTemplates ? (
        <TemplatesView />
      ) : (
        <>
          <SurveyAnalytics />
          <SurveyResponses />
        </>
      )}

      {creating && <NewTemplateModal onClose={() => setCreating(false)} />}
    </div>
  );
}
