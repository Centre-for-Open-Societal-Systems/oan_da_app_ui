import { Pill, type PillTone } from "@/components/ui/Pill";
import { registerRowsOf, type ApiFarmerCrop } from "@/features/farmers";
import { cn } from "@/lib/utils";
import { SectionCard } from "./SectionCard";

// "Crop Sown" tab: the farmer's register records of GET /farmers/{id}/crops?source=register (rows with
// internal_record_id), one per season / crop sown ID. One is selected at a time; the stage tabs show that record.

const statusTone = (status?: string): PillTone => {
  const s = status?.toLowerCase() ?? "";
  if (/approved|active/.test(s)) return "green";
  if (/reject|inactive|cancel/.test(s)) return "red";
  if (/pending|review|submitted|draft/.test(s)) return "amber";
  return "slate";
};

/** The register record among the farmer's crop rows: the API lists it after the intake submissions. */
export const registerRecord = (crops: ApiFarmerCrop[]) => crops.find((c) => c.internal_record_id || c.functional_record_id);

/** The selected register record, else the first. */
export const selectedRegisterRecord = (crops: ApiFarmerCrop[] | null, selectedId: string | null) => {
  const records = crops ? registerRowsOf(crops) : [];
  return records.find((r) => r.internal_record_id === selectedId) ?? records[0];
};

function Meta({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">{label}</dt>
      <dd className="mt-1 break-words text-[14px] font-semibold text-ink">{value || "—"}</dd>
    </div>
  );
}

const display = (record: ApiFarmerCrop, key: string) => record.display_fields?.find((f) => f.field_name === key)?.value ?? undefined;

export function CropSownRecord({ crops, selectedId, onSelect }: { crops: ApiFarmerCrop[] | null; selectedId: string | null; onSelect: (internalRecordId: string) => void }) {
  const records = crops ? registerRowsOf(crops) : [];
  if (records.length === 0) return null;
  const selected = selectedRegisterRecord(crops, selectedId);

  return (
    <SectionCard title={records.length > 1 ? `Crop sown records (${records.length})` : "Crop sown record"} className="shadow-xs">
      {records.length > 1 && <p className="mb-3 text-[13px] text-muted">Select a record to see its Planning, Cultivation, Sowing, Harvesting and Production details.</p>}
      <div className="flex flex-col gap-3">
        {records.map((record) => {
          const active = record === selected;
          return (
            <button
              key={record.internal_record_id}
              type="button"
              aria-pressed={active}
              onClick={() => onSelect(record.internal_record_id!)}
              className={cn(
                "w-full rounded-xl border p-4 text-left transition-colors",
                active ? "border-brand-green bg-brand-wash" : "border-line bg-white hover:bg-surface",
              )}
            >
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className={cn("truncate text-[15px] font-bold", active ? "text-brand-green" : "text-ink")}>{record.record_name}</p>
                  <p className="text-[13px] text-muted">Crop sown ID: <span className="font-semibold text-ink">{record.functional_record_id ?? "—"}</span></p>
                </div>
                <div className="flex items-center gap-2">
                  {record.approval_status && <Pill tone={statusTone(record.approval_status)}>{record.approval_status}</Pill>}
                  {active && records.length > 1 && <Pill tone="green">Selected</Pill>}
                </div>
              </div>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-3 lg:grid-cols-4">
                <Meta label="Region" value={display(record, "region_name")} />
                <Meta label="Zone" value={display(record, "zone_name")} />
                <Meta label="Woreda" value={display(record, "woreda_name")} />
                <Meta label="Kebele" value={display(record, "kebele_name")} />
                <Meta label="Created by" value={record.created_by} />
                <Meta label="Created at" value={record.created_at ?? record.first_created_at} />
                <Meta label="Last approved by" value={record.approved_by} />
                <Meta label="Last updated at" value={record.last_updated_at} />
              </dl>
            </button>
          );
        })}
      </div>
    </SectionCard>
  );
}
