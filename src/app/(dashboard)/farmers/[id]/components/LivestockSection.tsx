"use client";

import { useState } from "react";
import { displayLivestockValue, LIVESTOCK_ANIMAL_SECTION, livestockAge, livestockSections, type ApiLivestockRecord, type LivestockOverview } from "@/features/farmers";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { SectionCard } from "./SectionCard";

const VACCINATION_TONE: Record<string, PillTone> = { UP_TO_DATE: "green", OVERDUE: "red", NONE: "amber" };
const FIELDS = livestockSections().find((s) => s.id === LIVESTOCK_ANIMAL_SECTION)?.fields ?? [];
const SHOWN = 5;

const field = (key: string) => FIELDS.find((f) => f.key === key);
const show = (row: ApiLivestockRecord, key: string) => {
  const def = field(key);
  return def ? displayLivestockValue(def, row[key]) : "—";
};
const nameOf = (row: ApiLivestockRecord) => String(row.ear_tag_id || row.secondary_identifier || row.record_name || "Animal");

// Livestock counterpart of HoldingsSection: one row per animal or flock on the register, with a details modal.
export function LivestockSection({ overview, error }: { overview: LivestockOverview | null; error?: string }) {
  const [viewing, setViewing] = useState<ApiLivestockRecord | null>(null);
  const animals = (overview?.holdings ?? []).filter((h) => h.source === "record").flatMap((h) => h.rows[LIVESTOCK_ANIMAL_SECTION] ?? []);

  return (
    <SectionCard title="Livestock and Herds" bodyClassName="flex flex-col gap-3">
      {error && <p className="text-[13.5px] text-danger">{error}</p>}
      {!error && animals.length === 0 && <p className="text-[13.5px] text-muted">No animals on record.</p>}
      {animals.slice(0, SHOWN).map((animal) => (
        <div key={String(animal.internal_record_id)} className="flex items-center justify-between rounded-lg border border-line-soft bg-surface px-4 py-3">
          <div>
            <p className="text-[14px] font-semibold text-ink">
              {nameOf(animal)} · {show(animal, "species")}
            </p>
            <p className="mt-0.5 text-[13px] text-muted">
              {typeof animal.quantity === "number" ? `${animal.quantity} heads · ` : ""}
              {show(animal, "breed")} · {show(animal, "health_status")}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Pill tone={VACCINATION_TONE[String(animal.vaccination_status)] ?? "amber"}>{show(animal, "vaccination_status")}</Pill>
            <button
              type="button"
              aria-label={`View ${nameOf(animal)} details`}
              title="Animal details"
              onClick={() => setViewing(animal)}
              className="rounded-md p-1.5 text-muted transition-colors hover:bg-white hover:text-brand-green"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>
      ))}
      {animals.length > SHOWN && <p className="text-[12.5px] text-muted">{animals.length - SHOWN} more under Livestock Details.</p>}

      {viewing && (
        <Modal
          isOpen
          onClose={() => setViewing(null)}
          title={`${nameOf(viewing)} · ${show(viewing, "species")}`}
          subtitle={`${show(viewing, "breed")} · ${show(viewing, "health_status")}`}
          footer={<Button variant="outline" onClick={() => setViewing(null)}>Close</Button>}
        >
          <dl className="grid grid-cols-2 gap-4">
            {FIELDS.map((f) => (
              <div key={f.key}>
                <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">{f.label}</dt>
                <dd className="mt-1 text-[14px] text-ink">{f.key === "age" ? livestockAge(viewing) : displayLivestockValue(f, viewing[f.key])}</dd>
              </div>
            ))}
          </dl>
        </Modal>
      )}
    </SectionCard>
  );
}
