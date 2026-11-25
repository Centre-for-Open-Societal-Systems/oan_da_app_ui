"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Dropdown } from "@/components/ui/Dropdown";
import { EmptyState } from "@/components/ui/EmptyState";
import { Pill, type PillTone } from "@/components/ui/Pill";
import { Spinner } from "@/components/ui/Spinner";
import { changedFields, changeRows, describeProfileError, fetchChangeRequest, listChangeRequests, profileFieldLabel, type ChangeRequest, type ChangeRequestStatus } from "@/features/profile";
import { cn } from "@/lib/utils";

const STATUS_OPTIONS: { value: "" | ChangeRequestStatus; label: string }[] = [
  { value: "", label: "All statuses" },
  { value: "Pending", label: "Pending" },
  { value: "Approved", label: "Approved" },
  { value: "Applied", label: "Applied" },
  { value: "Changes requested", label: "Changes requested" },
  { value: "Rejected", label: "Rejected" },
  { value: "Cancelled", label: "Cancelled" },
];

const STATUS_TONE: Record<string, PillTone> = { Pending: "amber", Approved: "green", Applied: "blue", "Changes requested": "amber", Rejected: "red", Cancelled: "slate" };
const REGISTRY_TONE: Record<string, PillTone> = { Pending: "amber", Approved: "green", Rejected: "red" };

const label = profileFieldLabel;

const formatDateTime = (iso: string | null | undefined) => {
  if (!iso) return "—";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleString("en-GB", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
};

const text = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : typeof v === "string" ? v : JSON.stringify(v));

type Loaded = { items: ChangeRequest[]; total: number; error: string | null };
type Detail = { request?: ChangeRequest; error?: string };

interface Props {
  /** Bumped by the page after a submit or cancel so the list reloads. */
  refreshKey: number;
  cancelling: string | null;
  onCancel: (request: ChangeRequest) => void;
}

const sectionIcon = (section?: string) => {
  if (section === "Qualifications") {
    return (
      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 14l9-5-9-5-9 5 9 5z" />
        <path d="M12 14l6.16-3.422a12.083 12.083 0 01.665 6.479A11.952 11.952 0 0012 20.055a11.952 11.952 0 00-6.824-2.998 12.078 12.078 0 01.665-6.479L12 14z" />
      </svg>
    );
  }
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72c.13.96.36 1.9.7 2.81a2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0122 16.92z" />
    </svg>
  );
};

// The DA's own change requests (GET /profile/change-requests, filtered by status) and, on expand, the full row
// (GET /profile/change-requests/{id}) with each field's from → to, the supervisor's decision and the registry's
// own outcome. A Pending request can still be cancelled from here.
export function ChangeRequestsSection({ refreshKey, cancelling, onCancel }: Props) {
  const [status, setStatus] = useState<"" | ChangeRequestStatus>("");
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [details, setDetails] = useState<Record<string, Detail>>({});

  useEffect(() => {
    let cancelled = false;
    listChangeRequests({ status: status || undefined })
      .then((r) => !cancelled && setLoaded({ ...r, error: null }))
      .catch((err: unknown) => !cancelled && setLoaded({ items: [], total: 0, error: describeProfileError(err) }));
    return () => {
      cancelled = true;
    };
  }, [status, refreshKey]);

  const toggle = (request: ChangeRequest) => {
    if (expanded === request.name) {
      setExpanded(null);
      return;
    }
    setExpanded(request.name);
    // Always re-read: the registry's decision on an applied change is refreshed on this call.
    setDetails((d) => ({ ...d, [request.name]: {} }));
    fetchChangeRequest(request.name)
      .then((full) => setDetails((d) => ({ ...d, [request.name]: { request: full } })))
      .catch((err: unknown) => setDetails((d) => ({ ...d, [request.name]: { error: describeProfileError(err) } })));
  };

  return (
    <Card className="overflow-hidden p-0 shadow-card">
      <div className="flex flex-col gap-3 border-b border-line bg-surface/40 px-5 py-3.5 sm:px-6 sm:py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-[15px] font-semibold text-ink">My change requests</h2>
            {loaded && (
              <span className="rounded-full border border-line bg-white px-2 py-0.5 text-[11px] font-semibold text-ink-soft shadow-2xs">
                {loaded.total}
              </span>
            )}
          </div>
          <p className="mt-0.5 text-[12.5px] text-ink-soft">
            Each edit you submit goes to your Woreda supervisor, then to the DA Registry
          </p>
        </div>
        <Dropdown value={status} onChange={(v) => setStatus(v as "" | ChangeRequestStatus)} options={STATUS_OPTIONS} className="w-full sm:w-52 [&>button]:h-10" />
      </div>

      {loaded === null ? (
        <div className="flex items-center justify-center gap-3 py-10 text-[13.5px] text-ink-soft">
          <Spinner className="h-4 w-4 text-brand-green" /> Loading your requests…
        </div>
      ) : loaded.error ? (
        <EmptyState tone="error" title="Could not load your change requests" hint={loaded.error} />
      ) : loaded.items.length === 0 ? (
        <EmptyState title="No change requests" hint={status ? `You have no ${status.toLowerCase()} requests.` : "Use “Edit profile” to request a change to your contact details or qualifications."} />
      ) : (
        <ul className="divide-y divide-line">
          {loaded.items.map((r) => {
            const open = expanded === r.name;
            const detail = details[r.name];
            const full = detail?.request ?? r;
            return (
              <li key={r.name} className={cn("transition-colors", open && "bg-brand-tint/20")}>
                <button
                  type="button"
                  onClick={() => toggle(r)}
                  aria-expanded={open}
                  className={cn(
                    "group flex w-full flex-col gap-3 px-5 py-4 text-left transition-colors hover:bg-surface/60 sm:flex-row sm:items-center sm:justify-between",
                    open && "border-l-4 border-l-brand-green bg-brand-tint/30 pl-4 sm:pl-4"
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={cn(
                      "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-line bg-surface text-ink-soft shadow-2xs transition-colors group-hover:border-brand-border group-hover:text-brand-green",
                      open && "border-brand-border bg-white text-brand-green"
                    )}>
                      {sectionIcon(r.section)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <span className="block text-[14px] font-semibold text-ink group-hover:text-brand-dark truncate">
                        {r.section ?? "Profile"} · {changedFields(r).map(label).join(", ") || "Requested change"}
                      </span>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[12px] text-muted">
                        <span className="font-mono text-xs bg-slate-100 border border-slate-200/80 px-2 py-0.5 rounded-md text-slate-700 font-medium">{r.name}</span>
                        <span>•</span>
                        <span>submitted {formatDateTime(r.creation)}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-2.5">
                    <Pill tone={STATUS_TONE[String(r.status)] ?? "slate"}>{String(r.status)}</Pill>
                    {r.registry_approval && <Pill tone={REGISTRY_TONE[String(r.registry_approval)] ?? "slate"}>Registry: {String(r.registry_approval)}</Pill>}
                    <div className={cn("flex h-7 w-7 items-center justify-center rounded-lg border border-line-soft bg-surface/50 text-muted transition-transform duration-200", open && "rotate-180 bg-surface text-ink")}>
                      <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 9l6 6 6-6" />
                      </svg>
                    </div>
                  </div>
                </button>

                {open && (
                  <div className="border-t border-line bg-surface/30 p-4 sm:p-5 sm:px-6">
                    {!detail?.request && !detail?.error && (
                      <p className="flex items-center gap-2 py-4 text-[13px] text-ink-soft">
                        <Spinner className="h-4 w-4 text-brand-green" /> Loading request details…
                      </p>
                    )}
                    {detail?.error && <p className="py-2 text-[13px] text-danger">{detail.error}</p>}
                    {detail?.request && (
                      <div className="flex flex-col gap-4 animate-fade-in">
                        {/* Table container */}
                        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-2xs">
                          <div className="overflow-x-auto">
                            <table className="w-full min-w-[560px] text-left text-[13.5px]">
                              <thead>
                                <tr className="border-b border-line bg-surface/60 text-[13px] font-semibold text-slate-600">
                                  <th className="w-16 min-w-[64px] px-4 py-3 text-center">S.No.</th>
                                  <th className="w-1/4 sm:w-1/3 min-w-[140px] px-4 py-3">Field</th>
                                  <th className="min-w-[170px] px-4 py-3">Current Value</th>
                                  <th className="min-w-[190px] px-4 py-3">Requested Value</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-line text-[13.5px]">
                                {changeRows(full).map((c, idx) => (
                                  <tr key={c.field} className="transition-colors hover:bg-surface/30">
                                    <td className="w-16 px-4 py-3.5 text-center font-mono text-[13px] text-muted">
                                      {idx + 1}
                                    </td>
                                    <td className="px-4 py-3.5 font-semibold text-ink">
                                      {label(c.field)}
                                    </td>
                                    <td className="px-4 py-3.5 text-ink-soft">
                                      {c.from === "—" || !c.from ? (
                                        <span className="text-muted">—</span>
                                      ) : (
                                        <span className="inline-block rounded-md border border-line-soft bg-surface/70 px-2.5 py-1 font-mono text-xs text-ink-soft">
                                          {c.from}
                                        </span>
                                      )}
                                    </td>
                                    <td className="px-4 py-3.5">
                                      <span className="inline-flex items-center gap-1.5 rounded-md border border-brand-border/60 bg-brand-tint/70 px-2.5 py-1 text-xs font-semibold text-brand-dark">
                                        <svg className="h-3 w-3 text-brand-green shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5}>
                                          <path d="M5 12h14M12 5l7 7-7 7" />
                                        </svg>
                                        {c.to}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>

                        {/* Review & Sync Details Grid */}
                        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                          {/* Submission Reason */}
                          <div className="flex h-full flex-col justify-between gap-1.5 rounded-xl border border-line bg-white p-3.5 shadow-2xs">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Submission Reason</span>
                            <span className="text-[13px] font-medium text-ink break-words">{text(full.reason)}</span>
                          </div>

                          {/* Supervisor Decision */}
                          <div className="flex h-full flex-col justify-between gap-1.5 rounded-xl border border-line bg-white p-3.5 shadow-2xs">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">Supervisor Review</span>
                            <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
                              {full.decided_at ? (
                                <>
                                  <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                  <span className="truncate" title={String(full.approver)}>
                                    {String(full.status)} by {text(full.approver).replace(/@iam\.internal$/, "")}
                                  </span>
                                </>
                              ) : (
                                <>
                                  <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse shrink-0" />
                                  <span className="text-amber-800">Waiting for supervisor review</span>
                                </>
                              )}
                            </div>
                            {full.decided_at && (
                              <span className="text-[11.5px] text-muted">{formatDateTime(full.decided_at)}</span>
                            )}
                          </div>

                          {/* DA Registry Status */}
                          <div className="flex h-full flex-col justify-between gap-1.5 rounded-xl border border-line bg-white p-3.5 shadow-2xs sm:col-span-2 lg:col-span-1">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted">DA Registry Status</span>
                            <div className="flex items-center gap-2 text-[13px] font-medium text-ink">
                              {full.registry_sync_state ? (
                                <>
                                  <span className={cn("h-2 w-2 rounded-full shrink-0", full.registry_sync_state === "Accepted" ? "bg-emerald-500" : "bg-blue-500")} />
                                  <span>{full.registry_sync_state}</span>
                                  {full.registry_reference && (
                                    <span className="font-mono text-xs text-muted" title={full.registry_reference}>
                                      ({full.registry_reference.length > 12 ? `${full.registry_reference.slice(0, 8)}…` : full.registry_reference})
                                    </span>
                                  )}
                                </>
                              ) : (
                                <>
                                  <span className="h-2 w-2 rounded-full bg-slate-300 shrink-0" />
                                  <span className="text-muted">Not queued to registry yet</span>
                                </>
                              )}
                            </div>
                            {full.applied_at && (
                              <span className="text-[11.5px] text-muted">{formatDateTime(full.applied_at)}</span>
                            )}
                          </div>

                          {/* Supervisor Note if present */}
                          {full.decision_note && (
                            <div className="flex flex-col gap-1 rounded-xl border border-amber-200 bg-amber-50/60 p-3.5 sm:col-span-2 lg:col-span-3">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-amber-800">Supervisor Note</span>
                              <p className="text-[13px] text-amber-950 leading-relaxed">{full.decision_note}</p>
                            </div>
                          )}

                          {/* Registry Error if present */}
                          {full.registry_error && (
                            <div className="flex flex-col gap-1 rounded-xl border border-rose-200 bg-rose-50/60 p-3.5 sm:col-span-2 lg:col-span-3">
                              <span className="text-[11px] font-semibold uppercase tracking-wider text-rose-800">Registry Sync Error</span>
                              <p className="text-[13px] text-rose-950 font-mono">{String(full.registry_error)}</p>
                            </div>
                          )}
                        </div>

                        {/* Cancel button if Pending */}
                        {full.status === "Pending" && (
                          <div className="flex justify-end pt-1">
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="w-full sm:w-fit border-rose-200 text-rose-700 hover:bg-rose-50 hover:border-rose-300"
                              disabled={cancelling === full.name}
                              onClick={() => onCancel(full)}
                            >
                              {cancelling === full.name ? "Cancelling…" : "Cancel this request"}
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}
