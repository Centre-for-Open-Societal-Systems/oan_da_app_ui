import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { DatePicker } from "@/components/ui/DatePicker";
import { TimePicker } from "@/components/ui/TimePicker";
import { todayIso } from "@/lib/utils";
import type { Farmer } from "../types";
import { Checkbox } from "@/components/ui/Checkbox";
import { DURATIONS, PRIORITY_LEVELS, type PlotLocation, type PriorityLevel, type VisitPreset } from "./planVisit";
import { PlotLocationFields } from "./PlotLocationFields";

interface VisitDetailsFieldsProps {
  selected: Farmer[];
  preset: VisitPreset | undefined;
  isSchedule: boolean;
  /** Each farmer's plot reference and latitude / longitude, by farmer id. */
  locations: Record<string, PlotLocation>;
  onLocationChange: (farmer: Farmer, patch: Partial<PlotLocation>) => void;
  priority: PriorityLevel;
  onPriorityChange: (priority: PriorityLevel) => void;
  priorityReason: string;
  onPriorityReasonChange: (reason: string) => void;
  notifySms: boolean;
  onNotifySmsChange: (notify: boolean) => void;
}

// Purpose, date/time and location (uncontrolled inputs), priority and its reason, the SMS choice and the offline notice.
// A Priority-list preset fills in the priority and reason; the DA can change both.
export function VisitDetailsFields({
  selected,
  preset,
  isSchedule,
  locations,
  onLocationChange,
  priority,
  onPriorityChange,
  priorityReason,
  onPriorityReasonChange,
  notifySms,
  onNotifySmsChange,
}: VisitDetailsFieldsProps) {
  const today = todayIso();
  const [date, setDate] = useState(today);
  const [time, setTime] = useState("09:00");
  const pastDate = date !== "" && date < today;

  return (
    <>
      <FormField label="Purpose / objective" htmlFor="visit-purpose" required>
        <Input id="visit-purpose" className="h-10" placeholder="Enter the purpose of the visit" required />
      </FormField>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Date" htmlFor="visit-date" required hint={pastDate ? "You cannot select past date for visit" : "Today or later."} hintTone={pastDate ? "error" : "muted"}>
          <DatePicker
            id="visit-date"
            name="date"
            value={date}
            minDate={today}
            clearable={false}
            onChange={setDate}
            className="w-full h-10"
            required
          />
        </FormField>
        <FormField label="Time" htmlFor="visit-time" required>
          <TimePicker
            id="visit-time"
            name="time"
            value={time}
            onChange={setTime}
            className="w-full h-10"
            required
          />
        </FormField>
        <FormField label="Duration" htmlFor="visit-duration">
          <Select id="visit-duration" className="h-10" defaultValue="45 min">
            {DURATIONS.map((d) => <option key={d}>{d}</option>)}
          </Select>
        </FormField>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <FormField label="Priority" htmlFor="visit-priority">
          <Select id="visit-priority" className="h-10" value={priority} onChange={(e) => onPriorityChange(e.target.value as PriorityLevel)}>
            {PRIORITY_LEVELS.map((p) => <option key={p}>{p}</option>)}
          </Select>
        </FormField>
        <FormField label="Priority reason" htmlFor="visit-priority-reason" className="sm:col-span-2">
          <Input id="visit-priority-reason" className="h-10" placeholder="e.g. Overdue by 4 days" maxLength={140} value={priorityReason} onChange={(e) => onPriorityReasonChange(e.target.value)} />
        </FormField>
      </div>

      <PlotLocationFields selected={selected} values={locations} onChange={onLocationChange} />

      <label className="flex cursor-pointer items-center gap-2.5 text-[14px] text-ink">
        <Checkbox id="visit-notify-sms" checked={notifySms} onChange={(e) => onNotifySmsChange(e.target.checked)} />
        Notify the farmer by SMS
      </label>

      {isSchedule && (!preset || preset.level === "high") ? (
        <Banner tone="error">{preset ? `Flagged for ${preset.reason.toLowerCase()} — high priority, aim to schedule within 48 hours.` : "This farmer is flagged as high priority — aim to schedule within 48 hours."}</Banner>
      ) : (
        <Banner tone="info">The visit is saved to your plan{notifySms ? " and the farmer is notified by SMS" : ""}. Save as draft keeps it on this device only.</Banner>
      )}
    </>
  );
}
