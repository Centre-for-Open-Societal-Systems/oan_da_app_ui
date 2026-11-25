"use client";

import { useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Dropdown } from "@/components/ui/Dropdown";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { ETHIOPIAN_MONTHS, ethiopianFull, ethiopianRange, ethiopianRangeLong, toEthiopian } from "@/lib/ethiopian";
import { DetailRows, ICONS, Icon } from "../lifecycle/components/shared";
import { COVER_CANDIDATES, firstName, type TeamLeaveRow, type WaitingRequest } from "./data";

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/** Who covers a kebele while its agent is away; saving hands the kebele's farmer visits and alerts to them. */
export function CoverDialog({ leave, onClose, onSave }: { leave: TeamLeaveRow; onClose: () => void; onSave: (cover: string) => void }) {
  const candidates = COVER_CANDIDATES.filter((c) => c.agent !== leave.agent);
  const [cover, setCover] = useState(candidates[0]?.agent ?? "");
  const options = candidates.map((c, i) => ({ value: c.agent, label: `${c.agent} · ${c.kebele}${i === 0 ? " (nearest)" : ""}` }));
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Cover From?"
      subtitle={`${leave.agent} is on ${lower(leave.type)} ${ethiopianRange(leave.start, leave.end)}.`}
      bodyClassName="p-4 sm:px-6 sm:py-5"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={() => onSave(cover)} disabled={!cover}>Save cover</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <FormField label="Covering agent" htmlFor="cv-agent" required>
          <Dropdown id="cv-agent" value={cover} onChange={setCover} options={options} placeholder="Select a DA" triggerClassName="h-12" />
        </FormField>
        {!cover && <p className="text-[12.5px] text-muted">Complete every field marked * to enable Save cover.</p>}
        {cover && <Banner tone="success">Farmer visits and alerts for {leave.kebele} go to {firstName(cover)} while {firstName(leave.agent)} is away.</Banner>}
      </div>
    </Modal>
  );
}

/** Confirms an approval and shows what it changes: balance, cover and the agent's PMS targets. */
export function ApproveDialog({ request, onClose, onApprove }: { request: WaitingRequest; onClose: () => void; onApprove: () => void }) {
  const month = ETHIOPIAN_MONTHS[toEthiopian(request.start).month - 1];
  const dayWord = `${request.days} day${request.days === 1 ? "" : "s"}`;
  const kind = request.type.replace(/ leave$/, "");
  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Approve leave request?"
      subtitle={`${request.cover ? `${request.cover} will cover ${request.kebele} from ${ethiopianRange(request.start, request.end).replace(" – ", " to ")}. ` : ""}${firstName(request.agent)}'s ${month} targets are adjusted for ${dayWord} away.`}
      size="lg"
      bodyClassName="p-4 sm:px-6 sm:py-5"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={onApprove}>Approve</Button>
        </>
      }
    >
      <DetailRows
        boxed
        rows={[
          { label: "Agent Name", value: request.agent },
          { label: "Leave", value: `${kind} · ${request.days} working days` },
          { label: "Dates", value: ethiopianRangeLong(request.start, request.end) },
          { label: "Days left after", value: request.balance ? `${request.balance.left - request.days} of ${request.balance.total}` : "Not deducted from a balance" },
          { label: "Cover", value: request.cover ?? "Not chosen" },
          { label: "PMS targets", value: `${month} targets adjusted for ${dayWord}` },
        ]}
      />
    </Modal>
  );
}

// A date shown as "12 Tahsas 2019"; a transparent date input over it opens the native picker.
function DateField({ id, label, value, min, hint, broken, onChange }: { id: string; label: string; value: string; min?: string; hint?: string; broken?: boolean; onChange: (iso: string) => void }) {
  return (
    <FormField label={label} htmlFor={id} required hint={hint} hintTone={broken ? "error" : "muted"}>
      <div className="relative flex h-12 items-center justify-between gap-2 rounded-lg border border-zinc-300 bg-white px-3 text-[14.5px] text-ink focus-within:border-brand-green focus-within:ring-2 focus-within:ring-brand-green/20">
        <span>{value ? ethiopianFull(value) : "Pick a date"}</span>
        <Icon d={ICONS.calendar} className="h-4 w-4 shrink-0 text-subtle" />
        <input
          id={id}
          type="date"
          value={value}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          onClick={(e) => e.currentTarget.showPicker?.()}
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
        />
      </div>
    </FormField>
  );
}

/** The approver proposes other dates to the agent instead of approving. */
export function SuggestDatesDialog({ request, onClose, onSend }: { request: WaitingRequest; onClose: () => void; onSend: () => void }) {
  const name = firstName(request.agent);
  const [from, setFrom] = useState(request.start);
  const [to, setTo] = useState(request.end);
  const valid = !!from && !!to && to >= from;
  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`Suggest other dates to ${name}`}
      subtitle={`Recommend alternative dates to ${name} based on team availability and scheduling conflicts.`}
      size="lg"
      bodyClassName="p-4 sm:px-6 sm:py-5"
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button variant="brand" onClick={onSend} disabled={!valid}>Send suggestion</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-4">
          <DateField id="sg-from" label="From" value={from} onChange={setFrom} />
          <DateField id="sg-to" label="To" value={to} min={from} hint="On or after the From date." broken={!!to && !!from && to < from} onChange={setTo} />
        </div>
        <FormField label="Notes" htmlFor="sg-notes">
          <Textarea id="sg-notes" rows={3} placeholder={`Two agents near ${request.kebele} are away that week. Could these dates work instead?`} />
        </FormField>
        {!valid && <p className="text-[12.5px] text-muted">Complete every field marked * to enable Send suggestion.</p>}
      </div>
    </Modal>
  );
}
