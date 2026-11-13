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

const Icon = ({ d, className = "h-6 w-6" }: { d: string; className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={d} /></svg>
);

function StatCard({ title, value, hint, accent, tile, icon }: { title: string; value: number; hint: string; accent: string; tile: string; icon: string }) {
  return (
    <div className={cn("flex items-start justify-between gap-3 rounded-xl border border-line border-l-4 bg-white px-4 py-3.5 shadow-card", accent)}>
      <div className="min-w-0">
        <p className="text-[14px] text-ink-soft">{title}</p>
        <p className="mt-1 text-[28px] font-bold leading-none text-ink">{value}</p>
        <p className="mt-2 truncate text-[12px] text-ink-soft">{hint}</p>
      </div>
      <span className={cn("flex h-12 w-12 shrink-0 items-center justify-center rounded-xl", tile)}><Icon d={icon} /></span>
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

  const load = useCallback(() => {
    setState("loading");
    listSurveyTemplates({ q: query, status: status || undefined, type: type || undefined })
      .then(({ items, total: t }) => {
        setRows(items);
        setTotal(t);
        setState("ready");
      })
      .catch((err: unknown) => {
        setError(describeSurveyError(err));
        setState("error");
      });
  }, [query, status, type]);

  // Debounce typing in the search box.
  useEffect(() => {
    const t = setTimeout(load, 300);
    return () => clearTimeout(t);
  }, [load, reloadKey]);

  const count = (s: SurveyStatus) => rows.filter((t) => t.status === s).length;
  const responses = rows.reduce((n, t) => n + t.collected, 0);

  const columns: Column<SurveyTask>[] = [
    { key: "sno", header: "S. No.", cell: (t) => rows.indexOf(t) + 1 },
    {
      key: "name", header: "Template", className: "min-w-[260px]", cell: (t) => (
        <span className="block">
          <span className="font-semibold text-ink">{t.name}</span>
          <span className="mt-0.5 block text-[12.5px] text-ink-soft">Template {t.templateVersion}{t.woreda ? ` · ${t.woreda}` : ""}</span>
        </span>
      ),
    },
    { key: "type", header: "Type", cell: (t) => <span className="whitespace-nowrap">{t.type}</span> },
    { key: "window", header: "Window", cell: (t) => <span className="whitespace-nowrap text-[13px]">{t.window.open} → {t.window.close}</span> },
    { key: "assign", header: "Assigned to", cell: (t) => <span className="whitespace-nowrap">{t.assignmentMode === "Selected" ? `${t.assignedDaIds?.length ?? 0} selected DA${t.assignedDaIds?.length === 1 ? "" : "s"}` : "Whole Woreda"}</span> },
    { key: "langs", header: "Languages", cell: (t) => <span className="text-[13px] text-ink-soft">{t.languages.join(" · ")}</span> },
    { key: "resp", header: "Responses", cell: (t) => <span className="font-medium text-ink">{t.collected}{t.queued > 0 ? <span className="ml-1 text-[12px] font-normal text-amber-700">+{t.queued} queued</span> : null}</span> },
    { key: "status", header: "Status", cell: (t) => <Pill tone={SURVEY_STATUS_TONE[t.status]} dot>{t.status}</Pill> },
    {
      key: "actions", header: <span className="sr-only">Actions</span>, align: "right", cell: (t) => (
        <span className="flex justify-end gap-4">
          <button type="button" onClick={() => router.push(`/surveys/templates/${encodeURIComponent(t.id)}`)} className="text-[13.5px] font-semibold text-brand-green hover:underline">View</button>
          <button type="button" onClick={() => router.push(`/surveys?view=results&survey=${encodeURIComponent(t.id)}`)} className="text-[13.5px] font-semibold text-ink hover:underline">Results</button>
        </span>
      ),
    },
  ];

  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard title="Templates" value={total} hint="Published in your scope" accent="border-l-violet-500" tile="bg-violet-50 text-violet-600" icon="M9 13h6M9 17h6M14 3H7a2 2 0 00-2 2v14a2 2 0 002 2h10a2 2 0 002-2V8l-5-5zM14 3v5h5" />
        <StatCard title="Open" value={count("Open")} hint="Collecting responses" accent="border-l-brand-green" tile="bg-brand-mint text-brand-green" icon="M22 11.1V12a10 10 0 11-5.9-9.1M22 4L12 14l-3-3" />
        <StatCard title="Closing soon" value={count("Closing soon")} hint="Window ends within 7 days" accent="border-l-amber-500" tile="bg-amber-50 text-amber-600" icon="M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2" />
        <StatCard title="Responses" value={responses} hint={`${count("Closed")} closed template${count("Closed") === 1 ? "" : "s"}`} accent="border-l-blue-500" tile="bg-blue-50 text-blue-600" icon="M6 20V12M12 20V6M18 20v-5" />
      </div>

      <p className="flex items-center gap-2 rounded-lg border border-blue-200 bg-blue-50 px-4 py-2.5 text-[13px] text-blue-700">
        <Icon d="M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01" className="h-4 w-4 shrink-0" />
        Publishing a template opens it for the DAs right away. Changing questions after responses are in creates a new template version; earlier responses stay on their version.
      </p>

      {notice && <Banner tone="success" onDismiss={onDismissNotice}>{notice}</Banner>}
      {state === "error" && error && <Banner tone="error">{error}</Banner>}

      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[17px] font-semibold text-ink">Survey Templates</h2>
            <p className="text-[12.5px] text-ink-soft">Published templates · version · collection window</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <Select aria-label="Status" className="h-10 sm:w-40" value={status} onChange={(e) => setStatus(e.target.value as SurveyStatus | "")}>
              <option value="">All status</option>
              {STATUSES.map((s) => <option key={s}>{s}</option>)}
            </Select>
            <Select aria-label="Survey type" className="h-10 sm:w-48" value={type} onChange={(e) => setType(e.target.value as SurveyType | "")}>
              <option value="">All types</option>
              {SURVEY_TYPES.map((s) => <option key={s}>{s}</option>)}
            </Select>
            <SearchInput value={query} onChange={setQuery} placeholder="Search template name…" />
          </div>
        </div>
        <DataTable itemLabel="templates" columns={columns} rows={rows} rowKey={(t) => t.id} minWidth="1180px" state={state} onRetry={load}
          emptyTitle={query || status || type ? "No templates match your filters" : "No survey templates yet"}
          emptyHint={query || status || type ? "Clear a filter or try a different name." : "Use New Template to publish the first survey."} />
      </Card>
    </>
  );
}
