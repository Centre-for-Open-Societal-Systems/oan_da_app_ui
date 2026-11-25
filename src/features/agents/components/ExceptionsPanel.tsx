"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Pill } from "@/components/ui/Pill";
import { EmptyState } from "@/components/ui/EmptyState";
import { Spinner } from "@/components/ui/Spinner";
import { useAuthStore } from "@/store/useAuthStore";
import { describeAgentError, listAllImportExceptions, type ImportExceptionView } from "../api";

const SHOW_STEP = 20;

type Loaded = { items: ImportExceptionView[]; total: number; truncated: boolean; error: string | null };

interface Props {
  compact?: boolean;
  /** Bumped by the page after an import (or a refresh) so the list reloads. */
  refreshKey?: number;
  /** Render only the list, for a parent that supplies the card and header. */
  bare?: boolean;
  /** Reports the registry's total, for a tab count. */
  onLoaded?: (total: number) => void;
}

// Rows the DA Registry refused from bulk imports (GET /da-services/agent-imports/exceptions): duplicate Fayda
// ID, unknown Kebele, and so on, newest first. The registry's exceptions list needs its Integration Manager
// role, which only the OAN Administrator holds, so other roles see nothing here.
export function ExceptionsPanel({ compact = false, refreshKey = 0, bare = false, onLoaded }: Props) {
  const role = useAuthStore((s) => s.role);
  const isAdmin = role === "Admin";
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [shown, setShown] = useState(SHOW_STEP);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    listAllImportExceptions()
      .then((r) => {
        if (cancelled) return;
        setLoaded({ ...r, error: null });
        onLoaded?.(r.total);
      })
      .catch((err: unknown) => !cancelled && setLoaded({ items: [], total: 0, truncated: false, error: describeAgentError(err) }));
    return () => {
      cancelled = true;
    };
    // onLoaded is a notification, not an input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, attempt, refreshKey]);

  if (!isAdmin) return null;

  const visible = loaded?.items.slice(0, shown) ?? [];
  const hidden = (loaded?.items.length ?? 0) - visible.length;

  const body = (
    <>
      {loaded === null && <p className="px-4 py-6 text-center text-[13px] text-muted">Reading the registry&rsquo;s exceptions list…</p>}
      {loaded?.error && <EmptyState tone="error" title="Exceptions could not be loaded" hint={loaded.error} actionLabel="Try again" onAction={() => setAttempt((n) => n + 1)} />}
      {loaded && !loaded.error && loaded.items.length === 0 && <EmptyState title="No refused rows" hint="Rows the registry cannot import appear here a minute or two after a bulk import runs." />}
      {loaded && !loaded.error && visible.length > 0 && (
        <>
          <ul className="divide-y divide-line-soft">
            {visible.map((e) => (
              <li key={e.id} className="flex flex-col gap-1 px-4 py-3.5">
                <div className="flex flex-wrap items-center gap-2">
                  <Pill tone="red">{e.kind}</Pill>
                  <span className="text-[13px] font-semibold text-ink">{e.name}</span>
                  {e.reference && <span className="font-mono text-[12px] text-muted">{e.reference}</span>}
                </div>
                <p className="text-[13px] text-ink-soft">{e.detail}</p>
                {e.raisedAt !== "—" && <p className="text-[11.5px] text-subtle">raised {e.raisedAt}</p>}
              </li>
            ))}
          </ul>
          {(hidden > 0 || loaded.truncated) && (
            <div className="flex items-center justify-between gap-3 border-t border-line px-4 py-3 text-[12.5px] text-muted">
              <span>
                Showing {visible.length} of {loaded.total.toLocaleString()}
                {loaded.truncated ? " (the oldest are not loaded)" : ""}
              </span>
              {hidden > 0 && (
                <Button type="button" variant="outline" size="sm" onClick={() => setShown((n) => n + SHOW_STEP)}>
                  Show {Math.min(SHOW_STEP, hidden)} more
                </Button>
              )}
            </div>
          )}
        </>
      )}
    </>
  );

  if (bare) return body;

  return (
    <Card className="p-0 shadow-card">
      <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-4">
        <div>
          <h2 className="flex items-center gap-2 text-[15px] font-semibold text-ink">
            Import exceptions
            {loaded && !loaded.error && <span className="rounded-full bg-danger-wash px-2 py-px text-[12px] font-semibold text-danger">{loaded.total.toLocaleString()}</span>}
          </h2>
          {!compact && <p className="mt-0.5 text-[12.5px] text-ink-soft">Rows the DA Registry refused from bulk imports, newest first, with its reason. Fix the row in the file and import it again.</p>}
        </div>
        <div className="flex items-center gap-2">
          {loaded === null && <Spinner className="h-4 w-4 text-muted" />}
          {loaded && (
            <Button type="button" variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>
              Refresh
            </Button>
          )}
        </div>
      </div>
      {body}
    </Card>
  );
}
