"use client";

import { useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import { Textarea } from "@/components/ui/Textarea";
import { cn } from "@/lib/utils";
import type { SupervisorKpiRow } from "@/features/performance";

interface OpenDiscussionDrawerProps {
  kpi: Pick<SupervisorKpiRow, "kpi" | "target" | "weight">;
  onClose: () => void;
  onSend: (summary: string) => void;
}

// A discussion an agent opened about a KPI target (sample until the PMS discussions API is wired).
const DISCUSSION = {
  agent: "Tadesse Alemu",
  date: "11 Tikimt",
  tag: "Seems high for my kebele",
  message: "Two of my sub-kebeles had late rains, so most farmers could not apply row planting this Meher.",
  suggests: 45,
};

const numericTarget = (target: string) => (target.endsWith("%") ? parseInt(target, 10) : null);

// Right-hand drawer to answer an agent's target discussion: keep the target or change it, with a reply.
export function OpenDiscussionDrawer({ kpi, onClose, onSend }: OpenDiscussionDrawerProps) {
  const uid = useId();
  const current = numericTarget(kpi.target);
  const [choice, setChoice] = useState<"keep" | "change">("keep");
  const [value, setValue] = useState(String(DISCUSSION.suggests));
  const [reply, setReply] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const valid = choice === "keep" || (value !== "" && Number(value) >= 0 && Number(value) <= 100);

  const send = () => {
    if (!valid) return;
    onSend(choice === "keep" ? `Kept the ${kpi.kpi} target at ${kpi.target}.` : `Changed the ${kpi.kpi} target to ${value}%.`);
    onClose();
  };

  const option = (active: boolean) =>
    cn("flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border px-4 text-[14px] text-ink transition-colors", active ? "border-brand-green bg-brand-mint" : "border-line bg-white hover:bg-surface");
  const radio = (active: boolean) =>
    cn("flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2", active ? "border-brand-green bg-brand-green" : "border-slate-400");

  return createPortal(
    <div className="fixed inset-0 z-[100]">
      <div onClick={onClose} className="absolute inset-0 bg-ink/30" />
      <aside role="dialog" aria-modal="true" aria-labelledby={`${uid}-title`} className="absolute right-0 top-0 flex h-full w-full max-w-[420px] flex-col bg-white shadow-2xl">
        <div className="flex items-center justify-between border-b border-line px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-tint text-brand-green">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                <path d="M4 6h16M4 12h16M4 18h16" />
                <circle cx="9" cy="6" r="2" fill="white" />
                <circle cx="15" cy="12" r="2" fill="white" />
                <circle cx="8" cy="18" r="2" fill="white" />
              </svg>
            </span>
            <h2 id={`${uid}-title`} className="text-[18px] font-semibold text-ink">Open Discussion</h2>
          </div>
          <button type="button" onClick={onClose} aria-label="Close discussion" className="rounded-md p-1 text-subtle transition-colors hover:bg-zinc-100 hover:text-ink">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          </button>
        </div>

        <div className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-6 green-scrollbar">
          <div className="rounded-xl bg-surface px-4 py-3">
            <p className="text-[14.5px] font-semibold text-ink">{kpi.kpi}</p>
            <p className="mt-0.5 text-[13px] text-ink-soft">National target {kpi.target} · weight {kpi.weight}%</p>
          </div>

          <div className="rounded-xl bg-slate-100 px-4 py-3.5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-[14px] font-semibold text-ink">{DISCUSSION.agent}</p>
              <span className="text-[12.5px] text-muted">{DISCUSSION.date}</span>
            </div>
            <span className="mt-1.5 inline-block rounded-full bg-white/70 px-2.5 py-0.5 text-[12px] font-semibold text-slate-600">{DISCUSSION.tag}</span>
            <p className="mt-2 text-[14px] text-ink">{DISCUSSION.message}</p>
            <p className="mt-2 text-[13.5px] font-semibold text-brand-green">Suggests {DISCUSSION.suggests}%</p>
          </div>

          <div className="flex flex-col gap-3" role="radiogroup" aria-label="Target decision">
            <label className={option(choice === "keep")}>
              <input type="radio" name={`${uid}-choice`} checked={choice === "keep"} onChange={() => setChoice("keep")} className="sr-only" />
              <span className={radio(choice === "keep")}>{choice === "keep" && <span className="h-2 w-2 rounded-full bg-white" />}</span>
              Keep the target at {current !== null ? `${current}%` : kpi.target}
            </label>
            <label className={option(choice === "change")}>
              <input type="radio" name={`${uid}-choice`} checked={choice === "change"} onChange={() => setChoice("change")} className="sr-only" />
              <span className={radio(choice === "change")}>{choice === "change" && <span className="h-2 w-2 rounded-full bg-white" />}</span>
              <span className="flex-1">Change the target to</span>
              <span className="flex h-9 w-[92px] items-center rounded-md border border-line bg-white px-3 focus-within:border-brand-green">
                <input
                  type="number"
                  min={0}
                  max={100}
                  value={value}
                  disabled={choice !== "change"}
                  onChange={(e) => setValue(e.target.value)}
                  aria-label="New target percent"
                  className="w-full min-w-0 bg-transparent text-[14px] text-ink outline-none disabled:text-muted"
                />
                <span className="text-[13px] text-muted">%</span>
              </span>
            </label>
            {choice === "change" && <p className={cn("text-[12.5px]", value !== "" && !valid ? "text-danger" : "text-muted")}>Enter a target from 0 to 100 to enable Send reply.</p>}
          </div>

          <Textarea
            rows={4}
            value={reply}
            onChange={(e) => setReply(e.target.value)}
            placeholder={`Reply to ${DISCUSSION.agent.split(" ")[0]}…`}
            aria-label="Reply"
            className="rounded-lg border-line"
          />
        </div>

        <div className="flex items-center gap-3 border-t border-line bg-surface px-6 py-5">
          <button type="button" onClick={onClose} className="h-10 shrink-0 whitespace-nowrap rounded-md border border-zinc-200 bg-white px-5 text-[14px] font-semibold text-ink transition-colors hover:bg-zinc-50">
            Cancel
          </button>
          <button
            type="button"
            onClick={send}
            disabled={!valid}
            className="inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-md bg-brand-green px-5 text-[14px] font-semibold text-white transition-colors hover:bg-brand-green-dark disabled:opacity-50"
          >
            Send reply
          </button>
        </div>
      </aside>
    </div>,
    document.body,
  );
}
