"use client";

import { useState } from "react";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import type { LivestockDetailsTab } from "@/features/farmers";
import { SectionCard } from "./SectionCard";

// The farmer's livestock report: one sub-tab per report stage, each stage's sections as read-only field grids.
export function LivestockDetailsSection({ tabs }: { tabs: LivestockDetailsTab[] }) {
  const [active, setActive] = useState(tabs[0]?.key ?? "farmer");
  const current = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="flex flex-col gap-0">
      <SegmentTabs
        label="Livestock Survey stages"
        tabs={tabs.map(({ key, label }) => ({ key, label }))}
        active={active}
        onChange={setActive}
      />

      {current && (
        <div key={current.key} className="flex animate-fade-in flex-col gap-5">
          {current.sections.map((section, index) => (
            <SectionCard
              key={section.title}
              title={section.title}
              collapsible
              // A flock's hatch can add dozens of records: the first few stay open, the rest one click away.
              defaultOpen={index < 3}
              className={index === 0 ? "rounded-t-none rounded-b-xl border-t-0" : undefined}
            >
              {section.note && <p className="mb-4 text-[13px] text-muted">{section.note}</p>}
              <dl className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
                {section.fields.map((field) => (
                  <div key={`${field.key}-${field.label}`} className="min-w-0">
                    <dt className="text-[13px] font-medium text-slate-500">{field.label}</dt>
                    <dd className="mt-1 break-words text-[15px] font-bold text-ink">
                      {field.isFarmerAvatar ? (
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-[15px] font-bold text-[#16a34a]">
                            {field.initials ?? "LG"}
                          </div>
                          <span>{field.value}</span>
                        </div>
                      ) : (
                        field.value
                      )}
                    </dd>
                  </div>
                ))}
              </dl>
            </SectionCard>
          ))}
        </div>
      )}
    </div>
  );
}
