"use client";

import { useState } from "react";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ExportButton } from "@/components/ui/ExportButton";
import { RowAction } from "@/components/ui/RowAction";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { Banner } from "@/components/ui/Banner";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { AdvancedFiltersDrawer, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { fileDate, type CsvColumn } from "@/lib/download";
import { downloadTable, formatLabel } from "@/lib/export";
import {
  AGENT_PERFORMANCE,
  PERFORMANCE_AGENT_OPTIONS,
  PERFORMANCE_FILTER_FIELDS,
  PERFORMANCE_STATUS_OPTIONS,
  PERFORMANCE_STATUS_TONE,
  PERFORMANCE_TIER_OPTIONS,
  PERFORMANCE_TIERS,
  type AgentPerformanceRow,
  type PerformanceTier,
} from "@/features/performance";
import { useAreaFilterOptions, withFieldOptions } from "@/features/geo";

const SEARCH_PLACEHOLDER = searchPlaceholder(["Agent", "Kebele", "Tier", "Visits", "Quality score", "Training completion", "Status"]);

const TIER_TONE: Record<PerformanceTier["tone"], PillTone> = { green: "green", blue: "blue", amber: "amber", red: "red" };
const tierOf = (code: string) => PERFORMANCE_TIERS.find((t) => t.code === code);

const EXPORT_COLUMNS: CsvColumn<AgentPerformanceRow>[] = [
  { header: "DA-ID", value: (r) => r.daId },
  { header: "Agent", value: (r) => r.name },
  { header: "Kebele", value: (r) => r.kebele },
  { header: "Tier", value: (r) => `${r.tier} · ${tierOf(r.tier)?.name ?? ""}` },
  { header: "Visits", value: (r) => r.visits },
  { header: "Quality score (%)", value: (r) => r.quality },
  { header: "Training completion (%)", value: (r) => r.training },
  { header: "Status", value: (r) => r.status },
];

interface RegistryFilters extends FilterSelection {
  agent: Set<string>;
  kebele: Set<string>;
  status: Set<string>;
}

const EMPTY: RegistryFilters = { agent: new Set(), kebele: new Set(), status: new Set() };

/** Anchor the tier cards scroll to. */
export const PERFORMANCE_REGISTRY_ID = "agent-performance-registry";

interface PerformanceRegistryProps {
  /** Tier filter, owned by the page so the tier cards above can drive it. */
  tierFilter: Set<string>;
  onTierFilterChange: (next: Set<string>) => void;
}

export function PerformanceRegistry({ tierFilter, onTierFilterChange }: PerformanceRegistryProps) {
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<RegistryFilters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  // Every Kebele of the user's own area from the geo Master Data, then those the rows hold.
  const kebeleOptions = useAreaFilterOptions("kebele", AGENT_PERFORMANCE.map((r) => r.kebele));
  const filterFields = withFieldOptions(PERFORMANCE_FILTER_FIELDS, { kebele: kebeleOptions });
  const [viewing, setViewing] = useState<AgentPerformanceRow | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length + (tierFilter.size > 0 ? 1 : 0);

  const setFilter = (key: keyof RegistryFilters) => (next: Set<string>) =>
    setFilters((prev) => ({ ...prev, [key]: next }));

  const rows = AGENT_PERFORMANCE.filter(
    (r) =>
      (filters.agent.size === 0 || filters.agent.has(r.name)) &&
      (filters.kebele.size === 0 || filters.kebele.has(r.kebele)) &&
      (filters.status.size === 0 || filters.status.has(r.status)) &&
      (tierFilter.size === 0 || tierFilter.has(r.tier)) &&
      matchesQuery(query, r, tierOf(r.tier)?.name ?? ""),
  );

  const { pageRows, paginationProps } = usePagination(rows);
  const viewingTier = viewing ? tierOf(viewing.tier) : undefined;

  return (
    <div id={PERFORMANCE_REGISTRY_ID} className="scroll-mt-4">
    <Card className="overflow-hidden p-0 shadow-card">
      {/* Toolbar */}
      <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Agent performance registry</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">Alphabetically sorted · Active woreda developmental field agents</p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
          <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />

          <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />

          <ExportButton
            disabled={rows.length === 0}
            onExport={(format) => {
              downloadTable(format, `agent-performance-${fileDate()}`, rows, EXPORT_COLUMNS, "Agent performance");
              setNotice(`Exported ${rows.length} agent${rows.length === 1 ? "" : "s"} matching the current filters (${formatLabel(format)}).`);
            }}
          />
        </div>
      </div>

      {tierFilter.size > 0 && (
        <div className="mx-4 mb-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-soft">
          Showing tier{tierFilter.size > 1 ? "s" : ""}
          {[...tierFilter].map((code) => {
            const tier = tierOf(code);
            return tier ? <Pill key={code} tone={TIER_TONE[tier.tone]}>{code} · {tier.name}</Pill> : null;
          })}
          <button type="button" onClick={() => onTierFilterChange(new Set())} className="font-semibold text-brand-green hover:underline">
            Clear tier filter
          </button>
        </div>
      )}

      {notice && <Banner tone="success" className="mx-4 mb-3" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-left">
          <thead>
            <tr className="border-y border-line bg-surface text-[14px] font-semibold text-slate-500">
              <th className="whitespace-nowrap px-4 py-3 font-semibold">
                <FilterDropdown label="Agent" allLabel="All agents" options={PERFORMANCE_AGENT_OPTIONS} selected={filters.agent} onApply={setFilter("agent")} />
              </th>
              <th className="px-4 py-3 font-semibold">
                <FilterDropdown label="Kebele" allLabel="All kebeles" options={kebeleOptions} selected={filters.kebele} onApply={setFilter("kebele")} />
              </th>
              <th className="px-4 py-3 font-semibold">
                <FilterDropdown label="Tier" allLabel="All tiers" options={PERFORMANCE_TIER_OPTIONS} selected={tierFilter} onApply={onTierFilterChange} />
              </th>
              <th className="px-4 py-3 font-semibold">Visits</th>
              <th className="px-4 py-3 font-semibold">Quality score</th>
              <th className="px-4 py-3 font-semibold">Training completion</th>
              <th className="px-4 py-3 text-center font-semibold">
                <FilterDropdown label="Status" allLabel="All Status" options={PERFORMANCE_STATUS_OPTIONS} selected={filters.status} onApply={setFilter("status")} />
              </th>
              <th className="px-4 py-3 text-center font-semibold">Action</th>
            </tr>
          </thead>
          <tbody className="text-[14px] text-slate-700">
            {rows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-6"><EmptyState title="No agents match the selected filters" hint="Clear a filter or try a different search." /></td>
              </tr>
            )}
            {pageRows.map((r) => {
              const tier = tierOf(r.tier);
              return (
                <tr key={r.id} className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface">
                  <td className="px-4 py-3.5 font-semibold text-slate-700">{r.name}</td>
                  <td className="px-4 py-3.5">{r.kebele}</td>
                  <td className="px-4 py-3.5">{tier && <Pill tone={TIER_TONE[tier.tone]}>{r.tier} · {tier.name}</Pill>}</td>
                  <td className="px-4 py-3.5">{r.visits}</td>
                  <td className="px-4 py-3.5">{r.quality}%</td>
                  <td className="px-4 py-3.5">{r.training}%</td>
                  <td className="px-4 py-3.5 text-center">
                    <Pill tone={PERFORMANCE_STATUS_TONE[r.status]}>{r.status}</Pill>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <RowAction icon="view" onClick={() => setViewing(r)}>View</RowAction>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <TablePagination {...paginationProps} itemLabel="DA identifiers" />

      <AdvancedFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        fields={filterFields}
        filters={{ ...filters, tier: tierFilter }}
        onApply={(next) => {
          setFilters({
            agent: next.agent ?? new Set(),
            kebele: next.kebele ?? new Set(),
            status: next.status ?? new Set(),
          });
          onTierFilterChange(next.tier ?? new Set());
        }}
      />

      {viewing && (
        <Modal
          isOpen
          onClose={() => setViewing(null)}
          title={viewing.name}
          subtitle={`${viewing.daId} · ${viewing.kebele}`}
          titleAddon={<Pill tone={PERFORMANCE_STATUS_TONE[viewing.status]}>{viewing.status}</Pill>}
          footer={
            <>
              <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
              <Link
                href="/agents"
                className="inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-md bg-brand-green px-4 text-sm font-semibold text-white hover:bg-brand-green-dark sm:flex-none"
              >
                Open agent registry
              </Link>
            </>
          }
        >
          <div className="flex flex-col gap-4">
            <dl className="grid grid-cols-2 gap-4 sm:grid-cols-3">
              {[
                ["DA-ID", viewing.daId],
                ["Kebele", viewing.kebele],
                ["Tier", viewingTier ? `${viewing.tier} · ${viewingTier.name}` : viewing.tier],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">{label}</dt>
                  <dd className="mt-1 text-[14px] text-ink">{value}</dd>
                </div>
              ))}
            </dl>

            <div className="flex flex-col gap-3">
              {[
                { label: "Visits this period", value: `${viewing.visits}`, pct: Math.min(100, Math.round((viewing.visits / 20) * 100)), hint: `${Math.round((viewing.visits / 20) * 100)}% of 20-visit target` },
                { label: "Quality score", value: `${viewing.quality}%`, pct: viewing.quality },
                { label: "Training completion", value: `${viewing.training}%`, pct: viewing.training },
              ].map((kpi) => (
                <div key={kpi.label}>
                  <div className="flex items-center justify-between text-[13.5px]">
                    <span className="font-medium text-ink">{kpi.label}</span>
                    <span className="font-semibold text-ink">{kpi.value}</span>
                  </div>
                  <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line-soft">
                    <div className="h-full rounded-full bg-brand-green" style={{ width: `${kpi.pct}%` }} />
                  </div>
                  {kpi.hint && <p className="mt-1 text-[12px] text-muted">{kpi.hint}</p>}
                </div>
              ))}
            </div>

            {viewingTier && (
              <p className="rounded-lg bg-surface px-3 py-2.5 text-[12.5px] text-ink-soft">
                <span className="font-semibold text-ink">{viewing.tier} rule:</span> {viewingTier.rule}
              </p>
            )}
          </div>
        </Modal>
      )}
    </Card>
    </div>
  );
}
