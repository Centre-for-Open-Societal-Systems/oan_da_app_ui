"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { todayIso } from "@/lib/utils";
import type { Farmer } from "../types";
import { FarmerAvatar } from "./FarmerAvatar";
import { formatWhen, registryCode } from "./planVisit";
import { summarizeDetails, VisitItemFields, type VisitItemDetails } from "./VisitItemFields";

interface SelectedFarmerCardProps {
  farmer: Farmer;
  onRemove: (farmer: Farmer) => void;
  /** Batch only: this farmer's own details, or undefined while they use the common form. */
  details?: VisitItemDetails;
  /** Batch only: saves (or with null clears) this farmer's own details. Absent for a single farmer. */
  onDetailsChange?: (farmer: Farmer, details: VisitItemDetails | null) => void;
  /** The common form's current values, to start editing from. */
  readCommon?: () => VisitItemDetails;
}

const problemOf = (d: VisitItemDetails) =>
  !d.date ? "Choose a date." : d.date < todayIso() ? "You cannot select past date for visit." : !d.time ? "Choose a time." : !d.purpose.trim() ? "Enter the purpose." : null;

// A picked farmer. In a batch, "Edit details" gives the farmer a date, time, type… of their own instead of the
// common details below the list.
export function SelectedFarmerCard({ farmer, onRemove, details, onDetailsChange, readCommon }: SelectedFarmerCardProps) {
  const [draft, setDraft] = useState<VisitItemDetails | null>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const canEdit = !!onDetailsChange && !!readCommon;

  const save = () => {
    if (!draft) return;
    const p = problemOf(draft);
    if (p) return setProblem(p);
    onDetailsChange!(farmer, { ...draft, purpose: draft.purpose.trim() });
    setDraft(null);
    setProblem(null);
  };

  return (
    <li className="rounded-lg border border-brand-border bg-brand-mint px-3.5 py-3">
      <div className="flex items-center gap-3">
        <FarmerAvatar name={farmer.name} avatar={farmer.avatar} className="h-9 w-9 bg-white text-[13px]" />
        <div className="min-w-0 flex-1">
          <p className="text-[14.5px] font-semibold text-ink">{farmer.name}</p>
          <p className="mt-0.5 truncate text-[13px] text-slate-600">
            {registryCode(farmer)} · {farmer.kebele} · {farmer.crop} {farmer.landHa} ha · {farmer.livestock} {farmer.livestockHeads} heads
          </p>
          {canEdit && !draft && (
            <p className="mt-1 truncate text-[12.5px]">
              {details ? (
                <>
                  <span className="mr-1.5 rounded bg-white px-1.5 py-0.5 text-[11.5px] font-semibold text-brand-green">Own details</span>
                  <span className="text-ink-soft">{summarizeDetails(details, formatWhen(details.date, details.time))}</span>
                </>
              ) : (
                <span className="text-muted">Uses the visit details below</span>
              )}
            </p>
          )}
        </div>
        {!draft && (
          <div className="flex shrink-0 items-center gap-1.5">
            {canEdit && (
              <button
                type="button"
                onClick={() => setDraft(details ?? readCommon!())}
                className="h-8 rounded-md border border-brand-green bg-white px-3 text-[13px] font-semibold text-brand-green transition-colors hover:bg-brand-wash"
              >
                Edit details
              </button>
            )}
            <button
              type="button"
              onClick={() => onRemove(farmer)}
              className="h-8 rounded-md border border-brand-green bg-white px-3 text-[13px] font-semibold text-brand-green transition-colors hover:bg-brand-wash"
            >
              Remove
            </button>
          </div>
        )}
      </div>

      {draft && (
        <div className="mt-3 flex flex-col gap-3 rounded-lg border border-line bg-white p-3">
          <VisitItemFields idPrefix={`own-${farmer.id}`} value={draft} onChange={(patch) => setDraft((d) => d && { ...d, ...patch })} />
          {problem && <p className="text-[12.5px] text-danger">{problem}</p>}
          <div className="flex flex-wrap items-center justify-end gap-2">
            {details && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="mr-auto"
                onClick={() => {
                  onDetailsChange!(farmer, null);
                  setDraft(null);
                  setProblem(null);
                }}
              >
                Use common details
              </Button>
            )}
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setDraft(null);
                setProblem(null);
              }}
            >
              Cancel
            </Button>
            <Button type="button" variant="brand" size="sm" onClick={save}>
              Save
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}
