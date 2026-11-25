"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import type { Farmer } from "../types";
import { MAX_GATHERING_FARMERS } from "../gatheringsApi";
import { cn } from "@/lib/utils";
import { DaPicker } from "./DaPicker";
import { PlanVisitBatchResult } from "./PlanVisitBatchResult";
import { FarmerPicker } from "./FarmerPicker";
import { FarmerSearch } from "./FarmerSearch";
import { ADVISORY_VISIT, FORM_ID, MAX_BATCH_FARMERS, type VisitPreset } from "./planVisit";
import { PlanGatheringFields, PlanGatheringSuccess } from "./PlanGatheringFields";
import { PlanVisitSuccess } from "./PlanVisitSuccess";
import { GATHERING_FORM_ID, usePlanGathering } from "./usePlanGathering";
import { usePlanVisit } from "./usePlanVisit";
import { VisitDetailsFields } from "./VisitDetailsFields";
import { VisitTypePicker } from "./VisitTypePicker";

export type { VisitPreset } from "./planVisit";
export { MAX_BATCH_FARMERS } from "./planVisit";
export { MAX_GATHERING_FARMERS };

type PlanTab = "visit" | "gathering";

interface PlanVisitModalProps {
  /** Preselected farmer; when omitted the form starts with a search. */
  farmer?: Farmer;
  /** Preselected farmers, e.g. from the farmers list: up to MAX_BATCH_FARMERS for a visit, MAX_GATHERING_FARMERS for a gathering. */
  farmers?: Farmer[];
  isOpen: boolean;
  onClose: () => void;
  /** "schedule" is the Priority-list flavour: same form, different copy and warning. */
  mode?: "plan" | "schedule";
  /** Reason, visit type and priority to preselect (the farmer comes from `farmer`). */
  preset?: VisitPreset;
  /** Adds a "Gathering" tab next to the visit form (the farmers list's "Plan a visit / gathering"). */
  allowGathering?: boolean;
}

export function PlanVisitModal({ farmer, farmers, isOpen, onClose, mode = "plan", preset, allowGathering = false }: PlanVisitModalProps) {
  const initial = farmers ?? (farmer ? [farmer] : []);
  const v = usePlanVisit(initial, preset);
  const g = usePlanGathering(initial, { isOfficer: v.isOfficer, assignee: v.assignee });
  // More farmers than a visit takes: open on the gathering tab.
  const tooManyForVisit = initial.length > MAX_BATCH_FARMERS;
  const [tab, setTab] = useState<PlanTab>(allowGathering && tooManyForVisit ? "gathering" : "visit");
  const isGathering = allowGathering && tab === "gathering";

  const isSchedule = mode === "schedule";
  const showBatch = v.view === "batch" && !!v.batch;
  const done = isGathering ? !!g.result : !!v.result || showBatch;
  const title = isGathering ? "Plan a Gathering" : isSchedule ? "Schedule Visit" : "Plan a Visit";
  const subtitle = isGathering
    ? "Invite farmers to one meeting and notify them by SMS"
    : isSchedule
      ? "Schedule a field visit and notify the farmer"
      : "Plan a field visit and notify the farmer";
  const primaryLabel = isSchedule ? "Schedule" : "Plan visit";
  const batchFailed = v.batch?.filter((r) => r.reason) ?? [];
  const visitBlocked = allowGathering && tooManyForVisit;

  const gatheringFooter = g.result ? (
    <Button type="button" variant="brand" onClick={onClose}>
      Done
    </Button>
  ) : (
    <>
      <Button type="button" variant="outline" className="mr-auto" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" form={GATHERING_FORM_ID} variant="brand" className="gap-2" disabled={g.submitting || g.farmers.length === 0}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 13l4 4L19 7" />
        </svg>
        {g.submitting ? "Saving…" : `Plan gathering (${g.farmers.length} farmer${g.farmers.length === 1 ? "" : "s"})`}
      </Button>
    </>
  );

  const visitFooter = visitBlocked ? (
    <Button type="button" variant="outline" onClick={onClose}>
      Cancel
    </Button>
  ) : v.result ? (
    <Button type="button" variant="brand" onClick={onClose}>
      Done
    </Button>
  ) : showBatch ? (
    batchFailed.length === 0 ? (
      <Button type="button" variant="brand" onClick={onClose}>
        Done
      </Button>
    ) : (
      <>
        <Button type="button" variant="outline" className="mr-auto" onClick={v.discardFailed} disabled={v.submitting}>
          Discard failed
        </Button>
        <Button type="button" variant="brand" className="gap-2" onClick={() => void v.retryFailed()} disabled={v.submitting}>
          {v.submitting ? "Retrying…" : `Retry failed (${batchFailed.length})`}
        </Button>
      </>
    )
  ) : (
    <>
      <Button type="button" variant="outline" className="mr-auto" onClick={onClose}>
        Cancel
      </Button>
      <Button type="button" variant="outline" onClick={() => v.finish("draft")} disabled={v.submitting}>
        Save as draft
      </Button>
      <Button type="submit" form={FORM_ID} variant="brand" className="gap-2" disabled={v.submitting}>
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M5 13l4 4L19 7" />
        </svg>
        {v.submitting ? "Saving…" : v.selected.length > 1 ? `${primaryLabel} (${v.selected.length} farmers)` : primaryLabel}
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size="lg"
      icon={
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-info-tint text-[16px] font-semibold text-blue-600">
          FP
        </span>
      }
      bodyClassName="px-4 py-4 sm:px-6"
      footer={isGathering ? gatheringFooter : visitFooter}
    >
      {/* Visit or gathering: hidden once either is saved, so the result is not mixed with the other form. */}
      {allowGathering && !v.result && !showBatch && !g.result && (
        <div role="tablist" aria-label="Plan a visit or a gathering" className="mb-4 grid grid-cols-2 gap-1 rounded-lg bg-surface p-1">
          {(["visit", "gathering"] as const).map((key) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => setTab(key)}
              className={cn(
                "h-9 rounded-md text-[13.5px] transition-colors",
                tab === key ? "bg-white font-semibold text-brand-green shadow-sm" : "font-medium text-ink-soft hover:text-ink",
              )}
            >
              {key === "visit" ? `Plan a visit (up to ${MAX_BATCH_FARMERS})` : `Gathering (up to ${MAX_GATHERING_FARMERS})`}
            </button>
          ))}
        </div>
      )}

      {/* The DA both forms are for (officers only); one picker shared by the two tabs. */}
      {v.isOfficer && !done && !(tab === "visit" && visitBlocked) && (
        <div className="mb-4">
          <DaPicker agents={v.agents} error={v.agentsError} value={v.assignee} onChange={v.setAssignee} />
        </div>
      )}

      {isGathering && (g.result ? <PlanGatheringSuccess result={g.result} /> : <PlanGatheringFields g={g} />)}

      <div className={cn(isGathering && "hidden")}>
      {visitBlocked && (
        <Banner tone="warning" title={`${initial.length} farmers selected`}>
          A visit plans up to {MAX_BATCH_FARMERS} farmers at once. Plan a gathering for all of them, or unselect {initial.length - MAX_BATCH_FARMERS} on the list.
        </Banner>
      )}
      {v.result && (
        <PlanVisitSuccess result={v.result} visitType={v.visitType} isSchedule={isSchedule} questionCount={v.visitType === ADVISORY_VISIT ? v.advisoryQa.filter((qa) => qa.question.trim()).length : 0} />
      )}
      {showBatch && !v.result && (
        <PlanVisitBatchResult rows={v.batch!} onDiscard={v.discard} onResubmit={v.resubmit} submitting={v.submitting} />
      )}
      {/* Kept mounted (hidden) under a result so "Change details" / "Retry failed" reuse the values entered. */}
      <form
        id={FORM_ID}
        className={cn("flex flex-col gap-4", (v.result || showBatch || visitBlocked) && "hidden")}
        onSubmit={(e) => {
          e.preventDefault();
          v.finish("planned");
        }}
      >
        {v.error && <Banner tone="error" title="Visit not saved">{v.error}</Banner>}
        <FarmerSearch query={v.query} onQueryChange={v.changeQuery} onSearch={v.runSearch} />
        <FarmerPicker
          selected={v.selected}
          onToggle={v.toggle}
          onRemove={v.remove}
          isFull={v.isFull}
          matches={v.matches}
          emptyText={v.emptyText}
          query={v.query}
          showCount={v.searched && !!v.term}
          onClearSearch={() => v.changeQuery("")}
          overrides={v.overrides}
          onDetailsChange={v.setOverride}
          readCommon={v.commonDetails}
        />
        <VisitTypePicker value={v.visitType} onChange={v.setVisitType} />
        <VisitDetailsFields selected={v.selected} preset={preset} isSchedule={isSchedule} />
      </form>
      </div>
    </Modal>
  );
}
