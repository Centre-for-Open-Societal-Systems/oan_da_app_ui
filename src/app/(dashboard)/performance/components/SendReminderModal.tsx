"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Checkbox } from "@/components/ui/Checkbox";
import { Dropdown } from "@/components/ui/Dropdown";
import { FormField } from "@/components/ui/FormField";
import { Modal } from "@/components/ui/Modal";
import { Textarea } from "@/components/ui/Textarea";
import { MY_DA_ID } from "@/features/agents";
import { TEAM_SUMMARY, type TeamMemberRow } from "@/features/performance";

const CHANNELS = ["In-app", "SMS", "Email"] as const;
const MAX_CHIPS = 3;

interface SendReminderModalProps {
  senderName: string;
  members: TeamMemberRow[];
  /** Pre-pick one agent (from the row menu) instead of everyone who hasn't entered figures. */
  agent?: TeamMemberRow;
  onClose: () => void;
  onSend: (summary: string) => void;
}

// Reminder composer: pick who, how (in-app / SMS / email) and the message.
export function SendReminderModal({ senderName, members, agent, onClose, onSend }: SendReminderModalProps) {
  const month = TEAM_SUMMARY.figuresMonth;
  const [audience, setAudience] = useState(agent ? "one" : "pending");
  const [channels, setChannels] = useState<Set<string>>(new Set(["In-app", "SMS"]));
  const [message, setMessage] = useState("");

  const options = [
    ...(agent ? [{ value: "one", label: `${agent.name} only` }] : []),
    { value: "pending", label: `Agents who have not added ${month} figures` },
    { value: "draft", label: `Agents with ${month} figures still in draft` },
    { value: "all", label: "All agents in my team" },
  ];

  const pickFor = (key: string): TeamMemberRow[] =>
    key === "one" && agent ? [agent] : members.filter((m) => (key === "pending" ? m.figures === "Not yet" : key === "draft" ? m.figures === "Draft" : true));
  // The sample roster repeats names, so recipients are counted per person.
  const names = [...new Set(pickFor(audience).map((m) => m.name))];

  const toggle = (channel: string) =>
    setChannels((prev) => {
      const next = new Set(prev);
      if (next.has(channel)) next.delete(channel);
      else next.add(channel);
      return next;
    });

  const valid = names.length > 0 && channels.size > 0 && message.trim().length > 0;
  const send = () => {
    if (!valid) return;
    onSend(`${names.length === 1 ? names[0] : `${names.length} agents`} by ${[...channels].join(" and ")}`);
    onClose();
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title="Send reminder"
      subtitle={`${senderName} · ${MY_DA_ID}`}
      size="xl"
      bodyClassName="p-5"
      footer={
        <>
          <Button variant="outline" className="px-6 font-semibold" onClick={onClose}>Cancel</Button>
          <Button variant="brand" className="px-6" disabled={!valid} onClick={send}>
            Send to {names.length} agent{names.length === 1 ? "" : "s"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-3">
          <FormField label="Send to" htmlFor="reminder-audience" required>
            <Dropdown id="reminder-audience" value={audience} onChange={setAudience} options={options} className="sm:max-w-[560px]" />
          </FormField>
          <div className="flex flex-wrap gap-2">
            {names.slice(0, MAX_CHIPS).map((n) => (
              <span key={n} className="rounded-full bg-slate-100 px-3 py-1 text-[13px] text-ink-soft">{n}</span>
            ))}
            {names.length > MAX_CHIPS && <span className="rounded-full bg-slate-100 px-3 py-1 text-[13px] text-ink-soft">+ {names.length - MAX_CHIPS} more</span>}
            {names.length === 0 && <span className="text-[13px] text-muted">No agents in this group.</span>}
          </div>
        </div>

        <fieldset className="flex flex-col gap-2">
          <legend className="text-[14px] font-medium text-ink">Send by<span className="ml-1 text-danger">*</span></legend>
          <div className="flex flex-wrap gap-5">
            {CHANNELS.map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-2 text-[14px] text-ink">
                <Checkbox checked={channels.has(c)} onChange={() => toggle(c)} />
                {c}
              </label>
            ))}
          </div>
        </fieldset>

        <FormField label="Message" htmlFor="reminder-message" required hint="Template: Monthly figures due">
          <Textarea
            id="reminder-message"
            rows={5}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder={`Please add your ${month} figures by Hidar 5. Thank you.`}
            className="rounded-lg border-line"
          />
        </FormField>

        {!valid && <p className="text-[12.5px] text-muted">Complete every field marked * to enable Send to {names.length} agent{names.length === 1 ? "" : "s"}.</p>}
      </div>
    </Modal>
  );
}
