"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Dropdown, type DropdownOption } from "@/components/ui/Dropdown";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import { LeaveCalendar, dayLabel, type CalendarMode } from "./LeaveCalendar";
import { COVER_OPTIONS, LEAVE_TYPE_OPTIONS, leaveBalance, leaveDays, returnDate } from "./leave";
import { LIFECYCLE_DA, transitionFor } from "./lifecycle";
import { EMPTY_DRAFT, Icon, ICONS, buildEvent } from "./shared";
import { requestIds, useLifecycleHistory } from "./useLifecycleHistory";

const COVER_DROPDOWN: DropdownOption[] = COVER_OPTIONS.map((c) => {
  const [name, kebele] = c.split(" — ");
  return { value: c, label: name, description: `${kebele} · available on these dates` };
});

const isoToDmy = (iso: string) => iso.split("-").reverse().join("-");

function DateField({ id, label, iso, mode }: { id: string; label: string; iso: string; mode: CalendarMode }) {
  return (
    <FormField label={label} htmlFor={id} required>
      <div id={id} className="flex h-14 items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-white px-3">
        {iso ? (
          <span className="flex min-w-0 flex-col">
            <span className="truncate text-[14px] font-semibold text-ink">{dayLabel(iso, mode)}</span>
            <span className="text-[12.5px] text-ink-soft">{isoToDmy(iso)}</span>
          </span>
        ) : (
          <span className="whitespace-nowrap text-[14px] text-muted">Pick a date</span>
        )}
        <Icon d={ICONS.calendar} className="h-4 w-4 shrink-0 text-subtle" />
      </div>
    </FormField>
  );
}

// "Request leave" dialog: pick the dates on the calendar, name the cover DA and send. Records the request as
// "Pending approval" (same as the full-page form) and opens its status page. Mount it only while open so it starts fresh.
export function LeaveRequestModal({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const transition = transitionFor("LV")!;
  const submitRequest = useLifecycleHistory((s) => s.submit);
  const seq = useLifecycleHistory((s) => s.seq);
  const requests = Object.values(useLifecycleHistory((s) => s.requests));
  const [type, setType] = useState(LEAVE_TYPE_OPTIONS[0].type);
  const [range, setRange] = useState({ start: "", end: "" });
  const [half, setHalf] = useState({ start: false, end: false });
  const [mode, setMode] = useState<CalendarMode>("ethiopian");
  const [cover, setCover] = useState("");
  const [notes, setNotes] = useState("");

  const datesSet = !!range.start && !!range.end;
  const days = datesSet ? leaveDays(range.start, range.end, half.start, half.end) : 0;
  const balance = leaveBalance(type, requests);
  const typeOptions: DropdownOption[] = LEAVE_TYPE_OPTIONS.map((o) => ({
    value: o.type,
    label: o.type,
    description: o.note,
    trailing: o.type === "Annual leave" ? `${leaveBalance("Annual leave", requests)!.left} days left` : o.badge,
  }));
  const overBalance = !!balance && days > balance.left;
  const canSend = datesSet && days > 0 && !overBalance && !!cover;
  const approver = LIFECYCLE_DA.approverName.replace(" (Woreda)", "");
  const dayWord = (n: number) => `${n} working day${n === 1 ? "" : "s"}`;

  const send = () => {
    if (!canSend) return;
    const { id, auditId } = requestIds(seq, "LV");
    const reason = notes.trim() || "—";
    const draft = { ...EMPTY_DRAFT, scope: type, effective: range.start, target: range.end, successor: cover, reason, access: "Read-only", halfStart: half.start, halfEnd: half.end };
    submitRequest(
      { id, auditId, code: "LV", scope: type, effective: range.start, target: range.end, successor: cover, reason, role: "", assessment: "", access: "Read-only", halfStart: half.start, halfEnd: half.end, document: null, submittedAt: new Date().toISOString(), status: "Pending approval" },
      buildEvent(transition, draft, id),
    );
    onClose();
    router.push(`/lifecycle/requests/${id}`);
  };

  let summary: React.ReactNode;
  if (!datesSet) {
    summary = <p className="text-[13.5px] text-ink-soft">Pick the first and last day on the calendar.</p>;
  } else if (days === 0) {
    summary = <p className="text-[13.5px] font-semibold text-amber-800">These dates have no working days.</p>;
  } else if (overBalance) {
    summary = <p className="text-[13.5px] font-semibold text-danger">{dayWord(days)} · only {balance!.left} {type.toLowerCase()} days left</p>;
  } else {
    summary = (
      <>
        <p className="text-[14px] font-bold text-brand-green">{dayWord(days)}{balance ? ` · ${balance.left - days} days left` : ""}</p>
        <p className="text-[12.5px] text-ink-soft">Back at work on {dayLabel(returnDate(range.end), mode)}</p>
      </>
    );
  }
  const summaryTone = datesSet && days > 0 && !overBalance ? "border-emerald-200 bg-emerald-50" : datesSet && days === 0 ? "border-amber-200 bg-amber-50" : datesSet ? "border-red-200 bg-red-50" : "border-line bg-surface";

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Request Leave"
      subtitle="Pick your dates on the calendar - weekends and public holidays aren't counted."
      className="max-w-[800px]"
      bodyClassName="p-4 sm:px-6 sm:py-5"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={send} disabled={!canSend}>Send to {approver}</Button>
        </>
      }
    >
      <div className="grid grid-cols-1 gap-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-4">
          <FormField label="Leave type" htmlFor="lr-type" required>
            <Dropdown id="lr-type" value={type} onChange={setType} options={typeOptions} triggerClassName="h-12" />
          </FormField>

          <div className="grid grid-cols-2 gap-3">
            <DateField id="lr-from" label="From" iso={range.start} mode={mode} />
            <DateField id="lr-to" label="To" iso={range.end} mode={mode} />
          </div>

          <div className={cn("flex items-start gap-3 rounded-lg border px-4 py-3", summaryTone)}>
            {datesSet && days > 0 && !overBalance && <Icon d={ICONS.check} className="mt-0.5 h-5 w-5 shrink-0 text-brand-green" />}
            <div>{summary}</div>
          </div>

          <FormField label="Who covers your kebele" htmlFor="lr-cover" required>
            <Dropdown
              id="lr-cover"
              value={cover}
              onChange={setCover}
              options={COVER_DROPDOWN}
              placeholder="Select a DA"
              triggerClassName="h-14"
              renderValue={(o) => (
                <span className="flex min-w-0 flex-col text-left">
                  <span className="truncate text-[14px] font-semibold text-ink">{o.label}</span>
                  <span className="truncate text-[12.5px] text-ink-soft">{o.description}</span>
                </span>
              )}
            />
          </FormField>

          <FormField label="Notes (optional)" htmlFor="lr-notes">
            <Textarea id="lr-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Write here..." />
          </FormField>

          {!canSend && <p className="text-[12.5px] text-muted">Complete every field marked * to enable Send to {approver}.</p>}
        </div>

        <LeaveCalendar
          start={range.start}
          end={range.end}
          halfStart={half.start}
          halfEnd={half.end}
          mode={mode}
          onModeChange={setMode}
          onRangeChange={(start, end) => setRange({ start, end })}
          onHalfChange={(which, value) => setHalf((h) => ({ ...h, [which]: value }))}
        />
      </div>
    </Modal>
  );
}
