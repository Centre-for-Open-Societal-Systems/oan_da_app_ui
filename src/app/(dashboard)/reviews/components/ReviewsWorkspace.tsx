"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { Pill } from "@/components/ui/Pill";
import { Input } from "@/components/ui/Input";
import { StatCard } from "@/components/ui/StatCard";
import { Dropdown } from "@/components/ui/Dropdown";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { AdvancedFiltersDrawer, type FilterFieldConfig, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import type { FilterOption } from "@/components/ui/FilterDropdown";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { AGENTS } from "@/features/agents";

type ReviewStatus =
  | "Acknowledged"
  | "Completed"
  | "Draft"
  | "Scheduled";
type Review = {
  id: string;
  agent: string;
  daId: string;
  cycle: string;
  period: string;
  reviewer: string;
  rating?: number;
  tier?: string;
  status: ReviewStatus;
  /** Past its due date while still open; shown as a second pill next to the status. */
  overdue?: boolean;
  location?: string;
  due: string;
  comments: string;
  strengths?: string;
  improvementAreas?: string;
  goals?: string;
};

const INITIAL_REVIEWS: Review[] = [
  {
    id: "RV-2026-H1-0341",
    agent: "Tadesse Alemu",
    daId: "DA-OR-000341",
    cycle: "Semi-annual",
    period: "H1 2026 (Jan–Jun)",
    reviewer: "Bekele Tadesse",
    rating: 4.4,
    tier: "T3",
    status: "Acknowledged",
    due: "30 Jun 2026",
    comments:
      "Strong agronomy advisory sessions. Maintain visit quality and share the IPM demonstration approach with the team.",
  },
  {
    id: "RV-2026-Q3-0342",
    agent: "Hana Girma",
    daId: "DA-OR-000342",
    cycle: "Quarterly",
    period: "Q3 2026 (Jul–Sep)",
    reviewer: "Bekele Tadesse",
    rating: 4.4,
    tier: "T1",
    status: "Completed",
    due: "30 Sep 2026",
    comments: "Consistent field follow-up and strong farmer feedback.",
  },
  {
    id: "RV-2025-FY-0347",
    agent: "Kebede Alemu",
    daId: "DA-OR-000347",
    cycle: "Annual",
    period: "FY 2025",
    reviewer: "Bekele Tadesse",
    rating: 4.1,
    tier: "T2",
    status: "Draft",
    due: "31 Dec 2025",
    comments: "Draft — awaiting quality-score sync before sign-off.",
  },
  {
    id: "RV-2026-AH-0342",
    agent: "Hana Girma",
    daId: "DA-OR-000342",
    cycle: "Ad hoc",
    period: "Aug 2026 (incident)",
    reviewer: "Bekele Tadesse",
    status: "Scheduled",
    due: "15 Nov 2026",
    comments: "Follow-up review scheduled after field incident.",
  },
  {
    id: "RV-2026-Q3-0361",
    agent: "Abebe Wolde",
    daId: "DA-OR-000361",
    cycle: "Quarterly",
    period: "Q3 2026 (Jul–Sep)",
    reviewer: "Lemlem Kassa",
    status: "Draft",
    overdue: true,
    location: "Awaro, Ambo",
    due: "30 Sep 2026",
    comments: "Draft — awaiting quality-score sync before sign-off.",
  },
];

const HISTORY = [
  [
    "Q3 review acknowledged",
    "Reviews",
    "Rating 4.4 · Tier T1 — acknowledged by the agent.",
    "Tadesse Alemu · by Tadesse Alemu",
  ],
  [
    "Nominated for Q4 recognition",
    "Recognition",
    "Top visit cadence in Bako Tibe woreda.",
    "Tadesse Alemu · by Bekele Tadesse",
  ],
  [
    "Q3 review completed",
    "Reviews",
    "Rating 3.8 · Tier T2 — awaiting acknowledgement.",
    "Hana Girma · by Bekele Tadesse",
  ],
  [
    "Goal assigned: 85% farmer coverage",
    "Goals",
    "Weight 20% · due 31 Dec 2026.",
    "Hana Girma · by Bekele Tadesse",
  ],
  [
    "Completed: Climate-smart agronomy",
    "Training",
    "Agrilearn certificate synced (auto).",
    "Abebe Wolde · by Agrilearn",
  ],
  [
    "Coaching check-in",
    "Coaching",
    "Reviewed visit plan; agreed two extra visits per week.",
    "Rahel Mulugeta · by Lemlem Kassa",
  ],
  [
    "Goal updated: visit cadence 80%",
    "Needs more info",
    "Progress 72% of target.",
    "Rahel Mulugeta · by Lemlem Kassa",
  ],
  [
    "Coaching check-in",
    "Needs more info",
    "Offline sync habits — upload within 24 h of reconnecting.",
    "Rahel Mulugeta · by Lemlem Kassa",
  ],
  [
    "Enrolled: Animal health basics",
    "Training",
    "Due 30 Nov 2026.",
    "Hana Girma · by Bekele Tadesse",
  ],
  [
    "H1 review acknowledged",
    "Reviews",
    "Rating 3.2 · Tier T3 — development plan agreed.",
    "Rahel Mulugeta · by Rahel Mulugeta",
  ],
  [
    "Certificate of merit",
    "Recognition",
    "Natural-resource campaign reach (FY 2025).",
    "Kebede Alemu · by Woreda office",
  ],
];

const SCORE = [
  ["Visit cadence", "30%", 88],
  ["Service quality", "25%", 85],
  ["Farmer coverage", "20%", 80],
  ["Training completion", "15%", 90],
  ["Data accuracy", "10%", 92],
] as const;
const STATUS_STYLE: Record<ReviewStatus, string> = {
  Acknowledged: "bg-emerald-50 text-emerald-700 border-emerald-200",
  Completed: "bg-blue-50 text-blue-700 border-blue-200",
  Draft: "bg-slate-50 text-slate-600 border-slate-200",
  Scheduled: "bg-orange-50 text-orange-700 border-orange-200",
};

// Review history category chips
const CATEGORY_STYLE: Record<string, string> = {
  Reviews: "border-purple-200 bg-purple-50 text-purple-700",
  Recognition: "border-emerald-200 bg-emerald-50 text-emerald-700",
  Goals: "border-blue-200 bg-blue-50 text-blue-700",
  Training: "border-slate-200 bg-slate-50 text-slate-700",
  Coaching: "border-orange-200 bg-orange-50 text-orange-700",
  "Needs more info": "border-purple-200 bg-purple-50 text-purple-700",
};
const TABS = [
  "Reviews",
  "Goals",
  "Dev plan",
  "Coaching",
  "Recognition",
  "Trends",
] as const;
type Tab = (typeof TABS)[number];

interface ReviewFilters extends FilterSelection {
  agent: Set<string>;
  cycle: Set<string>;
  status: Set<string>;
  rating: Set<string>;
  tier: Set<string>;
}

const EMPTY_FILTERS: ReviewFilters = {
  agent: new Set(),
  cycle: new Set(),
  status: new Set(),
  rating: new Set(),
  tier: new Set(),
};

const optionsOf = (values: string[]): FilterOption[] =>
  [...new Set(values)].sort().map((value) => ({
    value,
    label: value,
    count: values.filter((item) => item === value).length,
  }));

const hasFilterValue = (values: Set<string>, value: string) =>
  values.size === 0 || values.has(value);

export function ReviewsWorkspace({
  initialTab = "Reviews",
}: {
  initialTab?: Tab;
}) {
  const [rows, setRows] = useState(INITIAL_REVIEWS);
  const [selectedId, setSelectedId] = useState(INITIAL_REVIEWS[4].id);
  const [tab] = useState<Tab>(initialTab);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<ReviewFilters>(EMPTY_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [showComplete, setShowComplete] = useState(false);
  const [editRating, setEditRating] = useState("4.0");
  const [editStrengths, setEditStrengths] = useState(
    "Strong agronomy advisory sessions",
  );
  const [editAreas, setEditAreas] = useState(
    "Improve visit follow-up and data sync timeliness",
  );
  const [editGoals, setEditGoals] = useState(
    "Reach 85% farmer coverage by the next review",
  );
  const [editComments, setEditComments] = useState("");
  const [notice, setNotice] = useState("");
  const [agent, setAgent] = useState("");
  const [cycle, setCycle] = useState("Quarterly");
  const [period, setPeriod] = useState("Q4 2026 (Oct–Dec)");
  const [due, setDue] = useState("2026-12-31");
  const [newRating, setNewRating] = useState("");
  const [newComments, setNewComments] = useState("");
  const selected = rows.find((row) => row.id === selectedId) ?? rows[0];
  const filterFields: FilterFieldConfig[] = [
    {
      key: "agent",
      label: "Agent",
      allLabel: "All agents",
      placeholder: "All agents",
      options: [...new Map(rows.map((row) => [row.daId, row.agent] as const)).entries()].map(([value, label]) => ({
        value,
        label,
        count: rows.filter((row) => row.daId === value).length,
      })),
    },
    { key: "cycle", label: "Cycle", allLabel: "All cycles", placeholder: "All cycles", options: optionsOf(rows.map((row) => row.cycle)) },
    { key: "status", label: "Status", allLabel: "All statuses", placeholder: "All statuses", options: optionsOf(rows.map((row) => row.status)) },
    { key: "rating", label: "Rating", allLabel: "All ratings", placeholder: "All ratings", options: optionsOf(rows.map((row) => row.rating ? `${row.rating} / 5` : "Not rated")) },
    { key: "tier", label: "Tier", allLabel: "All tiers", placeholder: "All tiers", options: optionsOf(rows.map((row) => row.tier ?? "Not assigned")) },
  ];
  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;
  const filtered = useMemo(
    () =>
      rows.filter((row) => {
        const q = query.toLowerCase();
        return (
          (!q ||
            `${row.agent} ${row.daId} ${row.reviewer}`
              .toLowerCase()
              .includes(q)) &&
          hasFilterValue(filters.agent, row.daId) &&
          hasFilterValue(filters.cycle, row.cycle) &&
          hasFilterValue(filters.status, row.status) &&
          hasFilterValue(filters.rating, row.rating ? `${row.rating} / 5` : "Not rated") &&
          hasFilterValue(filters.tier, row.tier ?? "Not assigned")
        );
      }),
    [rows, query, filters],
  );
  const { pageRows, paginationProps } = usePagination(filtered);
  const dueCount = rows.filter(
    (r) => r.status === "Draft" || r.status === "Scheduled",
  ).length;
  const overdueCount = rows.filter((r) => r.overdue).length;
  const rated = rows.filter((r) => r.rating);
  const avg = rated.length
    ? (
        rated.reduce((sum, r) => sum + (r.rating ?? 0), 0) / rated.length
      ).toFixed(1)
    : "—";

  const createReview = (event: React.FormEvent<HTMLFormElement>, status: "Draft" | "Completed") => {
    event.preventDefault();
    saveNewReview(status);
  };

  const saveNewReview = (status: "Draft" | "Completed") => {
    const selectedAgent = AGENTS.find((item) => item.daId === agent);
    if (!selectedAgent) {
      setNotice("Select an agent before saving the review.");
      return;
    }
    if (!period.trim()) {
      setNotice("Enter the review period before saving.");
      return;
    }
    const id = `RV-${Date.now()}`;
    const next: Review = {
      id,
      agent: selectedAgent.fullName,
      daId: selectedAgent.daId,
      cycle,
      period,
      reviewer: "Almaz Tesfaye",
      ...(newRating ? { rating: Number(newRating), tier: Number(newRating) >= 4.5 ? "T1" : Number(newRating) >= 4 ? "T2" : "T3" } : {}),
      status,
      due: new Date(`${due}T00:00:00`).toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      comments: newComments.trim() || (status === "Draft" ? "Review draft saved." : "Review completed and shared with the agent."),
    };
    setRows((prev) => [next, ...prev]);
    setSelectedId(id);
    setShowCreate(false);
    setAgent("");
    setNewRating("");
    setNewComments("");
    setNotice(status === "Draft" ? `Review draft saved for ${next.agent}.` : `Review completed for ${next.agent}.`);
  };

  const setFilter = (key: keyof ReviewFilters) => (next: Set<string>) =>
    setFilters((current) => ({ ...current, [key]: next }));

  const completeReview = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selected) return;
    const rating = Math.min(5, Math.max(1, Number(editRating)));
    const tier = rating >= 4.5 ? "T1" : rating >= 4 ? "T2" : "T3";
    setRows((prev) =>
      prev.map((row) =>
        row.id === selected.id
          ? {
              ...row,
              rating,
              tier,
              status: "Completed",
              strengths: editStrengths,
              improvementAreas: editAreas,
              goals: editGoals,
              comments:
                editComments.trim() ||
                "Review completed and shared with the agent.",
            }
          : row,
      ),
    );
    setShowComplete(false);
    setNotice(`Review completed for ${selected.agent}.`);
  };

  const acknowledgeReview = () => {
    if (!selected) return;
    setRows((prev) =>
      prev.map((row) =>
        row.id === selected.id ? { ...row, status: "Acknowledged" } : row,
      ),
    );
    setNotice(`${selected.agent}’s review marked as acknowledged.`);
  };

  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader
        title={tab === "Reviews" ? "Performance reviews" : tab}
        description="Quarterly, semi-annual, annual and ad hoc reviews against the agent scorecard, with the goals, coaching, recognition and training history behind them."
        tabs={TABS.map((name) => ({
          label: name,
          href:
            name === "Reviews"
              ? "/reviews"
              : `/reviews?tab=${encodeURIComponent(name)}`,
        }))}
        activeHref={
          tab === "Reviews"
            ? "/reviews"
            : `/reviews?tab=${encodeURIComponent(tab)}`
        }
        actions={
          <Button variant="brand" onClick={() => setShowCreate(true)}>
            Start review
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Reviews due"
          value={String(dueCount)}
          hint="Draft or scheduled"
          accent="border-l-blue-500"
          tile="bg-blue-50 text-blue-600"
          icon={<CalendarIcon />}
        />
        <StatCard
          label="Completed this cycle"
          value={String(
            rows.filter(
              (r) => r.status === "Completed" || r.status === "Acknowledged",
            ).length,
          )}
          hint="Q3 2026 quarterly"
          accent="border-l-emerald-500"
          tile="bg-emerald-50 text-emerald-600"
          icon={<PersonIcon />}
        />
        <StatCard
          label="Average rating"
          value={avg}
          hint={`Across ${rated.length} rated reviews · out of 5`}
          accent="border-l-orange-500"
          tile="bg-orange-50 text-orange-600"
          icon={<StarIcon />}
        />
        <StatCard
          label="Overdue"
          value={String(overdueCount)}
          hint="Past the due date"
          accent="border-l-rose-600"
          tile="bg-rose-50 text-rose-600"
          icon={<AlertIcon />}
        />
      </div>

      {notice && (
        <div
          role="status"
          className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-sm text-emerald-800"
        >
          {notice}
          <button onClick={() => setNotice("")} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      {tab === "Reviews" ? (
        <>
          <Card className="overflow-hidden p-0 shadow-card">
            <div className="flex flex-col gap-3 border-b border-line px-4 py-3.5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-[15px] font-semibold text-ink">Reviews</h2>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <label className="flex h-9 min-w-[230px] items-center gap-2 rounded-lg border border-zinc-200 bg-slate-50 px-3 text-sm text-muted">
                  <SearchIcon />
                  <input
                    className="w-full bg-transparent text-ink outline-none"
                    aria-label="Search reviews"
                    placeholder="Search Agent, DA-ID, Reviewer…"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                    }}
                  />
                </label>
                <AdvancedFiltersButton
                  activeCount={activeFilterCount}
                  onClick={() => setIsFiltersOpen(true)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[850px] text-left text-[13px]">
                <thead className="bg-surface text-[14px] font-semibold text-slate-500">
                  <tr>
                    <th className="border-b border-line px-4 py-3 font-semibold">
                      <FilterDropdown label="Agent" allLabel="All agents" options={filterFields[0].options} selected={filters.agent} onApply={setFilter("agent")} />
                    </th>
                    <th className="border-b border-line px-4 py-3 font-semibold">
                      <FilterDropdown label="Cycle" allLabel="All cycles" options={filterFields[1].options} selected={filters.cycle} onApply={setFilter("cycle")} />
                    </th>
                    <th className="border-b border-line px-4 py-3 font-semibold">Period</th>
                    <th className="border-b border-line px-4 py-3 font-semibold">Reviewer</th>
                    <th className="border-b border-line px-4 py-3 font-semibold">
                      <FilterDropdown label="Rating" allLabel="All ratings" options={filterFields[3].options} selected={filters.rating} onApply={setFilter("rating")} />
                    </th>
                    <th className="border-b border-line px-4 py-3 text-center font-semibold">
                      <FilterDropdown label="Tier" allLabel="All tiers" options={filterFields[4].options} selected={filters.tier} onApply={setFilter("tier")} />
                    </th>
                    <th className="border-b border-line px-4 py-3 text-center font-semibold">
                      <FilterDropdown label="Status" allLabel="All statuses" options={filterFields[2].options} selected={filters.status} onApply={setFilter("status")} />
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row) => (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedId(row.id)}
                      className={`cursor-pointer border-b border-line transition-colors hover:bg-brand-wash/40 ${selected?.id === row.id ? "bg-emerald-50/40" : ""}`}
                    >
                      <td className="px-4 py-3">
                        <div className="font-semibold text-ink">
                          {row.agent}
                        </div>
                        <div className="mt-0.5 text-xs text-muted">
                          {row.daId}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-ink-soft">{row.cycle}</td>
                      <td className="px-4 py-3 text-ink-soft">{row.period}</td>
                      <td className="px-4 py-3 text-ink-soft">
                        {row.reviewer}
                      </td>
                      <td className="px-4 py-3 text-ink-soft">
                        {row.rating?.toFixed(1) ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-center">
                        {row.tier ? (
                          <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                            {row.tier}
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[row.status]}`}
                        >
                          {row.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {pageRows.length === 0 && (
                <p className="px-5 py-10 text-center text-sm text-muted">
                  No reviews match these filters.
                </p>
              )}
            </div>
            <TablePagination itemLabel="reviews" {...paginationProps} />
          </Card>

          <AdvancedFiltersDrawer
            isOpen={isFiltersOpen}
            onClose={() => setIsFiltersOpen(false)}
            fields={filterFields}
            filters={filters}
            onApply={(next) => {
              setFilters({
                agent: next.agent ?? new Set(),
                cycle: next.cycle ?? new Set(),
                status: next.status ?? new Set(),
                rating: next.rating ?? new Set(),
                tier: next.tier ?? new Set(),
              });
            }}
          />

          <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <Card className="p-0 shadow-card">
              <div className="flex items-center justify-between border-b border-emerald-100 px-5 py-4">
                <h2 className="font-semibold text-ink">Review history</h2>
                <span className="text-xs text-muted">
                  {HISTORY.length} events
                </span>
              </div>
              <ol className="max-h-[760px] overflow-y-auto px-5 py-4">
                {HISTORY.map(([title, category, detail, by], i) => (
                  <li
                    key={`${title}-${i}`}
                    className="relative border-l-2 border-emerald-100 pb-5 pl-5 last:border-l-transparent last:pb-0"
                  >
                    <span className="absolute -left-[6px] top-1 h-2.5 w-2.5 rounded-full border-2 border-emerald-700 bg-white" />
                    <div className="flex flex-wrap items-center gap-2">
                      <strong className="text-[13px] text-ink">{title}</strong>
                      <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold ${CATEGORY_STYLE[category] ?? CATEGORY_STYLE.Reviews}`}>
                        {category}
                      </span>
                      <time className="ml-auto text-right text-[11px] leading-snug text-muted">
                        02 Oct 2026,
                        <br />
                        9:40 AM
                      </time>
                    </div>
                    <p className="mt-1 text-xs text-ink-soft">{detail}</p>
                    <p className="mt-1 text-[11px] text-muted">{by}</p>
                  </li>
                ))}
              </ol>
            </Card>

            {selected ? (
              <Card className="overflow-hidden p-0 shadow-card">
                <div className="border-b border-line p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-zinc-200 bg-slate-50 px-2.5 py-1 text-xs font-semibold text-ink-soft">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-500" />
                      {selected.status}
                    </span>
                    {selected.overdue && (
                      <span className="rounded-full border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600">
                        Overdue
                      </span>
                    )}
                    <span className="ml-auto font-mono text-xs text-muted">
                      {selected.id}
                    </span>
                  </div>
                  <h2 className="mt-3 text-xl font-semibold text-ink">
                    {selected.agent}
                  </h2>
                  <p className="mt-1 text-sm text-muted">
                    {selected.daId} · {selected.location ?? "Bako Tibe, Oromia"}
                  </p>
                  <div className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 text-sm">
                    <Detail label="Cycle" value={selected.cycle} />
                    <Detail label="Period" value={selected.period} />
                    <Detail label="Reviewer" value={selected.reviewer} />
                    <Detail
                      label="Due"
                      value={selected.due}
                      danger={selected.overdue}
                    />
                    <Detail
                      label="Rating"
                      value={
                        selected.rating
                          ? `${selected.rating} / 5`
                          : "Not rated yet"
                      }
                    />
                    <Detail label="Tier" value={selected.tier ?? "—"} />
                  </div>
                </div>
                <div className="p-5">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-ink">
                      Scorecard
                    </h3>
                    <span className="text-sm text-muted">
                      Weighted score <strong className="text-ink">86</strong>
                    </span>
                  </div>
                  <div className="mt-3 space-y-3">
                    {SCORE.map(([label, weight, value], i) => (
                      <div key={label}>
                        <div className="mb-1 flex justify-between text-sm">
                          <span className="text-ink-soft">
                            {label}{" "}
                            <span className="text-xs text-muted">
                              · {weight}
                            </span>
                          </span>
                          <strong className="text-ink">{value}</strong>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${i === 2 ? "bg-blue-600" : "bg-emerald-700"}`}
                            style={{ width: `${value}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                  <h3 className="mt-5 text-xs font-bold uppercase tracking-wide text-muted">
                    Strengths
                  </h3>
                  <p className="mt-2 text-sm text-ink-soft">
                    •{" "}
                    {selected.strengths ?? "Strong agronomy advisory sessions"}
                  </p>
                  <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-muted">
                    Improvement areas
                  </h3>
                  <p className="mt-2 text-sm text-ink-soft">
                    {selected.improvementAreas ??
                      "Recorded when the review is completed."}
                  </p>
                  <h3 className="mt-4 text-xs font-bold uppercase tracking-wide text-muted">
                    Goals
                  </h3>
                  <p className="mt-2 text-sm text-ink-soft">
                    {selected.goals ?? "No goals agreed yet."}
                  </p>
                  <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-3.5">
                    <p className="text-xs font-bold uppercase tracking-wide text-muted">
                      Reviewer comments
                    </p>
                    <p className="mt-2 text-sm leading-relaxed text-ink-soft">
                      {selected.comments}
                    </p>
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    {selected.status === "Completed" && (
                      <Button variant="outline" onClick={acknowledgeReview}>
                        Mark acknowledged
                      </Button>
                    )}
                    {(selected.status === "Draft" ||
                      selected.status === "Scheduled") && (
                      <Button
                        variant="brand"
                        onClick={() => {
                          setEditRating(String(selected.rating ?? 4));
                          setEditComments(selected.comments);
                          setShowComplete(true);
                        }}
                      >
                        Continue review
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ) : (
              <Card className="p-8 text-center text-sm text-muted">
                Select a review to see its scorecard.
              </Card>
            )}
          </div>
        </>
      ) : (
        <Card className="p-8 shadow-card">
          <h2 className="text-lg font-semibold text-ink">{tab}</h2>
          <p className="mt-2 text-sm text-ink-soft">
            {tab === "Goals"
              ? "Agent goals assigned during reviews and their progress."
              : tab === "Dev plan"
                ? "Development priorities and agreed follow-up actions."
                : tab === "Coaching"
                  ? "Coaching check-ins and field support notes."
                  : tab === "Recognition"
                    ? "Recognition nominations and achievements across your woreda."
                    : "Review ratings and performance patterns by cycle."}
          </p>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {rows.slice(0, 4).map((row) => (
              <div key={row.id} className="rounded-lg border border-line p-4">
                <div className="flex items-center justify-between">
                  <strong className="text-sm text-ink">{row.agent}</strong>
                  <Pill tone={row.rating ? "green" : "slate"}>
                    {row.rating ? `${row.rating} / 5` : row.status}
                  </Pill>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {row.cycle} · {row.period}
                </p>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Modal
        isOpen={showCreate}
        onClose={() => setShowCreate(false)}
        title="Start review"
        subtitle="Open a performance review for an agent in your woreda"
        size="lg"
        bodyClassName="p-0"
        footer={
          <>
            <Button type="button" variant="outline" onClick={() => setShowCreate(false)}>Cancel</Button>
            <Button type="button" variant="brandOutline" onClick={() => saveNewReview("Draft")}>Save draft</Button>
            <Button type="submit" form="start-review-form" variant="brand">Complete review</Button>
          </>
        }
      >
        <form id="start-review-form" className="space-y-4 px-6 py-5" onSubmit={(event) => createReview(event, "Completed")}>
          <h3 className="text-base font-semibold text-ink">Advisor details</h3>
          <label className="block text-sm font-medium text-ink">Agent <span className="text-danger">*</span>
            <Dropdown
              value={agent}
              onChange={setAgent}
              placeholder="Select a Development Agent"
              searchPlaceholder="Search agents…"
              searchable
              options={AGENTS.filter((item) => item.kebele !== "—" && item.activeStatus !== "Separated").map((item) => ({
                value: item.daId,
                label: `${item.fullName} · ${item.daId} · ${item.kebele}`,
              }))}
              renderValue={(option) => {
                const item = AGENTS.find((a) => a.daId === option.value);
                return item ? `${item.fullName} - ${item.daId} - ${item.woreda}` : option.label;
              }}
              triggerClassName="mt-1.5 h-10"
            />
          </label>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block text-sm font-medium text-ink">Review cycle <span className="text-danger">*</span>
              <Dropdown value={cycle} onChange={setCycle} options={["Quarterly", "Semi-annual", "Annual", "Ad hoc"]} triggerClassName="mt-1.5 h-10" />
            </label>
            <label className="block text-sm font-medium text-ink">Period <span className="text-danger">*</span>
              <Input value={period} onChange={(e) => setPeriod(e.target.value)} required className="mt-1.5 h-10" />
            </label>
          </div>
          <label className="block text-sm font-medium text-ink">Rating
            <Dropdown value={newRating} onChange={setNewRating} placeholder="Select rating (optional)" options={[{ value: "", label: "Not rated yet" }, ...["5.0", "4.5", "4.0", "3.5", "3.0", "2.5", "2.0", "1.0"].map((value) => ({ value, label: `${value} / 5` }))]} triggerClassName="mt-1.5 h-10" />
          </label>
          <label className="block text-sm font-medium text-ink">Reviewer comments
            <textarea className="mt-1.5 min-h-20 w-full resize-y rounded-lg border border-zinc-200 bg-white px-3 py-2.5 text-sm text-ink placeholder:text-slate-400 focus:border-brand-green focus:outline-none focus:ring-2 focus:ring-brand-green/20" value={newComments} onChange={(e) => setNewComments(e.target.value)} placeholder="Summary of the discussion, agreed goals and support needed" />
          </label>
        </form>
      </Modal>
      <Modal
        isOpen={showComplete}
        onClose={() => setShowComplete(false)}
        title={`Complete review${selected ? ` · ${selected.agent}` : ""}`}
        subtitle="Record a rating, strengths, improvement areas and an agreed goal."
      >
        <form className="space-y-4" onSubmit={completeReview}>
          <label className="block text-sm font-medium text-ink">
            Overall rating (1–5)<span className="ml-1 text-danger">*</span>
            <input
              className="mt-1.5 h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 text-sm"
              type="number"
              min="1"
              max="5"
              step="0.1"
              required
              value={editRating}
              onChange={(e) => setEditRating(e.target.value)}
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Strengths<span className="ml-1 text-danger">*</span>
            <textarea
              className="mt-1.5 min-h-20 w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm"
              value={editStrengths}
              onChange={(e) => setEditStrengths(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Improvement areas<span className="ml-1 text-danger">*</span>
            <textarea
              className="mt-1.5 min-h-20 w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm"
              value={editAreas}
              onChange={(e) => setEditAreas(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Agreed goal<span className="ml-1 text-danger">*</span>
            <textarea
              className="mt-1.5 min-h-20 w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm"
              value={editGoals}
              onChange={(e) => setEditGoals(e.target.value)}
              required
            />
          </label>
          <label className="block text-sm font-medium text-ink">
            Reviewer comments
            <textarea
              className="mt-1.5 min-h-20 w-full rounded-lg border border-zinc-200 bg-white p-3 text-sm"
              value={editComments}
              onChange={(e) => setEditComments(e.target.value)}
              placeholder="Optional summary for the agent"
            />
          </label>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowComplete(false)}
            >
              Cancel
            </Button>
            <Button type="submit" variant="brand">
              Complete review
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Detail({
  label,
  value,
  danger = false,
}: {
  label: string;
  value: string;
  danger?: boolean;
}) {
  return (
    <div>
      <p className="text-muted">{label}</p>
      <p
        className={`mt-0.5 font-medium ${danger ? "text-red-600" : "text-ink"}`}
      >
        {value}
      </p>
    </div>
  );
}
function CalendarIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </svg>
  );
}
function PersonIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    >
      <circle cx="10" cy="8" r="4" />
      <path d="M3 21v-1a6 6 0 016-6h2a6 6 0 016 6v1M16 5l2 2 4-4" />
    </svg>
  );
}
function StarIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z" />
    </svg>
  );
}
function AlertIcon() {
  return (
    <svg
      className="h-6 w-6"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinejoin="round"
    >
      <path d="M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z" />
      <path d="M12 9v4M12 17h.01" />
    </svg>
  );
}
function SearchIcon() {
  return (
    <svg
      className="h-4 w-4 shrink-0"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </svg>
  );
}
