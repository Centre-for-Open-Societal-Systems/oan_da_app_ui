import { Pill, type PillTone } from "@/components/ui/Pill";
import { Spinner } from "@/components/ui/Spinner";
import type { ApiFarmerCrop } from "@/features/farmers";
import { SectionCard } from "./SectionCard";

// "Crop sown" tab: the farmer's register record of GET /farmers/{id}/crops (the row with internal_record_id) —
// who created and approved it, its status, and the registry's own summary fields (display_fields).

// The registry's field names as labels: crop_sown_id → "Crop sown ID", fayda_fan_id → "Fayda FAN ID".
const ACRONYMS: Record<string, string> = { id: "ID", fan: "FAN", fin: "FIN", gc: "GC", ec: "EC", da: "DA", fpc: "FPC" };
export const fieldLabel = (name: string) =>
  name
    .split("_")
    .filter(Boolean)
    .map((w, i) => ACRONYMS[w.toLowerCase()] ?? (i === 0 ? w.charAt(0).toUpperCase() + w.slice(1) : w))
    .join(" ");

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

export function CropSownRecord({ crops, error }: { crops: ApiFarmerCrop[] | null; error: string | null }) {
  if (error) return <SectionCard title="Crop record" className="rounded-t-none border-t-0"><p className="text-[14px] text-danger">{error}</p></SectionCard>;
  if (crops === null)
    return (
      <SectionCard title="Crop record" className="rounded-t-none border-t-0">
        <div className="flex justify-center py-4 text-brand-green"><Spinner className="h-5 w-5" /></div>
      </SectionCard>
    );

  const record = registerRecord(crops);
  if (!record)
    return (
      <SectionCard title="Crop record" className="rounded-t-none border-t-0">
        <p className="text-[14px] text-muted">This farmer has no approved Crop Sown record yet.</p>
      </SectionCard>
    );

  const fields = [...(record.display_fields ?? [])].sort((a, b) => a.order - b.order);

  return (
    <div className="flex animate-fade-in flex-col gap-5">
      <SectionCard title={record.record_name} className="rounded-t-none border-t-0">
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

      <SectionCard title="Crop record" collapsible>
        {fields.length === 0 ? (
          <p className="text-[14px] text-muted">The registry sent no summary fields for this record.</p>
        ) : (
          <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {fields.map((f) => (
              <div key={f.field_name} className="min-w-0">
                <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">{fieldLabel(f.field_name)}</dt>
                <dd className="mt-1 break-words text-[15px] font-bold text-ink">{f.value || "—"}</dd>
              </div>
            ))}
          </dl>
        )}
      </SectionCard>
    </div>
  );
}
