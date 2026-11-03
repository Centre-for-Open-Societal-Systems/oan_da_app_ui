"use client";

import { useState } from "react";
import { AdvancedFiltersButton } from "@/components/ui/AdvancedFiltersButton";
import { AdvancedFiltersDrawer, type FilterFieldConfig } from "@/components/ui/AdvancedFiltersDrawer";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { FilterDropdown } from "@/components/ui/FilterDropdown";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { ethiopianFull } from "@/lib/ethiopian";
import { matchesQuery } from "@/lib/search";
import { formatDate } from "../lifecycle/components/lifecycle";
import { ICONS } from "../lifecycle/components/shared";
import { PageIntro, SELECT_CLASS, SummaryTile, has, optionsOf } from "../leave-admin/shared";

interface CalendarRow {
  id: string;
  ethiopian: string;
  gregorian: string;
  name: string;
  layer: string;
  rule: string;
  /** The region the date belongs to; empty for Federal dates and block periods, which every region gets. */
  region: string;
}

// Sample calendar until the leave calendar API exists. The layer is who set the date: Federal, a region, a woreda, or a Blocked period.
const ROWS: CalendarRow[] = [
  { id: "1", ethiopian: "20 Nehase 2026", gregorian: "26 Aug 2026", name: "Meher harvest campaign", layer: "Blocked", rule: "Moves · provisional", region: "" },
  { id: "2", ethiopian: "1 Meskerem", gregorian: "11 Sep 2026", name: "Enkutatash", layer: "Federal", rule: "Fixed", region: "" },
  { id: "3", ethiopian: "17 Meskerem", gregorian: "27 Sep 2026", name: "Meskel", layer: "Federal", rule: "Fixed", region: "" },
  { id: "4", ethiopian: "Set by region", gregorian: "Oct 2026", name: "Irreecha", layer: "Oromia", rule: "Each year", region: "Oromia" },
  { id: "5", ethiopian: "1 Tikimt – 30 Hidar", gregorian: "Oct - Dec 2026", name: "Meher harvest campaign", layer: "Blocked", rule: "Annual, personal", region: "" },
  { id: "6", ethiopian: "29 Tahsas", gregorian: "2 Jan 2026", name: "Genna", layer: "Federal", rule: "Fixed", region: "" },
  { id: "7", ethiopian: "1 – 22 Tir", gregorian: "9 - 30 Jan 2027", name: "Appraisal window", layer: "Federal", rule: "Annual, personal", region: "" },
  { id: "8", ethiopian: "23 Yekatit", gregorian: "2 Mar 2027", name: "Adwa Victory Day", layer: "Federal", rule: "Annual, personal", region: "" },
  { id: "9", ethiopian: "1 – 22 Tir", gregorian: "9 - 30 Jan 2027", name: "Appraisal window", layer: "Federal", rule: "Annual, personal", region: "" },
  { id: "10", ethiopian: "Set by woreda", gregorian: "-", name: "Bako Tibe staff day", layer: "Bako Tibe", rule: "Each year", region: "Oromia" },
];

const LAYER_TONE: Record<string, PillTone> = { Blocked: "amber", Federal: "green", "Bako Tibe": "purple" };
const layerTone = (layer: string) => LAYER_TONE[layer] ?? "blue";

const LEAVE_YEARS = ["Leave year 2026", "Leave year 2027"];
const FEDERAL = "Federal (base)";
const REGIONS = ["Oromia", FEDERAL, "Amhara", "Sidama", "South Ethiopia", "Tigray"];
const WOREDA = "Bako Tibe woreda";

const NAME_OPTIONS = ["Irreecha", "Fichee-Chambalaalla", "Eid al-Adha", "Mawlid", "Fasika", "Harvest campaign", "Staff day"];
const LAYER_OPTIONS = ["Regional holiday", "Local closure", "Block period"];

const PASS_DOWN = [
  { layer: "Federal", text: "Sets national holidays and department blocks. Every region gets them." },
  { layer: "Region", text: "Adds regional holidays and blocks. Cannot remove Federal dates." },
  { layer: "Zone", text: "Add local closures for their own area only." },
];

const EMPTY_FILTERS = { layer: new Set<string>() };

function AddDateModal({ region, onClose, onAdd }: { region: string; onClose: () => void; onAdd: (row: CalendarRow) => void }) {
  const [name, setName] = useState("");
  const [dateMode, setDateMode] = useState("each-year");
  const [date, setDate] = useState("");
  const [layer, setLayer] = useState(LAYER_OPTIONS[0]);
  const [scope, setScope] = useState(region === FEDERAL ? REGIONS[0] : region);
  const [rule, setRule] = useState("move");

  const isLocal = layer === "Local closure";
  const scopes = isLocal ? [WOREDA] : REGIONS.filter((r) => r !== FEDERAL);
  const scopeValue = scopes.includes(scope) ? scope : scopes[0];
  const valid = name !== "" && (dateMode === "each-year" || date !== "");

  const add = () => {
    const owner = layer === "Block period" ? "Blocked" : isLocal ? "Bako Tibe" : scopeValue;
    onAdd({
      id: `d-${Date.now()}`,
      ethiopian: dateMode === "each-year" ? (isLocal ? "Set by woreda" : "Set by region") : ethiopianFull(date),
      gregorian: dateMode === "each-year" ? "-" : formatDate(date),
      name,
      layer: owner,
      rule: rule === "move" ? "Moves · provisional" : "Fixed",
      region: isLocal ? "Oromia" : scopeValue,
    });
  };

  return (
    <Modal isOpen onClose={onClose} title="Add a date" size="md" bodyClassName="p-4 sm:px-6 sm:py-5" footer={<><Button variant="outline" onClick={onClose}>Cancel</Button><Button variant="brand" onClick={add} disabled={!valid}>Add date</Button></>}>
      <div className="flex flex-col gap-4">
        <FormField label="Name" htmlFor="gc-name">
          <Select id="gc-name" value={name} onChange={(e) => setName(e.target.value)} className="h-11">
            <option value="" disabled>e.g. Irreecha</option>
            {NAME_OPTIONS.map((n) => <option key={n}>{n}</option>)}
          </Select>
        </FormField>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Ethiopian date" htmlFor="gc-mode">
            <Select id="gc-mode" value={dateMode} onChange={(e) => setDateMode(e.target.value)} className="h-11">
              <option value="each-year">Set each year</option>
              <option value="pick">Pick a date</option>
            </Select>
          </FormField>
          <FormField label="Layer" htmlFor="gc-layer">
            <Select id="gc-layer" value={layer} onChange={(e) => setLayer(e.target.value)} className="h-11">
              {LAYER_OPTIONS.map((l) => <option key={l}>{l}</option>)}
            </Select>
          </FormField>
        </div>
        {dateMode === "pick" && (
          <FormField label="Date" htmlFor="gc-date" hint={date ? ethiopianFull(date) : undefined}>
            <Input id="gc-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </FormField>
        )}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <FormField label="Scope" htmlFor="gc-scope">
            <Select id="gc-scope" value={scopeValue} onChange={(e) => setScope(e.target.value)} className="h-11">
              {scopes.map((s) => <option key={s}>{s}</option>)}
            </Select>
          </FormField>
          <FormField label="Date rule" htmlFor="gc-rule">
            <Select id="gc-rule" value={rule} onChange={(e) => setRule(e.target.value)} className="h-11">
              <option value="move">Move each year</option>
              <option value="fixed">Fixed every year</option>
            </Select>
          </FormField>
        </div>
        <p className="rounded-lg bg-blue-50 px-4 py-3 text-[14px] text-blue-800">Regions add regional holidays; zones and woredas add local closures for their own area.</p>
      </div>
    </Modal>
  );
}

export function GovernmentCalendar() {
  const [year, setYear] = useState(LEAVE_YEARS[0]);
  const [region, setRegion] = useState(REGIONS[0]);
  const [rows, setRows] = useState(ROWS);
  const [isAdding, setIsAdding] = useState(false);
  const [added, setAdded] = useState("");
  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  // Federal dates and blocks reach every region; a region's own dates show only for that region.
  const inScope = rows.filter((r) => r.region === "" || r.region === region);
  const layerOptions = optionsOf(inScope.map((r) => r.layer));
  const fields: FilterFieldConfig[] = [{ key: "layer", label: "Layer", allLabel: "All Layers", placeholder: "All Layers", options: layerOptions }];
  const activeCount = filters.layer.size > 0 ? 1 : 0;

  const shown = inScope.filter((r) => has(filters.layer, r.layer) && matchesQuery(query, r.ethiopian, r.gregorian, r.name, r.layer, r.rule));
  const regional = inScope.filter((r) => r.region === region && r.layer === region).length;
  const addedLocal = rows.filter((r) => r.id.startsWith("d-") && r.layer === "Bako Tibe").length;
  const addedBlocks = rows.filter((r) => r.id.startsWith("d-") && r.layer === "Blocked").length;

  const columns: Column<CalendarRow>[] = [
    { key: "ethiopian", header: "Ethiopian Date", cell: (r) => <span className="font-semibold text-ink">{r.ethiopian}</span> },
    { key: "gregorian", header: "Gregorian", cell: (r) => r.gregorian },
    { key: "name", header: "Name", cell: (r) => r.name },
    {
      key: "layer",
      header: <FilterDropdown label="Layer" allLabel="All Layers" options={layerOptions} selected={filters.layer} onApply={(layer) => setFilters({ layer })} />,
      cell: (r) => <Pill tone={layerTone(r.layer)} className="px-2.5 py-0.5">{r.layer}</Pill>,
    },
    { key: "rule", header: "Rule", cell: (r) => r.rule },
  ];

  return (
    <div className="flex w-full flex-col gap-5">
      <PageIntro title="Government Calendar" help="The official holiday calendar by layer: Federal dates reach every region, regions and woredas add their own. Leave days skip these dates." description="View and manage the official government holiday calendar, including public holidays, regional holidays, and important government observances.">
        <Select value={year} onChange={(e) => setYear(e.target.value)} className={SELECT_CLASS}>
          {LEAVE_YEARS.map((y) => <option key={y}>{y}</option>)}
        </Select>
        <Select value={region} onChange={(e) => { setRegion(e.target.value); setFilters(EMPTY_FILTERS); }} className={SELECT_CLASS}>
          {REGIONS.map((r) => <option key={r}>{r}</option>)}
        </Select>
        <Button variant="brand" className="h-10" onClick={() => setIsAdding(true)}>Add date</Button>
      </PageIntro>

      {added && <Banner tone="success" title="Date added" onDismiss={() => setAdded("")}>{added} is on the calendar. Leave days skip it from now on.</Banner>}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryTile label="Federal holidays" help="National public holidays set by the federal government. Every region gets them." value={13} note="Set by federal" accent="emerald" icon={ICONS.calendar} />
        <SummaryTile label="Regional holidays" help="Holidays added by the selected region on top of the federal ones." value={regional} note={region === FEDERAL ? "Federal base" : region} accent="blue" icon={ICONS.file} />
        <SummaryTile label="Local closures" help="Closures set by a zone or woreda for its own area only." value={2 + addedLocal} note="Zones and woredas" accent="amber" icon={ICONS.calendar} />
        <SummaryTile label="Block periods" help="Periods when leave requests are paused, such as a harvest campaign." value={3 + addedBlocks} note="Leave paused" accent="violet" icon={ICONS.file} />
      </div>

      <Card className="overflow-hidden p-0">
        <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h3 className="text-[17px] font-bold text-ink">All leaves</h3>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <SearchInput value={query} onChange={setQuery} placeholder="Search Name, Ethiopian date..." className="sm:[&_input]:w-[240px]" />
            <AdvancedFiltersButton activeCount={activeCount} onClick={() => setIsFiltersOpen(true)} />
          </div>
        </div>
        <DataTable columns={columns} rows={shown} rowKey={(r) => r.id} itemLabel="dates" minWidth="760px" emptyTitle="No dates match these filters" emptyHint="Clear a filter or search for another date." />
        <AdvancedFiltersDrawer isOpen={isFiltersOpen} onClose={() => setIsFiltersOpen(false)} fields={fields} filters={filters} onApply={(next) => setFilters({ layer: next.layer ?? new Set() })} />
      </Card>

      <Card className="p-0">
        <div className="border-b border-line-soft px-5 py-4">
          <h3 className="text-[17px] font-bold text-ink">How dates pass down</h3>
        </div>
        <dl className="flex flex-col gap-3 px-5 py-4">
          {PASS_DOWN.map((p) => (
            <div key={p.layer}>
              <dt className="text-[14px] font-semibold text-ink">{p.layer}</dt>
              <dd className="text-[14px] text-ink-soft">{p.text}</dd>
            </div>
          ))}
          <Banner tone="warning" className="mt-1 py-2">Moving dates (Eid, Mawlid, Fasika) are confirmed each year before the leave year starts.</Banner>
        </dl>
      </Card>

      {isAdding && (
        <AddDateModal
          region={region}
          onClose={() => setIsAdding(false)}
          onAdd={(row) => {
            setRows((prev) => [row, ...prev]);
            setAdded(row.name);
            setIsAdding(false);
          }}
        />
      )}
    </div>
  );
}
