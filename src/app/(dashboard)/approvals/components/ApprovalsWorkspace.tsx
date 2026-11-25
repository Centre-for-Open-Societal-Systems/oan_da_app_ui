"use client";

import { Card } from "@/components/ui/Card";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageLoader } from "@/components/ui/PageLoader";
import { ApprovalDetail } from "./ApprovalDetail";
import { ApprovalQueue } from "./ApprovalQueue";
import { ApprovedModal } from "./ApprovedModal";
import { ReviewDecisionModal } from "./ReviewDecisionModal";
import { useApprovals } from "./useApprovals";

// Woreda review of DA self-initiated profile changes (GET /profile/change-requests?status=Pending): verify →
// approve sends the change on to the DA Registry; reject and request changes need a reviewer note. Every decision
// is POST /profile/change-requests/{id}/decide and lands in the audit trail.
export function ApprovalsWorkspace() {
  const a = useApprovals();
  const { selected } = a;

  if (a.loading) return <PageLoader label="Loading the approval queue…" />;
  if (a.loadError) {
    return (
      <Card className="shadow-card">
        <EmptyState tone="error" title="The approval queue could not be loaded" hint={a.loadError} actionLabel="Try again" onAction={a.reload} />
      </Card>
    );
  }

  return (
    <>
      {a.error && <Banner tone="error" onDismiss={a.dismissError}>{a.error}</Banner>}
      {a.outcome && <Banner tone={a.outcome.tone} onDismiss={a.dismissOutcome}>{a.outcome.text}</Banner>}
      {!a.canDecide && <Banner tone="info">You can review this queue, but only the Woreda supervisor or an administrator can decide a request.</Banner>}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[350px_1fr]">
        <ApprovalQueue
          tab={a.tab}
          onTabChange={a.setTab}
          woreda={a.woreda}
          onWoredaChange={a.setWoreda}
          woredas={a.woredas}
          list={a.list}
          selectedId={selected?.id}
          onSelect={a.setSelectedId}
          checked={a.checked}
          onToggle={a.toggle}
          onToggleAll={a.toggleAll}
          allChecked={a.allChecked}
          checkableCount={a.checkable.length}
          checkedInView={a.checkedInView}
          canDecide={a.canDecide && !a.deciding}
          onApprove={(ids) => void a.decide(ids, "approve", "")}
          onReject={(ids) => a.openReview(ids)}
        />

        {selected ? (
          <ApprovalDetail
            key={selected.id}
            request={selected}
            note={a.notes[selected.id] ?? ""}
            onNoteChange={(value) => a.setNote(selected.id, value)}
            canDecide={a.canDecide && !a.deciding}
            onReview={() => a.openReview([selected.id], a.notes[selected.id] ?? "")}
            onApprove={() => void a.decide([selected.id], "approve", a.notes[selected.id]?.trim() ?? "")}
          />
        ) : (
          <Card className="shadow-card">
            <EmptyState title={a.list.length === 0 ? "Queue is clear" : "Select a request"} hint={a.list.length === 0 ? "No profile change requests are waiting for your review." : "Choose a request from the queue to verify its data and audit trail."} />
          </Card>
        )}
      </div>

      <ReviewDecisionModal
        reviewIds={a.reviewIds}
        reason={a.reason}
        reasonError={a.reasonError}
        onReasonChange={a.changeReason}
        onClose={a.closeReview}
        onSubmit={a.submitReview}
      />

      <ApprovedModal result={a.approved} onClose={a.closeApproved} />
    </>
  );
}
