"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { AdvancedFiltersDrawer, type FilterFieldConfig, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import type { FilterOption } from "@/components/ui/FilterDropdown";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/store/useAuthStore";
import {
  FIGURES_STATUS_TONE,
  TEAM_MEMBERS,
  TEAM_SUMMARY,
  WOREDA_SUMMARY,
  achievementTone,
  type TeamMemberRow,
} from "@/features/performance";
import { FigureEntryModal } from "./FigureEntryModal";
import { SendReminderModal } from "./SendReminderModal";

const SEARCH_PLACEHOLDER = searchPlaceholder(["Agent", "Kebele", "Role", "Tikimt figures"]);

export const BAR: Record<ReturnType<typeof achievementTone>, { bar: string; track: string; text: string }> = {
  green: { bar: "bg-brand-green", track: "bg-brand-mint", text: "text-brand-green" },
  amber: { bar: "bg-orange-600", track: "bg-orange-100", text: "text-orange-600" },
  red: { bar: "bg-danger", track: "bg-red-100", text: "text-danger" },
};

const optionsOf = (values: string[]): FilterOption[] =>
  [...new Set(values)].sort().map((value) => ({ value, label: value, count: values.filter((v) => v === value).length }));

const initials = (name: string) => name.split(" ").map((p) => p[0]).slice(0, 2).join("");

interface TeamFilters extends FilterSelection {
  kebele: Set<string>;
  role: Set<string>;
  figures: Set<string>;
}
const EMPTY: TeamFilters = { kebele: new Set(), role: new Set(), figures: new Set() };

// "…" row menu for agents whose figures are already in.
function RowMenu({ row, onRemind }: { row: TeamMemberRow; onRemind: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, [open]);

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-label={`Actions for ${row.name}`}
        aria-expanded={open}
        className="flex h-8 w-8 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-zinc-100 hover:text-ink"
      >
        <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
          <circle cx="5" cy="12" r="1.6" /><circle cx="12" cy="12" r="1.6" /><circle cx="19" cy="12" r="1.6" />
        </svg>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 w-44 overflow-hidden rounded-lg border border-line bg-white py-1 text-left text-[13.5px] shadow-lg">
          {[
            ["View targets", "targets"],
            ["Monthly figures", "figures"],
            ["Appraisal", "appraisal"],
          ].map(([label, tab]) => (
            <Link key={tab} href={`/performance/teams/targets?agent=${encodeURIComponent(row.name)}&tab=${tab}`} className="block px-4 py-2.5 text-ink hover:bg-surface">
              {label}
            </Link>
          ))}
          <div className="my-1 border-t border-line" />
          <button type="button" onClick={() => { setOpen(false); onRemind(); }} className="block w-full px-4 py-2.5 text-left text-ink hover:bg-surface">
            Send reminder
          </button>
        </div>
      )}
    </div>
  );
}

// Supervisor's My Team: Tikimt figures status, half-year progress and waiting target discussions per agent.
export function SupervisorTeam() {
  const name = useAuthStore((s) => s.user?.name) ?? "Tadesse Alemu";
  const [members, setMembers] = useState<TeamMemberRow[]>(TEAM_MEMBERS);
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<TeamFilters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [entering, setEntering] = useState<TeamMemberRow | null>(null);
  // `true` = reminder to the whole pending group; a row = reminder to that agent only.
  const [reminder, setReminder] = useState<true | TeamMemberRow | null>(null);

  const has = (set: Set<string>, value: string) => set.size === 0 || set.has(value);
  const rows = members.filter(
    (m) => has(filters.kebele, m.kebele) && has(filters.role, m.role) && has(filters.figures, m.figures) && matchesQuery(query, m),
  );
  const { pageRows, paginationProps } = usePagination(rows);
  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;

  const filterFields: FilterFieldConfig[] = [
    { key: "kebele", label: "Kebele", allLabel: "All Kebele", placeholder: "All Kebele", options: optionsOf(members.map((m) => m.kebele)) },
    { key: "role", label: "Role", allLabel: "All Role", placeholder: "All Role", options: optionsOf(members.map((m) => m.role)) },
    { key: "figures", label: TEAM_SUMMARY.figuresMonth, allLabel: `All ${TEAM_SUMMARY.figuresMonth}`, placeholder: `All ${TEAM_SUMMARY.figuresMonth}`, options: optionsOf(members.map((m) => m.figures)) },
  ];

  const saveFigures = (row: TeamMemberRow) => {
    setMembers((prev) => prev.map((m) => (m.id === row.id ? { ...m, figures: "In · by you" } : m)));
    setNotice(`Saved ${TEAM_SUMMARY.figuresMonth} figures for ${row.name}.`);
    setEntering(null);
  };

  const stats = [
    { label: `${TEAM_SUMMARY.figuresMonth} figures in`, value: `${TEAM_SUMMARY.figuresIn} of ${TEAM_SUMMARY.figuresTotal}`, note: TEAM_SUMMARY.figuresDue, tone: "text-ink" },
    { label: "Team achievement", value: `${TEAM_SUMMARY.achievement}%`, note: TEAM_SUMMARY.cycle, tone: "text-brand-green" },
    { label: "Discussions waiting", value: String(TEAM_SUMMARY.discussionsWaiting), note: `Oldest ${TEAM_SUMMARY.oldestWaitingDays} days`, tone: "text-orange-700" },
    { label: "Entered by you this month", value: String(TEAM_SUMMARY.enteredByYou), note: "Agents without network", tone: "text-ink" },
  ];

  return (
    <div className="flex w-full flex-col gap-4">
      <PageHeader
        title="My Team"
        showDescription
        description={`${name} · Woreda Supervisor · ${WOREDA_SUMMARY.woreda} · ${TEAM_SUMMARY.cycle}`}
        actions={
          <>
            <Button variant="outline" className="h-10 px-5 font-semibold" onClick={() => setReminder(true)}>
              Send reminder
            </Button>
            <Link href="/performance/teams/targets" className="inline-flex h-10 items-center whitespace-nowrap rounded-md bg-brand-green px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-green-dark">
              Set targets
            </Link>
          </>
        }
      />

      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label} className="px-5 py-4 shadow-card">
            <p className="text-[13.5px] text-ink-soft">{s.label}</p>
            <p className={cn("mt-1 text-[28px] font-bold leading-tight", s.tone)}>{s.value}</p>
            <p className="mt-1 text-[12.5px] text-ink-soft">{s.note}</p>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-ink">Team Performance</h2>
            <p className="mt-0.5 text-[12.5px] text-ink-soft">Review agent submissions, track progress and follow up on discussions.</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />
            <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-collapse text-left">
            <thead>
              <tr className="border-y border-line bg-surface text-[13px] font-semibold text-slate-500">
                <th className="px-4 py-3 text-center font-semibold">S.No.</th>
                <th className="px-4 py-3 font-semibold">Agent</th>
                <th className="px-4 py-3 font-semibold">Kebele</th>
                <th className="px-4 py-3 font-semibold">Role</th>
                <th className="px-4 py-3 font-semibold">{TEAM_SUMMARY.figuresMonth} figures</th>
                <th className="px-4 py-3 font-semibold">Half-year so far</th>
                <th className="px-4 py-3 font-semibold">Discussions</th>
                <th className="px-4 py-3 text-center font-semibold">Action</th>
              </tr>
            </thead>
            <tbody className="text-[14px] text-slate-700">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-6"><EmptyState title="No agents match the selected filters" hint="Clear a filter or try a different search." /></td>
                </tr>
              )}
              {pageRows.map((m) => {
                const tone = BAR[achievementTone(m.halfYear)];
                return (
                  <tr key={m.id} className="border-b border-line-soft transition-colors last:border-0 hover:bg-surface">
                    <td className="px-4 py-3.5 text-center">{m.no}</td>
                    <td className="px-4 py-3.5">
                      <span className="flex items-center gap-3 font-semibold text-ink">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-mint text-[12px] font-bold text-brand-green">{initials(m.name)}</span>
                        {m.name}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">{m.kebele}</td>
                    <td className="px-4 py-3.5">{m.role}</td>
                    <td className="px-4 py-3.5"><Pill tone={FIGURES_STATUS_TONE[m.figures]} className="px-2.5 py-0.5 text-[12.5px]">{m.figures}</Pill></td>
                    <td className="px-4 py-3.5">
                      <div className="w-[172px]">
                        <p className={cn("text-right text-[12px] font-medium", tone.text)}>{m.halfYear}%</p>
                        <div className={cn("h-1.5 overflow-hidden rounded-full", tone.track)}>
                          <div className={cn("h-full rounded-full", tone.bar)} style={{ width: `${m.halfYear}%` }} />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3.5">
                      {m.waiting > 0 ? <Pill tone="amber" className="px-2.5 py-0.5 text-[12.5px]">{m.waiting} waiting</Pill> : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {m.figures === "Not yet" ? (
                        <button type="button" onClick={() => setEntering(m)} className="text-[14px] font-semibold text-brand-green hover:underline">Fill in</button>
                      ) : (
                        <RowMenu row={m} onRemind={() => setReminder(m)} />
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <TablePagination {...paginationProps} itemLabel="results" />
      </Card>

      {entering && <FigureEntryModal agent={entering} onClose={() => setEntering(null)} onSave={() => saveFigures(entering)} />}
      {reminder && (
        <SendReminderModal
          senderName={name}
          members={members}
          agent={reminder === true ? undefined : reminder}
          onClose={() => setReminder(null)}
          onSend={(summary) => setNotice(`Reminder sent to ${summary}.`)}
        />
      )}

      <AdvancedFiltersDrawer
        isOpen={isFiltersOpen}
        onClose={() => setIsFiltersOpen(false)}
        fields={filterFields}
        filters={filters}
        onApply={(next) => setFilters({ kebele: next.kebele ?? new Set(), role: next.role ?? new Set(), figures: next.figures ?? new Set() })}
      />
    </div>
  );
}
