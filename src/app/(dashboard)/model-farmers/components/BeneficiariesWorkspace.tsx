"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { Banner } from "@/components/ui/Banner";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Spinner } from "@/components/ui/Spinner";
import { FormField } from "@/components/ui/FormField";
import { Select } from "@/components/ui/Select";
import { Checkbox } from "@/components/ui/Checkbox";
import { SearchInput } from "@/components/ui/SearchInput";
import { FilterDropdown, type FilterOption } from "@/components/ui/FilterDropdown";
import { AdvancedFiltersDrawer, type FilterFieldConfig, type FilterSelection } from "@/components/ui/AdvancedFiltersDrawer";
import { apiFarmerToFarmer, describeFarmerError, FarmerAvatar, listFarmers, type Farmer } from "@/features/farmers";
import {
  addFarmersToSegment,
  describeAddResult,
  listBeneficiarySegments,
  listFarmerBeneficiaries,
  segmentLook,
  segmentTitle,
  type ApiFarmerBeneficiary,
  type ApiSegment,
  type SegmentIcon,
} from "@/features/beneficiaries";
import { matchesQuery, searchPlaceholder } from "@/lib/search";
import { cn } from "@/lib/utils";

// Card colours per segment tone: tinted panel, left accent, icon tile and member count.
const SEGMENT_STYLE: Partial<Record<PillTone, { card: string; tile: string; count: string }>> = {
  green: { card: "border-l-segment-green bg-segment-green-wash", tile: "bg-green-100 text-brand-green", count: "text-brand-green" },
  blue: { card: "border-l-segment-blue bg-segment-blue-wash", tile: "bg-blue-100 text-blue-600", count: "text-blue-600" },
  amber: { card: "border-l-segment-orange bg-segment-orange-wash", tile: "bg-orange-100 text-orange-600", count: "text-orange-600" },
  purple: { card: "border-l-segment-purple bg-segment-purple-wash", tile: "bg-violet-100 text-violet-700", count: "text-violet-700" },
};

const SEGMENT_ICONS: Record<SegmentIcon, ReactNode> = {
  leaf: <path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5.2-6" />,
  cash: <><rect x="2" y="6" width="20" height="12" rx="2" /><circle cx="12" cy="12" r="2.5" /><path d="M6 12h.01M18 12h.01" /></>,
  drop: <path d="M12 22a7 7 0 007-7c0-2-1-3.9-3-5.5s-3.5-4-4-6.5c-.5 2.5-2 4.9-4 6.5S5 13 5 15a7 7 0 007 7z" />,
  people: <><path d="M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 00-3-3.9M16 3.1a4 4 0 010 7.8" /></>,
};

const SEARCH_PLACEHOLDER = searchPlaceholder(["Farmer", "Kebele", "Woreda", "Package", "Added by"]);

const optionsOf = (values: string[], order?: readonly string[], label?: (v: string) => string): FilterOption[] =>
  (order ?? [...new Set(values)]).map((value) => ({ value, label: label ? label(value) : value, count: values.filter((v) => v === value).length }));

const formatDate = (iso: string) => {
  const d = new Date(iso.replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
};

/** A Farmer Beneficiary row joined with the farmer's name and area names from GET /farmers. */
interface Row {
  id: string;
  farmerId: string;
  name: string;
  avatar?: string;
  kebele: string;
  woreda: string;
  segment: string;
  linkedAt: string;
  addedBy: string;
}

interface BeneficiaryFilters extends FilterSelection {
  farmer: Set<string>;
  kebele: Set<string>;
  segment: Set<string>;
}
const EMPTY: BeneficiaryFilters = { farmer: new Set(), kebele: new Set(), segment: new Set() };

type Loaded<T> = { data: T; error: null } | { data: null; error: string };
const errorText = (err: unknown, fallback: string) => (err instanceof Error && err.message ? err.message : fallback);

export function BeneficiariesWorkspace() {
  const [filters, setFilters] = useState<BeneficiaryFilters>(EMPTY);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [addOpen, setAddOpen] = useState(false);
  const [addFarmers, setAddFarmers] = useState<Set<string>>(() => new Set());
  const [farmerQuery, setFarmerQuery] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [addSegment, setAddSegment] = useState("");
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "warning" | "error"; text: string } | null>(null);
  const [reload, setReload] = useState(0);

  const [segments, setSegments] = useState<Loaded<ApiSegment[]> | null>(null);
  const [links, setLinks] = useState<Loaded<ApiFarmerBeneficiary[]> | null>(null);
  // The caller's farmers (GET /farmers): their names for the table and the Add picker's list.
  const [farmers, setFarmers] = useState<Farmer[] | null>(null);
  const [farmersError, setFarmersError] = useState<string | null>(null);

  useEffect(() => {
    let current = true;
    listBeneficiarySegments()
      .then((data) => current && setSegments({ data, error: null }))
      .catch((err: unknown) => current && setSegments({ data: null, error: errorText(err, "Could not load the packages.") }));
    listFarmerBeneficiaries()
      .then(({ items }) => current && setLinks({ data: items, error: null }))
      .catch((err: unknown) => current && setLinks({ data: null, error: errorText(err, "Could not load the Model Farmers.") }));
    return () => {
      current = false;
    };
  }, [reload]);

  useEffect(() => {
    let current = true;
    listFarmers({ pageSize: 500 })
      .then(({ items }) => {
        if (!current) return;
        setFarmersError(null);
        setFarmers(items.map(apiFarmerToFarmer));
      })
      .catch((err: unknown) => current && setFarmersError(describeFarmerError(err)));
    return () => {
      current = false;
    };
  }, []);

  const pickerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!pickerOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (!pickerRef.current?.contains(e.target as Node)) setPickerOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, [pickerOpen]);

  const segmentList = useMemo(() => segments?.data ?? [], [segments]);
  const titleOf = (id: string) => segmentTitle(segmentList, id);

  const rows = useMemo<Row[]>(() => {
    const byId = new Map<string, Farmer>();
    for (const f of farmers ?? []) {
      byId.set(f.id, f);
      if (f.regId) byId.set(f.regId, f);
    }
    return (links?.data ?? []).map((b) => {
      const f = byId.get(b.farmer_id);
      return {
        id: b.name,
        farmerId: f?.id ?? b.farmer_id,
        name: f?.name ?? b.farmer_id,
        avatar: f?.avatar,
        kebele: f && f.kebele !== "—" ? f.kebele : b.kebele,
        woreda: f?.woreda || b.woreda,
        segment: b.beneficiary_segment,
        linkedAt: formatDate(b.creation),
        addedBy: b.user,
      };
    });
  }, [links, farmers]);

  const activeFilterCount = Object.values(filters).filter((set) => set.size > 0).length;
  const setFilter = (key: keyof BeneficiaryFilters) => (next: Set<string>) => setFilters((prev) => ({ ...prev, [key]: next }));
  // A segment card toggles that segment as the only selected one in the Segment filter.
  const toggleSegment = (id: string) =>
    setFilters((prev) => ({ ...prev, segment: prev.segment.size === 1 && prev.segment.has(id) ? new Set() : new Set([id]) }));
  const singleSegment = filters.segment.size === 1 ? [...filters.segment][0] : null;

  const farmerOptions = optionsOf(rows.map((b) => b.name));
  const kebeleOptions = optionsOf(rows.map((b) => b.kebele));
  const segmentOptions = optionsOf(rows.map((b) => b.segment), segmentList.map((s) => s.name), titleOf);
  const filterFields: FilterFieldConfig[] = [
    { key: "farmer", label: "Farmer", allLabel: "All farmers", placeholder: "All Farmers", options: farmerOptions },
    { key: "kebele", label: "Kebele", allLabel: "All kebeles", placeholder: "All Kebeles", options: kebeleOptions },
    { key: "segment", label: "Package", allLabel: "All packages", placeholder: "All Packages", options: segmentOptions },
  ];

  const visible = rows.filter((b) => {
    const has = (set: Set<string>, value: string) => set.size === 0 || set.has(value);
    return has(filters.farmer, b.name) && has(filters.kebele, b.kebele) && has(filters.segment, b.segment) && matchesQuery(query, b.name, b.kebele, b.woreda, b.addedBy, titleOf(b.segment));
  });

  const pickerMatches = (farmers ?? []).filter((f) => matchesQuery(farmerQuery, f.name, f.regId, f.kebele, f.woreda, f.phone));
  const allMatchesPicked = pickerMatches.length > 0 && pickerMatches.every((f) => addFarmers.has(f.id));

  const togglePick = (id: string) =>
    setAddFarmers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const togglePickAll = () =>
    setAddFarmers((prev) => {
      const next = new Set(prev);
      for (const f of pickerMatches) {
        if (allMatchesPicked) next.delete(f.id);
        else next.add(f.id);
      }
      return next;
    });

  const selectedFarmersList = useMemo(() => {
    if (!farmers || addFarmers.size === 0) return [];
    return farmers.filter((f) => addFarmers.has(f.id));
  }, [farmers, addFarmers]);

  const activePackageObj = useMemo(() => {
    return segmentList.find((s) => s.name === addSegment) ?? null;
  }, [segmentList, addSegment]);

  const activePkgLook = useMemo(() => {
    const idx = segmentList.findIndex((s) => s.name === addSegment);
    return idx >= 0 ? segmentLook(idx) : null;
  }, [segmentList, addSegment]);
  const activePkgStyle = activePkgLook ? SEGMENT_STYLE[activePkgLook.tone] : null;

  const openAdd = () => {
    setAddFarmers(new Set());
    setFarmerQuery("");
    setPickerOpen(false);
    setAddSegment((prev) => prev || singleSegment || segmentList[0]?.name || "");
    setAddOpen(true);
  };

  const add = async () => {
    if (addFarmers.size === 0 || !addSegment) return;
    setAdding(true);
    const result = await addFarmersToSegment((farmers ?? []).filter((f) => addFarmers.has(f.id)), addSegment);
    setAdding(false);
    setAddOpen(false);
    setNotice(describeAddResult(result, titleOf(addSegment)));
    if (result.added.length) setReload((n) => n + 1);
  };

  const columns: Column<Row>[] = [
    { key: "sno", header: "S.No.", align: "center", className: "w-16 whitespace-nowrap", cell: (b) => visible.indexOf(b) + 1 },
    {
      key: "name",
      header: <FilterDropdown label="Farmer" allLabel="All farmers" options={farmerOptions} selected={filters.farmer} onApply={setFilter("farmer")} />,
      cell: (b) => (
        <Link href={`/farmers/${encodeURIComponent(b.farmerId)}`} className="flex items-center gap-2.5 text-ink hover:text-brand-green font-medium">
          <FarmerAvatar name={b.name} avatar={b.avatar} />
          <span className="whitespace-nowrap">{b.name}</span>
        </Link>
      ),
    },
    { key: "kebele", header: <FilterDropdown label="Kebele" allLabel="All kebeles" options={kebeleOptions} selected={filters.kebele} onApply={setFilter("kebele")} />, cell: (b) => <span className="whitespace-nowrap">{b.kebele}</span> },
    { key: "woreda", header: "Woreda", cell: (b) => <span className="whitespace-nowrap">{b.woreda}</span> },
    {
      key: "segment",
      align: "center",
      header: <FilterDropdown label="Packages" allLabel="All packages" options={segmentOptions} selected={filters.segment} onApply={setFilter("segment")} />,
      cell: (b) => {
        const index = segmentList.findIndex((s) => s.name === b.segment);
        return <Pill tone={index < 0 ? "slate" : segmentLook(index).tone} className="font-semibold">{titleOf(b.segment)}</Pill>;
      },
    },
    { key: "linked", header: "Linked", align: "center", cell: (b) => <span className="whitespace-nowrap">{b.linkedAt}</span> },
    { key: "addedBy", header: "Added by", cell: (b) => <span className="whitespace-nowrap text-[13px] text-muted">{b.addedBy}</span> },
  ];

  const loadError = links?.error ?? null;

  return (
    <>
      <PageHeader
        title="Model Farmers"
        description="Packages that link farmers to schemes. Adding a farmer here never changes their Farmer Registry record."
        actions={
          <Button
            variant="brand"
            size="md"
            className="w-full sm:w-auto px-5 gap-2 h-10 justify-center shadow-xs"
            onClick={openAdd}
            disabled={segmentList.length === 0}
          >
            <svg className="h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" aria-hidden="true">
              <path d="M12 5v14M5 12h14" />
            </svg>
            <span>Add Model Farmer</span>
          </Button>
        }
      />

      {/* Segment cards */}
      {segments?.error ? (
        <Banner tone="error" title="Packages could not be loaded">{segments.error}</Banner>
      ) : segments && segmentList.length === 0 ? (
        <Banner tone="info">No active packages yet. An administrator adds them as Beneficiary Segments.</Banner>
      ) : (
        <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 sm:gap-4">
          {segmentList.map((s, i) => {
            const active = singleSegment === s.name;
            const look = segmentLook(i);
            const style = SEGMENT_STYLE[look.tone]!;
            return (
              <button
                key={s.name}
                type="button"
                aria-pressed={active}
                onClick={() => toggleSegment(s.name)}
                className={cn(
                  "group relative flex flex-col justify-between rounded-xl border border-l-4 border-line p-4 text-left shadow-xs transition-all hover:shadow-md cursor-pointer",
                  style.card,
                  active ? "ring-2 ring-brand-green/80 shadow-md bg-white" : "hover:-translate-y-0.5",
                )}
              >
                {/* Header row: Icon & Title on left, Count & Label on right */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3 min-w-0">
                    <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-xs transition-transform group-hover:scale-105", style.tile)}>
                      <svg className="h-4.5 w-4.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        {SEGMENT_ICONS[look.icon]}
                      </svg>
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[14.5px] font-semibold text-ink truncate group-hover:text-brand-green transition-colors">
                        {s.title || s.name}
                      </span>
                      <span className="block font-mono text-[11.5px] text-muted">{s.name}</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end shrink-0 pl-1">
                    <span className={cn("text-2xl sm:text-[26px] font-bold leading-none tracking-tight", style.count)}>
                      {s.farmer_beneficiary_count ?? 0}
                    </span>
                    <span className="mt-1 text-[10.5px] font-semibold text-muted uppercase tracking-wider">
                      {s.farmer_beneficiary_count === 1 ? "Farmer" : "Farmers"}
                    </span>
                  </div>
                </div>

                {/* Description text */}
                <div className="mt-3 flex-1 min-h-[36px]">
                  <p className="text-[12.5px] leading-relaxed text-slate-600 line-clamp-2" title={s.long_desc ?? undefined}>
                    {s.short_desc || "No package description."}
                  </p>
                </div>

                {/* Bottom status / click hint bar */}
                <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-2.5 text-xs">
                  <span className={cn("inline-flex items-center gap-1 font-medium text-[11.5px]", active ? "text-brand-green font-semibold" : "text-muted group-hover:text-ink")}>
                    {active ? (
                      <>
                        <svg className="h-3.5 w-3.5 text-brand-green" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                          <polyline points="20 6 9 17 4 12" />
                        </svg>
                        <span>Filter active</span>
                      </>
                    ) : (
                      <span>Click to filter</span>
                    )}
                  </span>
                  {active && (
                    <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10.5px] font-semibold text-brand-green">
                      Selected
                    </span>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {notice && <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner>}

      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3.5 px-4 py-3.5 sm:px-5 sm:py-4 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h2 className="text-[16px] sm:text-[17px] font-semibold text-ink">{singleSegment ? titleOf(singleSegment) : "All Model Farmers"}</h2>
              {singleSegment && (
                <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-brand-green border border-brand-green/20">
                  Filtered
                </span>
              )}
            </div>
            <p className="mt-0.5 text-[12px] sm:text-[13px] text-muted">Farmers linked to the active packages in your area</p>
          </div>
          <div className="flex items-center gap-2 sm:gap-3 w-full md:w-auto">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder={SEARCH_PLACEHOLDER}
              className="flex-1 min-w-0 md:w-[240px] lg:w-[280px]"
            />
            <AdvancedFiltersButton
              activeCount={activeFilterCount}
              onClick={() => setIsFiltersOpen(true)}
              className="shrink-0 h-10 px-3 sm:px-4"
            />
          </div>
        </div>
        {loadError ? (
          <EmptyState tone="error" title="Model Farmers could not be loaded" hint={loadError} actionLabel="Try again" onAction={() => setReload((n) => n + 1)} />
        ) : (
          <DataTable
            itemLabel="Model Farmers"
            columns={columns}
            rows={visible}
            rowKey={(b) => b.id}
            minWidth="760px"
            emptyTitle={!links ? "Loading Model Farmers…" : rows.length === 0 ? "No Model Farmers yet" : "No Model Farmers match the selected filters"}
            emptyHint={!links ? undefined : rows.length === 0 ? "Use Add Model Farmer to link farmers to a package." : "Clear a filter or try a different search."}
          />
        )}

        <AdvancedFiltersDrawer
          isOpen={isFiltersOpen}
          onClose={() => setIsFiltersOpen(false)}
          fields={filterFields}
          filters={filters}
          onApply={(next) => setFilters({ farmer: next.farmer ?? new Set(), kebele: next.kebele ?? new Set(), segment: next.segment ?? new Set() })}
        />
      </Card>

      <Modal
        isOpen={addOpen}
        onClose={() => !adding && setAddOpen(false)}
        title="Add Model Farmer"
        subtitle="Link farmers from your list to a package"
        size="lg"
        bodyClassName="p-4 sm:p-6"
        icon={
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-brand-green/20 bg-emerald-50 text-brand-green shadow-sm">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
              <circle cx="9" cy="7" r="4" />
              <line x1="19" y1="8" x2="19" y2="14" />
              <line x1="22" y1="11" x2="16" y2="11" />
            </svg>
          </div>
        }
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>
              Cancel
            </Button>
            <Button
              variant="brand"
              onClick={() => void add()}
              disabled={addFarmers.size === 0 || !addSegment || adding}
              className="gap-2 shadow-sm"
            >
              {adding ? (
                <>
                  <Spinner className="h-4 w-4" />
                  <span>Adding…</span>
                </>
              ) : (
                <>
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                    <line x1="12" y1="5" x2="12" y2="19" />
                    <line x1="5" y1="12" x2="19" y2="12" />
                  </svg>
                  <span>
                    {addFarmers.size > 1 ? `Add ${addFarmers.size} Model Farmers` : addFarmers.size === 1 ? "Add 1 Model Farmer" : "Add Model Farmer"}
                  </span>
                </>
              )}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-5">
          <FormField
            label={`Farmers${addFarmers.size > 0 ? ` (${addFarmers.size} selected)` : ""}`}
            htmlFor="ben-farmer"
            required
            hint="Only farmers linked to you appear here (Farmer Registry is the source of records)."
          >
            <div ref={pickerRef} className="relative flex flex-col gap-2">
              <button
                type="button"
                aria-expanded={pickerOpen}
                onClick={() => setPickerOpen((open) => !open)}
                className={cn(
                  "flex min-h-[44px] w-full items-center justify-between gap-2 rounded-xl border bg-white px-3.5 py-2 text-left text-sm transition-all shadow-xs",
                  pickerOpen
                    ? "border-brand-green ring-2 ring-brand-green/15"
                    : "border-gray-200 hover:border-brand-green/70",
                )}
              >
                <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
                  {addFarmers.size === 0 ? (
                    <div className="flex items-center gap-2 text-muted">
                      <svg className="h-4 w-4 shrink-0 text-slate-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                        <circle cx="9" cy="7" r="4" />
                        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                      </svg>
                      <span>Select farmers</span>
                    </div>
                  ) : (
                    <>
                      <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-brand-green border border-brand-green/20">
                        {addFarmers.size} selected
                      </span>
                      <div className="flex flex-wrap items-center gap-1.5">
                        {selectedFarmersList.slice(0, 2).map((f) => (
                          <span
                            key={f.id}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-800 border border-slate-200/60"
                          >
                            <span className="max-w-[120px] truncate sm:max-w-[160px]">{f.name}</span>
                            <span
                              role="button"
                              tabIndex={0}
                              onClick={(e) => {
                                e.stopPropagation();
                                togglePick(f.id);
                              }}
                              onKeyDown={(e) => {
                                if (e.key === "Enter" || e.key === " ") {
                                  e.stopPropagation();
                                  togglePick(f.id);
                                }
                              }}
                              className="text-slate-400 hover:text-slate-600 cursor-pointer"
                              aria-label={`Remove ${f.name}`}
                            >
                              <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                                <path d="M6 6l12 12M18 6L6 18" />
                              </svg>
                            </span>
                          </span>
                        ))}
                        {selectedFarmersList.length > 2 && (
                          <span className="rounded-md bg-slate-100 px-1.5 py-0.5 text-xs font-medium text-muted">
                            +{selectedFarmersList.length - 2} more
                          </span>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="flex shrink-0 items-center gap-1.5 text-muted">
                  {addFarmers.size > 0 && (
                    <span
                      role="button"
                      tabIndex={0}
                      onClick={(e) => {
                        e.stopPropagation();
                        setAddFarmers(new Set());
                      }}
                      onKeyDown={(e) => {
                        if (e.key === "Enter" || e.key === " ") {
                          e.stopPropagation();
                          setAddFarmers(new Set());
                        }
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded-full hover:bg-slate-100 hover:text-ink transition-colors cursor-pointer"
                      title="Clear all"
                      aria-label="Clear all selected farmers"
                    >
                      <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                        <path d="M6 6l12 12M18 6L6 18" />
                      </svg>
                    </span>
                  )}
                  <svg className={cn("h-4 w-4 transition-transform duration-200", pickerOpen && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <path d="M6 9l6 6 6-6" />
                  </svg>
                </div>
              </button>

              {pickerOpen && (
                <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white text-[14px] shadow-xl animate-fade-in">
                  {/* Select all header */}
                  <div className={cn("flex shrink-0 items-center justify-between border-b border-line px-3.5 py-2.5", allMatchesPicked ? "bg-emerald-50/50" : "bg-slate-50/70")}>
                    <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold select-none">
                      <Checkbox checked={allMatchesPicked} onChange={togglePickAll} disabled={pickerMatches.length === 0} aria-label="Select all farmers" />
                      <span className={cn(allMatchesPicked ? "text-brand-green font-semibold" : "text-ink")}>
                        {farmerQuery.trim() ? "Select all matching" : "Select all farmers"}
                      </span>
                    </label>
                    <div className="flex items-center gap-2">
                      {addFarmers.size > 0 && (
                        <button
                          type="button"
                          onClick={() => setAddFarmers(new Set())}
                          className="text-xs font-semibold text-brand-green hover:underline cursor-pointer"
                        >
                          Clear all
                        </button>
                      )}
                      <span className={cn("rounded-md px-2 py-0.5 text-xs font-semibold", allMatchesPicked ? "bg-emerald-100 text-brand-green" : "bg-line-soft text-slate-600")}>
                        {pickerMatches.length} {pickerMatches.length === 1 ? "farmer" : "farmers"}
                      </span>
                    </div>
                  </div>

                  {/* Search box */}
                  <div className="shrink-0 border-b border-line bg-white p-2.5">
                    <div className="relative">
                      <svg className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M20 20l-3.5-3.5" />
                      </svg>
                      <input
                        id="ben-farmer"
                        type="text"
                        value={farmerQuery}
                        onChange={(e) => setFarmerQuery(e.target.value)}
                        placeholder="Search by name, ID, phone, kebele…"
                        aria-label="Search farmers by name, Farmer ID, kebele or phone"
                        className="h-9 w-full rounded-lg border border-zinc-200 bg-surface pl-9 pr-8 text-sm text-ink placeholder:text-muted focus:border-brand-green focus:bg-white focus:outline-none focus:ring-1 focus:ring-brand-green"
                      />
                      {farmerQuery && (
                        <button
                          type="button"
                          onClick={() => setFarmerQuery("")}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted hover:text-ink cursor-pointer"
                          aria-label="Clear search"
                        >
                          <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round">
                            <path d="M6 6l12 12M18 6L6 18" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Farmers list */}
                  <ul className="max-h-[240px] min-h-0 overflow-y-auto overscroll-contain green-scrollbar divide-y divide-line-soft">
                    {pickerMatches.length === 0 ? (
                      <li className="px-4 py-8 text-center text-sm text-muted">
                        <div className="flex flex-col items-center justify-center gap-1">
                          <svg className="h-8 w-8 text-slate-300" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" aria-hidden="true">
                            <circle cx="11" cy="11" r="7" />
                            <path d="M20 20l-3.5-3.5" />
                          </svg>
                          <p className="font-medium text-slate-600">No farmers found</p>
                          <p className="text-xs text-muted">
                            {farmersError ?? (!farmers ? "Loading farmers…" : farmers.length === 0 ? "No farmers assigned" : `No matches for “${farmerQuery.trim()}”`)}
                          </p>
                        </div>
                      </li>
                    ) : (
                      pickerMatches.map((f) => {
                        const isChecked = addFarmers.has(f.id);
                        return (
                          <li key={f.id}>
                            <label className={cn("flex cursor-pointer items-center gap-3 px-3.5 py-2.5 transition-colors select-none", isChecked ? "bg-emerald-50/40 hover:bg-emerald-50/70" : "hover:bg-slate-50")}>
                              <Checkbox checked={isChecked} onChange={() => togglePick(f.id)} aria-label={f.name} />
                              <FarmerAvatar name={f.name} avatar={f.avatar} />
                              <div className="flex min-w-0 flex-1 flex-col">
                                <span className={cn("truncate text-sm font-medium", isChecked ? "text-brand-green font-semibold" : "text-ink")}>
                                  {f.name}
                                </span>
                                <div className="flex flex-wrap items-center gap-2 text-xs text-muted">
                                  {f.regId && <span className="font-mono">{f.regId}</span>}
                                  {f.regId && f.phone && <span>•</span>}
                                  {f.phone && <span>{f.phone}</span>}
                                </div>
                              </div>
                              {f.kebele && (
                                <span className="shrink-0 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 border border-slate-200/60">
                                  {f.kebele}
                                </span>
                              )}
                            </label>
                          </li>
                        );
                      })
                    )}
                  </ul>

                  {/* Dropdown footer summary */}
                  <div className="flex shrink-0 items-center justify-between border-t border-line bg-surface/70 px-3.5 py-2">
                    <span className="text-xs font-medium text-muted">
                      {addFarmers.size === 0 ? "No farmers selected" : `${addFarmers.size} farmer${addFarmers.size > 1 ? "s" : ""} selected`}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPickerOpen(false)}
                      className="rounded-lg bg-brand-green px-3.5 py-1 text-xs font-semibold text-white shadow-sm hover:bg-brand-green-hover transition-colors cursor-pointer"
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>
          </FormField>

          <FormField
            label="Package"
            htmlFor="ben-segment"
            required
            hint="The farmer's kebele, woreda, zone and region are taken from their Farmer Registry record."
          >
            <div className="flex flex-col gap-2.5">
              <Select id="ben-segment" value={addSegment} onChange={(e) => setAddSegment(e.target.value)}>
                {segmentList.map((s) => <option key={s.name} value={s.name}>{s.title || s.name}</option>)}
              </Select>
              {activePackageObj && (
                <div
                  className={cn(
                    "flex items-start gap-3 rounded-xl border border-line p-3 text-xs transition-all shadow-xs",
                    activePkgStyle ? activePkgStyle.card : "bg-surface/50",
                  )}
                >
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-lg", activePkgStyle ? activePkgStyle.tile : "bg-emerald-100 text-brand-green")}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {activePkgLook ? SEGMENT_ICONS[activePkgLook.icon] : (
                        <path d="M11 20A7 7 0 019.8 6.1C15.5 5 17 4.5 19 2c1 2 2 4.2 2 8 0 5.5-4.8 10-10 10zM2 21c0-3 1.9-5.4 5.2-6" />
                      )}
                    </svg>
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold text-ink text-[13px]">{activePackageObj.title || activePackageObj.name}</div>
                    <p className="mt-0.5 text-muted leading-relaxed">
                      {activePackageObj.short_desc || "No package description provided."}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </FormField>
        </div>
      </Modal>
    </>
  );
}
