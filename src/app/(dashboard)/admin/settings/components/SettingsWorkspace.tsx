"use client";

import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { PageHeader } from "@/components/ui/PageHeader";
import { Pill } from "@/components/ui/Pill";
import { Banner } from "@/components/ui/Banner";
import { Button } from "@/components/ui/Button";
import { ExportButton } from "@/components/ui/ExportButton";
import { fileDate } from "@/lib/download";
import { downloadTable, formatLabel } from "@/lib/export";
import { SegmentTabs } from "@/components/ui/SegmentTabs";
import { FormField } from "@/components/ui/FormField";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AreaPicker, EMPTY_AREA, useGeoChildren, type AreaSelection } from "@/features/geo";

const AUDIT_LOG = [
  ["16 Sep 2026, 09:02", "Yonas Haile (Admin)", "Updated sync schedule → Every 6 hours"],
  ["14 Sep 2026, 07:56", "System", "MoA publication failed for DA-OR-000355 (retry 2/3)"],
  ["11 Sep 2026, 16:05", "Kebede Alemu (Supervisor)", "Requested changes on DA-OR-000353"],
  ["08 Sep 2026, 10:30", "Yonas Haile (Admin)", "Mapped kebele code OR-DN-017 → Ginchi (reconciled)"],
  ["16 Aug 2026, 09:40", "Kebede Alemu (Supervisor)", "Approved DA-OR-000355 — published to Gen 2"],
];

type Tab = "sync" | "routing" | "master" | "audit";

const TABS: { key: Tab; label: string }[] = [
  { key: "sync", label: "Sync configuration" },
  { key: "routing", label: "Routing" },
  { key: "master", label: "Master data" },
  { key: "audit", label: "Audit" },
];

// Administration › Settings: routing, sync configuration, master data (§3.1.1 Admin function) + audit access.
export function SettingsWorkspace() {
  const [tab, setTab] = useState<Tab>("sync");
  const [notice, setNotice] = useState<string | null>(null);
  // Master data tab: a Zone is picked, then its Woredas and their Kebeles are listed from the geo Master Data.
  const [masterArea, setMasterArea] = useState<AreaSelection>(EMPTY_AREA);
  const masterZone = masterArea.zone?.code;
  const masterWoredas = useGeoChildren("woreda", masterZone ? [masterZone] : []);
  const masterKebeles = useGeoChildren("kebele", (masterWoredas ?? []).map((w) => w.code));
  const [sync, setSync] = useState({ moaBase: "https://api.moa.gov.et/extension/v2", schedule: "Every 6 hours", batch: "500", retries: "3", faydaFallback: "OTP via registered mobile", conflict: "Merge with review" });
  const [routing, setRouting] = useState({ onboarding: "Woreda Supervisor of proposed kebele", issues: "Woreda Supervisor of reporter", grievances: "External Grievance Service (API)", broadcasts: "Communications Officer — region" });

  const save = (what: string) => setNotice(`${what} saved. Change recorded in the audit log.`);

  return (
    <>
      <PageHeader
        title="Settings"
        description="Administrator configuration: MoA/Fayda sync, routing of proposals and issues, administrative master data, and the immutable audit log."
      />
      {notice && <Banner tone="success" onDismiss={() => setNotice(null)}>{notice}</Banner>}
      {/* Tabs sit at the top of the settings card, with the active tab's form below them. */}
      <Card className="overflow-hidden p-0 shadow-card">
        <SegmentTabs<Tab> label="Settings sections" tabs={TABS} active={tab} onChange={setTab} />

        {tab === "sync" && (
          <div className="flex flex-col gap-5 px-4 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="MoA master registry endpoint" htmlFor="s-moa" hint="Governed API contract v2 — versioned and auditable."><Input id="s-moa" value={sync.moaBase} onChange={(e) => setSync({ ...sync, moaBase: e.target.value })} /></FormField>
              <FormField label="Sync schedule" htmlFor="s-sched" hint="Batch must complete within 30 minutes (NFR)."><Select id="s-sched" value={sync.schedule} onChange={(e) => setSync({ ...sync, schedule: e.target.value })}><option>Every hour</option><option>Every 6 hours</option><option>Daily at 06:00</option></Select></FormField>
              <FormField label="Batch size" htmlFor="s-batch"><Input id="s-batch" type="number" value={sync.batch} onChange={(e) => setSync({ ...sync, batch: e.target.value })} /></FormField>
              <FormField label="Automatic retries on failure" htmlFor="s-retries"><Input id="s-retries" type="number" value={sync.retries} onChange={(e) => setSync({ ...sync, retries: e.target.value })} /></FormField>
              <FormField label="Fayda outage fallback" htmlFor="s-fayda" hint="Applies to DA authentication during Fayda outages (FR-01)."><Select id="s-fayda" value={sync.faydaFallback} onChange={(e) => setSync({ ...sync, faydaFallback: e.target.value })}><option>OTP via registered mobile</option><option>Officer-attested temporary credential</option></Select></FormField>
              <FormField label="Device-sync conflict policy" htmlFor="s-conflict" hint="Unresolved conflicts are always recorded for supervisor attention (FR-08)."><Select id="s-conflict" value={sync.conflict} onChange={(e) => setSync({ ...sync, conflict: e.target.value })}><option>Merge with review</option><option>Last-write-wins (timestamp)</option></Select></FormField>
            </div>
            <div className="flex justify-end"><Button variant="brand" size="lg" className="px-8" onClick={() => save("Sync configuration")}>Save</Button></div>
          </div>
        )}

        {tab === "routing" && (
          <div className="flex flex-col gap-5 px-4 py-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <FormField label="Onboarding proposals route to" htmlFor="r-onb"><Input id="r-onb" value={routing.onboarding} onChange={(e) => setRouting({ ...routing, onboarding: e.target.value })} /></FormField>
              <FormField label="Internal issues route to" htmlFor="r-iss" hint="No separate support-desk role (FR-13a)."><Input id="r-iss" value={routing.issues} onChange={(e) => setRouting({ ...routing, issues: e.target.value })} /></FormField>
              <FormField label="Grievances route to" htmlFor="r-grv"><Input id="r-grv" value={routing.grievances} readOnly className="bg-zinc-50" /></FormField>
              <FormField label="Broadcast approvals" htmlFor="r-bc"><Input id="r-bc" value={routing.broadcasts} onChange={(e) => setRouting({ ...routing, broadcasts: e.target.value })} /></FormField>
            </div>
            <div className="flex justify-end"><Button variant="brand" size="lg" className="px-8" onClick={() => save("Routing")}>Save</Button></div>
          </div>
        )}

        {tab === "master" && (
          <div className="p-5">
            <p className="text-[13.5px] text-ink-soft">Administrative units used for scope, assignment and geofence validation. Unknown inbound codes (e.g. OR-DN-017) surface as “Invalid Kebele reference” exceptions until mapped here.</p>
            <AreaPicker depth="zone" idPrefix="master" onChange={setMasterArea} className="mt-4" />
            {!masterZone ? (
              <p className="mt-4 text-[13px] text-muted">Choose a Region and Zone to see its Woredas and Kebeles.</p>
            ) : !masterWoredas ? (
              <p className="mt-4 text-[13px] text-muted">Loading Woredas…</p>
            ) : masterWoredas.length === 0 ? (
              <p className="mt-4 text-[13px] text-muted">No Woredas in this Zone.</p>
            ) : (
              <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
                {masterWoredas.map((w) => {
                  const kebeles = (masterKebeles ?? []).filter((k) => k.parent === w.code);
                  return (
                    <div key={w.code} className="rounded-lg border border-line p-4">
                      <div className="flex items-center justify-between gap-2"><h3 className="text-[14px] font-semibold text-ink">{w.name}</h3><Pill tone="slate">{masterArea.region?.name} · {masterArea.zone?.name}</Pill></div>
                      <ul className="mt-2 flex flex-wrap gap-1.5">
                        {!masterKebeles ? <li className="text-[12.5px] text-muted">Loading Kebeles…</li> : kebeles.length === 0 ? <li className="text-[12.5px] text-muted">No Kebeles</li> : kebeles.map((k) => <li key={k.code} className="rounded-full border border-slate-200 bg-surface px-2.5 py-0.5 text-[12.5px] text-slate-600">{k.name}</li>)}
                      </ul>
                      <button type="button" onClick={() => setNotice(`Kebele mapping for ${w.name} opened — add or map inbound MoA codes to master kebeles.`)} className="mt-3 text-[12.5px] font-semibold text-brand-green hover:underline">Manage kebeles</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {tab === "audit" && (
          <div className="p-5">
            <p className="text-[13.5px] text-ink-soft">Immutable audit log — every actor, role, entity, action, decision and timestamp. Records cannot be deleted, including by administrators.</p>
            <ul className="mt-4 divide-y divide-line-soft rounded-lg border border-line">
              {AUDIT_LOG.map(([at, actor, action]) => (
                <li key={at} className="flex flex-col gap-0.5 px-4 py-3 text-[13.5px] sm:flex-row sm:gap-4"><span className="w-44 shrink-0 text-[12.5px] text-muted">{at}</span><span className="text-ink"><span className="font-semibold">{actor}</span> — {action}</span></li>
              ))}
            </ul>
            <ExportButton onExport={(format) => {
                downloadTable(format, `audit-log-${fileDate()}`, AUDIT_LOG, [
                  { header: "Timestamp", value: (r) => r[0] },
                  { header: "Actor", value: (r) => r[1] },
                  { header: "Action", value: (r) => r[2] },
                ], "Audit log");
                setNotice(`Audit log exported — ${AUDIT_LOG.length} entries (${formatLabel(format)}).`);
              }} className="mt-4" />
          </div>
        )}
      </Card>
    </>
  );
}
