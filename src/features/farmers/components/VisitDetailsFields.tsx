import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { todayIso } from "@/lib/utils";
import type { Farmer } from "../types";
import { DURATIONS, PRIORITIES, PRIORITY_BY_LEVEL, type VisitPreset } from "./planVisit";

interface VisitDetailsFieldsProps {
  selected: Farmer | undefined;
  preset: VisitPreset | undefined;
  isSchedule: boolean;
}

// Purpose, date/time, location and priority (uncontrolled inputs) plus the priority / offline notice.
export function VisitDetailsFields({ selected, preset, isSchedule }: VisitDetailsFieldsProps) {
  const today = todayIso();
  const [date, setDate] = useState(today);
  const pastDate = date !== "" && date < today;

  return (
    <>
      <FormField label="Purpose / objective" htmlFor="visit-purpose" required>
        <Input id="visit-purpose" className="h-10" defaultValue={preset ? `${preset.reason} — inspect and agree next steps` : "Planning-round crop survey — record plot boundary and crop split"} required />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Date" htmlFor="visit-date" required hint={pastDate ? "You cannot select past date for visit" : undefined} hintTone="error">
          <Input id="visit-date" type="date" className="h-10" value={date} min={today} onChange={(e) => setDate(e.target.value)} required />
        </FormField>
        <FormField label="Time" htmlFor="visit-time" required>
          <Input id="visit-time" type="time" className="h-10" defaultValue="09:00" required />
        </FormField>
        <FormField label="Duration" htmlFor="visit-duration">
          <Select id="visit-duration" className="h-10" defaultValue="45 min">
            {DURATIONS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Location" htmlFor="visit-location" hint="Auto-filled from the farmer's registered parcel">
          <Input
            id="visit-location"
            className="h-10 border-transparent bg-slate-100 text-ink"
            value={selected ? `${selected.kebele} 01 · plot 8.191°N, 37.052°E` : ""}
            placeholder="Select a farmer first"
            readOnly
            endAdornment={
              <svg className="h-4 w-4 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
              </svg>
            }
          />
        </FormField>
        <FormField label="Priority" htmlFor="visit-priority">
          <Select id="visit-priority" className="h-10" defaultValue={preset ? PRIORITY_BY_LEVEL[preset.level] : PRIORITIES[0]}>
            {PRIORITIES.map((p) => <option key={p}>{p}</option>)}
          </Select>
        </FormField>
      </div>

      {isSchedule && (!preset || preset.level === "high") ? (
        <Banner tone="error">{preset ? `Flagged for ${preset.reason.toLowerCase()} — high priority, aim to schedule within 48 hours.` : "This farmer is flagged as high priority — aim to schedule within 48 hours."}</Banner>
      ) : (
        <Banner tone="info">The visit is saved to your plan and the farmer is notified by SMS. Save as draft keeps it on this device only.</Banner>
      )}
    </>
  );
}
