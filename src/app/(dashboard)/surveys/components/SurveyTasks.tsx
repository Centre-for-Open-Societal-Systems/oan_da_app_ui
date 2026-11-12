"use client";

import { useCallback, useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { RowAction } from "@/components/ui/RowAction";
import { Pill } from "@/components/ui/Pill";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { AdvancedFiltersDrawer, type FilterFieldConfig, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { SURVEY_STATUS_TONE, SURVEY_TYPES, describeSurveyError, listSurveys, type SurveyTask } from "@/features/surveys";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { todayIso } from "@/lib/utils";

const SEARCH_PLACEHOLDER = searchPlaceholder(["Survey", "Window", "Languages", "Responses", "Status"]);

const optionsOf = (values: string[], order?: readonly string[]): FilterOption[] =>
  (order ?? [...new Set(values)]).map((value) => ({ value, label: value, count: values.filter((v) => v === value).length }));

interface SurveyFilters extends FilterSelection {
  type: Set<string>;
  language: Set<string>;
  status: Set<string>;
}
const EMPTY: SurveyFilters = { type: new Set(), language: new Set(), status: new Set() };

const pct = (s: SurveyTask) => (s.targetFarmers > 0 ? Math.min(100, Math.round((s.collected / s.targetFarmers) * 100)) : 0);

// FR-09d: surveys assigned to the DA (GET /surveys) — template version, window, own progress, queued responses.
export function SurveyTasks() {
  const [surveys, setSurveys] = useState<SurveyTask[]>([]);
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<SurveyFilters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");

  const fetchSurveys = useCallback(() => {
    listSurveys()
      .then(({ items }) => {
        setSurveys(items);
        setState("ready");
      })
      .catch((err: unknown) => {
        setError(describeSurveyError(err));
        setState("error");
      });
  }, []);
  useEffect(() => {
    fetchSurveys();
  }, [fetchSurveys]);
  const load = () => {
    setState("loading");
    fetchSurveys();
  };

  const typeOptions = optionsOf(surveys.map((s) => s.type), SURVEY_TYPES);
  const languageOptions = optionsOf(surveys.flatMap((s) => s.languages));
  const statusOptions = optionsOf(surveys.map((s) => s.status), Object.keys(SURVEY_STATUS_TONE));
  const filterFields: FilterFieldConfig[] = [
    { key: "type", label: "Survey type", allLabel: "All survey types", placeholder: "All Types", options: typeOptions },
    { key: "language", label: "Languages", allLabel: "All languages", placeholder: "All Languages", options: languageOptions },
    { key: "status", label: "Status", allLabel: "All Status", placeholder: "All Status", options: statusOptions },
  ];

  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;
  const setFilter = (key: keyof SurveyFilters) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [key]: next }));

  const rows = surveys.filter(
    (s) =>
      (filters.type.size === 0 || filters.type.has(s.type)) &&
      (filters.language.size === 0 || s.languages.some((l) => filters.language.has(l))) &&
      (filters.status.size === 0 || filters.status.has(s.status)) &&
      matchesQuery(query, s.name, s.type, s.templateVersion, s.window, s.languages, s.status, `${s.collected} of ${s.targetFarmers}`),
  );

  const today = todayIso();
  const columns: Column<SurveyTask>[] = [
    {
      key: "name",
      header: <FilterDropdown label="Survey" allLabel="All survey types" options={typeOptions} selected={filters.type} onApply={setFilter("type")} />,
      cell: (s) => <span><span className="font-medium text-ink">{s.name}</span><span className="block text-[12px] text-muted">{s.type} · template {s.templateVersion}</span></span>,
    },
    { key: "window", header: "Window", cell: (s) => <span className="whitespace-nowrap text-[13px]">{s.window.open} → {s.window.close}</span> },
    { key: "lang", header: <FilterDropdown label="Languages" allLabel="All languages" options={languageOptions} selected={filters.language} onApply={setFilter("language")} />, cell: (s) => <span className="text-[13px] text-ink-soft">{s.languages.join(" · ")}</span> },
    {
      key: "progress", header: "Responses", cell: (s) => (
        <div className="min-w-[140px]">
          <div className="flex items-center justify-between text-[12.5px]"><span className="font-medium text-ink">{s.collected} of {s.targetFarmers}</span><span className="text-muted">{pct(s)}%</span></div>
          <div className="mt-1 h-1.5 w-full rounded-full bg-slate-200"><div className="h-1.5 rounded-full bg-brand-green" style={{ width: `${pct(s)}%` }} /></div>
          {s.queued > 0 && <span className="mt-1 block text-[11.5px] text-amber-700">{s.queued} queued</span>}
        </div>
      ),
    },
    { key: "status", header: <FilterDropdown label="Status" allLabel="All Status" options={statusOptions} selected={filters.status} onApply={setFilter("status")} />, cell: (s) => <Pill tone={SURVEY_STATUS_TONE[s.status]} dot>{s.status}</Pill> },
    {
      key: "actions", header: "Actions", align: "center",
      cell: (s) =>
        s.status === "Closed" ? <span className="whitespace-nowrap text-[12.5px] text-subtle">Window closed</span>
        : s.window_open > today ? <span className="whitespace-nowrap text-[12.5px] text-subtle">Opens {s.window.open}</span>
        : <RowAction href={`/surveys/${s.id}`} tone="solid">Collect response</RowAction>,
    },
  ];

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Assigned surveys</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">Pick a farmer from your Kebele, take consent, then capture the answers. One response per farmer per survey.</p>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />
          <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
        </div>
      </div>
      {state === "error" && error && <p className="px-4 pb-2 text-[12.5px] font-medium text-danger">{error}</p>}
      <DataTable
        itemLabel="surveys"
        columns={columns}
        rows={rows}
        rowKey={(s) => s.id}
        minWidth="980px"
        state={state}
        onRetry={load}
        emptyTitle={surveys.length === 0 ? "No surveys assigned to you yet" : "No surveys match the selected filters"}
        emptyHint={surveys.length === 0 ? "Surveys your Supervisor publishes for your Woreda appear here." : "Clear a filter or try a different search."}
      />

      <AdvancedFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        fields={filterFields}
        filters={filters}
        onApply={(next) =>
          setFilters({
            type: next.type ?? new Set(),
            language: next.language ?? new Set(),
            status: next.status ?? new Set(),
          })
        }
      />
    </Card>
  );
}
