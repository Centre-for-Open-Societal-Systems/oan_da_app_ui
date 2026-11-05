import { registryCode, type ApiFarmerCrop, type CropSownTab, type Farmer } from "@/features/farmers";
import { registerRecord } from "./CropSownRecord";
import { SectionCard } from "./SectionCard";

// "Production" tab (under More): the registry has no Production section in its spec yet, so this shows the summary
// the design names. Values come from the register record's display_fields when it sends them, else the farmer
// profile / Crop Sown identity; Production ID and Fayda FIN stay "—" until the API sends them.

function Row({ label, value }: { label: string; value?: string }) {
  return (
    <div className="grid grid-cols-[minmax(0,12rem)_1fr] gap-3 text-[14px]">
      <dt className="text-muted">{label}:</dt>
      <dd className="min-w-0 break-words font-semibold text-ink">{value || "—"}</dd>
    </div>
  );
}

export function ProductionSummary({ farmer, crops, tabs }: { farmer: Farmer; crops: ApiFarmerCrop[] | null; tabs: CropSownTab[] }) {
  const display = Object.fromEntries((crops && registerRecord(crops)?.display_fields || []).map((f) => [f.field_name, f.value ?? ""]));
  const identity = tabs[0]?.sections.find((s) => s.title === "Farmer Identity")?.fields ?? [];
  const fromIdentity = (key: string) => identity.find((f) => f.key === key)?.value;
  const pick = (key: string, fallback?: string) => display[key] || fallback;

  return (
    <SectionCard title="Production summary" className="shadow-xs">
      <div className="grid grid-cols-1 gap-y-3 lg:grid-cols-2 lg:divide-x lg:divide-line">
        <dl className="flex flex-col gap-3 lg:pr-8">
          <Row label="Production ID" value={pick("production_id")} />
          <Row label="Production season" value={pick("production_season", fromIdentity("production_season"))} />
        </dl>
        <dl className="flex flex-col gap-3 lg:pl-8">
          <Row label="Farmer ID" value={pick("farmer_id", registryCode(farmer))} />
          <Row label="Fayda FAN ID" value={pick("fayda_fan_id", fromIdentity("fayda_fan_id"))} />
          <Row label="Fayda FIN" value={pick("fayda_fin")} />
          <Row label="Farmer registry status" value={farmer.status} />
        </dl>
      </div>
    </SectionCard>
  );
}
