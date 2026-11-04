"use client";

import { useEffect, useState } from "react";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { listFarmerCrops, registryCode, type ApiFarmerCrop, type CropSownTab, type Farmer } from "@/features/farmers";
import { CropSownRecord } from "./CropSownRecord";
import { ProductionSummary } from "./ProductionSummary";
import { SectionCard } from "./SectionCard";

const RECORD_TAB = "crop-sown";

// Crop Sown Registry record for the farmer, laid out as in the design: one card holding the tabs, with each tab's
// sections as cards inside it. The "Crop Sown" tab opens with the farmer's identity and address, then the status of the
// approved register record; each stage tab shows only its own sections as read-only field grids.
// Tabs under "More" with their own layout.
const PRODUCTION_TAB = "production";
const MORE_TABS = [{ key: PRODUCTION_TAB, label: "Production" }];

// Every registry form repeats these sections; the profile shows them once, on the "Crop Sown" tab.
const INTRO_SECTIONS = ["Farmer Identity", "Address / Location"];
const isIntro = (section: CropSownTab["sections"][number]) => INTRO_SECTIONS.includes(section.title);

function FieldsCard({ section }: { section: CropSownTab["sections"][number] }) {
  return (
    <SectionCard title={section.title} collapsible className="shadow-xs">
      <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
        {section.fields.map((field) => (
          <div key={`${field.key}-${field.label}`} className="min-w-0">
            <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">{field.label}</dt>
            <dd className="mt-1 break-words text-[15px] font-bold text-ink">{field.value}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

export function CropSownSection({ farmer, tabs }: { farmer: Farmer; tabs: CropSownTab[] }) {
  const [active, setActive] = useState(RECORD_TAB);
  const [crops, setCrops] = useState<ApiFarmerCrop[] | null>(null);
  const code = registryCode(farmer);

  useEffect(() => {
    let live = true;
    listFarmerCrops(code)
      .then((rows) => live && setCrops(rows))
      .catch(() => undefined); // Only the optional record status and Production values need them.
    return () => {
      live = false;
    };
  }, [code]);

  const current = tabs.find((t) => t.key === active);

  return (
    <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
      <div className="border-b border-line">
        <SegmentTabs
          label="Crop Sown stages"
          className="rounded-none border-0 shadow-none"
          tabs={[{ key: RECORD_TAB, label: "Crop Sown" }, ...tabs.map(({ key, label }) => ({ key, label }))]}
          more={MORE_TABS}
          active={active}
          onChange={setActive}
        />
      </div>

      <div key={active} className="flex animate-fade-in flex-col gap-5 p-5">
        {active === PRODUCTION_TAB ? (
          <ProductionSummary farmer={farmer} crops={crops} tabs={tabs} />
        ) : !current ? (
          <>
            {tabs[0]?.sections.filter(isIntro).map((section) => <FieldsCard key={section.title} section={section} />)}
            <CropSownRecord crops={crops} />
          </>
        ) : (
          current.sections.filter((section) => !isIntro(section)).map((section) => <FieldsCard key={section.title} section={section} />)
        )}
      </div>
    </div>
  );
}
