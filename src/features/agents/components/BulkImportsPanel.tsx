"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { useAuthStore } from "@/store/useAuthStore";
import { ExceptionsPanel } from "./ExceptionsPanel";
import { RECENT_IMPORTS_HINT, RecentImportsPanel } from "./RecentImportsPanel";

type Tab = "imports" | "exceptions";

// One card under the registry table for everything about bulk imports: what this portal sent (Recent imports)
// and what the registry refused (Import exceptions), as tabs so neither list pushes the other down the page.
// Both lists stay mounted so the tab counts are right and switching tabs does not refetch. Admin-only.
export function BulkImportsPanel({ refreshKey = 0 }: { refreshKey?: number }) {
  const role = useAuthStore((s) => s.role);
  const [tab, setTab] = useState<Tab>("imports");
  const [attempt, setAttempt] = useState(0);
  const [counts, setCounts] = useState<{ imports?: number; exceptions?: number }>({});

  if (role !== "Admin") return null;

  const key = refreshKey * 1000 + attempt;

  return (
    <Card className="p-0 shadow-card">
      <div className="border-b border-line px-4 py-4">
        <h2 className="text-[15px] font-semibold text-ink">Bulk imports</h2>
        <p className="mt-0.5 text-[12.5px] text-ink-soft">
          {RECENT_IMPORTS_HINT} The registry reports refusals a minute or two after an import; fix the row in the file and import it again.
        </p>
      </div>
      <SegmentTabs<Tab>
        tabs={[
          { key: "imports", label: "Recent imports", count: counts.imports },
          { key: "exceptions", label: "Import exceptions", count: counts.exceptions },
        ]}
        active={tab}
        onChange={setTab}
        label="Bulk imports"
        actions={
          <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
            Refresh
          </Button>
        }
      />
      <div className={tab === "imports" ? "" : "hidden"}>
        <RecentImportsPanel bare refreshKey={key} onLoaded={(n) => setCounts((c) => ({ ...c, imports: n }))} />
      </div>
      <div className={tab === "exceptions" ? "" : "hidden"}>
        <ExceptionsPanel bare refreshKey={key} onLoaded={(n) => setCounts((c) => ({ ...c, exceptions: n }))} />
      </div>
    </Card>
  );
}
