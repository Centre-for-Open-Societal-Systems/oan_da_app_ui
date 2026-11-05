"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Dropdown } from "@/components/ui/Dropdown";
import { Textarea } from "@/components/ui/Textarea";
import { FormField } from "@/components/ui/FormField";
import { cn, todayIso } from "@/lib/utils";
import { RESPONSE_TYPES } from "../data";

export interface DeptResponseInput {
  responseType: string;
  proposedClosure: string;
  actionTaken: string;
  resolutionSummary: string;
  internalNote: string;
}

interface GrievanceResponsePanelProps {
  onSubmitResponse: (input: DeptResponseInput) => void;
  onAddNote: (note: string) => void;
}

type Tab = "response" | "note";
const ACTION_MAX = 500;

const SendIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);

const HiddenEyeIcon = (
  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
    <path d="M17.9 17.9A10 10 0 016.1 6.1M9.9 4.2A10 10 0 0121.8 12a10 10 0 01-1.5 2.5M3 3l18 18" />
    <path d="M9.9 9.9a3 3 0 004.2 4.2" />
  </svg>
);

export function GrievanceResponsePanel({ onSubmitResponse, onAddNote }: GrievanceResponsePanelProps) {
  const [tab, setTab] = useState<Tab>("response");
  const [responseType, setResponseType] = useState("");
  const [proposedClosure, setProposedClosure] = useState("");
  const [actionTaken, setActionTaken] = useState("");
  const [resolutionSummary, setResolutionSummary] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [note, setNote] = useState("");

  const responseValid = responseType && proposedClosure && actionTaken.trim() && resolutionSummary.trim();

  const handleResponse = (e: FormEvent) => {
    e.preventDefault();
    if (!responseValid) return;
    onSubmitResponse({ responseType, proposedClosure, actionTaken: actionTaken.trim(), resolutionSummary: resolutionSummary.trim(), internalNote: internalNote.trim() });
    setResponseType("");
    setProposedClosure("");
    setActionTaken("");
    setResolutionSummary("");
    setInternalNote("");
  };

  const handleNote = (e: FormEvent) => {
    e.preventDefault();
    if (!note.trim()) return;
    onAddNote(note.trim());
    setNote("");
  };

  const tabClass = (active: boolean) =>
    cn(
      "inline-flex h-11 shrink-0 items-center gap-2 whitespace-nowrap border-b-2 px-3 text-[13.5px] font-medium transition-colors sm:px-4",
      active ? "border-brand-green text-brand-green" : "border-transparent text-muted hover:text-ink"
    );

  return (
    <section className="rounded-xl border border-line bg-white">
      <div className="flex flex-wrap border-b border-line px-2" role="tablist">
        <button type="button" role="tab" aria-selected={tab === "response"} onClick={() => setTab("response")} className={tabClass(tab === "response")}>
          <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="currentColor"><path d="M3 21h18v-2H3v2zM5 10h2v7H5v-7zm4 0h2v7H9v-7zm4 0h2v7h-2v-7zm4 0h2v7h-2v-7zM12 2L2 7v2h20V7L12 2z" /></svg>
          Dept Response<span className="hidden sm:inline">&nbsp;(Appendix D)</span>
        </button>
        <button type="button" role="tab" aria-selected={tab === "note"} onClick={() => setTab("note")} className={tabClass(tab === "note")}>
          {HiddenEyeIcon}
          Internal Note
        </button>
      </div>

      {tab === "response" ? (
        <form onSubmit={handleResponse} className="flex flex-col gap-4 px-4 py-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Response Type" htmlFor="responseType" required>
              <Dropdown id="responseType" value={responseType} onChange={setResponseType} options={RESPONSE_TYPES} placeholder="Select Response Type" />
            </FormField>
            <FormField label="Proposed Closure Date" htmlFor="proposedClosure" required>
              <Input id="proposedClosure" type="date" min={todayIso()} value={proposedClosure} onChange={(e) => setProposedClosure(e.target.value)} className={cn(!proposedClosure && "text-zinc-400")} />
            </FormField>
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="actionTaken" className="text-[14px] font-medium text-ink">
              Action Taken <span className="text-danger">*</span>{" "}
              <span className="text-[13px] font-normal text-muted">({actionTaken.length}/{ACTION_MAX})</span>
            </label>
            <Textarea
              id="actionTaken"
              rows={3}
              maxLength={ACTION_MAX}
              value={actionTaken}
              onChange={(e) => setActionTaken(e.target.value)}
              placeholder="Describe the specific action taken by the department..."
            />
          </div>

          <FormField label="Resolution Summary" htmlFor="resolutionSummary" required>
            <Textarea
              id="resolutionSummary"
              rows={3}
              value={resolutionSummary}
              onChange={(e) => setResolutionSummary(e.target.value)}
              placeholder="Summaries the outcome for the submitter..."
            />
          </FormField>

          <div className="flex flex-col gap-2">
            <label htmlFor="responseInternalNote" className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
              <span className="text-muted">{HiddenEyeIcon}</span>
              Internal Notes <span className="text-[12.5px] font-normal text-muted">(not visible to submitter)</span>
            </label>
            <Textarea
              id="responseInternalNote"
              rows={2}
              value={internalNote}
              onChange={(e) => setInternalNote(e.target.value)}
              placeholder="Process gaps, follow-up actions, escalation reasons..."
              className="border-amber-200/70 bg-amber-50 focus:border-amber-600 focus:ring-amber-600"
            />
          </div>

          <div className="flex justify-end">
            <Button type="submit" variant="brand" disabled={!responseValid} className="gap-2">
              {SendIcon}
              Submit Response
            </Button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleNote} className="flex flex-col gap-4 px-4 py-4">
          <div className="flex flex-col gap-2">
            <label htmlFor="caseNote" className="flex items-center gap-1.5 text-[14px] font-medium text-ink">
              <span className="text-muted">{HiddenEyeIcon}</span>
              Internal Notes <span className="text-[12.5px] font-normal text-muted">(not visible to submitter)</span>
            </label>
            <Textarea
              id="caseNote"
              rows={2}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Add an internal case note visible only to officers..."
              className="border-amber-200/70 bg-amber-50 focus:border-amber-600 focus:ring-amber-600"
            />
          </div>
          <div className="flex justify-end">
            <Button type="submit" variant="brand" disabled={!note.trim()} className="gap-2">
              {SendIcon}
              Add Note
            </Button>
          </div>
        </form>
      )}
    </section>
  );
}
