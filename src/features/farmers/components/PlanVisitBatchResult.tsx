"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { cn, todayIso } from "@/lib/utils";
import type { Farmer } from "../types";
import type { BatchVisitItem } from "../visitsApi";
import { FarmerAvatar } from "./FarmerAvatar";
import { DURATIONS, durationMinutes, registryCode, VISIT_TYPES, type BatchRow } from "./planVisit";

interface PlanVisitBatchResultProps {
  rows: BatchRow[];
  /** Drops a failed farmer from the batch. */
  onDiscard: (farmer: Farmer) => void;
  /** Sends one failed farmer again with the edited details. */
  onResubmit: (farmer: Farmer, request: BatchVisitItem) => Promise<void>;
  submitting?: boolean;
}

const visits = (n: number) => `${n} visit${n === 1 ? "" : "s"}`;
const PRIORITY_LEVELS = ["High", "Medium", "Low"] as const;

// Outcome of a batch plan: one row per farmer, planned (visit id) or failed (the backend's reason) with Edit /
// Discard. Edit opens that farmer's own details in the row; Resubmit sends only them.
export function PlanVisitBatchResult({ rows, onDiscard, onResubmit, submitting }: PlanVisitBatchResultProps) {
  const failed = rows.filter((r) => r.reason);
  const done = rows.length - failed.length;
  const [editing, setEditing] = useState<{ farmerId: string; request: BatchVisitItem } | null>(null);

  const patch = (change: Partial<BatchVisitItem>) => setEditing((e) => e && { ...e, request: { ...e.request, ...change } });

  return (
    <div className="flex flex-col gap-4">
      <div className={cn("rounded-xl border px-4 py-3", failed.length === 0 ? "border-brand-border bg-brand-wash" : "border-line bg-surface-alt")} role="status">
        {done > 0 && <p className="text-[14.5px] font-semibold text-brand-green">{visits(done)} planned successfully</p>}
        {failed.length > 0 ? (
          <p className={cn("text-[13px] text-danger", done > 0 && "mt-1")}>
            {visits(failed.length)} could not be planned. Edit the details and resubmit, or discard {failed.length === 1 ? "it" : "them"}.
          </p>
        ) : (
          <p className="mt-1 text-[13px] text-muted">
            {done === 1 ? "The farmer is" : "Each farmer is"} notified by SMS. The {done === 1 ? "visit is" : "visits are"} on the plan.
          </p>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {rows.map((r) => {
          const ok = !r.reason;
          const isEditing = editing?.farmerId === r.farmer.id;
          const req = isEditing ? editing.request : r.request;
          return (
            <li key={r.farmer.id} className={cn("rounded-xl border px-3 py-2.5", ok ? "border-brand-border bg-brand-wash" : "border-danger-border bg-danger-wash")}>
              <div className="flex items-start gap-3">
                <FarmerAvatar name={r.farmer.name} avatar={r.farmer.avatar} className="h-9 w-9 bg-white text-[13px]" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13.5px] font-semibold text-ink">{r.farmer.name}</p>
                  <p className="truncate text-[12px] text-muted">
                    {registryCode(r.farmer)} · {r.farmer.kebele}
                    {req ? ` · ${req.visit_type}` : ""}
                  </p>
                  {ok ? (
                    <p className="mt-0.5 text-[12.5px] text-brand-green">
                      Planned{r.when ? ` for ${r.when}` : ""}
                      {r.visitId ? ` · ${r.visitId}` : ""}
                    </p>
                  ) : (
                    <p className="mt-0.5 text-[12.5px] leading-snug text-danger">{r.reason}</p>
                  )}
                </div>
                {ok ? (
                  <span className="shrink-0 self-center text-[13px] font-semibold text-brand-green">Planned</span>
                ) : (
                  !isEditing && (
                    <div className="flex shrink-0 items-center gap-1.5 self-center">
                      {r.request && (
                        <button
                          type="button"
                          onClick={() => setEditing({ farmerId: r.farmer.id, request: r.request! })}
                          disabled={submitting}
                          className="h-7 rounded-md border border-brand-green bg-white px-2.5 text-[12.5px] font-semibold text-brand-green transition-colors hover:bg-brand-wash disabled:opacity-50"
                        >
                          Edit
                        </button>
                      )}
                      <button
                        type="button"
                        onClick={() => onDiscard(r.farmer)}
                        disabled={submitting}
                        className="h-7 rounded-md border border-danger-border bg-white px-2.5 text-[12.5px] font-semibold text-danger transition-colors hover:bg-danger-wash disabled:opacity-50"
                      >
                        Discard
                      </button>
                    </div>
                  )
                )}
              </div>

              {isEditing && (
                <form
                  className="mt-3 flex flex-col gap-3 rounded-lg border border-line bg-white p-3"
                  onSubmit={async (e) => {
                    e.preventDefault();
                    await onResubmit(r.farmer, editing.request);
                    setEditing(null);
                  }}
                >
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField label="Visit type" htmlFor={`edit-type-${r.farmer.id}`}>
                      <Select id={`edit-type-${r.farmer.id}`} className="h-9" value={editing.request.visit_type} onChange={(e) => patch({ visit_type: e.target.value })}>
                        {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
                      </Select>
                    </FormField>
                    <FormField label="Priority" htmlFor={`edit-priority-${r.farmer.id}`}>
                      <Select
                        id={`edit-priority-${r.farmer.id}`}
                        className="h-9"
                        value={editing.request.priority}
                        onChange={(e) => patch({ priority: e.target.value as BatchVisitItem["priority"] })}
                      >
                        {PRIORITY_LEVELS.map((p) => <option key={p}>{p}</option>)}
                      </Select>
                    </FormField>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <FormField label="Date" htmlFor={`edit-date-${r.farmer.id}`} required>
                      <Input id={`edit-date-${r.farmer.id}`} type="date" className="h-9" min={todayIso()} value={editing.request.date} onChange={(e) => patch({ date: e.target.value })} required />
                    </FormField>
                    <FormField label="Time" htmlFor={`edit-time-${r.farmer.id}`} required>
                      <Input id={`edit-time-${r.farmer.id}`} type="time" className="h-9" value={editing.request.time} onChange={(e) => patch({ time: e.target.value })} required />
                    </FormField>
                    <FormField label="Duration" htmlFor={`edit-duration-${r.farmer.id}`}>
                      <Select
                        id={`edit-duration-${r.farmer.id}`}
                        className="h-9"
                        value={String(editing.request.duration_min)}
                        onChange={(e) => patch({ duration_min: Number(e.target.value) })}
                      >
                        {DURATIONS.map((d) => <option key={d} value={durationMinutes(d)}>{d}</option>)}
                      </Select>
                    </FormField>
                  </div>
                  <FormField label="Purpose / objective" htmlFor={`edit-purpose-${r.farmer.id}`} required>
                    <Input id={`edit-purpose-${r.farmer.id}`} className="h-9" value={editing.request.purpose} onChange={(e) => patch({ purpose: e.target.value })} required />
                  </FormField>
                  <div className="flex justify-end gap-2">
                    <Button type="button" variant="outline" size="sm" onClick={() => setEditing(null)} disabled={submitting}>
                      Cancel
                    </Button>
                    <Button type="submit" variant="brand" size="sm" disabled={submitting}>
                      {submitting ? "Resubmitting…" : "Resubmit"}
                    </Button>
                  </div>
                </form>
              )}
            </li>
          );
        })}
      </ul>

      {failed.length > 0 && done > 0 && (
        <p className="text-[12.5px] leading-relaxed text-muted">
          The {visits(done)} planned {done === 1 ? "is" : "are"} saved. Resubmitting sends only the failed {failed.length === 1 ? "farmer" : "farmers"}; planned visits are not duplicated.
        </p>
      )}
    </div>
  );
}
