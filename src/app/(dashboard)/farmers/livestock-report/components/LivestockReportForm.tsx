"use client";

import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createPortal } from "react-dom";
import { BackLink } from "@/components/ui/BackLink";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { Select } from "@/components/ui/Select";
import { ApiError } from "@/lib/api";
import { readDraft, removeDraft, writeDraft } from "@/lib/drafts";
import {
  animalOptions,
  applyLivestockIntake,
  buildLivestockSections,
  describeLivestockError,
  displayLivestockValue,
  emptyLivestockValues,
  fetchFarmerLivestock,
  fetchLivestockIntakeForm,
  GEO_LEVELS,
  isLivestockFieldVisible,
  LIVESTOCK_ANIMAL_SECTION,
  LIVESTOCK_LOCATION_SECTION,
  LIVESTOCK_REPORT_FORM,
  livestockFieldId,
  livestockPrefill,
  livestockSections,
  readLivestock,
  submitLivestockReport,
  tabOfLivestockField,
  useGeoLevels,
  validateLivestockForm,
  type GeoKey,
  type LivestockErrors,
  type LivestockFieldDef,
  type LivestockOverview,
  type LivestockRow,
  type LivestockSectionDef,
  type LivestockSubmitProgress,
  type LivestockValues,
} from "@/features/farmers";
import { SectionCard } from "../../[id]/components/SectionCard";
import { LivestockFieldInput } from "./LivestockFieldInput";

const DRAFT_KEY = "livestock-report";
const FARMER_ID = /^FR-\d{12}$/;

interface Draft {
  code: string;
  values: LivestockValues;
  progress: LivestockSubmitProgress | null;
  savedAt: string;
}

interface FoundFarmer {
  code: string;
  name: string;
  overview: LivestockOverview;
}

type Notice = { tone: "success" | "info" | "error"; title: string; body?: string };

const now = () => new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
const todayIso = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Submit Livestock Report: find the farmer by Farmer ID (GET /farmers/{id}/livestock), start from their newest holding, fill
// the tabs, then submit: the farmer sections and animals open a draft, the event sections join it, and finalize sends it for
// approval. "Save" keeps the form in this browser session; nothing reaches the registry until Submit.
export function LivestockReportForm() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [farmer, setFarmer] = useState<FoundFarmer | null>(null);
  const [values, setValues] = useState<LivestockValues>(() => emptyLivestockValues());
  const [intake, setIntake] = useState<Awaited<ReturnType<typeof fetchLivestockIntakeForm>> | null>(null);
  const [tab, setTab] = useState(LIVESTOCK_REPORT_FORM[0].key);
  const [notice, setNotice] = useState<Notice | null>(null);
  const [errors, setErrors] = useState<LivestockErrors>({});
  const [progress, setProgress] = useState<LivestockSubmitProgress | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [savedAt, setSavedAt] = useState<string>();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [reference, setReference] = useState<string | null | undefined>(undefined);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 0);
    return () => clearTimeout(t);
  }, []);

  // The live form overrides the built-in snapshot; if it cannot be read the snapshot is used and the API still has the last word on save.
  useEffect(() => {
    if (!isEditing || intake) return;
    let live = true;
    fetchLivestockIntakeForm().then((form) => live && setIntake(form)).catch(() => {});
    return () => {
      live = false;
    };
  }, [isEditing, intake]);

  const form = useMemo(() => applyLivestockIntake(LIVESTOCK_REPORT_FORM, intake), [intake]);
  const locationRow = values[LIVESTOCK_LOCATION_SECTION]?.[0] ?? {};
  const geo = useGeoLevels({ region: locationRow.region, zone: locationRow.zone, woreda: locationRow.woreda, kebele: locationRow.kebele }, "livestock");
  const animals = useMemo(() => animalOptions(values, farmer?.overview ?? null), [values, farmer]);

  const tabIndex = form.findIndex((t) => t.key === tab);
  const current = form[tabIndex];
  const isLast = tabIndex === form.length - 1;
  const goTo = (i: number) => {
    setTab(form[i].key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const search = async () => {
    if (searching) return;
    const code = query.trim().toUpperCase();
    setSearchError(null);
    setFarmer(null);
    if (!FARMER_ID.test(code)) {
      setSearchError("Enter the Farmer ID as FR- followed by 12 digits, e.g. FR-512145929324.");
      return;
    }
    setSearching(true);
    try {
      const overview = readLivestock(await fetchFarmerLivestock(code));
      const prefill = livestockPrefill(overview);
      const draft = readDraft<Draft>(DRAFT_KEY);
      const restored = draft?.code === code ? draft : null;
      setFarmer({ code, name: prefill.name || "Farmer", overview });
      setValues(restored?.values ?? { ...emptyLivestockValues(), ...prefill.values });
      setProgress(restored?.progress ?? null);
      setErrors({});
      setTab(LIVESTOCK_REPORT_FORM[0].key);
      setNotice(restored ? { tone: "info", title: "Draft restored", body: `Saved at ${restored.savedAt}.` } : null);
    } catch (err) {
      setSearchError(err instanceof ApiError && err.status === 404 ? `No farmer found with ID "${code}". Check the ID on the farmer's registration card.` : describeLivestockError(err));
    } finally {
      setSearching(false);
    }
  };

  const setRow = (sectionId: string, index: number, patch: LivestockRow) => {
    setValues((prev) => ({ ...prev, [sectionId]: (prev[sectionId] ?? []).map((row, i) => (i === index ? { ...row, ...patch } : row)) }));
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !Object.keys(patch).some((key) => k === livestockFieldId(sectionId, index, key)))));
  };

  const addRow = (section: LivestockSectionDef) => {
    const blank: LivestockRow = section.id === LIVESTOCK_ANIMAL_SECTION ? { registration_date: todayIso() } : {};
    setValues((prev) => ({ ...prev, [section.id]: [...(prev[section.id] ?? []), blank] }));
  };

  const removeRow = (sectionId: string, index: number) => {
    setValues((prev) => ({ ...prev, [sectionId]: (prev[sectionId] ?? []).filter((_, i) => i !== index) }));
    setErrors((prev) => Object.fromEntries(Object.entries(prev).filter(([k]) => !k.startsWith(`${sectionId}.`))));
  };

  const pickGeo = (key: GeoKey, name: string) => {
    // A new level empties the levels under it: their names belong to the old parent.
    const below = GEO_LEVELS.slice(GEO_LEVELS.findIndex((l) => l.key === key) + 1).map((l) => [l.key, ""]);
    setRow(LIVESTOCK_LOCATION_SECTION, 0, { [key]: name, ...Object.fromEntries(below), geo_lowest_level_value_id: "" });
  };

  const showErrors = (found: LivestockErrors) => {
    setErrors(found);
    const first = Object.keys(found)[0];
    setNotice({ tone: "error", title: `${Object.keys(found).length} field${Object.keys(found).length === 1 ? "" : "s"} need attention`, body: found[first] });
    const onTab = tabOfLivestockField(form, first);
    if (onTab) setTab(onTab);
    window.setTimeout(() => document.getElementById(first)?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  };

  const saveDraft = (next: LivestockSubmitProgress | null = progress): boolean => {
    if (!farmer) return false;
    const at = now();
    try {
      writeDraft<Draft>(DRAFT_KEY, { code: farmer.code, values, progress: next, savedAt: at });
      setSavedAt(at);
      return true;
    } catch {
      setNotice({ tone: "error", title: "Draft not saved", body: "This browser is blocking storage. Keep this page open, or submit the report." });
      return false;
    }
  };

  const saveAndNext = () => {
    const onThisTab = Object.fromEntries(Object.entries(validateLivestockForm(form, values, geo.ids)).filter(([k]) => tabOfLivestockField(form, k) === tab));
    if (Object.keys(onThisTab).length) return showErrors(onThisTab);
    setErrors({});
    setNotice(null);
    if (saveDraft()) goTo(tabIndex + 1);
  };

  const openConfirm = (e?: FormEvent) => {
    e?.preventDefault();
    const found = validateLivestockForm(form, values, geo.ids);
    if (Object.keys(found).length) return showErrors(found);
    const hasDetails = livestockSections(form).some((s) => s.isList && (values[s.id] ?? []).length > 0);
    if (!hasDetails) {
      setNotice({ tone: "error", title: "Nothing to report yet", body: "Add at least one animal or event before submitting." });
      setTab("livestock");
      return;
    }
    setShowConfirmModal(true);
  };

  const confirmSubmit = async () => {
    if (!farmer || submitting) return;
    setSubmitting(true);
    try {
      const done = await submitLivestockReport(farmer.code, buildLivestockSections(form, values, geo.ids), progress, (step) => {
        setProgress(step);
        saveDraft(step);
      });
      removeDraft(DRAFT_KEY);
      setProgress(done);
      setReference(done.reference ?? null);
      setShowConfirmModal(false);
    } catch (err) {
      setShowConfirmModal(false);
      setNotice({ tone: "error", title: "Report not submitted", body: `${describeLivestockError(err)} Submit again to retry: sections already saved are not sent twice.` });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } finally {
      setSubmitting(false);
    }
  };

  const backToStart = () => {
    setFarmer(null);
    setQuery("");
    setValues(emptyLivestockValues());
    setProgress(null);
    setErrors({});
    setNotice(null);
    setReference(undefined);
    setShowConfirmModal(false);
    setIsEditing(false);
    setSavedAt(undefined);
    setTab(LIVESTOCK_REPORT_FORM[0].key);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  /** A read-only field's text: the Farmer ID, or what the picked animal holds. */
  const readOnlyValue = (field: LivestockFieldDef, row: LivestockRow) => {
    if (field.fromUrl) return farmer?.code ?? "";
    const animal = animals.find((a) => a.value === row.ear_tag_id);
    if (field.key === "species") return animal ? displayLivestockValue(field, animal.species).replace(/^—$/, "") : "";
    if (field.key === "age") return animal?.age ?? "";
    return row[field.key] ?? "";
  };

  const renderFields = (section: LivestockSectionDef, row: LivestockRow, index: number) =>
    section.fields
      // An animal's age is worked out by the registry after saving: there is nothing to show while entering it.
      .filter((f) => isLivestockFieldVisible(f, row) && f.type !== "geo" && !(section.id === LIVESTOCK_ANIMAL_SECTION && f.readOnly))
      .map((field) => {
        const id = livestockFieldId(section.id, index, field.key);
        return (
          <LivestockFieldInput
            key={id}
            id={id}
            field={field}
            value={field.readOnly ? readOnlyValue(field, row) : (row[field.key] ?? "")}
            onChange={(v) => setRow(section.id, index, { [field.key]: v })}
            error={errors[id]}
            animals={animals}
          />
        );
      });

  const geoError = errors[livestockFieldId(LIVESTOCK_LOCATION_SECTION, 0, "geo_lowest_level_value_id")];

  return (
    <div className="flex w-full flex-col gap-4">
      <BackLink {...(isEditing ? { onClick: () => setIsEditing(false) } : { href: "/dashboard" })} />

      {!isEditing && (
        <>
          <Card className="px-5 py-5 shadow-card">
            <h1 className="text-[20px] font-bold tracking-tight text-ink sm:text-[22px]">Submit Livestock Report</h1>
            <p className="mt-1 text-[13.5px] text-ink-soft">Find the farmer by Farmer ID, record their animals, health, vaccination, breeding and vital events, and send the report for approval.</p>
          </Card>

          <SectionCard title="Find Farmer" description="Enter the Farmer ID from the farmer's registration card.">
            <div className="flex flex-col gap-3">
              <form
                className="flex flex-col gap-2.5 sm:flex-row sm:items-end"
                onSubmit={(e) => {
                  e.preventDefault();
                  void search();
                }}
              >
                <div className="flex flex-1 flex-col gap-2">
                  <label htmlFor="farmer-id" className="text-[14px] font-medium text-ink">
                    Farmer ID <span className="text-danger">*</span>
                  </label>
                  <Input id="farmer-id" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="FR-000000000000" autoComplete="off" />
                </div>
                <Button type="submit" variant="brand" disabled={searching} className="h-11 px-6 font-semibold">
                  {searching ? "Searching…" : "Search"}
                </Button>
              </form>
              {searchError && <Banner tone="error" title="Farmer not available">{searchError}</Banner>}
            </div>
          </SectionCard>

          {farmer && (
            <Card className="flex items-center justify-between gap-4 p-5 shadow-card">
              <div className="min-w-0">
                <h3 className="text-[17px] font-bold text-ink sm:text-[18px]">{farmer.name}</h3>
                <p className="mt-0.5 truncate text-[13.5px] text-muted">
                  {farmer.code} · {farmer.overview.holdings.length} holding{farmer.overview.holdings.length === 1 ? "" : "s"} · {farmer.overview.submissions.length} earlier submission{farmer.overview.submissions.length === 1 ? "" : "s"}
                </p>
              </div>
              <Button type="button" variant="brand" className="shrink-0 px-6 py-2.5 text-[14px] font-semibold" onClick={() => setIsEditing(true)}>
                Continue →
              </Button>
            </Card>
          )}
        </>
      )}

      {isEditing && farmer && (
        <>
          <SectionCard title="Farmer">
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="text-[17px] font-bold text-ink sm:text-[18px]">{farmer.name}</h3>
                <p className="mt-0.5 truncate text-[13.5px] text-muted">{farmer.code}</p>
              </div>
              <Button type="button" variant="outline" className="shrink-0 border-line px-5 py-2 text-[14px] font-medium text-ink hover:bg-slate-50" onClick={backToStart}>
                Change
              </Button>
            </div>
          </SectionCard>

          {farmer.overview.holdings.length > 0 && !notice && (
            <Banner tone="info" title="Started from the farmer's newest holding">
              Check the Fayda ID, survey personnel and location, and change anything that differs for this report.
            </Banner>
          )}

          {notice && (
            <Banner tone={notice.tone} title={notice.title} onDismiss={() => setNotice(null)}>
              {notice.body}
            </Banner>
          )}

          <form onSubmit={openConfirm} className="flex flex-col gap-4">
            <div className="overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <div className="border-b border-line">
                <SegmentTabs label="Livestock report stages" className="rounded-none border-0 shadow-none" tabs={form.map((t) => ({ key: t.key, label: t.label }))} active={tab} onChange={setTab} />
              </div>

              <div key={current.key} className="flex animate-fade-in flex-col gap-5 p-5">
                {current.sections.map((section) => {
                  const rows = values[section.id] ?? [];
                  const locked = !!progress?.saved.includes(section.id);
                  return (
                    <SectionCard key={section.id} title={section.title} description={locked ? "Already saved on the draft: it cannot change now. Use Change to start over." : undefined} className="rounded-xl border border-line shadow-xs">
                      <fieldset disabled={locked} className="flex flex-col gap-5 disabled:opacity-80">
                        {section.id === LIVESTOCK_LOCATION_SECTION && (
                          <div>
                            <div id={livestockFieldId(section.id, 0, "geo_lowest_level_value_id")} className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-4">
                              {GEO_LEVELS.map(({ key }) => {
                                const picked = locationRow[key] ?? "";
                                const options = geo.options[key] ?? [];
                                return (
                                  <div key={key} className="flex min-w-0 flex-col gap-2">
                                    <label htmlFor={`geo-${key}`} className="text-[14px] font-medium capitalize text-ink">
                                      {key} <span className="text-danger">*</span>
                                    </label>
                                    <Select id={`geo-${key}`} value={picked} onChange={(e) => pickGeo(key, e.target.value)}>
                                      <option value="">Select {key}</option>
                                      {[...(picked && !options.includes(picked) ? [picked] : []), ...options].map((o) => (
                                        <option key={o} value={o}>
                                          {o}
                                        </option>
                                      ))}
                                    </Select>
                                  </div>
                                );
                              })}
                            </div>
                            {geoError && <p className="mt-2 text-[12.5px] text-danger">{geoError}</p>}
                          </div>
                        )}

                        {section.isList ? (
                          <>
                            {rows.length === 0 && <p className="text-[13.5px] text-muted">None added.</p>}
                            {rows.map((row, index) => (
                              <div key={index} className="rounded-xl border border-line-soft p-4">
                                <div className="mb-4 flex items-center justify-between gap-3">
                                  <p className="text-[14px] font-semibold capitalize text-ink">
                                    {section.rowLabel} {index + 1}
                                  </p>
                                  <button type="button" onClick={() => removeRow(section.id, index)} className="text-[13px] font-medium text-danger hover:underline">
                                    Remove
                                  </button>
                                </div>
                                <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{renderFields(section, row, index)}</div>
                              </div>
                            ))}
                            <div>
                              <Button type="button" variant="outline" onClick={() => addRow(section)} className="px-5 py-2 font-semibold text-ink">
                                + Add {section.rowLabel}
                              </Button>
                            </div>
                          </>
                        ) : (
                          <div className="grid grid-cols-1 gap-x-6 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">{renderFields(section, rows[0] ?? {}, 0)}</div>
                        )}
                      </fieldset>
                    </SectionCard>
                  );
                })}
              </div>
            </div>

            <div className="flex flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-card sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => saveDraft()} className="px-5 py-2.5 font-semibold text-ink">
                  Save Draft
                </Button>
                {savedAt && <span className="text-[13.5px] text-muted">Saved in this browser at {savedAt}</span>}
              </div>
              <div className="flex items-center gap-3">
                <Button type="button" variant="outline" onClick={() => goTo(tabIndex - 1)} disabled={tabIndex === 0} className="px-5 py-2.5 font-semibold text-ink">
                  ← Previous Step
                </Button>
                {isLast ? (
                  <Button type="submit" variant="brand" className="px-6 py-2.5 font-semibold">
                    Submit Livestock Report →
                  </Button>
                ) : (
                  <Button type="button" variant="brand" onClick={saveAndNext} className="px-6 py-2.5 font-semibold">
                    Save &amp; Next →
                  </Button>
                )}
              </div>
            </div>
          </form>
        </>
      )}

      {mounted && showConfirmModal && farmer && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-line bg-white shadow-2xl animate-scale-in">
            <div className="border-b border-line px-6 py-5">
              <h3 className="text-[17px] font-bold text-ink sm:text-[18px]">Submit livestock report for {farmer.name}?</h3>
              <p className="mt-0.5 text-[13px] text-muted">It goes for approval and can no longer be changed here.</p>
            </div>
            <div className="p-6">
              <div className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-white text-[13.5px]">
                <div className="flex flex-col sm:flex-row">
                  <div className="w-full shrink-0 bg-slate-50/40 px-4 py-3 text-muted sm:w-48">Farmer</div>
                  <div className="px-4 py-3 font-semibold text-ink">{farmer.name} — {farmer.code}</div>
                </div>
                {livestockSections(form).filter((s) => s.isList).map((s) => (
                  <div key={s.id} className="flex flex-col sm:flex-row">
                    <div className="w-full shrink-0 bg-slate-50/40 px-4 py-3 text-muted sm:w-48">{s.title}</div>
                    <div className="px-4 py-3 font-semibold text-ink">{(values[s.id] ?? []).length}</div>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-line bg-slate-50/70 px-6 py-4">
              <Button type="button" variant="outline" disabled={submitting} onClick={() => setShowConfirmModal(false)} className="px-5 py-2 font-semibold text-ink">
                Cancel
              </Button>
              <Button type="button" variant="brand" disabled={submitting} onClick={() => void confirmSubmit()} className="px-6 py-2 font-semibold">
                {submitting ? "Submitting…" : "Confirm & submit →"}
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}

      {mounted && reference !== undefined && farmer && createPortal(
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-xs animate-fade-in">
          <div className="w-full max-w-sm overflow-hidden rounded-2xl border border-line bg-white p-6 text-center shadow-2xl animate-scale-in">
            <h3 className="text-[20px] font-bold text-ink">Livestock report submitted</h3>
            <p className="mt-2 px-2 text-[13.5px] leading-relaxed text-muted">
              The report for {farmer.name} ({farmer.code}) has been sent for approval.{reference ? ` Reference: ${reference}.` : ""}
            </p>
            <div className="mt-4 inline-flex items-center gap-2 rounded-full border border-amber-300 bg-amber-50/80 px-4 py-1.5 text-[12.5px] font-semibold text-amber-800">
              <span className="h-2 w-2 rounded-full bg-amber-600" />
              Pending approval
            </div>
            <div className="mt-6 border-t border-line pt-5">
              <Button type="button" variant="brand" onClick={backToStart} className="w-full py-3 text-[14.5px] font-semibold shadow-xs">
                Done
              </Button>
            </div>
          </div>
        </div>,
        document.body,
      )}
    </div>
  );
}
