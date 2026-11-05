"use client";

import { useEffect, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { describeCropSownError, isCropsNotFound, listFarmerCrops, type ApiFarmerCrop } from "@/features/farmers";
import { SectionCard } from "./SectionCard";

const COLUMNS: Column<ApiFarmerCrop>[] = [
  { key: "record", header: "Record", cell: (row) => <span className="font-medium text-ink">{row.record_name}</span> },
  { key: "year", header: "Crop year", cell: (row) => row.display_fields?.find((f) => f.field_name === "crop_year")?.value || "—" },
  { key: "status", header: "Status", cell: (row) => [row.draft_status, row.approval_status].filter(Boolean).join(" · ") || "—" },
];

// The farmer's Crop Sown records (GET /farmers/{id}/crops). A 404 means the registry holds no crops for them.
export function CropHistorySection({ farmerCode }: { farmerCode: string }) {
  const [crops, setCrops] = useState<ApiFarmerCrop[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    listFarmerCrops(farmerCode)
      .then((rows) => current && setCrops(rows))
      .catch((err: unknown) => {
        if (!current) return;
        if (isCropsNotFound(err)) setCrops([]);
        else setError(describeCropSownError(err));
      });
    return () => {
      current = false;
    };
  }, [farmerCode]);

  return (
    <SectionCard title="Crop History" bodyClassName="p-0">
      {error ? (
        <div className="p-4"><Banner tone="error" title="Could not load crop details">{error}</Banner></div>
      ) : crops === null ? (
        <p className="px-4 py-8 text-center text-[13.5px] text-muted">Loading crops…</p>
      ) : (
        <DataTable
          columns={COLUMNS}
          rows={crops}
          rowKey={(row) => row.submission_id ?? row.internal_record_id ?? row.record_name}
          minWidth="440px"
          itemLabel="records"
          emptyTitle="No crops"
        />
      )}
    </SectionCard>
  );
}
