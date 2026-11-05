"use client";

import { DataTable, type Column } from "@/components/ui/DataTable";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { formatLivestockDate, type LivestockSubmissionSummary } from "@/features/farmers";
import { SectionCard } from "./SectionCard";

const toneOf = (status: string): PillTone => (status === "Approved" ? "green" : status === "Rejected" ? "red" : "amber");

const COLUMNS: Column<LivestockSubmissionSummary>[] = [
  { key: "reference", header: "Reference", cell: (row) => <span className="font-medium text-ink">{row.reference}</span> },
  { key: "date", header: "Submitted", cell: (row) => formatLivestockDate(row.date) },
  { key: "createdBy", header: "By", cell: (row) => row.createdBy },
  { key: "animals", header: "Animals", align: "center", cell: (row) => row.animals },
  { key: "status", header: "Status", align: "center", cell: (row) => <Pill tone={toneOf(row.status)}>{row.status}</Pill> },
];

// The farmer's livestock submissions, newest first (GET /farmers/{id}/livestock).
export function LivestockHistorySection({ submissions, error }: { submissions: LivestockSubmissionSummary[]; error?: boolean }) {
  return (
    <SectionCard title="Livestock History" bodyClassName="p-0">
      <DataTable
        columns={COLUMNS}
        rows={submissions}
        rowKey={(row) => row.key}
        state={error ? "error" : "ready"}
        minWidth="560px"
        itemLabel="submissions"
        emptyTitle="No livestock history yet"
      />
    </SectionCard>
  );
}
