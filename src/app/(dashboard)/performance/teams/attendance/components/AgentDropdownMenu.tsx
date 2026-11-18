"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import { ATTENDANCE_AGENTS, type AttendanceAgent } from "./attendanceData";

interface AgentDropdownMenuProps {
  selectedAgentIds: Set<string>;
  onChange: (next: Set<string>) => void;
  onClose: () => void;
  className?: string;
}

export function AgentDropdownMenu({
  selectedAgentIds,
  onChange,
  onClose,
  className,
}: AgentDropdownMenuProps) {
  const [search, setSearch] = useState("");

  const filteredAgents = ATTENDANCE_AGENTS.filter(
    (a) =>
      a.name.toLowerCase().includes(search.toLowerCase()) ||
      a.role.toLowerCase().includes(search.toLowerCase()) ||
      a.kebele.toLowerCase().includes(search.toLowerCase())
  );

  const allSelected = selectedAgentIds.size === ATTENDANCE_AGENTS.length;

  const toggleAgent = (id: string) => {
    const next = new Set(selectedAgentIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    onChange(next);
  };

  const handleSelectAllToggle = () => {
    if (allSelected) {
      onChange(new Set());
    } else {
      onChange(new Set(ATTENDANCE_AGENTS.map((a) => a.id)));
    }
  };

  const handleClear = () => {
    onChange(new Set());
  };

  const handleApply = () => {
    if (selectedAgentIds.size === 0) {
      // If user cleared and clicked apply, default to all agents for convenience
      onChange(new Set(ATTENDANCE_AGENTS.map((a) => a.id)));
    }
    onClose();
  };

  return (
    <div
      className={cn(
        "w-80 sm:w-88 rounded-xl border border-slate-200 bg-white shadow-xl animate-dropdown-in z-50 overflow-hidden",
        className
      )}
      onClick={(e) => e.stopPropagation()}
    >
      {/* Search Input */}
      <div className="p-3 border-b border-slate-100">
        <div className="relative">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="7" />
            <path d="M20 20l-3.5-3.5" />
          </svg>
          <input
            type="search"
            placeholder="Search agents"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 text-[13px] text-slate-900 placeholder:text-slate-400 focus:border-brand-green focus:outline-none"
          />
        </div>
      </div>

      {/* Select All Agents Header */}
      <div
        onClick={handleSelectAllToggle}
        className="flex items-center justify-between px-3.5 py-2.5 border-b border-slate-100 bg-white cursor-pointer hover:bg-slate-50/80 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {/* Custom Checkbox on LEFT */}
          <div
            className={cn(
              "flex h-[18px] w-[18px] items-center justify-center rounded-[4px] border transition-colors",
              allSelected
                ? "bg-brand-green border-brand-green text-white"
                : "border-slate-300 bg-white"
            )}
          >
            {allSelected && (
              <svg className="h-3 w-3 stroke-[3.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
                <path d="M5 13l4 4L19 7" />
              </svg>
            )}
          </div>
          <span className="font-bold text-[14px] text-slate-900">Select all agents</span>
        </div>
        <span className="text-slate-500 font-medium text-[13px]">{ATTENDANCE_AGENTS.length}</span>
      </div>

      {/* Agents Scrollable List */}
      <div className="max-h-64 overflow-y-auto green-scrollbar divide-y divide-slate-100/50">
        {filteredAgents.map((agent: AttendanceAgent) => {
          const isChecked = selectedAgentIds.has(agent.id);

          return (
            <div
              key={agent.id}
              onClick={() => toggleAgent(agent.id)}
              className={cn(
                "flex items-center gap-3 px-3.5 py-2.5 cursor-pointer transition-colors text-[13px]",
                isChecked ? "bg-[#ecfdf3]" : "bg-white hover:bg-slate-50"
              )}
            >
              {/* Checkbox on LEFT */}
              <div
                className={cn(
                  "flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-[4px] border transition-colors",
                  isChecked
                    ? "bg-brand-green border-brand-green text-white"
                    : "border-slate-300 bg-white"
                )}
              >
                {isChecked && (
                  <svg className="h-3 w-3 stroke-[3.5]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round">
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>

              {/* Agent Initials */}
              <span className="w-6 shrink-0 text-center font-bold text-[13.5px] text-emerald-700">
                {agent.initials}
              </span>

              {/* Agent Name & Role */}
              <div className="min-w-0 flex-1 leading-tight">
                <p className="font-semibold text-slate-900 text-[13.5px] truncate">
                  {agent.name}
                </p>
                <p className="text-[12px] text-slate-500 truncate mt-0.5">
                  {agent.role}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between border-t border-slate-100 p-3 bg-white">
        <span className="text-[13px] text-slate-500 font-medium">
          {selectedAgentIds.size} agent{selectedAgentIds.size === 1 ? "" : "s"} selected
        </span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleClear}
            className="rounded-lg border border-slate-200 bg-white px-3.5 py-1.5 text-[13px] font-semibold text-slate-700 hover:bg-slate-50 shadow-2xs cursor-pointer transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={handleApply}
            className="rounded-lg bg-brand-green px-4 py-1.5 text-[13px] font-semibold text-white hover:bg-emerald-700 shadow-2xs cursor-pointer transition-colors"
          >
            Apply
          </button>
        </div>
      </div>
    </div>
  );
}
