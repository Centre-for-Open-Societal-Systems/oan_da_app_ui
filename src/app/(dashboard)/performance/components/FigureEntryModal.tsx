"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { cn } from "@/lib/utils";
import { TEAM_SUMMARY, type TeamMemberRow } from "@/features/performance";

const FIELDS = [
  { key: "trained", label: "Farmers trained", unit: "farmers" },
  { key: "women", label: "Of them, women", unit: "women" },
  { key: "vaccinated", label: "Animals vaccinated in campaigns", unit: "animals" },
  { key: "forage", label: "Farmers establishing improved forage", unit: "farmers" },
] as const;
type FieldKey = (typeof FIELDS)[number]["key"];

const SOURCES = ["Phone call", "Paper form", "Field visit"];

// Supervisor enters an agent's monthly figures on their behalf (agent without network).
export function FigureEntryModal({ agent, onClose, onSave }: { agent: TeamMemberRow; onClose: () => void; onSave: () => void }) {
  const first = agent.name.split(" ")[0];
  const [values, setValues] = useState<Record<FieldKey, string>>({ trained: "", women: "", vaccinated: "", forage: "" });
  const [source, setSource] = useState(SOURCES[0]);

  const womenTooHigh = values.women !== "" && values.trained !== "" && Number(values.women) > Number(values.trained);
  const valid = FIELDS.every((f) => values[f.key] !== "") && !womenTooHigh;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={`${TEAM_SUMMARY.figuresMonth} figures for ${agent.name}`}
      size="xl"
      bodyClassName="p-5"
      icon={
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-tint text-brand-green">
          <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2M9 14l2 2 4-4" />
          </svg>
        </span>
      }
      subtitle={
        <span className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-100 px-2.5 py-0.5 text-[12.5px] font-semibold text-blue-700">Entering for {agent.name}</span>
          <span>· {TEAM_SUMMARY.figuresMonth} 2019</span>
        </span>
      }
      footer={
        <>
          <Button variant="outline" className="px-6 font-semibold" onClick={onClose}>Cancel</Button>
          <Button variant="brand" className="px-6" disabled={!valid} onClick={onSave}>Save for {first}</Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        {FIELDS.map((f) => (
          <div key={f.key} className="flex items-center justify-between gap-4">
            <label htmlFor={`fig-${f.key}`} className="text-[14.5px] text-ink">{f.label}<span className="ml-1 text-danger">*</span></label>
            <div className="flex items-center gap-4">
              <input
                id={`fig-${f.key}`}
                type="number"
                min={0}
                inputMode="numeric"
                value={values[f.key]}
                onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                aria-invalid={f.key === "women" && womenTooHigh}
                className={cn("h-10 w-[90px] rounded-lg border bg-white px-3 text-[14px] text-ink outline-none focus:border-brand-green focus:ring-1 focus:ring-brand-green", f.key === "women" && womenTooHigh ? "border-danger" : "border-line")}
              />
              <span className="w-[70px] text-[13px] text-muted">{f.unit}</span>
            </div>
          </div>
        ))}
        <p className={cn("text-right text-[12.5px]", womenTooHigh ? "text-danger" : "text-muted")}>Women cannot be more than farmers trained.</p>

        <div className="mt-1 flex flex-col gap-2.5">
          <p className="text-[14px] text-ink">Where did these figures come from?</p>
          <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Source of figures">
            {SOURCES.map((s) => (
              <button
                key={s}
                type="button"
                role="radio"
                aria-checked={source === s}
                onClick={() => setSource(s)}
                className={cn("rounded-full border px-4 py-1.5 text-[14px] transition-colors", source === s ? "border-brand-green bg-brand-mint font-medium text-brand-green" : "border-line bg-white text-ink hover:bg-surface")}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {!valid && <p className="text-[12.5px] text-muted">Complete every field marked * to enable Save for {first}.</p>}
        <p className="text-[12.5px] text-muted">{first} will see these figures with your name. They show in the “Figures entered by supervisors” report.</p>
      </div>
    </Modal>
  );
}
