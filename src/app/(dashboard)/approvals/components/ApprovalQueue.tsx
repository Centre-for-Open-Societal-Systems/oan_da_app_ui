"use client";

import { Card } from "@/components/ui/Card";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/lib/utils";
import { APPROVAL_TABS, type ApprovalRequest, type ApprovalTab } from "@/features/agents";
import { ApprovalQueueItem } from "./ApprovalQueueItem";

interface ApprovalQueueProps {
  tab: ApprovalTab;
  onTabChange: (tab: ApprovalTab) => void;
  woreda: string;
  onWoredaChange: (woreda: string) => void;
  /** The Woredas present in the queue (area-master code → name). */
  woredas: DropdownOption[];
  list: ApprovalRequest[];
  selectedId: string | undefined;
  onSelect: (id: string) => void;
  checked: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: () => void;
  allChecked: boolean;
  checkableCount: number;
  checkedInView: ApprovalRequest[];
  /** False while a decision is being saved or for a role that may only read the queue. */
  canDecide: boolean;
  onApprove: (ids: string[]) => void;
  onReject: (ids: string[]) => void;
}

// Queue: bulk actions, kind tabs, Woreda filter and the request list.
export function ApprovalQueue({
  tab,
  onTabChange,
  woreda,
  onWoredaChange,
  woredas,
  list,
  selectedId,
  onSelect,
  checked,
  onToggle,
  onToggleAll,
  allChecked,
  checkableCount,
  checkedInView,
  canDecide,
  onApprove,
  onReject,
}: ApprovalQueueProps) {
  const ids = checkedInView.map((r) => r.id);
  const bulkDisabled = checkedInView.length === 0 || !canDecide;
  return (
    <Card className="flex flex-col overflow-hidden p-0 shadow-card">
      {/* Bulk actions */}
      <div className="flex items-center justify-between gap-2 px-4 py-3">
        <label className="flex items-center gap-2.5 text-[13px] font-semibold text-brand-green">
          <Checkbox checked={allChecked} disabled={checkableCount === 0} aria-label="Select all open requests" onChange={onToggleAll} />
          <span className={cn(checkedInView.length === 0 && "text-muted")}>{checkedInView.length} selected</span>
        </label>
        <div className="flex items-center gap-2">
          <button
            type="button"
            disabled={bulkDisabled}
            onClick={() => onApprove(ids)}
            className="h-8 rounded-md bg-brand-green px-3 text-[12.5px] font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:cursor-not-allowed disabled:opacity-50"
          >
            Approve
          </button>
          <button
            type="button"
            disabled={bulkDisabled}
            onClick={() => onReject(ids)}
            className="h-8 rounded-md border border-danger bg-white px-3 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger-wash disabled:cursor-not-allowed disabled:opacity-50"
          >
            Reject
          </button>
        </div>
      </div>

      {/* Kind tabs */}
      <div role="tablist" className="flex flex-wrap border-y border-line">
        {APPROVAL_TABS.map((t) => {
          const active = t.key === tab;
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => onTabChange(t.key)}
              className={cn(
                "shrink-0 whitespace-nowrap px-4 py-3.5 text-[14px] font-medium transition-colors",
                active ? "-mb-px border-b-2 border-brand-green bg-brand-wash text-brand-green" : "text-ink-soft hover:text-ink",
              )}
            >
              {t.label}
            </button>
          );
        })}
      </div>

      <div className="px-3 py-3">
        <Dropdown
          value={woreda}
          onChange={onWoredaChange}
          options={[{ value: "", label: "All Woredas" }, ...woredas]}
          className="[&>button]:h-10"
          renderValue={(o) => (
            <span className="flex items-center gap-2 text-[13px] text-ink">
              <svg className="h-4 w-4 shrink-0 text-slate-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0116 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
              Woreda: {o.label}
            </span>
          )}
        />
      </div>

      {list.length === 0 ? (
        <EmptyState title="Queue is clear" hint="No requests match this tab and Woreda." />
      ) : (
        <ul className="divide-y divide-line border-t border-line">
          {list.map((r) => (
            <ApprovalQueueItem
              key={r.id}
              request={r}
              active={selectedId === r.id}
              checked={checked.has(r.id)}
              onToggle={() => onToggle(r.id)}
              onSelect={() => onSelect(r.id)}
            />
          ))}
        </ul>
      )}
    </Card>
  );
}
