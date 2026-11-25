import { Banner } from "@/components/ui/Banner";
import { Spinner } from "@/components/ui/Spinner";
import type { ApiFarmerCrop } from "@/features/farmers";
import { SectionCard } from "./SectionCard";

// Crop reports saved for the farmer through the Crop Sown API (GET /farmers/{id}/crops); CropSownSection loads them.
export function SavedCropReports({ crops, error }: { crops: ApiFarmerCrop[] | null; error: string | null }) {
  return (
    <SectionCard title="Submitted Crop Sown Surveys" description="Crop Sown Surveys saved for this farmer." className="mb-5">
      {error ? (
        <Banner tone="error" title="Could not load Crop Sown Surveys">
          {error}
        </Banner>
      ) : crops === null ? (
        <div className="flex justify-center py-4 text-brand-green">
          <Spinner className="h-5 w-5" />
        </div>
      ) : crops.length === 0 ? (
        <p className="text-[14px] text-muted">No Crop Sown Surveys have been submitted for this farmer yet.</p>
      ) : (
        <ul className="divide-y divide-line-soft">
          {crops.map((c) => (
            <li key={c.submission_id ?? c.internal_record_id ?? c.record_name} className="flex flex-wrap items-center justify-between gap-2 py-2.5 text-[14px]">
              <span className="font-semibold text-ink">{c.record_name}</span>
              <span className="text-muted">
                {[c.draft_status, c.approval_status].filter(Boolean).join(" · ")}
                {c.submission_source ? ` · ${c.submission_source.replace(/_/g, " ").toLowerCase()}` : ""}
              </span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
