"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { BackLink } from "@/components/ui/BackLink";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { ApiError } from "@/lib/api";
import { readDraft, removeDraft, writeDraft } from "@/lib/drafts";
import {
  CROP_SOWN_FORM,
  CROP_SOWN_INTRO_TAB,
  CROP_SOWN_TABS,
  FARMERS,
  FarmerAvatar,
  describeCropSownError,
  findFarmersById,
  getCropSownPrefill,
  registryCode,
  MissingFieldError,
  saveStage,
  validateSections,
  type FieldErrors,
  fieldInMessage,
  type StageDrafts,
  type ApiFarmerCrop,
  listFarmerCrops,
  loadCropDetails,
  labelOfCode,
  fetchFarmerPlots,
  type GeoIds,
  type GeoIdsBySection,
  useIntakeFields,
  valueKey,
  type CropSownValues,
  type Farmer,
} from "@/features/farmers";
import { SectionCard } from "../../[id]/components/SectionCard";
import { CropSownHistory } from "./CropSownHistory";
import { CropSownSectionFields } from "./CropSownSectionFields";

const DRAFT_KEY = "crop-report";

interface Draft {
  farmerId: string;
  values: CropSownValues;
  savedAt: string;
}

type Notice = { tone: "success" | "info" | "error"; title: string; body?: string };

/** A farmer known only by the Farmer ID typed in; the id doubles as the registry code sent to the Crop Sown routes. */
const farmerFromId = (id: string): Farmer => ({
  id,
  regId: id,
  // No made-up name: the registry fills the real one in. A plain word passes the registry's name rule (letters only).
  name: "Farmer",
  email: "",
  phone: "",
  kebele: "—",
  woreda: "",
  region: "",
  crop: "—",
  landHa: 0,
  livestock: "—",
  livestockHeads: 0,
  registeredAt: "—",
  registeredTime: "",
  status: "Verified",
  totalPlots: 0,
  visits: 0,
  lastVisit: "—",
});

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

// Submit Crop Report: find the farmer by Farmer ID, start from what the registries already hold for them,
// then complete the Crop Sown Registry stages tab by tab. No Crop Sown API yet — drafts stay in this session.
export function CropReportForm() {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<Farmer[] | null>(null);
  const [farmer, setFarmer] = useState<Farmer>();
  const [values, setValues] = useState<CropSownValues>({});
  const [prefilled, setPrefilled] = useState<CropSownValues>({});
  const [tab, setTab] = useState(CROP_SOWN_TABS[0].key);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showAutoFillBanner, setShowAutoFillBanner] = useState(true);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  /** The registry draft of each stage (submission id + subject record), kept between the step-by-step saves. */
  const [drafts, setDrafts] = useState<StageDrafts>({});
  const [savingStep, setSavingStep] = useState(false);
  const [searching, setSearching] = useState(false);
  /** The farmer's Crop Sown record as the registry lists it (GET /farmers/{id}/crops); null until a search has read it. */
  const [history, setHistory] = useState<ApiFarmerCrop[] | null>(null);
  /** The registry refused the farmer to this DA (not linked or assigned): shown instead of "no farmer found". */
  const [accessDenied, setAccessDenied] = useState<string | null>(null);
  /** What the registry answered for the farmer just found: what was filled in, and what it could not give. */
  const [loadNote, setLoadNote] = useState<{ tone: "success" | "info" | "error"; title: string; body: string } | null>(null);
  /** What failed the registry's checks, by field; cleared per field as it is edited. */
  const [errors, setErrors] = useState<FieldErrors>({});
  /** The API's reference for the saved submission, shown on the success popup. */
  const [reference, setReference] = useState<string>();

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  const choose = (f: Farmer, crops?: ApiFarmerCrop[]) => {
    const draft = readDraft<Draft>(DRAFT_KEY);
    const hasDraft = draft && draft.farmerId === f.id;
    // Demo farmers keep their sample record; any other farmer is filled from the registry's own APIs (below).
    const isDemo = FARMERS.some((d) => d.id === f.id);
    const prefill = isDemo ? getCropSownPrefill(f) : { [valueKey("identity", "farmer_id")]: registryCode(f), [valueKey("identity", "farmer_name")]: f.name };
    setLoadNote(null);
    if (!isDemo) void loadFromRegistry(f, crops);
    setFarmer(f);
    setDrafts({});
    setErrors({});
    setPrefilled(prefill);
    // The registry takes the current crop year only: start from it (editable).
    setValues(hasDraft ? draft.values : { ...prefill, [valueKey("identity", "crop_year")]: String(new Date().getFullYear()) });
    setTab(CROP_SOWN_TABS[0].key);
    setSubmitted(false);
    setShowAutoFillBanner(true);
    if (hasDraft) {
      setNotice({ tone: "info", title: `Draft restored for ${f.name}`, body: `Saved at ${draft.savedAt}.` });
    }
  };

  /**
   * Fills the form from the registry's own APIs: the Land API (GET /farmers/{id}/plots: the first plot's id, area,
   * ownership and soil fertility) and the Crop Sown API (GET /farmers/{id}/crops: the farmer's earlier submissions, the
   * newest of each stage filling its tab). What a farmer already has on record wins over the plot. The cluster registry has
   * no API. Says what it found, and what it could not get.
   */
  const loadFromRegistry = async (f: Farmer, listed?: ApiFarmerCrop[]) => {
    const code = registryCode(f);
    const [plotsResult, cropsResult] = await Promise.allSettled([fetchFarmerPlots(code), loadCropDetails(code, listed)]);
    const landed: CropSownValues = {};
    const lines: string[] = [];
    let failure: unknown = null;

    if (plotsResult.status === "fulfilled") {
      const plots = plotsResult.value;
      const first = plots[0];
      if (first) {
        for (const section of ["planning", "cultivation", "sowing", "harvest"]) {
          landed[valueKey(section, "land_id")] = first.plot_id;
          if (first.area_in_hectare !== null && section !== "sowing" && section !== "harvest") landed[valueKey(section, "land_area")] = String(first.area_in_hectare);
        }
        // The Land API speaks the registry's codes (OWNER, SF_HIGH): shown here by their labels.
        const ownership = first.land_ownership_type ? labelOfCode("OWNERSHIP_TYPE", first.land_ownership_type) : undefined;
        const soil = first.soil_fertility ? labelOfCode("SOIL_FERTILITY", first.soil_fertility) : undefined;
        if (ownership) landed[valueKey("planning", "ownership_type")] = ownership;
        if (soil) landed[valueKey("planning", "soil_fertility_type")] = soil;
        lines.push(`${plots.length} plot${plots.length === 1 ? "" : "s"} on record (Land ID ${first.plot_id} filled in; change it for another plot)`);
      } else {
        lines.push("no plots on record");
      }
    } else {
      failure = plotsResult.reason;
    }

    let earlier: CropSownValues = {};
    if (cropsResult.status === "fulfilled") {
      const crop = cropsResult.value;
      earlier = crop.values;
      lines.push(crop.total === 0 ? "no earlier Crop Sown submission" : `${crop.total} earlier Crop Sown submission${crop.total === 1 ? "" : "s"}${crop.stages.length ? ` (filled in: ${crop.stages.join(", ")})` : " (their details could not be read)"}`);
    } else {
      failure ??= cropsResult.reason;
    }

    // Registry data under what the user has already typed; earlier submissions over the plot's values.
    setValues((prev) => ({ ...landed, ...earlier, ...Object.fromEntries(Object.entries(prev).filter(([, v]) => v !== "")) }));
    if (failure) {
      setLoadNote({ tone: "error", title: `${f.name}: some registry data could not be loaded`, body: `${describeCropSownError(failure)}${lines.length ? ` Loaded: ${lines.join("; ")}.` : ""} Enter the rest yourself.` });
    } else {
      setLoadNote({ tone: "success", title: `${f.name}: loaded from the registry`, body: `${lines.join("; ")}. Cluster details have no registry API: enter them here.` });
    }
  };

  const search = async () => {
    if (searching) return;
    setAccessDenied(null);
    setHistory(null);
    const q = query.trim();
    // Search by query or default to demo farmer Lelise Gudeta (FR-88466) if search clicked with empty input
    let found = q ? findFarmersById(q) : [FARMERS[0]];
    // Not a demo farmer: the Search button asks the registry's Crop Sown API for the farmer's record
    // (GET /farmers/{id}/crops). That one list tells whether the farmer exists and is this DA's, and it is reused to fill
    // the form (not asked for twice). No profile call is made here.
    let crops: ApiFarmerCrop[] | undefined;
    if (found.length === 0 && /^[A-Za-z0-9][A-Za-z0-9_-]{2,}$/.test(q)) {
      setSearching(true);
      try {
        crops = await listFarmerCrops(q);
        setHistory(crops);
        found = [farmerFromId(q)];
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          found = [];
        } else if (err instanceof ApiError && err.status === 403) {
          // Not this DA's farmer: nothing can be read or saved for them, so do not carry on with the ID.
          found = [];
          setAccessDenied(describeCropSownError(err));
        } else {
          // The registry could not be asked: carry on with the ID as typed, and say so.
          found = [farmerFromId(q)];
          setNotice({ tone: "error", title: "Farmer details could not be loaded", body: `${describeCropSownError(err)} You can still enter the report with this Farmer ID.` });
        }
      } finally {
        setSearching(false);
      }
    }
    setMatches(found);
    if (found.length === 1) {
      choose(found[0], crops);
    } else if (found.length === 0) {
      setFarmer(undefined);
    }
  };

  /** Stores the form as a session draft. False when storage is blocked. */
  const saveDraft = (): boolean => {
    if (!farmer) return false;
    const savedAt = now();
    try {
      writeDraft<Draft>(DRAFT_KEY, { farmerId: farmer.id, values, savedAt });
      return true;
    } catch {
      setNotice({ tone: "error", title: "Draft not saved", body: "This browser is blocking storage. Keep this page open, or submit the report." });
      return false;
    }
  };

  // Each stage is saved before moving on, so a closed tab or lost connection costs at most the current stage.
  /** Runs the registry's checks on the current tab (and the identity the stage hangs on); true when nothing is wrong. */
  const checkTab = (): boolean => {
    // A stage hangs on the identity (and Planning on the address), which the "Crop Sown" tab holds: checked as the stage is saved.
    const stage = CROP_SOWN_FORM.find((t) => t.key === tab)?.sections ?? current.sections;
    const all = validateSections(stage, values);
    // A value fetched from the registry cannot be edited here, so it is not held to the form's rules (the Farmer ID, which
    // the user typed to find the farmer, still is).
    const found = Object.fromEntries(Object.entries(all).filter(([k]) => !(k in prefilled) || k === "identity.farmer_id"));
    setErrors(found);
    const bad = Object.keys(found);
    if (bad.length === 0) return true;
    if (!current.sections.some((s) => bad[0].startsWith(`${s.id}.`))) setTab(CROP_SOWN_INTRO_TAB);
    setNotice({ tone: "error", title: `${bad.length} field${bad.length === 1 ? "" : "s"} need attention`, body: found[bad[0]] });
    window.setTimeout(() => document.getElementById(bad[0])?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
    return false;
  };

  /** Shows an API rejection: on the field it names (switching to its tab) when it names one, else as a banner. */
  const showSaveError = (err: unknown, title: string) => {
    const message = describeCropSownError(err);
    // The tab being saved first: field names such as land_id repeat across the four forms.
    const named = err instanceof MissingFieldError ? null : fieldInMessage(message, current.sections) ?? fieldInMessage(message, CROP_SOWN_TABS.flatMap((t) => t.sections));
    if (err instanceof MissingFieldError) setTab(err.tab);
    if (named) {
      const owner = current.sections.some((s) => s.id === named.sectionId) ? current : CROP_SOWN_TABS.find((t) => t.sections.some((s) => s.id === named.sectionId));
      if (owner && owner.key !== tab) setTab(owner.key);
      setErrors({ [named.key]: message });
      window.setTimeout(() => document.getElementById(named.key)?.scrollIntoView({ behavior: "smooth", block: "center" }), 80);
    }
    setNotice({ tone: "error", title, body: message });
  };

  const saveAndNext = async () => {
    if (!farmer || savingStep || !checkTab() || !saveDraft()) return;
    setSavingStep(true);
    try {
      const result = await saveStage({ farmer, tab, values, drafts, geoIds: geoIds.current });
      setDrafts(result.drafts);
      setNotice(null);
      goTo(tabIndex + 1);
    } catch (err) {
      showSaveError(err, `${current.label} not saved`);
    } finally {
      setSavingStep(false);
    }
  };

  const handleOpenConfirm = (e?: FormEvent) => {
    if (e) e.preventDefault();
    if (!farmer || !checkTab()) return;
    setShowConfirmModal(true);
  };

  // Saves the last stage (the earlier ones were saved by Save & Next) and shows the application reference.
  const handleConfirmSubmit = async () => {
    if (!farmer || isSaving) return;
    setIsSaving(true);
    try {
      const result = await saveStage({ farmer, tab, values, drafts, geoIds: geoIds.current });
      setDrafts(result.drafts);
      setReference(result.drafts.planning?.reference ?? Object.values(result.drafts).find((d) => d?.reference)?.reference);
      removeDraft(DRAFT_KEY);
      setSubmitted(true);
      setShowConfirmModal(false);
      setShowSuccessModal(true);
    } catch (err) {
      setShowConfirmModal(false);
      showSaveError(err, "Crop report not submitted");
    } finally {
      setIsSaving(false);
    }
  };

  const handleBackToStart = () => {
    setShowSuccessModal(false);
    setShowConfirmModal(false);
    setFarmer(undefined);
    setQuery("");
    setMatches(null);
    setHistory(null);
    setValues({});
    setPrefilled({});
    setSubmitted(false);
    setIsEditing(false);
    setTab(CROP_SOWN_TABS[0].key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const tabIndex = CROP_SOWN_TABS.findIndex((t) => t.key === tab);
  const current = CROP_SOWN_TABS[tabIndex];
  const isLast = tabIndex === CROP_SOWN_TABS.length - 1;
  const goTo = (i: number) => {
    setTab(CROP_SOWN_TABS[i].key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  // Registry choices for the current tab; the geo ids picked in each section are kept for the save.
  const { optionsOf, requiredOf } = useIntakeFields(tab);
  const geoIds = useRef<GeoIdsBySection>({});
  const setGeoIds = useCallback((sectionId: string, ids: GeoIds) => {
    geoIds.current[sectionId] = ids;
  }, []);

  return (
    <div className="flex w-full flex-col gap-4">
      {/* Top back navigation */}
      <BackLink
        {...(isEditing ? { onClick: () => setIsEditing(false) } : { href: "/dashboard" })}
      />

      {/* Mode 1: Search & Found Card Mode (Image 1) */}
      {!isEditing && (
        <>
          <Card className="px-5 py-5 shadow-card">
            <h1 className="text-[20px] font-bold tracking-tight text-ink sm:text-[22px]">Submit Crop Report</h1>
            <p className="mt-1 text-[13.5px] text-ink-soft">
              Find the farmer by Farmer ID. Their registry details fill in automatically; complete each Crop Sown stage and submit.
            </p>
          </Card>

          {/* Find Farmer Search Box */}
          <SectionCard
            title="Find Farmer"
            description="Assigned location, kebele details, and regional placement information."
          >
            <div className="flex flex-col gap-3">
              <form
                className="flex flex-col gap-2.5 sm:flex-row sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  search();
                }}
              >
                <div className="flex flex-1 flex-col gap-2">
                  <label htmlFor="farmer-id" className="text-[14px] font-medium text-ink">
                    Farmer ID <span className="text-danger">*</span>
                  </label>
                  <Input
                    id="farmer-id"
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Enter Farmer ID"
                    autoComplete="off"
                  />
                </div>
                <Button type="submit" variant="brand" disabled={searching} className="h-11 px-6 font-semibold">
                  {searching ? "Searching…" : "Search"}
                </Button>
              </form>

              {matches?.length === 0 && accessDenied && (
                <Banner tone="error" title={`You cannot report for "${query.trim()}"`}>
                  {accessDenied} Choose a farmer from{" "}
                  <Link href="/farmers" className="font-semibold underline">
                    My Farmers
                  </Link>
                  , or ask your supervisor to assign this farmer to you.
                </Banner>
              )}
              {matches?.length === 0 && !accessDenied && (
                <Banner tone="error" title={`No farmer found with ID "${query.trim()}"`}>
                  Check the ID on the farmer&apos;s registration card (format FR-00000), or find them under{" "}
                  <Link href="/farmers" className="font-semibold underline">
                    My Farmers
                  </Link>
                  .
                </Banner>
              )}
              {matches && matches.length > 1 && (
                <ul className="overflow-hidden rounded-lg border border-line">
                  <li className="border-b border-line-soft bg-surface px-3.5 py-2 text-[12.5px] text-muted">
                    {matches.length} farmers share ID {query.trim().toUpperCase()} — pick the right one
                  </li>
                  {matches.map((f) => (
                    <li key={f.id} className="border-b border-line-soft last:border-0">
                      <button
                        type="button"
                        onClick={() => choose(f)}
                        className="flex w-full items-center gap-3 px-3.5 py-3 text-left transition-colors hover:bg-brand-wash"
                      >
                        <FarmerAvatar name={f.name} avatar={f.avatar} className="h-8 w-8 text-[12px]" />
                        <span className="min-w-0">
                          <span className="block text-[14px] font-semibold text-ink">{f.name}</span>
                          <span className="block truncate text-[12.5px] text-muted">
                            {f.kebele}, {f.woreda} · {f.crop} · {f.phone}
                          </span>
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </SectionCard>

          {/* When the user searches through the search box along with the input box, the data (card appears below) is displayed */}
          {farmer && (
            <Card className="flex items-center justify-between gap-4 p-5 shadow-card">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-[#16a34a] font-bold text-[16px]">
                  {farmer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[17px] font-bold text-ink sm:text-[18px]">{farmer.name}</h3>
                  <p className="mt-0.5 truncate text-[13.5px] text-muted">
                    {registryCode(farmer)} · {farmer.kebele}, {farmer.woreda} · {farmer.crop} · {farmer.landHa} ha
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="brand"
                className="flex shrink-0 items-center gap-1.5 px-6 py-2.5 font-semibold text-[14px]"
                onClick={() => setIsEditing(true)}
              >
                Edit →
              </Button>
            </Card>
          )}
          {farmer && <CropSownHistory crops={history} />}
        </>
      )}

      {/* Mode 2: Edit Multi-Stage Mode (Image 2) */}
      {isEditing && farmer && (
        <>
          {/* Top Summary Card with Change Button */}
          <SectionCard
            title="Find farmer"
            description="Auto-assigned from KPIs by the aggregation engine (backend) — rule-based, recomputed each period. Proposed 4-tier scheme."
          >
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4 min-w-0">
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#dcfce7] text-[#16a34a] font-bold text-[16px]">
                  {farmer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </div>
                <div className="min-w-0">
                  <h3 className="text-[17px] font-bold text-ink sm:text-[18px]">{farmer.name}</h3>
                  <p className="mt-0.5 truncate text-[13.5px] text-muted">
                    {registryCode(farmer)} · {farmer.kebele}, {farmer.woreda} · {farmer.crop} · {farmer.landHa} ha
                  </p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="px-5 py-2 text-[14px] font-medium text-ink hover:bg-slate-50 border-line shrink-0"
                onClick={handleBackToStart}
              >
                Change
              </Button>
            </div>
          </SectionCard>

          <CropSownHistory crops={history} />

          {loadNote && (
            <Banner tone={loadNote.tone} title={loadNote.title} onDismiss={() => setLoadNote(null)}>
              {loadNote.body}
            </Banner>
          )}

          {/* Auto-filled Notification Banner */}
          {showAutoFillBanner && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-[#bbf7d0] bg-[#f0fdf4] px-4 py-3 text-[13px] text-emerald-800">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-2 w-2 rounded-full bg-[#16a34a] shrink-0" />
                <div className="min-w-0">
                  <span className="font-bold text-[#14532d] text-[13.5px]">
                    115 fields auto-filled for {farmer.name}
                  </span>
                  <span className="hidden sm:inline text-emerald-800 font-normal ml-2">
                    Taken from the farmer&apos;s Farmer, Land and Cluster registry records (marked Auto-filled, read-only). Enter the remaining fields.
                  </span>
                  <p className="sm:hidden text-emerald-800 font-normal mt-0.5">
                    Taken from the farmer&apos;s Farmer, Land and Cluster registry records (marked Auto-filled, read-only). Enter the remaining fields.
                  </p>
                </div>
              </div>
              <button
                type="button"
                aria-label="Dismiss banner"
                onClick={() => setShowAutoFillBanner(false)}
                className="shrink-0 text-emerald-700 hover:text-emerald-950 p-1 transition-colors"
              >
                <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round">
                  <path d="M6 6l12 12M18 6L6 18" />
                </svg>
              </button>
            </div>
          )}

          {notice && (submitted || notice.tone === "error") && (
            <Banner tone={notice.tone} title={notice.title} onDismiss={() => setNotice(null)}>
              {notice.body}
              {submitted && farmer && (
                <>
                  {" "}
                  <Link href={`/farmers/${farmer.id}`} className="font-semibold underline">
                    Open farmer profile
                  </Link>
                </>
              )}
            </Banner>
          )}

          {/* Stages Form: Outer container card wrapping SegmentTabs and the section cards */}
          <form onSubmit={handleOpenConfirm} className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <div className="border-b border-line">
                <SegmentTabs
                  label="Crop Sown stages"
                  className="border-0 shadow-none rounded-none"
                  tabs={CROP_SOWN_TABS.map((t) => ({
                    key: t.key,
                    label: t.label,
                    // Fields still to enter on this stage.
                    count: t.sections.reduce((n, s) => n + s.fields.filter((f) => !values[valueKey(s.id, f.key)]).length, 0),
                  }))}
                  active={tab}
                  onChange={setTab}
                />
              </div>

              <fieldset key={current.key} disabled={submitted} className="p-5 flex flex-col gap-5 disabled:opacity-80 animate-fade-in">
                {current.sections.map((section) => (
                  <SectionCard
                    key={section.id}
                    title={section.title}
                    className="rounded-xl border border-line shadow-xs"
                  >
                    <CropSownSectionFields
                      section={section}
                      values={values}
                      prefilled={prefilled}
                      errors={errors}
                      optionsOf={optionsOf}
                      requiredOf={requiredOf}
                      onGeoIds={setGeoIds}
                      onChange={(changes) => {
                        setValues((prev) => ({ ...prev, ...changes }));
                        setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([e]) => !(e in changes))));
                      }}
                    />
                  </SectionCard>
                ))}
              </fieldset>
            </div>

            {/* Bottom Footer Card */}
            <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => saveDraft()}
                  disabled={submitted}
                  className="px-5 py-2.5 font-semibold text-ink"
                >
                  Save Draft
                </Button>
                <span className="flex items-center gap-1.5 text-[13.5px] font-normal text-muted">
                  <svg className="h-4 w-4 text-slate-500" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                  Auto-saved
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => goTo(tabIndex - 1)}
                  disabled={tabIndex === 0}
                  className="flex items-center gap-1.5 px-5 py-2.5 font-semibold text-ink"
                >
                  ← Previous Step
                </Button>
                {isLast ? (
                  <Button
                    type="button"
                    variant="brand"
                    onClick={handleOpenConfirm}
                    className="flex items-center gap-1.5 px-6 py-2.5 font-semibold"
                  >
                    Submit Crop sown →
                  </Button>
                ) : (
                  <Button
                    type="button"
                    variant="brand"
                    onClick={saveAndNext}
                    disabled={submitted || savingStep}
                    className="flex items-center gap-1.5 px-6 py-2.5 font-semibold"
                  >
                    {savingStep ? "Saving…" : "Save & Next →"}
                  </Button>
                )}
              </div>
            </div>
          </form>
        </>
      )}

      {/* Modal 1: Confirmation Modal (Image 2) */}
      {mounted && showConfirmModal && farmer && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-white shadow-2xl animate-scale-in">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-line px-6 py-5">
              <div className="flex items-center gap-3.5">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-purple-200 bg-purple-50 text-[15px] font-bold text-purple-700">
                  {farmer.name.split(" ").map((n) => n[0]).join("")}
                </div>
                <div>
                  <h3 className="text-[17px] font-bold text-ink sm:text-[18px]">
                    Submit crop report for {farmer.name}?
                  </h3>
                  <p className="mt-0.5 text-[13px] text-muted">
                    Review the summary below. Auto-filled registry data and your entries will be recorded together.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowConfirmModal(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-ink transition-colors"
                aria-label="Close modal"
              >
                <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="p-6">
              <p className="mb-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                REQUEST SUMMARY
              </p>
              <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white text-[13.5px]">
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-48 shrink-0 px-4 py-3 text-muted bg-slate-50/40 font-normal">Farmer</div>
                  <div className="px-4 py-3 font-semibold text-ink">{farmer.name} — {registryCode(farmer)}</div>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-48 shrink-0 px-4 py-3 text-muted bg-slate-50/40 font-normal">Crop</div>
                  <div className="px-4 py-3 font-semibold text-ink">{farmer.crop} · Quncho (DZ-Cr-387) · {farmer.landHa} ha</div>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-48 shrink-0 px-4 py-3 text-muted bg-slate-50/40 font-normal">Crop year / season</div>
                  <div className="px-4 py-3 font-semibold text-ink">{values["identity.crop_year"] || "2026"} · {values["identity.production_season"] || "Meher"}</div>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-48 shrink-0 px-4 py-3 text-muted bg-slate-50/40 font-normal">Registry data</div>
                  <div className="px-4 py-3 font-medium text-ink">115 fields auto-filled (read-only) from Farmer, Land and Cluster records</div>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-48 shrink-0 px-4 py-3 text-muted bg-slate-50/40 font-normal">Fields you entered</div>
                  <div className="px-4 py-3 font-medium text-ink">Planning, Cultivation, Sowing and Harvesting details for this crop cycle</div>
                </div>
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full sm:w-48 shrink-0 px-4 py-3 text-muted bg-slate-50/40 font-normal">Submission date</div>
                  <div className="px-4 py-3 font-semibold text-ink">14 Oct 2026</div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-t border-line bg-slate-50/70 px-6 py-4">
              <div className="flex items-center gap-2 text-[13px] text-muted">
                <svg className="h-4 w-4 text-slate-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
                <span>The Woreda office is notified once submitted.</span>
              </div>
              <div className="flex items-center gap-3 justify-end">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowConfirmModal(false)}
                  className="px-5 py-2 font-semibold text-ink"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  variant="brand"
                  onClick={handleConfirmSubmit}
                  disabled={isSaving}
                  className="flex items-center gap-1.5 px-6 py-2 font-semibold"
                >
                  {isSaving ? "Submitting…" : <>Confirm &amp; submit →</>}
                </Button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Modal 2: Success Modal (Image 3) */}
      {mounted && showSuccessModal && farmer && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-white p-6 shadow-2xl animate-scale-in text-center">
            {/* Close button */}
            <button
              type="button"
              onClick={handleBackToStart}
              className="absolute top-4 right-4 rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-ink transition-colors"
              aria-label="Close"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>

            {/* Checkmark icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-emerald-50">
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-600 text-white shadow-sm">
                <svg className="h-7 w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={3} strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              </div>
            </div>

            {/* Title & Description */}
            <h3 className="mt-4 text-[20px] font-bold text-ink">
              Crop report submitted!
            </h3>
            <p className="mt-2 text-[13.5px] leading-relaxed text-muted px-2">
              The Crop Sown report for {farmer.name} ({registryCode(farmer)}) — {farmer.crop}, {values["identity.crop_year"] || "2026"} {values["identity.production_season"] || "Meher"} season — has been submitted and sent to the Woreda office for review.
            </p>

            {/* Status Pill */}
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50/80 px-4 py-1.5 text-[12.5px] font-semibold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-600" />
              Pending Woreda review
            </div>
            {reference && <p className="mt-3 text-[12.5px] text-muted">Reference: <span className="font-semibold text-ink">{reference}</span></p>}

            {/* Action button: Back to farmer profile */}
            <div className="mt-6 pt-5 border-t border-line">
              <Button
                type="button"
                variant="brand"
                onClick={handleBackToStart}
                className="w-full py-3 text-[14.5px] font-semibold shadow-xs"
              >
                Back to farmer profile
              </Button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
