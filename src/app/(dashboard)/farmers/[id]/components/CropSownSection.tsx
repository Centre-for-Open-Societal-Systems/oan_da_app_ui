"use client";

import { useEffect, useState } from "react";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { describeCropSownError, listFarmerCrops, registryCode, type ApiFarmerCrop, type CropSownTab, type Farmer } from "@/features/farmers";
import { CropSownRecord } from "./CropSownRecord";
import { ProductionSummary } from "./ProductionSummary";
import { SavedCropReports } from "./SavedCropReports";
import { SectionCard } from "./SectionCard";

const RECORD_TAB = "crop-sown";

// Crop Sown Registry record for the farmer: a "Crop sown" tab with the approved register record, then one sub-tab
// per registry stage, each stage's sections as read-only field grids.
// Tabs under "More" with their own layout.
const PRODUCTION_TAB = "production";
const MORE_TABS = [{ key: PRODUCTION_TAB, label: "Production" }];

export function CropSownSection({ farmer, tabs }: { farmer: Farmer; tabs: CropSownTab[] }) {
  const [active, setActive] = useState(RECORD_TAB);
  const [crops, setCrops] = useState<ApiFarmerCrop[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const code = registryCode(farmer);

  useEffect(() => {
    let live = true;
    listFarmerCrops(code)
      .then((rows) => live && setCrops(rows))
      .catch((err: unknown) => live && setError(describeCropSownError(err)));
    return () => {
      live = false;
    };
  }, [code]);

  const current = tabs.find((t) => t.key === active);

  return (
    <>
      <SavedCropReports crops={crops} error={error} />
      <div className="flex flex-col gap-0">
        <SegmentTabs
          label="Crop Sown stages"
          tabs={[{ key: RECORD_TAB, label: "Crop sown" }, ...tabs.map(({ key, label }) => ({ key, label }))]}
          more={MORE_TABS}
          active={active}
          onChange={setActive}
        />

        {active === PRODUCTION_TAB ? (
          <ProductionSummary farmer={farmer} crops={crops} tabs={tabs} />
        ) : !current ? (
          <CropSownRecord crops={crops} error={error} />
        ) : (
          <div key={current.key} className="flex animate-fade-in flex-col gap-5">
            {current.sections.map((section, index) => (
              <SectionCard
                key={section.title}
                title={section.title}
                collapsible
                className={index === 0 ? "rounded-t-none rounded-b-xl border-t-0" : undefined}
              >
                <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
                  {section.fields.map((field) => (
                    <div key={`${field.key}-${field.label}`} className="min-w-0">
                      <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">{field.label}</dt>
                      <dd className="mt-1 break-words text-[15px] font-bold text-ink">{field.value}</dd>
                    </div>
                  ))}
                </dl>
              </SectionCard>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
