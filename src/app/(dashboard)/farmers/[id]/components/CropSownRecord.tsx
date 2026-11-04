import { Pill, type PillTone } from "@/components/ui/Pill";
import type { ApiFarmerCrop } from "@/features/farmers";
import { SectionCard } from "./SectionCard";

// "Crop Sown" tab: the status of the farmer's register record of GET /farmers/{id}/crops (the row with
// internal_record_id): who created and approved it. Nothing shows until the farmer has one.

const statusTone = (status?: string): PillTone => {
  const s = status?.toLowerCase() ?? "";
  if (/approved|active/.test(s)) return "green";
  if (/reject|inactive|cancel/.test(s)) return "red";
  if (/pending|review|submitted|draft/.test(s)) return "amber";
  return "slate";
};

/** The register record among the farmer's crop rows: the API lists it after the intake submissions. */
export const registerRecord = (crops: ApiFarmerCrop[]) => crops.find((c) => c.internal_record_id || c.functional_record_id);

function Meta({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[minmax(0,10rem)_1fr] items-center gap-3 text-[14px]">
      <dt className="text-muted">{label}</dt>
      <dd className="min-w-0 break-words font-semibold text-ink">{value || "—"}</dd>
    </div>
  );
}

export function CropSownRecord({ crops }: { crops: ApiFarmerCrop[] | null }) {
  const record = crops && registerRecord(crops);
  if (!record) return null;

  return (
    <SectionCard title={record.record_name} className="shadow-xs">
      <div className="grid grid-cols-1 gap-x-10 gap-y-3 lg:grid-cols-2">
        <dl className="flex flex-col gap-3">
          <Meta label="Functional Record ID" value={record.functional_record_id} />
          <Meta label="Record Status" value={record.approval_status && <Pill tone={statusTone(record.approval_status)}>{record.approval_status}</Pill>} />
        </dl>
        <dl className="flex flex-col gap-3">
          <Meta label="Created by" value={record.created_by} />
          <Meta label="Created at" value={record.created_at ?? record.first_created_at} />
          <Meta label="Last approved by" value={record.approved_by} />
          <Meta label="Last updated at" value={record.last_updated_at} />
        </dl>
      </div>
    </SectionCard>
  );
}
