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
    { key: "sno", header: "S.No.", align: "center", className: "w-16", cell: (b) => visible.indexOf(b) + 1 },
    {
      key: "name",
      header: <FilterDropdown label="Farmer" allLabel="All farmers" options={farmerOptions} selected={filters.farmer} onApply={setFilter("farmer")} />,
      cell: (b) => (
        <Link href={`/farmers/${encodeURIComponent(b.farmerId)}`} className="flex items-center gap-2.5 text-ink hover:text-brand-green">
          <FarmerAvatar name={b.name} avatar={b.avatar} />
          <span className="whitespace-nowrap">{b.name}</span>
        </Link>
      ),
    },
    { key: "kebele", header: <FilterDropdown label="Kebele" allLabel="All kebeles" options={kebeleOptions} selected={filters.kebele} onApply={setFilter("kebele")} />, cell: (b) => b.kebele },
    { key: "woreda", header: "Woreda", cell: (b) => b.woreda },
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
    { key: "addedBy", header: "Added by", cell: (b) => <span className="text-[13px] text-muted">{b.addedBy}</span> },
  ];

  const loadError = links?.error ?? null;

  return (
    <>
      <PageHeader
        title="Model Farmers"
        description="Packages that link farmers to schemes. Adding a farmer here never changes their Farmer Registry record."
        actions={
          <Button variant="brand" size="md" className="px-6" onClick={openAdd} disabled={segmentList.length === 0}>
            Add Model Farmer
          </Button>
        }
      />

      {/* Segment cards */}
      {segments?.error ? (
        <Banner tone="error" title="Packages could not be loaded">{segments.error}</Banner>
      ) : segments && segmentList.length === 0 ? (
        <Banner tone="info">No active packages yet. An administrator adds them as Beneficiary Segments.</Banner>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
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
                  "flex flex-col gap-3 rounded-xl border border-l-[3px] border-line p-4 text-left shadow-[0px_2px_8px_rgba(0,0,0,0.06)] transition-shadow hover:shadow-md",
                  style.card,
                  active && "ring-2 ring-brand-green/40",
                )}
              >
                <div className="flex items-start gap-2.5">
                  <span className={cn("flex h-8 w-8 shrink-0 items-center justify-center rounded-full", style.tile)}>
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                      {SEGMENT_ICONS[look.icon]}
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink">{s.title || s.name}</span>
                    <span className="block text-[12px] text-muted">{s.name}</span>
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="flex min-h-[46px] flex-1 items-center rounded-md border border-line bg-white px-3 py-2 text-[12px] leading-snug text-ink-soft" title={s.long_desc ?? undefined}>
                    {s.short_desc || "—"}
                  </span>
                  <span className={cn("shrink-0 text-[24px] font-semibold", style.count)}>{s.farmer_beneficiary_count ?? "—"}</span>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {notice && <Banner tone={notice.tone} onDismiss={() => setNotice(null)}>{notice.text}</Banner>}

      <Card className="overflow-hidden p-0 shadow-card">
        <div className="flex flex-col gap-3 px-4 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-[16px] font-semibold text-ink">{singleSegment ? titleOf(singleSegment) : "All Model Farmers"}</h2>
            <p className="mt-0.5 text-[12.5px] text-muted">Farmers linked to the active packages in your area</p>
          </div>
          <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:justify-end">
            <SearchInput value={query} onChange={setQuery} placeholder={SEARCH_PLACEHOLDER} />
            <AdvancedFiltersButton activeCount={activeFilterCount} onClick={() => setIsFiltersOpen(true)} />
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
            minWidth="980px"
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

      <Modal isOpen={addOpen} onClose={() => !adding && setAddOpen(false)} title="Add Model Farmer" subtitle="Link farmers from your list to a package"
        footer={
          <>
            <Button variant="outline" onClick={() => setAddOpen(false)} disabled={adding}>Cancel</Button>
            <Button variant="brand" onClick={() => void add()} disabled={addFarmers.size === 0 || !addSegment || adding}>
              {adding ? "Adding…" : addFarmers.size > 1 ? `Add ${addFarmers.size} farmers` : "Add"}
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <FormField label={`Farmers${addFarmers.size > 0 ? ` (${addFarmers.size} selected)` : ""}`} htmlFor="ben-farmer" required hint="Only farmers linked to you appear here (Farmer Registry is the source of records).">
            {/* Same look as the table-column filter panel (FilterDropdown), but empty means none picked, not all. */}
            <div ref={pickerRef} className="flex flex-col gap-2">
              <button type="button" aria-expanded={pickerOpen} onClick={() => setPickerOpen((open) => !open)} className="flex h-11 w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-3 text-left text-sm text-zinc-900 transition-colors hover:border-brand-green">
                {addFarmers.size > 0 ? `${addFarmers.size} farmer${addFarmers.size > 1 ? "s" : ""} selected` : "Select farmers"}
                <svg className={cn("h-4 w-4 text-muted transition-transform", pickerOpen && "rotate-180")} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6" /></svg>
              </button>
              {pickerOpen && (
                <div className="flex flex-col overflow-hidden rounded-xl border border-line bg-white text-[14px] shadow-[0_12px_40px_-12px_rgba(0,0,0,0.25)]">
                  <label className={cn("flex shrink-0 cursor-pointer items-center gap-3 border-b border-line px-4 py-2.5", allMatchesPicked ? "bg-brand-mint" : "bg-white hover:bg-surface")}>
                    <Checkbox checked={allMatchesPicked} onChange={togglePickAll} disabled={pickerMatches.length === 0} aria-label="All farmers" />
                    <span className={cn("flex flex-1 items-center gap-1.5 font-semibold", allMatchesPicked ? "text-brand-green" : "text-ink")}>
                      {farmerQuery.trim() ? "All matching farmers" : "All farmers"}
                    </span>
                    <span className={cn("rounded-md px-2 py-0.5 text-[13px] font-semibold", allMatchesPicked ? "bg-emerald-100 text-brand-green" : "bg-line-soft text-slate-600")}>
                      {pickerMatches.length}
                    </span>
                  </label>

                  <div className="shrink-0 border-b border-line px-3 py-2.5">
                    <label className="relative block">
                      <svg className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" aria-hidden="true">
                        <circle cx="11" cy="11" r="7" />
                        <path d="M20 20l-3.5-3.5" />
                      </svg>
                      <input
                        id="ben-farmer"
                        type="search"
                        value={farmerQuery}
                        onChange={(e) => setFarmerQuery(e.target.value)}
                        placeholder="Search farmers…"
                        aria-label="Search farmers by name, Farmer ID, kebele or phone"
                        className="h-9 w-full rounded-md border border-zinc-200 bg-surface pl-8 pr-3 text-[13.5px] text-ink placeholder:text-muted focus:border-brand-green focus:outline-none"
                      />
                    </label>
                  </div>

                  <ul className="max-h-[240px] min-h-0 overflow-y-auto overscroll-contain green-scrollbar">
                    {pickerMatches.length === 0 && <li className="px-4 py-4 text-center text-[13px] text-muted">{farmersError ?? (!farmers ? "Loading farmers…" : farmers.length === 0 ? "No farmer assigned" : `No matches for “${farmerQuery.trim()}”`)}</li>}
                    {pickerMatches.map((f) => (
                      <li key={f.id} className="border-b border-line-soft last:border-0">
                        <label className="flex cursor-pointer items-center gap-3 px-4 py-2.5 transition-colors hover:bg-surface">
                          <Checkbox checked={addFarmers.has(f.id)} onChange={() => togglePick(f.id)} aria-label={f.name} />
                          <span className="flex-1 text-ink">{f.name}</span>
                          <span className="rounded-md bg-line-soft px-2 py-0.5 text-[13px] font-semibold text-slate-600">{f.kebele}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </FormField>
          <FormField label="Package" htmlFor="ben-segment" required hint="The farmer's kebele, woreda, zone and region are taken from their Farmer Registry record.">
            <Select id="ben-segment" value={addSegment} onChange={(e) => setAddSegment(e.target.value)}>
              {segmentList.map((s) => <option key={s.name} value={s.name}>{s.title || s.name}</option>)}
            </Select>
          </FormField>
        </div>
      </Modal>
    </>
  );
}
