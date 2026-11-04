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
    <Card className="p-0 shadow-card">
      <div className="flex flex-col gap-3 border-b border-line px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">My change requests</h2>
          <p className="mt-1 text-[12.5px] text-ink-soft">
            Each edit you submit goes to your Woreda supervisor, then to the DA Registry{loaded ? ` · ${loaded.total} request${loaded.total === 1 ? "" : "s"}` : ""}
          </p>
        </div>
        <Dropdown value={status} onChange={(v) => setStatus(v as "" | ChangeRequestStatus)} options={STATUS_OPTIONS} className="w-full sm:w-52 [&>button]:h-10" />
      </div>

      {loaded === null ? (
        <div className="flex items-center justify-center gap-3 py-8 text-[13.5px] text-ink-soft">
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
              <li key={r.name}>
                <button type="button" onClick={() => toggle(r)} aria-expanded={open} className={cn("flex w-full flex-col gap-2 px-5 py-3.5 text-left transition-colors hover:bg-surface sm:flex-row sm:items-center sm:justify-between", open && "bg-brand-tint")}>
                  <span className="min-w-0">
                    <span className="block text-[14px] font-semibold text-ink">
                      {r.section ?? "Profile"} · {changedFields(r).map(label).join(", ") || "Requested change"}
                    </span>
                    <span className="mt-0.5 block text-[12.5px] text-muted">
                      {r.name} · submitted {formatDateTime(r.creation)}
                    </span>
                  </span>
                  <span className="flex shrink-0 flex-wrap items-center gap-2">
                    <Pill tone={STATUS_TONE[String(r.status)] ?? "slate"}>{String(r.status)}</Pill>
                    {r.registry_approval && <Pill tone={REGISTRY_TONE[String(r.registry_approval)] ?? "slate"}>Registry: {String(r.registry_approval)}</Pill>}
                  </span>
                </button>

                {open && (
                  <div className="border-t border-line bg-surface px-5 py-4">
                    {!detail?.request && !detail?.error && (
                      <p className="flex items-center gap-2 text-[13px] text-ink-soft">
                        <Spinner className="h-4 w-4 text-brand-green" /> Loading request details…
                      </p>
                    )}
                    {detail?.error && <p className="text-[13px] text-danger">{detail.error}</p>}
                    {detail?.request && (
                      <div className="flex flex-col gap-4">
                        <table className="w-full text-[13px]">
                          <thead>
                            <tr className="text-left text-[12px] uppercase tracking-wide text-muted">
                              <th className="pb-1.5 pr-4 font-medium">Field</th>
                              <th className="pb-1.5 pr-4 font-medium">Current</th>
                              <th className="pb-1.5 font-medium">Requested</th>
                            </tr>
                          </thead>
                          <tbody>
                            {changeRows(full).map((c) => (
                              <tr key={c.field} className="border-t border-line">
                                <td className="py-1.5 pr-4 font-medium text-ink">{label(c.field)}</td>
                                <td className="py-1.5 pr-4 text-ink-soft">{c.from}</td>
                                <td className="py-1.5 font-semibold text-ink">{c.to}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
                          <div><dt className="text-muted">Reason</dt><dd className="text-ink">{text(full.reason)}</dd></div>
                          <div><dt className="text-muted">Supervisor decision</dt><dd className="text-ink">{full.decided_at ? `${String(full.status)} by ${text(full.approver)} on ${formatDateTime(full.decided_at)}` : "Waiting for your Woreda supervisor"}</dd></div>
                          {full.decision_note && <div className="sm:col-span-2"><dt className="text-muted">Supervisor note</dt><dd className="text-ink">{full.decision_note}</dd></div>}
                          <div><dt className="text-muted">DA Registry</dt><dd className="text-ink">{full.registry_sync_state ? `${full.registry_sync_state}${full.registry_reference ? ` · ref ${full.registry_reference}` : ""}${full.applied_at ? ` · ${formatDateTime(full.applied_at)}` : ""}` : "Not sent yet"}</dd></div>
                          {full.registry_approval && <div><dt className="text-muted">Registry decision</dt><dd className="text-ink">{String(full.registry_approval)}</dd></div>}
                          {full.registry_error && <div className="sm:col-span-2"><dt className="text-muted">Registry error</dt><dd className="text-danger">{String(full.registry_error)}</dd></div>}
                        </dl>

                        {full.status === "Pending" && (
                          <Button type="button" variant="outline" size="sm" className="w-fit" disabled={cancelling === full.name} onClick={() => onCancel(full)}>
                            {cancelling === full.name ? "Cancelling…" : "Cancel request"}
                          </Button>
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
