"use client";

import { useState, type FormEvent } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LEAVE_BALANCES, type LeaveRecord } from "@/features/farmers";
import { Banner } from "@/components/ui/Banner";
import { todayIso } from "@/lib/utils";

interface RequestLeaveModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (request: Omit<LeaveRecord, "id" | "status">) => void;
}

const FORM_ID = "request-leave-form";
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

// Mon–Fri days between two ISO dates, inclusive; 0 when the range is invalid.
function workingDays(fromIso: string, toIso: string) {
  const from = new Date(fromIso);
  const to = new Date(toIso);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || to < from) return 0;
  let count = 0;
  for (const d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) {
    const day = d.getDay();
    if (day !== 0 && day !== 6) count += 1;
  }
  return count;
}

// "2026-09-15" -> "15 Sep 2026"; two dates in the same month/year collapse to "15 – 19 Sep 2026".
function formatPeriod(fromIso: string, toIso: string) {
  const [fy, fm, fd] = fromIso.split("-");
  const [ty, tm, td] = toIso.split("-");
  const to = `${td} ${MONTHS[Number(tm) - 1]} ${ty}`;
  if (fy === ty && fm === tm) return `${fd} – ${to}`;
  return `${fd} ${MONTHS[Number(fm) - 1]} ${fy} – ${to}`;
}

export function RequestLeaveModal({ isOpen, onClose, onSubmit }: RequestLeaveModalProps) {
  const [leaveType, setLeaveType] = useState(LEAVE_BALANCES[0].type);
  const [from, setFrom] = useState(() => todayIso());
  const [to, setTo] = useState(() => todayIso());

  const balance = LEAVE_BALANCES.find((b) => b.type === leaveType) ?? LEAVE_BALANCES[0];
  const days = workingDays(from, to);
  const remainingAfter = balance.entitlement - balance.used - days;
  const shortLabel = balance.type.toLowerCase().replace(" leave", "").replace(" / statutory", "");

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (days === 0) return;
    const reason = String(new FormData(e.currentTarget).get("reason") ?? "").trim();
    onSubmit({ type: leaveType, period: formatPeriod(from, to), days, message: reason || undefined });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Request Leave"
      bodyClassName="px-4 py-4"
      footer={
        <>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID} variant="brand" disabled={days === 0}>
            Submit
          </Button>
        </>
      }
    >
      <form id={FORM_ID} className="flex flex-col gap-4" onSubmit={handleSubmit}>
        <FormField label="Leave type" htmlFor="leave-type">
          <Select id="leave-type" className="h-10" value={leaveType} onChange={(e) => setLeaveType(e.target.value)}>
            {LEAVE_BALANCES.map((b) => (
              <option key={b.type} value={b.type}>{b.type}</option>
            ))}
          </Select>
        </FormField>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="From" htmlFor="leave-from">
            <Input id="leave-from" type="date" min={todayIso()} className="h-10" value={from} onChange={(e) => setFrom(e.target.value)} required />
          </FormField>
          <FormField label="To" htmlFor="leave-to">
            <Input id="leave-to" type="date" className="h-10" value={to} min={from} onChange={(e) => setTo(e.target.value)} required />
          </FormField>
        </div>

        <p className="-mt-1 text-[13px] text-ink-soft">
          Duration: <span className="text-[14px] font-semibold text-ink">{days} working day{days === 1 ? "" : "s"}</span>
          <span className="text-muted">
            {" "}· {remainingAfter} of {balance.entitlement} {shortLabel} days remaining after this
          </span>
        </p>

        <FormField label="Reason" htmlFor="leave-reason">
          <Input id="leave-reason" name="reason" className="h-10" defaultValue="Family event" required />
        </FormField>

        <FormField label="Coverage / handover (optional)" htmlFor="leave-coverage">
          <Input id="leave-coverage" name="coverage" className="h-10" defaultValue="Bekele N. covers Bako Tibe visits" />
        </FormField>

        <Banner tone="warning">Routes to your Woreda supervisor for approval; your balance updates once approved.</Banner>
      </form>
    </Modal>
  );
}
