"use client";

import { useState } from "react";
import Link from "next/link";
import { BackLink } from "@/components/ui/BackLink";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { TablePagination, usePagination } from "@/components/ui/TablePagination";
import { cn } from "@/lib/utils";
import {
  HISTORY_AGENT,
  HISTORY_CATEGORIES,
  HISTORY_EVENTS,
  HISTORY_PERIODS,
  type HistoryCategory,
} from "@/features/performance";
import { RadioFilterPopup } from "./RadioFilterPopup";

const ALL = "All Active";

const STYLE: Record<HistoryCategory, { border: string; icon: string; tag: PillTone; path: string; href: string }> = {
  Recognition: { border: "border-l-orange-700", icon: "bg-orange-50 text-orange-700", tag: "green", path: "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM7 6H4a2 2 0 002 4M17 6h3a2 2 0 01-2 4", href: "/reviews" },
  Training: { border: "border-l-blue-600", icon: "bg-blue-100 text-blue-700", tag: "blue", path: "M22 10L12 5 2 10l10 5 10-5zM6 12v5c3 3 9 3 12 0v-5", href: "/training" },
  Coaching: { border: "border-l-slate-600", icon: "bg-slate-100 text-slate-600", tag: "slate", path: "M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75", href: "/reviews" },
  Goals: { border: "border-l-orange-500", icon: "bg-orange-50 text-orange-600", tag: "amber", path: "M23 6l-9.5 9.5-5-5L1 18M17 6h6v6", href: "/performance/teams/targets?tab=goals" },
  Reviews: { border: "border-l-brand-green", icon: "bg-brand-mint text-brand-green", tag: "green", path: "M12 2l3.1 6.3 6.9 1-5 4.9 1.2 6.8L12 17.8 5.8 21l1.2-6.8-5-4.9 6.9-1L12 2z", href: "/reviews" },
};

// A goal handed to the agent reads as neutral: slate border, target icon.
const ASSIGNED = { ...STYLE.Goals, border: "border-l-slate-600", icon: "bg-slate-100 text-slate-600", tag: "slate" as PillTone, path: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 17a5 5 0 100-10 5 5 0 000 10zM12 13a1 1 0 100-2 1 1 0 000 2z" };

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00`).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });

// Full performance record of an agent: recognitions, trainings, coaching, goals and reviews on one timeline.
export function ReviewHistory() {
  const [period, setPeriod] = useState(HISTORY_PERIODS[0].value);
  const [category, setCategory] = useState(ALL);

  const range = HISTORY_PERIODS.find((p) => p.value === period) ?? HISTORY_PERIODS[0];
  const events = HISTORY_EVENTS.filter((e) => e.date >= range.from && e.date <= range.to && (category === ALL || e.category === category));
  const { pageRows, paginationProps } = usePagination(events);

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink href="/reviews" />

      <Card className="relative z-30 flex flex-col gap-4 px-5 py-4 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-[24px] font-bold tracking-tight text-ink">Review history</h1>
          <p className="mt-1 text-[14px] text-ink-soft">Complete performance record - {HISTORY_AGENT.name}, {HISTORY_AGENT.role}</p>
        </div>
        <RadioFilterPopup
          label="Period"
          value={period}
          onChange={setPeriod}
          withApply
          options={HISTORY_PERIODS.map((p) => ({ value: p.value, label: p.label, badge: p.badge }))}
          className="w-[250px]"
          menuClassName="w-[300px]"
        />
      </Card>

      <Card className="flex min-h-[640px] flex-col overflow-hidden p-0 shadow-card">
        <div className="relative z-20 flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div className="flex items-center gap-3.5">
            <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-tint text-brand-green">
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM12 13v3l2 1" />
              </svg>
            </span>
            <div>
              <h2 className="text-[19px] font-bold text-ink">Activity Timeline</h2>
              <p className="text-[13px] text-ink-soft">Recent activities, reviews, and milestones</p>
            </div>
          </div>
          <RadioFilterPopup
            label="Activity type"
            value={category}
            onChange={setCategory}
            options={[ALL, ...HISTORY_CATEGORIES].map((c) => ({ value: c, label: c }))}
            className="w-[160px]"
            menuClassName="w-[200px]"
          />
        </div>

        <ul className="flex flex-col gap-3 p-4">
          {events.length === 0 && <li><EmptyState title="No activity in this period" hint="Pick another period or activity type." /></li>}
          {pageRows.map((e) => {
            const s = e.kind === "assigned" ? ASSIGNED : STYLE[e.category];
            return (
              <li key={e.id} className={cn("flex items-center gap-4 rounded-lg border border-line border-l-4 bg-white px-5 py-3.5 shadow-sm", s.border)}>
                <span className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-full", s.icon)}>
                  <svg className="h-[18px] w-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={s.path} /></svg>
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <Pill tone={s.tag} className="px-2.5 py-0 text-[11px] font-bold uppercase tracking-wide">{e.category}</Pill>
                    <span className="text-[12.5px] text-muted">{fmtDate(e.date)}</span>
                  </div>
                  <p className="mt-1.5 text-[15.5px] font-semibold text-ink">{e.title}</p>
                  <p className="mt-0.5 text-[13px] text-ink-soft">{e.detail}</p>
                  <p className="mt-1.5 text-[12px] text-muted">Recorded by: <span className="font-semibold text-slate-600">{e.recordedBy}</span></p>
                </div>
                <Link href={s.href} aria-label={`Open ${e.title}`} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-line text-slate-500 transition-colors hover:bg-surface hover:text-ink">
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 6l6 6-6 6" /></svg>
                </Link>
              </li>
            );
          })}
        </ul>

        <div className="mt-auto">{events.length > paginationProps.pageSize && <TablePagination {...paginationProps} itemLabel="activities" />}</div>
      </Card>
    </div>
  );
}
