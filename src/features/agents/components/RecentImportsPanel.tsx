"use client";

import { useEffect, useState } from "react";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { Spinner } from "@/components/ui/Spinner";
import { useAuthStore } from "@/store/useAuthStore";
import { describeAgentError, formatIsoStamp, importStatusLabel, listAgentImports, type AgentImport } from "../api";

const RECENT = 10;
const TONE: Record<string, PillTone> = { "Sent to registry": "green", Failed: "red", Pending: "amber", Rejected: "red" };

export const RECENT_IMPORTS_HINT =
  "“Sent to registry” means the registry accepted the file: rows it refuses appear under Import exceptions, accepted agents wait in the registry's approval tasks.";

interface Props {
  /** Bumped by the page after an import so the list reloads. */
  refreshKey?: number;
  /** Render only the list, for a parent that supplies the card and header. */
  bare?: boolean;
  /** Reports how many imports were loaded, for a tab count. */
  onLoaded?: (count: number) => void;
}

// Files this portal handed to the DA Registry (GET /da-services/agent-imports). DA Services only knows whether the
// registry took the file, so the state stays "Sent to registry": refused rows show in the exceptions list,
// accepted agents wait in the registry's own approval tasks. Admin-only, like the import itself.
export function RecentImportsPanel({ refreshKey = 0, bare = false, onLoaded }: Props) {
  const role = useAuthStore((s) => s.role);
  const me = useAuthStore((s) => s.user);
  const isAdmin = role === "Admin";
  const [loaded, setLoaded] = useState<{ rows: AgentImport[]; error: string | null } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    listAgentImports(RECENT)
      .then((rows) => {
        if (cancelled) return;
        setLoaded({ rows, error: null });
        onLoaded?.(rows.length);
      })
      .catch((err: unknown) => !cancelled && setLoaded({ rows: [], error: describeAgentError(err) }));
    return () => {
      cancelled = true;
    };
    // onLoaded is a notification, not an input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, attempt, refreshKey]);

  if (!isAdmin) return null;

  const body = (
    <>
      {loaded === null && <p className="px-4 py-6 text-center text-[13px] text-muted">Reading your imports…</p>}
      {loaded?.error && <EmptyState tone="error" title="Imports could not be loaded" hint={loaded.error} actionLabel="Try again" onAction={() => setAttempt((n) => n + 1)} />}
      {loaded && !loaded.error && loaded.rows.length === 0 && <EmptyState title="No imports from this portal yet" hint="Use “Import agents” above to hand a CSV or XLSX to the DA Registry." />}
      {loaded && !loaded.error && loaded.rows.length > 0 && (
        <ul className="divide-y divide-line-soft">
          {loaded.rows.map((r) => {
            const label = importStatusLabel(r.status);
            const by = r.uploaded_by ? (me && (r.uploaded_by === me.id || r.uploaded_by === me.email) ? "you" : r.uploaded_by) : null;
            return (
              <li key={r.name} className="flex flex-col gap-1 px-4 py-3 text-[13px] sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{r.file_name ?? r.name}</p>
                  <p className="text-[12px] text-muted">
                    {r.rows != null ? `${r.rows} row${r.rows === 1 ? "" : "s"} · ` : ""}
                    {formatIsoStamp(r.created_at.replace(" ", "T"))}
                    {by ? ` · by ${by}` : ""}
                    {r.registry_import_id ? ` · registry ${r.registry_import_id}` : ""}
                    {r.error ? ` · ${r.error}` : ""}
                  </p>
                </div>
                <Pill tone={TONE[label] ?? "slate"}>{label}</Pill>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );

  if (bare) return body;

  return (
    <Card className="p-0 shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">Recent imports</h2>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">{RECENT_IMPORTS_HINT}</p>
        </div>
        {loaded === null && <Spinner className="h-4 w-4 text-muted" />}
      </div>
      {body}
    </Card>
  );
}
