import type { LivestockOverview, Plot, Visit } from "@/features/farmers";
import { HoldingsSection } from "./HoldingsSection";
import { CropHistorySection } from "./CropHistorySection";
import { LivestockSection } from "./LivestockSection";
import { LivestockHistorySection } from "./LivestockHistorySection";
import { VisitHistorySection } from "./VisitHistorySection";
import { DocumentsSection } from "./DocumentsSection";

const OVERVIEW_VISIT_COUNT = 3;

// The Overview tab: a short version of every other tab on one screen. `visits`: the farmer's real history (sample when omitted).
export function ProfileOverview({ farmerCode, livestock, livestockError, plots, visits }: { farmerCode: string; livestock: LivestockOverview | null; livestockError?: string; plots?: Plot[]; visits?: Visit[] }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <HoldingsSection plots={plots} />
        <CropHistorySection farmerCode={farmerCode} />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <LivestockSection overview={livestock} error={livestockError} />
        <LivestockHistorySection submissions={livestock?.submissions ?? []} error={!!livestockError} />
      </div>
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <VisitHistorySection showViewAll visits={visits?.slice(0, OVERVIEW_VISIT_COUNT)} />
        <DocumentsSection />
      </div>
    </div>
  );
}
