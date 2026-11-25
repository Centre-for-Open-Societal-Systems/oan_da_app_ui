"use client";

import Link from "next/link";
import { Card } from "@/components/ui/Card";

interface AttendanceHeaderProps {
  onExport: () => void;
  onSendReminder: () => void;
  agentName?: string;
  kebele?: string;
}

export function AttendanceHeader({
  onExport,
  onSendReminder,
  agentName = "Tadesse Alemu",
  kebele = "Bako Tibe kebele",
}: AttendanceHeaderProps) {
  return (
    <div className="flex flex-col gap-3">
      {/* Back navigation link */}
      <div>
        <Link
          href="/agents"
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-ink transition-colors"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M19 12H5M12 19l-7-7 7-7" />
          </svg>
          Back
        </Link>
      </div>

      {/* Header Card matching media_1794915975253_728f3177.png */}
      <Card className="rounded-2xl border border-line bg-white px-5 py-4 sm:px-6 sm:py-5 shadow-card">
        <div className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[20px] sm:text-[22px] font-bold tracking-tight text-ink">
              Team attendance
            </h1>
            <p className="mt-1 text-[13px] text-slate-500">
              {agentName} · Development Agent · {kebele} · Q4 2026
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={onExport}
              className="inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 sm:px-4 text-[13px] sm:text-[13.5px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-ink"
            >
              <svg className="h-4 w-4 shrink-0 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              <span>Export</span>
            </button>

            <button
              type="button"
              onClick={onSendReminder}
              className="inline-flex h-9 sm:h-10 items-center justify-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 sm:px-4 text-[13px] sm:text-[13.5px] font-semibold text-slate-700 shadow-sm transition-colors hover:bg-slate-50 hover:text-ink"
            >
              <svg className="h-4 w-4 shrink-0 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" />
              </svg>
              <span>Send reminder</span>
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
}
