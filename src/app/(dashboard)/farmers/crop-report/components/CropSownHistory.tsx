"use client";

import { submissionsOf, summaryOf, type ApiFarmerCrop } from "@/features/farmers";
import { SectionCard } from "../../[id]/components/SectionCard";

const MAX_ROWS = 8;

const day = (iso?: string) => (iso ? new Date(iso).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : "—");
const labelOf = (status?: string) => (status ? status[0] + status.slice(1).toLowerCase() : "—");

// The farmer's Crop Sown record from the registry (GET /farmers/{id}/crops): what the registry holds before a new report
// is entered. Newest submission first, then the approved register record the registry keeps for the crop.
export function CropSownHistory({ crops }: { crops: ApiFarmerCrop[] | null }) {
  if (!crops) return null;
  const submissions = submissionsOf(crops);
  const register = crops.find((c) => !c.submission_id);
  const summary = summaryOf(crops);
  const shown = submissions.slice(0, MAX_ROWS);

  return (
    <SectionCard
      title="Crop Sown record in the registry"
      description={crops.length === 0 ? "The registry has no Crop Sown record for this farmer yet." : `${submissions.length} submission${submissions.length === 1 ? "" : "s"}${register ? " and the approved register record" : ""}.`}
    >
      {crops.length > 0 && (
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[13.5px] sm:grid-cols-2 lg:grid-cols-3">
            {([
              ["Fayda FAN", summary.fayda_fan_id],
              ["Crop year", summary.crop_year],
              ["Region", summary.region_name],
              ["Zone", summary.zone_name],
              ["Woreda", summary.woreda_name],
              ["Kebele", summary.kebele_name],
            ] as const).map(([label, value]) => (
              <div key={label} className="flex gap-2">
                <dt className="w-24 shrink-0 text-muted">{label}</dt>
                <dd className="min-w-0 truncate font-medium text-ink">{value ?? "—"}</dd>
              </div>
            ))}
            {register?.functional_record_id && (
              <div className="flex gap-2">
                <dt className="w-24 shrink-0 text-muted">Register</dt>
                <dd className="min-w-0 truncate font-medium text-ink">{register.functional_record_id}</dd>
              </div>
            )}
          </dl>

          {shown.length > 0 && (
            <div className="overflow-x-auto rounded-lg border border-line">
              <table className="w-full min-w-[560px] text-left text-[13px]">
                <thead className="bg-surface text-muted">
                  <tr>
                    <th className="px-3 py-2 font-medium">Reference</th>
                    <th className="px-3 py-2 font-medium">Status</th>
                    <th className="px-3 py-2 font-medium">Approval</th>
                    <th className="px-3 py-2 font-medium">By</th>
                    <th className="px-3 py-2 font-medium">Updated</th>
                  </tr>
                </thead>
                <tbody>
                  {shown.map((c) => (
                    <tr key={c.submission_id} className="border-t border-line-soft">
                      <td className="px-3 py-2 font-semibold text-ink">{c.application_reference ?? "—"}</td>
                      <td className="px-3 py-2">{labelOf(c.draft_status)}</td>
                      <td className="px-3 py-2">{labelOf(c.approval_status)}</td>
                      <td className="px-3 py-2">{c.created_by ?? "—"}</td>
                      <td className="px-3 py-2 text-muted">{day(c.last_updated_at ?? c.first_created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {submissions.length > MAX_ROWS && <p className="text-[12.5px] text-muted">+ {submissions.length - MAX_ROWS} older submissions</p>}
        </div>
      )}
    </SectionCard>
  );
}
