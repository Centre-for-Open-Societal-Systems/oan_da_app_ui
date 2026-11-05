import { OVERVIEW_DOCUMENT_COUNT, type LivestockOverview } from "@/features/farmers";
import { HoldingsSection } from "./HoldingsSection";
import { CropHistorySection } from "./CropHistorySection";
import { LivestockSection } from "./LivestockSection";
import { LivestockHistorySection } from "./LivestockHistorySection";
import { VisitHistorySection } from "./VisitHistorySection";
import { DocumentsSection } from "./DocumentsSection";

// The Overview tab: a short version of every other tab on one screen.
export function ProfileOverview({ livestock, livestockError }: { livestock: LivestockOverview | null; livestockError?: string }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <HoldingsSection />
        <CropHistorySection />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <LivestockSection overview={livestock} error={livestockError} />
        <LivestockHistorySection submissions={livestock?.submissions ?? []} error={!!livestockError} />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <VisitHistorySection showViewAll />
        <DocumentsSection limit={OVERVIEW_DOCUMENT_COUNT} />
      </div>
    </div>
  );
}
