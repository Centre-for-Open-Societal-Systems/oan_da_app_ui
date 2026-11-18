"use client";

import { useEffect, useRef, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Checkbox } from "@/components/ui/Checkbox";
import { cn } from "@/lib/utils";
import { ATTENDANCE_AGENTS, getTodayLabel } from "./attendanceData";
import { AgentDropdownMenu } from "./AgentDropdownMenu";

interface ExportAttendanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onExport: (format: string) => void;
  initialDateRange?: string;
  initialSelectedAgentIds?: Set<string>;
}

  export function ExportAttendanceModal(props: ExportAttendanceModalProps) {
    if (!props.isOpen) return null;
    return <ExportAttendanceModalContent {...props} />;
  }

function ExportAttendanceModalContent({
  isOpen,
  onClose,
  onExport,
  initialDateRange = `Today · ${getTodayLabel()}`,
  initialSelectedAgentIds,
}: ExportAttendanceModalProps) {
  const [format, setFormat] = useState<"xlsx" | "pdf" | "csv">("xlsx");
  const [dateRange, setDateRange] = useState(initialDateRange);
  const [dateDropdownOpen, setDateDropdownOpen] = useState(false);

  const [selectedAgentIds, setSelectedAgentIds] = useState<Set<string>>(() =>
    initialSelectedAgentIds && initialSelectedAgentIds.size > 0
      ? new Set(initialSelectedAgentIds)
      : new Set(ATTENDANCE_AGENTS.map((a) => a.id))
  );
  const [agentDropdownOpen, setAgentDropdownOpen] = useState(false);

  const [includeTimes, setIncludeTimes] = useState(true);
  const [includeHours, setIncludeHours] = useState(true);
  const [includeGps, setIncludeGps] = useState(true);
  const [includeNotes, setIncludeNotes] = useState(false);

  const dateDropdownRef = useRef<HTMLDivElement>(null);
  const agentDropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dateDropdownRef.current && !dateDropdownRef.current.contains(e.target as Node)) {
        setDateDropdownOpen(false);
      }
      if (agentDropdownRef.current && !agentDropdownRef.current.contains(e.target as Node)) {
        setAgentDropdownOpen(false);
      }
    }
    if (dateDropdownOpen || agentDropdownOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [dateDropdownOpen, agentDropdownOpen]);

  const allAgentsSelected = selectedAgentIds.size === ATTENDANCE_AGENTS.length;
  const singleAgent =
    selectedAgentIds.size === 1
      ? ATTENDANCE_AGENTS.find((a) => selectedAgentIds.has(a.id))
      : null;

  const agentsLabel = allAgentsSelected
    ? `All agents (${ATTENDANCE_AGENTS.length})`
    : singleAgent
      ? singleAgent.name
      : selectedAgentIds.size === 0
        ? `All agents (${ATTENDANCE_AGENTS.length})`
        : `${selectedAgentIds.size} agents`;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      hideHeader
      className="max-w-[500px] rounded-2xl overflow-visible p-0 shadow-2xl border border-slate-100"
      bodyClassName="p-0 overflow-visible"
    >
      <div className="flex flex-col bg-white rounded-2xl">
        {/* Top Header Section (compact, no duplicate inner padding) */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 pt-4 pb-3.5">
          <div className="flex items-start gap-3">
            {/* Green Download Icon Container */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-brand-green">
              <svg
                className="h-5 w-5"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden="true"
              >
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>

            {/* Title & Subtitle */}
            <div>
              <h2 id="modal-title" className="text-[17px] font-bold text-slate-900 leading-tight">
                Export attendance
              </h2>
              <p className="mt-0.5 text-[12.5px] text-slate-500 leading-snug">
                Download the report for the range and agents you chose.
              </p>
            </div>
          </div>

          {/* Circular Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors cursor-pointer"
            aria-label="Close"
          >
            <svg
              className="h-4 w-4 stroke-[2.5]"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
            >
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        {/* Body Content */}
        <div className="px-5 py-4">
          {/* Format Selector */}
          <div>
            <label className="block text-[13px] font-semibold text-slate-700 mb-2">
              Format
            </label>
            <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-white p-1 text-[13.5px] font-semibold">
              <button
                type="button"
                onClick={() => setFormat("xlsx")}
                className={cn(
                  "rounded-lg py-2 transition-all text-center cursor-pointer",
                  format === "xlsx"
                    ? "bg-brand-green text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-50 font-medium"
                )}
              >
                Excel (.xlsx)
              </button>
              <button
                type="button"
                onClick={() => setFormat("pdf")}
                className={cn(
                  "rounded-lg py-2 transition-all text-center cursor-pointer",
                  format === "pdf"
                    ? "bg-brand-green text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-50 font-medium"
                )}
              >
                PDF
              </button>
              <button
                type="button"
                onClick={() => setFormat("csv")}
                className={cn(
                  "rounded-lg py-2 transition-all text-center cursor-pointer",
                  format === "csv"
                    ? "bg-brand-green text-white shadow-xs"
                    : "text-slate-700 hover:bg-slate-50 font-medium"
                )}
              >
                CSV
              </button>
            </div>
          </div>

          {/* Date range & Agents Row */}
          <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Date range selector */}
            <div className="relative" ref={dateDropdownRef}>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Date range
              </label>
              <button
                type="button"
                onClick={() => {
                  setDateDropdownOpen((o) => !o);
                  setAgentDropdownOpen(false);
                }}
                className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 text-[13.5px] text-slate-800 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
              >
                <span className="truncate">{dateRange}</span>
                <svg
                  className="h-4 w-4 text-slate-500 shrink-0 ml-1.5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                  <line x1="16" y1="2" x2="16" y2="6" />
                  <line x1="8" y1="2" x2="8" y2="6" />
                  <line x1="3" y1="10" x2="21" y2="10" />
                </svg>
              </button>

              {dateDropdownOpen && (
                <div className="absolute left-0 top-full mt-1.5 w-60 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl z-50 animate-dropdown-in text-[13px]">
                  {[
                    `Today · ${getTodayLabel()}`,
                    "This week · 16 – 22 Nov",
                    "This month · Nov 2026",
                    "October 2026",
                    "Custom date range",
                  ].map((opt) => (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => {
                        setDateRange(opt);
                        setDateDropdownOpen(false);
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 rounded-lg font-medium transition-colors cursor-pointer",
                        dateRange === opt
                          ? "bg-emerald-50 text-brand-green font-semibold"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {opt}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Agents dropdown */}
            <div className="relative" ref={agentDropdownRef}>
              <label className="block text-[13px] font-semibold text-slate-700 mb-1.5">
                Agents
              </label>
              <button
                type="button"
                onClick={() => {
                  setAgentDropdownOpen((o) => !o);
                  setDateDropdownOpen(false);
                }}
                className="flex h-10 w-full items-center justify-between rounded-lg border border-slate-200 bg-white px-3.5 text-[13.5px] text-slate-800 shadow-2xs hover:border-slate-300 transition-colors cursor-pointer"
              >
                <span className="truncate">{agentsLabel}</span>
                <svg
                  className={cn(
                    "h-4 w-4 text-slate-500 shrink-0 transition-transform ml-1.5",
                    agentDropdownOpen && "rotate-180"
                  )}
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </button>

              {/* Multi-Agent Dropdown with checkboxes on the LEFT */}
              {agentDropdownOpen && (
                <div className="absolute right-0 top-full mt-1.5 z-50">
                  <AgentDropdownMenu
                    selectedAgentIds={selectedAgentIds}
                    onChange={setSelectedAgentIds}
                    onClose={() => setAgentDropdownOpen(false)}
                  />
                </div>
              )}
            </div>
          </div>

          {/* Include Section */}
          <div className="mt-4">
            <label className="block text-[13px] font-semibold text-slate-700 mb-2.5">
              Include
            </label>
            <div className="flex flex-col gap-2.5 text-[13.5px] text-slate-800 font-medium">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={includeTimes}
                  onChange={(e) => setIncludeTimes(e.target.checked)}
                />
                <span>Check-in and check-out times</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={includeHours}
                  onChange={(e) => setIncludeHours(e.target.checked)}
                />
                <span>Hours worked</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={includeGps}
                  onChange={(e) => setIncludeGps(e.target.checked)}
                />
                <span>GPS location</span>
              </label>
              <label className="flex items-center gap-2.5 cursor-pointer">
                <Checkbox
                  checked={includeNotes}
                  onChange={(e) => setIncludeNotes(e.target.checked)}
                />
                <span>Notes</span>
              </label>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 px-5 py-3.5 bg-white rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 bg-white px-5 py-2 text-[13.5px] font-semibold text-slate-700 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onExport(format);
              onClose();
            }}
            className="rounded-lg bg-brand-green hover:bg-emerald-700 text-white px-5 py-2 text-[13.5px] font-semibold shadow-2xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <svg
              className="h-4 w-4"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
              <polyline points="7 10 12 15 17 10" />
              <line x1="12" y1="15" x2="12" y2="3" />
            </svg>
            <span>Export</span>
          </button>
        </div>
      </div>
    </Modal>
  );
}
