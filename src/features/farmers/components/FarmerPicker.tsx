"use client";

import type { Farmer } from "../types";
import { FarmerAvatar } from "./FarmerAvatar";
import { registryCode } from "./planVisit";

interface FarmerPickerProps {
  selected: Farmer | undefined;
  onSelect: (farmer: Farmer | undefined) => void;
  matches: Farmer[];
  query: string;
  /** True once a search ran for the current (non-empty) term — shows the match count. */
  showCount: boolean;
  onClearSearch: () => void;
}

// The picked farmer, or the search results / no-match message.
export function FarmerPicker({ selected, onSelect, matches, query, showCount, onClearSearch }: FarmerPickerProps) {
  return (
    <div className="flex flex-col gap-2">
      <p className="text-[14px] font-medium text-ink">
        Farmer <span className="text-danger">*</span>
      </p>
      {selected ? (
        <div className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-mint px-3.5 py-3">
          <FarmerAvatar name={selected.name} avatar={selected.avatar} className="h-9 w-9 text-[13px] bg-white" />
          <div className="min-w-0 flex-1">
            <p className="text-[14.5px] font-semibold text-ink">{selected.name}</p>
            <p className="mt-0.5 truncate text-[13px] text-slate-600">
              {registryCode(selected)} · {selected.kebele} · {selected.crop} {selected.landHa} ha · {selected.livestock} {selected.livestockHeads} heads · last visit 34 days ago
            </p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(undefined)}
            className="h-8 rounded-md border border-brand-green bg-white px-3 text-[13px] font-semibold text-brand-green transition-colors hover:bg-brand-wash"
          >
            Change
          </button>
        </div>
      ) : matches.length === 0 && !query.trim() ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-surface px-4 py-5 text-center text-[14px] font-semibold text-ink">No farmer assigned</p>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-surface px-4 py-5 text-center">
          <p className="text-[14px] font-semibold text-ink">No farmers match &ldquo;{query.trim()}&rdquo;</p>
          <p className="text-[13px] text-muted">Check the spelling, or search by phone number or kebele.</p>
          <button type="button" onClick={onClearSearch} className="mt-1 text-[13px] font-semibold text-brand-green hover:underline">
            Clear search
          </button>
        </div>
      ) : (
        <ul className="overflow-hidden rounded-lg border border-line">
          {showCount && (
            <li className="border-b border-line-soft bg-surface px-3.5 py-2 text-[12.5px] text-muted" aria-live="polite">
              {matches.length} farmer{matches.length === 1 ? "" : "s"} match &ldquo;{query.trim()}&rdquo;
            </li>
          )}
          {matches.map((f) => (
            <li key={f.id} className="border-b border-line-soft last:border-0">
              <button
                type="button"
                onClick={() => onSelect(f)}
                className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface"
              >
                <FarmerAvatar name={f.name} avatar={f.avatar} />
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] font-medium text-ink">{f.name}</span>
                  <span className="block truncate text-[12.5px] text-muted">
                    {registryCode(f)} · {f.kebele} · {f.crop} {f.landHa} ha · {f.livestock} {f.livestockHeads} heads
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
