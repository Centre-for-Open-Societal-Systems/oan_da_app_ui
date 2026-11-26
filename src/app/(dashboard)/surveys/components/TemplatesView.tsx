"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Banner } from "@/components/ui/Banner";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { cn } from "@/lib/utils";
import {
  SURVEY_STATUS_TONE,
  SURVEY_TYPES,
  describeSurveyError,
  listSurveyTemplates,
  type SurveyStatus,
  type SurveyTask,
  type SurveyType,
} from "@/features/surveys";
import { AreaPicker, areaName, loadAreaNames, type AreaSelection } from "@/features/geo";

const Icon = ({ d, className = "h-6 w-6" }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

function StatCard({ title, value, hint, accentColor, tile, icon }: { title: string; value: number; hint: string; accentColor: string; tile: string; icon: string }) {
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
          accentColor
        )}
      />
      <div className="flex items-start justify-between gap-3 pl-1">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] sm:text-[13.5px] font-semibold text-ink-soft tracking-tight">{title}</p>
          <div className="mt-2 flex items-baseline transition-transform duration-300 ease-out group-hover:translate-x-0.5">
            <span className="text-[26px] sm:text-[28px] md:text-[30px] font-bold leading-none text-ink tracking-tight">{value}</span>
          </div>
        </div>
        <span
          className={cn(
            "flex h-11 w-11 sm:h-12 sm:w-12 shrink-0 items-center justify-center rounded-xl",
            "transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)]",
            "group-hover:-translate-y-1.5 group-hover:scale-[1.14] group-hover:shadow-sm",
            tile
          )}
        >
          <Icon d={icon} className="h-5 w-5 sm:h-6 sm:w-6" />
        </span>
      </div>
      <div className="mt-3.5 pt-2.5 border-t border-line-soft pl-1">
        <p className="truncate text-[12px] sm:text-[12.5px] text-ink-soft">{hint}</p>
      </div>
    </div>
  );
}

const STATUSES: SurveyStatus[] = ["Open", "Closing soon", "Closed"];

// Published survey templates in the caller's scope (GET /surveys/templates). Status / type / search run on the server.
export function TemplatesView({ reloadKey = 0, notice, onDismissNotice }: { reloadKey?: number; notice?: string | null; onDismissNotice?: () => void }) {
  const router = useRouter();
  const [rows, setRows] = useState<SurveyTask[]>([]);
  const [total, setTotal] = useState(0);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<SurveyStatus | "">("");
  const [type, setType] = useState<SurveyType | "">("");
  // Woreda filter from the area picker: a Supervisor's own Woreda (from /me) is fixed, others pick one or leave it empty.
  const [woreda, setWoreda] = useState("");
  const pickArea = useCallback((area: AreaSelection) => setWoreda(area.woreda?.code ?? ""), []);

  const load = useCallback(() => {
    setState("loading");
    listSurveyTemplates({ q: query, status: status || undefined, type: type || undefined, woreda: woreda || undefined })
      .then(async ({ items, total: t }) => {
        // Templates carry the Woreda code; its name is read from the Master Data before the rows show.
        await loadAreaNames(items.map((i) => i.woreda));
        setRows(items);
        setTotal(t);
        setState("ready");
      })
      .catch((err: unknown) => {
        setError(describeSurveyError(err));
        setState("error");
      });
  }, [query, status, type, woreda]);

  // Debounce typing in the search box.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load, reloadKey]);

  const count = (s: SurveyStatus) => rows.filter((t) => t.status === s).length;
  const responses = rows.reduce((n, t) => n + t.collected, 0);

  const columns: Column<SurveyTask>[] = [
    {
      key: "sno",
      header: "S.No.",
      align: "center",
      className: "w-16 min-w-[64px] whitespace-nowrap",
      cell: (t) => <span className="text-[13px] font-medium text-muted">{rows.indexOf(t) + 1}</span>,
    },
    {
      key: "name", header: "Template", className: "min-w-[260px]", cell: (t) => (
        <span className="block">
          <span className="font-semibold text-ink">{t.name}</span>
          <span className="mt-0.5 block text-[12px] sm:text-[12.5px] text-ink-soft">Template {t.templateVersion}{t.woreda ? ` · ${areaName(t.woreda)}` : ""}</span>
        </span>
      ),
    },
    { key: "type", header: "Type", cell: (t) => <span className="whitespace-nowrap rounded-md bg-surface px-2 py-0.5 text-[12px] font-medium text-ink-soft border border-line-soft">{t.type}</span> },
    { key: "window", header: "Window", cell: (t) => <span className="whitespace-nowrap text-[12.5px] font-medium text-ink">{t.window.open} → {t.window.close}</span> },
    { key: "assign", header: "Assigned to", cell: (t) => <span className="whitespace-nowrap text-[13px]">{t.assignmentMode === "Selected" ? `${t.assignedDaIds?.length ?? 0} selected DA${t.assignedDaIds?.length === 1 ? "" : "s"}` : "Whole Woreda"}</span> },
    { key: "langs", header: "Languages", cell: (t) => <span className="text-[12.5px] text-ink-soft">{t.languages.join(" · ")}</span> },
    { key: "resp", header: "Responses", cell: (t) => <span className="font-medium text-ink">{t.collected}{t.queued > 0 ? <span className="ml-1 text-[12px] font-normal text-amber-700">+{t.queued} queued</span> : null}</span> },
    { key: "status", header: "Status", cell: (t) => <Pill tone={SURVEY_STATUS_TONE[t.status]} dot>{t.status}</Pill> },
    {
      key: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (t) => (
        <span className="flex items-center justify-end gap-2">
          <button
            type="button"
            onClick={() => router.push(`/surveys/templates/${encodeURIComponent(t.id)}`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-[12.5px] font-semibold text-brand-green hover:border-brand-green hover:bg-brand-wash/30 transition-all shadow-2xs"
          >
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
              <circle cx="12" cy="12" r="3" />
            </svg>
            <span>View</span>
          </button>
          <button
            type="button"
            onClick={() => router.push(`/surveys?view=results&survey=${encodeURIComponent(t.id)}`)}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 py-1 text-[12.5px] font-semibold text-ink hover:border-brand-green hover:text-brand-green hover:bg-brand-wash/30 transition-all shadow-2xs"
          >
            <svg className="h-3.5 w-3.5 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 20V10" />
              <path d="M12 20V4" />
              <path d="M6 20v-6" />
            </svg>
            <span>Results</span>
          </button>
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Total Templates" value={total} hint="Published in your scope" accentColor="bg-violet-500" tile="bg-violet-50 text-violet-600" icon="M9 13h6M9 17h6M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5" />
        <StatCard title="Open for Responses" value={count("Open")} hint="Currently collecting answers" accentColor="bg-brand-green" tile="bg-brand-mint text-brand-green" icon="M22 11.1V12a10 10 0 11-5.9-9.1M22 4L12 14l-3-3" />
        <StatCard title="Closing Soon" value={count("Closing soon")} hint="Window ends within 7 days" accentColor="bg-amber-500" tile="bg-amber-50 text-amber-600" icon="M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2" />
        <StatCard title="Collected Responses" value={responses} hint={`${count("Closed")} closed template${count("Closed") === 1 ? "" : "s"}`} accentColor="bg-blue-500" tile="bg-blue-50 text-blue-600" icon="M6 20V12M12 20V6M18 20v-5" />
      </div>

      <div className="flex items-start sm:items-center gap-3 rounded-xl border border-blue-200/90 bg-blue-50/80 px-4 py-3 text-[12.5px] sm:text-[13px] text-blue-900 leading-relaxed shadow-2xs">
        <Icon d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01" className="h-5 w-5 shrink-0 text-blue-600 mt-0.5 sm:mt-0" />
        <p>
          Publishing a template opens it for the DAs right away. Changing questions after responses are in creates a new template version; earlier responses stay on their version.
        </p>
      </div>

      {notice && <Banner tone="success" onDismiss={onDismissNotice}>{notice}</Banner>}
      {state === "error" && error && <Banner tone="error">{error}</Banner>}

      <Card className="overflow-hidden rounded-2xl border border-line bg-white p-0 shadow-card">
        <div className="flex flex-col gap-3 p-3.5 sm:p-4 lg:flex-row lg:items-center lg:justify-between border-b border-line-soft bg-white">
          <div className="min-w-0">
            <h2 className="text-[16px] sm:text-[18px] font-bold text-ink">Survey Templates</h2>
            <p className="mt-0.5 text-[12px] sm:text-[12.5px] text-ink-soft">Published templates · version · collection window</p>
          </div>
          <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center w-full lg:w-auto">
            <div className="grid grid-cols-2 gap-2 w-full sm:w-auto sm:flex sm:items-center">
              <Select aria-label="Status" className="h-10 w-full sm:w-36 rounded-xl font-medium" value={status} onChange={(e) => setStatus(e.target.value as SurveyStatus | "")}>
                <option value="">All status</option>
                {STATUSES.map((s) => <option key={s}>{s}</option>)}
              </Select>
              <Select aria-label="Survey type" className="h-10 w-full sm:w-44 rounded-xl font-medium" value={type} onChange={(e) => setType(e.target.value as SurveyType | "")}>
                <option value="">All types</option>
                {SURVEY_TYPES.map((s) => <option key={s}>{s}</option>)}
              </Select>
            </div>
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search template name…"
              className="w-full sm:w-60 lg:w-[240px] [&_input]:w-full [&_input]:h-10 [&_input]:rounded-xl"
            />
          </div>
        </div>
        <AreaPicker depth="woreda" idPrefix="tpl-filter" onChange={pickArea} className="border-b border-line-soft p-3.5 sm:p-4" />
        <DataTable itemLabel="templates" columns={columns} rows={rows} rowKey={(t) => t.id} minWidth="1180px" state={state} onRetry={load}
          emptyTitle={query || status || type || woreda ? "No templates match your filters" : "No survey templates yet"}
          emptyHint={query || status || type || woreda ? "Clear a filter or try a different name." : "Use New Template to publish the first survey."} />
      </Card>
    </>
  );
}