import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { Pill, type PillTone } from "@/components/ui/Pill";
import type { ThreadMessage } from "../types";
import { GrievanceStatusPill } from "./GrievancePills";

/** The case is complete once its status reads as resolved/closed (the service's own wording varies). */
const isClosedStatus = (status: string) => /resolv|close|complete|done/i.test(status);

interface Step {
  id: string;
  actor: string;
  tag: { label: string; tone: PillTone };
  at: string;
  body?: ReactNode;
  remark?: string;
}

function toStep(m: ThreadMessage): Step {
  switch (m.kind) {
    case "submission":
      return {
        id: m.id,
        actor: `${m.author} (${m.role})`,
        tag: { label: "Submitted", tone: "blue" },
        at: m.at,
        body: (
          <>
            <p>{m.body}</p>
            {m.attachments.length > 0 && (
              <ul className="mt-2 flex flex-wrap gap-2">
                {m.attachments.map((file) => (
                  <li key={file} className="rounded-md border border-line bg-surface px-2 py-0.5 text-[12px] text-slate-600">{file}</li>
                ))}
              </ul>
            )}
          </>
        ),
      };
    case "dept-response":
      return {
        id: m.id,
        actor: `${m.author} (${m.role})`,
        tag: { label: m.outcome, tone: m.outcome === "Resolved" ? "green" : m.outcome === "Rejected" ? "red" : "amber" },
        at: m.at,
        body: <p>Response #{m.responseNo} · {m.actionTaken}</p>,
        remark: `${m.resolutionSummary} (Proposed closure: ${m.proposedClosure})`,
      };
    case "status-change":
      return {
        id: m.id,
        actor: m.by,
        tag: { label: "Status changed", tone: "slate" },
        at: m.at,
        body: (
          <span className="flex flex-wrap items-center gap-2">
            <GrievanceStatusPill status={m.from} className="px-2 py-0 text-[12px]" />
            <span aria-hidden="true">→</span>
            <GrievanceStatusPill status={m.to} className="px-2 py-0 text-[12px]" />
          </span>
        ),
      };
    case "event":
      return {
        id: m.id,
        actor: m.actor,
        tag: { label: m.action.charAt(0).toUpperCase() + m.action.slice(1), tone: "blue" },
        at: m.at,
        body: m.detail ? <p>{m.detail}</p> : undefined,
      };
    case "internal-note":
      return {
        id: m.id,
        actor: `${m.author} (${m.role})`,
        tag: { label: "Internal note", tone: "amber" },
        at: m.at,
        remark: m.body,
      };
  }
}

/** Numbered audit trail of a grievance; the last step turns into a green tick once the case is resolved or closed. */
export function GrievanceTimeline({ messages, status }: { messages: ThreadMessage[]; status: string }) {
  const steps = messages.map(toStep);
  const done = isClosedStatus(status);

  return (
    <ol className="relative flex flex-col gap-3">
      {/* Spine behind the step circles */}
      <span aria-hidden="true" className="absolute bottom-6 left-[17px] top-6 w-px bg-line" />
      {steps.map((s, i) => {
        const isFinal = done && i === steps.length - 1;
        return (
          <li key={s.id} className="relative flex items-start gap-4">
            <span
              className={cn(
                "z-10 mt-4 flex h-[35px] w-[35px] shrink-0 items-center justify-center rounded-full border text-[13px] font-medium",
                isFinal ? "border-brand-green bg-brand-green text-white" : "border-line bg-white text-slate-700",
              )}
            >
              {isFinal ? (
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
              ) : (
                i + 1
              )}
            </span>
            <div className="min-w-0 flex-1 rounded-xl border border-line bg-white px-4 py-3.5 shadow-card">
              <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <span className="text-[15px] font-semibold text-ink">{s.actor}</span>
                  <Pill tone={s.tag.tone} className="px-2 py-0 text-[12px]">{s.tag.label}</Pill>
                </div>
                <span className="shrink-0 whitespace-nowrap text-[12.5px] text-muted">{s.at}</span>
              </div>
              {s.body && <div className="mt-2 text-[13.5px] leading-relaxed text-slate-600">{s.body}</div>}
              {s.remark && (
                <p className="mt-3 rounded-lg border border-line-soft bg-surface px-3.5 py-2.5 text-[13px] leading-relaxed text-slate-600">
                  Remark: &ldquo;{s.remark}&rdquo;
                </p>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
