"use client";

import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { todayIso } from "@/lib/utils";
import type { BatchVisitItem } from "../visitsApi";
import { DURATIONS, durationMinutes, VISIT_TYPES } from "./planVisit";

/** The details one farmer's visit can have of its own in a batch. */
export type VisitItemDetails = Pick<BatchVisitItem, "visit_type" | "priority" | "date" | "time" | "duration_min" | "purpose">;

interface VisitItemFieldsProps {
  /** Unique per farmer, keeps the input ids apart. */
  idPrefix: string;
  value: VisitItemDetails;
  onChange: (patch: Partial<VisitItemDetails>) => void;
}

// One farmer's visit type, date, time, duration and purpose (priority is not asked; it keeps the common value) (batch: per-farmer details and the result's Edit).
export function VisitItemFields({ idPrefix, value, onChange }: VisitItemFieldsProps) {
  const id = (name: string) => `${idPrefix}-${name}`;
  const pastDate = value.date !== "" && value.date < todayIso();

  return (
    <>
      <FormField label="Visit type" htmlFor={id("type")}>
        <Select id={id("type")} className="h-9" value={value.visit_type} onChange={(e) => onChange({ visit_type: e.target.value })}>
          {VISIT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </Select>
      </FormField>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <FormField label="Date" htmlFor={id("date")} required hint={pastDate ? "You cannot select past date for visit" : undefined} hintTone={pastDate ? "error" : "muted"}>
          <Input id={id("date")} type="date" className="h-9" min={todayIso()} value={value.date} onChange={(e) => onChange({ date: e.target.value })} required />
        </FormField>
        <FormField label="Time" htmlFor={id("time")} required>
          <Input id={id("time")} type="time" className="h-9" value={value.time} onChange={(e) => onChange({ time: e.target.value })} required />
        </FormField>
        <FormField label="Duration" htmlFor={id("duration")}>
          <Select id={id("duration")} className="h-9" value={String(value.duration_min)} onChange={(e) => onChange({ duration_min: Number(e.target.value) })}>
            {DURATIONS.map((d) => <option key={d} value={durationMinutes(d)}>{d}</option>)}
          </Select>
        </FormField>
      </div>
      <FormField label="Purpose / objective" htmlFor={id("purpose")} required>
        <Input id={id("purpose")} className="h-9" value={value.purpose} onChange={(e) => onChange({ purpose: e.target.value })} required />
      </FormField>
    </>
  );
}

/** "20 Nov 2026 at 10:00 · Crop Survey · 45 min · High". */
export const summarizeDetails = (d: VisitItemDetails, when: string) => `${when} · ${d.visit_type} · ${d.duration_min} min`;
