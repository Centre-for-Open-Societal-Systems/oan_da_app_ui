"use client";

import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Banner } from "@/components/ui/Banner";
import type { Farmer } from "../types";
import { FarmerPicker } from "./FarmerPicker";
import { FarmerSearch } from "./FarmerSearch";
import { ADVISORY_VISIT, FORM_ID, type VisitPreset } from "./planVisit";
import { AdvisoryQaFields } from "./AdvisoryQaFields";
import { PlanVisitSuccess } from "./PlanVisitSuccess";
import { usePlanVisit } from "./usePlanVisit";
import { VisitDetailsFields } from "./VisitDetailsFields";
import { VisitTypePicker } from "./VisitTypePicker";

export type { VisitPreset } from "./planVisit";

interface PlanVisitModalProps {
  /** Preselected farmer; when omitted the form starts with a search. */
  farmer?: Farmer;
  isOpen: boolean;
  onClose: () => void;
  /** "schedule" is the Priority-list flavour: same form, different copy and warning. */
  mode?: "plan" | "schedule";
  /** Reason, visit type and priority to preselect (the farmer comes from `farmer`). */
  preset?: VisitPreset;
}

export function PlanVisitModal({ farmer, isOpen, onClose, mode = "plan", preset }: PlanVisitModalProps) {
  const v = usePlanVisit(farmer, preset);

  const isSchedule = mode === "schedule";
  const title = isSchedule ? "Schedule Visit" : "Plan a Visit";
  const subtitle = isSchedule ? "Schedule a field visit and notify the farmer" : "Plan a field visit and notify the farmer";
  const primaryLabel = isSchedule ? "Schedule" : "Plan visit";

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
      footer={
        v.result ? (
          <Button type="button" variant="brand" onClick={onClose}>
            Done
          </Button>
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
            {v.submitting ? "Saving…" : primaryLabel}
          </Button>
        </>
        )
      }
    >
      {v.result ? (
        <PlanVisitSuccess result={v.result} visitType={v.visitType} isSchedule={isSchedule} questionCount={v.visitType === ADVISORY_VISIT ? v.advisoryQa.filter((qa) => qa.question.trim()).length : 0} />
      ) : (
      <form
        id={FORM_ID}
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          v.finish("planned");
        }}
      >
        {v.error && <Banner tone="error" title="Visit not saved">{v.error}</Banner>}
        <FarmerSearch query={v.query} onQueryChange={v.changeQuery} onSearch={v.runSearch} />
        <FarmerPicker
          selected={v.selected}
          onSelect={v.setSelected}
          matches={v.matches}
          emptyText={v.emptyText}
          query={v.query}
          showCount={v.searched && !!v.term}
          onClearSearch={() => v.changeQuery("")}
        />
        <VisitTypePicker value={v.visitType} onChange={v.setVisitType} />
        {v.visitType === ADVISORY_VISIT && <AdvisoryQaFields items={v.advisoryQa} onChange={v.setAdvisoryQa} />}
        <VisitDetailsFields selected={v.selected} preset={preset} isSchedule={isSchedule} />
      </form>
      )}
    </Modal>
  );
}
