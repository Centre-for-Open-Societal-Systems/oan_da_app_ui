"use client";

import { useState } from "react";
import { PLOTS } from "@/features/farmers";
import type { Plot } from "@/features/farmers";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { SectionCard } from "./SectionCard";

const mapUrl = (p: Plot) => `https://www.openstreetmap.org/?mlat=${p.lat}&mlon=${p.lng}#map=16/${p.lat}/${p.lng}`;

// Registry plots have no centroid yet (lat/lng NaN): the details still open, without the map link or GPS row.
const hasLocation = (p: Plot) => Number.isFinite(p.lat) && Number.isFinite(p.lng);

/** A plot as listed: the registry's plot id is not for people, so plots go by their place in the list. */
type PlotRow = Plot & { label: string };

/** `plots` from GET /farmers/{id}/plots; the sample plots when omitted. */
export function HoldingsSection({ plots = PLOTS }: { plots?: Plot[] }) {
  const [viewing, setViewing] = useState<PlotRow | null>(null);

  const columns: Column<PlotRow>[] = [
    { key: "plot", header: "Plot", cell: (row) => <span className="font-medium text-ink">{row.label}</span> },
    { key: "use", header: "Land Use", cell: (row) => row.crop },
    { key: "area", header: "Area", align: "center", cell: (row) => `${row.areaHa} ha` },
    { key: "soil", header: "Soil Fertility", cell: (row) => row.soil },
    { key: "kebele", header: "Kebele", cell: (row) => row.zone },
    { key: "tenure", header: "Ownership", cell: (row) => row.tenure },
    {
      key: "action",
      header: "Action",
      align: "center",
      cell: (row) => (
        <button
          type="button"
          aria-label={`View ${row.label} on map`}
          title="Plot details and map"
          onClick={() => setViewing(row)}
          className="rounded-md p-1.5 text-muted transition-colors hover:bg-surface hover:text-brand-green"
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <path d="M9 4L3 6v14l6-2 6 2 6-2V4l-6 2-6-2zM9 4v14M15 6v14" />
          </svg>
        </button>
      ),
    },
  ];

  return (
    <SectionCard title="Holdings and Plots" bodyClassName="p-0">
      <DataTable
        columns={columns}
        rows={plots.map((plot, index) => ({ ...plot, label: `Plot ${index + 1}` }))}
        rowKey={(row) => row.code}
        minWidth="720px"
        itemLabel="plots"
        emptyTitle="No plots recorded in the Farmer Registry."
      />

      {viewing && (
        <Modal
          isOpen
          onClose={() => setViewing(null)}
          title={`${viewing.label} · ${viewing.crop}`}
          subtitle={`${viewing.zone} · ${viewing.areaHa} ha`}
          footer={
            <>
              <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
              {hasLocation(viewing) && (
              <a
                href={mapUrl(viewing)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-10 flex-1 items-center justify-center whitespace-nowrap rounded-md bg-brand-green px-4 text-sm font-semibold text-white hover:bg-brand-green-dark sm:flex-none"
              >
                Open in map
              </a>
              )}
            </>
          }
        >
          <dl className="grid grid-cols-2 gap-4">
            {[
              ["Crop", viewing.crop],
              ["Area", `${viewing.areaHa} ha`],
              ["Soil", viewing.soil],
              ["Zone", viewing.zone],
              ["Tenure", viewing.tenure],
              ["GPS (centroid)", hasLocation(viewing) ? `${viewing.lat.toFixed(4)}, ${viewing.lng.toFixed(4)}` : "Not recorded"],
            ].map(([label, value]) => (
              <div key={label}>
                <dt className="text-[12px] font-medium uppercase tracking-wider text-muted">{label}</dt>
                <dd className="mt-1 text-[14px] text-ink">{value}</dd>
              </div>
            ))}
          </dl>
          <p className="mt-4 text-[12.5px] text-muted">
            Boundaries are field-captured evidence until the Land Registry API is available; the map opens at the plot centroid.
          </p>
        </Modal>
      )}
    </SectionCard>
  );
}
