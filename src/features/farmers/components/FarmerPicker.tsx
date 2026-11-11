"use client";

import type { Farmer } from "../types";
import { FarmerAvatar } from "./FarmerAvatar";
import { MAX_BATCH_FARMERS, registryCode } from "./planVisit";

interface FarmerPickerProps {
  /** The picked farmers, at most MAX_BATCH_FARMERS: one visit is planned for each. */
  selected: Farmer[];
  /** Adds a farmer from the results, or removes them when already picked. */
  onToggle: (farmer: Farmer) => void;
  onRemove: (farmer: Farmer) => void;
  /** True once MAX_BATCH_FARMERS farmers are picked: the results can no longer add one. */
  isFull: boolean;
  matches: Farmer[];
  /** Shown when there are no farmers at all, e.g. "No farmer assigned" or the loading text. */
  emptyText: string;
  query: string;
  /** True once a search ran for the current (non-empty) term — shows the match count. */
  showCount: boolean;
  onClearSearch: () => void;
}

// The picked farmers, then the search results / no-match message to add more (results show while nothing is picked
// or a search term is typed).
export function FarmerPicker({ selected, onToggle, onRemove, isFull, matches, emptyText, query, showCount, onClearSearch }: FarmerPickerProps) {
  const showResults = selected.length === 0 || query.trim() !== "";
  const isPicked = (f: Farmer) => selected.some((s) => s.id === f.id);

  return (
    <div className="flex flex-col gap-2">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-[14px] font-medium text-ink">
          Farmers <span className="text-danger">*</span>
        </p>
        <p className={isFull ? "text-[12.5px] font-medium text-orange-600" : "text-[12.5px] text-muted"} aria-live="polite">
          {selected.length} of {MAX_BATCH_FARMERS} selected · You can select up to {MAX_BATCH_FARMERS} farmers
        </p>
      </div>

      {selected.length > 0 && (
        <ul className="flex flex-col gap-2">
          {selected.map((f) => (
            <li key={f.id} className="flex items-center gap-3 rounded-lg border border-brand-border bg-brand-mint px-3.5 py-3">
              <FarmerAvatar name={f.name} avatar={f.avatar} className="h-9 w-9 text-[13px] bg-white" />
              <div className="min-w-0 flex-1">
                <p className="text-[14.5px] font-semibold text-ink">{f.name}</p>
                <p className="mt-0.5 truncate text-[13px] text-slate-600">
                  {registryCode(f)} · {f.kebele} · {f.crop} {f.landHa} ha · {f.livestock} {f.livestockHeads} heads
                </p>
              </div>
              <button
                type="button"
                onClick={() => onRemove(f)}
                className="h-8 rounded-md border border-brand-green bg-white px-3 text-[13px] font-semibold text-brand-green transition-colors hover:bg-brand-wash"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}

      {!showResults ? (
        <p className="text-[12.5px] text-muted">{isFull ? "Remove a farmer to add another." : "Search above to add more farmers to this visit."}</p>
      ) : matches.length === 0 && !query.trim() ? (
        <p className="rounded-lg border border-dashed border-slate-300 bg-surface px-4 py-5 text-center text-[14px] font-semibold text-ink">{emptyText}</p>
      ) : matches.length === 0 ? (
        <div className="flex flex-col items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-surface px-4 py-5 text-center">
          <p className="text-[14px] font-semibold text-ink">No farmers match &ldquo;{query.trim()}&rdquo;</p>
          <p className="text-[13px] text-muted">Check the spelling, or search by phone number or kebele.</p>
          <button type="button" onClick={onClearSearch} className="mt-1 text-[13px] font-semibold text-brand-green hover:underline">
            Clear search
          </button>
        </div>
      ) : (
        <ul className="max-h-[260px] overflow-y-auto rounded-lg border border-line">
          {showCount && (
            <li className="border-b border-line-soft bg-surface px-3.5 py-2 text-[12.5px] text-muted" aria-live="polite">
              {matches.length} farmer{matches.length === 1 ? "" : "s"} match &ldquo;{query.trim()}&rdquo;
            </li>
          )}
          {matches.map((f) => {
            const picked = isPicked(f);
            const blocked = !picked && isFull;
            return (
              <li key={f.id} className="border-b border-line-soft last:border-0">
                <button
                  type="button"
                  onClick={() => onToggle(f)}
                  disabled={blocked}
                  aria-pressed={picked}
                  title={blocked ? `You can select up to ${MAX_BATCH_FARMERS} farmers` : undefined}
                  className="flex w-full items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-transparent"
                >
                  <FarmerAvatar name={f.name} avatar={f.avatar} />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[14px] font-medium text-ink">{f.name}</span>
                    <span className="block truncate text-[12.5px] text-muted">
                      {registryCode(f)} · {f.kebele} · {f.crop} {f.landHa} ha · {f.livestock} {f.livestockHeads} heads
                    </span>
                  </span>
                  {picked && <span className="shrink-0 text-[12.5px] font-semibold text-brand-green">Selected ✓</span>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
