"use client";

import { useEffect, useRef, useState } from "react";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import {
  cropSownTabs,
  describeCropSownError,
  isCropsNotFound,
  listAllFarmerCrops,
  loadProductionSections,
  loadStageDisplay,
  mergeStageValues,
  registryCode,
  valueKey,
  type ApiFarmerCrop,
  type CropSownForm,
  type CropSownTab,
  type StageDisplay,
  type Farmer,
} from "@/features/farmers";
import { CropSownRecord, selectedRegisterRecord } from "./CropSownRecord";
import { ProductionSummary } from "./ProductionSummary";
import { SectionCard } from "./SectionCard";

const RECORD_TAB = "crop-sown";

// Crop Sown Registry record for the farmer, laid out as in the design: one card holding the tabs, with each tab's
// sections as cards inside it. The "Crop Sown" tab opens with the farmer's identity and address, then the status of the
// approved register record; each stage tab shows only its own sections as read-only field grids. The lists come from
// GET /farmers/{id}/crops?source=submission and ?source=register when the section opens; each stage tab reads its own
// data only when first clicked: the register record's tab (?internal_record_id=&tab_id=), else the newest submission
// of that stage (?submission_id=).
const STAGE_KEYS: CropSownForm[] = ["planning", "cultivation", "sowing", "harvesting"];
type ProductionSections = Awaited<ReturnType<typeof loadProductionSections>>;
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

// A stage section exactly as the intake form names it: its labels, and option codes shown as the option's label.

type IntakeFields = StageDisplay["sections"][number]["rows"][number];

function FieldGrid({ row }: { row: IntakeFields }) {
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
      {row.map((field) => (
        <div key={field.key} className="min-w-0">
          <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">{field.label}</dt>
          <dd className="mt-1 break-words text-[15px] font-bold text-ink">{field.value}</dd>
        </div>
      ))}
    </dl>
  );
}

/** "Record 2 · 454 · Rice": the record's first two filled values tell the records apart while closed. */
const recordSummary = (row: IntakeFields, index: number) =>
  [`Record ${index + 1}`, ...row.filter((f) => f.value !== "—").slice(0, 2).map((f) => `${f.label} ${f.value}`)].join(" · ");

// A section with several records (is_list): one collapsible row per record, the first open.
function RecordAccordion({ rows }: { rows: IntakeFields[] }) {
  const [open, setOpen] = useState<Set<number>>(() => new Set([0]));
  const toggle = (i: number) => setOpen((prev) => {
    const next = new Set(prev);
    if (next.has(i)) next.delete(i);
    else next.add(i);
    return next;
  });
  return (
    <div className="flex flex-col gap-3">
      {rows.map((row, i) => {
        const isOpen = open.has(i);
        return (
          <div key={i} className={`overflow-hidden rounded-xl border ${isOpen ? "border-brand-green/40" : "border-line"}`}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => toggle(i)}
              className={`flex w-full items-center gap-2 px-4 py-3 text-left text-[14px] font-semibold transition-colors ${isOpen ? "bg-brand-wash text-brand-green" : "bg-white text-ink hover:bg-surface"}`}
            >
              <svg className={`h-4 w-4 shrink-0 transition-transform ${isOpen ? "rotate-90" : ""}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M9 6l6 6-6 6" />
              </svg>
              <span className="min-w-0 truncate">{recordSummary(row, i)}</span>
            </button>
            {isOpen && (
              <div className="border-t border-line px-4 py-4">
                <FieldGrid row={row} />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

// One record shows as a grid; a list section with several records as collapsible records.
function IntakeCard({ section }: { section: StageDisplay["sections"][number] }) {
  return (
    <SectionCard title={section.title} collapsible className="shadow-xs">
      {section.rows.length === 0 ? (
        <p className="text-[13.5px] text-muted">None recorded.</p>
      ) : section.rows.length === 1 ? (
        <FieldGrid row={section.rows[0]} />
      ) : (
        <RecordAccordion rows={section.rows} />
      )}
    </SectionCard>
  );
}

// The register's Production tab has no portal spec yet: its sections show as the registry returns them.
const humanize = (key: string) => key.replace(/^cropsown_/, "").replace(/_section_d+$/, "").replace(/_/g, " ").replace(/^./, (c) => c.toUpperCase());
const show = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : Array.isArray(v) ? v.join(", ") : typeof v === "object" ? JSON.stringify(v) : typeof v === "boolean" ? (v ? "Yes" : "No") : String(v));

function RecordsCard({ sectionId, rows }: { sectionId: string; rows: Record<string, unknown>[] }) {
  if (rows.length === 0) return null;
  return (
    <SectionCard title={humanize(sectionId)} collapsible className="shadow-xs">
      <div className="flex flex-col gap-5">
        {rows.map((row, i) => (
          <dl key={i} className="grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-2 lg:grid-cols-3">
            {Object.entries(row).map(([key, value]) => (
              <div key={key} className="min-w-0">
                <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">{humanize(key)}</dt>
                <dd className="mt-1 break-words text-[15px] font-bold text-ink">{show(value)}</dd>
              </div>
            ))}
          </dl>
        ))}
      </div>
    </SectionCard>
  );
}


export function CropSownSection({ farmer }: { farmer: Farmer }) {
  const [active, setActive] = useState(RECORD_TAB);
  const [listed, setListed] = useState<{ code: string; crops: ApiFarmerCrop[] } | null>(null);
  // Loaded per tab, keyed `${code}|${tab}` so another farmer's tabs never show; a tab is fetched the first time it opens.
  const [stageData, setStageData] = useState<Record<string, StageDisplay>>({});
  const [production, setProduction] = useState<Record<string, ProductionSections>>({});
  const [error, setError] = useState<{ code: string; message: string } | null>(null);
  // The register record the stage tabs show (internal_record_id); the first one until another is picked.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const requested = useRef(new Set<string>());
  const code = registryCode(farmer);
  const crops = listed?.code === code ? listed.crops : null;
  const listError = error?.code === code ? error.message : null;
  const record = selectedRegisterRecord(crops, selectedId);
  const recordId = record?.internal_record_id;
  // Loaded data is keyed by farmer and register record, so switching records never shows another record's tabs.
  const scope = `${code}|${recordId ?? "-"}`;
  // The summary (identity, address) of the record shown; all rows when the farmer has no register record.
  const scopedCrops = crops && record ? [record] : crops;

  // "Crop Sown" tab: only the two lists (?source=submission and ?source=register).
  useEffect(() => {
    let live = true;
    (async () => {
      try {
        const rows = await listAllFarmerCrops(code);
        if (live) setListed({ code, crops: rows });
      } catch (err) {
        if (!live) return;
        if (isCropsNotFound(err)) setListed({ code, crops: [] });
        else setError({ code, message: describeCropSownError(err) });
      }
    })();
    return () => {
      live = false;
    };
  }, [code]);

  // A stage tab (or Production) reads its own register tab / submission when it is first opened.
  useEffect(() => {
    if (!crops || crops.length === 0) return;
    const key = `${scope}|${active}`;
    if (requested.current.has(key)) return;
    if (active === PRODUCTION_TAB) {
      if (!recordId) return;
      requested.current.add(key);
      void loadProductionSections(code, crops, recordId).then((sections) => setProduction((prev) => ({ ...prev, [key]: sections })));
    } else if (STAGE_KEYS.includes(active as CropSownForm)) {
      requested.current.add(key);
      void loadStageDisplay(code, crops, active as CropSownForm, { registerId: recordId }).then((display) =>
        setStageData((prev) => ({ ...prev, [key]: display })),
      );
    }
  }, [active, code, crops, recordId, scope]);

  const loadedStages = Object.fromEntries(STAGE_KEYS.flatMap((form) => (stageData[`${scope}|${form}`] ? [[form, stageData[`${scope}|${form}`].values]] : [])));
  const merged = scopedCrops ? mergeStageValues(scopedCrops, loadedStages, true) : null;

  // The profile already knows who the farmer is, whether or not they have a submission.
  const tabs = cropSownTabs({
    [valueKey("identity", "farmer_id")]: code,
    [valueKey("identity", "farmer_name")]: farmer.name,
    ...merged?.values,
  });
  const current = tabs.find((t) => t.key === active);
  const productionSections = production[`${scope}|${PRODUCTION_TAB}`];
  const currentStage = current ? stageData[`${scope}|${current.key}`] : undefined;
  const loading = !listError && (!crops || (crops.length > 0 && !!current && !currentStage));

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
        {listError && <Banner tone="error" title="Could not load crop details">{listError}</Banner>}
        {active === PRODUCTION_TAB ? (
          <>
            <ProductionSummary farmer={farmer} crops={scopedCrops} tabs={tabs} />
            {productionSections?.map((section) => <RecordsCard key={section.sectionId} sectionId={section.sectionId} rows={section.rows} />)}
          </>
        ) : !current ? (
          <>
            {tabs[0]?.sections.filter(isIntro).map((section) => <FieldsCard key={section.title} section={section} />)}
            <CropSownRecord crops={crops} selectedId={recordId ?? null} onSelect={setSelectedId} />
            {crops?.length === 0 && <EmptyState title="No crops" hint="No crop has been recorded for this farmer yet." />}
          </>
        ) : loading ? (
          <p className="py-8 text-center text-[13.5px] text-muted">Loading crop details…</p>
        ) : currentStage?.hasData ? (
          currentStage.sections.map((section) => <IntakeCard key={section.sectionId} section={section} />)
        ) : merged?.stages.includes(current.key as CropSownForm) ? (
          // The intake form could not be read: the portal's own layout stands in.
          current.sections.filter((section) => !isIntro(section)).map((section) => <FieldsCard key={section.title} section={section} />)
        ) : (
          !listError && <EmptyState title={`No ${current.label} details yet`} hint="Nothing has been submitted for this stage." />
        )}
      </div>
    </div>
  );
}
